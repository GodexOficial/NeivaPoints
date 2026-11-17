import DOMPurify from 'dompurify';
import type { WordDocument } from '../types/doc';
const LEGACY = 'sistema_pontos_word_documents_v1', DRAFT = 'sistema_pontos_word_draft_', EXT = '.neiva-word.json';
type Directory = FileSystemDirectoryHandle & {
  entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
  queryPermission(options: {mode:'readwrite'}): Promise<PermissionState>;
};
type PickerWindow = Window & { showDirectoryPicker?: (options: {mode:'readwrite';id:string;startIn:string}) => Promise<Directory> };
export type WordDraft = {docId:string;title:string;content:string;savedAt:string;document?:WordDocument};
type Envelope = {format:'neiva-word';version:1;document:WordDocument;draft?:WordDraft};
let directory: Directory | null = null;
const checkpoints=new Map<string,number>();
let documents: WordDocument[] = [], drafts = new Map<string,WordDraft>(), names = new Map<string,string>();
let state = {ready:false,folder:'',loading:false,supported:typeof window !== 'undefined' && !!(window as PickerWindow).showDirectoryPicker,warning:'',revision:0};
const listeners = new Set<()=>void>();
export const getWordStorageState = () => state;
export const subscribeWordStorage = (listener:()=>void) => {listeners.add(listener);return ()=>{listeners.delete(listener);};};
function notify(change:Partial<typeof state>={}) {state={...state,...change,revision:state.revision+1};listeners.forEach(fn=>fn());}
let queue:Promise<unknown>=Promise.resolve();
function serial<T>(task:()=>Promise<T>):Promise<T> {const result=queue.then(task);queue=result.catch(()=>{});return result;}
// Only the directory handle is remembered in IndexedDB; document contents live in actual files.
async function rememberFolder(value?:Directory):Promise<Directory|undefined> {
  const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('neiva-word-folder',1);r.onupgradeneeded=()=>r.result.createObjectStore('settings');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
  try{return await new Promise<Directory|undefined>((resolve,reject)=>{const tx=db.transaction('settings',value?'readwrite':'readonly'),s=tx.objectStore('settings'),r=value?s.put(value,'folder'):s.get('folder');tx.oncomplete=()=>resolve(value||r.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}finally{db.close();}
}
function validate(doc:WordDocument) {
  if(!doc||typeof doc.id!=='string'||!doc.id||doc.id.length>100||typeof doc.title!=='string'||typeof doc.content!=='string'||!Number.isFinite(Date.parse(doc.updatedAt)))throw new Error('Arquivo de documento inválido.');
  if(doc.pages&&(!Array.isArray(doc.pages)||doc.pages.some(p=>typeof p!=='string')))throw new Error('Páginas inválidas no documento.');
  const clean=(html:string)=>DOMPurify.sanitize(html,{ADD_ATTR:['contenteditable','data-word-draggable','data-comment-id'],FORBID_TAGS:['script','iframe','object','embed','form','input','button','textarea','select','style']});
  return {...doc,content:clean(doc.content),...(doc.pages?{pages:doc.pages.map(clean)}:{}),...(doc.headerHtml?{headerHtml:clean(doc.headerHtml)}:{}),...(doc.footerHtml?{footerHtml:clean(doc.footerHtml)}:{})};
}
function parse(raw:string,sanitize=true):Envelope {
  const data=JSON.parse(raw) as Envelope;
  if(data.format!=='neiva-word'||data.version!==1)throw new Error('Formato de documento não reconhecido.');
  if(sanitize)data.document=validate(data.document);
  else if(!data.document||typeof data.document.id!=='string'||typeof data.document.updatedAt!=='string')throw new Error('Documento inválido.');
  if(data.draft&&(data.draft.docId!==data.document.id||typeof data.draft.content!=='string'||typeof data.draft.title!=='string'||!Number.isFinite(Date.parse(data.draft.savedAt))))throw new Error('Rascunho inválido.');
  if(sanitize&&data.draft?.document)data.draft.document=validate(data.draft.document);
  if(sanitize&&data.draft)data.draft.content=DOMPurify.sanitize(data.draft.content);
  return data;
}
async function docKey(id:string) {return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(id)))].map(v=>v.toString(16).padStart(2,'0')).join('').slice(0,32);}
async function filename(doc:WordDocument) {return `${doc.title.replace(/[^\p{L}\p{N} _-]/gu,'').trim().slice(0,24)||'Documento'}-${await docKey(doc.id)}${EXT}`;}

