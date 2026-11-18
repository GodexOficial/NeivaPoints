import {useCallback,useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {ArrowLeft,Download,FilePlus,FileText,History,Save,Trash2,Upload,X} from 'lucide-react';
import {craftFileName,deleteCraftDocument as deleteStored,documentStorageError,downloadCraftFile,listCraftDocuments as listStored,openCraftDocument as openStored,requestCraftPersistence,saveCraftDocument as saveStored,DECKCRAFT_MAX_BYTES,type CraftDocument} from '../../../services/deckcraftService';


import './deckcraft.css';

type EngineWindow=Window&{deckcraft?:{execute:(command:string,params:object)=>Promise<unknown>;request:(method:string,params:object)=>Promise<unknown>}};
type Opened={document:CraftDocument;bytes:Uint8Array};
type SavePacket={name:string;bytes:Uint8Array;saveAs:boolean;id?:string;generation:number};
const primaryFormat=/\.(pptx|potx|ppsx|deckcraft)$/i;
const formatDate=(value:string)=>new Date(value).toLocaleString('pt-BR');

export function DeckCraftApp({onBack,owner='local'}:{onBack:()=>void;owner?:string}){

 const openCraftDocument=(id:string,version?:string)=>openStored(id,version,owner),deleteCraftDocument=(id:string)=>deleteStored(id,owner),saveCraftDocument=(name:string,bytes:Uint8Array,current?:CraftDocument)=>saveStored(name,bytes,current,owner);
 const [documents,setDocuments]=useState<CraftDocument[]>([]),[opened,setOpened]=useState<Opened|null>(null);
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 const [ready,setReady]=useState(false),[dirty,setDirty]=useState(false),[saving,setSaving]=useState(0);
 const [history,setHistory]=useState(false),[leaving,setLeaving]=useState(false);
 const [compatibility,setCompatibility]=useState(false);
 const [failed,setFailed]=useState<SavePacket|null>(null),[engineKey,setEngineKey]=useState(0);
 const iframe=useRef<HTMLIFrameElement>(null),input=useRef<HTMLInputElement>(null),active=useRef<Opened|null>(null);
 const generation=useRef(0),queue=useRef<Promise<unknown>>(Promise.resolve()),mounted=useRef(true),downloadNext=useRef(false);
 const autoSave=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),saveAction=useRef<()=>void>(()=>{});
 const dirtyRef=useRef(false),pendingRef=useRef(0),failedRef=useRef<SavePacket|null>(null);
 const engineDirty=useRef(false),committedGeneration=useRef(-1);
 const setEdited=(value:boolean)=>{dirtyRef.current=value;setDirty(value);};
 const setFailure=(value:SavePacket|null)=>{failedRef.current=value;setFailed(value);};
 const refresh=useCallback(async()=>{try{const result=await listStored(owner);if(mounted.current){setDocuments(result.documents);if(result.warning)setNotice(result.warning);}}catch(e){if(mounted.current)setError(documentStorageError(e));}},[owner]);

 useEffect(()=>{mounted.current=true;void refresh();const root=document.getElementById('root'),oldInert=root?.inert,overflow=document.body.style.overflow;if(root)root.inert=true;document.body.style.overflow='hidden';return()=>{mounted.current=false;clearTimeout(autoSave.current);if(root)root.inert=oldInert||false;document.body.style.overflow=overflow;};},[refresh]);

 useEffect(()=>{const guard=(event:BeforeUnloadEvent)=>{if(dirtyRef.current||pendingRef.current||failedRef.current){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',guard);return()=>window.removeEventListener('beforeunload',guard);},[]);
 const selectDocument=(value:Opened)=>{clearTimeout(autoSave.current);engineDirty.current=false;committedGeneration.current=-1;downloadNext.current=false;active.current=value;setOpened(value);setReady(false);setEdited(false);setFailure(null);setError('');setNotice('');setHistory(false);generation.current++;setEngineKey(key=>key+1);};
 const load=async(id:string)=>{setBusy(true);setError('');try{selectDocument(await openCraftDocument(id));}catch(e){setError(documentStorageError(e));}finally{setBusy(false);}};
 const importFile=async(file?:File)=>{if(!file)return;void requestCraftPersistence();setBusy(true);setError('');try{if(file.size>DECKCRAFT_MAX_BYTES)throw Error('Escolha um arquivo de até 20 MB.');if(!/\.(pptx|potx|ppsx|deckcraft|txt|md|rtf)$/i.test(file.name))throw Error('Escolha uma apresentação PPTX, POTX, PPSX ou DECKCRAFT, ou um roteiro TXT, MD ou RTF.');const bytes=new Uint8Array(await file.arrayBuffer()),document=await saveCraftDocument(file.name,bytes);selectDocument({document,bytes});}catch(e){setError(documentStorageError(e));}finally{setBusy(false);if(input.current)input.current.value='';}};
 const newDocument=async()=>{setBusy(true);setError('');try{void requestCraftPersistence();const response=await fetch(new URL(`${import.meta.env.BASE_URL}deckcraft/blank.pptx`,window.document.baseURI));if(!response.ok)throw Error('Não foi possível carregar o arquivo em branco.');const bytes=new Uint8Array(await response.arrayBuffer()),document=await saveCraftDocument('Apresentação.pptx',bytes);selectDocument({document,bytes});}catch(e){setError(documentStorageError(e));}finally{setBusy(false);}};
 const persist=(packet:SavePacket)=>{
  pendingRef.current++;setSaving(pendingRef.current);
  const task=queue.current.then(async()=>{
   try{
    const current=active.current;if(!current)throw Error('Nenhum arquivo aberto.');
    // Exports are downloads; only editable formats become the current document.
    const primary=primaryFormat.test(packet.name);
    if(!primary){downloadCraftFile(packet.name,packet.bytes);if(failedRef.current===packet)setFailure(null);setNotice('Cópia exportada para os downloads.');return;}
    const converted=!primaryFormat.test(current.document.name)&&packet.name.replace(/\.[^.]+$/,'')===current.document.name.replace(/\.[^.]+$/,'');
    const same=!packet.saveAs&&(packet.name===current.document.name||converted);
    if(downloadNext.current){downloadNext.current=false;downloadCraftFile(packet.name,packet.bytes);}
    const document=await saveCraftDocument(packet.name,packet.bytes,same?current.document:undefined);
    if(!mounted.current)return;
    active.current={document,bytes:packet.bytes};setOpened(active.current);
    committedGeneration.current=packet.generation;
    if(generation.current===packet.generation&&!engineDirty.current)setEdited(false);
    if(!failedRef.current||failedRef.current.generation<=packet.generation)setFailure(null);
    setError('');setNotice(`Salvo neste navegador · ${formatDate(document.updatedAt)}`);
    if(packet.id)iframe.current?.contentWindow?.postMessage({type:'deckcraft:saved',id:packet.id},location.origin);
   }catch(e){if(mounted.current){setFailure(packet);setEdited(true);setError(documentStorageError(e));}}
   finally{pendingRef.current--;if(mounted.current){setSaving(pendingRef.current);if(!pendingRef.current&&!engineDirty.current&&!failedRef.current&&committedGeneration.current===generation.current)setEdited(false);}}
  });queue.current=task.catch(()=>{});return task;
 };
 useEffect(()=>{
  const receive=(event:MessageEvent)=>{
   if(event.origin!==location.origin||event.source!==iframe.current?.contentWindow||!active.current)return;
   const packet=event.data;if(!packet||typeof packet!=='object')return;
   if(packet.type==='deckcraft:ready'){
    if(packet.version!=='1'||packet.appVersion!=='0.18.1'){setError('Versão do DeckCraft incompatível com esta integração.');return;}
    const frame=iframe.current?.contentWindow as EngineWindow|null,value=active.current;
    if(!mounted.current||iframe.current?.contentWindow!==frame||active.current!==value)return;
    setReady(true);
    frame?.postMessage({type:'deckcraft:open',name:value.document.name,bytes:Uint8Array.from(value.bytes).buffer},location.origin);
   }else if(packet.type==='deckcraft:dirty'&&typeof packet.dirty==='boolean'){
    engineDirty.current=packet.dirty;
    if(packet.dirty){generation.current++;setEdited(true);clearTimeout(autoSave.current);autoSave.current=setTimeout(()=>saveAction.current(),2000);}
    else{clearTimeout(autoSave.current);if(!pendingRef.current&&!failedRef.current&&committedGeneration.current===generation.current)setEdited(false);}
   }
   else if(packet.type==='deckcraft:failed')setError(typeof packet.error==='string'?packet.error:'O DeckCraft não conseguiu abrir este arquivo.');
   else if(packet.type==='deckcraft:save'){
    if(typeof packet.name!=='string'||typeof packet.saveAs!=='boolean')return;
    const data=packet.bytes instanceof ArrayBuffer?new Uint8Array(packet.bytes):ArrayBuffer.isView(packet.bytes)?new Uint8Array(packet.bytes.buffer,packet.bytes.byteOffset,packet.bytes.byteLength):null;
    if(!data||!data.length||data.length>DECKCRAFT_MAX_BYTES){setError('O arquivo devolvido pelo editor está vazio ou excede 20 MB. Exporte pelo DeckCraft para preservar suas alterações.');setEdited(true);return;}
    void persist({name:craftFileName(packet.name),bytes:Uint8Array.from(data),saveAs:packet.saveAs,id:typeof packet.id==='string'?packet.id:undefined,generation:generation.current});
   }
  };window.addEventListener('message',receive);return()=>window.removeEventListener('message',receive);
 });
 const save=async()=>{try{clearTimeout(autoSave.current);if(!ready)throw Error('Aguarde o editor iniciar.');const api=(iframe.current?.contentWindow as EngineWindow)?.deckcraft;if(!api)throw Error('O editor ainda está iniciando.');const response=await api.request('app.save',{}) as {needsPath?:boolean}|null;if(response?.needsPath){const name=active.current?.document.name||'Apresentação';await api.request('app.save',{path:name.replace(/\.[^.]+$/,'')+'.pptx'});}}catch(e){downloadNext.current=false;setError(documentStorageError(e));}};
 saveAction.current=()=>{if(!failedRef.current)void save();};
 const closeEditor=()=>{clearTimeout(autoSave.current);active.current=null;setOpened(null);setEdited(false);setFailure(null);setLeaving(false);setHistory(false);setError('');setNotice('');void refresh();};
 const back=()=>{if(pendingRef.current){setNotice('Aguarde o salvamento terminar.');return;}if(dirtyRef.current||failedRef.current){setLeaving(true);return;}closeEditor();};
 const restore=async(file:string)=>{
  const current=active.current,frame=iframe.current?.contentWindow;
  if(!current||!frame||dirtyRef.current||pendingRef.current||failedRef.current)return;
  setBusy(true);clearTimeout(autoSave.current);
  try{
   const old=await openCraftDocument(current.document.id,file),document=await saveCraftDocument(old.version.name,old.bytes,current.document);
   // Reuse the running renderer: rebuilding a WebGPU iframe during restore can stall the driver.
   active.current={document,bytes:old.bytes};setOpened(active.current);generation.current++;committedGeneration.current=generation.current;
   setHistory(false);setEdited(false);setFailure(null);setError('');
   await (frame as EngineWindow).deckcraft?.execute('app.closePresentation',{});
   frame.postMessage({type:'deckcraft:open',name:document.name,bytes:Uint8Array.from(old.bytes).buffer},location.origin);
   setNotice('Versão restaurada. O histórico mantém até três versões recentes.');
  }catch(e){setError(documentStorageError(e));}finally{setBusy(false);}
 };
 const url=new URL(`${import.meta.env.BASE_URL}deckcraft/0.18.1/index.html`,document.baseURI);url.searchParams.set('host','parent');if(compatibility)url.searchParams.set('webgl','');
 return createPortal(<main className="craft-shell deckcraft-shell" aria-label="DeckCraft experimental">
  <header className="craft-hostbar"><button onClick={opened?back:onBack}><ArrowLeft size={18}/>Voltar</button><strong>{opened?opened.document.name:'DeckCraft'} <small>Experimental · 0.18.1</small></strong><span className="craft-status" role="status">{saving?'Salvando no navegador…':dirty?'Alterações não salvas':opened?'Salvo neste navegador':'Até 5 apresentações'}</span>{opened&&<><button onClick={()=>void save()} disabled={!ready||!!saving}><Save size={17}/>Salvar</button><button onClick={()=>{setHistory(!history);}}><History size={17}/>Histórico</button><button disabled={!ready||!!saving} onClick={()=>{downloadNext.current=true;void save();}}><Download size={17}/>Baixar arquivo</button></>}</header>
  {(error||notice)&&<div className={`craft-message ${error?'craft-error':''}`} role={error?'alert':'status'}>{error||notice}{failed&&<><button onClick={()=>void persist(failed)} disabled={!!saving}>Tentar salvar novamente</button><button onClick={()=>downloadCraftFile(failed.name,failed.bytes)}>Baixar cópia de recuperação</button></>}</div>}
  {!opened?<div className="craft-home"><h1>Suas apresentações no DeckCraft</h1><p>O editor de slides tem menus em inglês nesta versão. Crie ou abra apresentações. O salvamento automático mantém até 5 arquivos e 3 versões por arquivo neste navegador, com limite total de 25 MB.</p>
   <p className="craft-storage-note">Nenhuma pasta precisa ser selecionada. Para guardar uma cópia permanente ou abrir em outro dispositivo, use Baixar arquivo. Limpar os dados do site também remove estas apresentações.</p>

   <div className="craft-actions"><button disabled={busy} onClick={()=>void newDocument()}><FilePlus/>Apresentação em branco</button><button disabled={busy} onClick={()=>input.current?.click()}><Upload/>Abrir do computador</button></div>
   <input ref={input} type="file" accept=".pptx,.potx,.ppsx,.deckcraft,.txt,.md,.rtf" hidden onChange={event=>void importFile(event.target.files?.[0])}/>
   <h2>Recentes <small>{busy?'Carregando…':documents.length+' de 5 apresentações'}</small></h2><div className="craft-recents">{documents.map(doc=><article key={doc.id}><button disabled={busy} onClick={()=>void load(doc.id)}><FileText/><span><strong>{doc.name}</strong><small>{doc.revisions.length} versão(ões) · {formatDate(doc.updatedAt)}</small></span><span>Abrir</span></button><button aria-label={'Baixar '+doc.name} disabled={busy} onClick={()=>void openCraftDocument(doc.id).then(value=>downloadCraftFile(value.document.name,value.bytes)).catch(e=>setError(documentStorageError(e)))}><Download size={18}/></button><button aria-label={'Excluir '+doc.name} disabled={busy} onClick={()=>{if(window.confirm('Excluir este arquivo e seu histórico do navegador? Baixe uma cópia antes de excluir.'))void deleteCraftDocument(doc.id).then(refresh).catch(e=>setError(documentStorageError(e)));}}><Trash2 size={18}/></button></article>)}{!documents.length&&!busy&&<p>Crie uma apresentação ou abra um arquivo para começar.</p>}</div>
   <footer>DeckCraft © StoryTold · <a href={`${import.meta.env.BASE_URL}deckcraft/0.18.1/LICENSE-MIT`} target="_blank" rel="noreferrer">Licença MIT</a> / <a href={`${import.meta.env.BASE_URL}deckcraft/0.18.1/LICENSE-APACHE`} target="_blank" rel="noreferrer">Apache 2.0</a> · <a href="https://github.com/storytold/deckcraft" target="_blank" rel="noreferrer">Código-fonte</a></footer>
  </div>:<div className="craft-editor">{!ready&&<div className="craft-loading" role="status">Iniciando DeckCraft… O primeiro carregamento baixa o editor.<button onClick={()=>{setCompatibility(true);setEngineKey(key=>key+1);setError('');}}>Tentar compatibilidade gráfica</button></div>}<iframe key={engineKey} ref={iframe} title="Editor DeckCraft" src={url.href} allow="clipboard-read; clipboard-write; fullscreen" allowFullScreen/>
   {history&&<aside className="craft-history"><header><h2>Histórico recente</h2><button aria-label="Fechar histórico" onClick={()=>setHistory(false)}><X size={18}/></button></header><p>Até três versões por arquivo; as mais antigas são removidas automaticamente. Restaurar cria uma nova versão. Salve as alterações atuais antes de restaurar.</p>{[...opened.document.revisions].reverse().map((rev,index)=><article key={rev.file}><strong>{index===0?'Atual · ':''}{formatDate(rev.savedAt)}</strong><small>{rev.name} · {(rev.size/1024).toFixed(1)} KB</small><div><button onClick={()=>void openCraftDocument(opened.document.id,rev.file).then(value=>downloadCraftFile(value.version.name,value.bytes)).catch(e=>setError(documentStorageError(e)))}>Baixar</button><button disabled={index===0||dirty||!!saving||!!failed||busy} onClick={()=>void restore(rev.file)}>Restaurar</button></div></article>)}</aside>}</div>}
  {leaving&&<div className="craft-modal"><section role="dialog" aria-modal="true" aria-label="Alterações não salvas"><h2>Há alterações sem salvar</h2><p>Volte ao editor e use Salvar para guardar uma versão no navegador antes de sair.</p><button autoFocus onClick={()=>setLeaving(false)}>Continuar editando</button><button onClick={closeEditor}>Descartar alterações e voltar</button></section></div>}
 </main>,document.body);
}
