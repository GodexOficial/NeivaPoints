import {useEffect,useRef,useState} from 'react';
import {Move,SlidersHorizontal,Trash2} from 'lucide-react';
import {runTableCommand} from '../../../utils/wordTableCommands';
import {deleteWordObject,objectChanged,objectMode,objectScale,positionObject,setObjectSize,setObjectWrap,wordObject,type WordObject,type WordWrap} from '../../../utils/wordObjects';

const modes:[WordWrap,string][]=[['inline','Em linha com o texto'],['block','Acima e abaixo do texto'],['square','Ao lado do texto'],['front','À frente do texto'],['behind','Atrás do texto']];
type DragStart=Pick<PointerEvent,'pointerId'|'clientX'|'clientY'|'button'|'preventDefault'|'stopPropagation'>;
type Change={owner:HTMLElement;before:string;after:string};
export function WordObjectControls({readOnly,onSelectTable}:{readOnly:boolean;onSelectTable:(table:HTMLTableElement)=>void}){
  const [selected,setSelected]=useState<WordObject|null>(null),[hoverTable,setHoverTable]=useState<HTMLTableElement|null>(null),[menu,setMenu]=useState(false),[splitRow,setSplitRow]=useState(2);
  const [box,setBox]=useState<{left:number;top:number;width:number;height:number}|null>(null),[revision,refresh]=useState(0);
  const history=useRef<Change[][]>([]),redo=useRef<typeof history.current>([]),dragging=useRef(false),cleanup=useRef<(()=>void)|null>(null),gestureRef=useRef<(event:DragStart,o:WordObject,handle?:string)=>void>(()=>{});
  const [preview,setPreview]=useState<{left:number;top:number;width:number;height:number}|null>(null);
  const [error,setError]=useState('');
  const remember=(owner:HTMLElement,before:string,additional:Change[]=[])=>{const changes=[{owner,before,after:owner.innerHTML},...additional].filter(c=>c.before!==c.after);if(changes.length){history.current.push(changes);history.current=history.current.slice(-30);redo.current=[];}objectChanged(owner);refresh(n=>n+1);};
  const change=(fn:(o:WordObject)=>void)=>{if(selected){const before=selected.owner.innerHTML;try{fn(selected);setError('');remember(selected.owner,before);}catch(e){setError(e instanceof Error?e.message:'Não foi possível alterar o objeto.');}}};
  useEffect(()=>()=>cleanup.current?.(),[]);
  useEffect(()=>{
    const select=(e:PointerEvent)=>{const t=e.target;if(e.button!==0||!(t instanceof Element)||t.closest('[data-word-object-ui]'))return;let o=wordObject(t);
      if(e.altKey&&!o){const owner=t.closest<HTMLElement>('.word-editable,.word-page-chrome');const behind=Array.from(owner?.querySelectorAll<HTMLElement>('[data-word-wrap="behind"]')||[]).reverse().find(el=>{const r=el.getBoundingClientRect();return e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom;});if(behind)o=wordObject(behind);}
      if(!readOnly&&o){if(o.kind==='textbox'){const r=o.root.getBoundingClientRect();if(Math.min(e.clientX-r.left,r.right-e.clientX,e.clientY-r.top,r.bottom-e.clientY)>7&&o.root.textContent?.trim()){setSelected(null);return;}}
        e.preventDefault();e.stopPropagation();o.owner.focus({preventScroll:true});const r=document.createRange();r.selectNode(o.root);const s=getSelection();s?.removeAllRanges();s?.addRange(r);setSelected(o);setMenu(false);gestureRef.current(e,o);
      }else if(!t.closest('.word-toolbar-shell')){setSelected(null);setMenu(false);}};
    const hover=(e:PointerEvent)=>{if(dragging.current)return;const t=e.target;if(!(t instanceof Element)||t.closest('[data-word-object-ui]'))return;setHoverTable(readOnly?null:t.closest<HTMLTableElement>('.word-editable table,.word-page-chrome[data-active=true] table'));};
    const key=(e:KeyboardEvent)=>{
      if(readOnly||e.target instanceof Element&&e.target.closest('input,textarea,select'))return;
      if((e.ctrlKey||e.metaKey)&&['z','y'].includes(e.key.toLowerCase())){const back=e.key.toLowerCase()==='z'&&!e.shiftKey,from=back?history.current:redo.current,to=back?redo.current:history.current,item=from.at(-1);if(item?.every(c=>c.owner.isConnected&&c.owner.innerHTML===(back?c.after:c.before))){e.preventDefault();e.stopImmediatePropagation();from.pop();to.push(item);item.forEach(c=>{c.owner.innerHTML=back?c.before:c.after;});item.forEach(c=>objectChanged(c.owner));setSelected(null);}return;}
      if(e.key==='Escape'&&selected){e.preventDefault();e.stopImmediatePropagation();setSelected(null);setMenu(false);return;}
      if(['Delete','Backspace'].includes(e.key)&&!e.ctrlKey&&!e.metaKey&&!e.altKey){const n=getSelection()?.anchorNode,b=(n instanceof Element?n:n?.parentElement)?.closest<HTMLElement>('[data-word-floating]');const o=selected?.root.isConnected?selected:b&&!b.textContent?.trim()?wordObject(b):null;if(o&&o.kind!=='table'){e.preventDefault();e.stopImmediatePropagation();const before=o.owner.innerHTML;deleteWordObject(o);remember(o.owner,before);setSelected(null);setMenu(false);}}
    };
    document.addEventListener('pointerdown',select,true);document.addEventListener('pointermove',hover);document.addEventListener('keydown',key,true);
    return()=>{document.removeEventListener('pointerdown',select,true);document.removeEventListener('pointermove',hover);document.removeEventListener('keydown',key,true);};
  },[selected,readOnly]);
  useEffect(()=>{
    const update=()=>{if(!selected?.root.isConnected||!selected.owner.isContentEditable||readOnly){setBox(null);return;}const r=selected.root.getBoundingClientRect();setBox({left:r.left,top:r.top,width:r.width,height:r.height});};
    update();document.addEventListener('scroll',update,true);window.addEventListener('resize',update);const observer=new ResizeObserver(update);if(selected?.root.isConnected)observer.observe(selected.root);
    return()=>{document.removeEventListener('scroll',update,true);window.removeEventListener('resize',update);observer.disconnect();};
  },[selected,readOnly,revision]);
  function gesture(e:DragStart,o:WordObject,handle?:string){
    if(readOnly||e.button!==0)return;e.preventDefault();e.stopPropagation();cleanup.current?.();setSelected(o);setMenu(false);if(o.kind==='table')onSelectTable(o.root as HTMLTableElement);
    const before=o.owner.innerHTML,origin=o.root.getBoundingClientRect(),scale=objectScale(o),sx=e.clientX,sy=e.clientY,parent=(o.root.offsetParent as HTMLElement|null)?.getBoundingClientRect()||o.owner.getBoundingClientRect(),v=o.visual.getBoundingClientRect(),width=v.width/scale,height=v.height/scale;
    let moved=false,x=sx,y=sy,frame=0;dragging.current=true;
    const paint=()=>{frame=0;const dx=(x-sx)/scale,dy=(y-sy)/scale;if(Math.hypot(dx,dy)<3&&!moved)return;moved=true;
      if(handle){let w=width+(handle.includes('e')?dx:handle.includes('w')?-dx:0),h=height+(handle.includes('s')?dy:handle.includes('n')?-dy:0);if(handle.length===2){const ratio=width/height;if(Math.abs(w-width)>Math.abs(h-height)*ratio)h=w/ratio;else w=h*ratio;}w=Math.max(16,w);h=Math.max(16,h);setObjectSize(o,w,h);if(o.root.style.position==='absolute'){if(handle.includes('w'))o.root.style.left=`${(origin.left-parent.left)/scale+width-w}px`;if(handle.includes('n'))o.root.style.top=`${(origin.top-parent.top)/scale+height-h}px`;}}
      else if(o.root.style.position==='absolute'){const bounds=o.root.closest('.a4-page-sheet')?.getBoundingClientRect()||o.owner.getBoundingClientRect();const left=Math.max((bounds.left-parent.left)/scale,Math.min((bounds.right-parent.left-origin.width)/scale,(origin.left-parent.left)/scale+dx)),top=Math.max((bounds.top-parent.top)/scale,Math.min((bounds.bottom-parent.top-origin.height)/scale,(origin.top-parent.top)/scale+dy));o.root.style.left=`${left}px`;o.root.style.top=`${top}px`;o.visual.dataset.wordX=String(left);o.visual.dataset.wordY=String(top);}else setPreview({left:origin.left+dx*scale,top:origin.top+dy*scale,width:origin.width,height:origin.height});refresh(n=>n+1);
    };
    const move=(ev:PointerEvent)=>{if(ev.pointerId!==e.pointerId)return;x=ev.clientX;y=ev.clientY;if(!frame)frame=requestAnimationFrame(paint);};
    const end=(ev:PointerEvent)=>{if(ev.pointerId!==e.pointerId)return;if(frame){cancelAnimationFrame(frame);paint();}const additional:Change[]=[];
      if(moved&&!handle&&o.root.style.position!=='absolute'){
        const hit=document.elementFromPoint(ev.clientX,ev.clientY),dest=hit?.closest<HTMLElement>('.word-editable,.word-page-chrome');
        if(dest?.isContentEditable&&(dest===o.owner||o.owner.classList.contains('word-editable')&&dest.classList.contains('word-editable'))&&(o.kind==='table'||!o.root.contains(hit))){
          const target=hit?.closest<HTMLElement>('p,h1,h2,h3,table,[data-word-anchor-group]'),destinationBefore=dest.innerHTML;
          if(o.kind==='table'){if(target&&target!==o.root&&!o.root.contains(target)){const b=target.closest('table')||target;b.parentElement?.insertBefore(o.root,ev.clientY<b.getBoundingClientRect().top+b.getBoundingClientRect().height/2?b:b.nextSibling);}else if(!target)dest.append(o.root);const bounds=dest.closest('.a4-page-sheet')?.getBoundingClientRect()||dest.getBoundingClientRect(),ownerBox=dest.getBoundingClientRect();o.root.style.marginLeft=`${Math.max((bounds.left-ownerBox.left)/scale,Math.min((bounds.right-ownerBox.left-origin.width)/scale,(origin.left-ownerBox.left+ev.clientX-sx)/scale))}px`;}
          else{const doc=document as Document&{caretRangeFromPoint?:(x:number,y:number)=>Range},r=doc.caretRangeFromPoint?.(ev.clientX,ev.clientY);const previous=o.root.parentElement;if(o.root.tagName==='DIV'&&target){target.parentElement?.insertBefore(o.root,ev.clientY<target.getBoundingClientRect().top+target.getBoundingClientRect().height/2?target:target.nextSibling);}else if(r&&dest.contains(r.startContainer)&&!o.root.contains(r.startContainer)){r.insertNode(o.root);}else dest.append(o.root);if(previous&&previous!==o.owner&&!previous.textContent?.trim()&&!previous.querySelector('img,svg,table,[data-word-floating]'))previous.remove();}if(dest!==o.owner){additional.push({owner:dest,before:destinationBefore,after:dest.innerHTML});objectChanged(dest);setSelected({...o,owner:dest});}
        }
      }
      cleanup.current?.();if(moved)remember(o.owner,before,additional);refresh(n=>n+1);
    };
    const cancel=()=>{o.owner.innerHTML=before;cleanup.current?.();setSelected(null);},old=document.body.style.userSelect;document.body.style.userSelect='none';
    cleanup.current=()=>{document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',end);document.removeEventListener('pointercancel',cancel);document.body.style.userSelect=old;dragging.current=false;cleanup.current=null;setPreview(null);if(frame)cancelAnimationFrame(frame);};
    document.addEventListener('pointermove',move);document.addEventListener('pointerup',end);document.addEventListener('pointercancel',cancel);
  }
  gestureRef.current=gesture;
  const table=selected?.kind==='table'?selected.root as HTMLTableElement:hoverTable,r=table?.isConnected?table.getBoundingClientRect():null;
  return <>
    {preview&&<div data-word-object-ui className="word-object-drag-preview" style={preview}/>}
    {r&&!readOnly&&<button data-word-object-ui className="word-table-move-handle" aria-label="Mover ou selecionar tabela" title="Clique para selecionar; arraste para mover" style={{left:Math.max(2,r.left-25),top:r.top-25}} onPointerDown={e=>{const owner=table!.closest<HTMLElement>('.word-editable,.word-page-chrome');if(owner?.isContentEditable)gesture(e,{root:table!,visual:table!,owner,kind:'table'});}}><Move size={18}/></button>}
    {box&&selected&&<div data-word-object-ui className="word-object-selection" role="status" aria-label={selected.kind==='image'?'Imagem selecionada':selected.kind==='table'?'Tabela selecionada':'Objeto selecionado'} style={box}>
      {selected.kind!=='table'&&<><button className="word-object-move" aria-label="Arrastar objeto" onPointerDown={e=>gesture(e,selected)}><Move size={16}/></button>{['nw','n','ne','e','se','s','sw','w'].map(h=><button key={h} className={`word-object-resize handle-${h}`} aria-label={`Redimensionar ${h}`} title={h.length===2?'Manter proporção':'Esticar'} onPointerDown={e=>gesture(e,selected,h)}/>)}</>}
      <button className="word-object-options-toggle" aria-label="Opções de posicionamento" onClick={()=>setMenu(!menu)}><SlidersHorizontal size={17}/></button>
    </div>}
    {menu&&box&&selected&&<div data-word-object-ui className="word-object-options" role="dialog" aria-label="Posicionamento do objeto" style={{left:Math.max(8,Math.min(innerWidth-294,box.left+box.width+12)),top:Math.max(8,Math.min(innerHeight-420,box.top))}}>
      <strong>{selected.kind==='table'?'Tabela':selected.kind==='textbox'?'Caixa de texto':'Imagem / forma'}</strong>
      {error&&<p role="alert">{error}</p>}
      {selected.kind==='table'?<><button onClick={()=>onSelectTable(selected.root as HTMLTableElement)}>Selecionar tabela inteira</button><label>Separar antes da linha<input type="number" min={2} max={(selected.root as HTMLTableElement).rows.length} value={splitRow} onChange={e=>setSplitRow(Number(e.target.value))}/></label><button onClick={()=>change(o=>{const t=o.root as HTMLTableElement,c=t.rows[splitRow-1]?.cells[0];if(c)runTableCommand(t,[c],{action:'split-table'});})}>Separar tabela</button></>:<><span>Posição na área de texto</span><div className="word-object-position-grid">{['Cima','Meio','Baixo'].flatMap((label,row)=>['esquerda','centro','direita'].map((colLabel,col)=><button key={`${row}${col}`} aria-label={`Posicionar ${label.toLowerCase()} ${colLabel}`} onClick={()=>change(o=>positionObject(o,row,col))}>{label} {colLabel}</button>))}</div><label>Disposição<select aria-label="Disposição do objeto" value={objectMode(selected)} onChange={e=>change(o=>setObjectWrap(o,e.target.value as WordWrap))}>{modes.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><p>Cantos mantêm a proporção. Laterais esticam a imagem. Para selecionar um objeto atrás do texto, use Alt + clique.</p></>}
      <button className="word-object-delete" onClick={()=>{change(o=>{if(o.kind==='table')o.root.remove();else deleteWordObject(o);});setSelected(null);setMenu(false);}}><Trash2 size={15}/>Excluir {selected.kind==='table'?'tabela':'objeto'}</button><button onClick={()=>setMenu(false)}>Fechar opções</button>
    </div>}
  </>;
}

