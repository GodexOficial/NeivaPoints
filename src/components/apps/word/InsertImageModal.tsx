import React, { useState, useRef } from 'react';
import { X, Upload, Link as LinkIcon, Image as ImageIcon } from 'lucide-react';
import type { BitmapImage } from '../../../types/doc';

interface InsertImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (img: BitmapImage) => void;
}

export const InsertImageModal: React.FC<InsertImageModalProps> = ({ isOpen, onClose, onInsert }) => {
  const [tab, setTab] = useState<'upload' | 'url'>('upload');
  const [imageUrl, setImageUrl] = useState('');
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [altText] = useState('Imagem do documento');
  const [caption, setCaption] = useState('');
  const [width, setWidth] = useState(400);
  const [align, setAlign] = useState<'left' | 'center' | 'right'>('center');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setPreviewSrc(event.target.result as string);
        if (!caption) {
          setCaption(file.name.replace(/\.[^/.]+$/, ''));
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleConfirm = () => {
    const finalSrc = tab === 'upload' ? previewSrc : imageUrl;
    if (!finalSrc) return;

    const image: BitmapImage = {
      id: `img-${Date.now()}`,
      src: finalSrc,
      alt: altText.trim() || 'Imagem',
      caption: caption.trim() || undefined,
      width,
      align,
    };

    onInsert(image);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Inserir Imagem (Bitmap)</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Envie um arquivo do seu computador ou informe o link da imagem</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => setTab('upload')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-xl transition-colors cursor-pointer ${
              tab === 'upload'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Upload size={14} />
            <span>Upload do Arquivo</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('url')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-xl transition-colors cursor-pointer ${
              tab === 'url'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <LinkIcon size={14} />
            <span>URL da Imagem</span>
          </button>
        </div>

        {tab === 'upload' ? (
          <div className="space-y-3">
            <input type="file" ref={fileInputRef} accept="image/*" onChange={handleFileUpload} className="hidden" />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 rounded-2xl p-6 text-center cursor-pointer transition-colors space-y-2 bg-slate-50 dark:bg-slate-800/40"
            >
              <ImageIcon size={32} className="mx-auto text-slate-400" />
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">Clique para selecionar imagem (PNG, JPG, WEBP, GIF)</div>
              <p className="text-[11px] text-slate-400">A imagem será salva diretamente junto ao documento</p>
            </div>

            {previewSrc && (
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 max-h-48 bg-slate-100 flex items-center justify-center">
                <img src={previewSrc} alt="Preview" className="max-h-44 object-contain" />
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">URL da Imagem</label>
              <input
                type="text"
                placeholder="https://exemplo.com/imagem.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full mt-1 text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            {imageUrl && (
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 max-h-48 bg-slate-100 flex items-center justify-center p-2">
                <img src={imageUrl} alt="Preview" className="max-h-44 object-contain" onError={() => {}} />
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Largura Exibição (px)</label>
            <input
              type="number"
              min={100}
              max={800}
              value={width}
              onChange={(e) => setWidth(Number(e.target.value))}
              className="w-full mt-1 text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Legenda da Imagem</label>
            <input
              type="text"
              placeholder="Ex: Figura 1 - Diagrama"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full mt-1 text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Alinhamento</label>
          <div className="flex gap-2 mt-1">
            {(['left', 'center', 'right'] as const).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAlign(a)}
                className={`flex-1 py-1.5 text-xs font-semibold capitalize rounded-xl border transition-colors cursor-pointer ${
                  align === a
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {a === 'left' ? 'Esquerda' : a === 'center' ? 'Centro' : 'Direita'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer">
            Cancelar
          </button>
          <button
            type="button"
            disabled={tab === 'upload' ? !previewSrc : !imageUrl}
            onClick={handleConfirm}
            className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-xs cursor-pointer"
          >
            Inserir Imagem
          </button>
        </div>
      </div>
    </div>
  );
};
