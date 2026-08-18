import React, { useState, useMemo } from 'react';
import {
  UserPlus,
  ArrowUpDown,
  Users,
  Grid,
  List,
} from 'lucide-react';
import { useStudentContext } from '../context/StudentContext';
import { useLanguage } from '../context/LanguageContext';
import type { ClassId, StudentWithStats } from '../types';
import { SearchBar } from '../components/common/SearchBar';
import { StudentCard } from '../components/students/StudentCard';
import { LevelBadge } from '../components/common/LevelBadge';
import { ProgressBar } from '../components/common/ProgressBar';

interface StudentsPageProps {
  initialClassFilter?: ClassId | 'all';
  onViewProfile: (studentId: string) => void;
  onOpenAddModal: (classId?: ClassId) => void;
  onOpenPointsModal: (student: StudentWithStats) => void;
}

type SortField = 'name' | 'points' | 'level';
type SortOrder = 'asc' | 'desc';

export const StudentsPage: React.FC<StudentsPageProps> = ({
  initialClassFilter = 'all',
  onViewProfile,
  onOpenAddModal,
  onOpenPointsModal,
}) => {
  const { classes, students, getClassById } = useStudentContext();
  const { t, getClassName } = useLanguage();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<ClassId | 'all'>(initialClassFilter);
  const [sortField, setSortField] = useState<SortField>('points');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const filteredAndSortedStudents = useMemo(() => {
    let result = [...students];

    // 1. Filter by class
    if (selectedClass !== 'all') {
      result = result.filter((s) => s.classId === selectedClass);
    }

    // 2. Search by name (case-insensitive)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((s) => s.name.toLowerCase().includes(q));
    }

    // 3. Sort
    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === 'points') {
        comparison = a.points - b.points;
      } else if (sortField === 'level') {
        comparison = a.level - b.level;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [students, selectedClass, searchQuery, sortField, sortOrder]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder(field === 'name' ? 'asc' : 'desc');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t('students.title')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t('students.subtitle')}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onOpenAddModal(selectedClass !== 'all' ? selectedClass : undefined)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <UserPlus size={16} />
          <span>{t('students.registerBtn')}</span>
        </button>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-3.5">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          {/* Search Bar */}
          <div className="flex-1">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={t('students.searchPlaceholder')}
            />
          </div>

          {/* Class Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            <button
              onClick={() => setSelectedClass('all')}
              className={`px-3 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-colors cursor-pointer ${
                selectedClass === 'all'
                  ? 'bg-slate-900 dark:bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {t('students.allClasses')} ({students.length})
            </button>
            {classes.map((c) => {
              const count = students.filter((s) => s.classId === c.id).length;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedClass(c.id)}
                  className={`px-3 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-colors cursor-pointer ${
                    selectedClass === c.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {getClassName(c.id, c.name)} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Sorting & Layout Toggles */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider flex items-center gap-1">
              <ArrowUpDown size={12} /> {t('students.sortBy')}
            </span>
            <button
              onClick={() => toggleSort('points')}
              className={`px-2.5 py-1 rounded-lg font-semibold border transition-colors cursor-pointer ${
                sortField === 'points'
                  ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              {t('students.points')} {sortField === 'points' && (sortOrder === 'desc' ? '↓' : '↑')}
            </button>
            <button
              onClick={() => toggleSort('level')}
              className={`px-2.5 py-1 rounded-lg font-semibold border transition-colors cursor-pointer ${
                sortField === 'level'
                  ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              {t('students.level')} {sortField === 'level' && (sortOrder === 'desc' ? '↓' : '↑')}
            </button>
            <button
              onClick={() => toggleSort('name')}
              className={`px-2.5 py-1 rounded-lg font-semibold border transition-colors cursor-pointer ${
                sortField === 'name'
                  ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              {t('students.name')} {sortField === 'name' && (sortOrder === 'asc' ? 'A-Z' : 'Z-A')}
            </button>
          </div>

          {/* View toggle (Grid vs Table) */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md cursor-pointer ${
                viewMode === 'grid' ? 'bg-white dark:bg-slate-700 shadow-2xs text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'
              }`}
              title={t('students.gridView')}
            >
              <Grid size={15} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md cursor-pointer ${
                viewMode === 'table' ? 'bg-white dark:bg-slate-700 shadow-2xs text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'
              }`}
              title={t('students.tableView')}
            >
              <List size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium px-1">
        <span>
          {filteredAndSortedStudents.length === 1
            ? t('students.showingSingle')
            : t('students.showing', { count: filteredAndSortedStudents.length })}
          {searchQuery && ` ${t('students.matching', { query: searchQuery })}`}
        </span>
      </div>

      {/* Empty State */}
      {filteredAndSortedStudents.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="w-14 h-14 mx-auto mb-3.5 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500">
            <Users size={26} />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">{t('students.noFoundTitle')}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? t('students.noFoundSearch', {
                  query: searchQuery,
                  className: selectedClass === 'all' ? t('students.allClasses') : getClassName(selectedClass),
                })
              : t('students.noFoundEmpty')}
          </p>
          <button
            type="button"
            onClick={() => onOpenAddModal(selectedClass !== 'all' ? selectedClass : undefined)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <UserPlus size={14} />
            <span>{t('students.registerBtn')}</span>
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAndSortedStudents.map((student) => (
            <StudentCard
              key={student.id}
              student={student}
              onViewProfile={onViewProfile}
              onAddPoints={onOpenPointsModal}
            />
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="py-3.5 px-4">{t('students.colName')}</th>
                  <th className="py-3.5 px-4">{t('students.colClass')}</th>
                  <th className="py-3.5 px-4">{t('students.colLevel')}</th>
                  <th className="py-3.5 px-4">{t('students.colPoints')}</th>
                  <th className="py-3.5 px-4 min-w-[160px]">{t('students.colProgress')}</th>
                  <th className="py-3.5 px-4 text-right">{t('students.colActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredAndSortedStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div
                        onClick={() => onViewProfile(student.id)}
                        className="font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer text-sm truncate max-w-[180px]"
                      >
                        {student.name}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {getClassName(student.classId, getClassById(student.classId)?.name)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <LevelBadge level={student.level} size="sm" />
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-extrabold text-slate-900 dark:text-white text-sm">{student.points}</span>
                      <span className="text-slate-400 dark:text-slate-500 text-[11px] ml-1">pts</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <ProgressBar progress={student.progressPercentage} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => onOpenPointsModal(student)}
                          className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                        >
                          {t('students.addPoints')}
                        </button>
                        <button
                          type="button"
                          onClick={() => onViewProfile(student.id)}
                          className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                        >
                          {t('students.profile')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
