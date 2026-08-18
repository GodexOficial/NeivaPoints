const STORAGE_KEYS = {
  STUDENTS: "student_points_tracker_students_v1",
  TRANSACTIONS: "student_points_tracker_transactions_v1",
  CLASSES: "student_points_tracker_classes_v1",
} as const;

export class StorageService {
  private static isAvailable(): boolean {
    try {
      if (typeof window === "undefined" || !window.localStorage) {
        return false;
      }
      const testKey = "__storage_test__";
      window.localStorage.setItem(testKey, testKey);
      window.localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  static getItem<T>(key: string, defaultValue: T): T {
    if (!this.isAvailable()) {
      return defaultValue;
    }
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null || raw === undefined) {
        return defaultValue;
      }
      return JSON.parse(raw) as T;
    } catch (err) {
      console.warn(`[StorageService] Failed to read key "${key}":`, err);
      return defaultValue;
    }
  }

  static setItem<T>(key: string, value: T): boolean {
    if (!this.isAvailable()) {
      return false;
    }
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.error(`[StorageService] Failed to write key "${key}":`, err);
      return false;
    }
  }

  static removeItem(key: string): void {
    if (!this.isAvailable()) return;
    try {
      window.localStorage.removeItem(key);
    } catch (err) {
      console.error(`[StorageService] Failed to remove key "${key}":`, err);
    }
  }

  static getStudents<T>(defaultValue: T): T {
    return this.getItem<T>(STORAGE_KEYS.STUDENTS, defaultValue);
  }

  static setStudents<T>(students: T): boolean {
    return this.setItem(STORAGE_KEYS.STUDENTS, students);
  }

  static getTransactions<T>(defaultValue: T): T {
    return this.getItem<T>(STORAGE_KEYS.TRANSACTIONS, defaultValue);
  }

  static setTransactions<T>(transactions: T): boolean {
    return this.setItem(STORAGE_KEYS.TRANSACTIONS, transactions);
  }

  static getClasses<T>(defaultValue: T): T {
    return this.getItem<T>(STORAGE_KEYS.CLASSES, defaultValue);
  }

  static setClasses<T>(classes: T): boolean {
    return this.setItem(STORAGE_KEYS.CLASSES, classes);
  }

  static clearAll(): void {
    this.removeItem(STORAGE_KEYS.STUDENTS);
    this.removeItem(STORAGE_KEYS.TRANSACTIONS);
    this.removeItem(STORAGE_KEYS.CLASSES);
  }
}
