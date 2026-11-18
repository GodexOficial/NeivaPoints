import {cleanWordHtml} from './wordImport';
export type WordClipboardContent={html?:string;text?:string};
/** Read rich clipboard data first; plain text is an explicit, separate command. */
export async function readWordClipboard(plainText=false,clipboard:Pick<Clipboard,'read'|'readText'>=navigator.clipboard):Promise<WordClipboardContent>{
  if(!clipboard)throw new Error('Use Ctrl+V para colar neste navegador.');
  if(plainText)return {text:await clipboard.readText()};
  if(typeof clipboard.read==='function'){
    const items=await clipboard.read();
    for(const item of items)if(item.types.includes('text/html')){
      const raw=await(await item.getType('text/html')).text();
      if(raw.trim())return {html:cleanWordHtml(raw)};
    }
    for(const item of items)if(item.types.includes('text/plain'))return {text:await(await item.getType('text/plain')).text()};
    if(items.length)throw new Error('Este conteúdo não pode ser colado como texto ou tabela.');
    return {text:''};
  }
  return {text:await clipboard.readText()};
}
