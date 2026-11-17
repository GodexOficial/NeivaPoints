import JSZip from 'jszip';
import type { WordDocument } from '../types/doc';
import {docxNumberLabels} from './wordDocxNumbering';

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const A = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const V = 'urn:schemas-microsoft-com:vml';
const WP = 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing';
const children = (el: Element | null | undefined, name: string): Element[] => el ? Array.from(el.children).filter(n => n.namespaceURI === W && n.localName === name) : [];
const child = (el: Element | null | undefined, name: string) => children(el, name)[0];
const attr = (el: Element | null | undefined, name = 'val') => el?.getAttributeNS(W, name) || '';
const text = (el: Element) => Array.from(el.getElementsByTagNameNS(W, 't')).map(t => t.textContent).join('');
const normalize = (s: string) => s.replace(/\s+/g, '').trim();
const xml = (s: string) => new DOMParser().parseFromString(s, 'application/xml');
const cm = (s: string) => Number(s) / 567;
const color = (s: string) => /^[\da-f]{6}$/i.test(s) ? `#${s}` : undefined;
const primary=(el:Element)=>{let parent=el.parentElement;while(parent){if(parent.localName==='Fallback'&&Array.from(parent.parentElement?.children||[]).some(n=>n.localName==='Choice'))return false;parent=parent.parentElement;}return true;};

