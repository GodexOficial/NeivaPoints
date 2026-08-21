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
  Minus,
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
} from 'lucide-react';

interface WordToolbarProps {
  onExecCommand: (command: string, value?: string) => void;
  onOpenInsertShape: () => void;
  onOpenInsertImage: () => void;
  onOpenInsertTable: () => void;
  onInsertPageBreak: () => void;
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
  firstLineIndentCm: number;
  onChangeLeftMargin: (val: number) => void;
  onChangeRightMargin: (val: number) => void;
  onChangeFirstLineIndent: (val: number) => void;
}

export const WordToolbar: React.FC<WordToolbarProps> = ({
  onExecCommand,
  onOpenInsertShape,
  onOpenInsertImage,
  onOpenInsertTable,
  onInsertPageBreak,
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
  firstLineIndentCm,
  onChangeLeftMargin,
  onChangeRightMargin,
  onChangeFirstLineIndent,
}) => {
  const [activeTab, setActiveTab] = useState<'home' | 'insert' | 'layout'>('home');
  const [textColor, setTextColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#fef08a');
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
          Inserir (Vetores / Mídia)
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
              value={fontFamily}
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
              value={fontSize}
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
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-800 dark:text-white cursor-pointer"
                title="Negrito (Ctrl+B)"
              >
                <Bold size={15} />
              </button>
              <button
                type="button"
                onClick={() => onExecCommand('italic')}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-800 dark:text-white cursor-pointer"
                title="Itálico (Ctrl+I)"
              >
                <Italic size={15} />
              </button>
              <button
                type="button"
                onClick={() => onExecCommand('underline')}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-800 dark:text-white cursor-pointer"
                title="Sublinhado (Ctrl+U)"
              >
                <Underline size={15} />
              </button>
              <button
                type="button"
                onClick={() => onExecCommand('strikeThrough')}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-800 dark:text-white cursor-pointer"
                title="Tachado"
              >
                <Strikethrough size={15} />
              </button>
              <button
                type="button"
                onClick={() => onExecCommand('subscript')}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-800 dark:text-white cursor-pointer"
                title="Subscrito"
              >
                <Subscript size={15} />
              </button>
              <button
                type="button"
                onClick={() => onExecCommand('superscript')}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-800 dark:text-white cursor-pointer"
                title="Sobrescrito"
              >
                <Superscript size={15} />
              </button>
            </div>

            <div className="h-6 w-px bg-slate-300 dark:bg-slate-700 mx-0.5" />

            {/* Colors & Text Shading */}
            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1 px-2 rounded-xl border border-slate-200 dark:border-slate-700">
              <label className="flex items-center gap-1 cursor-pointer" title="Cor do Texto">
                <Palette size={14} className="text-slate-500" />
                <input type="color" value={textColor} onChange={handleTextColorChange} className="w-5 h-5 rounded cursor-pointer border-0" />
              </label>
              <label className="flex items-center gap-1 cursor-pointer" title="Marca-Texto / Destaque">
                <Highlighter size={14} className="text-amber-500" />
                <input type="color" value={bgColor} onChange={handleBgColorChange} className="w-5 h-5 rounded cursor-pointer border-0" />
              </label>
              <label className="flex items-center gap-1 cursor-pointer" title="Cor de Fundo do Bloco / Sombreamento">
                <PaintBucket size={14} className="text-blue-500" />
                <input
                  type="color"
                  onChange={(e) => onExecCommand('backColor', e.target.value)}
                  className="w-5 h-5 rounded cursor-pointer border-0"
                />
              </label>
            </div>

            <div className="h-6 w-px bg-slate-300 dark:bg-slate-700 mx-0.5" />

            {/* Alignments */}
            <div className="flex items-center gap-0.5 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => onExecCommand('justifyLeft')}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
                title="Alinhar à Esquerda"
              >
                <AlignLeft size={15} />
              </button>
              <button
                type="button"
                onClick={() => onExecCommand('justifyCenter')}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
                title="Centralizar"
              >
                <AlignCenter size={15} />
              </button>
              <button
                type="button"
                onClick={() => onExecCommand('justifyRight')}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
                title="Alinhar à Direita"
              >
                <AlignRight size={15} />
              </button>
              <button
                type="button"
                onClick={() => onExecCommand('justifyFull')}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
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
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
                title="Lista com Marcadores"
              >
                <List size={15} />
              </button>
              <button
                type="button"
                onClick={() => onExecCommand('insertOrderedList')}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
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
            <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => onExecCommand('formatBlock', '<h1>')}
                className="px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-xs font-bold cursor-pointer"
                title="Título 1"
              >
                <Heading1 size={15} />
              </button>
              <button
                type="button"
                onClick={() => onExecCommand('formatBlock', '<h2>')}
                className="px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-xs font-bold cursor-pointer"
                title="Título 2"
              >
                <Heading2 size={15} />
              </button>
              <button
                type="button"
                onClick={() => onExecCommand('formatBlock', '<h3>')}
                className="px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-xs font-bold cursor-pointer"
                title="Título 3"
              >
                <Heading3 size={15} />
              </button>
              <button
                type="button"
                onClick={() => onExecCommand('formatBlock', '<blockquote>')}
                className="px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-xs font-bold cursor-pointer"
                title="Citação"
              >
                <Quote size={15} />
              </button>
            </div>
          </>
        )}

        {activeTab === 'insert' && (
          <>
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

            {/* Page Break */}
            <button
              type="button"
              onClick={onInsertPageBreak}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            >
              <Minus size={16} />
              <span>Inserir Quebra de Página</span>
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
            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <span className="font-bold text-slate-500 flex items-center gap-1">
                <Sliders size={13} />
                <span>Régua (cm):</span>
              </span>

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
