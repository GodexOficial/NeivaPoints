import { isSupabaseConfigured, supabase } from "../lib/supabase";

export interface EngagementSettings {
  xpPerMinute: number;
  confirmationMinutes: number;
  monthlyGoal: number;
  startTime: string;
  endTime: string;
}

export const DEFAULT_ENGAGEMENT_SETTINGS: EngagementSettings = {
  xpPerMinute: 2,
  confirmationMinutes: 10,
  monthlyGoal: 100,
  startTime: "13:00",
  endTime: "18:15",
};

export interface AttendanceResponse {
  version?: number; sessionId?: string; reason?: string; startedAt?: string;
  activeUntil?: string; nextAwardAt?: string; serverNow?: string;
  locked?: boolean; claimable?: boolean; closed?: boolean;
  awarded?: boolean; amount?: number; points?: number; xpPerMinute?: number; creditedMinutes?: number;
  allowed?: boolean;
}
const pendingAttendance = new Map<string, Promise<AttendanceResponse>>();
async function attendanceRpc(name: string, args: Record<string,string>): Promise<AttendanceResponse> {
  if (!isSupabaseConfigured) throw new Error('XP por presença requer conexão com o banco. Nenhum ponto foi creditado.');
  const key = name + JSON.stringify(args), existing = pendingAttendance.get(key); if (existing) return existing;
  const request = (async () => {
    const controller = new AbortController(), timeout = window.setTimeout(() => controller.abort(), 12000);
    try {
      const { data, error } = await supabase.rpc(name, args).abortSignal(controller.signal);
      if (error) {
        if (['PGRST202','42P01','42883'].includes(error.code)) throw new Error('O XP por presença precisa da atualização SQL no Supabase.');
        throw new Error(controller.signal.aborted ? 'A confirmação demorou. A sessão será consultada novamente, sem duplicar o crédito.' : 'Não foi possível confirmar o XP no servidor. Tentaremos novamente.');
      }
      if (typeof data === 'string') return { sessionId: data };
      if (!data || typeof data !== 'object') throw new Error('Resposta de XP inválida. Nenhum crédito foi confirmado.');
      const result = data as AttendanceResponse;
      for (const field of ['startedAt','activeUntil','nextAwardAt','serverNow'] as const) {
        if (result[field] !== undefined && result[field] !== null && !Number.isFinite(Date.parse(result[field]!))) throw new Error('O servidor retornou um horário de XP inválido.');
      }
      for (const field of ['points','amount','xpPerMinute','creditedMinutes'] as const) {
        if (result[field] !== undefined && (!Number.isSafeInteger(result[field]) || result[field]! < 0)) throw new Error('O servidor retornou um saldo de XP inválido.');
      }
      return result;
    } finally { window.clearTimeout(timeout); }
  })();
  pendingAttendance.set(key,request);
  try { return await request; } finally { if (pendingAttendance.get(key) === request) pendingAttendance.delete(key); }
}

const SETTINGS_KEYS = {
  xpPerMinute: "login_xp_per_minute",
  confirmationMinutes: "login_xp_confirmation_minutes",
  monthlyGoal: "monthly_xp_goal",
  startTime: "login_xp_start_time",
  endTime: "login_xp_end_time",
} as const;

const safePositiveInt = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 100000 ? parsed : fallback;
};

const isValidTime = (value: unknown): value is string =>
  typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

const safeTime = (value: unknown, fallback: string) => isValidTime(value) ? value : fallback;

const validateSchedule = (startTime: string, endTime: string) => {
  if (!isValidTime(startTime) || !isValidTime(endTime) || startTime >= endTime) {
    throw new Error("O horário final deve ser posterior ao horário inicial.");
  }
};

