import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FileText,
  Save,
  Download,
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
  FilePlus,
  Sparkles,
  Plus,
  Trash2,
  Copy,
} from 'lucide-react';
import type { WordDocument, SaveStatus, VectorShape, BitmapImage, ActiveFormatting } from '../../../types/doc';
import {
  saveLocalDocument,
  saveAutoSaveDraft,
  getAutoSaveDraft,
  createNewDocument,
} from '../../../services/docService';
import { exportToDocx } from '../../../utils/docxExporter';
import { WordToolbar } from './WordToolbar';
import { InsertShapeModal } from './InsertShapeModal';
import { InsertImageModal } from './InsertImageModal';
import { InsertTableModal } from './InsertTableModal';
import { TableEditModal } from './TableEditModal';
import { FindReplaceModal } from './FindReplaceModal';
import { WordContextMenu } from './WordContextMenu';
import { WordRuler } from './WordRuler';
import { WordVerticalRuler } from './WordVerticalRuler';

interface WordEditorProps {
  initialDocument: WordDocument;
  onBackToHub: () => void;
}

// Convert rgb(r, g, b) to hex #rrggbb
const rgbToHex = (rgbStr: string): string => {
  if (!rgbStr) return '';
  if (rgbStr.startsWith('#')) return rgbStr;
  const match = rgbStr.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!match) return rgbStr;
  const hex = (x: string) => ('0' + parseInt(x, 10).toString(16)).slice(-2);
  return '#' + hex(match[1]) + hex(match[2]) + hex(match[3]);
};

