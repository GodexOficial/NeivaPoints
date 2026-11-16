import { useEffect, useRef } from 'react';
import { cleanWordHtml } from '../../../utils/wordImport';

export function WordPageChrome({html,kind,page,readOnly,active,left,right,distance,onChange,onActivate}:{
  html:string;kind:'header'|'footer';page:number;readOnly:boolean;active:boolean;left:number;right:number;distance:number;onChange:(html:string)=>void;onActivate:()=>void;
}){
  const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{if(active&&!readOnly)ref.current?.focus({preventScroll:true});},[active,readOnly]);
  return <div className={`word-page-chrome word-imported-page-${kind}`} data-active={active} style={{left:`${left}cm`,right:`${right}cm`,[kind==='header'?'top':'bottom']:`${distance}cm`}}
    ref={el=>{ref.current=el;if(el&&el.innerHTML!==html)el.innerHTML=cleanWordHtml(html);}}
    contentEditable={active&&!readOnly} suppressContentEditableWarning role="textbox" aria-label={`${kind==='header'?'Cabeçalho':'Rodapé'} da página ${page}`} aria-readonly={!active||readOnly} aria-multiline="true" tabIndex={0} spellCheck lang="pt-BR"
    title={active?'Editando — pressione Esc para voltar ao texto':'Clique duas vezes para editar'}
    onDoubleClick={e=>{e.stopPropagation();if(!readOnly)onActivate();}}
    onKeyDown={e=>{if(!active&&!readOnly&&(e.key==='Enter'||e.key==='F2')){e.preventDefault();e.stopPropagation();onActivate();}}}
    onInput={e=>onChange(cleanWordHtml(e.currentTarget.innerHTML))} />;
}
