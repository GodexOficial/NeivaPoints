import { useEffect, useRef, useState } from 'react';
import { EngagementService, type AttendanceResponse, type EngagementSettings } from '../services/engagementService';

interface View { session: AttendanceResponse | null; busy: boolean; loading: boolean; error: boolean; message: string; now: number }
const idleMessage = 'Clique em “Estou logado” para iniciar sua presença.';
const date = (value?: string) => value ? Date.parse(value) : NaN;
export function useAttendanceXp(studentId: string, points: number, settings: EngagementSettings, onPointsChanged: (points?: number) => void) {
  const latest = useRef({ settings,onPointsChanged,points }); latest.current = { settings,onPointsChanged,points };
  const actions = useRef({ start: () => {}, retry: () => {} });
  const [view,setView] = useState<View>({ session:null,busy:false,loading:true,error:false,message:idleMessage,now:Date.now() });
  useEffect(() => {
    let mounted = true, busy = false, session: AttendanceResponse | null = null, failures = 0;
    let nextAttempt = 0, nextPoll = performance.now()+30000, lastPoints = latest.current.points;
    let anchor = { server:Date.now(),mono:performance.now() };
    const cacheKey = `login_xp_session_v2:${studentId}`;
    const now = () => anchor.server + performance.now()-anchor.mono;
    const cache = () => { try { return JSON.parse(localStorage.getItem(cacheKey) || 'null') as AttendanceResponse | null; } catch { return null; } };
    const persist = (value: AttendanceResponse | null) => {
      try {
        if (!value?.sessionId || value.closed) { localStorage.removeItem(cacheKey); return; }
        const raw = JSON.stringify({ sessionId:value.sessionId,activeUntil:value.activeUntil,nextAwardAt:value.nextAwardAt,xpPerMinute:value.xpPerMinute });
        if (localStorage.getItem(cacheKey) !== raw) localStorage.setItem(cacheKey,raw);
      } catch { /* The database, never storage, enforces credit limits. */ }
    };
    const apply = (result: AttendanceResponse, operation: 'status' | 'start' | 'claim') => {
      if (!mounted) return;
      const server = date(result.serverNow); if (Number.isFinite(server)) anchor = { server,mono:performance.now() };
      const previous = session;
      if (result.version === 2) session = result.sessionId ? result : null;
      else if (operation === 'claim' && previous) {
        session = { ...previous,...result };
        if (result.awarded) session.nextAwardAt = new Date(now()+60000).toISOString();
        if (['confirmation_required','outside_schedule','invalid_session','student_not_found'].includes(result.reason || '')) session = { ...session,locked:false,closed:true };
      } else if (result.sessionId || result.locked) {
        const stored = previous || cache();
        session = { ...stored,...result };
        if (!session.activeUntil && result.sessionId) session.activeUntil = new Date(now()+latest.current.settings.confirmationMinutes*60000).toISOString();
        if (!session.nextAwardAt) session.nextAwardAt = new Date(now()+60000).toISOString();
        if (result.sessionId) session.locked = true;
      } else session = null;
      persist(session);
      if (result.points !== undefined && result.points !== lastPoints) {
        lastPoints = result.points; latest.current.onPointsChanged(result.points);
      } else if (result.awarded && result.points === undefined) latest.current.onPointsChanged();
      const active = session?.locked && !session.closed && date(session.activeUntil)>now();
      const pending = session?.sessionId && !session.closed && (session.claimable || date(session.activeUntil)<=now());
      let message = active ? 'Presença ativa. Os créditos são confirmados pelo servidor.' : pending ? 'Conferindo os últimos minutos da sessão…' : idleMessage;
      if (result.awarded) message = result.amount !== undefined ? `+${result.amount} XP confirmado${result.creditedMinutes && result.creditedMinutes > 1 ? ` (${result.creditedMinutes} minutos recuperados)` : ''}.${active ? '' : ' Confirme novamente para continuar.'}` : 'Crédito confirmado no servidor. Atualizando seu saldo…';
      if (result.reason === 'outside_schedule') message = `A presença funciona das ${latest.current.settings.startTime} às ${latest.current.settings.endTime} (horário de Fortaleza).`;
      if (result.reason === 'insufficient_time') message = 'Falta menos de um minuto para encerrar o horário de presença. Retorne no próximo período.';
      if (session?.locked && !session.sessionId) message = 'Há uma sessão ativa em outro dispositivo. Aguarde o fim ou aplique a atualização SQL para retomá-la aqui.';
      failures = 0; nextAttempt = 0; nextPoll = performance.now()+30000;
      setView({session,busy:false,loading:false,error:false,message,now:now()});
    };
    const request = async (operation: 'status' | 'start' | 'claim') => {
      if (!mounted || busy) return;
      const id = session?.sessionId; if (operation === 'claim' && !id) return;
      busy = true; setView(v=>({...v,busy:true}));
      try {
        const result = operation === 'start' ? await EngagementService.startSession(studentId) : operation === 'claim' ? await EngagementService.claimMinute(id!) : await EngagementService.getSessionStatus(studentId);
        apply(result,operation);
      } catch (error) {
        if (!mounted) return;
        failures++; nextAttempt = performance.now()+Math.min(30000,2000*2**Math.min(failures-1,4));
        setView(v=>({...v,loading:false,busy:false,error:true,message:error instanceof Error ? error.message : 'Sem confirmação do servidor. Seu saldo não foi alterado.'}));
      } finally { busy = false; if (mounted) setView(v=>v.busy ? {...v,busy:false}:v); }
    };
    const tick = () => {
      if (!mounted) return; const time = now(), mono = performance.now();
      setView(v=>({...v,now:time}));
      if (busy || mono<nextAttempt || !navigator.onLine) return;
      if (session?.sessionId && !session.closed && (session.claimable || time>=date(session.nextAwardAt) || time>=date(session.activeUntil))) void request('claim');
      else if (mono>=nextPoll || failures) void request('status');
    };
    const sync = () => { if (!mounted || document.visibilityState==='hidden') return; nextPoll=0; nextAttempt=0; tick(); };
    const storage = (event: StorageEvent) => { if (event.key===cacheKey || event.key===`login_xp_lock:${studentId}`) sync(); };
    actions.current = { start:()=>{ if (session?.locked && date(session.activeUntil)>now()) return; void request('start'); },retry:()=>{nextAttempt=0;void request(session?.sessionId && !session.closed ? 'claim':'status');} };
    setView({session:null,busy:false,loading:true,error:false,message:'Verificando sua presença…',now:now()});
    void request('status'); const timer = window.setInterval(tick,1000);
    window.addEventListener('online',sync); window.addEventListener('focus',sync); window.addEventListener('storage',storage); document.addEventListener('visibilitychange',sync);
    return () => { mounted=false; window.clearInterval(timer); window.removeEventListener('online',sync);window.removeEventListener('focus',sync);window.removeEventListener('storage',storage);document.removeEventListener('visibilitychange',sync);actions.current={start:()=>{},retry:()=>{}}; };
  }, [studentId]);
  const active = Boolean(view.session?.locked && !view.session.closed && date(view.session.activeUntil)>view.now);
  const seconds = active ? Math.max(0,Math.ceil((date(view.session?.nextAwardAt)-view.now)/1000)) : 0;
  const remaining = active ? Math.max(0,Math.ceil((date(view.session?.activeUntil)-view.now)/1000)) : 0;
  return {...view,active,seconds,remaining,start:()=>actions.current.start(),retry:()=>actions.current.retry()};
}
