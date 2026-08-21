import {
  Document as DocxDocument,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
} from 'docx';
import type { WordDocument } from '../types/doc';

// Helper to convert HTML string into structured Paragraphs for docx
const parseHtmlToParagraphs = (html: string): Paragraph[] => {
  const paragraphs: Paragraph[] = [];

  // Create a DOM parser element in browser
  if (typeof window === 'undefined') {
    return [new Paragraph({ children: [new TextRun(html)] })];
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const processNode = (node: Node): Paragraph[] => {
    const nodeParagraphs: Paragraph[] = [];

    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tagName = el.tagName.toLowerCase();

      // Handle Page Breaks
      if (el.classList.contains('a4-page-break') || el.style.pageBreakBefore === 'always' || el.style.breakBefore === 'page') {
        return [new Paragraph({ pageBreakBefore: true })];
      }

      let headingLevel: (typeof HeadingLevel)[keyof typeof HeadingLevel] | undefined;
      if (tagName === 'h1') headingLevel = HeadingLevel.HEADING_1;
      else if (tagName === 'h2') headingLevel = HeadingLevel.HEADING_2;
      else if (tagName === 'h3') headingLevel = HeadingLevel.HEADING_3;
      else if (tagName === 'h4') headingLevel = HeadingLevel.HEADING_4;

      let alignment: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.LEFT;
      const textAlign = el.style.textAlign || el.getAttribute('align');
      if (textAlign === 'center') alignment = AlignmentType.CENTER;
      else if (textAlign === 'right') alignment = AlignmentType.RIGHT;
      else if (textAlign === 'justify') alignment = AlignmentType.BOTH;

      if (['p', 'h1', 'h2', 'h3', 'h4', 'div', 'li'].includes(tagName)) {
        const textRuns: TextRun[] = [];

        const collectTextRuns = (childNode: Node, isBold = false, isItalic = false, isUnderline = false) => {
          if (childNode.nodeType === Node.TEXT_NODE) {
            const text = childNode.textContent || '';
            if (text) {
              textRuns.push(
                new TextRun({
                  text,
                  bold: isBold,
                  italics: isItalic,
                  underline: isUnderline ? {} : undefined,
                })
              );
            }
          } else if (childNode.nodeType === Node.ELEMENT_NODE) {
            const childEl = childNode as HTMLElement;
            const childTag = childEl.tagName.toLowerCase();
            const b = isBold || childTag === 'b' || childTag === 'strong';
            const i = isItalic || childTag === 'i' || childTag === 'em';
            const u = isUnderline || childTag === 'u';

            childEl.childNodes.forEach((cn) => collectTextRuns(cn, b, i, u));
          }
        };

        el.childNodes.forEach((cn) => collectTextRuns(cn));

        if (textRuns.length > 0) {
          nodeParagraphs.push(
            new Paragraph({
              heading: headingLevel,
              alignment,
              bullet: tagName === 'li' ? { level: 0 } : undefined,
              children: textRuns,
            })
          );
        }
      } else {
        el.childNodes.forEach((cn) => {
          nodeParagraphs.push(...processNode(cn));
        });
      }
    }

    return nodeParagraphs;
  };

  doc.body.childNodes.forEach((node) => {
    paragraphs.push(...processNode(node));
  });

  if (paragraphs.length === 0) {
    paragraphs.push(
      new Paragraph({
        children: [new TextRun(doc.body.textContent || '')],
      })
    );
  }

  return paragraphs;
};

export const exportToDocx = async (doc: WordDocument): Promise<void> => {
  try {
    let paragraphs: Paragraph[] = [];

    if (doc.pages && doc.pages.length > 0) {
      doc.pages.forEach((pageHtml, pageIdx) => {
        const pageParas = parseHtmlToParagraphs(pageHtml);
        if (pageIdx > 0 && pageParas.length > 0) {
          paragraphs.push(new Paragraph({ pageBreakBefore: true }));
        }
        paragraphs.push(...pageParas);
      });
    } else {
      paragraphs = parseHtmlToParagraphs(doc.content);
    }

    const docxDoc = new DocxDocument({
      sections: [
        {
          properties: {},
          children: paragraphs,
        },
      ],
    });

    const blob = await Packer.toBlob(docxDoc);
    const fileName = `${doc.title.replace(/[^a-zA-Z0-9-_\s]/g, '') || 'documento'}.docx`;

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  } catch (error) {
    console.error('Error generating docx file:', error);
    // Fallback export as formatted HTML docx compatible blob
    fallbackDocxExport(doc);
  }
};

const fallbackDocxExport = (doc: WordDocument): void => {
  const htmlContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>${doc.title}</title>
      <style>
        body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; line-height: 1.5; padding: 2cm; }
        h1 { font-size: 24pt; color: #1e3a8a; }
        h2 { font-size: 18pt; color: #1e293b; }
        h3 { font-size: 14pt; }
        table { border-collapse: collapse; width: 100%; margin: 12px 0; }
        th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
        .vector-shape { margin: 12px 0; text-align: center; }
      </style>
    </head>
    <body>
      ${doc.content}
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', htmlContent], {
    type: 'application/msword;charset=utf-8',
  });

  const fileName = `${doc.title.replace(/[^a-zA-Z0-9-_\s]/g, '') || 'documento'}.docx`;
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};