/** Restore layout properties intentionally omitted by Mammoth's semantic conversion. */
export async function restoreDocxLayout(buffer: ArrayBuffer, html: string): Promise<{
  html: string; settings: Partial<WordDocument>; warnings: boolean;
}> {
  const zip = await JSZip.loadAsync(buffer);
  const source = xml(await zip.file('word/document.xml')!.async('string'));
  const dom = new DOMParser().parseFromString(html, 'text/html');
  const stylesFile = zip.file('word/styles.xml');
  const styles = stylesFile ? xml(await stylesFile.async('string')) : null;
  const styleMap = new Map(Array.from(styles?.getElementsByTagNameNS(W, 'style') || []).map(s => [attr(s, 'styleId'), s]));
  const defaults = styles?.getElementsByTagNameNS(W, 'docDefaults')[0];
  const normalLines=new Map<string,number>();
  function autoLine(target:HTMLElement){
    if(target.dataset.wordLineRule!=='auto')return;
    const family=target.style.fontFamily||'Calibri, Arial, sans-serif',size=target.style.fontSize||'12pt',weight=target.style.fontWeight||'normal',fontStyle=target.style.fontStyle||'normal';
    const key=[family,size,weight,fontStyle].join('|');let factor=normalLines.get(key);
    if(!factor){const probe=document.createElement('div');probe.style.cssText=`position:absolute;left:-100000px;top:0;width:1000px;height:auto;min-height:0;margin:0;padding:0;border:0;white-space:nowrap;font-family:${family};font-size:${size};font-weight:${weight};font-style:${fontStyle};line-height:normal;visibility:hidden`;probe.textContent='Ag';document.body.append(probe);factor=probe.getBoundingClientRect().height/parseFloat(getComputedStyle(probe).fontSize);probe.remove();normalLines.set(key,factor);}
    target.style.lineHeight=String(factor*Number(target.dataset.wordLine)/240);
  }
  const styleChain=(id:string)=>{const chain:Element[]=[],seen=new Set<string>();while(id&&!seen.has(id)){seen.add(id);const style=styleMap.get(id);if(!style)break;chain.unshift(style);id=attr(child(style,'basedOn'));}return chain;};
  const ancestor=(el:Element,name:string)=>{let node=el.parentElement;while(node){if(node.namespaceURI===W&&node.localName===name)return node;node=node.parentElement;}return null;};

  function runStyle(target: HTMLElement, props?: Element) {
    if (!props) return;
    const size = Number(attr(child(props, 'sz')) || attr(child(props, 'szCs')));
    if (size >= 2 && size <= 400) target.style.fontSize = `${size / 2}pt`;
    const font = child(props, 'rFonts');
    const family = attr(font, 'ascii') || attr(font, 'hAnsi');
    if (family) target.style.fontFamily = family;
    const ink = color(attr(child(props, 'color'))); if (ink) target.style.color = ink;
    const enabled = (name: string) => !['0', 'false', 'off'].includes(attr(child(props, name)));
    if (child(props, 'b')) target.style.fontWeight = enabled('b') ? 'bold' : 'normal';
    if (child(props, 'i')) target.style.fontStyle = enabled('i') ? 'italic' : 'normal';
    const decoration: string[] = [];
    if (child(props, 'u') && !['none', '0', 'false'].includes(attr(child(props, 'u')))) decoration.push('underline');
    if (child(props, 'strike') && enabled('strike')) decoration.push('line-through');
    if (decoration.length) target.style.textDecoration = decoration.join(' ');
    const fill = color(attr(child(props, 'shd'), 'fill'));
    if (fill) target.style.backgroundColor = fill;
    const vertical = attr(child(props, 'vertAlign'));
    if (vertical === 'superscript' || vertical === 'subscript') target.style.verticalAlign = vertical === 'superscript' ? 'super' : 'sub';
  }
  function paragraphStyle(target: HTMLElement, p: Element) {
    delete target.dataset.wordLine;delete target.dataset.wordLineRule;
    const props = child(p, 'pPr');
    const seen = new Set<string>();
    function inherited(id: string) {
      if (!id || seen.has(id)) return;
      seen.add(id); const s = styleMap.get(id); if (!s) return;
      inherited(attr(child(s, 'basedOn')));
      runStyle(target, child(s, 'rPr'));
      spacing(child(s, 'pPr'));
    }
    function spacing(pr?: Element) {
      const align = attr(child(pr, 'jc'));
      if (['left', 'right', 'center', 'both'].includes(align)) target.style.textAlign = align === 'both' ? 'justify' : align;
      const indent = child(pr, 'ind');
      for (const [name, css] of [['left', 'marginLeft'], ['right', 'marginRight'], ['firstLine', 'textIndent']] as const) {
        const value = attr(indent, name); if (value) target.style[css] = `${Number(value) / 20}pt`;
      }
      if (attr(indent, 'hanging')) target.style.textIndent = `${-Number(attr(indent, 'hanging')) / 20}pt`;
      const sp = child(pr, 'spacing');
      if (sp) {
        for (const [key, css] of [['before', 'marginTop'], ['after', 'marginBottom']] as const) {
          const value = attr(sp, key); if (value) target.style[css] = `${Math.max(0, Number(value) / 20)}pt`;
        }
        const line = attr(sp, 'line');
        if (line){target.dataset.wordLine=line;target.dataset.wordLineRule=attr(sp,'lineRule')||'auto';target.style.lineHeight=target.dataset.wordLineRule==='auto'?'normal':`${Number(line)/20}pt`;}
      }
    }
    target.style.marginTop = '0'; target.style.marginBottom = '0'; target.style.lineHeight = '1.15';
    runStyle(target, child(child(defaults, 'rPrDefault'), 'rPr'));
    spacing(child(child(defaults, 'pPrDefault'), 'pPr'));
    const table=ancestor(p,'tbl');
    if(table)for(const style of styleChain(attr(child(child(table,'tblPr'),'tblStyle')))){runStyle(target,child(style,'rPr'));spacing(child(style,'pPr'));}
    inherited('Normal'); inherited(attr(child(props, 'pStyle')));
    spacing(props);
    // Direct run sizes also cover form templates that do not use named styles.
    runStyle(target, child(props, 'rPr'));
    // Apply direct formatting only to the corresponding text, preserving links
    // and semantic elements already produced by Mammoth.
    const runs = Array.from(p.getElementsByTagNameNS(W, 'r')).filter(r => r.closest('p') === p);
    const segments = runs.flatMap(r => children(r, 't').map(t => ({ value: t.textContent || '', props: child(r, 'rPr') })));
    if (segments.map(s => s.value).join('') === target.textContent) {
      const walker = dom.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      const nodes: Text[] = []; let node = walker.nextNode();
      while (node) { nodes.push(node as Text); node = walker.nextNode(); }
      let offset = 0;
      for (const original of nodes) {
        const value = original.data; const fragment = dom.createDocumentFragment(); let start = 0;
        let segmentOffset = 0;
        for (const segment of segments) {
          const end = segmentOffset + segment.value.length;
          const from = Math.max(offset, segmentOffset), to = Math.min(offset + value.length, end);
          if (to > from) {
            const span = dom.createElement('span'); runStyle(span, segment.props);
            span.textContent = value.slice(from - offset, to - offset);
            fragment.append(span); start += to - from;
          }
          segmentOffset = end;
        }
        if (start === value.length) original.replaceWith(fragment);
        offset += value.length;
      }
    }
    target.style.whiteSpace = 'pre-wrap';
    autoLine(target);
  }
  // Match by text rather than index: empty paragraphs and floating text boxes
  // are handled differently by Word and the semantic converter.
  const paragraphs = Array.from(source.getElementsByTagNameNS(W, 'p')).filter(primary);
  const numberingFile=zip.file('word/numbering.xml');
  const numberLabels=docxNumberLabels(numberingFile?xml(await numberingFile.async('string')):null,paragraphs,styleMap);
  function restoreLabel(target:HTMLElement,p:Element){const label=numberLabels.get(p);if(!label)return;target.style.listStyle='none';target.dataset.wordListId=label.id;target.dataset.wordListLevel=String(label.level);target.style.marginLeft='0';target.style.textIndent='0';if(!text(p).trim()&&ancestor(p,'tc'))target.style.textAlign='right';
    const marker=dom.createElement('span');marker.dataset.wordListLabel='true';marker.textContent=label.text;marker.style.whiteSpace='nowrap';target.prepend(marker,dom.createTextNode(target.textContent?.trim()===label.text?'':' '));
  }
  const queues = new Map<string, Element[]>();
  const paragraphTargets = new Map<Element, HTMLElement>();
  for (const p of paragraphs) { const key = normalize(text(p)); if (key) queues.set(key, [...(queues.get(key) || []), p]); }
  dom.body.querySelectorAll<HTMLElement>('p,h1,h2,h3,h4,h5,h6,li').forEach(p => {
    if (p.tagName === 'LI' && p.querySelector('p,li')) return;
    const src = queues.get(normalize(p.textContent || ''))?.shift(); if (src) { paragraphStyle(p, src); paragraphTargets.set(src,p); }
  });
  const emptySource=paragraphs.filter(p=>p.parentElement?.localName==='body'&&!normalize(text(p))&&!p.getElementsByTagNameNS(W,'drawing').length);
  Array.from(dom.body.children).filter((p):p is HTMLElement=>p instanceof HTMLElement&&p.tagName==='P'&&!normalize(p.textContent||'')&&!p.querySelector('img,svg')).forEach((p,i)=>{if(emptySource[i]){paragraphStyle(p,emptySource[i]);paragraphTargets.set(emptySource[i],p);}});
  const section = Array.from(source.getElementsByTagNameNS(W, 'sectPr')).at(-1);
  const size = child(section, 'pgSz'), margins = child(section, 'pgMar');
  const pageWidth = cm(attr(size,'w')) || 21;
  const leftMargin = cm(attr(margins,'left')) || 2.5;
  // Mammoth intentionally omits image geometry. Restore both dimensions and
  // wrapping so imported pictures do not expand to their bitmap's natural size.
  const bodyImages=Array.from(dom.body.querySelectorAll('img'));let imageIndex=0;
  for(const drawing of Array.from(source.getElementsByTagNameNS(W,'drawing'))){
    if(!primary(drawing))continue;
    if(!drawing.getElementsByTagNameNS(A,'blip').length)continue;
    const image=bodyImages[imageIndex++];if(!image)continue;
    const extent=drawing.getElementsByTagNameNS(WP,'extent')[0];
    if(extent){image.style.width=`${Number(extent.getAttribute('cx'))/9525}px`;image.style.height=`${Number(extent.getAttribute('cy'))/9525}px`;image.style.maxWidth='none';}
    const description=drawing.getElementsByTagNameNS(WP,'docPr')[0];image.alt=description?.getAttribute('descr')||description?.getAttribute('name')||image.alt;
    const anchor=drawing.getElementsByTagNameNS(WP,'anchor')[0];
    if(anchor){
      const horizontal=anchor.getElementsByTagNameNS(WP,'positionH')[0],vertical=anchor.getElementsByTagNameNS(WP,'positionV')[0];
      const x=Number(horizontal?.getElementsByTagNameNS(WP,'posOffset')[0]?.textContent||0)/9525-(horizontal?.getAttribute('relativeFrom')==='page'?leftMargin*96/2.54:0),y=Number(vertical?.getElementsByTagNameNS(WP,'posOffset')[0]?.textContent||0)/9525;
      const mode=anchor.getAttribute('behindDoc')==='1'?'behind':anchor.getElementsByTagNameNS(WP,'wrapTopAndBottom').length?'block':anchor.getElementsByTagNameNS(WP,'wrapSquare').length||anchor.getElementsByTagNameNS(WP,'wrapTight').length?'square':'front';
      image.dataset.wordObject='image';image.dataset.wordWrap=mode;
      if(mode==='front'||mode==='behind'){const paragraph=image.closest('p');if(paragraph&&vertical?.getAttribute('relativeFrom')==='paragraph')paragraph.style.position='relative';image.style.position='absolute';image.style.left=`${x}px`;image.style.top=`${y}px`;image.style.zIndex=mode==='behind'?'0':'3';}
      else if(mode==='square'){image.style.float=horizontal?.getElementsByTagNameNS(WP,'align')[0]?.textContent==='right'?'right':'left';image.style.margin='6px 12px';}
      else{image.style.display='block';image.style.clear='both';image.style.margin='8px auto';}
    }
    const crop=drawing.getElementsByTagNameNS(A,'srcRect')[0];
    if(crop){const l=Number(crop.getAttribute('l')||0)/100000,t=Number(crop.getAttribute('t')||0)/100000,r=Number(crop.getAttribute('r')||0)/100000,b=Number(crop.getAttribute('b')||0)/100000;if((l||r||t||b)&&l+r<1&&t+b<1){try{const bitmap=new Image();bitmap.src=image.src;await bitmap.decode();const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.naturalWidth*(1-l-r)));canvas.height=Math.max(1,Math.round(bitmap.naturalHeight*(1-t-b)));canvas.getContext('2d')?.drawImage(bitmap,bitmap.naturalWidth*l,bitmap.naturalHeight*t,canvas.width,canvas.height,0,0,canvas.width,canvas.height);image.src=canvas.toDataURL('image/png');}catch{/* Keep the embedded original if a browser decoder cannot crop it. */}}}
  }
  // DrawingML is the primary representation; VML inside mc:Fallback is a copy.
  for (const box of Array.from(source.getElementsByTagNameNS(W, 'txbxContent'))) {
    let anchor: Element | null = box.parentElement;
    while (anchor && !(anchor.namespaceURI === WP && anchor.localName === 'anchor')) anchor = anchor.parentElement;
    if (!anchor) continue;
    const boxParagraphs = children(box,'p');
    const rendered = boxParagraphs.map(p=>paragraphTargets.get(p)).filter((p):p is HTMLElement=>Boolean(p));
    // A semantic converter may have chosen the VML fallback; match its text too.
    const matched = rendered.length ? rendered : boxParagraphs.filter(p=>text(p).trim()).map(p=>{const existing=Array.from(dom.body.querySelectorAll<HTMLElement>('p')).find(n=>!n.closest('[data-word-floating]')&&normalize(n.textContent||'')===normalize(text(p)));if(existing)return existing;const created=dom.createElement('p');created.textContent=text(p);paragraphStyle(created,p);return created;});
    if (!matched.length) {const p=dom.createElement('p');p.innerHTML='<br>';matched.push(p);}
    const extent=anchor.getElementsByTagNameNS(WP,'extent')[0];
    const width=Number(extent?.getAttribute('cx'))/12700, height=Number(extent?.getAttribute('cy'))/12700;
    if (!(width>0&&height>0)) continue;
    const horizontal=anchor.getElementsByTagNameNS(WP,'positionH')[0];
    const vertical=anchor.getElementsByTagNameNS(WP,'positionV')[0];
    const x=Number(horizontal?.getElementsByTagNameNS(WP,'posOffset')[0]?.textContent||0)/12700;
    const y=Number(vertical?.getElementsByTagNameNS(WP,'posOffset')[0]?.textContent||0)/12700;
    let anchorP:Element|null=anchor.parentElement;
    while(anchorP && !(anchorP.namespaceURI===W&&anchorP.localName==='p'))anchorP=anchorP.parentElement;
    // The containing paragraph includes its drawing's text in XML; identify it
    // using only its own runs instead of the textbox's descendant text.
    let ownText=anchorP?children(anchorP,'r').flatMap(r=>children(r,'t')).map(t=>t.textContent).join(''):'';
    if(!ownText.trim()){let following=anchorP?.nextElementSibling;while(following&&!ownText.trim()&&following.localName==='p'){ownText=children(following,'r').flatMap(r=>children(r,'t')).map(t=>t.textContent).join('');if(ownText.trim())anchorP=following;following=following.nextElementSibling;}}
    const target=Array.from(dom.body.querySelectorAll<HTMLElement>('p')).find(p=>!p.closest('[data-word-anchor-group]')&&normalize(p.textContent||'')===normalize(ownText));
    if(!target){const standalone=dom.createElement('p');standalone.innerHTML='<br>';dom.body.append(standalone);paragraphTargets.set(anchorP!,standalone);}
    const anchorTarget=target||paragraphTargets.get(anchorP!)!;
    if(anchorP)paragraphStyle(anchorTarget,anchorP);
    const holder=dom.createElement('div');holder.dataset.wordAnchorGroup='true';holder.style.position='relative';holder.style.minHeight=`${height+Math.max(0,y)}pt`;
    anchorTarget.before(holder);
    // Keep following introductory paragraphs beside the box; the table starts
    // after this group, so the legend cannot overlap it or push into a cell.
    let next:Element|null=anchorTarget;
    while(next&&next.tagName!=='TABLE') { const following:Element|null=next.nextElementSibling; if(!matched.includes(next as HTMLElement))holder.append(next);next=following; }
    const floating=dom.createElement('div');floating.dataset.wordFloating='true';floating.setAttribute('role','group');floating.setAttribute('aria-label','Caixa de texto importada');
    const origin=horizontal?.getAttribute('relativeFrom')==='page'?x-leftMargin*28.346:x;
    floating.style.cssText=`position:absolute;left:${origin}pt;top:${y}pt;width:${width}pt;min-height:${height}pt;box-sizing:border-box;padding:3pt 5pt;border:.5pt solid #333;background:#fff;color:#111;z-index:2;`;
    matched.forEach((p,i)=>{if(boxParagraphs[i])paragraphStyle(p,boxParagraphs[i]);p.style.whiteSpace='normal';floating.append(p);});
    holder.append(floating);
  }
  // Legacy Word files can contain VML-only text boxes, without a DrawingML copy.
  for(const shape of Array.from(source.getElementsByTagNameNS(V,'shape')).filter(primary)){
    const box=shape.getElementsByTagNameNS(W,'txbxContent')[0];if(!box)continue;
    const legacy=document.createElement('div');legacy.setAttribute('style',shape.getAttribute('style')||'');
    const floating=dom.createElement('div');floating.dataset.wordFloating='true';floating.dataset.wordWrap='front';floating.setAttribute('aria-label','Caixa de texto importada');
    floating.style.cssText=`position:absolute;left:${legacy.style.marginLeft||legacy.style.left||'0px'};top:${legacy.style.marginTop||legacy.style.top||'0px'};width:${legacy.style.width||'180pt'};min-height:${legacy.style.height||'40pt'};padding:3pt 5pt;border:.5pt solid #333;background:#fff;box-sizing:border-box;`;
    for(const p of children(box,'p')){const existing=paragraphTargets.get(p);const out=existing||dom.createElement('p');if(!existing)out.textContent=text(p);paragraphStyle(out,p);floating.append(out);}
    if(!floating.childNodes.length)floating.innerHTML='<p><br></p>';
    const holder=dom.createElement('div');holder.dataset.wordAnchorGroup='true';holder.style.position='relative';holder.style.minHeight=legacy.style.height||'40pt';holder.append(floating);dom.body.append(holder);
  }
  // Preserve common native geometric objects as editable, selectable SVGs.
  for(const drawing of Array.from(source.getElementsByTagNameNS(W,'drawing')).filter(primary)){
    if(drawing.getElementsByTagNameNS(A,'blip').length||drawing.getElementsByTagNameNS(W,'txbxContent').length)continue;
    const geometry=drawing.getElementsByTagNameNS(A,'prstGeom')[0],extent=drawing.getElementsByTagNameNS(WP,'extent')[0];if(!geometry||!extent)continue;
    const width=Number(extent.getAttribute('cx'))/9525,height=Number(extent.getAttribute('cy'))/9525;if(!(width>0&&height>0))continue;
    const preset=geometry.getAttribute('prst'),props=geometry.parentElement,fill=props?.getElementsByTagNameNS(A,'solidFill')[0]?.getElementsByTagNameNS(A,'srgbClr')[0]?.getAttribute('val');
    const ink=color(fill||'')||'#dbeafe',svg=dom.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('width',String(width));svg.setAttribute('height',String(height));svg.setAttribute('viewBox','0 0 100 100');svg.setAttribute('preserveAspectRatio','none');
    const geometryTag=preset==='ellipse'?'ellipse':preset==='line'?'line':['triangle','diamond','rightArrow'].includes(preset||'')?'polygon':'rect';
    const figure=dom.createElementNS(svg.namespaceURI,geometryTag);figure.setAttribute('fill',preset==='line'?'none':ink);figure.setAttribute('stroke','#334155');figure.setAttribute('stroke-width','1');
    const values=geometryTag==='ellipse'?{cx:'50',cy:'50',rx:'49',ry:'49'}:geometryTag==='line'?{x1:'0',y1:'0',x2:'100',y2:'100'}:geometryTag==='polygon'?{points:preset==='triangle'?'50,1 99,99 1,99':preset==='diamond'?'50,1 99,50 50,99 1,50':'1,25 65,25 65,1 99,50 65,99 65,75 1,75'}:{x:'1',y:'1',width:'98',height:'98',rx:preset==='roundRect'?'12':'0'};
    Object.entries(values).forEach(([key,value])=>figure.setAttribute(key,value));svg.append(figure);
    const wrapper=dom.createElement('div');wrapper.dataset.wordDraggable='true';wrapper.setAttribute('contenteditable','false');wrapper.style.cssText=`display:inline-block;width:${width}px;height:${height}px`;wrapper.append(svg);
    let p=drawing.parentElement;while(p&&p.localName!=='p')p=p.parentElement;const target=p&&paragraphTargets.get(p);if(target)target.append(wrapper);else dom.body.append(wrapper);
  }
  const tables = Array.from(source.getElementsByTagNameNS(W, 'tbl'));
  Array.from(dom.body.querySelectorAll('table')).forEach((table, i) => {
    const src = tables[i]; if (!src) return;
    table.dataset.wordImported = 'true';
    const tableProps = child(src, 'tblPr');
    const tableStyles=styleChain(attr(child(tableProps,'tblStyle')));
    const tableBorders = child(tableProps, 'tblBorders') || tableStyles.map(s=>child(child(s,'tblPr'),'tblBorders')).filter(Boolean).at(-1);
    const tableCellMargins=child(tableProps,'tblCellMar')||tableStyles.map(s=>child(child(s,'tblPr'),'tblCellMar')).filter(Boolean).at(-1);
    const cols = children(child(src, 'tblGrid'), 'gridCol').map(c => Number(attr(c, 'w')));
    const total = cols.reduce((a, b) => a + b, 0);
    table.style.width = '100%'; table.style.tableLayout = 'fixed'; table.style.borderCollapse = 'collapse';
    const requestedWidth=cm(attr(child(tableProps,'tblW'),'w'));
    const indent=cm(attr(child(tableProps,'tblInd'),'w'));
    if(attr(child(tableProps,'tblW'),'type')==='dxa'&&requestedWidth>0){
      const start=Math.max(-leftMargin,indent);
      table.style.width=`${Math.min(requestedWidth,pageWidth-leftMargin-start-.1)}cm`;
      table.style.maxWidth='none';table.style.marginLeft=`${start}cm`;
    }
    if (total > 0) {
      const group = dom.createElement('colgroup');
      cols.forEach(width => { const col = dom.createElement('col'); col.style.width = `${width / total * 100}%`; group.append(col); });
      table.prepend(group);
    }
    children(src, 'tr').forEach((row, ri) => {
      const targetRow = table.rows[ri]; if (!targetRow) return;
      const rowProps=child(row,'trPr'),rowHeight=child(rowProps,'trHeight');
      if(rowHeight){targetRow.style.height=`${Number(attr(rowHeight))/20}pt`;targetRow.dataset.wordHeightRule=attr(rowHeight,'hRule')||'atLeast';}
      if(child(rowProps,'cantSplit'))targetRow.dataset.wordCantSplit='true';
      const cells = children(row, 'tc').filter(c => { const merge = child(child(c, 'tcPr'), 'vMerge'); return !merge || attr(merge) === 'restart'; });
      cells.forEach((cell, ci) => {
        const target = targetRow.cells[ci]; if (!target) return;
        const props = child(cell, 'tcPr');
        const cellMargins=child(props,'tcMar');
        for(const side of ['top','right','bottom','left']){const margin=child(cellMargins,side)||child(tableCellMargins,side);target.style.setProperty(`padding-${side}`,`${margin?Number(attr(margin,'w'))/20:side==='left'||side==='right'?5.4:0}pt`);}
        // Match paragraphs inside their own cell; global text queues confuse
        // repeated names and discard empty paragraphs carrying list counters.
        target.querySelectorAll(':scope > ol,:scope > ul').forEach(list=>{for(const item of Array.from(list.children)){const p=dom.createElement('p');p.append(...item.childNodes);list.before(p);}list.remove();});
        const candidates=Array.from(target.querySelectorAll<HTMLElement>('p,h1,h2,h3,h4,h5,h6')).filter(p=>p.closest('td,th')===target),used=new Set<HTMLElement>();
        let previous:HTMLElement|null=null;
        for(const original of children(cell,'p')){
          const key=normalize(text(original));let p=candidates.find(n=>!used.has(n)&&normalize(n.textContent||'')===key);
          if(!p&&!key){p=dom.createElement('p');p.innerHTML='<br>';if(previous)previous.after(p);else target.prepend(p);}
          if(!p)continue;used.add(p);paragraphStyle(p,original);paragraphTargets.set(original,p);previous=p;
        }
        const firstParagraph = target.querySelector<HTMLElement>('p');
        if (firstParagraph) {
          target.style.fontSize = firstParagraph.style.fontSize;
          target.style.fontFamily = firstParagraph.style.fontFamily;
          target.style.lineHeight = firstParagraph.style.lineHeight;
        }
        const cellBorders = child(props, 'tcBorders');
        for (const side of ['top', 'bottom', 'left', 'right'] as const) {
          const column=Array.from(targetRow.cells).slice(0,ci).reduce((sum,c)=>sum+c.colSpan,0);
          const outer=side==='top'?ri===0:side==='bottom'?ri+target.rowSpan>=table.rows.length:side==='left'?column===0:column+target.colSpan>=cols.length;
          const rowBorders=child(child(row,'tblPrEx'),'tblBorders');
          const border = child(cellBorders, side) || child(rowBorders,outer?side:side==='top'||side==='bottom'?'insideH':'insideV') || child(tableBorders,outer?side:side==='top'||side==='bottom'?'insideH':'insideV');
          const style = attr(border);
          target.style.setProperty(`border-${side}`, !border || style === 'nil' || style === 'none' ? 'none' : `${Number(attr(border, 'sz') || 4) / 8}pt ${style === 'dotted' ? 'dotted' : style === 'dashed' ? 'dashed' : style === 'double' ? 'double' : 'solid'} ${color(attr(border, 'color')) || '#333'}`);
        }
        target.style.verticalAlign = attr(child(props, 'vAlign')) === 'center' ? 'middle' : attr(child(props, 'vAlign')) || 'top';
        const fill = color(attr(child(props, 'shd'), 'fill')); if (fill) target.style.backgroundColor = fill;
        const direction = attr(child(props, 'textDirection'));
        if (direction === 'tbRl' || direction === 'btLr') { target.style.writingMode = 'vertical-rl'; if (direction === 'btLr') target.style.transform = 'rotate(180deg)'; }
      });
    });
  });
  for(const [original,target] of paragraphTargets)restoreLabel(target,original);
  for(const [original,target] of paragraphTargets){const before=child(child(original,'pPr'),'pageBreakBefore');if(before&&attr(before)!=='0'&&attr(before)!=='false'&&!target.closest('td,th')){const marker=dom.createElement('div');marker.className='a4-page-break';target.before(marker);}}
  const settings: Partial<WordDocument> = {};
  const commentFile=zip.file('word/comments.xml');
  if(commentFile){const comments=xml(await commentFile.async('string'));settings.comments=Array.from(comments.getElementsByTagNameNS(W,'comment')).map(c=>({id:`imported-${attr(c,'id')}`,text:text(c),quote:'',createdAt:Number.isFinite(Date.parse(attr(c,'date')))?attr(c,'date'):new Date().toISOString()}));
    for(const [original,target] of paragraphTargets){const starts=original.getElementsByTagNameNS(W,'commentRangeStart');for(const start of Array.from(starts)){const id=`imported-${attr(start,'id')}`,comment=settings.comments.find(c=>c.id===id);if(!comment)continue;const mark=dom.createElement('mark');mark.dataset.commentId=id;mark.append(...target.childNodes);target.append(mark);comment.quote=target.textContent||'';}}
  }
  if (size) {
    settings.orientation = attr(size, 'orient') === 'landscape' || Number(attr(size, 'w')) > Number(attr(size, 'h')) ? 'landscape' : 'portrait';
    const short = Math.min(cm(attr(size, 'w')), cm(attr(size, 'h')));
    settings.pageSize = Math.abs(short - 21.59) < .15 ? 'letter' : 'a4';
  }
  for (const [name, key] of [['left','leftMarginCm'],['right','rightMarginCm'],['top','topMarginCm'],['bottom','bottomMarginCm']] as const) {
    const value = attr(margins, name); if (value) settings[key] = Math.min(10, Math.max(.1, cm(value)));
  }
  settings.headerDistanceCm=cm(attr(margins,'header'));
  settings.footerDistanceCm=cm(attr(margins,'footer'));
  // Keep page furniture out of the body so it repeats and exports as genuine
  // Word headers/footers instead of becoming ordinary document paragraphs.
  const relFile = zip.file('word/_rels/document.xml.rels');
  const rels = relFile ? xml(await relFile.async('string')) : null;
  for (const kind of ['header', 'footer'] as const) {
    const ref = child(section, `${kind}Reference`);
    const id = ref?.getAttributeNS(R, 'id');
    const rel = Array.from(rels?.documentElement.children || []).find(r => r.getAttribute('Id') === id && r.getAttribute('TargetMode') !== 'External');
    const target = rel?.getAttribute('Target'); if (!target || target.includes('..')) continue;
    const path = target.startsWith('/') ? target.slice(1) : `word/${target}`;
    const file = zip.file(path); if (!file) continue;
    const part = xml(await file.async('string'));
    const partRelFile = zip.file(`${path.slice(0, path.lastIndexOf('/') + 1)}_rels/${path.slice(path.lastIndexOf('/') + 1)}.rels`);
    const partRels = partRelFile ? xml(await partRelFile.async('string')) : null;
    const block = dom.createElement('div'); block.dataset.wordImported = kind;
    block.style.cssText = 'position:relative;font-family:Calibri,Arial,sans-serif;font-size:11pt;line-height:1;text-align:left;margin:0;display:flow-root';
    const anchoredImages:{image:HTMLImageElement;anchor:Element}[]=[];
    const paragraphImages=new Map<Element,HTMLImageElement[]>();
    for (const drawing of [...Array.from(part.getElementsByTagNameNS(A, 'blip')), ...Array.from(part.getElementsByTagNameNS(V, 'imagedata'))].filter(primary)) {
      const rid = drawing.getAttributeNS(R, 'embed') || drawing.getAttributeNS(R, 'id');
      const imageRel = Array.from(partRels?.documentElement.children || []).find(r => r.getAttribute('Id') === rid && r.getAttribute('TargetMode') !== 'External');
      const imageTarget = imageRel?.getAttribute('Target') || '';
      if (!/^media\/[^/]+\.(png|jpe?g|gif)$/i.test(imageTarget)) continue;
      const imageFile = zip.file(`word/${imageTarget}`); if (!imageFile) continue;
      const img = dom.createElement('img'); const ext = imageTarget.split('.').at(-1)?.toLowerCase();
      img.src = `data:image/${ext === 'jpg' ? 'jpeg' : ext};base64,${await imageFile.async('base64')}`;
      img.alt = kind === 'header' ? 'Imagem do cabeçalho' : 'Imagem do rodapé';
      img.style.cssText = 'display:inline-block;max-width:none;vertical-align:middle;margin:0';
      try{await img.decode();}catch{/* Keep the embedded image when decoding is unavailable. */}
      const picture=drawing.parentElement?.parentElement;
      const crop=picture?.getElementsByTagNameNS(A,'srcRect')[0];
      if(crop){
        const l=Number(crop.getAttribute('l')||0)/100000,t=Number(crop.getAttribute('t')||0)/100000,r=Number(crop.getAttribute('r')||0)/100000,b=Number(crop.getAttribute('b')||0)/100000;
        if(l+r<1&&t+b<1&&(l||r||t||b)&&img.naturalWidth){const canvas=document.createElement('canvas');canvas.width=Math.round(img.naturalWidth*(1-l-r));canvas.height=Math.round(img.naturalHeight*(1-t-b));const context=canvas.getContext('2d');if(context){context.drawImage(img,img.naturalWidth*l,img.naturalHeight*t,canvas.width,canvas.height,0,0,canvas.width,canvas.height);img.src=canvas.toDataURL('image/png');}}
      }
      let anchor:Element|null=drawing.parentElement;
      while(anchor&&!(anchor.namespaceURI===WP&&anchor.localName==='anchor'))anchor=anchor.parentElement;
      if(anchor){const extent=anchor.getElementsByTagNameNS(WP,'extent')[0];img.style.position='absolute';img.style.width=`${Number(extent?.getAttribute('cx'))/9525}px`;img.style.height=`${Number(extent?.getAttribute('cy'))/9525}px`;anchoredImages.push({image:img,anchor});}
      else{let container:Element|null=drawing.parentElement;while(container&&container.localName!=='inline')container=container.parentElement;const extent=container?.getElementsByTagNameNS(WP,'extent')[0];if(extent){img.style.width=`${Number(extent.getAttribute('cx'))/9525}px`;img.style.height=`${Number(extent.getAttribute('cy'))/9525}px`;}}
      block.append(img);
      const p=ancestor(drawing,'p');if(p)paragraphImages.set(p,[...(paragraphImages.get(p)||[]),img]);
    }
    const partParagraphs=Array.from(part.getElementsByTagNameNS(W,'p')).filter(primary);
    for(const p of partParagraphs){const out=dom.createElement('p');out.textContent=text(p);if(!out.textContent)out.innerHTML='<br>';paragraphStyle(out,p);out.style.whiteSpace='normal';
      // Anchored drawings still contribute a paragraph's font strut in Word.
      if(!text(p).trim())for(const run of children(p,'r'))runStyle(out,child(run,'rPr'));
      autoLine(out);
      out.append(...(paragraphImages.get(p)||[]));
      if(out.querySelector('img'))out.querySelector('br')?.setAttribute('data-word-strut','true');
      block.append(out);
    }
    if(!block.querySelector('img')&&!text(part.documentElement).trim())continue;
    // Do not use the editor shell here: its first child is 100vh high. Import
    // geometry must depend on the document, never on the browser's viewport.
    const measure=document.createElement('div');measure.className='word-header-measure';measure.style.cssText=`position:absolute;left:-100000px;top:0;visibility:hidden;width:${pageWidth-leftMargin-(settings.rightMarginCm??2.5)}cm;height:auto`;
    measure.append(block);document.body.append(measure);
    const flowHeight=block.getBoundingClientRect().height*2.54/96;measure.remove();
    const distance=kind==='header'?settings.headerDistanceCm||0:settings.footerDistanceCm||0;
    const bodyMargin=Math.max(kind==='header'?settings.topMarginCm||0:settings.bottomMarginCm||0,distance+flowHeight);
    const pageHeight=cm(attr(size,'h'))||29.7,areaWidth=pageWidth-leftMargin-(settings.rightMarginCm??2.5);
    for(const {image,anchor} of anchoredImages){
      const horizontal=anchor.getElementsByTagNameNS(WP,'positionH')[0],vertical=anchor.getElementsByTagNameNS(WP,'positionV')[0];
      const relativeX=horizontal?.getAttribute('relativeFrom'),relativeY=vertical?.getAttribute('relativeFrom'),offsetX=Number(horizontal?.getElementsByTagNameNS(WP,'posOffset')[0]?.textContent||0)/360000,offsetY=Number(vertical?.getElementsByTagNameNS(WP,'posOffset')[0]?.textContent||0)/360000;
      const align=horizontal?.getElementsByTagNameNS(WP,'align')[0]?.textContent,width=parseFloat(image.style.width)*2.54/96;
      const x=(relativeX==='page'?-leftMargin:0)+(align==='right'?(relativeX==='page'?pageWidth:areaWidth)-width:align==='center'?((relativeX==='page'?pageWidth:areaWidth)-width)/2:offsetX);
      const origin=kind==='header'?distance:pageHeight-distance-flowHeight;
      const base=relativeY==='page'?0:relativeY==='margin'?(kind==='header'?bodyMargin:pageHeight-bodyMargin):origin;
      const y=base+offsetY-origin;
      image.style.left=`${x}cm`;image.style.top=`${y}cm`;image.dataset.wordHeaderImage='positioned';
      image.dataset.wordHeaderOrigin=String(origin);image.dataset.wordHeaderLeft=String(leftMargin);image.dataset.wordHeaderBehind=anchor.getAttribute('behindDoc')||'0';
      // Retain the source coordinate system for a faithful DOCX export.
      image.dataset.wordAnchorX=String(offsetX);image.dataset.wordAnchorY=String(offsetY);image.dataset.wordAnchorH=relativeX||'column';image.dataset.wordAnchorV=relativeY||'paragraph';if(align)image.dataset.wordAnchorAlign=align;
    }
    if(kind==='header'){settings.headerHtml=block.outerHTML;settings.topMarginCm=bodyMargin;}else{settings.footerHtml=block.outerHTML;settings.bottomMarginCm=bodyMargin;}
  }
  // Split valid inline page-break markers without parser-created blank pages.
  let marker:Element|null;
  while((marker=dom.body.querySelector('.word-import-page-break'))){
    if(marker.closest('td,th')){marker.remove();continue;}
    const p=marker.closest('p,h1,h2,h3,h4,h5,h6');const pageBreak=dom.createElement('div');pageBreak.className='a4-page-break';pageBreak.dataset.wordExplicitBreak='true';
    if(!p){marker.replaceWith(pageBreak);continue;}
    const before=dom.createRange();before.selectNodeContents(p);before.setEndBefore(marker);const head=p.cloneNode(false) as HTMLElement;head.append(before.cloneContents());
    const after=dom.createRange();after.selectNodeContents(p);after.setStartAfter(marker);const tail=p.cloneNode(false) as HTMLElement;tail.append(after.cloneContents());
    const hasContent=(el:HTMLElement)=>Boolean(el.textContent?.trim()||el.querySelector('img,svg,[data-word-floating],.word-import-page-break'));
    p.replaceWith(...(hasContent(head)?[head]:[]),pageBreak,...(hasContent(tail)?[tail]:[]));
  }
  const warnings = source.getElementsByTagNameNS(W, 'txbxContent').length > 0 || source.getElementsByTagNameNS(W, 'sectPr').length > 1 || Boolean(section?.getElementsByTagNameNS(W, 'headerReference').length || section?.getElementsByTagNameNS(W, 'footerReference').length);
  return { html: dom.body.innerHTML, settings, warnings };
}
