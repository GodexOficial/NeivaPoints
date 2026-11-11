import { CircleCheck, RefreshCw, Timer, WifiOff } from 'lucide-react';
import type { EngagementSettings } from '../../services/engagementService';
import type { StudentWithStats } from '../../types';
import { useAttendanceXp } from '../../hooks/useAttendanceXp';
import { ProgressBar } from '../common/ProgressBar';
import { LevelBadge } from '../common/LevelBadge';

interface Props { student: StudentWithStats; settings: EngagementSettings; onPointsChanged: (points?: number) => void }
const clock = (seconds: number) => `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
export function LoginXpTracker({ student,settings,onPointsChanged }: Props) {
  const xp = useAttendanceXp(student.id,student.points,settings,onPointsChanged);
  const rate = xp.session?.xpPerMinute || settings.xpPerMinute;
  const cycle = xp.active ? Math.max(0,Math.min(100,(60-xp.seconds)/60*100)) : 0;
  return <section aria-label="XP por presença e progressão" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:p-5 dark:border-emerald-900/70 dark:bg-emerald-950/30">
    <div className="flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="flex w-full min-w-0 items-center gap-3 sm:w-auto sm:flex-1">
        <div className="relative h-14 w-14 shrink-0 rounded-full p-1" style={{background:`conic-gradient(#059669 ${cycle*3.6}deg,#bbf7d0 0)`}} aria-label={xp.active ? `${xp.seconds} segundos até a próxima conferência de XP` : 'Presença inativa'}><div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-white text-emerald-700 dark:bg-slate-900 dark:text-emerald-300">{xp.error ? <WifiOff size={18}/>:<Timer size={18}/>}<span className="mt-1 text-[10px] font-extrabold">{xp.active ? xp.seconds ? clock(xp.seconds) : 'Conferindo' : 'XP'}</span></div></div>
        <div className="min-w-0"><h3 className="text-sm font-extrabold text-emerald-950 dark:text-emerald-100">XP por presença {xp.active && <span className="ml-1 text-xs font-semibold">· +{rate} XP/min</span>}</h3><p role="status" aria-live="polite" className="mt-1 break-words text-xs text-emerald-800 dark:text-emerald-200">{xp.message}</p>{xp.active && <p className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-300">Nova confirmação em {clock(xp.remaining)}. O progresso abaixo mostra apenas XP já salvo.</p>}</div>
      </div>
      {!xp.active && !xp.error && <button type="button" onClick={xp.start} disabled={xp.busy || xp.loading} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-extrabold text-white hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60"><CircleCheck size={18}/>{xp.loading ? 'Verificando sessão…' : xp.busy ? 'Confirmando…' : 'Estou logado'}</button>}
      {xp.error && <button type="button" onClick={xp.retry} disabled={xp.busy} className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-emerald-500 px-3 py-2 text-xs font-bold text-emerald-900 dark:text-emerald-100"><RefreshCw size={16}/>{xp.busy ? 'Conferindo…' : 'Tentar novamente'}</button>}
    </div>
    <div className="mt-4 border-t border-emerald-200 pt-4 dark:border-emerald-900/70" aria-label="Progressão de nível">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><LevelBadge level={student.level} size="sm"/><span className="text-xs font-bold text-emerald-950 dark:text-emerald-100">{student.points.toLocaleString('pt-BR')} XP no total</span></div><span className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">{student.pointsInCurrentLevel}/100 XP · faltam {student.pointsToNextLevel} para o nível {student.level+1}</span></div>
      <ProgressBar progress={student.progressPercentage} level={student.level} size="lg" showLabel={false}/>
    </div>
  </section>;
}
