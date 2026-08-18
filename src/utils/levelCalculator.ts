import type { Student, StudentWithStats } from '../types';

/**
 * Calculates the current level based on total points.
 * Level = floor(points / 100) + 1
 * 0-99 -> Level 1
 * 100-199 -> Level 2
 * 200-299 -> Level 3
 * etc.
 */
export function calculateLevel(points: number): number {
  const safePoints = Math.max(0, Math.floor(points || 0));
  return Math.floor(safePoints / 100) + 1;
}

/**
 * Calculates the progress percentage (0-99%) inside the student's current level.
 */
export function calculateProgress(points: number): number {
  const safePoints = Math.max(0, Math.floor(points || 0));
  return safePoints % 100;
}

/**
 * Calculates how many points are needed to reach the next level.
 */
export function calculatePointsToNextLevel(points: number): number {
  const safePoints = Math.max(0, Math.floor(points || 0));
  const currentProgress = safePoints % 100;
  return 100 - currentProgress;
}

/**
 * Calculates points accumulated in current level (0-99).
 */
export function calculatePointsInCurrentLevel(points: number): number {
  const safePoints = Math.max(0, Math.floor(points || 0));
  return safePoints % 100;
}

/**
 * Enriches a Student object with calculated level and progress stats.
 */
export function enrichStudentWithStats(student: Student): StudentWithStats {
  const safePoints = Math.max(0, Math.floor(student.points || 0));
  return {
    ...student,
    points: safePoints,
    level: calculateLevel(safePoints),
    progressPercentage: calculateProgress(safePoints),
    pointsToNextLevel: calculatePointsToNextLevel(safePoints),
    pointsInCurrentLevel: calculatePointsInCurrentLevel(safePoints),
  };
}

/**
 * Determines whether adding points resulted in a level up.
 */
export function checkLevelUp(
  previousPoints: number,
  newPoints: number
): { leveledUp: boolean; oldLevel: number; newLevel: number } {
  const oldLevel = calculateLevel(previousPoints);
  const newLevel = calculateLevel(newPoints);
  return {
    leveledUp: newLevel > oldLevel,
    oldLevel,
    newLevel,
  };
}
