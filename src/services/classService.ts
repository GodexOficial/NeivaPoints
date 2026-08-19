import type { ClassInfo } from "../types";
import { DEFAULT_CLASSES } from "../types";
import { StorageService } from "./storage";
import { SupabaseService } from "./supabaseService";

export class ClassService {
  /**
   * Generates a unique, slugified class ID based on name and random suffix.
   */
  static generateId(name: string): string {
    const slug = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const uniqueSuffix = Math.random().toString(36).substring(2, 6);
    return slug
      ? `${slug}-${uniqueSuffix}`
      : `class_${Date.now()}_${uniqueSuffix}`;
  }

  /**
   * Get all registered classes (async - loads from Supabase first, then localStorage)
   */
  static async getAllClasses(): Promise<ClassInfo[]> {
    // Try Supabase first
    if (import.meta.env.VITE_SUPABASE_URL) {
      try {
        const supabaseClasses = await SupabaseService.getAllClasses();
        if (supabaseClasses.length > 0) {
          StorageService.setClasses(supabaseClasses); // Cache locally
          return supabaseClasses;
        }
      } catch (error) {
        console.warn('Supabase error loading classes, falling back to localStorage:', error);
      }
    }

    // Fallback to localStorage
    const stored = StorageService.getClasses<ClassInfo[] | null>(null);
    if (!stored || !Array.isArray(stored) || stored.length === 0) {
      StorageService.setClasses(DEFAULT_CLASSES);
      return DEFAULT_CLASSES;
    }
    return stored;
  }

  /**
   * Get a class by ID (async).
   */
  static async getClassById(id: string): Promise<ClassInfo | undefined> {
    const classes = await this.getAllClasses();
    return classes.find((c) => c.id === id);
  }

  /**
   * Register a new class (saves to both Supabase and localStorage).
   */
  static async createClass(params: {
    name: string;
    gradeNumber?: number;
    shortName?: string;
    color?: string;
    description?: string;
  }): Promise<ClassInfo> {
    const trimmedName = params.name.trim();
    if (!trimmedName) {
      throw new Error("Please enter the class name.");
    }

    const classes = await this.getAllClasses();
    const existing = classes.find(
      (c) => c.name.toLowerCase() === trimmedName.toLowerCase(),
    );
    if (existing) {
      throw new Error(`A class named "${trimmedName}" already exists.`);
    }

    const shortName =
      params.shortName?.trim() ||
      (params.gradeNumber
        ? `${params.gradeNumber}th`
        : trimmedName.substring(0, 4).toUpperCase());

    const newClass: ClassInfo = {
      id: this.generateId(trimmedName),
      name: trimmedName,
      gradeNumber: params.gradeNumber ? Number(params.gradeNumber) : undefined,
      shortName,
      color: params.color || "blue",
      description: params.description?.trim() || "",
      createdAt: new Date().toISOString(),
    };

    // Save to Supabase
    if (import.meta.env.VITE_SUPABASE_URL) {
      try {
        await SupabaseService.createClass(params);
      } catch (error) {
        console.error('Error saving class to Supabase:', error);
        throw new Error("Não foi possível salvar a turma no Supabase. Verifique as políticas RLS da tabela classes.");
      }
    }

    // Save to localStorage as backup
    const allClasses = await this.getAllClasses();
    const updated = [...allClasses, newClass];
    StorageService.setClasses(updated);

    return newClass;
  }

  /**
   * Update an existing class (syncs with Supabase).
   */
  static async updateClass(
    id: string,
    updates: Partial<Omit<ClassInfo, "id" | "createdAt">>,
  ): Promise<ClassInfo> {
    const classes = await this.getAllClasses();
    const index = classes.findIndex((c) => c.id === id);
    if (index === -1) {
      throw new Error("Class not found.");
    }

    const current = classes[index];
    if (updates.name !== undefined) {
      const trimmedName = updates.name.trim();
      if (!trimmedName) {
        throw new Error("Class name cannot be empty.");
      }
      const duplicate = classes.find(
        (c) =>
          c.id !== id && c.name.toLowerCase() === trimmedName.toLowerCase(),
      );
      if (duplicate) {
        throw new Error(`A class named "${trimmedName}" already exists.`);
      }
      current.name = trimmedName;
    }

    if (updates.gradeNumber !== undefined) {
      current.gradeNumber = updates.gradeNumber
        ? Number(updates.gradeNumber)
        : undefined;
    }
    if (updates.shortName !== undefined) {
      current.shortName = updates.shortName.trim();
    }
    if (updates.color !== undefined) {
      current.color = updates.color;
    }
    if (updates.description !== undefined) {
      current.description = updates.description.trim();
    }

    classes[index] = current;
    StorageService.setClasses(classes);

    // Sync to Supabase
    if (import.meta.env.VITE_SUPABASE_URL) {
      try {
        await SupabaseService.updateClass(id, updates);
      } catch (error) {
        console.error('Error updating class in Supabase:', error);
      }
    }

    return current;
  }

  /**
   * Delete a class by ID (syncs with Supabase).
   */
  static async deleteClass(id: string): Promise<boolean> {
    const classes = await this.getAllClasses();
    const filtered = classes.filter((c) => c.id !== id);
    if (filtered.length === classes.length) {
      return false;
    }
    StorageService.setClasses(filtered);

    // Sync to Supabase
    if (import.meta.env.VITE_SUPABASE_URL) {
      try {
        await SupabaseService.deleteClass(id);
      } catch (error) {
        console.error('Error deleting class from Supabase:', error);
      }
    }

    return true;
  }

  /**
   * Reset classes back to default list.
   */
  static resetToDefaultClasses(): ClassInfo[] {
    StorageService.setClasses(DEFAULT_CLASSES);
    return DEFAULT_CLASSES;
  }
}
