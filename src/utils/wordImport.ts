import DOMPurify from 'dompurify';

export function cleanWordHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ADD_ATTR: ['contenteditable', 'data-word-draggable', 'data-comment-id'],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'textarea', 'select', 'style'],
  }) || '<p><br></p>';
}
export async function importWordFile(file: File): Promise<{ html: string; title: string; warnings: boolean }> {
  if (file.size > 20 * 1024 * 1024) throw new Error('Escolha um arquivo de até 20 MB.');
  const title = file.name.replace(/\.[^.]+$/, '');
  if (/\.docx$/i.test(file.name)) {
    const mammoth = await import('mammoth');
    const result = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
    return { html: cleanWordHtml(result.value), title, warnings: result.messages.length > 0 };
  }
  const text = await file.text();
  if (/\.html?$/i.test(file.name)) return { html: cleanWordHtml(text), title, warnings: false };
  if (!/\.txt$/i.test(file.name)) throw new Error('Use um arquivo DOCX, HTML ou TXT.');
  return { html: text.split(/\r?\n/).map(line => `<p>${escapeWordText(line) || '<br>'}</p>`).join(''), title, warnings: false };
}
export function escapeWordText(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
