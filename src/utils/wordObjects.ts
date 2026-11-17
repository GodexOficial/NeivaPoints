export type WordWrap='inline'|'block'|'square'|'front'|'behind';
export type WordObject={root:HTMLElement;visual:HTMLElement;owner:HTMLElement;kind:'image'|'shape'|'textbox'|'table'};
export function wordObject(node:Element):WordObject|null{
  const owner=node.closest<HTMLElement>('.word-editable,.word-page-chrome');if(!owner?.isContentEditable)return null;
  const image=node.closest<HTMLImageElement>('img');
  if(image){const wrapper=image.closest<HTMLElement>('[contenteditable=false]');return {root:wrapper&&owner.contains(wrapper)?wrapper:image,visual:image,owner,kind:'image'};}
  const shape=node.closest<HTMLElement>('[data-word-draggable]')||node.closest('svg');
  if(shape)return {root:shape as HTMLElement,visual:(shape.querySelector('svg')||shape) as HTMLElement,owner,kind:'shape'};
  const box=node.closest<HTMLElement>('[data-word-floating]');return box?{root:box,visual:box,owner,kind:'textbox'}:null;
}
export const objectScale=(o:WordObject)=>o.owner.getBoundingClientRect().width/o.owner.offsetWidth||1;
export const objectChanged=(owner:HTMLElement)=>owner.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertReplacementText'}));
export const objectMode=(o:WordObject)=>(o.visual.dataset.wordWrap||o.root.dataset.wordWrap||(o.root.style.position==='absolute'?'front':'inline')) as WordWrap;
export function setObjectWrap(o:WordObject,mode:WordWrap){
  const {root,visual}=o;root.dataset.wordObject=o.kind;root.dataset.wordWrap=mode;visual.dataset.wordWrap=mode;
  root.style.float='none';root.style.clear='none';root.style.margin='0';root.style.position=mode==='front'||mode==='behind'?'absolute':'static';root.style.zIndex=mode==='behind'?'0':mode==='front'?'3':'';
  root.style.display=mode==='inline'?'inline-block':'block';
  if(mode==='square'){root.style.float='left';root.style.margin='6px 12px 6px 0';}
  if(mode==='block'){root.style.clear='both';root.style.margin='8px auto';}
  if(mode==='front'||mode==='behind'){root.style.left||='0px';root.style.top||='0px';}else{root.style.left='';root.style.top='';}
  if(root!==visual&&o.kind==='image')root.style.width=visual.style.width||`${visual.offsetWidth}px`;
  visual.dataset.wordX=String(parseFloat(root.style.left)||0);visual.dataset.wordY=String(parseFloat(root.style.top)||0);
}
export function setObjectSize(o:WordObject,width:number,height:number){
  const {root,visual}=o;visual.style.width=`${Math.max(16,width)}px`;visual.style.height=`${Math.max(16,height)}px`;visual.style.maxWidth='none';
  if(o.kind==='textbox'){root.style.minHeight='0';root.style.overflow='auto';}
  if(root!==visual){root.style.width=visual.style.width;if(o.kind==='shape')root.style.height=visual.style.height;}
  if(visual instanceof SVGElement){visual.setAttribute('width',String(width));visual.setAttribute('height',String(height));visual.setAttribute('preserveAspectRatio','none');}
}
export function positionObject(o:WordObject,row:number,col:number){
  if(!['front','behind'].includes(objectMode(o)))setObjectWrap(o,'front');
  const scale=objectScale(o),body=o.owner.getBoundingClientRect(),r=o.root.getBoundingClientRect(),parent=(o.root.offsetParent as HTMLElement|null)?.getBoundingClientRect()||body;
  o.root.style.left=`${(body.left-parent.left)/scale+Math.max(0,(body.width-r.width)/scale*col/2)}px`;
  o.root.style.top=`${(body.top-parent.top)/scale+Math.max(0,(body.height-r.height)/scale*row/2)}px`;
  o.visual.dataset.wordX=String(parseFloat(o.root.style.left));o.visual.dataset.wordY=String(parseFloat(o.root.style.top));
}
export function deleteWordObject(o:WordObject){
  o.owner.focus({preventScroll:true});const range=document.createRange();range.selectNode(o.root);const selection=getSelection();selection?.removeAllRanges();selection?.addRange(range);
  const group=o.root.parentElement?.closest<HTMLElement>('[data-word-anchor-group]');document.execCommand('delete');
  if(o.root.isConnected){o.root.remove();objectChanged(o.owner);}
  if(group&&!group.querySelector('[data-word-floating]')){group.style.minHeight='';objectChanged(o.owner);}
}
