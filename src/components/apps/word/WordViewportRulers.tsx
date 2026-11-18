import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
interface Props {
  canvasRef: RefObject<HTMLDivElement | HTMLElement | null>;
  pageIndex:number; zoom:number; pageWidthCm:number; pageHeightCm:number;
  left:number; right:number; indent:number; top:number; bottom:number;
  cells?:HTMLTableCellElement[]; blocks?:HTMLElement[]; paragraph?:boolean; revision?:unknown;
  changeLeft:(value:number)=>void; changeRight:(value:number)=>void; changeIndent:(value:number)=>void;
  changeTop:(value:number)=>void; changeBottom:(value:number)=>void; readOnly:boolean;
}
type Marker='left'|'right'|'indent'|'top'|'bottom';
type Band={start:number;end:number;cell:boolean};
type Context={start:number;end:number;baseStart:number;baseEnd:number;indent:number;minimum:number;maximum:number;bands:Band[];lines:{start:number;end:number}[];cell:boolean};
const px=(style:CSSStyleDeclaration,key:string)=>parseFloat(style.getPropertyValue(key))||0;
/** Physical page coordinates remain the source of truth, even for imported and zoomed content. */
export function WordViewportRulers(p:Props){
  const [geometry,setGeometry]=useState({x:0,y:0,scale:96/2.54,width:0,height:0,canvasLeft:0,canvasTop:0,canvasRight:0,canvasBottom:0});
  const [context,setContext]=useState<Context|null>(null);
  const dragging=useRef<Marker|null>(null), live=useRef(p);live.current=p;
  useEffect(()=>{
    let frame=0;const canvas=p.canvasRef.current;if(!canvas)return;
    const measure=()=>{
      frame=0;const props=live.current,sheet=canvas.querySelectorAll<HTMLElement>('.a4-page-sheet')[props.pageIndex];if(!sheet)return;
      const rect=sheet.getBoundingClientRect(),area=canvas.getBoundingClientRect(),scale=rect.width/props.pageWidthCm,zoom=scale/(96/2.54);
      if(!scale)return;
      const next={x:rect.left,y:rect.top,scale,width:rect.width,height:rect.height,canvasLeft:area.left,canvasTop:area.top,canvasRight:area.left+canvas.clientWidth,canvasBottom:area.top+canvas.clientHeight};
      setGeometry(old=>Object.keys(next).every(key=>Math.abs(next[key as keyof typeof next]-old[key as keyof typeof next])<.05)?old:next);
      const cm=(x:number)=>(x-rect.left)/scale;
      const contentBox=(element:HTMLElement)=>{const box=element.getBoundingClientRect(),style=getComputedStyle(element);return{start:cm(box.left+(px(style,'padding-left')+px(style,'border-left-width'))*zoom),end:cm(box.right-(px(style,'padding-right')+px(style,'border-right-width'))*zoom)};};
      const cells=(props.cells||[]).filter(cell=>cell.isConnected&&sheet.contains(cell));
      const selection=getSelection(),range=selection?.rangeCount?selection.getRangeAt(0):null;
      const anchor=selection?.anchorNode instanceof Element?selection.anchorNode:selection?.anchorNode?.parentElement;
      const block=cells.length?cells[0].querySelector<HTMLElement>('p,h1,h2,h3,h4,h5,h6,li,blockquote'):(props.blocks||[]).find(node=>node.isConnected&&sheet.contains(node));
      if(!cells.length&&(!props.paragraph||!block)){setContext(null);return;}
      const owner=cells[0],box=block?contentBox(block):contentBox(owner),style=getComputedStyle(block||owner);
      const baseStart=box.start-px(style,'margin-left')/(96/2.54),baseEnd=box.end+px(style,'margin-right')/(96/2.54);
      const boundary=owner?owner.getBoundingClientRect():rect;
      const bands=cells.length?cells.map(cell=>({...contentBox(cell),cell:true})):[{start:box.start,end:box.end,cell:false}];
      // Project the current visual line (soft wrap or explicit BR) onto the ruler.
      const lines:Context['lines']=[];
      const lineBlock=anchor?.closest<HTMLElement>('p,h1,h2,h3,h4,h5,h6,li,blockquote');
      if(range&&lineBlock&&sheet.contains(lineBlock)&&(!owner||cells.some(cell=>cell.contains(lineBlock)))){
        const all=document.createRange();all.selectNodeContents(lineBlock);
        const segments=[...all.getClientRects()].filter(r=>r.height>0&&r.width>0);
        const caret=range.cloneRange();caret.collapse(true);let caretBox=caret.getClientRects()[0];
        if(!caretBox&&caret.startContainer instanceof Element){const el=caret.startContainer;const child=el.childNodes[caret.startOffset];const previous=el.childNodes[caret.startOffset-1];const probe=document.createRange();if(child){probe.selectNode(child);caretBox=probe.getClientRects()[0];}else if(previous){probe.selectNode(previous);caretBox=probe.getClientRects()[0];}}
        if(caretBox){const middle=caretBox.top+caretBox.height/2,at=segments.filter(r=>middle>=r.top-1&&middle<=r.bottom+1);if(at.length)lines.push({start:cm(Math.min(...at.map(r=>r.left))),end:cm(Math.max(...at.map(r=>r.right)))});else lines.push({start:cm(caretBox.left),end:cm(caretBox.left)});}
      }
      const nextContext:Context={start:box.start,end:box.end,baseStart,baseEnd,indent:px(style,'text-indent')/(96/2.54),minimum:cm(boundary.left),maximum:cm(boundary.right),bands,lines,cell:!!owner};
      setContext(old=>JSON.stringify(old)===JSON.stringify(nextContext)?old:nextContext);
    };
    const schedule=()=>{if(!frame)frame=requestAnimationFrame(measure);};
    const observer=new ResizeObserver(schedule);observer.observe(canvas);
    canvas.querySelectorAll('.a4-page-sheet').forEach(sheet=>observer.observe(sheet));
    (p.cells||[]).filter(cell=>cell.isConnected).forEach(cell=>observer.observe(cell));
    const mutation=new MutationObserver(schedule);mutation.observe(canvas,{childList:true,subtree:true,attributes:true,characterData:true});
    canvas.addEventListener('scroll',schedule,{passive:true});document.addEventListener('selectionchange',schedule);window.addEventListener('resize',schedule);document.fonts?.addEventListener('loadingdone',schedule);schedule();
    return()=>{cancelAnimationFrame(frame);observer.disconnect();mutation.disconnect();canvas.removeEventListener('scroll',schedule);document.removeEventListener('selectionchange',schedule);window.removeEventListener('resize',schedule);document.fonts?.removeEventListener('loadingdone',schedule);};
  },[p.canvasRef,p.pageIndex,p.zoom,p.pageWidthCm,p.pageHeightCm,p.cells,p.blocks,p.paragraph,p.revision,p.left,p.right,p.indent]);
  const horizontalLeft=Math.max(geometry.canvasLeft+24,geometry.x),horizontalWidth=Math.max(0,Math.min(geometry.canvasRight,geometry.x+geometry.width)-horizontalLeft);
  const verticalTop=Math.max(geometry.canvasTop+36,geometry.y),verticalHeight=Math.max(0,Math.min(geometry.canvasBottom,geometry.y+geometry.height)-verticalTop);
  const left=context?.start??p.left,right=context?p.pageWidthCm-context.end:p.right,indent=context?.indent??p.indent;
  const values={left,right,indent,top:p.top,bottom:p.bottom};
  const change=(type:Marker,raw:number)=>{
    const value=Math.round(raw*100)/100;
    if(type==='left'){const start=Math.max(context?.minimum??0,Math.min(p.pageWidthCm-right-.2,value));p.changeLeft(context?start-context.baseStart:start);}
    if(type==='right'){const end=Math.min(context?.maximum??p.pageWidthCm,Math.max(left+.2,p.pageWidthCm-value));p.changeRight(context?context.baseEnd-end:p.pageWidthCm-end);}
    if(type==='indent')p.changeIndent(Math.max((context?.minimum??0)-left,Math.min(p.pageWidthCm-right-left-.1,value)));
    if(type==='top')p.changeTop(Math.max(.5,Math.min(p.pageHeightCm-p.bottom-2,value)));
    if(type==='bottom')p.changeBottom(Math.max(.5,Math.min(p.pageHeightCm-p.top-2,value)));
  };
  const labels={left:context?'Recuo esquerdo do texto':'Margem esquerda',right:context?'Recuo direito do texto':'Margem direita',indent:'Recuo da primeira linha',top:'Margem superior',bottom:'Margem inferior'};
  const marker=(type:Marker)=>{
    const vertical=type==='top'||type==='bottom',cm=type==='right'?p.pageWidthCm-right:type==='bottom'?p.pageHeightCm-p.bottom:type==='indent'?left+indent:values[type];
    const position=(vertical?geometry.y-verticalTop:geometry.x-horizontalLeft)+cm*geometry.scale;
    const displayed=context&&type==='left'?context.start-context.baseStart:context&&type==='right'?context.baseEnd-context.end:values[type];
    return <button key={type} type="button" role="slider" className={`word-viewport-marker word-marker-${type}`} style={vertical?{top:position}:{left:position}} aria-label={labels[type]} aria-valuenow={displayed} aria-valuemin={type==='indent'?-left:context&&(type==='left'||type==='right')?-p.pageWidthCm:0} aria-valuemax={vertical?p.pageHeightCm:p.pageWidthCm} aria-valuetext={`${displayed.toFixed(2)} cm`} aria-orientation={vertical?'vertical':'horizontal'} title={`${labels[type]}: ${displayed.toFixed(2)} cm`} disabled={p.readOnly}
      onPointerDown={event=>{event.preventDefault();dragging.current=type;event.currentTarget.setPointerCapture(event.pointerId);}}
      onPointerMove={event=>{if(dragging.current!==type)return;const cm=(vertical?event.clientY-geometry.y:event.clientX-geometry.x)/geometry.scale;change(type,type==='right'?p.pageWidthCm-cm:type==='bottom'?p.pageHeightCm-cm:type==='indent'?cm-left:cm);}}
      onPointerUp={event=>{dragging.current=null;if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);}} onPointerCancel={()=>{dragging.current=null;}}
      onKeyDown={event=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();event.stopPropagation();const direction=['ArrowLeft','ArrowUp'].includes(event.key)?-1:1;change(type,values[type]+direction*(type==='right'||type==='bottom'?-.1:.1));}}}/>;
  };
  const ticks=(vertical:boolean)=>{
    const offset=vertical?geometry.y-verticalTop:geometry.x-horizontalLeft,extent=vertical?verticalHeight:horizontalWidth,pageSize=vertical?p.pageHeightCm:p.pageWidthCm,margin=vertical?p.top:context?.baseStart??left;
    const from=Math.ceil((Math.max(0,-offset/geometry.scale)-margin)*4),to=Math.floor((Math.min(pageSize,(extent-offset)/geometry.scale)-margin)*4);
    return Array.from({length:Math.max(0,to-from+1)},(_,i)=>{const tick=from+i,number=tick/4,cm=margin+number,position=offset+cm*geometry.scale;return <span key={tick} className={`word-viewport-tick ${tick%4?tick%2?'quarter':'half':'whole'}`} style={vertical?{top:position}:{left:position}}>{tick%4===0&&number>=0&&cm<pageSize-(vertical?p.bottom:right)&&<span>{number}</span>}</span>;});
  };
  const bands=context?.bands||[{start:left,end:p.pageWidthCm-right,cell:false}];
  return <div className="word-viewport-rulers" data-motion="off">
    <div className="word-viewport-ruler-horizontal" aria-label="Régua horizontal" data-page-origin={geometry.x} data-pixels-per-cm={geometry.scale} data-context={context?.cell?'cells':context?'paragraph':'page'} style={{left:horizontalLeft,top:geometry.canvasTop+7,width:horizontalWidth}}>
      {bands.map((band,index)=><div key={index} className={`word-viewport-paper-band ${band.cell?'word-ruler-cell-band':''}`} data-cell={band.cell?index:undefined} style={{left:geometry.x-horizontalLeft+band.start*geometry.scale,width:Math.max(0,band.end-band.start)*geometry.scale}}/>)}
      {ticks(false)}{context?.lines.map((line,index)=><span key={index} className="word-ruler-text-line" aria-label="Início e fim da linha de texto" title="Início e fim da linha de texto atual" style={{left:geometry.x-horizontalLeft+line.start*geometry.scale,width:Math.max(1,(line.end-line.start)*geometry.scale)}}/>)}
      {marker('left')}{marker('right')}{marker('indent')}
    </div>
    <div className="word-viewport-ruler-vertical" aria-label="Régua vertical" data-page-origin={geometry.y} style={{left:geometry.canvasLeft+6,top:verticalTop,height:verticalHeight}}><div className="word-viewport-paper-band" style={{top:geometry.y-verticalTop+p.top*geometry.scale,height:Math.max(0,p.pageHeightCm-p.top-p.bottom)*geometry.scale}}/>{ticks(true)}{marker('top')}{marker('bottom')}</div>
    <div className="word-viewport-ruler-corner" style={{left:geometry.canvasLeft+6,top:geometry.canvasTop+7}} aria-hidden="true">⌞</div>
  </div>;
}
