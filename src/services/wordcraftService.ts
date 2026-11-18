import {getDocumentFolder} from './docService';
export const WORDCRAFT_MAX_BYTES=64*1024*1024;
export type CraftRevision={file:string;name:string;savedAt:string;size:number;sha256:string};
export type CraftDocument={schema:1;id:string;name:string;createdAt:string;updatedAt:string;revisions:CraftRevision[]};
type Directory=FileSystemDirectoryHandle&{entries():AsyncIterableIterator<[string,FileSystemHandle]>};
const documentId=/^[0-9a-f-]{36}$/i,revisionName=/^[0-9a-f-]{36}\.[a-z0-9]{1,8}$/i;
let pending:Promise<unknown>=Promise.resolve();
function serial<T>(action:()=>Promise<T>):Promise<T>{const result=pending.then(action);pending=result.catch(()=>{});return result;}
export function craftFileName(raw:string){let name=Array.from(raw.split(/[\\/]/).at(-1)||'Documento.docx').slice(0,180).map(char=>char.charCodeAt(0)<32?'_':char).join('').replace(/[<>:"|?*]/g,'_').trim();if(!name||name==='.'||name==='..')name='Documento.docx';if(/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name))name='Documento-'+name;return name;}
function checkedBytes(data:Uint8Array){if(!data.byteLength||data.byteLength>WORDCRAFT_MAX_BYTES)throw Error('Escolha um arquivo de até 64 MB, com conteúdo válido.');return Uint8Array.from(data);}
async function hash(bytes:Uint8Array){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',Uint8Array.from(bytes)))].map(n=>n.toString(16).padStart(2,'0')).join('');}
function validate(value:unknown,id:string):CraftDocument{
 const doc=value as CraftDocument;
 if(!doc||doc.schema!==1||doc.id!==id||!documentId.test(id)||typeof doc.name!=='string'||!Array.isArray(doc.revisions)||!doc.revisions.length||!Number.isFinite(Date.parse(doc.updatedAt)))throw Error('Metadados inválidos. O documento foi preservado.');
 for(const version of doc.revisions)if(!revisionName.test(version.file)||typeof version.name!=='string'||!Number.isFinite(Date.parse(version.savedAt))||!Number.isSafeInteger(version.size)||version.size<1||version.size>WORDCRAFT_MAX_BYTES||!/^[a-f0-9]{64}$/.test(version.sha256))throw Error('Histórico inválido. Os arquivos foram preservados.');
 return doc;
}
async function root(create=false){const selected=getDocumentFolder();if(!selected)throw Error('Conecte a pasta de documentos para guardar os arquivos no computador.');return await selected.getDirectoryHandle('WordCraft',{create}) as Directory;}
async function project(id:string,create=false){if(!documentId.test(id))throw Error('Documento inválido.');return await(await root(create)).getDirectoryHandle(id,{create}) as Directory;}
async function readMeta(folder:Directory,id:string){const file=await(await folder.getFileHandle('documento.json')).getFile();if(file.size>5*1024*1024)throw Error('Histórico grande demais para abrir. Os arquivos foram preservados.');return validate(JSON.parse(await file.text()),id);}
async function writeFile(folder:Directory,name:string,bytes:Uint8Array){const handle=await folder.getFileHandle(name,{create:true}),stream=await handle.createWritable();try{await stream.write(Uint8Array.from(bytes));await stream.close();}catch(error){await stream.abort().catch(()=>{});throw error;}return handle;}
export async function listCraftDocuments():Promise<{documents:CraftDocument[];warning:string}>{
 return serial(async()=>{const documents:CraftDocument[]=[];let invalid=0,folder:Directory;try{folder=await root();}catch(error){if(error instanceof DOMException&&error.name==='NotFoundError')return{documents,warning:''};throw error;}
 for await(const[id,handle]of folder.entries())if(handle.kind==='directory'&&documentId.test(id)){try{documents.push(await readMeta(handle as Directory,id));}catch(error){if(error instanceof DOMException&&['NotAllowedError','SecurityError'].includes(error.name))throw error;invalid++;}}
 return{documents:documents.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)),warning:invalid?`${invalid} documento(s) não puderam ser listados. Seus arquivos continuam na pasta.`:''};});
}
async function readVersion(folder:Directory,version:CraftRevision){const revisions=await folder.getDirectoryHandle('versoes'),file=await(await revisions.getFileHandle(version.file)).getFile();if(file.size!==version.size)throw Error('O tamanho do arquivo difere da versão salva. Os dados foram preservados.');const bytes=new Uint8Array(await file.arrayBuffer());if(await hash(bytes)!==version.sha256)throw Error('O arquivo foi alterado fora do aplicativo. Os dados foram preservados.');return bytes;}
export async function openCraftDocument(id:string,versionFile?:string){return serial(async()=>{const folder=await project(id),document=await readMeta(folder,id);const version=versionFile?document.revisions.find(rev=>rev.file===versionFile):document.revisions.at(-1);if(!version)throw Error('Versão não encontrada.');return{document,version,bytes:await readVersion(folder,version)};});}
export async function saveCraftDocument(rawName:string,data:Uint8Array,current?:CraftDocument):Promise<CraftDocument>{
 const bytes=checkedBytes(data),name=craftFileName(rawName),id=current?.id||crypto.randomUUID();
 const store=async()=>{
  const folder=await project(id,true),sha256=await hash(bytes);
  let existing:CraftDocument|undefined;
  try{existing=await readMeta(folder,id);}catch(error){if(!(error instanceof DOMException&&error.name==='NotFoundError'))throw error;}
  const last=existing?.revisions.at(-1);
  if(last?.sha256===sha256&&existing?.name===name){await readVersion(folder,last);return existing;}
  if(current&&(!existing||existing.revisions.at(-1)?.file!==current.revisions.at(-1)?.file))throw Error('Este documento mudou em outra janela. Baixe uma cópia das suas alterações antes de reabri-lo.');
  const now=new Date().toISOString(),extension=name.split('.').at(-1)?.toLowerCase();
  if(!extension||!/^[a-z0-9]{1,8}$/.test(extension))throw Error('Extensão de arquivo inválida.');
  const revision:CraftRevision={file:`${crypto.randomUUID()}.${extension}`,name,savedAt:now,size:bytes.byteLength,sha256};
  const revisions=await folder.getDirectoryHandle('versoes',{create:true});
  const stored=await writeFile(revisions as Directory,revision.file,bytes);
  if(await hash(new Uint8Array(await(await stored.getFile()).arrayBuffer()))!==sha256)throw Error('Não foi possível confirmar a gravação completa no disco. A versão anterior foi preservada.');
  const document:CraftDocument={schema:1,id,name,createdAt:existing?.createdAt||now,updatedAt:now,revisions:[...(existing?.revisions||[]),revision]};
  const serialized=JSON.stringify(document),encoded=new TextEncoder().encode(serialized);
  if(encoded.length>5*1024*1024)throw Error('O histórico atingiu o limite deste documento. Salve como uma nova cópia. As versões anteriores foram mantidas.');
  const metadata=await writeFile(folder,'documento.json',encoded);
  if(await(await metadata.getFile()).text()!==serialized)throw Error('Não foi possível confirmar o histórico no disco. A cópia do arquivo foi mantida na pasta de versões.');
  return document;
 };
 // Also serialize cooperating tabs, not just calls within this module instance.
 return serial(()=>navigator.locks?navigator.locks.request(`neiva-wordcraft:${id}`,store):store());
}
export function downloadCraftFile(name:string,bytes:Uint8Array){const url=URL.createObjectURL(new Blob([Uint8Array.from(bytes)],{type:'application/octet-stream'})),link=document.createElement('a');link.href=url;link.download=craftFileName(name);link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