async function write(folder:Directory,envelope:Envelope,name:string) {
  const raw=JSON.stringify(envelope),file=await folder.getFileHandle(name,{create:true}),stream=await file.createWritable();
  try{await stream.write(raw);await stream.close();}catch(error){await stream.abort().catch(()=>{});throw error;}
  if(await(await file.getFile()).text()!==raw)throw new Error('Não foi possível confirmar a gravação completa no disco. A cópia antiga foi preservada.');
}
function legacy() {
  const raw=localStorage.getItem(LEGACY),docs:WordDocument[]=raw?JSON.parse(raw):[];
  if(!Array.isArray(docs))throw new Error('Lista antiga inválida. Os dados foram preservados.');for(let i=0;i<docs.length;i++)docs[i]=validate(docs[i]);
  const snapshot=new Map<string,string>();if(raw)snapshot.set(LEGACY,raw);
  const recovered=new Map<string,WordDraft>();
  for(let i=0;i<localStorage.length;i++){
    const key=localStorage.key(i);if(!key?.startsWith(DRAFT))continue;
    const text=localStorage.getItem(key)!,draft:WordDraft=JSON.parse(text);
    if(!draft||draft.docId!==key.slice(DRAFT.length)||typeof draft.content!=='string'||typeof draft.title!=='string'||!Number.isFinite(Date.parse(draft.savedAt)))throw new Error('Rascunho antigo inválido. Os dados foram preservados.');
    if(draft.document)draft.document=validate(draft.document);draft.content=DOMPurify.sanitize(draft.content);recovered.set(draft.docId,draft);snapshot.set(key,text);
  }
  return {docs,recovered,snapshot};
}
async function connect(folder:Directory) {
  const old=legacy(),found=new Map<string,WordDocument>(),foundDrafts=new Map<string,WordDraft>(),foundNames=new Map<string,string>();let invalid=0;
  for await(const[name,handle]of folder.entries()){
    if(handle.kind!=='file'||!name.endsWith(EXT))continue;
    const raw=await(await(handle as FileSystemFileHandle).getFile()).text();let envelope:Envelope;
    try{envelope=parse(raw);}catch{invalid++;continue;}
    const doc=envelope.document;
    if(!found.has(doc.id)||doc.updatedAt>found.get(doc.id)!.updatedAt){found.set(doc.id,doc);foundNames.set(doc.id,name);if(envelope.draft)foundDrafts.set(doc.id,envelope.draft);else foundDrafts.delete(doc.id);}
  }
  for(const draft of old.recovered.values())if(!old.docs.some(doc=>doc.id===draft.docId))old.docs.push(draft.document||{...createNewDocument(draft.title),id:draft.docId,content:draft.content,updatedAt:draft.savedAt});
  for(const doc of old.docs){
    const disk=found.get(doc.id),selected=disk&&disk.updatedAt>doc.updatedAt?disk:doc,a=old.recovered.get(doc.id),b=foundDrafts.get(doc.id),draft=a&&(!b||a.savedAt>b.savedAt)?a:b,name=foundNames.get(doc.id)||await filename(selected);
    await write(folder,{format:'neiva-word',version:1,document:selected,...(draft?{draft}:{})},name);
    found.set(doc.id,selected);foundNames.set(doc.id,name);if(draft)foundDrafts.set(doc.id,draft);
  }
  let cleanup='';
  for(const[key,value]of old.snapshot){try{if(localStorage.getItem(key)===value)localStorage.removeItem(key);else cleanup='Outra janela alterou os dados antigos durante a cópia. Feche essa janela e reconecte a pasta para copiar as alterações.';}catch{cleanup='Cópia no disco concluída. A cópia antiga do navegador também foi mantida.';}}
  directory=folder;checkpoints.clear();documents=[...found.values()];drafts=foundDrafts;names=foundNames;
  let remembered=true;try{await rememberFolder(folder);}catch{remembered=false;}
  notify({ready:true,folder:folder.name,warning:[cleanup,invalid?`${invalid} arquivo(s) inválido(s) foram ignorados e preservados na pasta.`:'',remembered?'':'Pasta conectada. Escolha-a novamente ao reabrir o site.'].filter(Boolean).join(' ')});
}
let initialization:Promise<void>|undefined;
export function initializeDocumentStorage(){return initialization||=(async()=>{
  notify({loading:true});try{const old=legacy();documents=old.docs;drafts=old.recovered;const handle=await rememberFolder().catch(()=>undefined);if(handle&&await handle.queryPermission({mode:'readwrite'})==='granted')await serial(()=>connect(handle));else notify({folder:handle?.name||''});}catch(error){notify({warning:documentStorageError(error)});}finally{notify({loading:false});}
})();}
export async function chooseDocumentFolder(){
  const picker=(window as PickerWindow).showDirectoryPicker;
  if(!picker)throw new Error('Para salvar diretamente em uma pasta, use Chrome ou Edge no computador. Você ainda pode baixar uma cópia DOCX.');
  const picked=picker.call(window,{mode:'readwrite',id:'neiva-word-documents',startIn:'documents'});notify({loading:true});
  try{const handle=await picked;await serial(()=>connect(handle));}finally{notify({loading:false});}
}
export function documentStorageError(error:unknown){
  const name=error instanceof Error||error instanceof DOMException?error.name:'';
  if(name==='AbortError')return 'Escolha da pasta cancelada. Os documentos foram preservados.';
  if(name==='NotAllowedError'||name==='SecurityError')return 'Sem acesso à pasta. Use “Pasta de documentos” para reconectar e permitir a gravação.';
  if(name==='QuotaExceededError')return 'Não foi possível gravar no disco. Verifique o espaço livre e a permissão da pasta; baixe uma cópia DOCX antes de sair.';
  return error instanceof Error?error.message:'Não foi possível salvar no computador. Baixe uma cópia DOCX antes de sair.';
}
export const getLocalDocuments=()=>[...documents];
export const getAutoSaveDraft=(id:string)=>drafts.get(id)||null;
export const saveLocalDocument=(doc:WordDocument,options:{checkpoint?:boolean}={}):Promise<WordDocument>=>{
  const updated={...doc,updatedAt:new Date().toISOString()};
  return serial(async()=>{
    if(!directory)throw new Error('Escolha uma pasta em “Pasta de documentos” para salvar no computador.');
    const name=names.get(doc.id)||await filename(doc),known=documents.find(item=>item.id===doc.id);
    if(known&&names.has(doc.id)){
      const existing=parse(await(await(await directory.getFileHandle(name)).getFile()).text(),false);
      if(existing.document.updatedAt!==known.updatedAt)throw new Error('Arquivo alterado em outra janela. Baixe um DOCX com suas alterações e reabra a pasta antes de salvar.');
      const changed=JSON.stringify({...known,updatedAt:''})!==JSON.stringify({...updated,updatedAt:''});
      if(changed&&(options.checkpoint||Date.now()-(checkpoints.get(doc.id)||0)>=300000)){
        const root=await directory.getDirectoryHandle('Historico-Word',{create:true});
        const history=await root.getDirectoryHandle(await docKey(doc.id),{create:true}) as Directory;
        await write(history,existing,`${known.updatedAt.replace(/[:.]/g,'-')}${EXT}`);
        checkpoints.set(doc.id,Date.now());
      }
    }
    await write(directory,{format:'neiva-word',version:1,document:updated},name);
    documents=[updated,...documents.filter(item=>item.id!==doc.id)];names.set(doc.id,name);drafts.delete(doc.id);notify();return updated;
  });
};
export const saveAutoSaveDraft=async(docId:string,content:string,title:string,document?:WordDocument)=>{const doc=document||documents.find(item=>item.id===docId);if(!doc)throw new Error('Documento não encontrado.');await saveLocalDocument({...doc,content,title});};
export const clearAutoSaveDraft=async(id:string)=>{const doc=documents.find(item=>item.id===id);if(doc&&drafts.has(id))await saveLocalDocument(doc);};
export const deleteLocalDocument=(id:string)=>serial(async()=>{if(!directory)throw new Error('Conecte a pasta de documentos.');const name=names.get(id);if(name)await directory.removeEntry(name);documents=documents.filter(doc=>doc.id!==id);drafts.delete(id);names.delete(id);notify();});
export function createNewDocument(title='Novo Documento'):WordDocument{const now=new Date().toISOString();return{id:`doc-${crypto.randomUUID()}`,title,content:'<p><br></p>',shapes:[],images:[],createdAt:now,updatedAt:now,paperTheme:'white',paperMargin:'normal'};}
export async function importNeivaWordFile(file:File):Promise<WordDocument>{const envelope=parse(await file.text()),draft=envelope.draft;return draft&&draft.savedAt>envelope.document.updatedAt?{...envelope.document,...draft.document,title:draft.title,content:draft.content,updatedAt:draft.savedAt}:envelope.document;}

