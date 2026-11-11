import './editor-fonts.css';
import './word-workspace.css';
import { createPortal } from 'react-dom';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FileText,
  Save,
  ArrowLeft,
  Sparkles,
  Plus,
  Trash2,
  Copy,
  Search, Undo2, Redo2, MessageSquare, Share2, X,
} from 'lucide-react';
import type { WordDocument, SaveStatus, VectorShape, BitmapImage, ActiveFormatting } from '../../../types/doc';
import {
  saveLocalDocument,
  saveAutoSaveDraft,
  getAutoSaveDraft,
  createNewDocument,
} from '../../../services/docService';
import { createDocxBlob, exportToDocx } from '../../../utils/docxExporter';
import { WordToolbar } from './WordToolbar';
import { InsertShapeModal } from './InsertShapeModal';
import { InsertImageModal } from './InsertImageModal';
import { InsertTableModal } from './InsertTableModal';
import { WordTableRibbon, type TableDrawMode } from './WordTableRibbon';
import { WordTableSelection } from './WordTableSelection';
import { runTableCommand, type TableCommand } from '../../../utils/wordTableCommands';
import { FindReplaceModal } from './FindReplaceModal';
import { WordContextMenu } from './WordContextMenu';
import { WordViewportRulers } from './WordViewportRulers';
import { WordInkPad, WordPanels, type WordPanel } from './WordPanels';
import { cleanWordHtml, escapeWordText, importWordFile } from '../../../utils/wordImport';
import { deleteTableContent, insertTableRow, rectangularCells, tableMap, type TableCell } from '../../../utils/wordTable';
import { useWordTableResize } from '../../../hooks/useWordTableResize';

interface WordEditorProps {
  initialDocument: WordDocument;
  onBackToHub: () => void;
}

const EMPTY_PAGE_HTML = '<p><br></p>';
const LEGACY_EDITOR_PROMPT_HTML = '<p>Comece a digitar seu texto aqui...</p>';

const hasNewerDraft = (doc: WordDocument, draft: ReturnType<typeof getAutoSaveDraft>): boolean => {
  if (!draft || Date.parse(draft.savedAt) <= Date.parse(doc.updatedAt)) return false;
  if (draft.content !== doc.content || draft.title !== doc.title) return true;
  const fields: (keyof WordDocument)[] = ['paperTheme', 'paperMargin', 'leftMarginCm', 'rightMarginCm', 'topMarginCm', 'bottomMarginCm', 'firstLineIndentCm', 'watermarkText', 'orientation', 'pageSize', 'comments', 'headerText', 'footerText', 'pageNumbers'];
  return Boolean(draft.document && fields.some(key => JSON.stringify(draft.document?.[key]) !== JSON.stringify(doc[key])));
};

const normalizePageHtml = (html?: string): string => {
  const trimmedHtml = html?.trim() || '';
  return trimmedHtml === LEGACY_EDITOR_PROMPT_HTML ? EMPTY_PAGE_HTML : trimmedHtml || EMPTY_PAGE_HTML;
};

