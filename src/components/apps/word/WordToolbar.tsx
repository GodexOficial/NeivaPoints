import React, { useState } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Square,
  Image as ImageIcon,
  Table as TableIcon,
  Highlighter,
  Palette,
  Subscript,
  Superscript,
  Indent,
  Outdent,
  Printer,
  RotateCcw,
  RotateCw,
  Search,
  Bookmark,
  Sliders,
  PaintBucket,
  FileCheck,
  FilePlus,
  Trash2,
} from 'lucide-react';
import type { ActiveFormatting } from '../../../types/doc';
import { WordColorPicker } from './WordColorPicker';

interface WordToolbarProps {
  onExecCommand: (command: string, value?: string) => void;
  onApplyLineBackground: (color: string) => void;
  onOpenInsertShape: () => void;
  onOpenInsertImage: () => void;
  onOpenInsertTable: () => void;
  onAddPage: () => void;
  onDeletePage?: () => void;
  currentPageNumber?: number;
  totalPages?: number;
  onInsertSymbol: (symbol: string) => void;
  onOpenFindReplace: () => void;
  onInsertFootnote: () => void;
  watermarkText: string;
  onChangeWatermark: (text: string) => void;
  paperTheme: 'white' | 'sepia' | 'dark';
  onChangePaperTheme: (theme: 'white' | 'sepia' | 'dark') => void;
  paperMargin: 'normal' | 'narrow' | 'wide';
  onChangePaperMargin: (margin: 'normal' | 'narrow' | 'wide') => void;
  leftMarginCm: number;
  rightMarginCm: number;
  topMarginCm: number;
  bottomMarginCm: number;
  firstLineIndentCm: number;
  onChangeLeftMargin: (val: number) => void;
  onChangeRightMargin: (val: number) => void;
  onChangeTopMargin: (val: number) => void;
  onChangeBottomMargin: (val: number) => void;
  onChangeFirstLineIndent: (val: number) => void;
  scopeMode?: 'paragraph' | 'all';
  targetSummary?: string;
  onToggleScopeMode?: () => void;
  activeFormat?: ActiveFormatting;
}

