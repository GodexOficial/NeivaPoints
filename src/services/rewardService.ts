import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { StorageService } from './storage';

export type RewardCycleType = 'monthly' | 'special';
export type RewardStatus = 'active' | 'inactive';

export interface Reward {
  id: string;
  name: string;
  description: string;
  category: string;
  imageUrl: string;
  startDate: string;
  endDate: string;
  quantity: number | null;
  eligibilityRules: string;
  status: RewardStatus;
  cycleType: RewardCycleType;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
}

export interface RewardInput {
  name: string;
  description: string;
  category: string;
  imageUrl: string;
  startDate: string;
  endDate: string;
  quantity: number | null;
  eligibilityRules: string;
  status: RewardStatus;
  cycleType: RewardCycleType;
}

const STORAGE_KEY = 'neiva_points_rewards_v1';

const createId = () => `reward_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const normalize = (row: Record<string, unknown>): Reward => ({
  id: String(row.id),
  name: String(row.name || ''),
  description: String(row.description || ''),
  category: String(row.category || ''),
  imageUrl: String(row.image_url || row.imageUrl || ''),
  startDate: String(row.start_date || row.startDate || ''),
  endDate: String(row.end_date || row.endDate || ''),
  quantity: row.quantity === null || row.quantity === undefined || row.quantity === '' ? null : Number(row.quantity),
  eligibilityRules: String(row.eligibility_rules || row.eligibilityRules || ''),
  status: row.status === 'inactive' ? 'inactive' : 'active',
  cycleType: row.cycle_type === 'special' ? 'special' : 'monthly',
  createdAt: String(row.created_at || row.createdAt || new Date().toISOString()),
  updatedAt: String(row.updated_at || row.updatedAt || new Date().toISOString()),
  archivedAt: row.archived_at ? String(row.archived_at) : undefined,
});

export class RewardService {
  static async getAll(): Promise<Reward[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await (supabase as any).from('rewards').select('*').order('start_date', { ascending: true });
      if (error) throw error;
      return (data || []).map(normalize);
    }
    const stored = StorageService.getItem<Array<Record<string, unknown>>>(STORAGE_KEY, []);
    return stored.map(normalize).sort((a, b) => a.startDate.localeCompare(b.startDate));
  }

  static async create(input: RewardInput): Promise<Reward> {
    const clean = this.validate(input);
    const now = new Date().toISOString();
    if (isSupabaseConfigured) {
      const { data, error } = await (supabase as any).from('rewards').insert({
        name: clean.name,
        description: clean.description,
        category: clean.category,
        image_url: clean.imageUrl || null,
        start_date: clean.startDate,
        end_date: clean.endDate,
        quantity: clean.quantity,
        eligibility_rules: clean.eligibilityRules,
        status: clean.status,
        cycle_type: clean.cycleType,
        created_at: now,
        updated_at: now,
      }).select().single();
      if (error) throw error;
      return normalize(data);
    }
    const reward: Reward = { id: createId(), ...clean, createdAt: now, updatedAt: now };
    const rewards = StorageService.getItem<Reward[]>(STORAGE_KEY, []);
    StorageService.setItem(STORAGE_KEY, [...rewards, reward]);
    return reward;
  }

  static async update(id: string, input: RewardInput): Promise<Reward> {
    const clean = this.validate(input);
    const now = new Date().toISOString();
    if (isSupabaseConfigured) {
      const { data, error } = await (supabase as any).from('rewards').update({
        name: clean.name,
        description: clean.description,
        category: clean.category,
        image_url: clean.imageUrl || null,
        start_date: clean.startDate,
        end_date: clean.endDate,
        quantity: clean.quantity,
        eligibility_rules: clean.eligibilityRules,
        status: clean.status,
        cycle_type: clean.cycleType,
        updated_at: now,
      }).eq('id', id).select().single();
      if (error) throw error;
      return normalize(data);
    }
    const rewards = StorageService.getItem<Reward[]>(STORAGE_KEY, []);
    const index = rewards.findIndex((reward) => reward.id === id);
    if (index < 0) throw new Error('Recompensa não encontrada.');
    rewards[index] = { ...rewards[index], ...clean, updatedAt: now };
    StorageService.setItem(STORAGE_KEY, rewards);
    return rewards[index];
  }

  static async setStatus(id: string, status: RewardStatus): Promise<void> {
    if (isSupabaseConfigured) {
      const { error } = await (supabase as any).from('rewards').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      return;
    }
    const rewards = StorageService.getItem<Reward[]>(STORAGE_KEY, []);
    StorageService.setItem(STORAGE_KEY, rewards.map((reward) => reward.id === id ? { ...reward, status, updatedAt: new Date().toISOString() } : reward));
  }

  static async archive(id: string): Promise<void> {
    if (isSupabaseConfigured) {
      const now = new Date().toISOString();
      const { error } = await (supabase as any).from('rewards').update({ status: 'inactive', archived_at: now, updated_at: now }).eq('id', id);
      if (error) throw error;
      return;
    }
    const rewards = StorageService.getItem<Reward[]>(STORAGE_KEY, []);
    const now = new Date().toISOString();
    StorageService.setItem(STORAGE_KEY, rewards.map((reward) => reward.id === id ? { ...reward, status: 'inactive', archivedAt: now, updatedAt: now } : reward));
  }

  private static validate(input: RewardInput): RewardInput {
    const name = input.name.trim();
    if (!name) throw new Error('Informe o nome da recompensa.');
    if (!input.startDate || !input.endDate || input.endDate < input.startDate) throw new Error('Informe um período válido.');
    if (input.quantity !== null && (!Number.isInteger(input.quantity) || input.quantity < 0)) throw new Error('A quantidade deve ser um número inteiro maior ou igual a zero.');
    return { ...input, name, description: input.description.trim(), category: input.category.trim(), imageUrl: input.imageUrl.trim(), eligibilityRules: input.eligibilityRules.trim() };
  }
}
