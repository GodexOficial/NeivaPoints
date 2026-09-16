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
  const [sessionReady, setSessionReady] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [status, setStatus] = useState("Iniciando acompanhamento de presença...");

  useEffect(() => {
    let cancelled = false;
    EngagementService.startSession(studentId).then((id) => {
      if (!cancelled) {
        sessionId.current = id;
        setSessionReady(true);
        setStatus(`Ativo: +${settings.xpPerMinute} XP por minuto.`);
      }
    }).catch(() => !cancelled && setStatus("Não foi possível iniciar o XP por presença."));
    return () => { cancelled = true; sessionId.current = null; setSessionReady(false); };
  }, [studentId, settings.xpPerMinute, settings.confirmationMinutes]);

  useEffect(() => {
    const interval = window.setInterval(async () => {
      if (!sessionId.current || awaitingConfirmation || document.visibilityState !== "visible") return;
      try {
        const result = await EngagementService.claimMinute(sessionId.current);
        if (result.awarded) {
          setStatus(`XP recebido: +${settings.xpPerMinute} neste minuto.`);
          onPointsChanged();
        } else if (result.reason === "outside_schedule") {
          setStatus("O XP por presença funciona somente das 13:00 às 18:15.");
        }
      } catch {
        setStatus("O XP por presença só pode ser iniciado das 13:00 às 18:15 (horário de Fortaleza).");
      }
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [awaitingConfirmation, onPointsChanged, settings.xpPerMinute]);

  useEffect(() => {
    if (!sessionReady) return;
    const timeout = window.setTimeout(() => setAwaitingConfirmation(true), settings.confirmationMinutes * 60_000);
    return () => window.clearTimeout(timeout);
  }, [awaitingConfirmation, sessionReady, settings.confirmationMinutes, studentId]);

  const confirm = async () => {
    if (!sessionId.current) return;
    try {
      await EngagementService.confirmActivity(sessionId.current);
      setAwaitingConfirmation(false);
      setStatus("Presença confirmada. Você continua ganhando XP.");
    } catch {
      setStatus("Não foi possível confirmar sua presença. Tente novamente.");
    }
  };

  return <>
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/70 dark:bg-emerald-950/30 flex gap-3">
      <div className="rounded-xl bg-emerald-600 p-2 text-white h-fit"><Timer size={18} /></div>
      <div><p className="text-sm font-bold text-emerald-900 dark:text-emerald-200">XP por presença</p><p className="mt-0.5 text-xs text-emerald-800 dark:text-emerald-300">{status}</p><p className="mt-1 text-[11px] text-emerald-700/80 dark:text-emerald-400">Confirme sua atividade a cada {settings.confirmationMinutes} minutos para continuar.</p></div>
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
