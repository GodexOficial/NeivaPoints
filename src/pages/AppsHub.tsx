import React, { useEffect, useRef, useState } from 'react';
import { AppWindow, Check, ExternalLink, FileText, GripVertical, ImagePlus, Link as LinkIcon, LoaderCircle, Pencil, Plus, Presentation, Table as TableIcon, Trash2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AppsService } from '../services/appsService';
import type { ExternalApp } from '../types';
import type { WordDocument } from '../types/doc';
import { createNewDocument } from '../services/docService';
import { WordEditor } from '../components/apps/word/WordEditor';

const GRID_SIZE = 36;
const STANDARD_APPS_COUNT = 3;
const MAX_COVER_SIZE = 1_500_000;
const APP_COLORS = ['from-blue-500 to-indigo-600', 'from-violet-500 to-purple-600', 'from-emerald-500 to-teal-600', 'from-orange-500 to-rose-500', 'from-cyan-500 to-blue-600', 'from-fuchsia-500 to-pink-600'];
type AppForm = { name: string; url: string; coverUrl: string };
const emptyForm: AppForm = { name: '', url: '', coverUrl: '' };
const sortedApps = (apps: ExternalApp[]) => [...apps].sort((a, b) => a.position - b.position || a.createdAt.localeCompare(b.createdAt));

const validHttpsUrl = (value: string) => {
  if (!value.startsWith('https://')) return false;
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
};

type StandardApp = {
  id: 'word' | 'excel' | 'powerpoint';
  name: string;
  description: string;
  displayPosition: number;
  source: 'standard';
  available: boolean;
};
type HubApp = (ExternalApp & { source: 'custom'; displayPosition: number }) | StandardApp;
const STANDARD_APPS: StandardApp[] = [
  { id: 'word', name: 'Word', description: 'Editor de texto', displayPosition: 0, source: 'standard', available: true },
  { id: 'excel', name: 'Excel', description: 'Planilhas', displayPosition: 1, source: 'standard', available: false },
  { id: 'powerpoint', name: 'PowerPoint', description: 'Apresentações', displayPosition: 2, source: 'standard', available: false },
];

interface AppsHubProps {
  onWordEditorChange: (isOpen: boolean) => void;
}