export const WordToolbar: React.FC<WordToolbarProps> = ({
  onExecCommand,
  onApplyLineBackground,
  onOpenInsertShape,
  onOpenInsertImage,
  onOpenInsertTable,
  onAddPage,
  onDeletePage,
  currentPageNumber = 1,
  totalPages = 1,
  onInsertSymbol,
  onOpenFindReplace,
  onInsertFootnote,
  watermarkText,
  onChangeWatermark,
  paperTheme,
  onChangePaperTheme,
  paperMargin,
  onChangePaperMargin,
  leftMarginCm,
  rightMarginCm,
  topMarginCm,
  bottomMarginCm,
  firstLineIndentCm,
  onChangeLeftMargin,
  onChangeRightMargin,
  onChangeTopMargin,
  onChangeBottomMargin,
  onChangeFirstLineIndent,
  scopeMode = 'all',
  targetSummary,
  onToggleScopeMode,
  activeFormat,
}) => {
  const [activeTab, setActiveTab] = useState<'home' | 'insert' | 'layout'>('home');
  const [textColor, setTextColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#fef08a');
  const [lineBgColor, setLineBgColor] = useState('#e2e8f0');
  const [fontFamily, setFontFamily] = useState('Calibri');
  const [fontSize, setFontSize] = useState('3');

  const fonts = [
    { name: 'Calibri', val: 'Calibri, sans-serif' },
    { name: 'Arial', val: 'Arial, sans-serif' },
    { name: 'Times New Roman', val: 'Times New Roman, serif' },
    { name: 'Georgia', val: 'Georgia, serif' },
    { name: 'Courier New', val: 'Courier New, monospace' },
    { name: 'Trebuchet MS', val: 'Trebuchet MS, sans-serif' },
    { name: 'Comic Sans MS', val: 'Comic Sans MS, cursive' },
    { name: 'Impact', val: 'Impact, sans-serif' },
  ];

  const fontSizes = [
    { label: '8 pt', val: '1' },
    { label: '10 pt', val: '2' },
    { label: '12 pt', val: '3' },
    { label: '14 pt', val: '4' },
    { label: '18 pt', val: '5' },
    { label: '24 pt', val: '6' },
    { label: '36 pt', val: '7' },
  ];

  const symbols = ['©', '®', '™', '★', '✦', '✔', '✖', '←', '→', '↑', '↓', '±', '∞', '∑', 'π', '√', '€', '£', '¥', '§'];

  const handleTextColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTextColor(val);
    onExecCommand('foreColor', val);
  };

  const handleBgColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setBgColor(val);
    onExecCommand('hiliteColor', val);
  };

  const handleFontFamilyChange = (val: string) => {
    setFontFamily(val);
    onExecCommand('fontName', val);
  };

  const handleFontSizeChange = (val: string) => {
    setFontSize(val);
    onExecCommand('fontSize', val);
  };

  // Helper for active button styling box
  const getToolBtnClass = (isActive: boolean | undefined) =>
    `p-1.5 rounded-lg transition-all cursor-pointer ${
      isActive
        ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-500 font-bold scale-105'
        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
    }`;

  const getHeadingBtnClass = (blockName: string) =>
    `px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
      activeFormat?.formatBlock === blockName
        ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-500 font-bold'
        : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-white'
    }`;

  const currentFontFamily = activeFormat?.fontFamily || fontFamily;
  const currentFontSize = activeFormat?.fontSize || fontSize;
  const currentTextColor = activeFormat?.textColor || textColor;
  const currentBgColor = activeFormat?.bgColor || bgColor;

  return (
    <div className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 rounded-t-2xl shadow-2xs overflow-x-auto">
      {/* Ribbon Tabs */}
      <div className="flex items-center gap-1 px-4 pt-2 border-b border-slate-200/70 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50">
        <button
          type="button"
          onClick={() => setActiveTab('home')}
          className={`px-4 py-1.5 text-xs font-bold rounded-t-xl transition-colors cursor-pointer border-b-2 ${
            activeTab === 'home'
              ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border-transparent'
          }`}
        >
          Início (Formatação)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('insert')}
          className={`px-4 py-1.5 text-xs font-bold rounded-t-xl transition-colors cursor-pointer border-b-2 ${
            activeTab === 'insert'
              ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border-transparent'
          }`}
        >
          Inserir (Páginas / Vetores / Mídia)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('layout')}
          className={`px-4 py-1.5 text-xs font-bold rounded-t-xl transition-colors cursor-pointer border-b-2 ${
            activeTab === 'layout'
              ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border-transparent'
          }`}
        >
          Exibição & Layout
        </button>
      </div>

      {/* Toolbar Controls Panel */}
      <div className="p-2.5 flex items-center gap-2 flex-wrap text-slate-700 dark:text-slate-200 min-h-[52px]">
        {activeTab === 'home' && (
          <>
            {/* Undo / Redo */}
            <div className="flex items-center gap-0.5 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => onExecCommand('undo')}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-200 cursor-pointer"
                title="Desfazer (Ctrl+Z)"
              >
                <RotateCcw size={15} />
              </button>
              <button
                type="button"
                onClick={() => onExecCommand('redo')}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-200 cursor-pointer"
                title="Refazer (Ctrl+Y)"
              >
                <RotateCw size={15} />
              </button>
            </div>

            <div className="h-6 w-px bg-slate-300 dark:bg-slate-700 mx-0.5" />

            {/* Font Family */}
            <select
              value={currentFontFamily}
              onChange={(e) => handleFontFamilyChange(e.target.value)}
              className="text-xs font-medium p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white cursor-pointer"
            >
              {fonts.map((f) => (
                <option key={f.name} value={f.val}>
                  {f.name}
                </option>
              ))}
            </select>

            {/* Font Size */}
            <select
              value={currentFontSize}
              onChange={(e) => handleFontSizeChange(e.target.value)}
              className="text-xs font-medium p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white cursor-pointer"
            >
              {fontSizes.map((fs) => (
                <option key={fs.val} value={fs.val}>
                  {fs.label}
                </option>
              ))}
            </select>

            <div className="h-6 w-px bg-slate-300 dark:bg-slate-700 mx-0.5" />

            {/* Text Style formatting */}
            <div className="flex items-center gap-0.5 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => onExecCommand('bold')}
                className={getToolBtnClass(activeFormat?.bold)}
                title="Negrito (Ctrl+B)"
              >
                <Bold size={15} />
              </button>
              <button
                type="button"
                onClick={() => onExecCommand('italic')}
                className={getToolBtnClass(activeFormat?.italic)}
                title="Itálico (Ctrl+I)"
              >
                <Italic size={15} />
              </button>
              <button
                type="button"
                onClick={() => onExecCommand('underline')}
                className={getToolBtnClass(activeFormat?.underline)}
                title="Sublinhado (Ctrl+U)"
              >
                <Underline size={15} />
              </button>
              <button
                type="button"
                onClick={() => onExecCommand('strikeThrough')}
                className={getToolBtnClass(activeFormat?.strikeThrough)}
                title="Tachado"
              >
                <Strikethrough size={15} />
              </button>
              <button
                type="button"
                onClick={() => onExecCommand('subscript')}
                className={getToolBtnClass(activeFormat?.subscript)}
                title="Subscrito"
              >
                <Subscript size={15} />
              </button>
              <button
                type="button"
                onClick={() => onExecCommand('superscript')}
                className={getToolBtnClass(activeFormat?.superscript)}
                title="Sobrescrito"
              >
                <Superscript size={15} />
              </button>
            </div>

            <div className="h-6 w-px bg-slate-300 dark:bg-slate-700 mx-0.5" />

            {/* Colors & Text Shading */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-0.5 px-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <WordColorPicker
                value={currentTextColor}
                onChange={(val) => {
                  const finalColor = val || '#000000';
                  setTextColor(finalColor);
                  onExecCommand('foreColor', finalColor);
                }}
                title="Cor da Fonte"
                icon={<Palette size={15} />}
                hasNoColorOption={true}
                noColorLabel="Automático"
              />

              <WordColorPicker
                value={currentBgColor}
                onChange={(val) => {
                  setBgColor(val);
                  onExecCommand('hiliteColor', val || 'transparent');
                }}
                title="Marca-Texto / Destaque"
                icon={<Highlighter size={15} className="text-amber-500" />}
                hasNoColorOption={true}
                noColorLabel="Sem Cor"
              />

              <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />

              <WordColorPicker
                value={activeFormat?.lineBgColor || lineBgColor}
                onChange={(val) => {
                  setLineBgColor(val);
                  onApplyLineBackground(val);
                }}
                title="Preenchimento de Fundo da Linha"
                icon={<PaintBucket size={15} className="text-blue-500" />}
                hasNoColorOption={true}
                noColorLabel="Sem Cor"
              />
            </div>

            <div className="h-6 w-px bg-slate-300 dark:bg-slate-700 mx-0.5" />

            {/* Alignments with active indicator box */}
            <div className="flex items-center gap-0.5 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => onExecCommand('justifyLeft')}
                className={getToolBtnClass(activeFormat?.align === 'left')}
                title="Alinhar à Esquerda"
              >
                <AlignLeft size={15} />
              </button>
              <button
                type="button"
                onClick={() => onExecCommand('justifyCenter')}
                className={getToolBtnClass(activeFormat?.align === 'center')}
                title="Centralizar"
              >
                <AlignCenter size={15} />
              </button>
              <button
                type="button"
                onClick={() => onExecCommand('justifyRight')}
                className={getToolBtnClass(activeFormat?.align === 'right')}
                title="Alinhar à Direita"
              >
                <AlignRight size={15} />
              </button>
              <button
                type="button"
                onClick={() => onExecCommand('justifyFull')}
                className={getToolBtnClass(activeFormat?.align === 'justify')}
                title="Justificar"
              >
                <AlignJustify size={15} />
              </button>
            </div>

            {/* Lists & Indent */}
            <div className="flex items-center gap-0.5 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => onExecCommand('insertUnorderedList')}
                className={getToolBtnClass(activeFormat?.unorderedList)}
                title="Lista com Marcadores"
              >
                <List size={15} />
              </button>
              <button
                type="button"
                onClick={() => onExecCommand('insertOrderedList')}
                className={getToolBtnClass(activeFormat?.orderedList)}
                title="Lista Numerada"
              >
                <ListOrdered size={15} />
              </button>
              <button
                type="button"
                onClick={() => onExecCommand('indent')}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
                title="Aumentar Recuo"
              >
                <Indent size={15} />
              </button>
              <button
                type="button"
                onClick={() => onExecCommand('outdent')}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
                title="Diminuir Recuo"
              >
                <Outdent size={15} />
              </button>
            </div>

            {/* Find & Replace button */}
            <button
              type="button"
              onClick={onOpenFindReplace}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              title="Localizar e Substituir texto"
            >
              <Search size={14} />
              <span>Localizar / Substituir</span>
            </button>

            {/* Headings */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => onExecCommand('formatBlock', '<h1>')}
                className={getHeadingBtnClass('h1')}
                title="Título 1"
              >
                <Heading1 size={15} />
              </button>
              <button
                type="button"
                onClick={() => onExecCommand('formatBlock', '<h2>')}
                className={getHeadingBtnClass('h2')}
                title="Título 2"
              >
                <Heading2 size={15} />
              </button>
              <button
                type="button"
                onClick={() => onExecCommand('formatBlock', '<h3>')}
                className={getHeadingBtnClass('h3')}
                title="Título 3"
              >
                <Heading3 size={15} />
              </button>
              <button
                type="button"
                onClick={() => onExecCommand('formatBlock', '<blockquote>')}
                className={getHeadingBtnClass('blockquote')}
                title="Citação"
              >
                <Quote size={15} />
              </button>
            </div>
          </>
        )}

        {activeTab === 'insert' && (
          <>
            {/* Multi-Page A4 Management Button */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
              <button
                type="button"
                onClick={onAddPage}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                title="Adicionar Nova Folha A4"
              >
                <FilePlus size={15} />
                <span>+ Adicionar Página A4</span>
              </button>
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 px-2">
                Pág. {currentPageNumber} de {totalPages}
              </span>
              {totalPages > 1 && onDeletePage && (
                <button
                  type="button"
                  onClick={onDeletePage}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                  title="Excluir Página Atual"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>

            {/* Vector Shapes Button */}
            <button
              type="button"
              onClick={onOpenInsertShape}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            >
              <Square size={16} />
              <span>+ Inserir Vetor / Forma</span>
            </button>

            {/* Bitmap Image Button */}
            <button
              type="button"
              onClick={onOpenInsertImage}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            >
              <ImageIcon size={16} />
              <span>+ Inserir Imagem (Bitmap)</span>
            </button>

            {/* Table Button */}
            <button
              type="button"
              onClick={onOpenInsertTable}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            >
              <TableIcon size={16} />
              <span>+ Inserir Tabela</span>
            </button>

            {/* Footnote button */}
            <button
              type="button"
              onClick={onInsertFootnote}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            >
              <Bookmark size={16} />
              <span>Nota de Rodapé</span>
            </button>

            <div className="h-6 w-px bg-slate-300 dark:bg-slate-700 mx-1" />

            {/* Special Symbols Picker */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
              <span className="text-[11px] font-bold text-slate-400 px-1 uppercase">Símbolos:</span>
              {symbols.map((sym) => (
                <button
                  key={sym}
                  type="button"
                  onClick={() => onInsertSymbol(sym)}
                  className="px-2 py-0.5 hover:bg-blue-50 dark:hover:bg-blue-950 text-slate-800 dark:text-white rounded-md text-xs font-bold cursor-pointer"
                >
                  {sym}
                </button>
              ))}
            </div>
          </>
        )}

        {activeTab === 'layout' && (
          <>
            {/* Precision Ruler Numerical Adjustment Controls */}
            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs flex-wrap">
              <div className="flex items-center gap-1">
                <span className="font-bold text-slate-500 flex items-center gap-1">
                  <Sliders size={13} />
                  <span>Régua:</span>
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${scopeMode === 'paragraph' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'}`}>
                  {scopeMode === 'paragraph' ? `Parágrafo ${targetSummary ? `(${targetSummary})` : ''}` : 'Documento Inteiro'}
                </span>
                {onToggleScopeMode && (
                  <button
                    type="button"
                    onClick={onToggleScopeMode}
                    className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer ml-0.5"
                    title="Alternar entre Parágrafo Selecionado e Documento Inteiro"
                  >
                    (Alternar)
                  </button>
                )}
              </div>

              {/* Horizontal Margins */}
              <label className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                <span>Esq:</span>
                <input
                  type="number"
                  step={0.1}
                  min={0}
                  max={8}
                  value={leftMarginCm}
                  onChange={(e) => onChangeLeftMargin(Number(e.target.value))}
                  className="w-12 p-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-center font-mono"
                />
              </label>

              <label className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                <span>Dir:</span>
                <input
                  type="number"
                  step={0.1}
                  min={0}
                  max={8}
                  value={rightMarginCm}
                  onChange={(e) => onChangeRightMargin(Number(e.target.value))}
                  className="w-12 p-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-center font-mono"
                />
              </label>

              {/* Vertical Margins */}
              <label className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                <span>Topo:</span>
                <input
                  type="number"
                  step={0.1}
                  min={0.5}
                  max={10}
                  value={topMarginCm}
                  onChange={(e) => onChangeTopMargin(Number(e.target.value))}
                  className="w-12 p-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-center font-mono"
                />
              </label>

              <label className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                <span>Base:</span>
                <input
                  type="number"
                  step={0.1}
                  min={0.5}
                  max={10}
                  value={bottomMarginCm}
                  onChange={(e) => onChangeBottomMargin(Number(e.target.value))}
                  className="w-12 p-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-center font-mono"
                />
              </label>

              {/* Indent */}
              <label className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                <span>Recuo:</span>
                <input
                  type="number"
                  step={0.1}
                  min={0}
                  max={10}
                  value={firstLineIndentCm}
                  onChange={(e) => onChangeFirstLineIndent(Number(e.target.value))}
                  className="w-12 p-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-center font-mono"
                />
              </label>
            </div>

            {/* Watermark Selector */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 p-1 px-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <span className="font-bold text-slate-500 flex items-center gap-1">
                <FileCheck size={13} />
                <span>Marca D'água:</span>
              </span>
              <select
                value={watermarkText}
                onChange={(e) => onChangeWatermark(e.target.value)}
                className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold cursor-pointer"
              >
                <option value="">Nenhuma</option>
                <option value="CONFIDENCIAL">CONFIDENCIAL</option>
                <option value="RASCUNHO">RASCUNHO</option>
                <option value="EXEMPLO ESCOLAR">EXEMPLO ESCOLAR</option>
                <option value="URGENTE">URGENTE</option>
              </select>
            </div>

            {/* Paper Theme / Style */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 p-1 px-2 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-xs font-bold text-slate-500">Cor do Papel:</span>
              <button
                type="button"
                onClick={() => onChangePaperTheme('white')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg cursor-pointer border ${
                  paperTheme === 'white' ? 'bg-white text-slate-900 border-blue-500 shadow-2xs' : 'text-slate-600 border-transparent'
                }`}
              >
                Branco Padrão
              </button>
              <button
                type="button"
                onClick={() => onChangePaperTheme('sepia')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg cursor-pointer border ${
                  paperTheme === 'sepia' ? 'bg-amber-100 text-amber-900 border-amber-500 shadow-2xs' : 'text-slate-600 border-transparent'
                }`}
              >
                Sépia Leitura
              </button>
              <button
                type="button"
                onClick={() => onChangePaperTheme('dark')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg cursor-pointer border ${
                  paperTheme === 'dark' ? 'bg-slate-900 text-white border-blue-500 shadow-2xs' : 'text-slate-600 border-transparent'
                }`}
              >
                Papel Escuro
              </button>
            </div>

            {/* Paper Margin */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 p-1 px-2 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-xs font-bold text-slate-500">Margens:</span>
              <button
                type="button"
                onClick={() => onChangePaperMargin('normal')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg cursor-pointer border ${
                  paperMargin === 'normal' ? 'bg-blue-600 text-white border-blue-600' : 'text-slate-600 border-transparent'
                }`}
              >
                Normal (2.5 cm)
              </button>
              <button
                type="button"
                onClick={() => onChangePaperMargin('narrow')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg cursor-pointer border ${
                  paperMargin === 'narrow' ? 'bg-blue-600 text-white border-blue-600' : 'text-slate-600 border-transparent'
                }`}
              >
                Estreita (1.2 cm)
              </button>
              <button
                type="button"
                onClick={() => onChangePaperMargin('wide')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg cursor-pointer border ${
                  paperMargin === 'wide' ? 'bg-blue-600 text-white border-blue-600' : 'text-slate-600 border-transparent'
                }`}
              >
                Larga (3.8 cm)
              </button>
            </div>

            {/* Print button */}
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold cursor-pointer"
            >
              <Printer size={15} />
              <span>Imprimir / PDF</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};
