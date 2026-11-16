import { useRef } from 'react';
import { cleanWordHtml } from '../../../utils/wordImport';

export function WordPageChrome({html,kind,page,readOnly,left,right,distance,onChange}:{
  html:string;kind:'header'|'footer';page:number;readOnly:boolean;left:number;right:number;distance:number;onChange:(html:string)=>void;
}){
  const ref=useRef<HTMLDivElement>(null);
  return <div className={`word-imported-page-${kind}`} style={{left:`${left}cm`,right:`${right}cm`,[kind==='header'?'top':'bottom']:`${distance}cm`}}
    ref={el=>{ref.current=el;if(el&&el.innerHTML!==html)el.innerHTML=cleanWordHtml(html);}}
    contentEditable={!readOnly} suppressContentEditableWarning role="textbox" aria-label={`${kind==='header'?'Cabeçalho':'Rodapé'} da página ${page}`} aria-multiline="true" spellCheck lang="pt-BR"
    onInput={e=>onChange(cleanWordHtml(e.currentTarget.innerHTML))} />;
}
