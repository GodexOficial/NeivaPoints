import React, { useEffect, useRef, useState } from "react";
import { BellRing, CircleCheck, Timer } from "lucide-react";
import { EngagementService, type EngagementSettings } from "../../services/engagementService";

interface Props {
  studentId: string;
  settings: EngagementSettings;
  onPointsChanged: () => void;
}

/** UI timer only. The SQL RPC validates all timing and awards XP atomically. */
export const LoginXpTracker: React.FC<Props> = ({ studentId, settings, onPointsChanged }) => {
  const sessionId = useRef<string | null>(null);
  const minuteCycleStartedAt = useRef<number>(Date.now());
  const [sessionReady, setSessionReady] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [status, setStatus] = useState("Iniciando acompanhamento de presença...");

  useEffect(() => {
    let cancelled = false;
    EngagementService.startSession(studentId).then(({ sessionId: id, reason }) => {
      if (!cancelled) {
        if (!id) {
          setStatus(reason === "outside_schedule" ? "O XP por presença funciona somente das 13:00 às 18:15." : reason === "test_only" ? "O XP automático está liberado somente para o aluno Test durante os testes." : "Não foi possível iniciar o XP por presença.");
          return;
        }
        sessionId.current = id;
        setSessionReady(true);
        minuteCycleStartedAt.current = Date.now();
        setSecondsLeft(60);
        setStatus(`Ativo: +${settings.xpPerMinute} XP por minuto.`);
      }
    }).catch((error: unknown) => !cancelled && setStatus(`Não foi possível iniciar o XP: ${error instanceof Error ? error.message : "erro no Supabase"}`));
    return () => { cancelled = true; sessionId.current = null; setSessionReady(false); };
  }, [studentId, settings.xpPerMinute, settings.confirmationMinutes]);

  useEffect(() => {
    const interval = window.setInterval(async () => {
      if (!sessionId.current || awaitingConfirmation) return;
      try {
        const result = await EngagementService.claimMinute(sessionId.current);
        if (result.awarded) {
          setStatus(`XP recebido: +${settings.xpPerMinute} neste minuto.`);
          minuteCycleStartedAt.current = Date.now();
          setSecondsLeft(60);
          onPointsChanged();
        } else if (result.reason === "outside_schedule") {
          setStatus("O XP por presença funciona somente das 13:00 às 18:15.");
        } else if (result.reason === "test_only") {
          setStatus("O XP automático está liberado somente para o aluno Test durante os testes.");
        }
      } catch (error: unknown) {
        setStatus(`XP não creditado: ${error instanceof Error ? error.message : "erro no Supabase"}`);
      }
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [awaitingConfirmation, onPointsChanged, settings.xpPerMinute]);

  useEffect(() => {
    if (!sessionReady || awaitingConfirmation) return;
    const updateCountdown = () => {
      const elapsed = Date.now() - minuteCycleStartedAt.current;
      setSecondsLeft(Math.max(0, Math.ceil((60_000 - elapsed) / 1_000)));
    };
    updateCountdown();
    const interval = window.setInterval(updateCountdown, 1_000);
    return () => window.clearInterval(interval);
  }, [awaitingConfirmation, sessionReady]);

  useEffect(() => {
    // The presence prompt is a client-side reminder and must still appear if the
    // database session cannot be created. XP itself remains server-validated.
    if (awaitingConfirmation) return;
    const timeout = window.setTimeout(() => setAwaitingConfirmation(true), settings.confirmationMinutes * 60_000);
    return () => window.clearTimeout(timeout);
  }, [awaitingConfirmation, settings.confirmationMinutes, studentId]);

  const confirm = async () => {
    if (!sessionId.current) {
      setAwaitingConfirmation(false);
      setStatus("Presença registrada no aviso, mas a sessão de XP ainda não foi criada. Verifique a mensagem do Supabase.");
      return;
    }
    try {
      const result = await EngagementService.confirmActivity(sessionId.current);
      if (!result.allowed) {
        setAwaitingConfirmation(false);
        setStatus(result.reason === "test_only" ? "O XP automático está liberado somente para o aluno Test durante os testes." : "O XP por presença funciona somente das 13:00 às 18:15.");
        return;
      }
      setAwaitingConfirmation(false);
      setStatus("Presença confirmada. Você continua ganhando XP.");
    } catch (error: unknown) {
      setStatus(`Não foi possível confirmar: ${error instanceof Error ? error.message : "erro no Supabase"}`);
    }
  };

  const cycleProgress = sessionReady ? Math.min(100, Math.max(0, ((60 - secondsLeft) / 60) * 100)) : 0;

  return <>
    <div className="flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/70 dark:bg-emerald-950/30">
      <div className="relative h-16 w-16 shrink-0 rounded-full p-1 shadow-sm transition-all duration-1000" style={{ background: `conic-gradient(#059669 ${cycleProgress * 3.6}deg, #bbf7d0 ${cycleProgress * 3.6}deg 360deg)` }} aria-label={sessionReady ? `${secondsLeft} segundos até o próximo XP` : "Aguardando sessão de XP"}>
        <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-white text-emerald-700 dark:bg-slate-900 dark:text-emerald-300"><Timer size={15} /><span className="text-[11px] font-extrabold leading-none">{!sessionReady ? "--" : secondsLeft === 0 ? "..." : `0:${String(secondsLeft).padStart(2, "0")}`}</span></div>
      </div>
      <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-bold text-emerald-900 dark:text-emerald-200">XP por presença</p><span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-extrabold text-white">+{settings.xpPerMinute} XP</span></div><p className="mt-0.5 text-xs text-emerald-800 dark:text-emerald-300">{status}</p><p className="mt-1 text-[11px] text-emerald-700/80 dark:text-emerald-400">O XP creditado atualiza sua barra de nível. Confirme sua atividade a cada {settings.confirmationMinutes} minutos.</p></div>
    </div>
    {awaitingConfirmation && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl dark:bg-slate-900">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-950/60"><BellRing size={24} /></div>
        <h2 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">Você ainda está por aqui?</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Seu XP foi pausado. Confirme sua presença para continuar ganhando pontos.</p>
        <button type="button" onClick={confirm} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700"><CircleCheck size={18} />Continuar ganhando XP</button>
      </div>
    </div>}
  </>;
};
