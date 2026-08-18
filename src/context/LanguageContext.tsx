import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { ClassId } from '../types';

export type Language = 'en' | 'pt';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  getClassName: (classId: ClassId, fallbackName?: string) => string;
  getReasonLabel: (reason: string) => string;
}

const STORAGE_KEY = 'sistema_pontos_language_v1';

export const translations = {
  en: {
    // Navbar
    'nav.brand': 'PointsTracker',
    'nav.subtitle': 'Classroom System',
    'nav.dashboard': 'Dashboard',
    'nav.students': 'Students',
    'nav.classes': 'Classes',
    'nav.settings': 'Settings',
    'nav.joinClass': 'Join Class',
    'nav.joinClassShort': 'Join',
    'nav.switchLang': 'Switch language to Portuguese',
    'nav.switchToDark': 'Switch to Dark Mode',
    'nav.switchToLight': 'Switch to Light Mode',
    'nav.themeToggle': 'Toggle dark/light mode',
    'nav.logout': 'Sign Out',
    'nav.roleTeacher': 'Teacher',
    'nav.roleStudent': 'Student',

    // Authentication & Portals
    'auth.roleStudent': 'Student',
    'auth.roleTeacher': 'Teacher',
    'auth.studentPortalTitle': 'Student Portal',
    'auth.teacherPortalTitle': 'Teacher Portal',
    'auth.loginTitle': 'Points System Login',
    'auth.loginSubtitle': 'Choose your portal to sign in or register',
    'auth.studentLogin': 'Student Sign In',
    'auth.teacherLogin': 'Teacher Sign In',
    'auth.studentRegister': 'Student Registration',
    'auth.teacherRegister': 'Teacher Registration',
    'auth.fullName': 'Full Name',
    'auth.fullNamePlaceholder': 'Enter your full name...',
    'auth.class': 'Class / Grade',
    'auth.selectClass': 'Select your class...',
    'auth.username': 'Username / Login',
    'auth.usernamePlaceholder': 'e.g. ana.silva',
    'auth.emailOrUser': 'Teacher Username or Email',
    'auth.emailOrUserPlaceholder': 'e.g. teacher or prof@school.edu',
    'auth.password': 'Password',
    'auth.passwordPlaceholder': 'Enter your password...',
    'auth.teacherSecurityKey': 'Teacher Security Key (Master Key)',
    'auth.teacherSecurityKeyPlaceholder': 'Enter master teacher security code',
    'auth.teacherSecurityKeyHelp': 'Security key required to prevent unauthorized student registrations as teacher.',
    'auth.loginBtn': 'Sign In',
    'auth.registerBtn': 'Register Account',
    'auth.alreadyHaveAccount': 'Already have an account? Sign In',
    'auth.dontHaveAccount': 'Don\'t have an account? Create one here',
    'auth.logout': 'Sign Out',
    'auth.demoAccounts': 'Quick Demo & Sample Credentials',
    'auth.quickStudentLogin': 'Log in as Sample Student',
    'auth.quickTeacherLogin': 'Log in as Teacher (Default: teacher / admin123)',
    'auth.defaultTeacherHint': 'Default teacher login: teacher / admin123 • Master Security Key: PROF2025',
    'auth.errorFillAll': 'Please fill in all required fields.',
    'auth.errorSelectClass': 'Please select your class.',
    'auth.errorInvalidKey': 'Invalid Teacher Security Key. Students are not authorized to create teacher accounts.',

    // Student Portal View
    'portal.welcome': 'Welcome, {name}!',
    'portal.yourClass': 'Enrolled in: {className}',
    'portal.yourPoints': 'My Accumulated Points',
    'portal.yourLevel': 'Current Level',
    'portal.nextLevel': 'Next Milestone',
    'portal.ptsNeeded': '{points} points to reach Level {level}',
    'portal.historyTitle': 'My Points & Activity History',
    'portal.historyEmpty': 'No points recorded yet. Participate in class activities to earn points!',
    'portal.infoTitle': 'Personal Student Dashboard',
    'portal.infoDesc': 'This portal displays strictly your personal level, points, and achievements.',
    'portal.securityNote': 'Personal & Private view • Only your information is shown.',
    'portal.levelProgress': 'Level {level} Progress ({progress}%)',

    // Classes
    'class.6th-grade': '6th Grade',
    'class.7th-grade': '7th Grade',
    'class.8th-grade': '8th Grade',
    'class.9th-grade': '9th Grade',

    // Dashboard
    'dash.badge': 'Teacher Dashboard',
    'dash.title': 'Classroom Points & Progress',
    'dash.subtitle': 'Track student progression, assign points for participation and achievements, and manage classes.',
    'dash.registerStudent': 'Register Student',
    'dash.registerClass': 'Register Class',
    'dash.viewAllStudents': 'View All Students',
    'dash.overview': 'Overview Summary',
    'dash.totalStudents': 'Total Students',
    'dash.enrolled': 'Enrolled in school',
    'dash.students': 'Students',
    'dash.totalPoints': 'Total Points',
    'dash.pointsAwarded': 'Points awarded',
    'dash.academicClasses': 'Academic Classes',
    'dash.classesSubtitle': 'Overview and progression metrics for each class',
    'dash.noClasses': 'No classes registered yet',
    'dash.noClassesDesc': 'Register your first class to begin managing students and points.',

    // Students Page
    'students.title': 'Student Management',
    'students.subtitle': 'Search, filter, assign points, and inspect student progress across all classes.',
    'students.searchPlaceholder': 'Search student by name...',
    'students.allClasses': 'All Classes',
    'students.sortBy': 'Sort by:',
    'students.points': 'Points',
    'students.level': 'Level',
    'students.name': 'Name',
    'students.gridView': 'Grid View',
    'students.tableView': 'Table View',
    'students.showing': 'Showing {count} students',
    'students.showingSingle': 'Showing 1 student',
    'students.matching': 'matching "{query}"',
    'students.noFoundTitle': 'No students found',
    'students.noFoundSearch': 'No student matching "{query}" in {className}.',
    'students.noFoundEmpty': 'There are no students registered in this selection.',
    'students.registerBtn': 'Register a Student',
    'students.colName': 'Student Name',
    'students.colClass': 'Class',
    'students.colLevel': 'Level',
    'students.colPoints': 'Points',
    'students.colProgress': 'Progress',
    'students.colActions': 'Actions',
    'students.addPoints': '+ Points',
    'students.profile': 'Profile',
    'students.sample': 'Sample',
    'students.ptsToNext': '{points} pts to Lvl {level}',

    // Classes Page
    'classes.studentsCount': '{count} Students',
    'classes.studentSingle': '1 Student',
    'classes.subtitle': 'Classroom performance, progression levels, and ranking leaderboard',
    'classes.registerClass': 'Register Class',
    'classes.editClass': 'Edit Class',
    'classes.deleteClass': 'Delete Class',
    'classes.deleteClassTitle': 'Delete Class',
    'classes.deleteClassMsg': 'Delete class "{className}"?',
    'classes.deleteClassDesc': 'This action cannot be undone. Any students assigned to this class will remain in the database but without an active class.',
    'classes.deleteClassConfirm': 'Delete Class',
    'classes.noClassesRegistered': 'No classes registered yet',
    'classes.noClassesDesc': 'Get started by creating your first academic class or group.',
    'classes.createFirstClass': 'Register First Class',
    'classes.addStudentTo': 'Add Student to {className}',
    'classes.numStudents': 'Number of Students',
    'classes.avgPoints': 'Average Points',
    'classes.avgLevel': 'Average Level',
    'classes.avgProgress': 'Average Progress',
    'classes.highestScoring': 'Highest-Scoring Student',
    'classes.pts': 'points',
    'classes.viewProfile': 'View Profile',
    'classes.rankingTitle': '{className} Ranking',
    'classes.noStudentsYet': 'No students in this class yet.',
    'classes.registerToRank': 'Register students to view the ranking.',
    'classes.studentsTitle': '{className} Students ({count})',
    'classes.addFirstStudent': 'Add First Student',
    'classes.top': 'Top',
    'classes.progression': 'Class Progression',
    'classes.progressPct': '{pct}% progress',

    // Class Form Modal
    'classForm.newTitle': 'Register New Class',
    'classForm.editTitle': 'Edit Class',
    'classForm.newSubtitle': 'Create a new class to organize students and track points',
    'classForm.editSubtitle': 'Update class name, grade level, or color theme',
    'classForm.name': 'Class Name',
    'classForm.namePlaceholder': 'e.g. 5th Grade A, Coding Club, Art 101',
    'classForm.gradeNumber': 'Grade Level / Year (Optional)',
    'classForm.gradePlaceholder': 'e.g. 5, 6, 7, 8...',
    'classForm.shortName': 'Short Badge / Code (Optional)',
    'classForm.shortNamePlaceholder': 'e.g. 5A, 6th, ROB',
    'classForm.color': 'Color Theme',
    'classForm.description': 'Description (Optional)',
    'classForm.descPlaceholder': 'e.g. Morning Shift, Room 204, Teacher Silva',
    'classForm.createBtn': 'Register Class',
    'classForm.saveBtn': 'Save Changes',
    'classForm.cancel': 'Cancel',
    'classForm.errorName': 'Please enter a class name.',
    'classForm.errorDuplicate': 'A class with this name already exists.',

    // Student Details
    'details.back': 'Back',
    'details.edit': 'Edit',
    'details.delete': 'Delete',
    'details.notFoundTitle': 'Student Not Found',
    'details.notFoundDesc': 'The requested student could not be found or may have been deleted.',
    'details.returnBtn': 'Return to Students',
    'details.sampleBadge': 'Sample Data',
    'details.registeredDate': 'Registered {date}',
    'details.addPoints': 'Add Points',
    'details.removePoints': 'Remove Points',
    'details.currentLevel': 'Current Level',
    'details.currentPoints': 'Current Points',
    'details.nextMilestone': 'Next Milestone',
    'details.ptsUntil': '{points} points until Level {nextLevel}',
    'details.ptsInLevel': '{current}/100 in Level {level}',
    'details.levelProgress': 'Level {level} Progress',
    'details.levelStart': 'Level {level} Start ({points} pts)',
    'details.levelTarget': '{points} points to Level {nextLevel} ({total} pts)',
    'details.deleteTitle': 'Delete Student',
    'details.deleteMsg': 'Delete {name}?',
    'details.deleteDesc': 'This action cannot be undone. All point records for this student will also be removed.',
    'details.deleteConfirm': 'Delete Student',

    // History
    'history.title': 'Point History',
    'history.records': '{count} records',
    'history.recordSingle': '1 record',
    'history.empty': 'No point transactions recorded yet.',
    'history.emptySub': 'When points are added or removed, records will appear here.',
    'history.points': 'points',

    // Modals
    'modal.addTitle': 'Add Points',
    'modal.removeTitle': 'Remove Points',
    'modal.quickSelect': 'Quick Select',
    'modal.customAmount': 'Custom Amount',
    'modal.enterPoints': 'Enter point amount...',
    'modal.reason': 'Reason',
    'modal.optional': '(optional)',
    'modal.presets': 'Choose from presets',
    'modal.customReason': 'Custom reason',
    'modal.customReasonPlaceholder': 'e.g. Science Fair Presentation',
    'modal.projectedChange': 'Projected Change',
    'modal.cancel': 'Cancel',
    'modal.addSubmit': 'Add {amount} Points',
    'modal.removeSubmit': 'Remove {amount} Points',
    'modal.removeConfirmTitle': 'Remove Points',
    'modal.removeConfirmMsg': 'Remove {amount} points from {name}?',
    'modal.removeConfirmDesc': 'This action will be recorded in the student\'s history.',
    'modal.removeConfirmBtn': 'Remove Points',
    'modal.errorPositive': 'Please enter a valid positive number.',
    'modal.errorInsufficient': 'The student does not have enough points.',

    // Student Form Modal
    'form.newTitle': 'Register New Student',
    'form.editTitle': 'Edit Student',
    'form.newSubtitle': 'Add a new student to a class',
    'form.editSubtitle': 'Update student name or assigned class',
    'form.fullName': 'Full Name',
    'form.namePlaceholder': 'e.g. John Smith',
    'form.class': 'Class',
    'form.createClassQuick': '+ Register New Class',
    'form.noClassesYet': 'No classes registered yet. Create one below.',
    'form.initialPoints': 'Initial Points:',
    'form.initialLevel': 'Initial Level:',
    'form.pointsVal': '0 points',
    'form.levelVal': 'Level 1',
    'form.save': 'Save Changes',
    'form.register': 'Register Student',
    'form.errorName': 'Please enter the student\'s name.',
    'form.errorClass': 'Please select a class.',

    // Level-up Toast
    'toast.levelUp': 'Level Up!',
    'toast.lvl': 'Lvl',
    'toast.advanced': 'Advanced from Level {oldLevel} to Level {newLevel}! 🎉',

    // Join Class
    'join.title': 'JOIN YOUR CLASS',
    'join.subtitle': 'Enter your name and select your class to start tracking points.',
    'join.fullName': 'Full Name',
    'join.namePlaceholder': 'Enter your full name...',
    'join.selectClass': 'Select your class',
    'join.btn': 'JOIN',
    'join.teacherBtn': 'Teacher Dashboard',
    'join.successTitle': 'Registration completed!',
    'join.welcome': 'Welcome, {name}!',
    'join.addedTo': 'You have been added to the {className}.',
    'join.currentPoints': 'Current points',
    'join.currentLevel': 'Current Level',
    'join.level1': 'Level 1',
    'join.registerAnother': 'Register Another Student',
    'join.done': 'Done',
    'join.footer': 'Student Points & Progress Tracking • Class Mode',
    'join.errorName': 'Please enter your full name.',
    'join.errorClass': 'Please select your class.',

    // Settings
    'settings.title': 'Settings',
    'settings.subtitle': 'Manage sample data, review level progression rules, and maintain local storage.',
    'settings.dataTitle': 'Data Management',
    'settings.dataSubtitle': 'Manage student records and local storage persistence',
    'settings.regStudents': 'Registered Students',
    'settings.regClasses': 'Registered Classes',
    'settings.pointTx': 'Point Transactions',
    'settings.persistence': 'Persistence Engine',
    'settings.localEngine': 'LocalStorage (Client)',
    'settings.loadSample': 'Load Sample Data (12 Students)',
    'settings.clearSample': 'Clear Sample Data',
    'settings.resetClasses': 'Restore Default Classes',
    'settings.resetAll': 'Reset All Application Data',
    'settings.rulesTitle': 'Level Progression Rules',
    'settings.formula': 'Fixed formula: Level = floor(points / 100) + 1',
    'settings.formulaDesc': 'Every 100 points increases the student\'s level by exactly 1. The progress bar represents progress inside the student\'s current level (0% to 99%).',
    'settings.thLevel': 'Level',
    'settings.thRange': 'Points Range',
    'settings.thExample': 'Example Progress',
    'settings.sampleLoaded': 'Sample students and point history loaded successfully.',
    'settings.sampleCleared': 'Sample data cleared.',
    'settings.classesRestored': 'Default classes restored successfully.',
    'settings.resetDone': 'All application data has been reset.',
    'settings.resetClassesTitle': 'Restore Default Classes',
    'settings.resetClassesMsg': 'Reset class list back to the default 4 grades (6th, 7th, 8th, 9th)?',
    'settings.resetClassesDesc': 'Any custom registered classes will be replaced with the defaults.',
    'settings.resetClassesConfirm': 'Restore Default Classes',
    'settings.clearSampleTitle': 'Clear Sample Data',
    'settings.clearSampleMsg': 'Remove all sample students and their points history?',
    'settings.clearSampleDesc': 'Any custom students you registered will remain untouched.',
    'settings.clearSampleConfirm': 'Clear Sample Data',
    'settings.resetTitle': 'Reset All Data',
    'settings.resetMsg': 'Delete all students, points, and transaction history?',
    'settings.resetDesc': 'This action cannot be undone. All local storage will be cleared.',
    'settings.resetConfirm': 'Reset Everything',
    'settings.langTitle': 'Application Language',
    'settings.langSubtitle': 'Select your preferred language interface',
    'settings.themeTitle': 'Appearance & Theme',
    'settings.themeSubtitle': 'Customize color theme for light or dark mode viewing',
    'settings.themeLight': 'Light Mode',
    'settings.themeLightDesc': 'Crisp and bright interface',
    'settings.themeDark': 'Dark Mode',
    'settings.themeDarkDesc': 'Reduced eye strain in low light',
    'settings.themeSystem': 'System Default',
    'settings.themeSystemDesc': 'Follows your OS appearance preference',
    'settings.teacherSecurityTitle': 'Teacher Security Master Key',
    'settings.teacherSecurityDesc': 'Master authorization key required to register new teacher accounts (prevents student abuse)',
    'settings.currentKey': 'Current Security Code',
    'settings.updateKey': 'Update Security Key',
    'settings.keyUpdated': 'Teacher security key updated successfully.',

    // Reasons
    'reason.Participation': 'Participation',
    'reason.Activity': 'Activity',
    'reason.Challenge': 'Challenge',
    'reason.Teamwork': 'Teamwork',
    'reason.Computer Activity': 'Computer Activity',
    'reason.Assignment': 'Assignment',
    'reason.Class Participation': 'Class Participation',
    'reason.Major Project': 'Major Project',
    'reason.Science Fair Challenge': 'Science Fair Challenge',
    'reason.Robotics Challenge': 'Robotics Challenge',
    'reason.Math Olympiad': 'Math Olympiad',
    'reason.Graduation Prep Project': 'Graduation Prep Project',
    'reason.Leadership Challenge': 'Leadership Challenge',
  },
  pt: {
    // Navbar
    'nav.brand': 'PointsTracker',
    'nav.subtitle': 'Sistema de Pontos',
    'nav.dashboard': 'Painel',
    'nav.students': 'Alunos',
    'nav.classes': 'Turmas',
    'nav.settings': 'Configurações',
    'nav.joinClass': 'Entrar na Turma',
    'nav.joinClassShort': 'Entrar',
    'nav.switchLang': 'Mudar idioma para Inglês',
    'nav.switchToDark': 'Ativar Modo Escuro',
    'nav.switchToLight': 'Ativar Modo Claro',
    'nav.themeToggle': 'Alternar tema claro/escuro',
    'nav.logout': 'Sair',
    'nav.roleTeacher': 'Professor',
    'nav.roleStudent': 'Aluno',

    // Authentication & Portals
    'auth.roleStudent': 'Aluno',
    'auth.roleTeacher': 'Professor',
    'auth.studentPortalTitle': 'Área do Aluno',
    'auth.teacherPortalTitle': 'Portal do Professor',
    'auth.loginTitle': 'Acesso ao Sistema de Pontos',
    'auth.loginSubtitle': 'Escolha seu perfil para entrar ou se cadastrar',
    'auth.studentLogin': 'Entrar como Aluno',
    'auth.teacherLogin': 'Entrar como Professor',
    'auth.studentRegister': 'Cadastro de Aluno',
    'auth.teacherRegister': 'Cadastro de Professor',
    'auth.fullName': 'Nome Completo',
    'auth.fullNamePlaceholder': 'Digite seu nome completo...',
    'auth.class': 'Turma',
    'auth.selectClass': 'Selecione sua turma...',
    'auth.username': 'Usuário / Login',
    'auth.usernamePlaceholder': 'ex: ana.silva',
    'auth.emailOrUser': 'Usuário ou E-mail do Professor',
    'auth.emailOrUserPlaceholder': 'ex: teacher ou prof@escola.com',
    'auth.password': 'Senha',
    'auth.passwordPlaceholder': 'Digite sua senha...',
    'auth.teacherSecurityKey': 'Chave de Segurança do Professor (Código Mestre)',
    'auth.teacherSecurityKeyPlaceholder': 'Digite a chave de segurança do professor',
    'auth.teacherSecurityKeyHelp': 'Código de autorização obrigatório para impedir que alunos criem contas de professor.',
    'auth.loginBtn': 'Entrar no Sistema',
    'auth.registerBtn': 'Cadastrar Conta',
    'auth.alreadyHaveAccount': 'Já possui conta? Clique para entrar',
    'auth.dontHaveAccount': 'Não tem conta? Cadastre-se aqui',
    'auth.logout': 'Sair',
    'auth.demoAccounts': 'Credenciais de Exemplo / Demonstração',
    'auth.quickStudentLogin': 'Entrar com Aluno de Exemplo',
    'auth.quickTeacherLogin': 'Entrar como Professor (Padrão: teacher / admin123)',
    'auth.defaultTeacherHint': 'Professor padrão: teacher / admin123 • Chave de Segurança: PROF2025',
    'auth.errorFillAll': 'Por favor, preencha todos os campos obrigatórios.',
    'auth.errorSelectClass': 'Por favor, selecione sua turma.',
    'auth.errorInvalidKey': 'Chave de Segurança do Professor inválida. Alunos não têm autorização para criar contas de professor.',

    // Student Portal View
    'portal.welcome': 'Bem-vindo(a), {name}!',
    'portal.yourClass': 'Turma: {className}',
    'portal.yourPoints': 'Meus Pontos Acumulados',
    'portal.yourLevel': 'Nível Atual',
    'portal.nextLevel': 'Próxima Meta',
    'portal.ptsNeeded': 'Faltam {points} pontos para alcançar o Nível {level}',
    'portal.historyTitle': 'Meu Histórico de Pontos e Atividades',
    'portal.historyEmpty': 'Nenhum ponto registrado ainda. Participe das atividades da turma para ganhar pontos!',
    'portal.infoTitle': 'Painel Individual do Aluno',
    'portal.infoDesc': 'Este portal exibe exclusivamente os seus pontos, nível e conquistas individuais.',
    'portal.securityNote': 'Visualização Individual e Privada • Apenas suas informações são exibidas.',
    'portal.levelProgress': 'Progresso do Nível {level} ({progress}%)',

    // Classes
    'class.6th-grade': '6º Ano',
    'class.7th-grade': '7º Ano',
    'class.8th-grade': '8º Ano',
    'class.9th-grade': '9º Ano',

    // Dashboard
    'dash.badge': 'Painel do Professor',
    'dash.title': 'Pontos e Progresso da Turma',
    'dash.subtitle': 'Acompanhe a progressão dos alunos, atribua pontos por participação e conquistas, e gerencie as turmas.',
    'dash.registerStudent': 'Cadastrar Aluno',
    'dash.registerClass': 'Cadastrar Turma',
    'dash.viewAllStudents': 'Ver Todos os Alunos',
    'dash.overview': 'Resumo Geral',
    'dash.totalStudents': 'Total de Alunos',
    'dash.enrolled': 'Matriculados na escola',
    'dash.students': 'Alunos',
    'dash.totalPoints': 'Total de Pontos',
    'dash.pointsAwarded': 'Pontos concedidos',
    'dash.academicClasses': 'Turmas Acadêmicas',
    'dash.classesSubtitle': 'Visão geral e métricas de progressão para cada turma',
    'dash.noClasses': 'Nenhuma turma cadastrada ainda',
    'dash.noClassesDesc': 'Cadastre sua primeira turma para começar a gerenciar alunos e pontos.',

    // Students Page
    'students.title': 'Gestão de Alunos',
    'students.subtitle': 'Pesquise, filtre, atribua pontos e acompanhe o progresso dos alunos em todas as turmas.',
    'students.searchPlaceholder': 'Buscar aluno por nome...',
    'students.allClasses': 'Todas as Turmas',
    'students.sortBy': 'Ordenar por:',
    'students.points': 'Pontos',
    'students.level': 'Nível',
    'students.name': 'Nome',
    'students.gridView': 'Grade',
    'students.tableView': 'Tabela',
    'students.showing': 'Mostrando {count} alunos',
    'students.showingSingle': 'Mostrando 1 aluno',
    'students.matching': 'correspondendo a "{query}"',
    'students.noFoundTitle': 'Nenhum aluno encontrado',
    'students.noFoundSearch': 'Nenhum aluno correspondente a "{query}" em {className}.',
    'students.noFoundEmpty': 'Não há alunos cadastrados nesta seleção.',
    'students.registerBtn': 'Cadastrar um Aluno',
    'students.colName': 'Nome do Aluno',
    'students.colClass': 'Turma',
    'students.colLevel': 'Nível',
    'students.colPoints': 'Pontos',
    'students.colProgress': 'Progresso',
    'students.colActions': 'Ações',
    'students.addPoints': '+ Pontos',
    'students.profile': 'Perfil',
    'students.sample': 'Exemplo',
    'students.ptsToNext': '{points} pts para Nív {level}',

    // Classes Page
    'classes.studentsCount': '{count} Alunos',
    'classes.studentSingle': '1 Aluno',
    'classes.subtitle': 'Desempenho da turma, níveis de progressão e ranking de pontuação',
    'classes.registerClass': 'Cadastrar Turma',
    'classes.editClass': 'Editar Turma',
    'classes.deleteClass': 'Excluir Turma',
    'classes.deleteClassTitle': 'Excluir Turma',
    'classes.deleteClassMsg': 'Excluir a turma "{className}"?',
    'classes.deleteClassDesc': 'Esta ação não pode ser desfeita. Quaisquer alunos atribuídos a esta turma permanecerão cadastrados mas sem turma ativa.',
    'classes.deleteClassConfirm': 'Excluir Turma',
    'classes.noClassesRegistered': 'Nenhuma turma cadastrada ainda',
    'classes.noClassesDesc': 'Comece criando sua primeira turma ou grupo acadêmico.',
    'classes.createFirstClass': 'Cadastrar Primeira Turma',
    'classes.addStudentTo': 'Adicionar Aluno ao {className}',
    'classes.numStudents': 'Quantidade de Alunos',
    'classes.avgPoints': 'Média de Pontos',
    'classes.avgLevel': 'Nível Médio',
    'classes.avgProgress': 'Progresso Médio',
    'classes.highestScoring': 'Aluno com Maior Pontuação',
    'classes.pts': 'pontos',
    'classes.viewProfile': 'Ver Perfil',
    'classes.rankingTitle': 'Ranking do {className}',
    'classes.noStudentsYet': 'Nenhum aluno nesta turma ainda.',
    'classes.registerToRank': 'Cadastre alunos para visualizar o ranking.',
    'classes.studentsTitle': 'Alunos do {className} ({count})',
    'classes.addFirstStudent': 'Adicionar Primeiro Aluno',
    'classes.top': '1º Lugar',
    'classes.progression': 'Progressão da Turma',
    'classes.progressPct': '{pct}% de progresso',

    // Class Form Modal
    'classForm.newTitle': 'Cadastrar Nova Turma',
    'classForm.editTitle': 'Editar Turma',
    'classForm.newSubtitle': 'Crie uma nova turma para organizar alunos e acompanhar pontos',
    'classForm.editSubtitle': 'Atualize o nome, ano/série ou cor da turma',
    'classForm.name': 'Nome da Turma',
    'classForm.namePlaceholder': 'ex: 5º Ano A, Clube de Programação, Artes 101',
    'classForm.gradeNumber': 'Ano / Série (Opcional)',
    'classForm.gradePlaceholder': 'ex: 5, 6, 7, 8...',
    'classForm.shortName': 'Código / Sigla (Opcional)',
    'classForm.shortNamePlaceholder': 'ex: 5A, 6º, ROB',
    'classForm.color': 'Tema de Cor',
    'classForm.description': 'Descrição (Opcional)',
    'classForm.descPlaceholder': 'ex: Turno Matutino, Sala 204, Prof. Silva',
    'classForm.createBtn': 'Cadastrar Turma',
    'classForm.saveBtn': 'Salvar Alterações',
    'classForm.cancel': 'Cancelar',
    'classForm.errorName': 'Por favor, digite o nome da turma.',
    'classForm.errorDuplicate': 'Já existe uma turma com este nome.',

    // Student Details
    'details.back': 'Voltar',
    'details.edit': 'Editar',
    'details.delete': 'Excluir',
    'details.notFoundTitle': 'Aluno Não Encontrado',
    'details.notFoundDesc': 'O aluno solicitado não foi encontrado ou pode ter sido excluído.',
    'details.returnBtn': 'Voltar para Alunos',
    'details.sampleBadge': 'Dados de Exemplo',
    'details.registeredDate': 'Cadastrado em {date}',
    'details.addPoints': 'Adicionar Pontos',
    'details.removePoints': 'Remover Pontos',
    'details.currentLevel': 'Nível Atual',
    'details.currentPoints': 'Pontos Atuais',
    'details.nextMilestone': 'Próxima Meta',
    'details.ptsUntil': '{points} pontos até o Nível {nextLevel}',
    'details.ptsInLevel': '{current}/100 no Nível {level}',
    'details.levelProgress': 'Progresso do Nível {level}',
    'details.levelStart': 'Início do Nível {level} ({points} pts)',
    'details.levelTarget': '{points} pontos para Nível {nextLevel} ({total} pts)',
    'details.deleteTitle': 'Excluir Aluno',
    'details.deleteMsg': 'Excluir {name}?',
    'details.deleteDesc': 'Esta ação não pode ser desfeita. Todo o histórico de pontos deste aluno também será excluído.',
    'details.deleteConfirm': 'Excluir Aluno',

    // History
    'history.title': 'Histórico de Pontos',
    'history.records': '{count} registros',
    'history.recordSingle': '1 registro',
    'history.empty': 'Nenhuma transação de pontos registrada ainda.',
    'history.emptySub': 'Quando pontos forem adicionados ou removidos, os registros aparecerão aqui.',
    'history.points': 'pontos',

    // Modals
    'modal.addTitle': 'Adicionar Pontos',
    'modal.removeTitle': 'Remover Pontos',
    'modal.quickSelect': 'Seleção Rápida',
    'modal.customAmount': 'Valor Personalizado',
    'modal.enterPoints': 'Digite a quantidade de pontos...',
    'modal.reason': 'Motivo',
    'modal.optional': '(opcional)',
    'modal.presets': 'Escolher dos modelos',
    'modal.customReason': 'Motivo personalizado',
    'modal.customReasonPlaceholder': 'ex: Apresentação na Feira de Ciências',
    'modal.projectedChange': 'Mudança Prevista',
    'modal.cancel': 'Cancelar',
    'modal.addSubmit': 'Adicionar {amount} Pontos',
    'modal.removeSubmit': 'Remover {amount} Pontos',
    'modal.removeConfirmTitle': 'Remover Pontos',
    'modal.removeConfirmMsg': 'Remover {amount} pontos de {name}?',
    'modal.removeConfirmDesc': 'Esta ação será registrada no histórico do aluno.',
    'modal.removeConfirmBtn': 'Remover Pontos',
    'modal.errorPositive': 'Por favor, insira um número positivo válido.',
    'modal.errorInsufficient': 'O aluno não possui pontos suficientes.',

    // Student Form Modal
    'form.newTitle': 'Cadastrar Novo Aluno',
    'form.editTitle': 'Editar Aluno',
    'form.newSubtitle': 'Adicionar um novo aluno a uma turma',
    'form.editSubtitle': 'Atualizar nome do aluno ou turma atribuída',
    'form.fullName': 'Nome Completo',
    'form.namePlaceholder': 'ex: João Silva',
    'form.class': 'Turma',
    'form.createClassQuick': '+ Cadastrar Nova Turma',
    'form.noClassesYet': 'Nenhuma turma cadastrada ainda. Crie uma abaixo.',
    'form.initialPoints': 'Pontos Iniciais:',
    'form.initialLevel': 'Nível Inicial:',
    'form.pointsVal': '0 pontos',
    'form.levelVal': 'Nível 1',
    'form.save': 'Salvar Alterações',
    'form.register': 'Cadastrar Aluno',
    'form.errorName': 'Por favor, digite o nome do aluno.',
    'form.errorClass': 'Por favor, selecione uma turma.',

    // Level-up Toast
    'toast.levelUp': 'Subiu de Nível!',
    'toast.lvl': 'Nív',
    'toast.advanced': 'Avançou do Nível {oldLevel} para o Nível {newLevel}! 🎉',

    // Join Class
    'join.title': 'ENTRE NA SUA TURMA',
    'join.subtitle': 'Digite seu nome e selecione sua turma para começar a acompanhar seus pontos.',
    'join.fullName': 'Nome Completo',
    'join.namePlaceholder': 'Digite seu nome completo...',
    'join.selectClass': 'Selecione sua turma',
    'join.btn': 'ENTRAR',
    'join.teacherBtn': 'Painel do Professor',
    'join.successTitle': 'Cadastro concluído!',
    'join.welcome': 'Bem-vindo(a), {name}!',
    'join.addedTo': 'Você foi adicionado(a) ao {className}.',
    'join.currentPoints': 'Pontos atuais',
    'join.currentLevel': 'Nível Atual',
    'join.level1': 'Nível 1',
    'join.registerAnother': 'Cadastrar Outro Aluno',
    'join.done': 'Concluir',
    'join.footer': 'Acompanhamento de Pontos e Progresso dos Alunos • Modo Aluno',
    'join.errorName': 'Por favor, digite seu nome completo.',
    'join.errorClass': 'Por favor, selecione sua turma.',

    // Settings
    'settings.title': 'Configurações',
    'settings.subtitle': 'Gerencie dados de exemplo, consulte as regras de progressão de nível e controle o armazenamento local.',
    'settings.dataTitle': 'Gestão de Dados',
    'settings.dataSubtitle': 'Gerencie registros de alunos e persistência no armazenamento local',
    'settings.regStudents': 'Alunos Cadastrados',
    'settings.regClasses': 'Turmas Cadastradas',
    'settings.pointTx': 'Transações de Pontos',
    'settings.persistence': 'Mecanismo de Persistência',
    'settings.localEngine': 'LocalStorage (Cliente)',
    'settings.loadSample': 'Carregar Dados de Exemplo (12 Alunos)',
    'settings.clearSample': 'Limpar Dados de Exemplo',
    'settings.resetClasses': 'Restaurar Turmas Padrão',
    'settings.resetAll': 'Redefinir Todos os Dados da Aplicação',
    'settings.rulesTitle': 'Regras de Progressão de Nível',
    'settings.formula': 'Fórmula fixa: Nível = floor(pontos / 100) + 1',
    'settings.formulaDesc': 'A cada 100 pontos o nível do aluno aumenta em exatamente 1. A barra de progresso representa o progresso dentro do nível atual (0% a 99%).',
    'settings.thLevel': 'Nível',
    'settings.thRange': 'Faixa de Pontos',
    'settings.thExample': 'Exemplo de Progresso',
    'settings.sampleLoaded': 'Alunos de exemplo e histórico de pontos carregados com sucesso.',
    'settings.sampleCleared': 'Dados de exemplo excluídos.',
    'settings.classesRestored': 'Turmas padrão restauradas com sucesso.',
    'settings.resetDone': 'Todos os dados da aplicação foram redefinidos.',
    'settings.resetClassesTitle': 'Restaurar Turmas Padrão',
    'settings.resetClassesMsg': 'Redefinir a lista de turmas de volta para as 4 séries padrão (6º, 7º, 8º e 9º Ano)?',
    'settings.resetClassesDesc': 'Todas as turmas personalizadas cadastradas serão substituídas pelas turmas padrão.',
    'settings.resetClassesConfirm': 'Restaurar Turmas Padrão',
    'settings.clearSampleTitle': 'Limpar Dados de Exemplo',
    'settings.clearSampleMsg': 'Remover todos os alunos de exemplo e seu histórico de pontos?',
    'settings.clearSampleDesc': 'Quaisquer alunos que você cadastrou permanecerão intactos.',
    'settings.clearSampleConfirm': 'Limpar Dados de Exemplo',
    'settings.resetTitle': 'Redefinir Todos os Dados',
    'settings.resetMsg': 'Excluir todos os alunos, pontos e histórico de transações?',
    'settings.resetDesc': 'Esta ação não pode ser desfeita. Todo o armazenamento local será apagado.',
    'settings.resetConfirm': 'Redefinir Tudo',
    'settings.langTitle': 'Idioma do Aplicativo',
    'settings.langSubtitle': 'Selecione seu idioma de preferência para a interface',
    'settings.themeTitle': 'Aparência & Tema',
    'settings.themeSubtitle': 'Escolha entre tema claro, escuro ou automático do sistema',
    'settings.themeLight': 'Modo Claro',
    'settings.themeLightDesc': 'Interface clara e nítida',
    'settings.themeDark': 'Modo Escuro',
    'settings.themeDarkDesc': 'Confortável para os olhos em baixa luminosidade',
    'settings.themeSystem': 'Padrão do Sistema',
    'settings.themeSystemDesc': 'Segue a preferência de aparência do seu sistema operacional',
    'settings.teacherSecurityTitle': 'Chave Mestra de Segurança do Professor',
    'settings.teacherSecurityDesc': 'Chave de autorização exigida para cadastrar novos professores (impede cadastro indevido de alunos)',
    'settings.currentKey': 'Chave de Segurança Atual',
    'settings.updateKey': 'Atualizar Chave',
    'settings.keyUpdated': 'Chave de segurança atualizada com sucesso.',

    // Reasons
    'reason.Participation': 'Participação',
    'reason.Activity': 'Atividade',
    'reason.Challenge': 'Desafio',
    'reason.Teamwork': 'Trabalho em Equipe',
    'reason.Computer Activity': 'Atividade no Computador',
    'reason.Assignment': 'Tarefa',
    'reason.Class Participation': 'Participação em Aula',
    'reason.Major Project': 'Projeto Principal',
    'reason.Science Fair Challenge': 'Desafio da Feira de Ciências',
    'reason.Robotics Challenge': 'Desafio de Robótica',
    'reason.Math Olympiad': 'Olimpíada de Matemática',
    'reason.Graduation Prep Project': 'Projeto Pré-Formatura',
    'reason.Leadership Challenge': 'Desafio de Liderança',
  },
} as const;

