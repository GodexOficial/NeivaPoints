import JSZip from 'jszip';
import type { WordDocument } from '../types/doc';

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

  function runStyle(target: HTMLElement, props?: Element) {
    if (!props) return;
    const size = Number(attr(child(props, 'sz')) || attr(child(props, 'szCs')));
    if (size >= 2 && size <= 400) target.style.fontSize = `${size / 2}pt`;
    const font = child(props, 'rFonts');
    const family = attr(font, 'ascii') || attr(font, 'hAnsi');
    if (family) target.style.fontFamily = family;
    const ink = color(attr(child(props, 'color'))); if (ink) target.style.color = ink;
    if (child(props, 'b')) target.style.fontWeight = attr(child(props, 'b')) === '0' ? 'normal' : 'bold';
  }
  function paragraphStyle(target: HTMLElement, p: Element) {
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
      const sp = child(pr, 'spacing');
      if (sp) {
        for (const [key, css] of [['before', 'marginTop'], ['after', 'marginBottom']] as const) {
          const value = attr(sp, key); if (value) target.style[css] = `${Math.max(0, Number(value) / 20)}pt`;
        }
        const line = attr(sp, 'line');
        if (line) target.style.lineHeight = attr(sp, 'lineRule') === 'auto' || !attr(sp, 'lineRule') ? String(Math.max(1, Number(line) / 240)) : `${Number(line) / 20}pt`;
      }
    }
    target.style.marginTop = '0'; target.style.marginBottom = '0'; target.style.lineHeight = '1.15';
    runStyle(target, child(child(defaults, 'rPrDefault'), 'rPr'));
    inherited('Normal'); inherited(attr(child(props, 'pStyle')));
    spacing(props);
    // Direct run sizes also cover form templates that do not use named styles.
    runStyle(target, child(props, 'rPr'));
    const runs = children(p, 'r').filter(r => text(r).trim());
    runStyle(target, child(runs[0] || children(p,'r')[0], 'rPr'));
    target.style.whiteSpace = 'pre-wrap';
  }
  // Match by text rather than index: empty paragraphs and floating text boxes
  // are handled differently by Word and the semantic converter.
  const paragraphs = Array.from(source.getElementsByTagNameNS(W, 'p')).filter(p=>{let parent=p.parentElement;while(parent){if(parent.localName==='Fallback'&&parent.namespaceURI==='http://schemas.openxmlformats.org/markup-compatibility/2006')return false;parent=parent.parentElement;}return true;});
  const queues = new Map<string, Element[]>();
  const paragraphTargets = new Map<Element, HTMLElement>();
  for (const p of paragraphs) { const key = normalize(text(p)); if (key) queues.set(key, [...(queues.get(key) || []), p]); }
  dom.body.querySelectorAll<HTMLElement>('p,h1,h2,h3,h4,h5,h6').forEach(p => {
    const src = queues.get(normalize(p.textContent || ''))?.shift(); if (src) { paragraphStyle(p, src); paragraphTargets.set(src,p); }
  });
  for(const [original,target] of paragraphTargets){
    const before=child(child(original,'pPr'),'pageBreakBefore');
    if(before&&attr(before)!=='0'&&attr(before)!=='false'){
      let block:Element=target;while(block.parentElement&&block.parentElement!==dom.body)block=block.parentElement;
      const marker=dom.createElement('div');marker.className='a4-page-break';block.before(marker);
    }
  }
  const emptySource=paragraphs.filter(p=>p.parentElement?.localName==='body'&&!normalize(text(p))&&!p.getElementsByTagNameNS(W,'drawing').length);
  Array.from(dom.body.children).filter((p):p is HTMLElement=>p instanceof HTMLElement&&p.tagName==='P'&&!normalize(p.textContent||'')).forEach((p,i)=>{if(emptySource[i])paragraphStyle(p,emptySource[i]);});
  const section = Array.from(source.getElementsByTagNameNS(W, 'sectPr')).at(-1);
  const size = child(section, 'pgSz'), margins = child(section, 'pgMar');
  const pageWidth = cm(attr(size,'w')) || 21;
  const leftMargin = cm(attr(margins,'left')) || 2.5;
  // DrawingML is the primary representation; VML inside mc:Fallback is a copy.
  for (const box of Array.from(source.getElementsByTagNameNS(W, 'txbxContent'))) {
    let anchor: Element | null = box.parentElement;
    while (anchor && !(anchor.namespaceURI === WP && anchor.localName === 'anchor')) anchor = anchor.parentElement;
    if (!anchor) continue;
    const boxParagraphs = children(box,'p');
    const rendered = boxParagraphs.map(p=>paragraphTargets.get(p)).filter((p):p is HTMLElement=>Boolean(p));
    // A semantic converter may have chosen the VML fallback; match its text too.
    const matched = rendered.length ? rendered : boxParagraphs.filter(p=>text(p).trim()).map(p=>{const existing=Array.from(dom.body.querySelectorAll<HTMLElement>('p')).find(n=>!n.closest('[data-word-floating]')&&normalize(n.textContent||'')===normalize(text(p)));if(existing)return existing;const created=dom.createElement('p');created.textContent=text(p);paragraphStyle(created,p);return created;});
    if (!matched.length) continue;
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
    if(!target)continue;
    if(anchorP)paragraphStyle(target,anchorP);
    const holder=dom.createElement('div');holder.dataset.wordAnchorGroup='true';holder.style.position='relative';holder.style.minHeight=`${height+Math.max(0,y)}pt`;
    target.before(holder);
    // Keep following introductory paragraphs beside the box; the table starts
    // after this group, so the legend cannot overlap it or push into a cell.
    let next:Element|null=target;
    while(next&&next.tagName!=='TABLE') { const following:Element|null=next.nextElementSibling; if(!matched.includes(next as HTMLElement))holder.append(next);next=following; }
    const floating=dom.createElement('div');floating.dataset.wordFloating='true';floating.setAttribute('role','group');floating.setAttribute('aria-label','Caixa de texto importada');
    const origin=horizontal?.getAttribute('relativeFrom')==='page'?x-leftMargin*28.346:x;
    floating.style.cssText=`position:absolute;left:${origin}pt;top:${y}pt;width:${width}pt;min-height:${height}pt;box-sizing:border-box;padding:3pt 5pt;border:.5pt solid #333;background:#fff;color:#111;z-index:2;`;
    matched.forEach((p,i)=>{if(boxParagraphs[i])paragraphStyle(p,boxParagraphs[i]);p.style.whiteSpace='normal';floating.append(p);});
    holder.append(floating);
  }
  const tables = Array.from(source.getElementsByTagNameNS(W, 'tbl'));
  Array.from(dom.body.querySelectorAll('table')).forEach((table, i) => {
    const src = tables[i]; if (!src) return;
    table.dataset.wordImported = 'true';
    const tableProps = child(src, 'tblPr');
    const tableStyle = styleMap.get(attr(child(tableProps, 'tblStyle')));
    const tableBorders = child(tableProps, 'tblBorders') || child(child(tableStyle, 'tblPr'), 'tblBorders');
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
      const cells = children(row, 'tc').filter(c => { const merge = child(child(c, 'tcPr'), 'vMerge'); return !merge || attr(merge) === 'restart'; });
      cells.forEach((cell, ci) => {
        const target = targetRow.cells[ci]; if (!target) return;
        const props = child(cell, 'tcPr');
        target.style.padding = '1pt';
        if(!target.textContent?.trim()){
          let p=target.querySelector('p');if(!p){p=dom.createElement('p');p.innerHTML='<br>';target.append(p);}
          const original=child(cell,'p');if(original)paragraphStyle(p,original);
        }
        const firstParagraph = target.querySelector<HTMLElement>('p');
        if (firstParagraph) {
          target.style.fontSize = firstParagraph.style.fontSize;
          target.style.fontFamily = firstParagraph.style.fontFamily;
          target.style.lineHeight = firstParagraph.style.lineHeight;
        }
        const cellBorders = child(props, 'tcBorders');
        for (const side of ['top', 'bottom', 'left', 'right'] as const) {
          const border = child(cellBorders, side) || child(tableBorders, side) || child(tableBorders, side === 'top' || side === 'bottom' ? 'insideH' : 'insideV');
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
  const settings: Partial<WordDocument> = {};
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
    block.style.cssText = 'position:relative;font-size:9pt;line-height:1.1;text-align:center;margin:0;min-height:1.8cm';
    for (const drawing of [...Array.from(part.getElementsByTagNameNS(A, 'blip')), ...Array.from(part.getElementsByTagNameNS(V, 'imagedata'))]) {
      const rid = drawing.getAttributeNS(R, 'embed') || drawing.getAttributeNS(R, 'id');
      const imageRel = Array.from(partRels?.documentElement.children || []).find(r => r.getAttribute('Id') === rid && r.getAttribute('TargetMode') !== 'External');
      const imageTarget = imageRel?.getAttribute('Target') || '';
      if (!/^media\/[^/]+\.(png|jpe?g|gif)$/i.test(imageTarget)) continue;
      const imageFile = zip.file(`word/${imageTarget}`); if (!imageFile) continue;
      const img = document.createElement('img'); const ext = imageTarget.split('.').at(-1)?.toLowerCase();
      img.src = `data:image/${ext === 'jpg' ? 'jpeg' : ext};base64,${await imageFile.async('base64')}`;
      img.alt = kind === 'header' ? 'Imagem do cabeçalho' : 'Imagem do rodapé';
      img.style.cssText = 'display:inline-block;max-height:1.3cm;max-width:25%;width:auto;vertical-align:middle;margin:0 8pt';
      try { await img.decode(); const height = Math.min(49, img.naturalHeight); img.style.width = `${height * img.naturalWidth / img.naturalHeight}px`; img.style.height = `${height}px`; } catch { /* Keep natural size when decoding is unavailable. */ }
      const picture=drawing.parentElement?.parentElement;
      const crop=picture?.getElementsByTagNameNS(A,'srcRect')[0];
      if(crop){
        const l=Number(crop.getAttribute('l')||0)/100000,t=Number(crop.getAttribute('t')||0)/100000,r=Number(crop.getAttribute('r')||0)/100000,b=Number(crop.getAttribute('b')||0)/100000;
        if(l+r<1&&t+b<1&&(l||r||t||b)&&img.naturalWidth){const canvas=document.createElement('canvas');canvas.width=Math.round(img.naturalWidth*(1-l-r));canvas.height=Math.round(img.naturalHeight*(1-t-b));const context=canvas.getContext('2d');if(context){context.drawImage(img,img.naturalWidth*l,img.naturalHeight*t,canvas.width,canvas.height,0,0,canvas.width,canvas.height);img.src=canvas.toDataURL('image/png');}}
      }
      let anchor:Element|null=drawing.parentElement;
      while(anchor&&!(anchor.namespaceURI===WP&&anchor.localName==='anchor'))anchor=anchor.parentElement;
      if(anchor){const ext=anchor.getElementsByTagNameNS(WP,'extent')[0];const align=anchor.getElementsByTagNameNS(WP,'positionH')[0]?.getElementsByTagNameNS(WP,'align')[0]?.textContent;const pos=Number(anchor.getElementsByTagNameNS(WP,'positionV')[0]?.getElementsByTagNameNS(WP,'posOffset')[0]?.textContent||0)/360000;
        img.dataset.wordHeaderImage=align==='right'?'right':'left';img.style.cssText=`position:absolute;${align==='right'?'right':'left'}:0;top:${pos}cm;width:${Number(ext?.getAttribute('cx'))/360000}cm;height:${Number(ext?.getAttribute('cy'))/360000}cm;`;
      }
      block.append(img);
    }
    for (const p of Array.from(part.getElementsByTagNameNS(W, 'p'))) {
      if (!text(p).trim()) continue;
      const out = dom.createElement('p'); out.textContent = text(p).trim(); paragraphStyle(out, p); out.style.whiteSpace='normal';out.style.textAlign='center';block.append(out);
    }
    if(block.childNodes.length){if(kind==='header') {settings.headerHtml=block.outerHTML;settings.topMarginCm=Math.max(settings.topMarginCm||0,(settings.headerDistanceCm||0)+2.3);} else {settings.footerHtml=block.outerHTML;settings.bottomMarginCm=Math.max(settings.bottomMarginCm||0,(settings.footerDistanceCm||0)+1.2);}}
  }
  const warnings = source.getElementsByTagNameNS(W, 'txbxContent').length > 0 || source.getElementsByTagNameNS(W, 'sectPr').length > 1 || Boolean(section?.getElementsByTagNameNS(W, 'headerReference').length || section?.getElementsByTagNameNS(W, 'footerReference').length);
  return { html: dom.body.innerHTML, settings, warnings };
}
