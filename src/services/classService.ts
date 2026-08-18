import type { ClassInfo } from "../types";
import { DEFAULT_CLASSES } from "../types";
import { StorageService } from "./storage";

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
   * Get all registered classes.
   * If storage is empty, seeds and returns DEFAULT_CLASSES.
   */
  static getAllClasses(): ClassInfo[] {
    const stored = StorageService.getClasses<ClassInfo[] | null>(null);
    if (!stored || !Array.isArray(stored) || stored.length === 0) {
      StorageService.setClasses(DEFAULT_CLASSES);
      return DEFAULT_CLASSES;
    }
    return stored;
  }

  /**
   * Get a class by ID.
   */
  static getClassById(id: string): ClassInfo | undefined {
    const classes = this.getAllClasses();
    return classes.find((c) => c.id === id);
  }

  /**
   * Register a new class.
   */
  static createClass(params: {
    name: string;
    gradeNumber?: number;
    shortName?: string;
    color?: string;
    description?: string;
  }): ClassInfo {
    const trimmedName = params.name.trim();
    if (!trimmedName) {
      throw new Error("Please enter the class name.");
    }

    const classes = this.getAllClasses();
    const existing = classes.find(
      (c) => c.name.toLowerCase() === trimmedName.toLowerCase(),
    );
    if (existing) {
      throw new Error(`A class named "${trimmedName}" already exists.`);
    }

    const id = this.generateId(trimmedName);
    const shortName =
      params.shortName?.trim() ||
      (params.gradeNumber
        ? `${params.gradeNumber}th`
        : trimmedName.substring(0, 4).toUpperCase());

    const newClass: ClassInfo = {
      id,
      name: trimmedName,
      gradeNumber: params.gradeNumber ? Number(params.gradeNumber) : undefined,
      shortName,
      color: params.color || "blue",
      description: params.description?.trim() || "",
      createdAt: new Date().toISOString(),
    };

    const updated = [...classes, newClass];
    StorageService.setClasses(updated);
    return newClass;
  }

  /**
   * Update an existing class.
   */
  static updateClass(
    id: string,
    updates: Partial<Omit<ClassInfo, "id" | "createdAt">>,
  ): ClassInfo {
    const classes = this.getAllClasses();
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
    return current;
  }

  /**
   * Delete a class by ID.
   */
  static deleteClass(id: string): boolean {
    const classes = this.getAllClasses();
    const filtered = classes.filter((c) => c.id !== id);
    if (filtered.length === classes.length) {
      return false;
    }
    StorageService.setClasses(filtered);
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
