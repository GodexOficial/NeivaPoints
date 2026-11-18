import type { ClassInfo } from '../types';

const names = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });

function grade(classInfo: ClassInfo): number {
  if (typeof classInfo.gradeNumber === 'number' && Number.isFinite(classInfo.gradeNumber) && classInfo.gradeNumber > 0) {
    return classInfo.gradeNumber;
  }
  // Older/custom classes may have a number in the name but no gradeNumber field.
  const number = classInfo.name.match(/\d+/) || classInfo.shortName?.match(/\d+/);
  return number ? Number(number[0]) : Number.POSITIVE_INFINITY;
}

/** Ascending grades, then natural class names; never mutate the supplied list. */
export function sortClasses(classes: readonly ClassInfo[]): ClassInfo[] {
  return [...classes].sort((a, b) => {
    const first = grade(a), second = grade(b);
    return (first === second ? 0 : first < second ? -1 : 1)
      || names.compare(a.name, b.name)
      || names.compare(a.id, b.id);
  });
}