export type WordVersion={name:string;savedAt:string;title:string};
async function versionFolder(id:string):Promise<Directory|null>{
  if(!directory)throw new Error('Conecte a pasta de documentos para consultar o histórico.');
  try{const root=await directory.getDirectoryHandle('Historico-Word');return await root.getDirectoryHandle(await docKey(id)) as Directory;}catch(error){if(error instanceof DOMException&&error.name==='NotFoundError')return null;throw error;}
}
export async function getDocumentHistory(id:string):Promise<WordVersion[]>{
  return serial(async()=>{const folder=await versionFolder(id);if(!folder)return [];const versions:WordVersion[]=[];
    for await(const[name,handle]of folder.entries()){if(handle.kind!=='file'||!name.endsWith(EXT))continue;try{const envelope=parse(await(await(handle as FileSystemFileHandle).getFile()).text(),false);if(envelope.document.id===id&&typeof envelope.document.title==='string'&&Number.isFinite(Date.parse(envelope.document.updatedAt)))versions.push({name,savedAt:envelope.document.updatedAt,title:envelope.document.title});}catch{notify({warning:'Uma versão inválida foi ignorada e preservada no histórico.'});}}
    return versions.sort((a,b)=>b.savedAt.localeCompare(a.savedAt));
  });
}
export async function readDocumentVersion(id:string,name:string):Promise<WordDocument>{
  return serial(async()=>{if(!name.endsWith(EXT)||/[\\/]/.test(name))throw new Error('Versão inválida.');const folder=await versionFolder(id);if(!folder)throw new Error('Histórico não encontrado.');const file=await(await folder.getFileHandle(name)).getFile(),doc=await importNeivaWordFile(file);if(doc.id!==id)throw new Error('Versão de outro documento.');return doc;});
}
