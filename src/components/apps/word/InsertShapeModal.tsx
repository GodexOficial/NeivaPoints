import React, { useState } from 'react';
import { X, Square, Circle, Triangle, ArrowRight, ArrowLeft, Star, Heart, Minus } from 'lucide-react';
import type { VectorShape } from '../../../types/doc';

interface InsertShapeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (shape: VectorShape) => void;
}

export const InsertShapeModal: React.FC<InsertShapeModalProps> = ({ isOpen, onClose, onInsert }) => {
  const [selectedType, setSelectedType] = useState<VectorShape['type']>('rectangle');
  const [fillColor, setFillColor] = useState('#3b82f6');
  const [borderColor, setBorderColor] = useState('#1d4ed8');
  const [borderWidth, setBorderWidth] = useState(2);
  const [width, setWidth] = useState(180);
  const [height, setHeight] = useState(100);
  const [align, setAlign] = useState<'left' | 'center' | 'right'>('center');
  const [label, setLabel] = useState('');

  if (!isOpen) return null;

  const shapeTypes: { type: VectorShape['type']; label: string; icon: React.FC<{ size?: number }> }[] = [
    { type: 'rectangle', label: 'Retângulo', icon: Square },
    { type: 'rounded-rectangle', label: 'Retângulo Arredondado', icon: Square },
    { type: 'circle', label: 'Círculo / Elipse', icon: Circle },
    { type: 'triangle', label: 'Triângulo', icon: Triangle },
    { type: 'arrow-right', label: 'Seta para Direita', icon: ArrowRight },
    { type: 'arrow-left', label: 'Seta para Esquerda', icon: ArrowLeft },
    { type: 'star', label: 'Estrela', icon: Star },
    { type: 'heart', label: 'Coração', icon: Heart },
    { type: 'line', label: 'Linha Guia', icon: Minus },
  ];

  const handleConfirm = () => {
    const shape: VectorShape = {
      id: `shape-${Date.now()}`,
      type: selectedType,
      label: label.trim() || undefined,
      fillColor,
      borderColor,
      borderWidth,
      width,
      height,
      align,
    };
    onInsert(shape);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Inserir Vetor / Forma Geométrica</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Escolha o tipo de vetor, cor, borda e tamanho para adicionar ao documento</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {/* Selection Grid */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Tipo de Vetor</label>
          <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto p-1">
            {shapeTypes.map((item) => {
              const Icon = item.icon;
              const isSelected = selectedType === item.type;
              return (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => setSelectedType(item.type)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border text-xs font-semibold transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-700 dark:text-blue-400 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon size={20} />
                  <span className="text-[11px] text-center">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Customization controls */}
        <div className="grid grid-cols-2 gap-4 pt-1">
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Cor de Preenchimento</label>
            <div className="flex items-center gap-2 mt-1">
              <input type="color" value={fillColor} onChange={(e) => setFillColor(e.target.value)} className="w-8 h-8 rounded-lg cursor-pointer border border-slate-300 dark:border-slate-700" />
              <input type="text" value={fillColor} onChange={(e) => setFillColor(e.target.value)} className="flex-1 text-xs font-mono p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white" />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Cor da Borda</label>
            <div className="flex items-center gap-2 mt-1">
              <input type="color" value={borderColor} onChange={(e) => setBorderColor(e.target.value)} className="w-8 h-8 rounded-lg cursor-pointer border border-slate-300 dark:border-slate-700" />
              <input type="text" value={borderColor} onChange={(e) => setBorderColor(e.target.value)} className="flex-1 text-xs font-mono p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Largura (px)</label>
            <input type="number" min={20} max={600} value={width} onChange={(e) => setWidth(Number(e.target.value))} className="w-full mt-1 text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white" />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Altura (px)</label>
            <input type="number" min={10} max={600} value={height} onChange={(e) => setHeight(Number(e.target.value))} className="w-full mt-1 text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white" />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Espessura Borda</label>
            <input type="number" min={0} max={10} value={borderWidth} onChange={(e) => setBorderWidth(Number(e.target.value))} className="w-full mt-1 text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white" />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Texto Dentro da Forma (Opcional)</label>
          <input type="text" placeholder="Ex: Título ou Legenda" value={label} onChange={(e) => setLabel(e.target.value)} className="w-full mt-1 text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white" />
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
          <button type="button" onClick={handleConfirm} className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs cursor-pointer">
            Inserir Vetor
          </button>
        </div>
      </div>
    </div>
  );
};
