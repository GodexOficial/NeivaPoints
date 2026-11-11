import React, { Suspense, lazy, useState } from 'react';
import { StudentProvider, useStudentContext } from './context/StudentContext';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import type { ClassId, StudentWithStats } from './types';
import { Navbar, type NavTab } from './components/layout/Navbar';
import { Dashboard } from './pages/Dashboard';
import { StudentsPage } from './pages/Students';
import { ClassesPage } from './pages/Classes';
const AppsHub = lazy(() => import('./pages/AppsHub').then(module => ({ default: module.AppsHub })));
import { StudentDetails } from './pages/StudentDetails';
import { SettingsPage } from './pages/Settings';
import { JoinClassPage } from './pages/JoinClass';
import { LoginPage } from './pages/LoginPage';
import { StudentPortal } from './pages/StudentPortal';
import { StudentFormModal } from './components/modals/StudentFormModal';
import { ClassFormModal } from './components/modals/ClassFormModal';
import { PointsModal } from './components/modals/PointsModal';
import { ClassPointsModal } from './components/modals/ClassPointsModal';
import { LevelUpToast } from './components/common/LevelUpToast';
import { InteractionMotion } from './components/common/InteractionMotion';
import { ErrorBoundary } from './components/common/ErrorBoundary';

const MainContent: React.FC = () => {
  const { isAuthenticated, isStudent } = useAuth();
  const { levelUpNotification, dismissLevelUpNotification } = useStudentContext();

  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<ClassId>('6th-grade');
  const [studentsInitialFilter, setStudentsInitialFilter] = useState<ClassId | 'all'>('all');
  const [previousTab, setPreviousTab] = useState<NavTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [isWordEditorOpen, setIsWordEditorOpen] = useState(false);

  // Global modal state
  const [addStudentModalOpen, setAddStudentModalOpen] = useState(false);
  const [addStudentModalClass, setAddStudentModalClass] = useState<ClassId | undefined>(undefined);
  const [addClassModalOpen, setAddClassModalOpen] = useState(false);
  const [pointsModalStudent, setPointsModalStudent] = useState<StudentWithStats | null>(null);
  const [pointsModalInitialMode, setPointsModalInitialMode] = useState<'add' | 'remove'>('add');
  const [classPointsModal, setClassPointsModal] = useState<{ classId: ClassId; className: string; studentCount: number; mode: 'add' | 'remove' } | null>(null);

  // If not logged in, show login / registration screen
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // If logged in as student, show strictly their personal portal view
  if (isStudent) {
    return <StudentPortal />;
  }

  const handleSelectTab = (tab: NavTab) => {
    setActiveTab(tab);
    setSelectedStudentId(null);
    setMobileMenuOpen(false);
    setIsWordEditorOpen(false);
  };

  const handleSelectClass = (classId: ClassId) => {
    setSelectedClassId(classId);
    setActiveTab('classes');
    setSelectedStudentId(null);
  };

  const handleNavigateToStudents = (classId?: ClassId) => {
    setStudentsInitialFilter(classId || 'all');
    setActiveTab('students');
    setSelectedStudentId(null);
  };

  const handleViewProfile = (studentId: string) => {
    setPreviousTab(activeTab);
    setSelectedStudentId(studentId);
  };

  const handleBackFromProfile = () => {
    setSelectedStudentId(null);
    setActiveTab(previousTab);
  };

  const handleOpenAddStudentModal = (classId?: ClassId) => {
    setAddStudentModalClass(classId || (activeTab === 'classes' ? selectedClassId : undefined));
    setAddStudentModalOpen(true);
  };

  const handleOpenPointsModal = (student: StudentWithStats, mode: 'add' | 'remove' = 'add') => {
    setPointsModalInitialMode(mode);
    setPointsModalStudent(student);
  };

  const handleOpenClassPointsModal = (classId: ClassId, className: string, studentCount: number) => {
    setClassPointsModal({ classId, className, studentCount, mode: 'add' });
  };

  const handleOpenClassRemovePointsModal = (classId: ClassId, className: string, studentCount: number) => {
    setClassPointsModal({ classId, className, studentCount, mode: 'remove' });
  };

  // If in student "Join Your Class" standalone view
  if (activeTab === 'join-class') {
    return (
      <JoinClassPage
        onReturnToTeacher={() => {
          setActiveTab('dashboard');
        }}
      />
    );
  }

  return (
    <div className={`${isWordEditorOpen ? 'h-dvh overflow-hidden' : 'app-shell min-h-dvh'} bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col selection:bg-blue-100 selection:text-blue-900 dark:selection:bg-blue-900/60 dark:selection:text-blue-100 transition-colors duration-300`}>
      {!isWordEditorOpen && <a href="#main-content" className="skip-link">Pular para o conteúdo</a>}
      {!isWordEditorOpen && <Navbar
        currentTab={selectedStudentId ? ('students' as NavTab) : activeTab}
        onSelectTab={handleSelectTab}
        mobileMenuOpen={mobileMenuOpen}
        onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
      />}

      <main id="main-content" tabIndex={-1} className={isWordEditorOpen ? 'flex-1 min-h-0 w-full' : 'app-content flex-1 max-w-[1440px] min-w-0 w-full mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-10'}>
        <div key={selectedStudentId || activeTab} className={isWordEditorOpen ? "h-full min-h-0" : "motion-page"}>
        {selectedStudentId ? (
          <StudentDetails
            studentId={selectedStudentId}
            onBack={handleBackFromProfile}
          />
        ) : activeTab === 'dashboard' ? (
          <Dashboard
            onSelectClass={handleSelectClass}
            onNavigateToStudents={handleNavigateToStudents}
            onOpenAddStudentModal={() => handleOpenAddStudentModal()}
            onOpenAddClassModal={() => setAddClassModalOpen(true)}
            onSelectStudent={handleViewProfile}
          />
        ) : activeTab === 'students' ? (
          <StudentsPage
            key={studentsInitialFilter}
            initialClassFilter={studentsInitialFilter}
            onViewProfile={handleViewProfile}
            onOpenAddModal={handleOpenAddStudentModal}
            onOpenPointsModal={(student) => handleOpenPointsModal(student, 'add')}
          />
        ) : activeTab === 'classes' ? (
          <ClassesPage
            initialClassId={selectedClassId}
            onViewProfile={handleViewProfile}
            onOpenAddModal={handleOpenAddStudentModal}
            onOpenPointsModal={(student) => handleOpenPointsModal(student, 'add')}
            onOpenClassPointsModal={handleOpenClassPointsModal}
            onOpenClassRemovePointsModal={handleOpenClassRemovePointsModal}
          />
        ) : activeTab === 'apps' ? (
          <Suspense fallback={<div className="loading-panel" role="status"><span className="loading-indicator" />Carregando aplicativos…</div>}>
            <AppsHub onWordEditorChange={setIsWordEditorOpen} />
          </Suspense>
        ) : activeTab === 'settings' ? (
          <SettingsPage />
        ) : null}
        </div>
      </main>

      {/* Global Modals */}
      <StudentFormModal
        isOpen={addStudentModalOpen}
        initialClassId={addStudentModalClass}
        onClose={() => setAddStudentModalOpen(false)}
      />

      <ClassFormModal
        isOpen={addClassModalOpen}
        onClose={() => setAddClassModalOpen(false)}
        onSuccess={(created) => {
          setSelectedClassId(created.id);
          setActiveTab('classes');
        }}
      />

      <PointsModal
        isOpen={!!pointsModalStudent}
        student={pointsModalStudent}
        initialMode={pointsModalInitialMode}
        onClose={() => setPointsModalStudent(null)}
      />

      <ClassPointsModal
        isOpen={!!classPointsModal}
        classId={classPointsModal?.classId || null}
        className={classPointsModal?.className || ''}
        studentCount={classPointsModal?.studentCount || 0}
        mode={classPointsModal?.mode || 'add'}
        onClose={() => setClassPointsModal(null)}
      />

      {/* Level-Up Celebration Notification */}
      <LevelUpToast
        notification={levelUpNotification}
        onDismiss={dismissLevelUpNotification}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <InteractionMotion />
      <div className="glass-theme">
      <ThemeProvider>
        <LanguageProvider>
          <StudentProvider>
            <AuthProvider>
              <MainContent />
            </AuthProvider>
          </StudentProvider>
        </LanguageProvider>
      </ThemeProvider>
      </div>
    </ErrorBoundary>
  );
};

export default App;