const isPageEmpty = (html: string): boolean => {
  const textOnly = html
    .replace(/<br\s*\/?>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .trim();
  return textOnly.length === 0;
};

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
      return initialDocument.pages.map(normalizePageHtml);
    }
    if (initialDocument.content && initialDocument.content.includes('a4-page-break')) {
      const parts = initialDocument.content.split(/<div[^>]*class="[^"]*a4-page-break[^"]*"[^>]*>[\s\S]*?<\/div>/gi);
      const validParts = parts.map((part) => part.trim()).filter((part) => part.length > 0);
      return validParts.length > 0 ? validParts.map(normalizePageHtml) : [EMPTY_PAGE_HTML];
    }
    return [normalizePageHtml(initialDocument.content)];
  };

  const [pages, setPages] = useState<string[]>(initializePages);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [editingPageIndex, setEditingPageIndex] = useState<number | null>(null);

  // Modals state
  const [isShapeModalOpen, setIsShapeModalOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [tableTabRequest, setTableTabRequest] = useState(0);
  const [tableCells, setTableCells] = useState<TableCell[]>([]);
  const [tableGrid, setTableGrid] = useState(false);
  const [extendTableSelection, setExtendTableSelection] = useState(false);
  const [tableDrawMode, setTableDrawMode] = useState<TableDrawMode>('none');
  const tableDrawStart = useRef<{ cell: TableCell; x: number; y: number } | null>(null);
  const tableHistory = useRef<{ undo: { before: string[]; after: string[] }[]; redo: { before: string[]; after: string[] }[] }>({ undo: [], redo: [] });
  const [isFindReplaceOpen, setIsFindReplaceOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<HTMLTableElement | null>(null);
  const [activeTableCell, setActiveTableCell] = useState<TableCell | null>(null);

  // Margins state
  const [leftMarginCm, setLeftMarginCm] = useState(initialDocument.leftMarginCm ?? 2.5);
  const [rightMarginCm, setRightMarginCm] = useState(initialDocument.rightMarginCm ?? 2.5);
  const [topMarginCm, setTopMarginCm] = useState(initialDocument.topMarginCm ?? 2.5);
  const [bottomMarginCm, setBottomMarginCm] = useState(initialDocument.bottomMarginCm ?? 2.5);
  const [firstLineIndentCm, setFirstLineIndentCm] = useState(initialDocument.firstLineIndentCm ?? 0);
  const [watermarkText, setWatermarkText] = useState(initialDocument.watermarkText || '');
  const [comments, setComments] = useState<NonNullable<WordDocument['comments']>>(initialDocument.comments || []);
  const [headerText, setHeaderText] = useState(initialDocument.headerText || '');
  const [footerText, setFooterText] = useState(initialDocument.footerText || '');
  const [pageNumbers, setPageNumbers] = useState(initialDocument.pageNumbers || false);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(initialDocument.orientation || 'portrait');
  const [pageSize, setPageSize] = useState<'a4' | 'letter'>(initialDocument.pageSize || 'a4');
  const [zoom, setZoom] = useState(100);
  const [rulerVisible, setRulerVisible] = useState(true);
  const [marksVisible, setMarksVisible] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [autoSave, setAutoSave] = useState(true);
  const [panel, setPanel] = useState<WordPanel>(null);
  const [inkOpen, setInkOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [commandSearch, setCommandSearch] = useState('');
  const [dictating, setDictating] = useState(false);
  const recognitionRef = useRef<{ start: () => void; stop: () => void; onresult: ((event: any) => void) | null; onend: (() => void) | null; onerror: ((event: any) => void) | null; lang: string; continuous: boolean; interimResults: boolean } | null>(null);
  const inputFileRef = useRef<HTMLInputElement>(null);
  const selectionRef = useRef<Range | null>(null);
  const formatPainterRef = useRef<ActiveFormatting | null>(null);
  const initializedSave = useRef(false);
  const latestDocument = useRef<() => WordDocument>(() => initialDocument);
  const canDictate = typeof window !== 'undefined' && Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  const portraitWidth = pageSize === 'a4' ? 21 : 21.59;
  const portraitHeight = pageSize === 'a4' ? 29.7 : 27.94;
  const pageWidthCm = orientation === 'portrait' ? portraitWidth : portraitHeight;
  const pageHeightCm = orientation === 'portrait' ? portraitHeight : portraitWidth;

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
    fontFamily: 'Calibri, sans-serif',
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

      let fontFamily = 'Calibri, sans-serif';
      let fontSize = '3';
      let textColor = '#000000';
      let bgColor = '#fef08a';
      let lineBgColor = '#e2e8f0';
      let align: 'left' | 'center' | 'right' | 'justify' = 'left';
      let formatBlock = 'p';

      if (el) {
        const style = window.getComputedStyle(el);
        fontFamily = style.fontFamily || fontFamily;

        // Alignment
        const textAlign = style.textAlign || 'left';
        if (textAlign === 'center') align = 'center';
        else if (textAlign === 'right') align = 'right';
        else if (textAlign === 'justify') align = 'justify';
        else align = 'left';

        // Font family
        const ff = (style.fontFamily || '').toLowerCase();
        if (ff.includes('arial')) fontFamily = 'Arial, sans-serif';
        else if (ff.includes('times')) fontFamily = 'Times New Roman, serif';
        else if (ff.includes('georgia')) fontFamily = 'Georgia, serif';
        else if (ff.includes('courier')) fontFamily = 'Courier New, monospace';
        else if (ff.includes('trebuchet')) fontFamily = 'Trebuchet MS, sans-serif';
        else if (ff.includes('comic')) fontFamily = 'Comic Sans MS, cursive';
        else if (ff.includes('impact')) fontFamily = 'Impact, sans-serif';
        else if (ff.includes('montserrat')) fontFamily = "'Montserrat', sans-serif";
        else if (ff.includes('bebas neue')) fontFamily = "'Bebas Neue', sans-serif";
        else if (ff.includes('playfair display')) fontFamily = "'Playfair Display', serif";
        else if (ff.includes('pacifico')) fontFamily = "'Pacifico', cursive";
        else if (ff.includes('dancing script')) fontFamily = "'Dancing Script', cursive";
        else if (ff.includes('lobster')) fontFamily = "'Lobster', cursive";
        else if (ff.includes('oswald')) fontFamily = "'Oswald', sans-serif";
        else if (ff.includes('raleway')) fontFamily = "'Raleway', sans-serif";
        else if (ff.includes('poppins')) fontFamily = "'Poppins', sans-serif";
        else if (ff.includes('roboto slab')) fontFamily = "'Roboto Slab', serif";
        else if (ff.includes('merriweather')) fontFamily = "'Merriweather', serif";
        else if (ff.includes('abril fatface')) fontFamily = "'Abril Fatface', serif";
        else if (ff.includes('caveat')) fontFamily = "'Caveat', cursive";
        else if (ff.includes('space grotesk')) fontFamily = "'Space Grotesk', sans-serif";
        else if (ff.includes('dm mono')) fontFamily = "'DM Mono', monospace";
        else if (ff.includes('cinzel')) fontFamily = "'Cinzel', serif";
        else if (ff.includes('lora')) fontFamily = "'Lora', serif";

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
        fontSizePt: el ? parseFloat(getComputedStyle(el).fontSize) * .75 : 12,
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

  // Keep a selection bookmark when focus moves into ribbon controls or dialogs.
  useEffect(() => {
    const capture = () => {
      if (document.activeElement?.closest('.word-ribbon, .word-popover, .word-context-menu')) return;
      const selection = window.getSelection();
      if (!selection?.rangeCount) return;
      const range = selection.getRangeAt(0);
      if (pageRefs.current.some(page => page?.contains(range.commonAncestorContainer))) {
        selectionRef.current = range.cloneRange();
        const node = range.startContainer;
        const element = node instanceof Element ? node : node?.parentElement;
        const cell = element?.closest<HTMLTableCellElement>('td,th') || null;
        setActiveTableCell(cell);
        if (cell) {
          const table = cell.closest('table')!;
          const end = (range.endContainer instanceof Element ? range.endContainer : range.endContainer.parentElement)?.closest<HTMLTableCellElement>('td,th');
          const cells = end?.closest('table') === table ? rectangularCells(table, cell, end) : [cell];
          setSelectedTable(table); setTableCells(previous => previous.length === cells.length && previous.every((c,i) => c === cells[i]) ? previous : cells);
        } else { setTableCells([]); setTableDrawMode('none'); }
      }
    };
    document.addEventListener('selectionchange', capture);
    return () => document.removeEventListener('selectionchange', capture);
  }, []);

  const restoreSelection = () => {
    const page = pageRefs.current[activePageIndex];
    if (!page) return;
    page.focus();
    const selection = window.getSelection();
    if (!selection) return;
    const saved = selectionRef.current;
    if (saved && page.contains(saved.commonAncestorContainer)) {
      selection.removeAllRanges(); selection.addRange(saved.cloneRange());
    } else if (!selection.rangeCount || !page.contains(selection.anchorNode)) {
      const range = document.createRange(); range.selectNodeContents(page); range.collapse(false);
      selection.removeAllRanges(); selection.addRange(range);
    }
  };

  const updateStats = useCallback(() => {
    const text = pages.map(html => new DOMParser().parseFromString(html, 'text/html').body.textContent || '').join(' ');
    setWordCount(text.trim().split(/\s+/).filter(Boolean).length); setCharCount(text.length);
  }, [pages]);
  useEffect(updateStats, [updateStats]);

  latestDocument.current = () => {
    const currentPages = pages.map((html, index) => pageRefs.current[index]?.innerHTML || html);
    return { ...wordDoc, title: docTitle.trim() || 'Documento sem título', pages: currentPages,
      content: currentPages.join('<div class="a4-page-break" style="break-before:page"></div>'),
      paperTheme, paperMargin, leftMarginCm, rightMarginCm, topMarginCm, bottomMarginCm,
      firstLineIndentCm, watermarkText, comments, headerText, footerText, pageNumbers, orientation, pageSize, updatedAt: new Date().toISOString() };
  };

  function applyDocument(input: WordDocument) {
    const draft = getAutoSaveDraft(input.id);
    const recovered = hasNewerDraft(input, draft);
    const doc = recovered && draft ? draft.document || { ...input, title: draft.title, content: draft.content, pages: undefined } : input;
    initializedSave.current = recovered; selectionRef.current = null;
    setNotice(''); setShowDraftRestoredBanner(recovered); setScopeMode('all'); setSelectedBlockElements([]); setSelectedTable(null); setActiveTableCell(null); setTableCells([]); setTableDrawMode('none');
    tableHistory.current = { undo: [], redo: [] };
    setWordDoc(doc); setDocTitle(doc.title);
    const importedPages = doc.pages?.length ? doc.pages : doc.content.split(/<div[^>]*class="[^"]*a4-page-break[^"]*"[^>]*>[\s\S]*?<\/div>/gi);
    setPages(importedPages.map(normalizePageHtml)); setActivePageIndex(0);
    setLeftMarginCm(doc.leftMarginCm ?? 2.5); setRightMarginCm(doc.rightMarginCm ?? 2.5);
    setTopMarginCm(doc.topMarginCm ?? 2.5); setBottomMarginCm(doc.bottomMarginCm ?? 2.5);
    setFirstLineIndentCm(doc.firstLineIndentCm ?? 0); setWatermarkText(doc.watermarkText || '');
    setPaperTheme(doc.paperTheme || 'white'); setPaperMargin(doc.paperMargin || 'normal');
    setOrientation(doc.orientation || 'portrait'); setPageSize(doc.pageSize || 'a4'); setComments(doc.comments || []);
    setHeaderText(doc.headerText || ''); setFooterText(doc.footerText || ''); setPageNumbers(doc.pageNumbers || false);
    setHasUnsavedChanges(recovered); setSaveStatus(recovered ? 'draft_restored' : 'saved');
    requestAnimationFrame(() => {
      editorContainerRef.current?.scrollTo({ top: 0, left: 0 });
      const page = pageRefs.current[0];
      if (page) { page.focus({ preventScroll: true }); const range = document.createRange(); range.selectNodeContents(page); range.collapse(true); const selection = getSelection(); selection?.removeAllRanges(); selection?.addRange(range); selectionRef.current = range.cloneRange(); }
    });
  }

  useEffect(() => {
    const draft = getAutoSaveDraft(initialDocument.id);
    if (hasNewerDraft(initialDocument, draft)) {
      applyDocument(initialDocument);
    }
  // Restore only when opening a different document, never after each keystroke.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDocument.id]);

  useEffect(() => {
    if (!initializedSave.current) { initializedSave.current = true; return; }
    setHasUnsavedChanges(true); setSaveStatus('unsaved');
    if (!autoSave) return;
    const timer = window.setTimeout(() => {
      try {
        setSaveStatus('saving');
        const doc = latestDocument.current();
        saveAutoSaveDraft(doc.id, doc.content, doc.title, doc);
        const saved = saveLocalDocument(doc); setWordDoc(saved);
        setSaveStatus('saved'); setHasUnsavedChanges(false);
        setLastSavedTime(new Date().toLocaleTimeString('pt-BR'));
      } catch { setSaveStatus('error'); setNotice('Não foi possível salvar. Verifique o espaço do navegador ou baixe uma cópia do documento.'); }
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [pages, docTitle, paperTheme, paperMargin, leftMarginCm, rightMarginCm, topMarginCm, bottomMarginCm, firstLineIndentCm, watermarkText, comments, headerText, footerText, pageNumbers, orientation, pageSize, autoSave, wordDoc.id]);

  const handleContentInput = () => {
    const updatedPages = pages.map((html, index) => pageRefs.current[index]?.innerHTML || html);
    setPages(updatedPages); setHasUnsavedChanges(true); setSaveStatus('unsaved');
  };
  const tableResize = useWordTableResize(readOnly, handleContentInput);

  // Add a new physical A4 Page
  const handleAddPage = () => {
    if (readOnly) return;
    setPages((prev) => [...prev, EMPTY_PAGE_HTML]);
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

  const handlePageBreak = () => {
    if (readOnly) return;
    restoreSelection();
    const page = pageRefs.current[activePageIndex], selection = getSelection();
    if (!page || !selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (!page.contains(range.commonAncestorContainer)) return;
    range.deleteContents();
    const tail = document.createRange(); tail.selectNodeContents(page);
    tail.setStart(range.startContainer, range.startOffset);
    const holder = document.createElement('div'); holder.append(tail.extractContents());
    const next = pages.map((html, index) => pageRefs.current[index]?.innerHTML || html);
    next[activePageIndex] = normalizePageHtml(page.innerHTML);
    next.splice(activePageIndex + 1, 0, normalizePageHtml(holder.innerHTML));
    const newIndex = activePageIndex + 1;
    selectionRef.current = null; setPages(next); setActivePageIndex(newIndex); setHasUnsavedChanges(true);
    requestAnimationFrame(() => { const target = pageRefs.current[newIndex]; if (target) { target.focus(); const caret = document.createRange(); caret.selectNodeContents(target); caret.collapse(true); const current = getSelection(); current?.removeAllRanges(); current?.addRange(caret); selectionRef.current = caret.cloneRange(); } });
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
    if (e.shiftKey) return;
    e.preventDefault();
    setActivePageIndex(pageIdx);
    const target = e.target as HTMLElement;
    setContextTarget(target);
    setContextMenu({ x: e.clientX, y: e.clientY });

    const table = target.closest('table');
    if (table) {
      setSelectedTable(table as HTMLTableElement);
      const cell = target.closest<HTMLTableCellElement>('td,th');
      if (cell && !tableCells.includes(cell)) { setActiveTableCell(cell); setTableCells([cell]); }
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
    restoreSelection();

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
    if (readOnly) return;
    const cell = contextTarget?.closest<HTMLTableCellElement>('td,th') || activeTableCell;
    const table = cell?.closest('table') || selectedTable;
    if (!table?.isConnected) return;
    const actions = { addRowAbove: 'row-above', addRowBelow: 'row-below', addColLeft: 'col-left', addColRight: 'col-right', deleteRow: 'delete-row', deleteCol: 'delete-col', deleteTable: 'delete-table' };
    handleTableCommand({ action: actions[action] }, table, cell ? [cell] : tableCells);
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
    if (readOnly && !['copy', 'selectAll'].includes(command)) { setNotice('Desative o modo de leitura para editar.'); return; }
    if (command === 'undo' || command === 'redo') {
      const history = tableHistory.current, from = command === 'undo' ? history.undo : history.redo, to = command === 'undo' ? history.redo : history.undo;
      const item = from.at(-1), current = pages.map((html,index) => pageRefs.current[index]?.innerHTML || html);
      if (item && JSON.stringify(current) === JSON.stringify(command === 'undo' ? item.after : item.before)) {
        from.pop(); to.push(item); const next = command === 'undo' ? item.before : item.after;
        next.forEach((html,index) => { if (pageRefs.current[index]) pageRefs.current[index]!.innerHTML = html; });
        selectionRef.current = null; setPages([...next]); setTableCells([]); setActiveTableCell(null); setSelectedTable(null); setHasUnsavedChanges(true); setSaveStatus('unsaved'); return;
      }
    }
    const activeRef = pageRefs.current[activePageIndex];
    if (activeRef) {
      restoreSelection();
    }
    window.document.execCommand(command, false, value);
    handleContentInput();
    inspectActiveFormatting();
  };

  // Explicit save and export always include the current DOM and page layout.
  const handleSaveToBackend = () => {
    try {
      const doc = latestDocument.current();
      const saved = saveLocalDocument(doc); saveAutoSaveDraft(doc.id, doc.content, doc.title, doc);
      setWordDoc(saved); setSaveStatus('saved'); setHasUnsavedChanges(false);
      setLastSavedTime(new Date().toLocaleTimeString('pt-BR')); return true;
    } catch { setSaveStatus('error'); setNotice('Não foi possível salvar neste navegador. Baixe uma cópia do documento.'); return false; }
  };
  const handleExportDocx = async () => {
    try { await exportToDocx(latestDocument.current()); setNotice('Arquivo DOCX exportado.'); }
    catch { setNotice('Não foi possível exportar o DOCX. Tente novamente ou exporte como HTML.'); }
  };

  // Insert Vector Shape
  const handleInsertShape = (shape: VectorShape) => {
    const activeRef = pageRefs.current[activePageIndex];
    if (!activeRef) return;
    restoreSelection();

    const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] || char);
    const shapeMarkup = (attributes: string) => {
      if (shape.type === 'rectangle' || shape.type === 'rounded-rectangle') {
        return `<rect x="2" y="2" width="${shape.width - 4}" height="${shape.height - 4}" rx="${shape.type === 'rounded-rectangle' ? 12 : 0}" ${attributes}/>`;
      }
      if (shape.type === 'circle') {
        return `<ellipse cx="${shape.width / 2}" cy="${shape.height / 2}" rx="${(shape.width - 4) / 2}" ry="${(shape.height - 4) / 2}" ${attributes}/>`;
      }
      if (shape.type === 'triangle') {
        return `<polygon points="${shape.width / 2},2 ${shape.width - 2},${shape.height - 2} 2,${shape.height - 2}" ${attributes}/>`;
      }
      if (shape.type === 'arrow-right') {
        return `<path d="M2 ${shape.height * 0.35} H${shape.width * 0.6} V${shape.height * 0.15} L${shape.width - 2} ${shape.height / 2} L${shape.width * 0.6} ${shape.height * 0.85} V${shape.height * 0.65} H2 Z" ${attributes}/>`;
      }
      if (shape.type === 'arrow-left') {
        return `<path d="M${shape.width - 2} ${shape.height * 0.35} H${shape.width * 0.4} V${shape.height * 0.15} L2 ${shape.height / 2} L${shape.width * 0.4} ${shape.height * 0.85} V${shape.height * 0.65} H${shape.width - 2} Z" ${attributes}/>`;
      }
      if (shape.type === 'star') {
        return `<path d="M ${shape.width / 2} 2 L ${shape.width * 0.62} ${shape.height * 0.35} L ${shape.width - 2} ${shape.height * 0.35} L ${shape.width * 0.7} ${shape.height * 0.6} L ${shape.width * 0.82} ${shape.height - 2} L ${shape.width / 2} ${shape.height * 0.75} L ${shape.width * 0.18} ${shape.height - 2} L ${shape.width * 0.3} ${shape.height * 0.6} L 2 ${shape.height * 0.35} L ${shape.width * 0.38} ${shape.height * 0.35} Z" ${attributes}/>`;
      }
      if (shape.type === 'heart') {
        return `<path d="M ${shape.width / 2} ${shape.height - 3} C ${shape.width * 0.1} ${shape.height * 0.72}, 2 ${shape.height * 0.4}, ${shape.width * 0.2} ${shape.height * 0.16} C ${shape.width * 0.36} -2, ${shape.width / 2} ${shape.height * 0.15}, ${shape.width / 2} ${shape.height * 0.29} C ${shape.width / 2} ${shape.height * 0.15}, ${shape.width * 0.64} -2, ${shape.width * 0.8} ${shape.height * 0.16} C ${shape.width - 2} ${shape.height * 0.4}, ${shape.width * 0.9} ${shape.height * 0.72}, ${shape.width / 2} ${shape.height - 3} Z" ${attributes}/>`;
      }
      return `<line x1="2" y1="${shape.height / 2}" x2="${shape.width - 2}" y2="${shape.height / 2}" ${attributes}/>`;
    };

    const clipId = `shape-mask-${shape.id}`;
    const hasMaskImage = Boolean(shape.maskImageSrc) && shape.type !== 'line';
    const maskHtml = hasMaskImage
      ? `<defs><clipPath id="${clipId}">${shapeMarkup('fill="#000" stroke="none"')}</clipPath></defs><image href="${escapeHtml(shape.maskImageSrc || '')}" x="0" y="0" width="${shape.width}" height="${shape.height}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clipId})"/>`
      : '';
    const vectorHtml = shapeMarkup(`fill="${hasMaskImage ? 'transparent' : escapeHtml(shape.fillColor)}" stroke="${escapeHtml(shape.borderColor)}" stroke-width="${shape.borderWidth}"`);
    const labelHtml = shape.label ? `<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-size="13" font-weight="bold" pointer-events="none">${escapeHtml(shape.label)}</text>` : '';
    const alignClass = shape.align === 'center' ? 'margin: 16px auto;' : shape.align === 'right' ? 'margin: 16px 0 16px auto;' : 'margin: 16px auto 16px 0;';

    const shapeHtml = `
      <div data-word-draggable="true" contenteditable="false" style="text-align: ${shape.align}; ${alignClass} width: ${shape.width}px; user-select: none; display: block; cursor: grab; touch-action: none;" title="Arraste para mover o vetor">
        <svg width="${shape.width}" height="${shape.height}" viewBox="0 0 ${shape.width} ${shape.height}" style="display: block;">
          ${maskHtml}
          ${vectorHtml}
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
    restoreSelection();

    const alignStyle = img.align === 'center' ? 'text-align: center;' : img.align === 'right' ? 'text-align: right;' : 'text-align: left;';
    const captionHtml = img.caption ? `<div style="font-size: 11px; color: #64748b; margin-top: 4px; font-style: italic;">${escapeWordText(img.caption)}</div>` : '';

    const imgHtml = `
      <div contenteditable="false" style="${alignStyle} margin: 16px 0;" class="my-4">
        <img src="${escapeWordText(img.src)}" alt="${escapeWordText(img.alt)}" style="max-width: 100%; width: ${img.width}px; height: auto; border-radius: 8px; display: inline-block; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />
        ${captionHtml}
      </div>
      <p><br></p>
    `;

    window.document.execCommand('insertHTML', false, imgHtml);
    handleContentInput();
  };

  // Insert Table HTML
  const handleInsertTableHtml = (tableHtml: string) => {
    if (readOnly) return;
    const activeRef = pageRefs.current[activePageIndex];
    if (!activeRef) return;
    restoreSelection();
    window.document.execCommand('insertHTML', false, tableHtml);
    handleContentInput();
  };

  const selectTableCells = (cells: TableCell[]) => {
    if (!cells.length) return;
    setTableCells(cells); setActiveTableCell(cells[0]); setSelectedTable(cells[0].closest('table'));
    const range = document.createRange(); range.setStart(cells[0],0); range.setEnd(cells[cells.length-1],cells[cells.length-1].childNodes.length);
    const selection = getSelection(); selection?.removeAllRanges(); selection?.addRange(range); selectionRef.current = range.cloneRange();
  };
  const handleTableCommand = (command: TableCommand, table = selectedTable, selected = tableCells) => {
    if (readOnly || !table?.isConnected) return;
    try {
      const before = pages.map((html,index) => pageRefs.current[index]?.innerHTML || html);
      const cells = runTableCommand(table, selected.filter(c => c.isConnected), command);
      const after = pages.map((html,index) => pageRefs.current[index]?.innerHTML || html);
      if (JSON.stringify(before) !== JSON.stringify(after)) { tableHistory.current.undo.push({ before, after }); tableHistory.current.undo = tableHistory.current.undo.slice(-30); tableHistory.current.redo = []; }
      setSelectedTable(table.isConnected ? table : null);
      setTableCells(cells); setActiveTableCell(cells[0] || null);
      if (!cells.length) { setSelectedTable(null); setTableDrawMode('none'); }
      if (cells.length) { const range = document.createRange(); range.selectNodeContents(cells[0]); range.collapse(true); selectionRef.current = range; }
      handleContentInput(); setNotice('');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Não foi possível alterar a tabela.'); }
  };
  const handleSelectTable = (what: 'cell' | 'row' | 'col' | 'table' | 'extend') => {
    if (!selectedTable || !activeTableCell) return;
    if (what === 'extend') { setExtendTableSelection(v => !v); return; }
    const map = tableMap(selectedTable), p = map.positions.find(p => p.cell === activeTableCell); if (!p) return;
    selectTableCells(what === 'table' ? map.positions.map(p => p.cell) : what === 'row' ? [...new Set(map.grid[p.row])] : what === 'col' ? [...new Set(map.grid.map(row => row[p.col]).filter(Boolean))] : [activeTableCell]);
  };
  const handleTablePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const cell = (e.target as HTMLElement).closest<HTMLTableCellElement>('td,th'), table = cell?.closest('table');
    if (!readOnly && cell && table && (e.shiftKey || extendTableSelection) && activeTableCell?.closest('table') === table && tableDrawMode === 'none') {
      e.preventDefault(); selectTableCells(rectangularCells(table, activeTableCell, cell)); return;
    }
    if (readOnly || !cell || !table || tableDrawMode === 'none') { tableResize.onPointerDown(e); return; }
    e.preventDefault();
    if (tableDrawMode === 'draw') { tableDrawStart.current = { cell, x: e.clientX, y: e.clientY }; e.currentTarget.setPointerCapture(e.pointerId); return; }
    const map = tableMap(table), p = map.positions.find(p => p.cell === cell)!, box = cell.getBoundingClientRect();
    const edges = [{ distance: Math.abs(e.clientX-box.right), row: p.row, col: p.col+p.cols }, { distance: Math.abs(e.clientY-box.bottom), row: p.row+p.rows, col: p.col }, { distance: Math.abs(e.clientX-box.left), row: p.row, col: p.col-1 }, { distance: Math.abs(e.clientY-box.top), row: p.row-1, col: p.col }].sort((a,b) => a.distance-b.distance);
    const edge = edges.find(edge => edge.distance <= 12 && map.grid[edge.row]?.[edge.col] && map.grid[edge.row][edge.col] !== cell);
    if (!edge) { setNotice('Clique em uma divisória interna para mesclar as células com a borracha.'); return; }
    handleTableCommand({ action: 'merge' },table,rectangularCells(table,cell,map.grid[edge.row][edge.col]));
  };
  const handleTablePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const start = tableDrawStart.current; if (!start) return;
    tableDrawStart.current = null; if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    const dx = Math.abs(e.clientX-start.x), dy = Math.abs(e.clientY-start.y);
    if (Math.max(dx,dy) < 12) { setNotice('Arraste dentro da célula: na vertical para criar colunas ou na horizontal para criar linhas. Pressione Esc para sair.'); return; }
    handleTableCommand({ action: 'split', value: dx >= dy ? 2 : 1, extra: dx >= dy ? 1 : 2 },start.cell.closest('table'),[start.cell]);
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
    restoreSelection();

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
    restoreSelection();
    window.document.execCommand('insertText', false, symbol);
    handleContentInput();
  };

  const handleCreateNewDoc = () => {
    if (hasUnsavedChanges && !handleSaveToBackend()) return;
    try { applyDocument(createNewDocument('Documento sem título')); } catch { setNotice('Não foi possível criar o documento neste navegador.'); }
  };

  const downloadText = (extension: string, content: string, type: string) => {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement('a'); link.href = url;
    link.download = `${docTitle.replace(/[\\/:*?"<>|]/g, '').trim() || 'documento'}.${extension}`;
    document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const getBlocks = () => {
    restoreSelection();
    const page = pageRefs.current[activePageIndex]; const selection = window.getSelection();
    if (!page || !selection?.rangeCount) return [];
    const range = selection.getRangeAt(0);
    const node = selection.anchorNode?.nodeType === Node.ELEMENT_NODE ? selection.anchorNode as HTMLElement : selection.anchorNode?.parentElement;
    if (selection.isCollapsed) return [node?.closest<HTMLElement>('p,h1,h2,h3,h4,li,blockquote') || page];
    return [...page.querySelectorAll<HTMLElement>('p,h1,h2,h3,h4,li,blockquote')].filter(block => range.intersectsNode(block));
  };
  const handleMerge = (rows: Record<string, string>[]) => {
    try {
      const template = latestDocument.current();
      rows.forEach((row, index) => {
        const mergedPages = (template.pages || [template.content]).map(html => {
          const dom = new DOMParser().parseFromString(html, 'text/html');
          const walker = document.createTreeWalker(dom.body, NodeFilter.SHOW_TEXT); let node: Node | null;
          while ((node = walker.nextNode())) node.textContent = (node.textContent || '').replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (match, field) => Object.hasOwn(row, field) ? String(row[field]) : match);
          return dom.body.innerHTML;
        });
        saveLocalDocument({ ...template, id: `merge-${Date.now()}-${index}`, title: `${template.title} — ${String(row.nome || index + 1)}`, pages: mergedPages, content: mergedPages.join('<div class="a4-page-break"></div>') });
      });
      setNotice(`${rows.length} correspondência(s) criada(s). Abra em Arquivo → Abrir documentos.`);
    } catch { setNotice('Não foi possível gerar todas as correspondências. Verifique o espaço disponível no navegador.'); }
  };

  const handleAction = async (action: string, value?: string) => {
    try {
      if (action === 'new') { handleCreateNewDoc(); return; }
      if (action === 'save') { handleSaveToBackend(); return; }
      if (action === 'docx') { await handleExportDocx(); return; }
      if (action === 'share') {
        const file = new File([await createDocxBlob(latestDocument.current())], `${docTitle.replace(/[\\/:*?"<>|]/g, '') || 'documento'}.docx`, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        if (navigator.canShare?.({ files: [file] }) && navigator.share) { try { await navigator.share({ title: docTitle, files: [file] }); } catch (error) { if (!(error instanceof DOMException && error.name === 'AbortError')) setNotice('O compartilhamento não foi concluído. Use Arquivo → Baixar DOCX para enviar uma cópia.'); } }
        else { await handleExportDocx(); setNotice('Este navegador não oferece compartilhamento de arquivos. Uma cópia DOCX foi baixada para você enviar.'); }
        return;
      }
      if (action === 'open') { setPanel('open'); return; }
      if (action === 'import') { inputFileRef.current?.click(); return; }
      if (action === 'find') { setIsFindReplaceOpen(true); return; }
      if (['comments', 'review', 'help', 'source', 'merge'].includes(action)) { setPanel(action as WordPanel); return; }
      if (action === 'draw') { setInkOpen(true); return; }
      if (action === 'ruler') { setRulerVisible(v => !v); return; }
      if (action === 'marks') { setMarksVisible(v => !v); return; }
      if (action === 'focus') { setFocusMode(v => !v); return; }
      if (action === 'read-only') { setReadOnly(v => !v); return; }
      if (action === 'zoom') { setZoom(Math.max(40, Math.min(160, Number(value) || 100))); return; }
      if (action === 'fit') { setZoom(Math.min(120, Math.max(40, Math.floor(((editorContainerRef.current?.clientWidth || innerWidth) - 80) / (pageWidthCm * 37.795) * 100)))); return; }
      if (action === 'html') { downloadText('html', `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>${escapeWordText(docTitle)}</title><style>body{font:12pt Calibri,Arial,sans-serif}table{border-collapse:collapse}td,th{border:1px solid #888;padding:6px}img{max-width:100%}.a4-page-break{break-before:page}</style><body>${cleanWordHtml(latestDocument.current().content)}</body></html>`, 'text/html;charset=utf-8'); return; }
      if (action === 'txt') { downloadText('txt', new DOMParser().parseFromString(latestDocument.current().content.replace(/<\/p>/g, '</p>\n'), 'text/html').body.textContent || '', 'text/plain;charset=utf-8'); return; }
      if (action === 'print') { const style = document.createElement('style'); style.textContent = `@page { size: ${pageSize === 'a4' ? 'A4' : 'letter'} ${orientation}; margin: 0; }`; document.head.append(style); window.addEventListener('afterprint', () => style.remove(), { once: true }); window.print(); return; }
      if (action === 'zotero') { window.open('https://www.zotero.org/', '_blank', 'noopener,noreferrer'); return; }
      if (action === 'read-aloud') {
        if (!('speechSynthesis' in window)) { setNotice('A leitura em voz alta não está disponível neste navegador.'); return; }
        if (speechSynthesis.speaking) { speechSynthesis.cancel(); setNotice('Leitura interrompida.'); return; }
        const speech = new SpeechSynthesisUtterance(new DOMParser().parseFromString(latestDocument.current().content, 'text/html').body.textContent || ''); speech.lang = pageRefs.current[activePageIndex]?.lang || 'pt-BR'; speechSynthesis.speak(speech); return;
      }
      if (readOnly) { setNotice('Desative o modo de leitura para editar.'); return; }
      if (action === 'orientation') { setOrientation(value === 'landscape' ? 'landscape' : 'portrait'); return; }
      if (action === 'page-size') { setPageSize(value === 'letter' ? 'letter' : 'a4'); return; }
      if (action === 'duplicate-page') { handleDuplicatePage(activePageIndex); return; }
      if (action === 'page-break') { handlePageBreak(); return; }
      restoreSelection();
      const page = pageRefs.current[activePageIndex]; const selection = window.getSelection();
      if (!page) return;
      if (action === 'select-all') { const range = document.createRange(); range.selectNodeContents(page); selection?.removeAllRanges(); selection?.addRange(range); selectionRef.current = range.cloneRange(); return; }
      if (action === 'copy' || action === 'cut') {
        if (!selection?.toString()) { setNotice('Selecione o texto que deseja copiar ou recortar.'); return; }
        if (!document.execCommand(action)) { await navigator.clipboard.writeText(selection.toString()); if (action === 'cut') document.execCommand('delete'); }
        if (action === 'cut') handleContentInput(); return;
      }
      if (action === 'paste') { const text = await navigator.clipboard.readText(); restoreSelection(); document.execCommand('insertText', false, text); handleContentInput(); return; }
      if (action === 'font-size') {
        const size = Math.max(6, Math.min(96, Number(value) || 12));
        document.execCommand('fontSize', false, '7');
        page.querySelectorAll<HTMLElement>('font[size="7"]').forEach(font => { font.style.fontSize = `${size}pt`; font.removeAttribute('size'); });
      } else if (action === 'case') {
        const text = selection?.toString(); if (!text) { setNotice('Selecione o texto para alterar maiúsculas e minúsculas.'); return; }
        const changed = value === 'upper' ? text.toLocaleUpperCase('pt-BR') : value === 'lower' ? text.toLocaleLowerCase('pt-BR') : text.toLocaleLowerCase('pt-BR').replace(/(^|\s)(\p{L})/gu, (_, space, letter) => space + letter.toLocaleUpperCase('pt-BR'));
        document.execCommand('insertText', false, changed);
      } else if (action === 'paint-format') {
        if (!formatPainterRef.current) { formatPainterRef.current = activeFormat; setNotice('Selecione o texto de destino e clique novamente em “Copiar formatação”.'); return; }
        const format = formatPainterRef.current; document.execCommand('fontName', false, format.fontFamily); document.execCommand('foreColor', false, format.textColor);
        for (const command of ['bold', 'italic', 'underline'] as const) if (document.queryCommandState(command) !== format[command]) document.execCommand(command);
        formatPainterRef.current = null; setNotice('Formatação aplicada.');
      } else if (['line-height', 'space-before', 'space-after', 'border', 'sort'].includes(action)) {
        const blocks = getBlocks();
        if (action === 'sort') { const parent = blocks[0]?.parentElement; if (parent && blocks.every(block => block.parentElement === parent) && blocks.length > 1) { const marker = document.createComment('sort'); parent.insertBefore(marker, blocks[0]); [...blocks].sort((a, b) => (a.textContent || '').localeCompare(b.textContent || '', 'pt-BR')).forEach(block => parent.insertBefore(block, marker)); marker.remove(); } else setNotice('Selecione dois ou mais parágrafos para ordenar.'); }
        else blocks.forEach(block => { if (action === 'line-height') block.style.lineHeight = String(Math.max(1, Math.min(3, Number(value)))); if (action === 'space-before') block.style.marginTop = `${Math.max(0, Math.min(96, Number(value)))}pt`; if (action === 'space-after') block.style.marginBottom = `${Math.max(0, Math.min(96, Number(value)))}pt`; if (action === 'border') block.style.borderBottom = block.style.borderBottom ? '' : '1px solid currentColor'; });
      } else if (action === 'link') {
        const url = window.prompt('Endereço do link (https://… ou mailto:…)'); if (!url) return;
        if (!/^(https?:\/\/|mailto:)/i.test(url)) { setNotice('Informe um link HTTP, HTTPS ou mailto válido.'); return; }
        restoreSelection(); if (selection?.toString()) document.execCommand('createLink', false, url); else document.execCommand('insertHTML', false, `<a href="${escapeWordText(url)}">${escapeWordText(url)}</a>`);
      } else if (action === 'comment') {
        const quote = selection?.toString() || ''; if (!quote.trim()) { setNotice('Selecione um trecho do documento para comentar.'); return; }
        const text = window.prompt('Comentário sobre o trecho selecionado:'); if (!text?.trim()) return;
        restoreSelection(); const id = `comment-${Date.now()}`;
        document.execCommand('insertHTML', false, `<mark data-comment-id="${id}" title="${escapeWordText(text)}">${escapeWordText(quote)}</mark>`);
        setComments(items => [...items, { id, text: text.trim(), quote, createdAt: new Date().toISOString() }]); setPanel('comments');
      } else if (action === 'document-theme') {
        pageRefs.current.forEach(editor => editor?.querySelectorAll<HTMLElement>('p,li,h1,h2,h3,blockquote').forEach(block => { block.style.fontFamily = value === 'academic' ? 'Georgia, serif' : value === 'modern' ? 'Arial, sans-serif' : 'Calibri, sans-serif'; if (/^H/.test(block.tagName)) block.style.color = value === 'modern' ? '#4f46e5' : '#183c67'; }));
      } else if (action === 'toc') {
        const entries: string[] = []; pageRefs.current.forEach((editor, pageIndex) => editor?.querySelectorAll<HTMLElement>('h1,h2,h3').forEach((heading, index) => { heading.id ||= `heading-${pageIndex}-${index}`; entries.push(`<p><a href="#${heading.id}">${escapeWordText(heading.textContent || '')}</a> · ${pageIndex + 1}</p>`); }));
        if (!entries.length) { setNotice('Aplique estilos Título 1, 2 ou 3 antes de inserir o sumário.'); return; }
        restoreSelection(); document.execCommand('insertHTML', false, `<section><h2>Sumário</h2>${entries.join('')}</section>`);
      } else if (action === 'citation') {
        const reference = window.prompt('Referência bibliográfica (autor, título, ano):'); if (!reference) return; restoreSelection(); document.execCommand('insertText', false, reference);
      } else if (action === 'merge-field') {
        const field = window.prompt('Nome do campo (por exemplo: nome ou turma):'); if (!field || !/^[\p{L}\d_]+$/u.test(field)) return; restoreSelection(); document.execCommand('insertText', false, `{{${field}}}`);
      } else if (action === 'page-number') {
        setPageNumbers(v => !v);
      } else if (action === 'header-footer') {
        const header = window.prompt('Cabeçalho (deixe vazio para omitir):'); if (header === null) return;
        const footer = window.prompt('Rodapé (deixe vazio para omitir):'); if (footer === null) return;
        setHeaderText(header); setFooterText(footer);
      } else if (action === 'language') {
        pageRefs.current.forEach(editor => { if (editor) { editor.lang = value || 'pt-BR'; editor.spellcheck = true; } }); setNotice('Idioma de revisão alterado.');
      } else if (action === 'dictate') {
        if (dictating) { recognitionRef.current?.stop(); setDictating(false); return; }
        const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition; if (!Recognition) { setNotice('Ditado não disponível neste navegador.'); return; }
        const recognition = new Recognition(); recognitionRef.current = recognition; recognition.lang = page.lang || 'pt-BR'; recognition.continuous = true; recognition.interimResults = false;
        recognition.onresult = (event: any) => { for (let i = event.resultIndex; i < event.results.length; i++) if (event.results[i].isFinal) { restoreSelection(); document.execCommand('insertText', false, event.results[i][0].transcript + ' '); handleContentInput(); } };
        recognition.onerror = () => { setDictating(false); setNotice('Não foi possível usar o microfone. Confira a permissão do navegador.'); };
        recognition.onend = () => setDictating(false); recognition.start(); setDictating(true); return;
      }
      handleContentInput(); inspectActiveFormatting();
    } catch { setNotice('Não foi possível concluir a ação. Para a área de transferência, use Ctrl+C, Ctrl+X ou Ctrl+V.'); }
  };

  useEffect(() => () => { recognitionRef.current?.stop(); window.speechSynthesis?.cancel(); }, []);
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const root = document.getElementById('root');
    const previousInert = root?.inert || false;
    document.body.style.overflow = 'hidden'; if (root) root.inert = true;
    return () => { document.body.style.overflow = previousOverflow; if (root) root.inert = previousInert; };
  }, []);

  // Paper theme style
  const getPaperBgStyle = () => {
    if (paperTheme === 'sepia') return 'bg-[#fbf0d9] text-[#2c221e] shadow-lg border-[#e8d2b2]';
    if (paperTheme === 'dark') return 'bg-slate-900 text-slate-100 shadow-lg border-slate-800';
    return 'bg-white text-slate-900 shadow-xl border-slate-200/80 dark:border-slate-800';
  };

  return createPortal(
    <div data-motion="off" className={`word-workspace ${rulerVisible ? 'word-rulers-visible' : ''} ${focusMode ? 'word-focus' : ''} ${marksVisible ? 'word-show-marks' : ''}`} onKeyDown={event => {
      if (event.key === 'Escape') { setFocusMode(false); setPanel(null); setTableDrawMode('none'); setExtendTableSelection(false); }
      if ((event.ctrlKey || event.metaKey) && ['z','y'].includes(event.key.toLowerCase()) && !(event.target as HTMLElement).closest('input,textarea,select')) { event.preventDefault(); handleExecCommand(event.key.toLowerCase() === 'y' || event.shiftKey ? 'redo' : 'undo'); return; }
      if (event.ctrlKey || event.metaKey) { const key = event.key.toLowerCase(); if (['s','f','h','b','i','u'].includes(key) || event.key === 'Enter') { event.preventDefault(); if (key === 's') handleSaveToBackend(); else if (['f','h'].includes(key)) setIsFindReplaceOpen(true); else if (event.key === 'Enter') handlePageBreak(); else handleExecCommand(key === 'b' ? 'bold' : key === 'i' ? 'italic' : 'underline'); } }
    }}><div className="flex h-full min-h-0 w-full flex-col bg-slate-200 dark:bg-slate-950 overflow-hidden relative">
      {/* Sticky Fixed Toolbar & Controls Block */}
      <div className="word-toolbar-shell shrink-0 z-30 bg-white dark:bg-slate-900 shadow-md border-b border-slate-200/80 dark:border-slate-800">
        <header className="word-titlebar">
          <div className="word-quick-actions"><FileText size={20} /><label className="word-autosave">Salvamento automático <input type="checkbox" checked={autoSave} onChange={e => setAutoSave(e.target.checked)} aria-label="Salvamento automático" /></label><button title="Salvar (Ctrl+S)" aria-label="Salvar documento" onMouseDown={e => e.preventDefault()} onClick={handleSaveToBackend}><Save size={17} /></button><button title="Desfazer" onMouseDown={e => e.preventDefault()} onClick={() => handleExecCommand('undo')}><Undo2 size={17} /></button><button title="Refazer" onMouseDown={e => e.preventDefault()} onClick={() => handleExecCommand('redo')}><Redo2 size={17} /></button></div>
          <div className="word-document-title"><input aria-label="Nome do documento" value={docTitle} onChange={e => setDocTitle(e.target.value)} /><small role="status">{saveStatus === 'saved' ? 'Salvo neste navegador · ' + lastSavedTime : saveStatus === 'saving' ? 'Salvando…' : saveStatus === 'error' ? 'Erro ao salvar' : 'Alterações não salvas'}</small></div>
          <div className="word-command-search"><Search size={16} /><input aria-label="Pesquisar comandos" placeholder="Pesquisar comandos e ajuda" value={commandSearch} onChange={e => setCommandSearch(e.target.value)} />{commandSearch && <div className="word-command-results">{[['save','Salvar documento'],['docx','Baixar DOCX'],['open','Abrir documentos'],['import','Importar arquivo'],['find','Localizar e substituir'],['comment','Novo comentário'],['print','Imprimir / PDF'],['help','Ajuda e atalhos']].filter(([, label]) => label.toLowerCase().includes(commandSearch.toLowerCase())).map(([action, label]) => <button key={action} onMouseDown={e => e.preventDefault()} onClick={() => { handleAction(action); setCommandSearch(''); }}>{label}</button>)}</div>}</div>
          <button className="word-comments-button" onClick={() => setPanel('comments')}><MessageSquare size={17} /><span>Comentários</span></button>
          <select aria-label="Modo de edição" value={readOnly ? 'read' : 'edit'} onChange={e => setReadOnly(e.target.value === 'read')}><option value="edit">Editando</option><option value="read">Leitura</option></select>
          <button className="word-comments-button" onClick={() => handleAction('share')}><Share2 size={17} /><span>Compartilhar</span></button>
        </header>

        {/* Ribbon Formatting Toolbar */}
        <WordToolbar
          tableActive={Boolean(activeTableCell?.isConnected && selectedTable?.isConnected)} tableTabRequest={tableTabRequest}
          renderTableTools={view => selectedTable?.isConnected && <WordTableRibbon view={view} table={selectedTable} cells={tableCells.filter(c => c.isConnected)} readOnly={readOnly} onCommand={handleTableCommand} onSelect={handleSelectTable} grid={tableGrid} toggleGrid={() => setTableGrid(v => !v)} drawMode={tableDrawMode} setDrawMode={setTableDrawMode} extend={extendTableSelection} />}
          onAction={handleAction} rulerVisible={rulerVisible} marksVisible={marksVisible} focusMode={focusMode} readOnly={readOnly} zoom={zoom} orientation={orientation} pageSize={pageSize} dictating={dictating} canDictate={canDictate}
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
          onChangePaperMargin={margin => { setPaperMargin(margin); const value = margin === 'narrow' ? 1.2 : margin === 'wide' ? 3.8 : 2.5; setLeftMarginCm(value); setRightMarginCm(value); setTopMarginCm(value); setBottomMarginCm(value); setScopeMode('all'); }}
          leftMarginCm={leftMarginCm}
          rightMarginCm={rightMarginCm}
          topMarginCm={topMarginCm}
          bottomMarginCm={bottomMarginCm}
          firstLineIndentCm={scopeMode === 'paragraph' ? paragraphIndentCm : firstLineIndentCm}
          onChangeLeftMargin={setLeftMarginCm}
          onChangeRightMargin={setRightMarginCm}
          onChangeTopMargin={setTopMarginCm}
          onChangeBottomMargin={setBottomMarginCm}
          onChangeFirstLineIndent={handleRulerFirstLineIndent}
          scopeMode={scopeMode}
          targetSummary={selectedBlockSummary}
          onToggleScopeMode={handleToggleScopeMode}
          activeFormat={activeFormat}
        />

        {tableDrawMode !== 'none' && <div className="word-table-mode-status" role="status">{tableDrawMode === 'draw' ? 'Desenhar: arraste uma linha dentro da célula para dividi-la.' : 'Borracha: clique em uma divisória interna para mesclar as células.'}<button onClick={() => setTableDrawMode('none')}>Concluir (Esc)</button></div>}

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

      {rulerVisible && <WordViewportRulers canvasRef={editorContainerRef} pageIndex={activePageIndex} zoom={zoom} pageWidthCm={pageWidthCm} pageHeightCm={pageHeightCm}
        left={leftMarginCm + (scopeMode === 'paragraph' ? paragraphLeftMarginCm : 0)}
        right={rightMarginCm + (scopeMode === 'paragraph' ? paragraphRightMarginCm : 0)}
        indent={scopeMode === 'paragraph' ? paragraphIndentCm : firstLineIndentCm}
        top={topMarginCm} bottom={bottomMarginCm} readOnly={readOnly}
        changeLeft={value => handleRulerLeftMargin(scopeMode === 'paragraph' ? Math.max(0,value-leftMarginCm) : value)} changeRight={value => handleRulerRightMargin(scopeMode === 'paragraph' ? Math.max(0,value-rightMarginCm) : value)} changeIndent={handleRulerFirstLineIndent} changeTop={setTopMarginCm} changeBottom={setBottomMarginCm} />}

      {/* Main Canvas Container (Multi-Page A4 Physical View) */}
      <WordTableSelection cells={tableCells} canvasRef={editorContainerRef} />
      <main
        ref={editorContainerRef}
        className={`word-canvas ${tableGrid ? 'word-gridlines-visible' : ''}`}
      >
        <div className="word-page-stack" style={{ zoom: zoom / 100 }}>
        {pages.map((pageHtml, pageIndex) => (
          <div
            key={pageIndex}
            className="word-page-wrap flex items-start gap-1.5 relative group/page"
            style={{ width: `${pageWidthCm}cm`, minHeight: `${pageHeightCm}cm` }}
            onClick={() => setActivePageIndex(pageIndex)}
          >
            {/* A4 Sheet Box */}
            <div className="flex-1 flex flex-col items-center relative">
              {/* Floating Page Header Banner */}
              <div className="word-page-controls w-full flex items-center justify-between mb-1.5 px-2 text-[11px] text-slate-500 dark:text-slate-400 font-semibold select-none">
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
                className={`w-full rounded-2xl border transition-all duration-300 relative overflow-hidden a4-page-sheet ${getPaperBgStyle()} ${activePageIndex === pageIndex ? 'ring-2 ring-blue-500/40 shadow-2xl' : 'shadow-md'}`}
                style={{
                  width: `${pageWidthCm}cm`,
                  minHeight: `${pageHeightCm}cm`,
                  paddingLeft: `${leftMarginCm}cm`,
                  paddingRight: `${rightMarginCm}cm`,
                  paddingTop: `${topMarginCm}cm`,
                  paddingBottom: `${bottomMarginCm}cm`,
                }}
              >
                {headerText && <div className="word-page-header">{headerText}</div>}
                {(footerText || pageNumbers) && <div className="word-page-footer"><span>{footerText}</span>{pageNumbers && <span>Página {pageIndex + 1} de {pages.length}</span>}</div>}
                {/* Watermark Overlay if active */}
                {watermarkText && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 opacity-15 rotate-[-35deg]">
                    <span className="text-6xl sm:text-7xl font-black tracking-widest text-slate-800 dark:text-slate-100 uppercase border-8 border-current px-8 py-4 rounded-3xl">
                      {watermarkText}
                    </span>
                  </div>
                )}

                {/* Page ContentEditable Area */}
                <div className="relative z-10">
                  {isPageEmpty(pageHtml) && editingPageIndex !== pageIndex && (
                    <span
                      aria-hidden="true"
                      className="absolute left-0 top-0 pointer-events-none select-none text-base text-slate-400 dark:text-slate-500"
                    >
                      Clique aqui para começar a escrever...
                    </span>
                  )}
                  <div
                    ref={(el) => {
                      pageRefs.current[pageIndex] = el;
                      // Keep the editable DOM as the source while typing. Replacing its
                      // contents on every React render resets the caret to the start.
                      if (el && el.innerHTML !== pageHtml) {
                        el.innerHTML = pageHtml;
                      }
                    }}
                    contentEditable={!readOnly}
                    role="textbox" aria-label={`Conteúdo da página ${pageIndex + 1}`} aria-multiline="true" spellCheck lang="pt-BR"
                    suppressContentEditableWarning
                    onFocus={() => {
                      setActivePageIndex(pageIndex);
                      setEditingPageIndex(pageIndex);
                      inspectActiveFormatting();
                    }}
                    onBlur={() => setEditingPageIndex(null)}
                    onInput={handleContentInput}
                    onPointerDown={handleTablePointerDown}
                    onPointerMove={e => { if (tableDrawMode !== 'none') e.currentTarget.style.cursor = 'crosshair'; else tableResize.onPointerMove(e); }}
                    onPointerUp={handleTablePointerUp}
                    onPointerCancel={() => { tableDrawStart.current = null; }}
                    onBeforeInput={e => {
                      if (readOnly) return;
                      const type = (e.nativeEvent as InputEvent).inputType;
                      if (type?.startsWith('delete') && deleteTableContent(e.currentTarget, type.includes('Backward'))) { e.preventDefault(); handleContentInput(); }
                    }}
                    onKeyDown={e => {
                      if (!readOnly && tableCells.length > 1 && (e.key === 'Delete' || e.key === 'Backspace')) { e.preventDefault(); handleTableCommand({ action: 'clear' }); return; }
                      if (!readOnly && (e.key === 'Delete' || e.key === 'Backspace') && deleteTableContent(e.currentTarget, e.key === 'Backspace')) { e.preventDefault(); handleContentInput(); return; }
                      if (readOnly || e.key !== 'Tab') return;
                      const cell = (e.target as HTMLElement).closest<HTMLTableCellElement>('td,th') || (getSelection()?.anchorNode?.parentElement?.closest<HTMLTableCellElement>('td,th'));
                      const table = cell?.closest('table'); if (!cell || !table) return;
                      e.preventDefault();
                      let all = tableMap(table).positions.map(p => p.cell), index = all.indexOf(cell), next = index + (e.shiftKey ? -1 : 1);
                      if (next >= all.length) { if (table.rows.length >= 200) return; insertTableRow(table, table.rows.length); handleContentInput(); all = tableMap(table).positions.map(p => p.cell); }
                      if (next < 0) return;
                      const range = document.createRange(); range.selectNodeContents(all[next]); range.collapse(true); const selection = getSelection(); selection?.removeAllRanges(); selection?.addRange(range); selectionRef.current = range.cloneRange();
                    }}
                    onKeyUp={analyzeSelection}
                    onMouseUp={analyzeSelection}
                    onSelect={analyzeSelection}
                    onContextMenu={(e) => handleContextMenu(e, pageIndex)}
                    className="outline-hidden focus:outline-hidden word-editable prose dark:prose-invert max-w-none text-base leading-relaxed a4-page-content"
                    style={{
                      wordBreak: 'break-word',
                      minHeight: `${Math.max(4, pageHeightCm - topMarginCm - bottomMarginCm)}cm`,
                      color: paperTheme === 'dark' ? '#f1f5f9' : '#111827',
                      textIndent: `${firstLineIndentCm}cm`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
        </div>

        {/* Bottom "+ Adicionar Página A4" Button */}
        <div className="word-add-page w-full max-w-[210mm] flex justify-center py-4 select-none">
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

      <footer className="word-statusbar"><div><span>Página {activePageIndex + 1} de {pages.length}</span><span>{wordCount} palavras</span><span className="word-status-optional">{charCount} caracteres</span><span className="word-status-optional">Português (Brasil)</span></div><div><button onClick={() => setFocusMode(v => !v)} aria-pressed={focusMode}>Foco</button><button onClick={() => setReadOnly(v => !v)} aria-pressed={readOnly}>{readOnly ? 'Editar' : 'Leitura'}</button><button aria-label="Diminuir zoom" onClick={() => setZoom(z => Math.max(40, z - 10))}>−</button><input type="range" min={40} max={160} step={5} aria-label="Zoom do documento" value={zoom} onChange={e => setZoom(Number(e.target.value))} /><button aria-label="Aumentar zoom" onClick={() => setZoom(z => Math.min(160, z + 10))}>+</button><span>{zoom}%</span></div></footer>
      <button className="word-back-button" aria-label="Voltar para aplicativos" title="Voltar para aplicativos" onClick={() => { if (!hasUnsavedChanges || handleSaveToBackend()) onBackToHub(); }}><ArrowLeft size={19} /></button>
      {notice && <div className="word-notice" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Fechar aviso"><X size={16} /></button></div>}
      <input ref={inputFileRef} type="file" accept=".docx,.html,.htm,.txt" hidden onChange={async e => {
        const file = e.target.files?.[0]; if (!file) return;
        try {
          if (hasUnsavedChanges && !handleSaveToBackend()) return;
          const result = await importWordFile(file);
          const doc = createNewDocument(result.title);
          const imported = saveLocalDocument({ ...doc, content: result.html, pages: [result.html] });
          applyDocument(imported);
          setNotice(result.warnings ? 'Documento importado. Alguns recursos avançados do arquivo podem ter sido simplificados.' : 'Documento importado.');
        } catch (error) { setNotice(error instanceof Error ? error.message : 'Não foi possível importar o arquivo.'); }
        finally { e.target.value = ''; }
      }} />
      <WordPanels panel={panel} close={() => setPanel(null)} current={latestDocument.current()} open={doc => { if (!hasUnsavedChanges || handleSaveToBackend()) applyDocument(doc); }} source={pages[activePageIndex] || ''} applySource={html => { const page = pageRefs.current[activePageIndex]; if (page) { page.innerHTML = cleanWordHtml(html); handleContentInput(); } }} merge={handleMerge} removeComment={id => { document.querySelectorAll<HTMLElement>('[data-comment-id]').forEach(node => { if (node.dataset.commentId === id) node.replaceWith(...node.childNodes); }); setComments(items => items.filter(item => item.id !== id)); handleContentInput(); }} />
      {inkOpen && <WordInkPad close={() => setInkOpen(false)} insert={handleInsertImage} />}

      {/* Context Menu on Right Click */}
      {contextMenu && (
        <WordContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onExecCommand={handleExecCommand}
          onAction={handleAction} activeFormat={activeFormat} readOnly={readOnly}
          onClearCells={() => handleTableCommand({ action: 'clear' })}
          targetElement={contextTarget}
          onOpenTableModal={() => setTableTabRequest(v => v + 1)}
          onModifyTable={handleModifyTable}
        />
      )}

      {/* Find & Replace Modal */}
      <FindReplaceModal
        isOpen={isFindReplaceOpen}
        onClose={() => setIsFindReplaceOpen(false)}
        editorRef={{ current: pageRefs.current[activePageIndex] }}
        getEditors={() => pageRefs.current.filter((page): page is HTMLDivElement => Boolean(page))}
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
        selectedText={isTableModalOpen ? selectionRef.current?.toString() || '' : ''}
      />
    </div></div>, document.body
  );
};
