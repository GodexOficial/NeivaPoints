import type { WordDocument } from '../types/doc';

export function wordPageDimensions(doc: Partial<WordDocument>) {
  const width=doc.pageSize==='letter'?21.59:21, height=doc.pageSize==='letter'?27.94:29.7;
  return {width:doc.orientation==='landscape'?height:width,height:doc.orientation==='landscape'?width:height};
}

/** Measure at physical paper size, independently of the viewport and zoom. */
export function paginateWordHtml(html:string, doc:Partial<WordDocument>):string[]{
  const dimensions=wordPageDimensions(doc);
  const width=Math.max(2,dimensions.width-(doc.leftMarginCm??2.5)-(doc.rightMarginCm??2.5));
  const height=Math.max(2,dimensions.height-(doc.topMarginCm??2.5)-(doc.bottomMarginCm??2.5))*96/2.54;
  const shell=document.createElement('div');shell.className='word-workspace word-pagination-measure';shell.setAttribute('aria-hidden','true');shell.setAttribute('inert','');
  shell.style.cssText='position:absolute;inset:auto;left:-100000px;top:0;width:auto;height:auto;visibility:hidden;pointer-events:none;z-index:-1;';
  const measure=document.createElement('div');measure.className='word-editable a4-page-content';measure.style.cssText=`width:${width}cm;height:auto;min-height:0;padding:0;display:flow-root;box-sizing:border-box;text-indent:${doc.firstLineIndentCm||0}cm;`;
  shell.append(measure);document.body.append(shell);
  const source=new DOMParser().parseFromString(html,'text/html');
  const pages:string[]=[];
  let contentSinceBreak=false;
  const fits=()=>measure.getBoundingClientRect().height<=height+1;
  const flush=()=>{if(measure.childNodes.length){pages.push(measure.innerHTML);measure.replaceChildren();}};
  function splitParagraph(node:HTMLElement){
    let rest=node;
    while(rest.textContent&&rest.textContent.length>1){
      measure.append(rest);if(fits())return;
      const content=rest.textContent;
      const range=document.createRange();range.selectNodeContents(rest);
      const prefix=(offset:number)=>{const walker=document.createTreeWalker(rest,NodeFilter.SHOW_TEXT);let text=walker.nextNode(),remaining=offset;while(text&&remaining>(text.textContent?.length||0)){remaining-=text.textContent?.length||0;text=walker.nextNode();}if(!text)return null;range.selectNodeContents(rest);range.setEnd(text,remaining);return range.cloneContents();};
      let low=1,high=content.length-1,best=0;
      const trial=rest.cloneNode(false) as HTMLElement;rest.remove();measure.append(trial);
      while(low<=high){const middle=Math.floor((low+high)/2);const fragment=prefix(middle);if(!fragment)break;trial.replaceChildren(fragment);if(fits()){best=middle;low=middle+1;}else high=middle-1;}
      trial.remove();
      if(!best){measure.append(rest);return;}
      const space=content.lastIndexOf(' ',best);if(space>best-40&&space>0)best=space+1;
      const fragment=prefix(best);if(!fragment){measure.append(rest);return;}
      const head=rest.cloneNode(false) as HTMLElement;head.append(fragment);measure.append(head);
      const tailRange=document.createRange();tailRange.selectNodeContents(rest);tailRange.setStart(range.endContainer,range.endOffset);
      const tail=rest.cloneNode(false) as HTMLElement;tail.append(tailRange.cloneContents());flush();rest=tail;
    }
    if(rest.textContent)measure.append(rest);
  }
  function splitTable(table:HTMLTableElement){
    const rows=Array.from(table.rows);
    let current=table.cloneNode(false) as HTMLTableElement;
    const start=()=>{current=table.cloneNode(false) as HTMLTableElement;table.querySelectorAll(':scope > colgroup').forEach(c=>current.append(c.cloneNode(true)));measure.append(current);};start();
    for(let index=0;index<rows.length;){
      // Rows linked by vertical merges must travel together.
      let end=index+1;for(let j=index;j<end&&j<rows.length;j++)for(const cell of rows[j].cells)end=Math.max(end,j+cell.rowSpan);
      const group=rows.slice(index,end);group.forEach(r=>current.append(r));
      if(!fits()&&current.rows.length>group.length){group.forEach(r=>r.remove());flush();start();group.forEach(r=>current.append(r));}
      index=end;
    }
  }
  function place(node:Node){
    if(node instanceof HTMLElement&&node.classList.contains('a4-page-break')){
      const meaningful=Boolean(measure.textContent?.trim()||measure.querySelector('table,img,svg,[data-word-floating]'));
      if(meaningful)flush();else{measure.replaceChildren();if(!contentSinceBreak&&node.dataset.wordExplicitBreak==='true')pages.push('<p><br></p>');}
      contentSinceBreak=false;return;
    }
    if(node.textContent?.trim()||node instanceof Element&&(node.matches('table,img,svg,[data-word-floating]')||node.querySelector('table,img,svg,[data-word-floating]')))contentSinceBreak=true;
    const hadContent=Boolean(measure.textContent?.trim()||measure.querySelector('img,svg,table,[data-word-floating]'));measure.append(node);if(fits())return;
    node.parentNode?.removeChild(node);if(hadContent)flush();measure.append(node);if(fits())return;node.parentNode?.removeChild(node);
    if(node instanceof HTMLTableElement){splitTable(node);return;}
    if(node instanceof HTMLOListElement || node instanceof HTMLUListElement){
      const items = Array.from(node.children);
      let current = node.cloneNode(false) as HTMLOListElement | HTMLUListElement;
      const start = node instanceof HTMLOListElement ? node.start : 1;
      measure.append(current);
      items.forEach((item, index) => {
        current.append(item);
        if (!fits() && current.children.length > 1) {
          item.remove(); flush();
          current = node.cloneNode(false) as HTMLOListElement | HTMLUListElement;
          if (current instanceof HTMLOListElement) current.start = start + index;
          measure.append(current); current.append(item);
        }
      });
      return;
    }
    if(node instanceof HTMLElement&&/^(P|H[1-6]|BLOCKQUOTE)$/.test(node.tagName)&&node.textContent){splitParagraph(node);return;}
    // Decompose ordinary containers, retaining anchored groups as a unit.
    if(node instanceof HTMLElement&&!node.dataset.wordAnchorGroup&&node.children.length){Array.from(node.childNodes).forEach(place);return;}
    measure.append(node);
  }
  try{
    const nodes=Array.from(source.body.childNodes);
    for(let index=0;index<nodes.length;index++){
      const node=nodes[index];
      // A school form consists of an anchored introduction, table and signature
      // paragraphs. Keep the complete form together when it fits one page.
      if(node instanceof HTMLElement&&node.dataset.wordAnchorGroup){
        const unit:Node[]=[node];let next=index+1;
        while(next<nodes.length&&!(nodes[next] instanceof HTMLElement&&((nodes[next] as HTMLElement).dataset.wordAnchorGroup||(nodes[next] as HTMLElement).classList.contains('a4-page-break')))){unit.push(nodes[next++]);}
        const previous=Array.from(measure.childNodes);measure.replaceChildren(...unit);
        const unitFits=fits();measure.replaceChildren(...previous);
        if(unitFits){unit.forEach(n=>measure.append(n));if(!fits()){unit.forEach(n=>n.parentNode?.removeChild(n));flush();unit.forEach(n=>measure.append(n));}}
        else unit.forEach(place);
        index=next-1;
      }else place(node);
    }
    flush();return pages.length?pages:['<p><br></p>'];
  }finally{shell.remove();}
}
