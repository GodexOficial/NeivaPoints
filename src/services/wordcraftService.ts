export const WORDCRAFT_MAX_BYTES=20*1024*1024;
export const WORDCRAFT_MAX_DOCUMENTS=5;
export const WORDCRAFT_MAX_VERSIONS=3;
export const WORDCRAFT_STORAGE_BYTES=25*1024*1024;
export const WORDCRAFT_DB='neiva-wordcraft-documents';
export type CraftRevision={file:string;name:string;savedAt:string;size:number;sha256:string};
export type CraftDocument={schema:1;id:string;name:string;createdAt:string;updatedAt:string;revisions:CraftRevision[]};
type StoredRevision=CraftRevision&{bytes:ArrayBuffer;documentId:string};
async function database(){return await new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open(WORDCRAFT_DB,1);request.onupgradeneeded=()=>{request.result.createObjectStore('documents',{keyPath:'id'});request.result.createObjectStore('versions',{keyPath:'file'});};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);request.onblocked=()=>reject(Error('Feche outras janelas do WordCraft e tente novamente.'));});}
const result=<T,>(request:IDBRequest<T>)=>new Promise<T>((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
const complete=(tx:IDBTransaction)=>new Promise<void>((resolve,reject)=>{tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error||Error('A gravação foi interrompida. A versão anterior foi preservada.'));tx.onerror=()=>{};});
export function craftFileName(raw:string){let name=Array.from(raw.split(/[\\/]/).at(-1)||'Documento.docx').slice(0,180).map(char=>char.charCodeAt(0)<32?'_':char).join('').replace(/[<>:"|?*]/g,'_').trim();if(!name||name==='.'||name==='..')name='Documento.docx';return name;}
async function hash(bytes:Uint8Array){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',Uint8Array.from(bytes)))].map(n=>n.toString(16).padStart(2,'0')).join('');}
export function documentStorageError(error:unknown){const name=error instanceof Error?error.name:'';if(name==='QuotaExceededError')return 'O armazenamento do navegador está cheio. Baixe uma cópia e exclua um documento dos recentes para liberar espaço.';if(name==='InvalidStateError'||name==='SecurityError')return 'O navegador bloqueou o armazenamento. Permita dados deste site ou use uma janela normal.';return error instanceof Error?error.message:'Não foi possível salvar. Baixe uma cópia antes de sair.';}
export async function requestCraftPersistence(){try{return await navigator.storage?.persist?.()||false;}catch{return false;}}
export async function listCraftDocuments(){const db=await database();try{const tx=db.transaction('documents','readonly'),done=complete(tx);const documents=await result<CraftDocument[]>(tx.objectStore('documents').getAll());await done;return{documents:documents.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)),warning:''};}finally{db.close();}}
export async function openCraftDocument(id:string,versionFile?:string){const db=await database();try{const tx=db.transaction(['documents','versions'],'readonly'),done=complete(tx);const document=await result<CraftDocument|undefined>(tx.objectStore('documents').get(id));if(!document){await done;throw Error('Documento não encontrado neste navegador.');}const version=versionFile?document.revisions.find(item=>item.file===versionFile):document.revisions.at(-1);const stored=version?await result<StoredRevision|undefined>(tx.objectStore('versions').get(version.file)):undefined;await done;if(!version||!stored||stored.documentId!==id)throw Error('Versão não encontrada.');const bytes=new Uint8Array(stored.bytes);if(bytes.length!==version.size||await hash(bytes)!==version.sha256)throw Error('Não foi possível confirmar a integridade desta versão. Tente outra versão do histórico.');return{document,version,bytes};}finally{db.close();}}
export async function deleteCraftDocument(id:string){const db=await database(),tx=db.transaction(['documents','versions'],'readwrite'),done=complete(tx);try{const document=await result<CraftDocument|undefined>(tx.objectStore('documents').get(id));if(document){for(const version of document.revisions)tx.objectStore('versions').delete(version.file);tx.objectStore('documents').delete(id);}await done;}catch(e){try{tx.abort();}catch{}await done.catch(()=>{});throw e;}finally{db.close();}}
export async function saveCraftDocument(rawName:string,data:Uint8Array,current?:CraftDocument):Promise<CraftDocument>{
 if(!data.byteLength||data.byteLength>WORDCRAFT_MAX_BYTES)throw Error('O documento deve ter conteúdo e no máximo 20 MB. Baixe uma cópia se precisar trabalhar com arquivos maiores.');
 const bytes=Uint8Array.from(data),sha256=await hash(bytes),name=craftFileName(rawName),db=await database();
 // Reads, pruning and writes are atomic: a failed save cannot delete valid backups.
 const tx=db.transaction(['documents','versions'],'readwrite'),done=complete(tx),docs=tx.objectStore('documents'),versions=tx.objectStore('versions');
 try{
  const all=await result<CraftDocument[]>(docs.getAll()),existing=current?all.find(doc=>doc.id===current.id):undefined,last=existing?.revisions.at(-1);
  if(current&&(!existing||last?.file!==current.revisions.at(-1)?.file))throw Error('Este documento mudou em outra janela. Baixe suas alterações antes de reabri-lo.');
  if(existing&&last?.sha256===sha256&&existing.name===name){await done;return existing;}
  if(!existing&&all.length>=WORDCRAFT_MAX_DOCUMENTS)throw Error('Limite de 5 documentos atingido. Baixe e exclua um item dos recentes antes de criar ou importar outro.');
  const now=new Date().toISOString(),id=existing?.id||crypto.randomUUID();
  const revision:CraftRevision={file:crypto.randomUUID(),name,savedAt:now,size:bytes.length,sha256};
  const document:CraftDocument={schema:1,id,name,createdAt:existing?.createdAt||now,updatedAt:now,revisions:[...(existing?.revisions||[]),revision]};
  const records=all.filter(doc=>doc.id!==id).map(doc=>({...doc,revisions:[...doc.revisions]}));records.push(document);
  for(const doc of records)while(doc.revisions.length>WORDCRAFT_MAX_VERSIONS){const removed=doc.revisions.shift()!;versions.delete(removed.file);}
  let total=records.reduce((sum,doc)=>sum+doc.revisions.reduce((size,rev)=>size+rev.size,0),0);
  const old=records.flatMap(doc=>doc.revisions.slice(0,-1).map(rev=>({doc,rev}))).sort((a,b)=>a.rev.savedAt.localeCompare(b.rev.savedAt));
  while(total>WORDCRAFT_STORAGE_BYTES&&old.length){const{doc,rev}=old.shift()!;doc.revisions=doc.revisions.filter(item=>item.file!==rev.file);versions.delete(rev.file);total-=rev.size;}
  if(total>WORDCRAFT_STORAGE_BYTES)throw Error('O limite de 25 MB foi atingido. Baixe e exclua um documento dos recentes para liberar espaço.');
  for(const doc of records)docs.put(doc);
  versions.put({...revision,bytes:bytes.buffer,documentId:id} satisfies StoredRevision);
  await done;return document;
 }catch(error){try{tx.abort();}catch{}await done.catch(()=>{});throw error;}finally{db.close();}
}
export function downloadCraftFile(name:string,bytes:Uint8Array){const url=URL.createObjectURL(new Blob([Uint8Array.from(bytes)],{type:'application/octet-stream'})),link=document.createElement('a');link.href=url;link.download=craftFileName(name);link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
