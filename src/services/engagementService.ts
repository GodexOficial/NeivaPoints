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
      xpPerMinute: safePositiveInt(values.get(SETTINGS_KEYS.xpPerMinute), DEFAULT_ENGAGEMENT_SETTINGS.xpPerMinute),
      confirmationMinutes: safePositiveInt(values.get(SETTINGS_KEYS.confirmationMinutes), DEFAULT_ENGAGEMENT_SETTINGS.confirmationMinutes),
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
  static async startSession(studentId: string): Promise<{ sessionId?: string; reason?: string; activeUntil?: string }> {
    if (!isSupabaseConfigured) return { sessionId: `local_${studentId}` };
    const { data, error } = await (supabase as any).rpc("start_login_xp_session", { p_student_id: studentId });
    if (error) throw error;
    // Compatibility with the first SQL version, which returned the session UUID as text.
    if (typeof data === "string") return { sessionId: data };
    return data as { sessionId?: string; reason?: string; activeUntil?: string };
  }

  static async getSessionStatus(studentId: string): Promise<{ locked: boolean; activeUntil?: string }> {
    if (!isSupabaseConfigured) return { locked: false };
    const { data, error } = await (supabase as any).rpc("get_login_xp_session_status", { p_student_id: studentId });
    if (error) throw error;
    return data as { locked: boolean; activeUntil?: string };
  }

  /** Claims one minute of XP. The database, not the browser clock, decides whether it is valid. */
  static async claimMinute(sessionId: string): Promise<{ awarded: boolean; reason?: string }> {
    if (!isSupabaseConfigured) return { awarded: true };
    const { data, error } = await (supabase as any).rpc("claim_login_xp", { p_session_id: sessionId });
    if (error) throw error;
    return data as { awarded: boolean; reason?: string };
  }

  static async confirmActivity(sessionId: string): Promise<{ allowed: boolean; reason?: string }> {
    if (!isSupabaseConfigured) return { allowed: true };
    const { data, error } = await (supabase as any).rpc("confirm_login_xp_activity", { p_session_id: sessionId });
    if (error) throw error;
    return data as { allowed: boolean; reason?: string };
  }
}
