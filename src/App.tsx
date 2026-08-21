import React, { useState } from 'react';
import { StudentProvider, useStudentContext } from './context/StudentContext';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import type { ClassId, StudentWithStats } from './types';
import { Navbar, type NavTab } from './components/layout/Navbar';
import { Dashboard } from './pages/Dashboard';
import { StudentsPage } from './pages/Students';
import { ClassesPage } from './pages/Classes';
import { AppsHub } from './pages/AppsHub';
import { StudentDetails } from './pages/StudentDetails';
import { SettingsPage } from './pages/Settings';
import { JoinClassPage } from './pages/JoinClass';
import { LoginPage } from './pages/LoginPage';
import { StudentPortal } from './pages/StudentPortal';
import { StudentFormModal } from './components/modals/StudentFormModal';
import { ClassFormModal } from './components/modals/ClassFormModal';
import { PointsModal } from './components/modals/PointsModal';
import { LevelUpToast } from './components/common/LevelUpToast';
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

  // Global modal state
  const [addStudentModalOpen, setAddStudentModalOpen] = useState(false);
  const [addStudentModalClass, setAddStudentModalClass] = useState<ClassId | undefined>(undefined);
  const [addClassModalOpen, setAddClassModalOpen] = useState(false);
  const [pointsModalStudent, setPointsModalStudent] = useState<StudentWithStats | null>(null);
  const [pointsModalInitialMode, setPointsModalInitialMode] = useState<'add' | 'remove'>('add');

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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col selection:bg-blue-100 selection:text-blue-900 dark:selection:bg-blue-900/60 dark:selection:text-blue-100 transition-colors duration-200">
      <Navbar
        currentTab={selectedStudentId ? ('students' as NavTab) : activeTab}
        onSelectTab={handleSelectTab}
        mobileMenuOpen={mobileMenuOpen}
        onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
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
          />
        ) : activeTab === 'apps' ? (
          <AppsHub />
        ) : activeTab === 'settings' ? (
          <SettingsPage />
        ) : null}
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
      <ThemeProvider>
        <LanguageProvider>
          <StudentProvider>
            <AuthProvider>
              <MainContent />
            </AuthProvider>
          </StudentProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;

