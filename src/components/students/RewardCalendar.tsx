import React from 'react';
import { CalendarDays, CheckCircle2, Clock3, Gift, History } from 'lucide-react';
import type { Reward } from '../../services/rewardService';
import { useLanguage } from '../../context/LanguageContext';

interface RewardCalendarProps { rewards: Reward[]; }

const getState = (reward: Reward, today: string) => {
  if (reward.status !== 'active') return 'inactive';
  if (reward.endDate < today) return 'ended';
  if (reward.startDate > today) return 'upcoming';
  return 'current';
};

export const RewardCalendar: React.FC<RewardCalendarProps> = ({ rewards }) => {
  const { t } = useLanguage();
  const today = new Date().toISOString().slice(0, 10);
  const sorted = [...rewards].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const current = sorted.filter((reward) => getState(reward, today) === 'current');
  const upcoming = sorted.filter((reward) => getState(reward, today) === 'upcoming');
  const ended = sorted.filter((reward) => getState(reward, today) === 'ended');
  const card = (reward: Reward, state: string) => <article key={reward.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">{reward.imageUrl ? <img src={reward.imageUrl} alt="" className="h-32 w-full object-cover" /> : <div className="h-10 bg-amber-50 dark:bg-amber-950/30" />}<div className="p-4"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-3"><div className="rounded-xl bg-amber-50 p-2 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"><Gift size={17} /></div><div className="min-w-0"><h3 className="truncate text-sm font-bold text-slate-900 dark:text-white">{reward.name}</h3><p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{reward.category || t('rewards.noCategory')}</p></div></div><span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{state === 'current' ? t('rewards.current') : state === 'upcoming' ? t('rewards.upcoming') : t('rewards.ended')}</span></div><div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400"><span className="inline-flex items-center gap-1"><CalendarDays size={13} />{reward.startDate} → {reward.endDate}</span>{reward.quantity !== null && <span>{reward.quantity} {t('rewards.available')}</span>}</div>{reward.description && <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{reward.description}</p>}{reward.eligibilityRules && <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">{t('rewards.eligibility')}: {reward.eligibilityRules}</p>}</div></article>;
  return <section className="space-y-5" aria-labelledby="reward-calendar-title"><div className="flex items-center gap-3"><div className="rounded-xl bg-amber-50 p-2.5 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"><CalendarDays size={20} /></div><div><h2 id="reward-calendar-title" className="text-base font-extrabold text-slate-900 dark:text-white">{t('rewards.calendarTitle')}</h2><p className="text-xs text-slate-500 dark:text-slate-400">{t('rewards.calendarSubtitle')}</p></div></div><div className="grid gap-4 lg:grid-cols-3"><div className="space-y-3"><h3 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-300"><CheckCircle2 size={15} />{t('rewards.currentSection')}</h3>{current.length ? current.map((reward) => card(reward, 'current')) : <p className="rounded-xl border border-dashed border-slate-300 p-4 text-xs text-slate-500 dark:border-slate-700">{t('rewards.noCurrent')}</p>}</div><div className="space-y-3"><h3 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-blue-700 dark:text-blue-300"><Clock3 size={15} />{t('rewards.upcomingSection')}</h3>{upcoming.length ? upcoming.map((reward) => card(reward, 'upcoming')) : <p className="rounded-xl border border-dashed border-slate-300 p-4 text-xs text-slate-500 dark:border-slate-700">{t('rewards.noUpcoming')}</p>}</div><div className="space-y-3"><h3 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300"><History size={15} />{t('rewards.endedSection')}</h3>{ended.length ? ended.map((reward) => card(reward, 'ended')) : <p className="rounded-xl border border-dashed border-slate-300 p-4 text-xs text-slate-500 dark:border-slate-700">{t('rewards.noEnded')}</p>}</div></div></section>;
};
