import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {createPortal} from 'react-dom';
import {ArrowLeft,FilePlus,FileText,FolderOpen,History,Save,Upload,X} from 'lucide-react';
import {chooseDocumentFolder,createNewDocument,documentStorageError,getWordStorageState,initializeDocumentStorage,subscribeWordStorage} from '../../../services/docService';
import {craftFileName,downloadCraftFile,listCraftDocuments,openCraftDocument,saveCraftDocument,WORDCRAFT_MAX_BYTES,type CraftDocument} from '../../../services/wordcraftService';
import {createDocxBlob} from '../../../utils/docxExporter';
import './wordcraft.css';

type EngineWindow=Window&{wordcraft?:{execute:(command:string,params:object)=>Promise<unknown>}};
type Opened={document:CraftDocument;bytes:Uint8Array};
type SavePacket={name:string;bytes:Uint8Array;saveAs:boolean;id?:string;generation:number};
const primaryFormat=/\.(docx?|docm|dotx?|dotm|odt|ott|rtf)$/i;
const formatDate=(value:string)=>new Date(value).toLocaleString('pt-BR');

export function WordCraftHome({onBack}:{onBack:()=>void}){
 const storage=useSyncExternalStore(subscribeWordStorage,getWordStorageState);
 const [documents,setDocuments]=useState<CraftDocument[]>([]),[opened,setOpened]=useState<Opened|null>(null);
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 const [ready,setReady]=useState(false),[dirty,setDirty]=useState(false),[saving,setSaving]=useState(0);
 const [history,setHistory]=useState(false),[leaving,setLeaving]=useState(false),[compatibility,setCompatibility]=useState(false);
 const [failed,setFailed]=useState<SavePacket|null>(null),[engineKey,setEngineKey]=useState(0);
 const iframe=useRef<HTMLIFrameElement>(null),input=useRef<HTMLInputElement>(null),active=useRef<Opened|null>(null);
 const generation=useRef(0),queue=useRef<Promise<unknown>>(Promise.resolve()),mounted=useRef(true);
 const dirtyRef=useRef(false),pendingRef=useRef(0),failedRef=useRef<SavePacket|null>(null);
 const setEdited=(value:boolean)=>{dirtyRef.current=value;setDirty(value);};
 const setFailure=(value:SavePacket|null)=>{failedRef.current=value;setFailed(value);};
 const refresh=async()=>{try{const result=await listCraftDocuments();if(mounted.current){setDocuments(result.documents);if(result.warning)setNotice(result.warning);}}catch(e){if(mounted.current)setError(documentStorageError(e));}};
 useEffect(()=>{mounted.current=true;void initializeDocumentStorage();const root=document.getElementById('root'),oldInert=root?.inert,overflow=document.body.style.overflow;if(root)root.inert=true;document.body.style.overflow='hidden';return()=>{mounted.current=false;if(root)root.inert=oldInert||false;document.body.style.overflow=overflow;};},[]);
 useEffect(()=>{if(storage.ready)void refresh();},[storage.ready,storage.folder]);
 useEffect(()=>{const guard=(event:BeforeUnloadEvent)=>{if(dirtyRef.current||pendingRef.current||failedRef.current){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',guard);return()=>window.removeEventListener('beforeunload',guard);},[]);
 const selectDocument=(value:Opened)=>{active.current=value;setOpened(value);setReady(false);setEdited(false);setFailure(null);setError('');setNotice('');setHistory(false);generation.current++;setEngineKey(key=>key+1);};
 const load=async(id:string)=>{setBusy(true);setError('');try{selectDocument(await openCraftDocument(id));}catch(e){setError(documentStorageError(e));}finally{setBusy(false);}};
 const importFile=async(file?:File)=>{if(!file)return;setBusy(true);setError('');try{if(file.size>WORDCRAFT_MAX_BYTES)throw Error('Escolha um documento de até 64 MB.');if(!/\.(docx?|docm|dotx?|dotm|odt|ott|rtf|txt|md)$/i.test(file.name))throw Error('Escolha um documento Word, ODT, RTF ou texto.');const bytes=new Uint8Array(await file.arrayBuffer()),document=await saveCraftDocument(file.name,bytes);selectDocument({document,bytes});}catch(e){setError(documentStorageError(e));}finally{setBusy(false);if(input.current)input.current.value='';}};
 const newDocument=async()=>{setBusy(true);setError('');try{const bytes=new Uint8Array(await(await createDocxBlob(createNewDocument('Novo documento'))).arrayBuffer()),document=await saveCraftDocument('Novo documento.docx',bytes);selectDocument({document,bytes});}catch(e){setError(documentStorageError(e));}finally{setBusy(false);}};
 const persist=(packet:SavePacket)=>{
  pendingRef.current++;setSaving(pendingRef.current);
  const task=queue.current.then(async()=>{
   try{
    const current=active.current;if(!current)throw Error('Nenhum documento aberto.');
    // Exports are downloads; only editable formats become the current document.
    const primary=primaryFormat.test(packet.name)||(!packet.saveAs&&packet.name===current.document.name);
    if(!primary){downloadCraftFile(packet.name,packet.bytes);if(failedRef.current===packet)setFailure(null);setNotice('Cópia exportada para os downloads.');return;}
    const same=!packet.saveAs&&packet.name===current.document.name;
    const document=await saveCraftDocument(packet.name,packet.bytes,same?current.document:undefined);
    if(!mounted.current)return;
    active.current={document,bytes:packet.bytes};setOpened(active.current);
    if(generation.current===packet.generation)setEdited(false);
    if(!failedRef.current||failedRef.current.generation<=packet.generation)setFailure(null);
    setError('');setNotice(`Salvo na pasta ${storage.folder} · ${formatDate(document.updatedAt)}`);
    if(packet.id)iframe.current?.contentWindow?.postMessage({type:'wordcraft:saved',id:packet.id},location.origin);
   }catch(e){if(mounted.current){setFailure(packet);setEdited(true);setError(documentStorageError(e));}}
   finally{pendingRef.current--;if(mounted.current)setSaving(pendingRef.current);}
  });queue.current=task.catch(()=>{});return task;
 };
 useEffect(()=>{
  const receive=(event:MessageEvent)=>{
   if(event.origin!==location.origin||event.source!==iframe.current?.contentWindow||!active.current)return;
   const packet=event.data;if(!packet||typeof packet!=='object')return;
   if(packet.type==='wordcraft:ready'){
    if(packet.version!=='1'||packet.appVersion!=='0.18.1'){setError('Versão do WordCraft incompatível com esta integração.');return;}
    setReady(true);const value=active.current;
    iframe.current?.contentWindow?.postMessage({type:'wordcraft:open',name:value.document.name,bytes:Uint8Array.from(value.bytes).buffer},location.origin);
   }else if(packet.type==='wordcraft:dirty'&&packet.dirty===true){generation.current++;setEdited(true);}
   else if(packet.type==='wordcraft:failed')setError(typeof packet.error==='string'?packet.error:'O WordCraft não conseguiu abrir este documento.');
   else if(packet.type==='wordcraft:save'){
    if(typeof packet.name!=='string'||typeof packet.saveAs!=='boolean')return;
    const data=packet.bytes instanceof ArrayBuffer?new Uint8Array(packet.bytes):ArrayBuffer.isView(packet.bytes)?new Uint8Array(packet.bytes.buffer,packet.bytes.byteOffset,packet.bytes.byteLength):null;
    if(!data||!data.length||data.length>WORDCRAFT_MAX_BYTES){setError('O arquivo devolvido pelo editor está vazio ou excede 64 MB. Exporte pelo WordCraft para preservar suas alterações.');setEdited(true);return;}
    void persist({name:craftFileName(packet.name),bytes:Uint8Array.from(data),saveAs:packet.saveAs,id:typeof packet.id==='string'?packet.id:undefined,generation:generation.current});
   }
  };window.addEventListener('message',receive);return()=>window.removeEventListener('message',receive);
 });
 const save=async()=>{try{if(!ready)throw Error('Aguarde o editor iniciar.');const api=(iframe.current?.contentWindow as EngineWindow)?.wordcraft;if(!api)throw Error('O editor ainda está iniciando.');await api.execute('file.save',{});}catch(e){setError(documentStorageError(e));}};
 const closeEditor=()=>{active.current=null;setOpened(null);setEdited(false);setFailure(null);setLeaving(false);setHistory(false);setError('');setNotice('');void refresh();};
 const back=()=>{if(pendingRef.current){setNotice('Aguarde a gravação no disco terminar.');return;}if(dirtyRef.current||failedRef.current){setLeaving(true);return;}closeEditor();};
 const restore=async(file:string)=>{const current=active.current;if(!current||dirtyRef.current||pendingRef.current||failedRef.current)return;setBusy(true);try{const old=await openCraftDocument(current.document.id,file),document=await saveCraftDocument(old.version.name,old.bytes,current.document);selectDocument({document,bytes:old.bytes});setNotice('Versão restaurada. As demais versões foram preservadas.');}catch(e){setError(documentStorageError(e));}finally{setBusy(false);}};
 const url=new URL(`${import.meta.env.BASE_URL}wordcraft/0.18.1/index.html`,document.baseURI);url.searchParams.set('host','parent');if(compatibility)url.searchParams.set('webgl','');
 return createPortal(<main className="craft-shell" aria-label="WordCraft experimental">
  <header className="craft-hostbar"><button onClick={opened?back:onBack}><ArrowLeft size={18}/>Voltar</button><strong>{opened?opened.document.name:'WordCraft'} <small>Experimental · 0.18.1</small></strong><span className="craft-status" role="status">{saving?'Gravando no disco…':dirty?'Alterações não salvas':opened?'Cópia guardada no computador':storage.ready?storage.folder:''}</span>{opened&&<><button onClick={()=>void save()} disabled={!ready||!!saving}><Save size={17}/>Salvar</button><button onClick={()=>setHistory(!history)}><History size={17}/>Histórico</button></>}</header>
  {(error||notice||storage.warning)&&<div className={`craft-message ${error?'craft-error':''}`} role={error?'alert':'status'}>{error||notice||storage.warning}{failed&&<><button onClick={()=>void persist(failed)} disabled={!!saving}>Tentar salvar novamente</button><button onClick={()=>downloadCraftFile(failed.name,failed.bytes)}>Baixar cópia de recuperação</button></>}</div>}
  {!opened?<div className="craft-home"><h1>Seus documentos no WordCraft</h1><p>Editor oficial de código aberto, integrado como alternativa ao Word atual. A compatibilidade com documentos complexos ainda está em avaliação.</p>
   <section className="craft-folder"><FolderOpen/><div><strong>{storage.ready?`Pasta conectada: ${storage.folder}`:'Conecte uma pasta do computador'}</strong><p>Arquivos e histórico ficam na subpasta WordCraft. Ao importar, uma cópia é guardada; o original permanece intacto.</p></div><button disabled={busy||storage.loading||!storage.supported} onClick={()=>{setError('');void chooseDocumentFolder().catch(e=>setError(documentStorageError(e)));}}>{storage.ready?'Trocar pasta':'Conectar pasta'}</button></section>
   {!storage.supported&&<p role="alert">Para guardar os documentos no disco, abra esta opção no Edge ou Chrome em HTTPS.</p>}
   <div className="craft-actions"><button disabled={!storage.ready||busy} onClick={()=>void newDocument()}><FilePlus/>Documento em branco</button><button disabled={!storage.ready||busy} onClick={()=>input.current?.click()}><Upload/>Abrir do computador</button></div>
   <input ref={input} type="file" accept=".docx,.doc,.docm,.dotx,.dot,.dotm,.odt,.ott,.rtf,.txt,.md" hidden onChange={event=>void importFile(event.target.files?.[0])}/>
   <h2>Recentes <small>{busy?'Carregando…':`${documents.length} documento(s)`}</small></h2><div className="craft-recents">{documents.map(doc=><button key={doc.id} disabled={busy} onClick={()=>void load(doc.id)}><FileText/><span><strong>{doc.name}</strong><small>{doc.revisions.length} versão(ões) · {formatDate(doc.updatedAt)}</small></span><span>Abrir</span></button>)}{storage.ready&&!documents.length&&!busy&&<p>Crie um documento ou abra um arquivo para começar.</p>}</div>
   <footer>WordCraft © StoryTold · <a href={`${import.meta.env.BASE_URL}wordcraft/0.18.1/LICENSE-MIT`} target="_blank" rel="noreferrer">Licença MIT</a> / <a href={`${import.meta.env.BASE_URL}wordcraft/0.18.1/LICENSE-APACHE`} target="_blank" rel="noreferrer">Apache 2.0</a> · <a href="https://github.com/storytold/wordcraft" target="_blank" rel="noreferrer">Código-fonte</a></footer>
  </div>:<div className="craft-editor">{!ready&&<div className="craft-loading" role="status">Iniciando WordCraft… O primeiro carregamento baixa o editor.<button onClick={()=>{setCompatibility(true);setEngineKey(key=>key+1);setError('');}}>Tentar modo de compatibilidade gráfica</button></div>}<iframe key={engineKey} ref={iframe} title="Editor WordCraft" src={url.href} allow="clipboard-read; clipboard-write; fullscreen" allowFullScreen/>
   {history&&<aside className="craft-history"><header><h2>Histórico no disco</h2><button aria-label="Fechar histórico" onClick={()=>setHistory(false)}><X size={18}/></button></header><p>Restaurar cria uma nova versão e mantém as anteriores. Salve as alterações atuais antes de restaurar.</p>{[...opened.document.revisions].reverse().map((rev,index)=><article key={rev.file}><strong>{index===0?'Atual · ':''}{formatDate(rev.savedAt)}</strong><small>{rev.name} · {(rev.size/1024).toFixed(1)} KB</small><div><button onClick={()=>void openCraftDocument(opened.document.id,rev.file).then(value=>downloadCraftFile(value.version.name,value.bytes)).catch(e=>setError(documentStorageError(e)))}>Baixar</button><button disabled={index===0||dirty||!!saving||!!failed||busy} onClick={()=>void restore(rev.file)}>Restaurar</button></div></article>)}</aside>}</div>}
  {leaving&&<div className="craft-modal"><section role="dialog" aria-modal="true" aria-label="Alterações não salvas"><h2>Há alterações sem salvar</h2><p>Volte ao editor e use Salvar para guardar uma versão no disco antes de sair.</p><button autoFocus onClick={()=>setLeaving(false)}>Continuar editando</button><button onClick={closeEditor}>Descartar alterações e voltar</button></section></div>}
 </main>,document.body);
}
