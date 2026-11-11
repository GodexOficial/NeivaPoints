import React, { useCallback, useEffect, useRef, useState } from "react";
import { CircleCheck, LockKeyhole, Timer } from "lucide-react";
import { EngagementService, type EngagementSettings } from "../../services/engagementService";

interface Props {
  studentId: string;
  settings: EngagementSettings;
  onPointsChanged: () => void;
}

/** The visual timer is informational; all XP awards are validated by the database. */
export const LoginXpTracker: React.FC<Props> = ({ studentId, settings, onPointsChanged }) => {
  const sessionId = useRef<string | null>(null);
  const claimInFlight = useRef(false);
  const minuteCycleStartedAt = useRef(Date.now());
  const [sessionReady, setSessionReady] = useState(false);
  const [starting, setStarting] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [clockNow, setClockNow] = useState(Date.now());
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [status, setStatus] = useState("Confirme que você está logado para iniciar o XP automático.");
  const lockStorageKey = `login_xp_lock:${studentId}`;

  useEffect(() => {
    let mounted = true;
    const syncSessionStatus = async () => {
      try {
        const result = await EngagementService.getSessionStatus(studentId);
        if (!mounted) return;
        const until = result.activeUntil ? Date.parse(result.activeUntil) : NaN;
        if (result.locked && Number.isFinite(until) && until > Date.now()) {
          setLockedUntil(until);
          setStatus("Você já tem uma sessão de XP ativa. Aguarde o término do período configurado.");
          window.localStorage.setItem(lockStorageKey, String(until));
        } else {
          setLockedUntil(null);
          window.localStorage.removeItem(lockStorageKey);
        }
      } catch {
        if (mounted) setStatus("Não foi possível verificar se há uma sessão de XP ativa.");
      } finally {
        if (mounted) setStatusLoading(false);
      }
    };

    const storedUntil = Number(window.localStorage.getItem(lockStorageKey));
    if (storedUntil > Date.now()) setLockedUntil(storedUntil);
    void syncSessionStatus();

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== lockStorageKey || !event.newValue) return;
      const until = Number(event.newValue);
      if (until > Date.now()) {
        setLockedUntil(until);
        setSessionReady(false);
        sessionId.current = null;
        setStatus("Outra aba iniciou sua sessão de XP. Aguarde o término do período configurado.");
      }
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void syncSessionStatus();
    };
    window.addEventListener("storage", handleStorage);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      mounted = false;
      sessionId.current = null;
      window.removeEventListener("storage", handleStorage);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [studentId, lockStorageKey]);

  useEffect(() => {
    const interval = window.setInterval(() => setClockNow(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, []);

  const startXpSession = async () => {
    if (starting || sessionReady || statusLoading || (lockedUntil !== null && lockedUntil > Date.now())) return;
    setStarting(true);
    try {
      const { sessionId: id, reason, activeUntil } = await EngagementService.startSession(studentId);
      if (!id) {
        if (reason === "session_active" && activeUntil) {
          const until = Date.parse(activeUntil);
          if (Number.isFinite(until) && until > Date.now()) {
            setLockedUntil(until);
            window.localStorage.setItem(lockStorageKey, String(until));
          }
          setStatus("Você já tem uma sessão de XP ativa. Aguarde o término do período configurado.");
        } else {
          setStatus(reason === "outside_schedule" ? `O XP por presença funciona das ${settings.startTime} às ${settings.endTime}.` : "Não foi possível iniciar o XP automático.");
        }
        return;
      }
      sessionId.current = id;
      const until = activeUntil ? Date.parse(activeUntil) : Date.now() + settings.confirmationMinutes * 60_000;
      setLockedUntil(until);
      window.localStorage.setItem(lockStorageKey, String(until));
      minuteCycleStartedAt.current = Date.now();
      setSecondsLeft(60);
      setSessionReady(true);
      setStatus(`Sessão ativa: +${settings.xpPerMinute} XP a cada minuto.`);
    } catch (error: unknown) {
      setStatus(`Não foi possível iniciar o XP: ${error instanceof Error ? error.message : "erro no Supabase"}`);
    } finally {
      setStarting(false);
    }
  };

  const claimCurrentMinute = useCallback(async () => {
    if (!sessionId.current || claimInFlight.current) return;
    const elapsed = Date.now() - minuteCycleStartedAt.current;
    if (elapsed < 60_000) return;

    claimInFlight.current = true;
    try {
      const result = await EngagementService.claimMinute(sessionId.current);
      if (result.awarded) {
        minuteCycleStartedAt.current = Date.now();
        setSecondsLeft(60);
        setStatus(`XP recebido: +${settings.xpPerMinute} neste minuto.`);
        onPointsChanged();
      } else if (result.reason === "outside_schedule" || result.reason === "confirmation_required") {
        setSessionReady(false);
        setStatus("A sessão foi encerrada: é necessário confirmar novamente para continuar.");
      }
    } catch (error: unknown) {
      setStatus(`XP não creditado: ${error instanceof Error ? error.message : "erro no Supabase"}`);
    } finally {
      claimInFlight.current = false;
    }
  }, [onPointsChanged, settings.xpPerMinute]);

  useEffect(() => {
    if (!sessionReady) return;
    const interval = window.setInterval(async () => {
      await claimCurrentMinute();
    }, 60_000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void claimCurrentMinute();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [claimCurrentMinute, sessionReady]);

  useEffect(() => {
    if (!sessionReady || lockedUntil === null) return;
    const timeout = window.setTimeout(() => {
      setSessionReady(false);
      setStatus("Sua sessão de XP de 10 minutos foi encerrada.");
      sessionId.current = null;
    }, Math.max(0, lockedUntil - Date.now()));
    return () => window.clearTimeout(timeout);
  }, [sessionReady, lockedUntil]);

  useEffect(() => {
    if (!sessionReady) return;
    const updateCountdown = () => {
      const elapsed = Date.now() - minuteCycleStartedAt.current;
      setSecondsLeft(Math.max(0, Math.ceil((60_000 - elapsed) / 1_000)));
    };
    updateCountdown();
    const interval = window.setInterval(updateCountdown, 1_000);
    return () => window.clearInterval(interval);
  }, [sessionReady]);

  const cycleProgress = Math.min(100, Math.max(0, ((60 - secondsLeft) / 60) * 100));
  const isLocked = lockedUntil !== null && lockedUntil > clockNow;
  const cooldownSeconds = isLocked ? Math.ceil((lockedUntil - clockNow) / 1_000) : 0;

  if (!sessionReady) {
    return <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center dark:border-emerald-900/70 dark:bg-emerald-950/30">
      <LockKeyhole size={22} className="mx-auto text-emerald-600 dark:text-emerald-400" />
      <h3 className="mt-2 text-sm font-extrabold text-emerald-950 dark:text-emerald-100">XP automático</h3>
      <p className="mt-1 text-xs text-emerald-800 dark:text-emerald-300">{status}</p>
      <button type="button" onClick={startXpSession} disabled={starting || statusLoading || isLocked} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-extrabold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"><CircleCheck size={18} />{starting ? "Confirmando..." : statusLoading ? "Verificando sessão..." : isLocked ? `Disponível em ${Math.floor(cooldownSeconds / 60)}:${String(cooldownSeconds % 60).padStart(2, "0")}` : "Estou logado"}</button>
    </div>;
  }

  return <div className="flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/70 dark:bg-emerald-950/30">
    <div className="relative h-16 w-16 shrink-0 rounded-full p-1 shadow-sm transition-all duration-300" style={{ background: `conic-gradient(#059669 ${cycleProgress * 3.6}deg, #bbf7d0 ${cycleProgress * 3.6}deg 360deg)` }} aria-label={`${secondsLeft} segundos até o próximo XP`}>
      <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-white text-emerald-700 dark:bg-slate-900 dark:text-emerald-300"><Timer size={15} /><span className="text-[11px] font-extrabold leading-none">{secondsLeft === 0 ? "aguarde" : `0:${String(secondsLeft).padStart(2, "0")}`}</span></div>
    </div>
    <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-bold text-emerald-900 dark:text-emerald-200">XP por presença</p><span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-extrabold text-white">+{settings.xpPerMinute} XP</span></div><p className="mt-0.5 text-xs text-emerald-800 dark:text-emerald-300">{status}</p><p className="mt-1 text-[11px] text-emerald-700/80 dark:text-emerald-400">A sessão termina após {settings.confirmationMinutes} minutos e o XP recebido atualiza sua barra de nível.</p></div>
  </div>;
};
