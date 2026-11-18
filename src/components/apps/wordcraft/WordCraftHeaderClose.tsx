import {useEffect,useRef,useState,type RefObject} from 'react';
import {X} from 'lucide-react';

type EngineFrame=Window&{wordcraft?:{execute:(command:string,params:object)=>Promise<unknown>}};
type Selection={anchor?:{story?:string|{part:number}}};
type Snapshot={parts?:{id:number;kind:string}[]};

export function WordCraftHeaderClose({frameRef,ready,engineKey,onError}:{frameRef:RefObject<HTMLIFrameElement|null>;ready:boolean;engineKey:number;onError:(message:string)=>void}){
 const [visible,setVisible]=useState(false),[closing,setClosing]=useState(false);
 const exitEpoch=useRef(0);
 useEffect(()=>{
  setVisible(false);setClosing(false);
  if(!ready)return;
  const frame=frameRef.current?.contentWindow as EngineFrame|null,api=frame?.wordcraft;
  if(!frame||!api)return;
  let disposed=false,pending=false,lastPart:number|null=null,headerPart=false;
  let scheduled:ReturnType<typeof setTimeout>|undefined;
  const update=async(force=false)=>{
   if(disposed||pending||document.hidden)return;
   pending=true;
   const epoch=exitEpoch.current;
   try{
    const selection=await api.execute('document.selection',{}) as Selection;
    const story=selection?.anchor?.story,part=typeof story==='object'?story?.part:undefined;
    if(typeof part!=='number'){lastPart=null;headerPart=false;}
    else if(part!==lastPart||force){
     const snapshot=await api.execute('document.inspect',{text:false}) as Snapshot;
     headerPart=!!snapshot.parts?.some(item=>item.id===part&&(item.kind==='header'||item.kind==='footer'));
     lastPart=part;
    }
    if(!disposed&&epoch===exitEpoch.current)setVisible(headerPart);
   }catch{/* The document can still be opening or the iframe can be closing. */}
   finally{pending=false;}
  };
  const schedule=()=>{clearTimeout(scheduled);scheduled=setTimeout(()=>void update(true),80);};
  const events=['pointerup','dblclick','keyup'] as const;
  for(const event of events)frame.document.addEventListener(event,schedule,true);
  const interval=setInterval(()=>void update(),1200);
  void update();
  return()=>{disposed=true;clearInterval(interval);clearTimeout(scheduled);for(const event of events)frame.document.removeEventListener(event,schedule,true);};
 },[ready,engineKey,frameRef]);
 if(!visible||!ready)return null;
 const close=async()=>{
  const frame=frameRef.current?.contentWindow as EngineFrame|null;
  if(!frame?.wordcraft)return;
  setClosing(true);
  exitEpoch.current++;
  try{
   // The engine's existing exit command returns to the body without touching either part.
   await frame.wordcraft.execute('insert.closeHeader',{});
   setVisible(false);frame.focus();frame.document.getElementById('wordcraft_canvas')?.focus({preventScroll:true});
  }catch{onError('Não foi possível sair do cabeçalho e rodapé. Tente novamente.');}
  finally{setClosing(false);}
 };
 return <button className="craft-close-header" disabled={closing} onMouseDown={event=>event.preventDefault()} onClick={()=>void close()}><span aria-hidden="true"><X size={20}/></span>Fechar cabeçalho e rodapé</button>;
}
