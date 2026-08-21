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
} from 'lucide-react';
import type { WordDocument, SaveStatus, VectorShape, BitmapImage } from '../../../types/doc';
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

interface WordEditorProps {
  initialDocument: WordDocument;
  onBackToHub: () => void;
}

export const WordEditor: React.FC<WordEditorProps> = ({ initialDocument, onBackToHub }) => {
  const [wordDoc, setWordDoc] = useState<WordDocument>(initialDocument);
  const [docTitle, setDocTitle] = useState<string>(initialDocument.title);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<string>('agora');
  const [showDraftRestoredBanner, setShowDraftRestoredBanner] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  // Modals state
  const [isShapeModalOpen, setIsShapeModalOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [isTableEditOpen, setIsTableEditOpen] = useState(false);
  const [isFindReplaceOpen, setIsFindReplaceOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<HTMLTableElement | null>(null);

  // Ruler & Watermark state
  const [leftMarginCm, setLeftMarginCm] = useState(2.5);
  const [rightMarginCm, setRightMarginCm] = useState(2.5);
  const [firstLineIndentCm, setFirstLineIndentCm] = useState(0);
  const [watermarkText, setWatermarkText] = useState('');

  // Context Menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [contextTarget, setContextTarget] = useState<HTMLElement | null>(null);

  // Layout state
  const [paperTheme, setPaperTheme] = useState<'white' | 'sepia' | 'dark'>(initialDocument.paperTheme || 'white');
  const [paperMargin, setPaperMargin] = useState<'normal' | 'narrow' | 'wide'>(initialDocument.paperMargin || 'normal');

  // Stats state
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);

  const editorRef = useRef<HTMLDivElement>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Update Word & Character counts
  const updateStats = useCallback(() => {
    if (!editorRef.current) return;
    const text = editorRef.current.innerText || '';
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    setWordCount(words);
    setCharCount(text.length);
  }, []);

  // Initialize editor content & check auto-save draft
  useEffect(() => {
    const draft = getAutoSaveDraft(initialDocument.id);
    if (draft && draft.content && draft.content !== initialDocument.content) {
      // Prompt/notify user that a local draft was restored
      setWordDoc((prev) => ({ ...prev, content: draft.content, title: draft.title }));
      setDocTitle(draft.title);
      setShowDraftRestoredBanner(true);
      setSaveStatus('draft_restored');
    }

    if (editorRef.current) {
      editorRef.current.innerHTML = draft?.content || initialDocument.content;
      updateStats();
    }
  }, [initialDocument.id, initialDocument.content, updateStats]);

  // Handle content change & auto-save trigger
  const handleContentInput = () => {
    if (!editorRef.current) return;
    const currentHtml = editorRef.current.innerHTML;

    setHasUnsavedChanges(true);
    setSaveStatus('unsaved');
    updateStats();

    // Debounced local auto-save every 3 seconds
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      setSaveStatus('saving');
      saveAutoSaveDraft(wordDoc.id, currentHtml, docTitle);

      setTimeout(() => {
        setSaveStatus('saved');
        setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        setHasUnsavedChanges(false);
      }, 500);
    }, 3000);
  };

  // Handle Context Menu Right-Click
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
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
    if (!editorRef.current) return;
    editorRef.current.focus();

    const footnoteCount = editorRef.current.querySelectorAll('.footnote-ref').length + 1;
    const refHtml = `<sup class="footnote-ref text-blue-600 font-bold font-mono px-0.5 cursor-pointer" title="Nota de Rodapé ${footnoteCount}">[${footnoteCount}]</sup>`;
    window.document.execCommand('insertHTML', false, refHtml);

    // Append footnote section at the bottom if not present
    let footnoteSection = editorRef.current.querySelector('.footnote-section');
    if (!footnoteSection) {
      const sectionHtml = `<div class="footnote-section border-t border-slate-300 dark:border-slate-700 mt-12 pt-4 text-xs text-slate-500 font-sans" contenteditable="true"><p><strong>Notas de Rodapé:</strong></p></div>`;
      editorRef.current.insertAdjacentHTML('beforeend', sectionHtml);
      footnoteSection = editorRef.current.querySelector('.footnote-section');
    }

    if (footnoteSection) {
      const fnItemHtml = `<p><sup>[${footnoteCount}]</sup> Digite aqui o texto explicativo da nota de rodapé ${footnoteCount}...</p>`;
      footnoteSection.insertAdjacentHTML('beforeend', fnItemHtml);
    }

    handleContentInput();
  };

  // Modify Table Actions (from Context Menu or Toolbar)
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
    if (editorRef.current) {
      editorRef.current.focus();
    }
    window.document.execCommand(command, false, value);
    handleContentInput();
  };

  // Save document explicitly to persistent storage / backend
  const handleSaveToBackend = () => {
    if (!editorRef.current) return;
    setSaveStatus('saving');

    const updatedDoc: WordDocument = {
      ...wordDoc,
      title: docTitle.trim() || 'Documento Sem Título',
      content: editorRef.current.innerHTML,
      paperTheme,
      paperMargin,
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
    if (!editorRef.current) return;
    const currentDoc: WordDocument = {
      ...wordDoc,
      title: docTitle,
      content: editorRef.current.innerHTML,
    };
    await exportToDocx(currentDoc);
  };

  // Insert Vector Shape element into document canvas
  const handleInsertShape = (shape: VectorShape) => {
    if (!editorRef.current) return;
    editorRef.current.focus();

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

  // Insert Bitmap Image element into document canvas
  const handleInsertImage = (img: BitmapImage) => {
    if (!editorRef.current) return;
    editorRef.current.focus();

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
    if (!editorRef.current) return;
    editorRef.current.focus();
    window.document.execCommand('insertHTML', false, tableHtml);
    handleContentInput();
  };

  // Insert Horizontal Divider / Page break
  const handleInsertPageBreak = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    const pageNum = editorRef.current.querySelectorAll('.page-break-divider').length + 2;
    const dividerHtml = `
      <div contenteditable="false" class="page-break-divider my-8 border-t-2 border-dashed border-blue-400 dark:border-blue-600 relative flex items-center justify-center select-none">
        <span class="bg-blue-600 text-white font-extrabold text-[11px] px-3 py-1 rounded-full uppercase tracking-wider shadow-xs -mt-3.5">
          Página ${pageNum} • Quebra de Seção
        </span>
      </div>
      <p><br></p>
    `;
    window.document.execCommand('insertHTML', false, dividerHtml);
    handleContentInput();
  };

  // Insert Special Symbol
  const handleInsertSymbol = (symbol: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    window.document.execCommand('insertText', false, symbol);
    handleContentInput();
  };

  // Create brand new document
  const handleCreateNewDoc = () => {
    const newDoc = createNewDocument('Novo Documento Sem Título');
    setWordDoc(newDoc);
    setDocTitle(newDoc.title);
    if (editorRef.current) {
      editorRef.current.innerHTML = newDoc.content;
      updateStats();
    }
  };

  // Paper theme style
  const getPaperBgStyle = () => {
    if (paperTheme === 'sepia') return 'bg-[#fbf0d9] text-[#2c221e] shadow-md border-[#e8d2b2]';
    if (paperTheme === 'dark') return 'bg-slate-900 text-slate-100 shadow-md border-slate-800';
    return 'bg-white text-slate-900 shadow-xl border-slate-200/80 dark:border-slate-800';
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-5rem)] bg-slate-200 dark:bg-slate-950 rounded-3xl border border-slate-300 dark:border-slate-800 overflow-hidden relative">
      {/* Sticky Fixed Toolbar & Controls Block */}
      <div className="sticky top-0 z-30 bg-white dark:bg-slate-900 shadow-md border-b border-slate-200/80 dark:border-slate-800">
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

          {/* Right: Quick actions (New, Save, Download .docx, Print) */}
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
          onOpenInsertShape={() => setIsShapeModalOpen(true)}
          onOpenInsertImage={() => setIsImageModalOpen(true)}
          onOpenInsertTable={() => setIsTableModalOpen(true)}
          onInsertPageBreak={handleInsertPageBreak}
          onInsertSymbol={handleInsertSymbol}
          onOpenFindReplace={() => setIsFindReplaceOpen(true)}
          onInsertFootnote={handleInsertFootnote}
          watermarkText={watermarkText}
          onChangeWatermark={setWatermarkText}
          paperTheme={paperTheme}
          onChangePaperTheme={setPaperTheme}
          paperMargin={paperMargin}
          onChangePaperMargin={setPaperMargin}
          leftMarginCm={leftMarginCm}
          rightMarginCm={rightMarginCm}
          firstLineIndentCm={firstLineIndentCm}
          onChangeLeftMargin={setLeftMarginCm}
          onChangeRightMargin={setRightMarginCm}
          onChangeFirstLineIndent={setFirstLineIndentCm}
        />

        {/* Interactive Ruler Component */}
        <WordRuler
          leftMarginCm={leftMarginCm}
          rightMarginCm={rightMarginCm}
          firstLineIndentCm={firstLineIndentCm}
          onChangeLeftMargin={setLeftMarginCm}
          onChangeRightMargin={setRightMarginCm}
          onChangeFirstLineIndent={setFirstLineIndentCm}
        />

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

      {/* Main Canvas Container (A4 Sheet View) */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center bg-slate-300/60 dark:bg-slate-950 relative">
        <div className="w-full max-w-[850px] min-h-[1050px] relative">
          {/* A4 Sheet Box */}
          <div
            className={`w-full rounded-2xl border transition-all duration-200 relative overflow-hidden ${getPaperBgStyle()}`}
            style={{
              minHeight: '1050px',
              paddingLeft: `${leftMarginCm}cm`,
              paddingRight: `${rightMarginCm}cm`,
              paddingTop: '2.5cm',
              paddingBottom: '2.5cm',
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

            <div
              ref={editorRef}
              contentEditable
              onInput={handleContentInput}
              onContextMenu={handleContextMenu}
              onDoubleClick={(e) => {
                const table = (e.target as HTMLElement).closest('table');
                if (table) {
                  setSelectedTable(table as HTMLTableElement);
                  setIsTableEditOpen(true);
                }
              }}
              className="outline-hidden focus:outline-hidden min-h-[950px] prose dark:prose-invert max-w-none text-base leading-relaxed relative z-10"
              style={{
                wordBreak: 'break-word',
                textIndent: `${firstLineIndentCm}cm`,
              }}
            />
          </div>
        </div>
      </main>

      {/* Bottom Status Bar (Word Count & Auto-save Info) */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-4 py-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-4">
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {wordCount} palavras
          </span>
          <span>•</span>
          <span>{charCount} caracteres</span>
        </div>

        <div className="flex items-center gap-2 text-[11px]">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Salvamento automático local ativo (A cada poucas alterações)</span>
        </div>
      </footer>

      {/* Context Menu on Right Click */}
      {contextMenu && (
        <WordContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onExecCommand={handleExecCommand}
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
        editorRef={editorRef}
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
