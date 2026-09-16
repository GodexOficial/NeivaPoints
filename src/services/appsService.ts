import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { ExternalApp } from '../types';
import { StorageService } from './storage';

const APPS_STORAGE_KEY = 'neivapoints_external_apps_v1';

const sortApps = (apps: ExternalApp[]) =>
  [...apps].sort((a, b) => a.position - b.position || a.createdAt.localeCompare(b.createdAt));

const saveLocal = (apps: ExternalApp[]) => {
  StorageService.setItem(APPS_STORAGE_KEY, sortApps(apps));
};

const getLocal = () => StorageService.getItem<ExternalApp[]>(APPS_STORAGE_KEY, []);

const toApp = (row: any): ExternalApp => ({
  id: row.id,
  name: row.name,
  url: row.url,
  coverUrl: row.cover_url || undefined,
  position: row.position,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/**
 * Mantém os atalhos disponíveis também sem Supabase. Quando configurado, o
 * Supabase é a fonte compartilhada entre o painel do professor e os alunos.
 * Os três primeiros espaços da grade são reservados para apps padrão.
 */
export class AppsService {
  static async getAll(): Promise<ExternalApp[]> {
    if (!isSupabaseConfigured) return sortApps(getLocal());

    try {
      const { data, error } = await supabase
        .from('external_apps')
        .select('*')
        .order('position', { ascending: true });
      if (error) throw error;
      const apps = (data || []).map(toApp);
      saveLocal(apps);
      return sortApps(apps);
    } catch (error) {
      console.warn('Não foi possível carregar os aplicativos compartilhados.', error);
      return sortApps(getLocal());
    }
  }

  static async create(input: Omit<ExternalApp, 'id' | 'createdAt' | 'updatedAt'>): Promise<ExternalApp> {
    const now = new Date().toISOString();
    const app: ExternalApp = {
      ...input,
      id: `app_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: now,
      updatedAt: now,
    };

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('external_apps')
          .insert({
            id: app.id,
            name: app.name,
            url: app.url,
            cover_url: app.coverUrl || null,
            position: app.position,
            created_at: app.createdAt,
            updated_at: app.updatedAt,
          })
          .select()
          .single();
        if (error) throw error;
        app.id = data.id;
      } catch (error) {
        console.warn('Aplicativo salvo apenas neste navegador.', error);
      }
    }

    saveLocal([...getLocal().filter((item) => item.id !== app.id), app]);
    return app;
  }

  static async update(app: ExternalApp): Promise<ExternalApp> {
    const updated = { ...app, updatedAt: new Date().toISOString() };
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('external_apps')
          .update({
            name: updated.name,
            url: updated.url,
            cover_url: updated.coverUrl || null,
            position: updated.position,
            updated_at: updated.updatedAt,
          })
          .eq('id', updated.id);
        if (error) throw error;
      } catch (error) {
        console.warn('Alteração do aplicativo salva apenas neste navegador.', error);
      }
    }
    saveLocal(getLocal().map((item) => (item.id === updated.id ? updated : item)));
    return updated;
  }

  static async remove(id: string): Promise<void> {
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from('external_apps').delete().eq('id', id);
        if (error) throw error;
      } catch (error) {
        console.warn('Exclusão do aplicativo aplicada apenas neste navegador.', error);
      }
    }
    saveLocal(getLocal().filter((item) => item.id !== id));
  }

  static async reorder(apps: ExternalApp[]): Promise<ExternalApp[]> {
    const reordered = sortApps(apps).map((app, position) => ({
      ...app,
      position,
      updatedAt: new Date().toISOString(),
    }));

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('external_apps')
          .upsert(reordered.map((app) => ({
            id: app.id,
            name: app.name,
            url: app.url,
            cover_url: app.coverUrl || null,
            position: app.position,
            created_at: app.createdAt,
            updated_at: app.updatedAt,
          })));
        if (error) throw error;
      } catch (error) {
        console.warn('Nova ordem salva apenas neste navegador.', error);
      }
    }
    saveLocal(reordered);
    return reordered;
  }
}
