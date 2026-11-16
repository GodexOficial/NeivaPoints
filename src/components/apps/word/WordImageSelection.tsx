import { useEffect, useState } from 'react';

/** Selection lives outside the document HTML, so it never enters saved files. */
export function WordImageSelection({readOnly}:{readOnly:boolean}){
  const [selected,setSelected]=useState<HTMLImageElement|null>(null);
  const [box,setBox]=useState<{left:number;top:number;width:number;height:number}|null>(null);
  useEffect(()=>{
    function select(event:PointerEvent){
      const target=event.target;if(!(target instanceof Element))return;
      const image=target.closest('img');
      const owner=image?.closest<HTMLElement>('.word-editable,.word-page-chrome');
      if(!readOnly&&image&&owner?.isContentEditable){
        event.preventDefault();event.stopPropagation();owner.focus({preventScroll:true});
        const range=document.createRange();range.selectNode(image);const selection=getSelection();selection?.removeAllRanges();selection?.addRange(range);setSelected(image);
      }else if(!target.closest('.word-toolbar-shell'))setSelected(null);
    }
    function key(event:KeyboardEvent){
      if(!selected?.isConnected||readOnly)return;
      if(event.target instanceof Element&&event.target.closest('input,textarea,select'))return;
      if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();setSelected(null);return;}
      if((event.key==='Delete'||event.key==='Backspace')&&!event.ctrlKey&&!event.metaKey&&!event.altKey){
        const owner=selected.closest<HTMLElement>('[contenteditable=true]');if(!owner)return;
        event.preventDefault();event.stopImmediatePropagation();owner.focus({preventScroll:true});
        const range=document.createRange();range.selectNode(selected);const selection=getSelection();selection?.removeAllRanges();selection?.addRange(range);
        document.execCommand('delete');setSelected(null);
      }
    }
    document.addEventListener('pointerdown',select,true);document.addEventListener('keydown',key,true);
    return()=>{document.removeEventListener('pointerdown',select,true);document.removeEventListener('keydown',key,true);};
  },[selected,readOnly]);
  useEffect(()=>{
    function update(){
      const owner=selected?.closest<HTMLElement>('.word-editable,.word-page-chrome');
      if(!selected?.isConnected||!owner?.isContentEditable||readOnly){setBox(null);return;}
      const r=selected.getBoundingClientRect();setBox({left:r.left,top:r.top,width:r.width,height:r.height});
    }
    update();document.addEventListener('scroll',update,true);window.addEventListener('resize',update);
    const observer=new ResizeObserver(update);if(selected)observer.observe(selected);
    return()=>{document.removeEventListener('scroll',update,true);window.removeEventListener('resize',update);observer.disconnect();};
  },[selected,readOnly]);
  if(!box)return null;
  return <div className="word-image-selection" role="status" aria-label="Imagem selecionada" style={box}><span>Imagem selecionada</span></div>;
}