export const WordEditor: React.FC<WordEditorProps> = ({ initialDocument, onBackToHub }) => {
  const [wordDoc, setWordDoc] = useState<WordDocument>(initialDocument);
  const [docTitle, setDocTitle] = useState<string>(initialDocument.title);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<string>('agora');
  const [showDraftRestoredBanner, setShowDraftRestoredBanner] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  // Multi-Page A4 state
  const initializePages = (): string[] => {
    if (initialDocument.pages && initialDocument.pages.length > 0) {
      return initialDocument.pages;
    }
    if (initialDocument.content && initialDocument.content.includes('a4-page-break')) {
      const parts = initialDocument.content.split(/<div[^>]*class="[^"]*a4-page-break[^"]*"[^>]*>[\s\S]*?<\/div>/gi);
      return parts.map((p) => p.trim()).filter((p) => p.length > 0);
    }
    return [initialDocument.content || '<p>Comece a digitar seu texto aqui...</p>'];
  };

  const [pages, setPages] = useState<string[]>(initializePages);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);

  // Modals state
  const [isShapeModalOpen, setIsShapeModalOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [isTableEditOpen, setIsTableEditOpen] = useState(false);
  const [isFindReplaceOpen, setIsFindReplaceOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<HTMLTableElement | null>(null);

  // Margins state
  const [leftMarginCm, setLeftMarginCm] = useState(initialDocument.leftMarginCm ?? 2.5);
  const [rightMarginCm, setRightMarginCm] = useState(initialDocument.rightMarginCm ?? 2.5);
  const [topMarginCm, setTopMarginCm] = useState(initialDocument.topMarginCm ?? 2.5);
  const [bottomMarginCm, setBottomMarginCm] = useState(initialDocument.bottomMarginCm ?? 2.5);
  const [firstLineIndentCm, setFirstLineIndentCm] = useState(initialDocument.firstLineIndentCm ?? 0);
  const [watermarkText, setWatermarkText] = useState('');

  // Scope and selection state for Ruler & Paragraph formatting
  const [scopeMode, setScopeMode] = useState<'paragraph' | 'all'>('all');
  const [selectedBlockSummary, setSelectedBlockSummary] = useState<string>('');
  const [paragraphIndentCm, setParagraphIndentCm] = useState<number>(0);
  const [paragraphLeftMarginCm, setParagraphLeftMarginCm] = useState<number>(0);
  const [paragraphRightMarginCm, setParagraphRightMarginCm] = useState<number>(0);
  const [selectedBlockElements, setSelectedBlockElements] = useState<HTMLElement[]>([]);

  // Active Formatting state
  const [activeFormat, setActiveFormat] = useState<ActiveFormatting>({
    bold: false,
    italic: false,
    underline: false,
    strikeThrough: false,
    subscript: false,
    superscript: false,
    align: 'left',
    fontFamily: 'Calibri',
    fontSize: '3',
    textColor: '#000000',
    bgColor: '#fef08a',
    lineBgColor: '#e2e8f0',
    formatBlock: 'p',
    unorderedList: false,
    orderedList: false,
  });

  // Context Menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [contextTarget, setContextTarget] = useState<HTMLElement | null>(null);

  // Layout state
  const [paperTheme, setPaperTheme] = useState<'white' | 'sepia' | 'dark'>(initialDocument.paperTheme || 'white');
  const [paperMargin, setPaperMargin] = useState<'normal' | 'narrow' | 'wide'>(initialDocument.paperMargin || 'normal');

  // Stats state
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);

  const editorContainerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to parse dimension strings into cm numbers
  const parseDimensionCm = (dim?: string): number => {
    if (!dim) return 0;
    if (dim.endsWith('cm')) return parseFloat(dim) || 0;
    if (dim.endsWith('px')) return Math.round((parseFloat(dim) / 37.8) * 10) / 10 || 0;
    if (dim.endsWith('mm')) return Math.round((parseFloat(dim) / 10) * 10) / 10 || 0;
    return parseFloat(dim) || 0;
  };

  // Inspect active character/paragraph formatting
  const inspectActiveFormatting = useCallback(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    try {
      const isBold = document.queryCommandState('bold');
      const isItalic = document.queryCommandState('italic');
      const isUnderline = document.queryCommandState('underline');
      const isStrike = document.queryCommandState('strikeThrough');
      const isSub = document.queryCommandState('subscript');
      const isSup = document.queryCommandState('superscript');
      const isUnordered = document.queryCommandState('insertUnorderedList');
      const isOrdered = document.queryCommandState('insertOrderedList');

      let node: Node | null = sel.anchorNode;
      if (node && node.nodeType === Node.TEXT_NODE) {
        node = node.parentElement;
      }
      const el = node as HTMLElement | null;

      let fontFamily = 'Calibri';
      let fontSize = '3';
      let textColor = '#000000';
      let bgColor = '#fef08a';
      let lineBgColor = '#e2e8f0';
      let align: 'left' | 'center' | 'right' | 'justify' = 'left';
      let formatBlock = 'p';

      if (el) {
        const style = window.getComputedStyle(el);

        // Alignment
        const textAlign = style.textAlign || 'left';
        if (textAlign === 'center') align = 'center';
        else if (textAlign === 'right') align = 'right';
        else if (textAlign === 'justify') align = 'justify';
        else align = 'left';

        // Font family
        const ff = (style.fontFamily || '').toLowerCase();
        if (ff.includes('arial')) fontFamily = 'Arial';
        else if (ff.includes('times')) fontFamily = 'Times New Roman';
        else if (ff.includes('georgia')) fontFamily = 'Georgia';
        else if (ff.includes('courier')) fontFamily = 'Courier New';
        else if (ff.includes('trebuchet')) fontFamily = 'Trebuchet MS';
        else if (ff.includes('comic')) fontFamily = 'Comic Sans MS';
        else if (ff.includes('impact')) fontFamily = 'Impact';
        else fontFamily = 'Calibri';

        // Font size mapping (computed px to 1..7 standard values)
        const fsPx = parseFloat(style.fontSize) || 16;
        if (fsPx <= 11.5) fontSize = '1';
        else if (fsPx <= 14) fontSize = '2';
        else if (fsPx <= 17) fontSize = '3';
        else if (fsPx <= 21) fontSize = '4';
        else if (fsPx <= 28) fontSize = '5';
        else if (fsPx <= 40) fontSize = '6';
        else fontSize = '7';

        // Block tag
        const blockEl = el.closest('h1, h2, h3, blockquote, p, li') as HTMLElement | null;
        if (blockEl) {
          formatBlock = blockEl.tagName.toLowerCase();
          if (blockEl.style.backgroundColor) {
            lineBgColor = rgbToHex(blockEl.style.backgroundColor) || '#e2e8f0';
          }
        }

        // Text Color
        if (style.color) {
          textColor = rgbToHex(style.color) || '#000000';
        }
      }

      setActiveFormat({
        bold: isBold,
        italic: isItalic,
        underline: isUnderline,
        strikeThrough: isStrike,
        subscript: isSub,
        superscript: isSup,
        align,
        fontFamily,
        fontSize,
        textColor,
        bgColor,
        lineBgColor,
        formatBlock,
        unorderedList: isUnordered,
        orderedList: isOrdered,
      });
    } catch {
      // ignore
    }
  }, []);

  // Analyze selection for horizontal ruler indents
  const analyzeSelection = useCallback(() => {
    inspectActiveFormatting();

    const activeEl = pageRefs.current[activePageIndex];
    if (!activeEl) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !activeEl.contains(sel.anchorNode)) {
      setScopeMode('all');
      setSelectedBlockElements([]);
      setSelectedBlockSummary('');
      return;
    }

    const range = sel.getRangeAt(0);
    const selText = sel.toString().trim();
    const fullText = (activeEl.innerText || '').trim();
    if (fullText.length > 0 && selText.length >= fullText.length && selText === fullText) {
      setScopeMode('all');
      setSelectedBlockElements([]);
      setSelectedBlockSummary('Documento inteiro');
      return;
    }

    const allBlocks = Array.from(
      activeEl.querySelectorAll<HTMLElement>('p, h1, h2, h3, h4, h5, h6, blockquote, li')
    );

    let matched: HTMLElement[] = [];

    if (sel.isCollapsed) {
      const node = sel.anchorNode;
      const block = (node?.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node?.parentElement)?.closest<HTMLElement>(
        'p, h1, h2, h3, h4, h5, h6, blockquote, li'
      );
      if (block && activeEl.contains(block)) {
        matched = [block];
      }
    } else {
      matched = allBlocks.filter((block) => {
        try {
          return range.intersectsNode(block) || block.contains(range.startContainer) || block.contains(range.endContainer);
        } catch {
          return false;
        }
      });
    }

    if (matched.length > 0) {
      setScopeMode('paragraph');
      setSelectedBlockElements(matched);
      setSelectedBlockSummary(matched.length === 1 ? '1 linha/parágrafo' : `${matched.length} parágrafos`);

      const first = matched[0];
      setParagraphIndentCm(parseDimensionCm(first.style.textIndent));
      setParagraphLeftMarginCm(parseDimensionCm(first.style.marginLeft));
      setParagraphRightMarginCm(parseDimensionCm(first.style.marginRight));
    } else {
      setScopeMode('all');
      setSelectedBlockElements([]);
      setSelectedBlockSummary('');
    }
  }, [activePageIndex, inspectActiveFormatting]);

  // Listen to selection changes across document
  useEffect(() => {
    const handleGlobalSelection = () => {
      analyzeSelection();
    };
    document.addEventListener('selectionchange', handleGlobalSelection);
    return () => document.removeEventListener('selectionchange', handleGlobalSelection);
  }, [analyzeSelection]);

  // Update Word & Character counts
  const updateStats = useCallback(() => {
    let totalWords = 0;
    let totalChars = 0;
    pages.forEach((p) => {
      const tmp = document.createElement('div');
      tmp.innerHTML = p;
      const text = tmp.innerText || '';
      if (text.trim()) {
        totalWords += text.trim().split(/\s+/).length;
      }
      totalChars += text.length;
    });
    setWordCount(totalWords);
    setCharCount(totalChars);
  }, [pages]);

  // Initialize editor content & check auto-save draft
  useEffect(() => {
    const draft = getAutoSaveDraft(initialDocument.id);
    if (draft && draft.content && draft.content !== initialDocument.content) {
      setDocTitle(draft.title);
      setShowDraftRestoredBanner(true);
      setSaveStatus('draft_restored');
    }
    updateStats();
  }, [initialDocument.id, initialDocument.content, updateStats]);

  // Handle content change & auto-save trigger
  const handleContentInput = () => {
    // Read current HTML from all page divs
    const updatedPages = pageRefs.current.map((ref, idx) => ref?.innerHTML || pages[idx] || '<p><br></p>');
    setPages(updatedPages);
    setHasUnsavedChanges(true);
    setSaveStatus('unsaved');
    updateStats();

    // Debounced local auto-save every 3 seconds
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      setSaveStatus('saving');
      const combinedHtml = updatedPages.join('<div class="a4-page-break" style="break-before: page; page-break-before: always;"></div>');
      saveAutoSaveDraft(wordDoc.id, combinedHtml, docTitle);

      setTimeout(() => {
        setSaveStatus('saved');
        setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        setHasUnsavedChanges(false);
      }, 500);
    }, 3000);
  };

  // Add a new physical A4 Page
  const handleAddPage = () => {
    setPages((prev) => [...prev, '<p><br></p>']);
    setHasUnsavedChanges(true);
    setSaveStatus('unsaved');
    setTimeout(() => {
      const newIndex = pages.length;
      setActivePageIndex(newIndex);
      const newPageRef = pageRefs.current[newIndex];
      if (newPageRef) {
        newPageRef.focus();
      }
    }, 50);
  };

  // Delete a physical A4 Page
  const handleDeletePage = (indexToDelete?: number) => {
    const targetIdx = indexToDelete !== undefined ? indexToDelete : activePageIndex;
    if (pages.length <= 1) return;
    setPages((prev) => prev.filter((_, i) => i !== targetIdx));
    setActivePageIndex((prev) => Math.max(0, Math.min(prev, pages.length - 2)));
    setHasUnsavedChanges(true);
    setSaveStatus('unsaved');
  };

  // Duplicate page
  const handleDuplicatePage = (indexToDup: number) => {
    setPages((prev) => {
      const copy = [...prev];
      copy.splice(indexToDup + 1, 0, copy[indexToDup]);
      return copy;
    });
    setHasUnsavedChanges(true);
    setSaveStatus('unsaved');
  };

  // Handle Context Menu Right-Click
  const handleContextMenu = (e: React.MouseEvent, pageIdx: number) => {
    e.preventDefault();
    setActivePageIndex(pageIdx);
    const target = e.target as HTMLElement;
    setContextTarget(target);
    setContextMenu({ x: e.clientX, y: e.clientY });

    const table = target.closest('table');
    if (table) {
      setSelectedTable(table as HTMLTableElement);
    }
  };

  // Close context menu on click anywhere
  useEffect(() => {
    const handleGlobalClick = () => {
      if (contextMenu) setContextMenu(null);
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, [contextMenu]);

  // Insert Footnote
  const handleInsertFootnote = () => {
    const activeRef = pageRefs.current[activePageIndex];
    if (!activeRef) return;
    activeRef.focus();

    const footnoteCount = (editorContainerRef.current?.querySelectorAll('.footnote-ref').length || 0) + 1;
    const refHtml = `<sup class="footnote-ref text-blue-600 font-bold font-mono px-0.5 cursor-pointer" title="Nota de Rodapé ${footnoteCount}">[${footnoteCount}]</sup>`;
    window.document.execCommand('insertHTML', false, refHtml);

    let footnoteSection = activeRef.querySelector('.footnote-section');
    if (!footnoteSection) {
      const sectionHtml = `<div class="footnote-section border-t border-slate-300 dark:border-slate-700 mt-12 pt-4 text-xs text-slate-500 font-sans" contenteditable="true"><p><strong>Notas de Rodapé:</strong></p></div>`;
      activeRef.insertAdjacentHTML('beforeend', sectionHtml);
      footnoteSection = activeRef.querySelector('.footnote-section');
    }

    if (footnoteSection) {
      const fnItemHtml = `<p><sup>[${footnoteCount}]</sup> Digite aqui o texto explicativo da nota de rodapé ${footnoteCount}...</p>`;
      footnoteSection.insertAdjacentHTML('beforeend', fnItemHtml);
    }

    handleContentInput();
  };

  // Modify Table Actions
  const handleModifyTable = (
    action: 'addRowAbove' | 'addRowBelow' | 'addColLeft' | 'addColRight' | 'deleteRow' | 'deleteCol' | 'deleteTable'
  ) => {
    if (!contextTarget) return;
    const cell = contextTarget.closest('td, th') as HTMLTableCellElement | null;
    const row = contextTarget.closest('tr') as HTMLTableRowElement | null;
    const table = contextTarget.closest('table') as HTMLTableElement | null;

    if (!table) return;

    if (action === 'deleteTable') {
      table.remove();
    } else if (action === 'addRowAbove' && row) {
      const newRow = table.insertRow(row.rowIndex);
      for (let i = 0; i < row.cells.length; i++) {
        const c = newRow.insertCell(i);
        c.innerHTML = 'Nova Célula';
        c.style.padding = '8px';
        c.style.border = '1px solid #cbd5e1';
      }
    } else if (action === 'addRowBelow' && row) {
      const newRow = table.insertRow(row.rowIndex + 1);
      for (let i = 0; i < row.cells.length; i++) {
        const c = newRow.insertCell(i);
        c.innerHTML = 'Nova Célula';
        c.style.padding = '8px';
        c.style.border = '1px solid #cbd5e1';
      }
    } else if (action === 'addColLeft' && cell) {
      const colIndex = cell.cellIndex;
      for (let r = 0; r < table.rows.length; r++) {
        const c = table.rows[r].insertCell(colIndex);
        c.innerHTML = 'Nova Célula';
        c.style.padding = '8px';
        c.style.border = '1px solid #cbd5e1';
      }
    } else if (action === 'addColRight' && cell) {
      const colIndex = cell.cellIndex + 1;
      for (let r = 0; r < table.rows.length; r++) {
        const c = table.rows[r].insertCell(colIndex);
        c.innerHTML = 'Nova Célula';
        c.style.padding = '8px';
        c.style.border = '1px solid #cbd5e1';
      }
    } else if (action === 'deleteRow' && row) {
      row.remove();
    }

    handleContentInput();
  };

  // Change Cell Background
  const handleChangeCellBg = (color: string) => {
    if (!contextTarget) return;
    const cell = contextTarget.closest('td, th') as HTMLElement | null;
    if (cell) {
      cell.style.backgroundColor = color;
      handleContentInput();
    }
  };

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'Você tem alterações não salvas no documento!';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Execute formatting command
  const handleExecCommand = (command: string, value?: string) => {
    const activeRef = pageRefs.current[activePageIndex];
    if (activeRef) {
      activeRef.focus();
    }
    window.document.execCommand(command, false, value);
    handleContentInput();
    inspectActiveFormatting();
  };

  // Save document explicitly
  const handleSaveToBackend = () => {
    setSaveStatus('saving');
    const updatedPages = pageRefs.current.map((ref, idx) => ref?.innerHTML || pages[idx] || '');
    const combinedContent = updatedPages.join('<div class="a4-page-break" style="break-before: page; page-break-before: always;"></div>');

    const updatedDoc: WordDocument = {
      ...wordDoc,
      title: docTitle.trim() || 'Documento Sem Título',
      content: combinedContent,
      pages: updatedPages,
      paperTheme,
      paperMargin,
      leftMarginCm,
      rightMarginCm,
      topMarginCm,
      bottomMarginCm,
      firstLineIndentCm,
      updatedAt: new Date().toISOString(),
    };

    saveLocalDocument(updatedDoc);
    saveAutoSaveDraft(updatedDoc.id, updatedDoc.content, updatedDoc.title);
    setWordDoc(updatedDoc);

    setTimeout(() => {
      setSaveStatus('saved');
      setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setHasUnsavedChanges(false);
    }, 400);
  };

  // Export to .docx file
  const handleExportDocx = async () => {
    const updatedPages = pageRefs.current.map((ref, idx) => ref?.innerHTML || pages[idx] || '');
    const combinedContent = updatedPages.join('<div class="a4-page-break" style="break-before: page; page-break-before: always;"></div>');
    const currentDoc: WordDocument = {
      ...wordDoc,
      title: docTitle,
      content: combinedContent,
      pages: updatedPages,
    };
    await exportToDocx(currentDoc);
  };

  // Insert Vector Shape
  const handleInsertShape = (shape: VectorShape) => {
    const activeRef = pageRefs.current[activePageIndex];
    if (!activeRef) return;
    activeRef.focus();

    let svgPath = '';
    if (shape.type === 'rectangle' || shape.type === 'rounded-rectangle') {
      const rx = shape.type === 'rounded-rectangle' ? 12 : 0;
      svgPath = `<rect x="2" y="2" width="${shape.width - 4}" height="${shape.height - 4}" rx="${rx}" fill="${shape.fillColor}" stroke="${shape.borderColor}" stroke-width="${shape.borderWidth}"/>`;
    } else if (shape.type === 'circle') {
      const cx = shape.width / 2;
      const cy = shape.height / 2;
      const rx = (shape.width - 4) / 2;
      const ry = (shape.height - 4) / 2;
      svgPath = `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${shape.fillColor}" stroke="${shape.borderColor}" stroke-width="${shape.borderWidth}"/>`;
    } else if (shape.type === 'triangle') {
      const p1 = `${shape.width / 2},2`;
      const p2 = `${shape.width - 2},${shape.height - 2}`;
      const p3 = `2,${shape.height - 2}`;
      svgPath = `<polygon points="${p1} ${p2} ${p3}" fill="${shape.fillColor}" stroke="${shape.borderColor}" stroke-width="${shape.borderWidth}"/>`;
    } else if (shape.type === 'arrow-right') {
      svgPath = `<path d="M2 ${shape.height * 0.35} H${shape.width * 0.6} V${shape.height * 0.15} L${shape.width - 2} ${shape.height / 2} L${shape.width * 0.6} ${shape.height * 0.85} V${shape.height * 0.65} H2 Z" fill="${shape.fillColor}" stroke="${shape.borderColor}" stroke-width="${shape.borderWidth}"/>`;
    } else if (shape.type === 'star') {
      svgPath = `<path d="M ${shape.width/2} 2 L ${shape.width*0.62} ${shape.height*0.35} L ${shape.width-2} ${shape.height*0.35} L ${shape.width*0.7} ${shape.height*0.6} L ${shape.width*0.82} ${shape.height-2} L ${shape.width/2} ${shape.height*0.75} L ${shape.width*0.18} ${shape.height-2} L ${shape.width*0.3} ${shape.height*0.6} L 2 ${shape.height*0.35} L ${shape.width*0.38} ${shape.height*0.35} Z" fill="${shape.fillColor}" stroke="${shape.borderColor}" stroke-width="${shape.borderWidth}"/>`;
    } else {
      svgPath = `<rect x="2" y="2" width="${shape.width - 4}" height="${shape.height - 4}" fill="${shape.fillColor}" stroke="${shape.borderColor}" stroke-width="${shape.borderWidth}"/>`;
    }

    const labelHtml = shape.label ? `<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-size="13" font-weight="bold">${shape.label}</text>` : '';
    const alignClass = shape.align === 'center' ? 'margin: 16px auto;' : shape.align === 'right' ? 'margin: 16px 0 16px auto;' : 'margin: 16px auto 16px 0;';

    const shapeHtml = `
      <div contenteditable="false" style="text-align: ${shape.align}; ${alignClass} width: ${shape.width}px; user-select: none; display: block;" class="my-3">
        <svg width="${shape.width}" height="${shape.height}" viewBox="0 0 ${shape.width} ${shape.height}" style="display: block;">
          ${svgPath}
          ${labelHtml}
        </svg>
      </div>
      <p><br></p>
    `;

    window.document.execCommand('insertHTML', false, shapeHtml);
    handleContentInput();
  };

  // Insert Bitmap Image
  const handleInsertImage = (img: BitmapImage) => {
    const activeRef = pageRefs.current[activePageIndex];
    if (!activeRef) return;
    activeRef.focus();

    const alignStyle = img.align === 'center' ? 'text-align: center;' : img.align === 'right' ? 'text-align: right;' : 'text-align: left;';
    const captionHtml = img.caption ? `<div style="font-size: 11px; color: #64748b; margin-top: 4px; font-style: italic;">${img.caption}</div>` : '';

    const imgHtml = `
      <div contenteditable="false" style="${alignStyle} margin: 16px 0;" class="my-4">
        <img src="${img.src}" alt="${img.alt}" style="max-width: 100%; width: ${img.width}px; height: auto; border-radius: 8px; display: inline-block; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />
        ${captionHtml}
      </div>
      <p><br></p>
    `;

    window.document.execCommand('insertHTML', false, imgHtml);
    handleContentInput();
  };

  // Insert Table HTML
  const handleInsertTableHtml = (tableHtml: string) => {
    const activeRef = pageRefs.current[activePageIndex];
    if (!activeRef) return;
    activeRef.focus();
    window.document.execCommand('insertHTML', false, tableHtml);
    handleContentInput();
  };

  // Ruler margin / indent change handlers
  const handleRulerLeftMargin = (valCm: number) => {
    if (scopeMode === 'paragraph' && selectedBlockElements.length > 0) {
      selectedBlockElements.forEach((el) => {
        el.style.marginLeft = valCm > 0 ? `${valCm}cm` : '';
      });
      setParagraphLeftMarginCm(valCm);
      handleContentInput();
    } else {
      setLeftMarginCm(valCm);
      handleContentInput();
    }
  };

  const handleRulerRightMargin = (valCm: number) => {
    if (scopeMode === 'paragraph' && selectedBlockElements.length > 0) {
      selectedBlockElements.forEach((el) => {
        el.style.marginRight = valCm > 0 ? `${valCm}cm` : '';
      });
      setParagraphRightMarginCm(valCm);
      handleContentInput();
    } else {
      setRightMarginCm(valCm);
      handleContentInput();
    }
  };

  const handleRulerFirstLineIndent = (valCm: number) => {
    if (scopeMode === 'paragraph' && selectedBlockElements.length > 0) {
      selectedBlockElements.forEach((el) => {
        el.style.textIndent = valCm !== 0 ? `${valCm}cm` : '';
      });
      setParagraphIndentCm(valCm);
      handleContentInput();
    } else {
      setFirstLineIndentCm(valCm);
      handleContentInput();
    }
  };

  const handleToggleScopeMode = () => {
    setScopeMode((prev) => (prev === 'paragraph' ? 'all' : 'paragraph'));
  };

  // Apply Full-Line / Paragraph Background Fill
  const handleApplyLineBackground = (color: string) => {
    const activeRef = pageRefs.current[activePageIndex];
    if (!activeRef) return;
    activeRef.focus();

    const sel = window.getSelection();
    let targetBlocks: HTMLElement[] = [];

    if (sel && sel.rangeCount > 0 && activeRef.contains(sel.anchorNode)) {
      const range = sel.getRangeAt(0);

      const commonAncestor = range.commonAncestorContainer;
      if (
        commonAncestor === activeRef ||
        (commonAncestor.nodeType === Node.TEXT_NODE && commonAncestor.parentElement === activeRef)
      ) {
        document.execCommand('formatBlock', false, '<p>');
      }

      const allBlocks = Array.from(
        activeRef.querySelectorAll<HTMLElement>('p, h1, h2, h3, h4, h5, h6, blockquote, li')
      );

      targetBlocks = allBlocks.filter((block) => {
        try {
          return range.intersectsNode(block) || block.contains(range.startContainer) || block.contains(range.endContainer);
        } catch {
          return false;
        }
      });

      if (targetBlocks.length === 0 && sel.anchorNode) {
        const block = (
          sel.anchorNode.nodeType === Node.ELEMENT_NODE ? (sel.anchorNode as HTMLElement) : sel.anchorNode.parentElement
        )?.closest<HTMLElement>('p, h1, h2, h3, h4, h5, h6, blockquote, li, td, th');
        if (block && activeRef.contains(block)) {
          targetBlocks = [block];
        }
      }
    }

    if (targetBlocks.length === 0) {
      document.execCommand('formatBlock', false, '<p>');
      const p = window.getSelection()?.anchorNode?.parentElement?.closest<HTMLElement>(
        'p, h1, h2, h3, h4, h5, h6, blockquote, li'
      );
      if (p && activeRef.contains(p)) {
        targetBlocks = [p];
      }
    }

    targetBlocks.forEach((block) => {
      if (!color || color === 'transparent') {
        block.style.backgroundColor = '';
        block.style.padding = '';
        block.style.borderRadius = '';
      } else {
        block.style.backgroundColor = color;
        block.style.padding = '4px 10px';
        block.style.borderRadius = '6px';
        block.style.display = 'block';
        block.style.boxDecorationBreak = 'clone';
        (block.style as any).webkitBoxDecorationBreak = 'clone';
      }
    });

    handleContentInput();
  };

  // Insert Special Symbol
  const handleInsertSymbol = (symbol: string) => {
    const activeRef = pageRefs.current[activePageIndex];
    if (!activeRef) return;
    activeRef.focus();
    window.document.execCommand('insertText', false, symbol);
    handleContentInput();
  };

  // Create brand new document
  const handleCreateNewDoc = () => {
    const newDoc = createNewDocument('Novo Documento Sem Título');
    setWordDoc(newDoc);
    setDocTitle(newDoc.title);
    setPages(['<p>Comece a digitar seu texto aqui...</p>']);
    setActivePageIndex(0);
    updateStats();
  };

  // Paper theme style
  const getPaperBgStyle = () => {
    if (paperTheme === 'sepia') return 'bg-[#fbf0d9] text-[#2c221e] shadow-lg border-[#e8d2b2]';
    if (paperTheme === 'dark') return 'bg-slate-900 text-slate-100 shadow-lg border-slate-800';
    return 'bg-white text-slate-900 shadow-xl border-slate-200/80 dark:border-slate-800';
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-200 dark:bg-slate-950 rounded-3xl border border-slate-300 dark:border-slate-800 overflow-hidden relative">
      {/* Sticky Fixed Toolbar & Controls Block */}
      <div className="shrink-0 z-30 bg-white dark:bg-slate-900 shadow-md border-b border-slate-200/80 dark:border-slate-800">
        {/* Top Header Bar */}
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
          {/* Left: Back button & Title input */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onBackToHub}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              title="Voltar para Suíte de Apps"
            >
              <ArrowLeft size={18} />
            </button>

            <div className="p-2 bg-blue-600 text-white rounded-xl shadow-2xs shrink-0">
              <FileText size={18} />
            </div>

            <div className="flex-1 min-w-0">
              <input
                type="text"
                value={docTitle}
                onChange={(e) => {
                  setDocTitle(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                placeholder="Nome do Documento..."
                className="text-base font-extrabold text-slate-900 dark:text-white bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 px-2 py-0.5 rounded-lg border border-transparent focus:border-blue-500 transition-colors w-full truncate"
              />
              <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 px-2">
                <span>Word App</span>
                <span>•</span>
                <span>{pages.length} {pages.length === 1 ? 'página' : 'páginas'} A4</span>
                <span>•</span>
                {/* Auto-Save status badge */}
                <span className="flex items-center gap-1 font-semibold">
                  {saveStatus === 'saved' && (
                    <>
                      <CheckCircle2 size={12} className="text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400">Salvo localmente ({lastSavedTime})</span>
                    </>
                  )}
                  {saveStatus === 'saving' && (
                    <>
                      <Clock size={12} className="text-blue-500 animate-spin" />
                      <span className="text-blue-600 dark:text-blue-400">Salvando rascunho...</span>
                    </>
                  )}
                  {saveStatus === 'unsaved' && (
                    <>
                      <AlertCircle size={12} className="text-amber-500" />
                      <span className="text-amber-600 dark:text-amber-400">Alterações pendentes</span>
                    </>
                  )}
                  {saveStatus === 'draft_restored' && (
                    <>
                      <Sparkles size={12} className="text-purple-500" />
                      <span className="text-purple-600 dark:text-purple-400">Rascunho restaurado!</span>
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Quick actions */}
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleCreateNewDoc}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              title="Novo Documento"
            >
              <FilePlus size={15} />
              <span className="hidden md:inline">Novo</span>
            </button>

            <button
              type="button"
              onClick={handleSaveToBackend}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-2xs transition-colors cursor-pointer"
              title="Salvar no Servidor e Local"
            >
              <Save size={15} />
              <span>Salvar</span>
            </button>

            <button
              type="button"
              onClick={handleExportDocx}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 shadow-2xs transition-colors cursor-pointer"
              title="Baixar arquivo no formato .docx"
            >
              <Download size={15} />
              <span>Baixar .docx</span>
            </button>
          </div>
        </header>

        {/* Ribbon Formatting Toolbar */}
        <WordToolbar
          onExecCommand={handleExecCommand}
          onApplyLineBackground={handleApplyLineBackground}
          onOpenInsertShape={() => setIsShapeModalOpen(true)}
          onOpenInsertImage={() => setIsImageModalOpen(true)}
          onOpenInsertTable={() => setIsTableModalOpen(true)}
          onAddPage={handleAddPage}
          onDeletePage={pages.length > 1 ? () => handleDeletePage(activePageIndex) : undefined}
          currentPageNumber={activePageIndex + 1}
          totalPages={pages.length}
          onInsertSymbol={handleInsertSymbol}
          onOpenFindReplace={() => setIsFindReplaceOpen(true)}
          onInsertFootnote={handleInsertFootnote}
          watermarkText={watermarkText}
          onChangeWatermark={setWatermarkText}
          paperTheme={paperTheme}
          onChangePaperTheme={setPaperTheme}
          paperMargin={paperMargin}
          onChangePaperMargin={setPaperMargin}
          leftMarginCm={scopeMode === 'paragraph' ? paragraphLeftMarginCm : leftMarginCm}
          rightMarginCm={scopeMode === 'paragraph' ? paragraphRightMarginCm : rightMarginCm}
          topMarginCm={topMarginCm}
          bottomMarginCm={bottomMarginCm}
          firstLineIndentCm={scopeMode === 'paragraph' ? paragraphIndentCm : firstLineIndentCm}
          onChangeLeftMargin={handleRulerLeftMargin}
          onChangeRightMargin={handleRulerRightMargin}
          onChangeTopMargin={setTopMarginCm}
          onChangeBottomMargin={setBottomMarginCm}
          onChangeFirstLineIndent={handleRulerFirstLineIndent}
          scopeMode={scopeMode}
          targetSummary={selectedBlockSummary}
          onToggleScopeMode={handleToggleScopeMode}
          activeFormat={activeFormat}
        />

        {/* Top Horizontal Ruler */}
        <div className="flex justify-center bg-slate-100 dark:bg-slate-900 pl-6">
          <WordRuler
            leftMarginCm={scopeMode === 'paragraph' ? paragraphLeftMarginCm : leftMarginCm}
            rightMarginCm={scopeMode === 'paragraph' ? paragraphRightMarginCm : rightMarginCm}
            firstLineIndentCm={scopeMode === 'paragraph' ? paragraphIndentCm : firstLineIndentCm}
            onChangeLeftMargin={handleRulerLeftMargin}
            onChangeRightMargin={handleRulerRightMargin}
            onChangeFirstLineIndent={handleRulerFirstLineIndent}
            scopeMode={scopeMode}
            targetSummary={selectedBlockSummary}
            onToggleScopeMode={handleToggleScopeMode}
          />
        </div>

        {/* Restored Draft Banner Notice */}
        {showDraftRestoredBanner && (
          <div className="bg-purple-50 dark:bg-purple-950/80 border-b border-purple-200 dark:border-purple-800 px-4 py-2 flex items-center justify-between text-xs text-purple-900 dark:text-purple-200">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-purple-600 dark:text-purple-400" />
              <span>
                <strong>Proteção de Salvamento Local:</strong> Encontramos e restauramos um rascunho recente que não havia sido salvo antes de fechar o navegador!
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowDraftRestoredBanner(false)}
              className="font-bold underline hover:text-purple-700 cursor-pointer"
            >
              Entendido
            </button>
          </div>
        )}
      </div>

      {/* Main Canvas Container (Multi-Page A4 Physical View) */}
      <main
        ref={editorContainerRef}
        className="flex-1 overflow-y-auto p-4 sm:p-8 flex flex-col items-center gap-8 bg-slate-300/70 dark:bg-slate-950 relative selection:bg-blue-200 dark:selection:bg-blue-900"
      >
        {pages.map((pageHtml, pageIndex) => (
          <div
            key={pageIndex}
            className="flex items-start justify-center gap-1.5 relative w-full max-w-[210mm] min-h-[297mm] group/page"
            onClick={() => setActivePageIndex(pageIndex)}
          >
            {/* Left Vertical Ruler for this specific page */}
            <div className="sticky top-4 hidden md:block">
              <WordVerticalRuler
                topMarginCm={topMarginCm}
                bottomMarginCm={bottomMarginCm}
                onChangeTopMargin={setTopMarginCm}
                onChangeBottomMargin={setBottomMarginCm}
                paperHeightPx={1123}
              />
            </div>

            {/* A4 Sheet Box */}
            <div className="flex-1 flex flex-col items-center relative">
              {/* Floating Page Header Banner */}
              <div className="w-full flex items-center justify-between mb-1.5 px-2 text-[11px] text-slate-500 dark:text-slate-400 font-semibold select-none">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-200/90 dark:bg-slate-800 shadow-2xs border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200">
                  <span>📄 Folha A4 • Página {pageIndex + 1} de {pages.length}</span>
                </span>

                <div className="flex items-center gap-1 opacity-80 hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDuplicatePage(pageIndex);
                    }}
                    className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                    title="Duplicar esta página"
                  >
                    <Copy size={13} />
                  </button>
                  {pages.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePage(pageIndex);
                      }}
                      className="p-1 rounded-md hover:bg-red-100 dark:hover:bg-red-950/50 text-red-600 cursor-pointer"
                      title="Excluir esta página"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Physical A4 Sheet */}
              <div
                className={`w-full rounded-2xl border transition-all duration-200 relative overflow-hidden a4-page-sheet ${getPaperBgStyle()} ${activePageIndex === pageIndex ? 'ring-2 ring-blue-500/40 shadow-2xl' : 'shadow-md'}`}
                style={{
                  width: '210mm',
                  minHeight: '297mm',
                  paddingLeft: `${leftMarginCm}cm`,
                  paddingRight: `${rightMarginCm}cm`,
                  paddingTop: `${topMarginCm}cm`,
                  paddingBottom: `${bottomMarginCm}cm`,
                }}
              >
                {/* Watermark Overlay if active */}
                {watermarkText && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 opacity-15 rotate-[-35deg]">
                    <span className="text-6xl sm:text-7xl font-black tracking-widest text-slate-800 dark:text-slate-100 uppercase border-8 border-current px-8 py-4 rounded-3xl">
                      {watermarkText}
                    </span>
                  </div>
                )}

                {/* Page ContentEditable Area */}
                <div
                  ref={(el) => {
                    pageRefs.current[pageIndex] = el;
                    if (el && !el.innerHTML && pageHtml) {
                      el.innerHTML = pageHtml;
                    }
                  }}
                  contentEditable
                  suppressContentEditableWarning
                  onFocus={() => {
                    setActivePageIndex(pageIndex);
                    inspectActiveFormatting();
                  }}
                  onInput={handleContentInput}
                  onKeyUp={analyzeSelection}
                  onMouseUp={analyzeSelection}
                  onSelect={analyzeSelection}
                  onContextMenu={(e) => handleContextMenu(e, pageIndex)}
                  onDoubleClick={(e) => {
                    const table = (e.target as HTMLElement).closest('table');
                    if (table) {
                      setSelectedTable(table as HTMLTableElement);
                      setIsTableEditOpen(true);
                    }
                  }}
                  className="outline-hidden focus:outline-hidden min-h-[920px] prose dark:prose-invert max-w-none text-base leading-relaxed relative z-10 a4-page-content"
                  style={{
                    wordBreak: 'break-word',
                    textIndent: `${firstLineIndentCm}cm`,
                  }}
                  dangerouslySetInnerHTML={{ __html: pageHtml }}
                />
              </div>
            </div>
          </div>
        ))}

        {/* Bottom "+ Adicionar Página A4" Button */}
        <div className="w-full max-w-[210mm] flex justify-center py-4 select-none">
          <button
            type="button"
            onClick={handleAddPage}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white dark:bg-slate-900 border-2 border-dashed border-blue-400 dark:border-blue-600 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:border-blue-600 font-extrabold text-sm shadow-md transition-all cursor-pointer hover:scale-105"
            title="Adicionar uma nova folha A4 no final do documento"
          >
            <Plus size={18} />
            <span>Adicionar Nova Página A4</span>
          </button>
        </div>
      </main>

      {/* Bottom Status Bar */}
      <footer className="shrink-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-4 py-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-4">
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {wordCount} palavras
          </span>
          <span>•</span>
          <span>{charCount} caracteres</span>
          <span>•</span>
          <span className="font-bold text-blue-600 dark:text-blue-400">
            Página {activePageIndex + 1} de {pages.length}
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px]">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Salvamento automático local ativo</span>
        </div>
      </footer>

      {/* Context Menu on Right Click */}
      {contextMenu && (
        <WordContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onExecCommand={handleExecCommand}
          onApplyLineBackground={handleApplyLineBackground}
          onRemovePageBreak={() => handleDeletePage(activePageIndex)}
          onRemoveAllPageBreaks={() => setPages(['<p><br></p>'])}
          hasPageBreaks={pages.length > 1}
          targetElement={contextTarget}
          onOpenTableModal={() => setIsTableEditOpen(true)}
          onOpenFindReplace={() => setIsFindReplaceOpen(true)}
          onInsertFootnote={handleInsertFootnote}
          onChangeCellBg={handleChangeCellBg}
          onModifyTable={handleModifyTable}
        />
      )}

      {/* Advanced Table Editor Modal */}
      <TableEditModal
        isOpen={isTableEditOpen}
        onClose={() => setIsTableEditOpen(false)}
        targetTable={selectedTable}
        onContentChange={handleContentInput}
      />

      {/* Find & Replace Modal */}
      <FindReplaceModal
        isOpen={isFindReplaceOpen}
        onClose={() => setIsFindReplaceOpen(false)}
        editorRef={{ current: pageRefs.current[activePageIndex] }}
        onContentChange={handleContentInput}
      />

      <InsertShapeModal
        isOpen={isShapeModalOpen}
        onClose={() => setIsShapeModalOpen(false)}
        onInsert={handleInsertShape}
      />

      <InsertImageModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        onInsert={handleInsertImage}
      />

      <InsertTableModal
        isOpen={isTableModalOpen}
        onClose={() => setIsTableModalOpen(false)}
        onInsertHtml={handleInsertTableHtml}
      />
    </div>
  );
};
