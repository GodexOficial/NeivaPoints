import DOMPurify from 'dompurify';
import type { WordDocument } from '../types/doc';
import {paginateWordHtml} from './wordPagination';

export function cleanWordHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ADD_ATTR: ['contenteditable', 'data-word-draggable', 'data-comment-id'],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'textarea', 'select', 'style'],
  }) || '<p><br></p>';
}
export async function importWordFile(file: File): Promise<{ html: string; title: string; warnings: boolean; settings?: Partial<WordDocument> }> {
  if (file.size > 20 * 1024 * 1024) throw new Error('Escolha um arquivo de até 20 MB.');
  const title = file.name.replace(/\.[^.]+$/, '');
  if (/\.doc$/i.test(file.name)) throw new Error('Este é um arquivo Word antigo (.doc). Abra-o no Word e use Salvar como → Documento do Word (.docx), depois importe a nova cópia.');
  const editableCopy = (html: string) => { const dom = new DOMParser().parseFromString(cleanWordHtml(html),'text/html'); dom.body.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable')); return dom.body.innerHTML || '<p><br></p>'; };
  if (/\.(docx|dotx|docm|dotm)$/i.test(file.name)) {
    const buffer = await file.arrayBuffer(), signature = new Uint8Array(buffer,0,Math.min(8,buffer.byteLength));
    if (signature[0]===0xd0 && signature[1]===0xcf && signature[2]===0x11 && signature[3]===0xe0) throw new Error('Este documento está criptografado ou protegido por senha. Abra-o no Word com a senha e salve uma cópia DOCX sem criptografia para importá-la.');
    const mammoth = await import('mammoth');
    try {
      const result = await mammoth.convertToHtml({ arrayBuffer: buffer },{styleMap:["br[type='page'] => hr.a4-page-break"]});
      const { restoreDocxLayout } = await import('./wordDocxLayout');
      const layout = await restoreDocxLayout(buffer, editableCopy(result.value));
      const html=editableCopy(layout.html);
      return { html, settings: {...layout.settings,pages:paginateWordHtml(html,layout.settings)}, title, warnings: layout.warnings || result.messages.length > 0 || /\.do[ct]m$/i.test(file.name) };
    } catch { throw new Error('Não foi possível abrir este documento. Verifique se ele abre no Word e salve uma nova cópia no formato DOCX.'); }
  }
  const text = await file.text();
  if (/\.html?$/i.test(file.name)) return { html: editableCopy(text), title, warnings: false };
  if (!/\.txt$/i.test(file.name)) throw new Error('Use um arquivo DOCX, HTML ou TXT.');
  return { html: text.split(/\r?\n/).map(line => `<p>${escapeWordText(line) || '<br>'}</p>`).join(''), title, warnings: false };
}
export function escapeWordText(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