export const AppsHub: React.FC<AppsHubProps> = ({ onWordEditorChange }) => {
  const { isTeacher } = useAuth();
  const [apps, setApps] = useState<ExternalApp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isManaging, setIsManaging] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingApp, setEditingApp] = useState<ExternalApp | null | undefined>(undefined);
  const [form, setForm] = useState<AppForm>(emptyForm);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<WordDocument | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadApps = async () => {
    setIsLoading(true);
    setApps(sortedApps(await AppsService.getAll()).slice(0, GRID_SIZE - STANDARD_APPS_COUNT));
    setIsLoading(false);
  };

  useEffect(() => { void loadApps(); }, []);

  const saveOrder = async (next: ExternalApp[]) => {
    const ordered = sortedApps(next).map((app, position) => ({ ...app, position }));
    setApps(ordered);
    setApps(await AppsService.reorder(ordered));
  };

  const moveApp = async (appId: string, targetSlot: number) => {
    const ordered = sortedApps(apps);
    const fromIndex = ordered.findIndex((app) => app.id === appId);
    if (fromIndex < 0) return;
    const [moved] = ordered.splice(fromIndex, 1);
    ordered.splice(Math.min(targetSlot, ordered.length), 0, moved);
    setSelectedId(null);
    await saveOrder(ordered);
  };

  const openCreate = () => { setForm(emptyForm); setFormError(''); setEditingApp(null); };
  const openEdit = (app: ExternalApp) => { setForm({ name: app.name, url: app.url, coverUrl: app.coverUrl || '' }); setFormError(''); setEditingApp(app); };
  const closeModal = () => { if (!isSaving) { setEditingApp(undefined); setFormError(''); } };

  const handleCoverFile = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setFormError('Escolha uma imagem válida para a capa.'); return; }
    if (file.size > MAX_COVER_SIZE) { setFormError('A capa deve ter no máximo 1,5 MB.'); return; }
    const reader = new FileReader();
    reader.onload = () => setForm((current) => ({ ...current, coverUrl: String(reader.result) }));
    reader.onerror = () => setFormError('Não foi possível ler a imagem escolhida.');
    reader.readAsDataURL(file);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = form.name.trim();
    const url = form.url.trim();
    if (!name) { setFormError('Informe um nome para o aplicativo.'); return; }
    if (!validHttpsUrl(url)) { setFormError('O link precisa começar com https:// e ser válido.'); return; }
    setFormError(''); setIsSaving(true);
    try {
      if (editingApp) {
        const updated = await AppsService.update({ ...editingApp, name, url, coverUrl: form.coverUrl || undefined });
        setApps((current) => current.map((app) => app.id === updated.id ? updated : app));
      } else {
        if (apps.length >= GRID_SIZE - STANDARD_APPS_COUNT) { setFormError('A grade já possui os 36 aplicativos permitidos.'); return; }
        const created = await AppsService.create({ name, url, coverUrl: form.coverUrl || undefined, position: apps.length });
        setApps((current) => sortedApps([...current, created]));
      }
      setEditingApp(undefined);
    } finally { setIsSaving(false); }
  };

  const handleDelete = async (app: ExternalApp) => {
    if (!window.confirm(`Excluir o aplicativo “${app.name}”?`)) return;
    await AppsService.remove(app.id);
    await saveOrder(apps.filter((item) => item.id !== app.id));
  };

  const handleSlotClick = (slot: number) => {
    if (isTeacher && isManaging && selectedId) void moveApp(selectedId, slot - STANDARD_APPS_COUNT);
  };
  const handleAppManageClick = (app: ExternalApp) => {
    if (!isManaging) return;
    if (selectedId && selectedId !== app.id) void moveApp(selectedId, app.position);
    else setSelectedId(selectedId === app.id ? null : app.id);
  };
  const displayedApps: HubApp[] = [
    ...STANDARD_APPS,
    ...sortedApps(apps).map((app) => ({ ...app, source: 'custom' as const, displayPosition: app.position + STANDARD_APPS_COUNT })),
  ];
  const slots = Array.from({ length: GRID_SIZE }, (_, index) => ({ index, app: displayedApps.find((app) => app.displayPosition === index) }));

  const openStandardApp = (app: StandardApp) => {
    if (app.id !== 'word') return;
    setSelectedDocument(createNewDocument('Novo Documento Word'));
    onWordEditorChange(true);
  };

  if (selectedDocument) {
    return <WordEditor initialDocument={selectedDocument} onBackToHub={() => { setSelectedDocument(null); onWordEditorChange(false); }} />;
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="rounded-3xl border border-blue-200/80 bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 p-6 text-white shadow-xl dark:border-blue-900/60 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-xl bg-white/15 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider"><AppWindow size={14} /> Central de aplicativos</div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Seus atalhos em um só lugar</h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-blue-100">{isTeacher ? 'Adicione links, escolha uma capa e organize a grade como preferir. Os alunos sempre verão esta mesma ordem.' : 'Escolha um aplicativo para abri-lo em uma nova aba.'}</p>
          </div>
          {isTeacher && <button type="button" onClick={() => { setIsManaging((current) => !current); setSelectedId(null); }} className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-extrabold shadow-lg transition-colors cursor-pointer ${isManaging ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-white text-blue-700 hover:bg-blue-50'}`}>
            {isManaging ? <Check size={18} /> : <Pencil size={18} />}{isManaging ? 'Concluir edição' : 'Editar grade'}
          </button>}
        </div>
      </section>

      {isTeacher && isManaging && <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/35 dark:text-amber-100 sm:flex sm:items-center sm:justify-between">
        <div className="text-sm"><strong>Modo de edição:</strong> arraste um ícone para outro espaço ou clique em um ícone e depois no destino.</div>
        <button type="button" onClick={openCreate} disabled={apps.length >= GRID_SIZE - STANDARD_APPS_COUNT} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-extrabold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:mt-0 cursor-pointer"><Plus size={16} />Adicionar aplicativo</button>
      </section>}

      <section aria-label="Grade de aplicativos" className="rounded-3xl border border-slate-200 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <div className="mb-4 flex items-center justify-between px-1"><h2 className="text-base font-extrabold text-slate-900 dark:text-white">Aplicativos</h2><span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{displayedApps.length} de {GRID_SIZE}</span></div>
        {isLoading ? <div className="flex min-h-72 items-center justify-center text-sm font-semibold text-slate-500"><LoaderCircle className="mr-2 animate-spin" size={18} /> Carregando aplicativos…</div> : <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-6">
            {slots.map(({ index, app }) => <div key={index} onDragOver={(event) => { if (isManaging && isTeacher && index >= STANDARD_APPS_COUNT) event.preventDefault(); }} onDrop={(event) => { event.preventDefault(); const appId = event.dataTransfer.getData('text/neivapoints-app') || draggedId; if (isManaging && appId && index >= STANDARD_APPS_COUNT) void moveApp(appId, index - STANDARD_APPS_COUNT); setDraggedId(null); }} onClick={() => !app && handleSlotClick(index)} className={`relative flex aspect-square min-w-0 items-center justify-center rounded-2xl transition-colors ${app ? '' : isManaging ? 'cursor-pointer border-2 border-dashed border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-800/40 dark:hover:border-blue-700 dark:hover:bg-blue-950/30' : 'border border-slate-100/70 bg-slate-50/45 dark:border-slate-800/70 dark:bg-slate-800/20'}`} aria-label={app ? undefined : `Espaço ${index + 1} da grade`}>
              {app && <AppTile app={app} colorIndex={index} editable={isTeacher && isManaging && app.source === 'custom'} selected={app.source === 'custom' && selectedId === app.id} onOpenStandard={() => app.source === 'standard' && openStandardApp(app)} onEdit={() => { if (app.source === 'custom') openEdit(app); }} onDelete={() => { if (app.source === 'custom') void handleDelete(app); }} onManageClick={() => { if (app.source === 'custom') handleAppManageClick(app); }} onDragStart={(event) => { if (app.source !== 'custom') return; setDraggedId(app.id); event.dataTransfer.setData('text/neivapoints-app', app.id); event.dataTransfer.effectAllowed = 'move'; }} onDragEnd={() => setDraggedId(null)} />}
            </div>)}
          </div>
          {apps.length === 0 && !isManaging && <div className="py-4 text-center text-sm text-slate-500 dark:text-slate-400">{isTeacher ? 'Entre no modo de edição para adicionar o primeiro aplicativo.' : 'Ainda não há aplicativos disponíveis.'}</div>}
        </>}
      </section>

      {editingApp !== undefined && <AppFormModal app={editingApp} form={form} error={formError} isSaving={isSaving} fileInputRef={fileInputRef} onClose={closeModal} onChange={(patch) => setForm((current) => ({ ...current, ...patch }))} onFile={handleCoverFile} onSave={handleSave} />}
    </div>
  );
};

