import { AlignmentType, BorderStyle, CommentRangeEnd, CommentRangeStart, CommentReference, Document as DocxDocument, ExternalHyperlink, Footer, Header, HeadingLevel, HeightRule, ImageRun, LevelFormat, Packer, PageNumber, Paragraph, Table, TableCell, TableLayoutType, TableRow, TextDirection, TextRun, VerticalAlignTable, WidthType } from 'docx';
import type { IBorderOptions, IRunOptions, ParagraphChild } from 'docx';
import type { WordDocument } from '../types/doc';
import { tableMap } from './wordTable';

type Block = Paragraph | Table;
const cm = (value: number) => Math.round(value * 567);
const points = (value: string) => { const n = parseFloat(value); return Number.isFinite(n) ? n * (value.endsWith('cm') ? 28.346 : value.endsWith('pt') ? 1 : .75) : 0; };
function cellBorder(style: CSSStyleDeclaration, side: 'Top' | 'Bottom' | 'Left' | 'Right'): IBorderOptions {
  const value = style[`border${side}Style`], size = style[`border${side}Width`];
  return { style: value === 'none' || value === 'hidden' ? BorderStyle.NONE : value === 'dashed' ? BorderStyle.DASHED : value === 'dotted' ? BorderStyle.DOTTED : value === 'double' ? BorderStyle.DOUBLE : BorderStyle.SINGLE, size: size ? Math.max(0, points(size) * 8) : 6, color: color(style[`border${side}Color`]) || '64748B' };
}
function color(value?: string | null): string | undefined {
  if (!value || value === 'transparent') return undefined;
  if (/^#[0-9a-f]{6}$/i.test(value)) return value.slice(1);
  if (/^#[0-9a-f]{3}$/i.test(value)) return value.slice(1).split('').map(v => v + v).join('');
  const rgb = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  return rgb ? rgb.slice(1, 4).map(v => Number(v).toString(16).padStart(2, '0')).join('') : undefined;
}
async function imageRun(element: HTMLElement | SVGElement): Promise<ImageRun> {
  let src: string;
  if (element.tagName.toLowerCase() === 'svg') src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(element))}`;
  else src = (element as HTMLImageElement).src;
  if (!src || !/^(data:image\/|https?:\/\/|blob:)/i.test(src)) throw new Error('Imagem inválida para exportação.');
  const image = new window.Image(); image.crossOrigin = 'anonymous'; image.src = src;
  await Promise.race([image.decode(), new Promise((_, reject) => setTimeout(() => reject(new Error('Tempo excedido ao carregar imagem.')), 10000))]);
  const requestedWidth = points((element as HTMLElement).style.width || '') / .75 || parseFloat(element.getAttribute('width') || '') || image.naturalWidth || 400;
  const width = Math.max(1, Math.min(650, requestedWidth));
  const height = width * (image.naturalHeight || 200) / (image.naturalWidth || 400);
  const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(width * 2)); canvas.height = Math.max(1, Math.round(height * 2));
  const context = canvas.getContext('2d'); if (!context) throw new Error('Não foi possível converter a imagem.');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const encoded = canvas.toDataURL('image/png').split(',')[1];
  return new ImageRun({ type: 'png', data: Uint8Array.from(atob(encoded), c => c.charCodeAt(0)), transformation: { width, height }, altText: { name: element.getAttribute('alt') || 'Ilustração', title: 'Ilustração', description: element.getAttribute('alt') || '' } });
}
async function runs(nodes: NodeListOf<ChildNode> | ChildNode[], inherited: IRunOptions = {}, commentMap = new Map<string, number>()): Promise<ParagraphChild[]> {
  const result: ParagraphChild[] = [];
  for (const node of nodes) {
    if (node.nodeType === Node.TEXT_NODE) { if (node.textContent) result.push(new TextRun({ ...inherited, text: node.textContent })); continue; }
    if (!(node instanceof Element)) continue;
    const el = node as HTMLElement; const tag = el.tagName.toLowerCase();
    if (tag === 'img' || tag === 'svg') { result.push(await imageRun(el)); continue; }
    if (tag === 'br') { result.push(new TextRun({ break: 1 })); continue; }
    const size = points(el.style.fontSize || '') * 2 || (el.getAttribute('size') ? [0, 16, 20, 24, 28, 36, 48, 72][Number(el.getAttribute('size'))] : undefined);
    const fill = color(el.style.backgroundColor) || (tag === 'mark' ? 'FEF08A' : undefined);
    const style: IRunOptions = { ...inherited,
      bold: inherited.bold || ['b', 'strong', 'th'].includes(tag) || Number(el.style.fontWeight) >= 600 || el.style.fontWeight === 'bold',
      italics: inherited.italics || ['i', 'em'].includes(tag) || el.style.fontStyle === 'italic',
      underline: tag === 'u' || el.style.textDecoration.includes('underline') ? {} : inherited.underline,
      strike: inherited.strike || ['s', 'strike', 'del'].includes(tag) || el.style.textDecoration.includes('line-through'),
      subScript: inherited.subScript || tag === 'sub', superScript: inherited.superScript || tag === 'sup',
      font: (el.style.fontFamily || el.getAttribute('face') || inherited.font || 'Calibri').toString().split(',')[0].replace(/['"]/g, ''),
      size: size || inherited.size, color: color(el.style.color || el.getAttribute('color')) || inherited.color,
      shading: fill ? { fill } : inherited.shading,
    };
    const children = await runs(el.childNodes, style, commentMap);
    const comment = commentMap.get(el.dataset.commentId || '');
    if (comment !== undefined) { result.push(new CommentRangeStart(comment), ...children, new CommentRangeEnd(comment), new TextRun({ children: [new CommentReference(comment)] })); continue; }
    const href = el.getAttribute('href');
    if (tag === 'a' && href && /^(https?:\/\/|mailto:)/i.test(href)) result.push(new ExternalHyperlink({ link: href, children }));
    else result.push(...children);
  }
  return result;
}
let listSequence = 0;
async function blocks(parent: HTMLElement, numbering: { reference: string; levels: any[] }[], list?: { ordered: boolean; reference: string; level: number }, commentMap = new Map<string, number>()): Promise<Block[]> {
  const result: Block[] = [];
  let inline: ChildNode[] = [];
  const flush = async () => { if (inline.some(n => n.nodeType !== Node.TEXT_NODE || n.textContent?.trim())) result.push(new Paragraph({ children: await runs(inline, {}, commentMap) })); inline = []; };
  for (const node of parent.childNodes) {
    if (!(node instanceof HTMLElement) && !(node instanceof SVGElement)) { inline.push(node); continue; }
    const el = node as HTMLElement, tag = el.tagName.toLowerCase();
    if (tag === 'table') {
      await flush(); const rows: TableRow[] = [];
      const logical = tableMap(el as HTMLTableElement);
      for (const row of (el as HTMLTableElement).rows) {
        const cells: TableCell[] = [];
        for (const cell of row.cells) {
          const clone = cell.cloneNode(true) as HTMLElement;
          if (!clone.querySelector('p,h1,h2,h3,div,table,ul,ol')) { const p = document.createElement('p'); p.append(...clone.childNodes); clone.append(p); }
          clone.querySelectorAll<HTMLElement>('p,h1,h2,h3,li').forEach(p => { if (!p.style.textAlign) p.style.textAlign = cell.style.textAlign; if (!p.style.color) p.style.color = cell.style.color; if (!p.style.fontWeight && (cell.tagName === 'TH' || cell.style.fontWeight)) p.style.fontWeight = cell.style.fontWeight || 'bold'; });
          const children = await blocks(clone, numbering, undefined, commentMap);
          cells.push(new TableCell({ children: children.length ? children : [new Paragraph('')], columnSpan: cell.colSpan > 1 ? cell.colSpan : undefined, rowSpan: cell.rowSpan > 1 ? cell.rowSpan : undefined,
            shading: color(cell.style.backgroundColor) ? { fill: color(cell.style.backgroundColor) } : undefined,
            verticalAlign: cell.style.verticalAlign === 'middle' ? VerticalAlignTable.CENTER : cell.style.verticalAlign === 'bottom' ? VerticalAlignTable.BOTTOM : VerticalAlignTable.TOP,
            textDirection: cell.style.writingMode === 'vertical-rl' ? TextDirection.TOP_TO_BOTTOM_RIGHT_TO_LEFT : undefined,
            margins: { top: Math.round(points(cell.style.paddingTop || '6px') * 20), bottom: Math.round(points(cell.style.paddingBottom || '6px') * 20), left: Math.round(points(cell.style.paddingLeft || '8px') * 20), right: Math.round(points(cell.style.paddingRight || '8px') * 20) },
            borders: { top: cellBorder(cell.style, 'Top'), bottom: cellBorder(cell.style, 'Bottom'), left: cellBorder(cell.style, 'Left'), right: cellBorder(cell.style, 'Right') },
          }));
        }
        rows.push(new TableRow({ children: cells, tableHeader: row.parentElement?.tagName === 'THEAD', cantSplit: row.dataset.wordCantSplit === 'true', height: row.style.height ? { value: Math.round(points(row.style.height) * 20), rule: HeightRule.ATLEAST } : undefined }));
      }
      const columns = Array.from(el.querySelectorAll<HTMLTableColElement>(':scope > colgroup > col'));
      const fixedWidths = columns.length === logical.width && columns.every(col => points(col.style.width) > 0) ? columns.map(col => Math.round(points(col.style.width) * 20)) : undefined;
      if (rows.length) result.push(new Table({ rows, columnWidths: fixedWidths, layout: el.style.tableLayout === 'fixed' ? TableLayoutType.FIXED : TableLayoutType.AUTOFIT,
        alignment: el.style.marginLeft === 'auto' ? el.style.marginRight === 'auto' ? AlignmentType.CENTER : AlignmentType.RIGHT : AlignmentType.LEFT,
        width: el.style.width === 'auto' || el.dataset.wordFit === 'content' ? { size: 0, type: WidthType.AUTO } : el.style.width && !el.style.width.endsWith('%') ? { size: Math.round(points(el.style.width) * 20), type: WidthType.DXA } : { size: 100, type: WidthType.PERCENTAGE },
      }));
    } else if (tag === 'ul' || tag === 'ol') {
      await flush(); const reference = `ordered-${listSequence++}`;
      if (tag === 'ol') numbering.push({ reference, levels: Array.from({ length: 9 }, (_, level) => ({ level, format: LevelFormat.DECIMAL, text: `%${level + 1}.`, alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720 * (level + 1), hanging: 260 } } } })) });
      result.push(...await blocks(el, numbering, { ordered: tag === 'ol', reference, level: Math.min(8, list ? list.level + 1 : 0) }, commentMap));
    } else if (el.classList.contains('a4-page-break')) {
      await flush(); result.push(new Paragraph({ pageBreakBefore: true }));
    } else if (/^(p|h[1-6]|blockquote|li)$/.test(tag)) {
      await flush(); const alignment = el.style.textAlign || el.getAttribute('align');
      const heading = tag === 'h1' ? HeadingLevel.HEADING_1 : tag === 'h2' ? HeadingLevel.HEADING_2 : tag === 'h3' ? HeadingLevel.HEADING_3 : undefined;
      const children = await runs([...el.childNodes].filter(child => !(child instanceof Element && ['UL', 'OL', 'TABLE'].includes(child.tagName))), { font: el.style.fontFamily?.split(',')[0].replace(/['"]/g, '') || 'Calibri', size: points(el.style.fontSize) * 2 || undefined, color: color(el.style.color), bold: heading ? true : tag === 'th' }, commentMap);
      result.push(new Paragraph({ children, heading,
        alignment: alignment === 'center' ? AlignmentType.CENTER : alignment === 'right' ? AlignmentType.RIGHT : alignment === 'justify' ? AlignmentType.BOTH : AlignmentType.LEFT,
        bullet: tag === 'li' && list && !list.ordered ? { level: list.level } : undefined,
        numbering: tag === 'li' && list?.ordered ? { reference: list.reference, level: list.level } : undefined,
        spacing: { before: Math.round(points(el.style.marginTop) * 20), after: el.style.marginBottom ? Math.round(points(el.style.marginBottom) * 20) : 160, line: el.style.lineHeight ? Math.round(Number(el.style.lineHeight) * 240) || undefined : undefined },
        indent: { left: Math.round(points(el.style.marginLeft) * 20), right: Math.round(points(el.style.marginRight) * 20), firstLine: Math.max(0, Math.round(points(el.style.textIndent) * 20)) },
        shading: color(el.style.backgroundColor) ? { fill: color(el.style.backgroundColor) } : undefined,
        border: el.style.borderBottom ? { bottom: { color: '64748B', style: BorderStyle.SINGLE, size: 6 } } : undefined,
      }));
      for (const child of el.children) if (['UL', 'OL', 'TABLE'].includes(child.tagName)) { const holder = document.createElement('div'); holder.append(child.cloneNode(true)); result.push(...await blocks(holder, numbering, list, commentMap)); }
    } else if (['div', 'section', 'figure', 'header', 'footer'].includes(tag)) {
      await flush(); result.push(...await blocks(el, numbering, list, commentMap));
    } else inline.push(node);
  }
  await flush(); return result;
}

export async function createDocxBlob(doc: WordDocument): Promise<Blob> {
  const numbering: { reference: string; levels: any[] }[] = [];
  const children: Block[] = [];
  const commentMap = new Map((doc.comments || []).map((comment, index) => [comment.id, index]));
  const pages = doc.pages?.length ? doc.pages : [doc.content];
  for (const [index, html] of pages.entries()) {
    if (index > 0) children.push(new Paragraph({ pageBreakBefore: true }));
    const dom = new DOMParser().parseFromString(html, 'text/html');
    if (doc.firstLineIndentCm) dom.body.querySelectorAll<HTMLElement>('p').forEach(p => { if (!p.style.textIndent) p.style.textIndent = `${doc.firstLineIndentCm}cm`; });
    children.push(...await blocks(dom.body, numbering, undefined, commentMap));
  }
  const width = doc.pageSize === 'letter' ? 21.59 : 21, height = doc.pageSize === 'letter' ? 27.94 : 29.7;
  const landscape = doc.orientation === 'landscape';
  const headerContent: Paragraph[] = [];
  if (doc.headerText) headerContent.push(new Paragraph({ children: [new TextRun({ text: doc.headerText, size: 20, color: '64748B' })] }));
  if (doc.watermarkText) {
    const canvas = document.createElement('canvas'); canvas.width = 900; canvas.height = 900;
    const context = canvas.getContext('2d');
    if (context) {
      context.translate(450, 450); context.rotate(-Math.PI / 5); context.textAlign = 'center'; context.textBaseline = 'middle';
      context.fillStyle = '#cbd5e166'; context.font = 'bold 65px Arial'; context.fillText(doc.watermarkText, 0, 0, 820);
      const encoded = canvas.toDataURL('image/png').split(',')[1];
      headerContent.push(new Paragraph({ children: [new ImageRun({ type: 'png', data: Uint8Array.from(atob(encoded), c => c.charCodeAt(0)), transformation: { width: 600, height: 600 }, floating: { horizontalPosition: { relative: 'page', align: 'center' }, verticalPosition: { relative: 'page', align: 'center' }, behindDocument: true, allowOverlap: true } })] }));
    }
  }
  const footerContent: ParagraphChild[] = [];
  if (doc.footerText) footerContent.push(new TextRun({ text: doc.footerText, size: 20, color: '64748B' }));
  if (doc.pageNumbers) footerContent.push(new TextRun({ children: ['   Página ', PageNumber.CURRENT, ' de ', PageNumber.TOTAL_PAGES], size: 20, color: '64748B' }));
  return Packer.toBlob(new DocxDocument({
    title: doc.title, creator: 'Neiva Points',
    styles: { default: { document: { run: { font: 'Calibri', size: 24 }, paragraph: { spacing: { after: 160 } } } } },
    numbering: { config: numbering },
    comments: { children: (doc.comments || []).map((comment, id) => ({ id, author: 'Neiva Points', date: new Date(comment.createdAt), children: [new Paragraph(comment.text)] })) },
    sections: [{ headers: headerContent.length ? { default: new Header({ children: headerContent }) } : undefined, footers: footerContent.length ? { default: new Footer({ children: [new Paragraph({ children: footerContent })] }) } : undefined, properties: { page: { size: { width: cm(width), height: cm(height), orientation: landscape ? 'landscape' : 'portrait' }, margin: { left: cm(doc.leftMarginCm ?? 2.5), right: cm(doc.rightMarginCm ?? 2.5), top: cm(doc.topMarginCm ?? 2.5), bottom: cm(doc.bottomMarginCm ?? 2.5) } } }, children: children.length ? children : [new Paragraph('')] }],
  }));
}
export async function exportToDocx(doc: WordDocument): Promise<void> {
  const blob = await createDocxBlob(doc);
  const url = URL.createObjectURL(blob); const link = document.createElement('a');
  link.href = url; link.download = `${doc.title.replace(/[\\/:*?"<>|]/g, '').trim() || 'documento'}.docx`;
  document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
