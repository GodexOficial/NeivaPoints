import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Archive, Edit3, Gift, Image as ImageIcon, Link as LinkIcon, Plus, Power, RotateCcw, Save, Upload, X } from 'lucide-react';
import { RewardService, type Reward, type RewardInput } from '../../services/rewardService';
import { useLanguage } from '../../context/LanguageContext';
import { ConfirmDialog } from '../common/ConfirmDialog';

const EMPTY_FORM: RewardInput = {
  name: '', description: '', category: '', imageUrl: '', startDate: '', endDate: '', quantity: null,
  eligibilityRules: '', status: 'active', cycleType: 'monthly',
};
const MAX_REWARD_IMAGE_SIZE = 1_500_000;

interface RewardManagementProps { onFeedback: (message: string) => void; }

export const RewardManagement: React.FC<RewardManagementProps> = ({ onFeedback }) => {
  const { t } = useLanguage();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [form, setForm] = useState<RewardInput>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [archiveId, setArchiveId] = useState<string | null>(null);
  const [imageTab, setImageTab] = useState<'upload' | 'url'>('upload');
  const imageInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setRewards(await RewardService.getAll()); } catch (caught) { setError(caught instanceof Error ? caught.message : t('rewards.loadError')); } finally { setLoading(false); }
  }, [t]);
  useEffect(() => { void load(); }, [load]);

  const setField = <K extends keyof RewardInput>(field: K, value: RewardInput[K]) => setForm((current) => ({ ...current, [field]: value }));
  const edit = (reward: Reward) => {
    setEditingId(reward.id);
    setForm({ name: reward.name, description: reward.description, category: reward.category, imageUrl: reward.imageUrl, startDate: reward.startDate, endDate: reward.endDate, quantity: reward.quantity, eligibilityRules: reward.eligibilityRules, status: reward.status, cycleType: reward.cycleType });
    setImageTab(reward.imageUrl.startsWith('data:image/') ? 'upload' : 'url');
    setError(null);
  };
  const reset = () => { setEditingId(null); setForm(EMPTY_FORM); setImageTab('upload'); setError(null); };
  const handleImageFile = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError(t('rewards.imageInvalid')); return; }
    if (file.size > MAX_REWARD_IMAGE_SIZE) { setError(t('rewards.imageTooLarge')); return; }
    const reader = new FileReader();
    reader.onload = () => setField('imageUrl', String(reader.result || ''));
    reader.onerror = () => setError(t('rewards.imageReadError'));
    reader.readAsDataURL(file);
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError(null);
    try { if (editingId) await RewardService.update(editingId, form); else await RewardService.create(form); await load(); reset(); onFeedback(t('rewards.saved')); }
    catch (caught) { setError(caught instanceof Error ? caught.message : t('rewards.saveError')); }
    finally { setSaving(false); }
  };
  const toggle = async (reward: Reward) => { try { await RewardService.setStatus(reward.id, reward.status === 'active' ? 'inactive' : 'active'); await load(); onFeedback(t('rewards.statusUpdated')); } catch (caught) { setError(caught instanceof Error ? caught.message : t('rewards.saveError')); } };
  const archive = async () => { if (!archiveId) return; try { await RewardService.archive(archiveId); await load(); setArchiveId(null); onFeedback(t('rewards.archived')); } catch (caught) { setError(caught instanceof Error ? caught.message : t('rewards.saveError')); } };

  return <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:p-8">
    <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800"><div className="rounded-xl bg-amber-50 p-2.5 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400"><Gift size={22} /></div><div><h2 className="text-base font-bold text-slate-900 dark:text-white">{t('rewards.managementTitle')}</h2><p className="text-xs text-slate-500 dark:text-slate-400">{t('rewards.managementSubtitle')}</p></div></div>
    <form onSubmit={save} className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40 sm:grid-cols-2">
      <label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">{t('rewards.name')}</span><input required value={form.name} onChange={(event) => setField('name', event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white" placeholder={t('rewards.namePlaceholder')} /></label>
      <label><span className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">{t('rewards.category')}</span><input value={form.category} onChange={(event) => setField('category', event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white" placeholder={t('rewards.categoryPlaceholder')} /></label>
      <div className="sm:col-span-2"><span className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">{t('rewards.image')}</span><div className="mb-3 flex rounded-xl bg-slate-200/70 p-1 dark:bg-slate-800"><button type="button" onClick={() => setImageTab('upload')} className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold ${imageTab === 'upload' ? 'bg-white text-amber-700 shadow-xs dark:bg-slate-900 dark:text-amber-300' : 'text-slate-600 dark:text-slate-400'}`}><Upload size={14} />{t('rewards.imageUpload')}</button><button type="button" onClick={() => setImageTab('url')} className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold ${imageTab === 'url' ? 'bg-white text-amber-700 shadow-xs dark:bg-slate-900 dark:text-amber-300' : 'text-slate-600 dark:text-slate-400'}`}><LinkIcon size={14} />{t('rewards.imageUrl')}</button></div>{imageTab === 'upload' ? <><input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => handleImageFile(event.target.files?.[0])} /><button type="button" onClick={() => imageInputRef.current?.click()} className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-white p-5 text-center text-xs font-bold text-slate-600 hover:border-amber-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"><ImageIcon size={24} className="text-slate-400" />{t('rewards.imageChoose')}</button></> : <input type="text" value={form.imageUrl.startsWith('data:image/') ? '' : form.imageUrl} onChange={(event) => setField('imageUrl', event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white" placeholder={t('rewards.imagePlaceholder')} />}{form.imageUrl && <div className="mt-3 flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900"><img src={form.imageUrl} alt={t('rewards.imagePreview')} className="h-16 w-16 rounded-lg object-cover" /><span className="text-[11px] text-slate-500 dark:text-slate-400">{t('rewards.imagePreview')}</span></div>}<span className="mt-1 block text-[11px] text-slate-500 dark:text-slate-400">{t('rewards.imageHelp')}</span></div>
      <label><span className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">{t('rewards.cycleType')}</span><select value={form.cycleType} onChange={(event) => setField('cycleType', event.target.value as RewardInput['cycleType'])} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"><option value="monthly">{t('rewards.monthly')}</option><option value="special">{t('rewards.special')}</option></select></label>
      <label><span className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">{t('rewards.startDate')}</span><input required type="date" value={form.startDate} onChange={(event) => setField('startDate', event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white" /></label>
      <label><span className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">{t('rewards.endDate')}</span><input required type="date" value={form.endDate} onChange={(event) => setField('endDate', event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white" /></label>
      <label><span className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">{t('rewards.quantity')}</span><input type="number" min="0" value={form.quantity ?? ''} onChange={(event) => setField('quantity', event.target.value === '' ? null : Number(event.target.value))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white" placeholder={t('rewards.unlimited')} /></label>
      <label><span className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">{t('rewards.status')}</span><select value={form.status} onChange={(event) => setField('status', event.target.value as RewardInput['status'])} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"><option value="active">{t('rewards.active')}</option><option value="inactive">{t('rewards.inactive')}</option></select></label>
      <label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">{t('rewards.description')}</span><textarea value={form.description} onChange={(event) => setField('description', event.target.value)} className="min-h-20 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white" /></label>
      <label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">{t('rewards.eligibility')}</span><textarea value={form.eligibilityRules} onChange={(event) => setField('eligibilityRules', event.target.value)} className="min-h-20 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white" placeholder={t('rewards.eligibilityPlaceholder')} /></label>
      {error && <p className="sm:col-span-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
      <div className="flex justify-end gap-2 sm:col-span-2">{editingId && <button type="button" onClick={reset} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-bold text-slate-700 dark:border-slate-700 dark:text-slate-300"><X size={15} />{t('modal.cancel')}</button>}<button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-60">{editingId ? <Save size={15} /> : <Plus size={15} />}{saving ? t('rewards.saving') : editingId ? t('rewards.update') : t('rewards.create')}</button></div>
    </form>

    <div className="space-y-3">{loading ? <p className="text-xs text-slate-500">{t('rewards.loading')}</p> : rewards.length === 0 ? <p className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-xs text-slate-500 dark:border-slate-700">{t('rewards.empty')}</p> : rewards.map((reward) => <article key={reward.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-start gap-3">{reward.imageUrl ? <img src={reward.imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" /> : <div className="h-14 w-14 shrink-0 rounded-xl bg-amber-50 dark:bg-amber-950/40" />}<div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-bold text-slate-900 dark:text-white">{reward.name}</h3><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${reward.status === 'active' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>{reward.status === 'active' ? t('rewards.active') : t('rewards.inactive')}</span></div><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{reward.startDate} → {reward.endDate} · {reward.cycleType === 'monthly' ? t('rewards.monthly') : t('rewards.special')}{reward.quantity !== null ? ` · ${reward.quantity} ${t('rewards.available')}` : ` · ${t('rewards.unlimited')}`}</p><p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{reward.description || t('rewards.noDescription')}</p></div></div><div className="flex shrink-0 gap-2"><button type="button" onClick={() => edit(reward)} title={t('rewards.edit')} className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"><Edit3 size={15} /></button><button type="button" onClick={() => void toggle(reward)} title={t('rewards.toggle')} className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">{reward.status === 'active' ? <Power size={15} /> : <RotateCcw size={15} />}</button><button type="button" onClick={() => setArchiveId(reward.id)} title={t('rewards.archive')} className="rounded-xl border border-red-200 p-2 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400"><Archive size={15} /></button></div></article>)}</div>
    <ConfirmDialog isOpen={!!archiveId} title={t('rewards.archiveTitle')} message={t('rewards.archiveMessage')} description={t('rewards.archiveDescription')} confirmLabel={t('rewards.archive')} cancelLabel={t('modal.cancel')} variant="danger" onConfirm={() => void archive()} onCancel={() => setArchiveId(null)} />
  </section>;
};