interface AppTileProps { app: HubApp; colorIndex: number; editable: boolean; selected: boolean; onOpenStandard: () => void; onEdit: () => void; onDelete: () => void; onManageClick: () => void; onDragStart: (event: React.DragEvent<HTMLButtonElement>) => void; onDragEnd: () => void; }
const AppTile: React.FC<AppTileProps> = ({ app, colorIndex, editable, selected, onOpenStandard, onEdit, onDelete, onManageClick, onDragStart, onDragEnd }) => {
  const defaultIcon = app.source === 'standard' ? (app.id === 'word' ? <FileText size={36} strokeWidth={2.3} className="text-white" /> : app.id === 'excel' ? <TableIcon size={36} strokeWidth={2.3} className="text-white" /> : <Presentation size={36} strokeWidth={2.3} className="text-white" />) : <LinkIcon size={36} strokeWidth={2.3} className="text-white" />;
  const icon = <div className={`flex h-full w-full items-center justify-center overflow-hidden rounded-[1.1rem] bg-gradient-to-br shadow-md ring-1 ring-black/5 ${APP_COLORS[colorIndex % APP_COLORS.length]}`}>{'coverUrl' in app && app.coverUrl ? <img src={app.coverUrl} alt="" className="h-full w-full object-cover" /> : defaultIcon}</div>;
  if (app.source === 'standard') return <button type="button" onClick={onOpenStandard} disabled={!app.available} className={`group flex h-full w-full flex-col items-center justify-center gap-2 rounded-2xl p-1.5 text-center outline-none ${app.available ? 'cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500' : 'cursor-not-allowed opacity-60'}`} title={app.available ? `Abrir ${app.name}` : `${app.name}: em breve`}><div className="relative h-[min(62%,7.5rem)] w-[min(62%,7.5rem)] transition-transform duration-200 group-hover:scale-105">{icon}</div><span className="w-full truncate px-1 text-xs font-bold text-slate-700 dark:text-slate-200">{app.name}</span><span className={`-mt-1 text-[10px] font-bold ${app.available ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>{app.available ? 'Padrão' : 'Em breve'}</span></button>;
  if (!editable) return <a href={app.url} target="_blank" rel="noopener noreferrer" className="group flex h-full w-full flex-col items-center justify-center gap-2 rounded-2xl p-1.5 text-center outline-none focus-visible:ring-2 focus-visible:ring-blue-500" title={`Abrir ${app.name} em uma nova aba`}><div className="relative h-[min(62%,7.5rem)] w-[min(62%,7.5rem)] transition-transform duration-200 group-hover:scale-105 group-focus-visible:scale-105">{icon}<ExternalLink size={12} className="absolute -right-1 -top-1 rounded-full bg-white p-0.5 text-slate-700 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 dark:bg-slate-800 dark:text-slate-200" /></div><span className="w-full truncate px-1 text-xs font-bold text-slate-700 dark:text-slate-200">{app.name}</span></a>;
  return <button type="button" draggable onDragStart={onDragStart} onDragEnd={onDragEnd} onClick={onManageClick} className={`group relative flex h-full w-full flex-col items-center justify-center gap-2 rounded-2xl p-1.5 text-center outline-none cursor-grab active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-blue-500 ${selected ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-900' : ''}`} title="Arraste ou clique para escolher este aplicativo"><div className="h-[min(62%,7.5rem)] w-[min(62%,7.5rem)]">{icon}</div><span className="w-full truncate px-1 text-xs font-bold text-slate-700 dark:text-slate-200">{app.name}</span><span className="absolute left-1 top-1 rounded-md bg-white/90 p-1 text-slate-500 shadow-sm dark:bg-slate-800/90"><GripVertical size={13} /></span><span className="absolute right-1 top-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"><span role="button" tabIndex={0} onClick={(event) => { event.stopPropagation(); onEdit(); }} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); onEdit(); } }} className="rounded-md bg-white p-1 text-blue-600 shadow-sm dark:bg-slate-800" aria-label={`Editar ${app.name}`}><Pencil size={13} /></span><span role="button" tabIndex={0} onClick={(event) => { event.stopPropagation(); onDelete(); }} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); onDelete(); } }} className="rounded-md bg-white p-1 text-red-600 shadow-sm dark:bg-slate-800" aria-label={`Excluir ${app.name}`}><Trash2 size={13} /></span></span></button>;
};

interface AppFormModalProps { app: ExternalApp | null; form: AppForm; error: string; isSaving: boolean; fileInputRef: React.RefObject<HTMLInputElement | null>; onClose: () => void; onChange: (patch: Partial<AppForm>) => void; onFile: (file?: File) => void; onSave: (event: React.FormEvent) => void; }
const AppFormModal: React.FC<AppFormModalProps> = ({ app, form, error, isSaving, fileInputRef, onClose, onChange, onFile, onSave }) => <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="app-form-title"><form onSubmit={onSave} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900"><div className="mb-5 flex items-start justify-between gap-4"><div><h2 id="app-form-title" className="text-xl font-black text-slate-900 dark:text-white">{app ? 'Editar aplicativo' : 'Novo aplicativo'}</h2><p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">O aluno abrirá este link em uma nova aba.</p></div><button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer" aria-label="Fechar"><X size={19} /></button></div><div className="space-y-4"><label className="block text-sm font-bold text-slate-700 dark:text-slate-200">Nome<input autoFocus value={form.name} onChange={(event) => onChange({ name: event.target.value })} maxLength={48} placeholder="Ex.: Khan Academy" className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:focus:ring-blue-950" /></label><label className="block text-sm font-bold text-slate-700 dark:text-slate-200">Link externo<input value={form.url} onChange={(event) => onChange({ url: event.target.value })} type="url" inputMode="url" placeholder="https://exemplo.com" pattern="https://.*" className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:focus:ring-blue-950" /><span className="mt-1 block text-[11px] font-medium text-slate-500">Use um endereço que comece com https://</span></label><div><span className="block text-sm font-bold text-slate-700 dark:text-slate-200">Capa <span className="font-medium text-slate-400">(opcional)</span></span><div className="mt-1.5 flex items-center gap-3"><div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600">{form.coverUrl ? <img src={form.coverUrl} alt="Prévia da capa" className="h-full w-full object-cover" /> : <ImagePlus className="m-4 text-white" size={24} />}</div><div className="flex flex-wrap gap-2"><input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => onFile(event.target.files?.[0])} /><button type="button" onClick={() => fileInputRef.current?.click()} className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer">Escolher imagem</button>{form.coverUrl && <button type="button" onClick={() => onChange({ coverUrl: '' })} className="rounded-xl px-2 py-2 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer">Remover</button>}</div></div></div></div>{error && <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}<div className="mt-6 flex justify-end gap-2"><button type="button" onClick={onClose} disabled={isSaving} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer">Cancelar</button><button type="submit" disabled={isSaving} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-blue-700 disabled:opacity-60 cursor-pointer">{isSaving && <LoaderCircle size={15} className="animate-spin" />}{app ? 'Salvar alterações' : 'Criar aplicativo'}</button></div></form></div>;
