import React, { useEffect, useRef, useState } from "react";
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
  const minuteCycleStartedAt = useRef(Date.now());
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [starting, setStarting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [status, setStatus] = useState("Confirme que você está logado para iniciar o XP automático.");

  useEffect(() => () => { sessionId.current = null; }, [studentId]);

  const startXpSession = async () => {
    if (starting || sessionEnded) return;
    setStarting(true);
    try {
      const { sessionId: id, reason } = await EngagementService.startSession(studentId);
      if (!id) {
        setStatus(reason === "outside_schedule" ? "O XP por presença funciona somente das 13:00 às 18:15." : "Não foi possível iniciar o XP automático.");
        return;
      }
      sessionId.current = id;
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

  useEffect(() => {
    if (!sessionReady) return;
    const interval = window.setInterval(async () => {
      if (!sessionId.current || document.visibilityState !== "visible") return;
      try {
        const result = await EngagementService.claimMinute(sessionId.current);
        if (result.awarded) {
          minuteCycleStartedAt.current = Date.now();
          setSecondsLeft(60);
          setStatus(`XP recebido: +${settings.xpPerMinute} neste minuto.`);
          onPointsChanged();
        } else if (result.reason === "outside_schedule") {
          setSessionReady(false);
          setStatus("A sessão foi encerrada: XP disponível somente das 13:00 às 18:15.");
        }
      } catch (error: unknown) {
        setStatus(`XP não creditado: ${error instanceof Error ? error.message : "erro no Supabase"}`);
      }
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [onPointsChanged, sessionReady, settings.xpPerMinute]);

  useEffect(() => {
    if (!sessionReady) return;
    const timeout = window.setTimeout(() => {
      setSessionReady(false);
      setSessionEnded(true);
      setStatus("Sua sessão de XP de 10 minutos foi encerrada.");
    }, settings.confirmationMinutes * 60_000);
    return () => window.clearTimeout(timeout);
  }, [sessionReady, settings.confirmationMinutes]);

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

  if (!sessionReady) {
    return <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center dark:border-emerald-900/70 dark:bg-emerald-950/30">
      <LockKeyhole size={22} className="mx-auto text-emerald-600 dark:text-emerald-400" />
      <h3 className="mt-2 text-sm font-extrabold text-emerald-950 dark:text-emerald-100">XP automático</h3>
      <p className="mt-1 text-xs text-emerald-800 dark:text-emerald-300">{status}</p>
      {!sessionEnded && <button type="button" onClick={startXpSession} disabled={starting} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-extrabold text-white transition-colors hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60"><CircleCheck size={18} />{starting ? "Confirmando..." : "Estou logado"}</button>}
    </div>;
  }

  return <div className="flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/70 dark:bg-emerald-950/30">
    <div className="relative h-16 w-16 shrink-0 rounded-full p-1 shadow-sm transition-all duration-1000" style={{ background: `conic-gradient(#059669 ${cycleProgress * 3.6}deg, #bbf7d0 ${cycleProgress * 3.6}deg 360deg)` }} aria-label={`${secondsLeft} segundos até o próximo XP`}>
      <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-white text-emerald-700 dark:bg-slate-900 dark:text-emerald-300"><Timer size={15} /><span className="text-[11px] font-extrabold leading-none">{secondsLeft === 0 ? "..." : `0:${String(secondsLeft).padStart(2, "0")}`}</span></div>
    </div>
    <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-bold text-emerald-900 dark:text-emerald-200">XP por presença</p><span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-extrabold text-white">+{settings.xpPerMinute} XP</span></div><p className="mt-0.5 text-xs text-emerald-800 dark:text-emerald-300">{status}</p><p className="mt-1 text-[11px] text-emerald-700/80 dark:text-emerald-400">A sessão termina após {settings.confirmationMinutes} minutos e o XP recebido atualiza sua barra de nível.</p></div>
  </div>;
};