export class EngagementService {
  static async getSettings(): Promise<EngagementSettings> {
    if (!isSupabaseConfigured) return DEFAULT_ENGAGEMENT_SETTINGS;
    const { data, error } = await (supabase as any)
      .from("app_settings")
      .select("key, value")
      .in("key", Object.values(SETTINGS_KEYS));
    if (error) throw error;
    const values = new Map((data || []).map((item: { key: string; value: string }) => [item.key, item.value]));
    const settings: EngagementSettings = {
      xpPerMinute: Math.min(10000,safePositiveInt(values.get(SETTINGS_KEYS.xpPerMinute), DEFAULT_ENGAGEMENT_SETTINGS.xpPerMinute)),
      confirmationMinutes: Math.min(120,safePositiveInt(values.get(SETTINGS_KEYS.confirmationMinutes), DEFAULT_ENGAGEMENT_SETTINGS.confirmationMinutes)),
      monthlyGoal: safePositiveInt(values.get(SETTINGS_KEYS.monthlyGoal), DEFAULT_ENGAGEMENT_SETTINGS.monthlyGoal),
      startTime: safeTime(values.get(SETTINGS_KEYS.startTime), DEFAULT_ENGAGEMENT_SETTINGS.startTime),
      endTime: safeTime(values.get(SETTINGS_KEYS.endTime), DEFAULT_ENGAGEMENT_SETTINGS.endTime),
    };
    if (settings.startTime >= settings.endTime) {
      settings.startTime = DEFAULT_ENGAGEMENT_SETTINGS.startTime;
      settings.endTime = DEFAULT_ENGAGEMENT_SETTINGS.endTime;
    }
    return settings;
  }

  static async saveSettings(settings: EngagementSettings): Promise<void> {
    if (!isSupabaseConfigured) throw new Error("Configure o Supabase para salvar estas configurações.");
    const clean = {
      xpPerMinute: safePositiveInt(settings.xpPerMinute, DEFAULT_ENGAGEMENT_SETTINGS.xpPerMinute),
      confirmationMinutes: safePositiveInt(settings.confirmationMinutes, DEFAULT_ENGAGEMENT_SETTINGS.confirmationMinutes),
      monthlyGoal: safePositiveInt(settings.monthlyGoal, DEFAULT_ENGAGEMENT_SETTINGS.monthlyGoal),
      startTime: settings.startTime,
      endTime: settings.endTime,
    };
    validateSchedule(clean.startTime, clean.endTime);
    if (clean.confirmationMinutes > 120 || clean.xpPerMinute > 10000) throw new Error('Use até 120 minutos por confirmação e até 10.000 XP por minuto.');
    const now = new Date().toISOString();
    const { error } = await (supabase as any).from("app_settings").upsert([
      { key: SETTINGS_KEYS.xpPerMinute, value: String(clean.xpPerMinute), updated_at: now },
      { key: SETTINGS_KEYS.confirmationMinutes, value: String(clean.confirmationMinutes), updated_at: now },
      { key: SETTINGS_KEYS.monthlyGoal, value: String(clean.monthlyGoal), updated_at: now },
      { key: SETTINGS_KEYS.startTime, value: clean.startTime, updated_at: now },
      { key: SETTINGS_KEYS.endTime, value: clean.endTime, updated_at: now },
    ], { onConflict: "key" });
    if (error) throw error;
  }

  /** Starts a server-side attendance session. The SQL migration defines this RPC. */
  static async startSession(studentId: string): Promise<AttendanceResponse> {
    return attendanceRpc('start_login_xp_session',{ p_student_id: studentId });
  }

  static async getSessionStatus(studentId: string): Promise<AttendanceResponse> {
    return attendanceRpc('get_login_xp_session_status',{ p_student_id: studentId });
  }

  /** Claims one minute of XP. The database, not the browser clock, decides whether it is valid. */
  static async claimMinute(sessionId: string): Promise<AttendanceResponse> {
    return attendanceRpc('claim_login_xp',{ p_session_id: sessionId });
  }

  static async confirmActivity(sessionId: string): Promise<AttendanceResponse> {
    return attendanceRpc('confirm_login_xp_activity',{ p_session_id: sessionId });
  }
}
