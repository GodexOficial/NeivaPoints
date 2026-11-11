import type { ReactNode } from 'react';
import { BookOpen, Clipboard, Grid3X3, LayoutGrid, Mic, Paintbrush, Search, Settings2, Table, Type } from 'lucide-react';
import { WordPopover } from './WordPopover';

/** Collapse whole groups into labelled menus before the ribbon needs another row. */
export function WordRibbonGroup({ label, children }: { label: string; children: ReactNode }) {
  const collapseAt = ['Estilos','Área de transferência','Tabela','Desenhar','Alinhamento','Dados'].includes(label) ? 1700 : ['Edição','Voz e revisão','Mesclar','Tamanho das células'].includes(label) ? 1300 : ['Parágrafo','Linhas e colunas'].includes(label) ? 950 : 620;
  const Icon = label === 'Fonte' ? Type : label === 'Área de transferência' ? Clipboard : label === 'Estilos' ? Paintbrush : label === 'Edição' ? Search : label === 'Voz e revisão' ? Mic : label === 'Parágrafo' ? LayoutGrid : label === 'Tabela' || label === 'Linhas e colunas' ? Table : label === 'Alinhamento' ? Grid3X3 : label.includes('Refer') ? BookOpen : Settings2;
  return <section className="word-ribbon-group" aria-label={label} data-ribbon-group={label} data-collapse-at={collapseAt}>
    <div className="word-ribbon-expanded"><div className="word-group-tools">{children}</div><span className="word-group-label">{label}</span></div>
    <div className="word-ribbon-collapsed"><WordPopover label={label} caption={label === 'Área de transferência' ? 'Colar / copiar' : label} icon={<Icon size={23} />} large>{() => <div className="word-ribbon-group-menu"><h3>{label}</h3><div className="word-group-tools">{children}</div></div>}</WordPopover></div>
  </section>;
}
