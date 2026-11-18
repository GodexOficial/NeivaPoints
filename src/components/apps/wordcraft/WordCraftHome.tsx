import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {ArrowLeft,Download,FilePlus,FileText,History,Save,Trash2,Upload,X} from 'lucide-react';
import {craftFileName,deleteCraftDocument,documentStorageError,downloadCraftFile,listCraftDocuments,openCraftDocument,requestCraftPersistence,saveCraftDocument,WORDCRAFT_MAX_BYTES,type CraftDocument} from '../../../services/wordcraftService';
import {WordCraftFontSession,type FontState} from '../../../services/wordcraftFonts';
import {WordCraftFontPanel} from './WordCraftFontPanel';
import {WordCraftHeaderClose} from './WordCraftHeaderClose';


import './wordcraft.css';

type EngineWindow=Window&{wordcraft?:{execute:(command:string,params:object)=>Promise<unknown>}};
type Opened={document:CraftDocument;bytes:Uint8Array};
type SavePacket={name:string;bytes:Uint8Array;saveAs:boolean;id?:string;generation:number};
const primaryFormat=/\.(docx?|docm|dotx?|dotm|odt|ott|rtf)$/i;
const formatDate=(value:string)=>new Date(value).toLocaleString('pt-BR');

export function WordCraftHome({onBack}:{onBack:()=>void}){

 const [documents,setDocuments]=useState<CraftDocument[]>([]),[opened,setOpened]=useState<Opened|null>(null);
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 const [ready,setReady]=useState(false),[dirty,setDirty]=useState(false),[saving,setSaving]=useState(0);
 const [history,setHistory]=useState(false),[leaving,setLeaving]=useState(false),[compatibility,setCompatibility]=useState(false);
 const [fontsOpen,setFontsOpen]=useState(false);
 const [fonts,setFonts]=useState<FontState>({catalog:[],missing:[],loaded:[],loading:'',errors:{},warning:''});
 const fontSession=useRef<WordCraftFontSession|null>(null);
 const [failed,setFailed]=useState<SavePacket|null>(null),[engineKey,setEngineKey]=useState(0);
 const iframe=useRef<HTMLIFrameElement>(null),input=useRef<HTMLInputElement>(null),active=useRef<Opened|null>(null);
 const generation=useRef(0),queue=useRef<Promise<unknown>>(Promise.resolve()),mounted=useRef(true),downloadNext=useRef(false);
 const autoSave=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),saveAction=useRef<()=>void>(()=>{});
 const dirtyRef=useRef(false),pendingRef=useRef(0),failedRef=useRef<SavePacket|null>(null);
 const setEdited=(value:boolean)=>{dirtyRef.current=value;setDirty(value);};
 const setFailure=(value:SavePacket|null)=>{failedRef.current=value;setFailed(value);};
 const refresh=async()=>{try{const result=await listCraftDocuments();if(mounted.current){setDocuments(result.documents);if(result.warning)setNotice(result.warning);}}catch(e){if(mounted.current)setError(documentStorageError(e));}};
 useEffect(()=>{
  if(!ready)return;
  const frame=iframe.current?.contentWindow as EngineWindow|null,api=frame?.wordcraft;
  if(!frame||!api)return;
  const initial:FontState={catalog:[],missing:[],loaded:[],loading:'',errors:{},warning:''};setFonts(initial);
  try{const session=new WordCraftFontSession(api,frame,setFonts);fontSession.current=session;void session.start();return()=>{session.dispose();if(fontSession.current===session)fontSession.current=null;};}
  catch{setFonts({...initial,warning:'Não foi possível iniciar as fontes por link. O documento continua disponível.'});}
 },[ready,engineKey]);
 useEffect(()=>{mounted.current=true;void refresh();const root=document.getElementById('root'),oldInert=root?.inert,overflow=document.body.style.overflow;if(root)root.inert=true;document.body.style.overflow='hidden';return()=>{mounted.current=false;clearTimeout(autoSave.current);if(root)root.inert=oldInert||false;document.body.style.overflow=overflow;};},[]);

 useEffect(()=>{const guard=(event:BeforeUnloadEvent)=>{if(dirtyRef.current||pendingRef.current||failedRef.current){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',guard);return()=>window.removeEventListener('beforeunload',guard);},[]);
 const selectDocument=(value:Opened)=>{active.current=value;setOpened(value);setReady(false);setEdited(false);setFailure(null);setError('');setNotice('');setHistory(false);generation.current++;setEngineKey(key=>key+1);};
 const load=async(id:string)=>{setBusy(true);setError('');try{selectDocument(await openCraftDocument(id));}catch(e){setError(documentStorageError(e));}finally{setBusy(false);}};
 const importFile=async(file?:File)=>{if(!file)return;void requestCraftPersistence();setBusy(true);setError('');try{if(file.size>WORDCRAFT_MAX_BYTES)throw Error('Escolha um documento de até 20 MB.');if(!/\.(docx?|docm|dotx?|dotm|odt|ott|rtf|txt|md)$/i.test(file.name))throw Error('Escolha um documento Word, ODT, RTF ou texto.');const bytes=new Uint8Array(await file.arrayBuffer()),document=await saveCraftDocument(file.name,bytes);selectDocument({document,bytes});}catch(e){setError(documentStorageError(e));}finally{setBusy(false);if(input.current)input.current.value='';}};
 const newDocument=async()=>{setBusy(true);setError('');try{void requestCraftPersistence();const response=await fetch(new URL(`${import.meta.env.BASE_URL}wordcraft/blank.docx`,window.document.baseURI));if(!response.ok)throw Error('Não foi possível carregar o documento em branco.');const bytes=new Uint8Array(await response.arrayBuffer()),document=await saveCraftDocument('Novo documento.docx',bytes);selectDocument({document,bytes});}catch(e){setError(documentStorageError(e));}finally{setBusy(false);}};
 const persist=(packet:SavePacket)=>{
  pendingRef.current++;setSaving(pendingRef.current);
  const task=queue.current.then(async()=>{
   try{
    const current=active.current;if(!current)throw Error('Nenhum documento aberto.');
    // Exports are downloads; only editable formats become the current document.
    const primary=primaryFormat.test(packet.name)||(!packet.saveAs&&packet.name===current.document.name);
    if(!primary){downloadCraftFile(packet.name,packet.bytes);if(failedRef.current===packet)setFailure(null);setNotice('Cópia exportada para os downloads.');return;}
    const same=!packet.saveAs&&packet.name===current.document.name;
    if(downloadNext.current){downloadNext.current=false;downloadCraftFile(packet.name,packet.bytes);}
    const document=await saveCraftDocument(packet.name,packet.bytes,same?current.document:undefined);
    if(!mounted.current)return;
    active.current={document,bytes:packet.bytes};setOpened(active.current);
    if(generation.current===packet.generation)setEdited(false);
    if(!failedRef.current||failedRef.current.generation<=packet.generation)setFailure(null);
    setError('');setNotice(`Salvo neste navegador · ${formatDate(document.updatedAt)}`);
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
   }else if(packet.type==='wordcraft:dirty'&&packet.dirty===true){generation.current++;setEdited(true);clearTimeout(autoSave.current);autoSave.current=setTimeout(()=>saveAction.current(),2000);}
   else if(packet.type==='wordcraft:failed')setError(typeof packet.error==='string'?packet.error:'O WordCraft não conseguiu abrir este documento.');
   else if(packet.type==='wordcraft:save'){
    if(typeof packet.name!=='string'||typeof packet.saveAs!=='boolean')return;
    const data=packet.bytes instanceof ArrayBuffer?new Uint8Array(packet.bytes):ArrayBuffer.isView(packet.bytes)?new Uint8Array(packet.bytes.buffer,packet.bytes.byteOffset,packet.bytes.byteLength):null;
    if(!data||!data.length||data.length>WORDCRAFT_MAX_BYTES){setError('O arquivo devolvido pelo editor está vazio ou excede 20 MB. Exporte pelo WordCraft para preservar suas alterações.');setEdited(true);return;}
    void persist({name:craftFileName(packet.name),bytes:Uint8Array.from(data),saveAs:packet.saveAs,id:typeof packet.id==='string'?packet.id:undefined,generation:generation.current});
   }
  };window.addEventListener('message',receive);return()=>window.removeEventListener('message',receive);
 });
 const save=async()=>{try{clearTimeout(autoSave.current);if(!ready)throw Error('Aguarde o editor iniciar.');const api=(iframe.current?.contentWindow as EngineWindow)?.wordcraft;if(!api)throw Error('O editor ainda está iniciando.');await api.execute('file.save',{});}catch(e){setError(documentStorageError(e));}};
 saveAction.current=()=>{if(!failedRef.current)void save();};
 const closeEditor=()=>{clearTimeout(autoSave.current);active.current=null;setOpened(null);setEdited(false);setFailure(null);setLeaving(false);setHistory(false);setError('');setNotice('');void refresh();};
 const back=()=>{if(pendingRef.current){setNotice('Aguarde o salvamento terminar.');return;}if(dirtyRef.current||failedRef.current){setLeaving(true);return;}closeEditor();};
 const restore=async(file:string)=>{const current=active.current;if(!current||dirtyRef.current||pendingRef.current||failedRef.current)return;setBusy(true);try{const old=await openCraftDocument(current.document.id,file),document=await saveCraftDocument(old.version.name,old.bytes,current.document);selectDocument({document,bytes:old.bytes});setNotice('Versão restaurada. O histórico mantém até três versões recentes.');}catch(e){setError(documentStorageError(e));}finally{setBusy(false);}};
 const url=new URL(`${import.meta.env.BASE_URL}wordcraft/0.18.1/index.html`,document.baseURI);url.searchParams.set('host','parent');if(compatibility)url.searchParams.set('webgl','');
 return createPortal(<main className="craft-shell" aria-label="WordCraft experimental">
  <header className="craft-hostbar"><button onClick={opened?back:onBack}><ArrowLeft size={18}/>Voltar</button><strong>{opened?opened.document.name:'WordCraft'} <small>Experimental · 0.18.1</small></strong><span className="craft-status" role="status">{saving?'Salvando no navegador…':dirty?'Alterações não salvas':opened?'Salvo neste navegador':'Até 5 documentos'}</span>{opened&&<><WordCraftHeaderClose frameRef={iframe} ready={ready} engineKey={engineKey} onError={setError}/><button onClick={()=>void save()} disabled={!ready||!!saving}><Save size={17}/>Salvar</button><button onClick={()=>{setHistory(!history);setFontsOpen(false);}}><History size={17}/>Histórico</button><button onClick={()=>{setFontsOpen(!fontsOpen);setHistory(false);}} aria-pressed={fontsOpen}>Fontes{fonts.loading?'…':fonts.missing.length?` (${fonts.missing.length})`:''}</button><button disabled={!ready||!!saving} onClick={()=>{downloadNext.current=true;void save();}}><Download size={17}/>Baixar arquivo</button></>}</header>
  {(error||notice)&&<div className={`craft-message ${error?'craft-error':''}`} role={error?'alert':'status'}>{error||notice}{failed&&<><button onClick={()=>void persist(failed)} disabled={!!saving}>Tentar salvar novamente</button><button onClick={()=>downloadCraftFile(failed.name,failed.bytes)}>Baixar cópia de recuperação</button></>}</div>}
  {!opened?<div className="craft-home"><h1>Seus documentos no WordCraft</h1><p>Crie ou abra documentos. O salvamento automático mantém até 5 arquivos e 3 versões por arquivo neste navegador, com limite total de 25 MB.</p>
   <p className="craft-storage-note">Nenhuma pasta precisa ser selecionada. Para guardar uma cópia permanente ou abrir em outro dispositivo, use Baixar arquivo. Limpar os dados do site também remove estes documentos.</p>

   <div className="craft-actions"><button disabled={busy} onClick={()=>void newDocument()}><FilePlus/>Documento em branco</button><button disabled={busy} onClick={()=>input.current?.click()}><Upload/>Abrir do computador</button></div>
   <input ref={input} type="file" accept=".docx,.doc,.docm,.dotx,.dot,.dotm,.odt,.ott,.rtf,.txt,.md" hidden onChange={event=>void importFile(event.target.files?.[0])}/>
   <h2>Recentes <small>{busy?'Carregando…':documents.length+' de 5 documentos'}</small></h2><div className="craft-recents">{documents.map(doc=><article key={doc.id}><button disabled={busy} onClick={()=>void load(doc.id)}><FileText/><span><strong>{doc.name}</strong><small>{doc.revisions.length} versão(ões) · {formatDate(doc.updatedAt)}</small></span><span>Abrir</span></button><button aria-label={'Baixar '+doc.name} disabled={busy} onClick={()=>void openCraftDocument(doc.id).then(value=>downloadCraftFile(value.document.name,value.bytes)).catch(e=>setError(documentStorageError(e)))}><Download size={18}/></button><button aria-label={'Excluir '+doc.name} disabled={busy} onClick={()=>{if(window.confirm('Excluir este documento e seu histórico do navegador? Baixe uma cópia antes de excluir.'))void deleteCraftDocument(doc.id).then(refresh).catch(e=>setError(documentStorageError(e)));}}><Trash2 size={18}/></button></article>)}{!documents.length&&!busy&&<p>Crie um documento ou abra um arquivo para começar.</p>}</div>
   <footer>WordCraft © StoryTold · <a href={`${import.meta.env.BASE_URL}wordcraft/0.18.1/LICENSE-MIT`} target="_blank" rel="noreferrer">Licença MIT</a> / <a href={`${import.meta.env.BASE_URL}wordcraft/0.18.1/LICENSE-APACHE`} target="_blank" rel="noreferrer">Apache 2.0</a> · <a href="https://github.com/storytold/wordcraft" target="_blank" rel="noreferrer">Código-fonte</a></footer>
  </div>:<div className="craft-editor">{!ready&&<div className="craft-loading" role="status">Iniciando WordCraft… O primeiro carregamento baixa o editor.<button onClick={()=>{setCompatibility(true);setEngineKey(key=>key+1);setError('');}}>Tentar modo de compatibilidade gráfica</button></div>}<iframe key={engineKey} ref={iframe} title="Editor WordCraft" src={url.href} allow="clipboard-read; clipboard-write; fullscreen" allowFullScreen/>
   {fontsOpen&&<WordCraftFontPanel state={fonts} onClose={()=>setFontsOpen(false)} onLoad={family=>void fontSession.current?.load(family)} onScan={()=>void fontSession.current?.scan()}/>}
   {history&&<aside className="craft-history"><header><h2>Histórico recente</h2><button aria-label="Fechar histórico" onClick={()=>setHistory(false)}><X size={18}/></button></header><p>Até três versões por documento; as mais antigas são removidas automaticamente. Restaurar cria uma nova versão. Salve as alterações atuais antes de restaurar.</p>{[...opened.document.revisions].reverse().map((rev,index)=><article key={rev.file}><strong>{index===0?'Atual · ':''}{formatDate(rev.savedAt)}</strong><small>{rev.name} · {(rev.size/1024).toFixed(1)} KB</small><div><button onClick={()=>void openCraftDocument(opened.document.id,rev.file).then(value=>downloadCraftFile(value.version.name,value.bytes)).catch(e=>setError(documentStorageError(e)))}>Baixar</button><button disabled={index===0||dirty||!!saving||!!failed||busy} onClick={()=>void restore(rev.file)}>Restaurar</button></div></article>)}</aside>}</div>}
  {leaving&&<div className="craft-modal"><section role="dialog" aria-modal="true" aria-label="Alterações não salvas"><h2>Há alterações sem salvar</h2><p>Volte ao editor e use Salvar para guardar uma versão no navegador antes de sair.</p><button autoFocus onClick={()=>setLeaving(false)}>Continuar editando</button><button onClick={closeEditor}>Descartar alterações e voltar</button></section></div>}
 </main>,document.body);
}