const LanguageContext = createContext<LanguageContextType | null>(null);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved === 'en' || saved === 'pt') return saved;
        // Check browser default language
        if (navigator.language && navigator.language.startsWith('pt')) {
          return 'pt';
        }
      }
    } catch {
      // ignore
    }
    return 'pt'; // default to Portuguese for the school context, easily toggleable
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // ignore
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(language === 'en' ? 'pt' : 'en');
  }, [language, setLanguage]);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const dict = translations[language] as Record<string, string>;
      const fallbackDict = translations.en as Record<string, string>;
      let text = dict[key] || fallbackDict[key] || key;

      if (params) {
        Object.entries(params).forEach(([paramKey, paramVal]) => {
          text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramVal));
        });
      }

      return text;
    },
    [language]
  );

  const getClassName = useCallback(
    (classId: ClassId, fallbackName?: string): string => {
      const key = `class.${classId}`;
      const dict = translations[language] as Record<string, string>;
      const fallbackDict = translations.en as Record<string, string>;
      if (dict && dict[key]) return dict[key];
      if (fallbackDict && fallbackDict[key]) return fallbackDict[key];
      return fallbackName || classId;
    },
    [language]
  );

  const getReasonLabel = useCallback(
    (reason: string): string => {
      const key = `reason.${reason}`;
      const dict = translations[language] as Record<string, string>;
      return dict[key] || reason;
    },
    [language]
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      toggleLanguage,
      t,
      getClassName,
      getReasonLabel,
    }),
    [language, setLanguage, toggleLanguage, t, getClassName, getReasonLabel]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
