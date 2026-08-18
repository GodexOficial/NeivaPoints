import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import type {
  AuthUser,
  ClassId,
  Student,
  StudentWithStats,
  UserRole,
} from "../types";
import { AuthService, type TeacherAccount } from "../services/authService";
import { StudentService } from "../services/studentService";

interface AuthContextType {
  currentUser: AuthUser | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isTeacher: boolean;
  isStudent: boolean;
  currentStudent: StudentWithStats | null;
  currentTeacher: TeacherAccount | null;
  teacherSecurityKey: string;
  loginStudent: (
    username: string,
    password: string,
  ) => { success: boolean; student?: Student; error?: string };
  registerStudent: (params: {
    name: string;
    classId: ClassId;
    username?: string;
    password?: string;
  }) => { success: boolean; student?: Student; error?: string };
  loginTeacher: (
    emailOrUsername: string,
    password: string,
  ) => { success: boolean; teacher?: TeacherAccount; error?: string };
  registerTeacher: (params: {
    name: string;
    emailOrUsername: string;
    password: string;
    securityKey: string;
  }) => { success: boolean; teacher?: TeacherAccount; error?: string };
  logout: () => void;
  updateTeacherSecurityKey: (newKey: string) => void;
  refreshAuth: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    return AuthService.getSession();
  });

  const [teacherSecurityKey, setTeacherSecurityKeyState] = useState<string>(
    () => {
      return AuthService.getTeacherSecurityKey();
    },
  );

  // Track the enriched student if role is student
  const [currentStudent, setCurrentStudent] = useState<StudentWithStats | null>(
    null,
  );

  // Track the teacher account if role is teacher
  const [currentTeacher, setCurrentTeacher] = useState<TeacherAccount | null>(
    null,
  );

  const refreshAuth = useCallback(() => {
    const session = AuthService.getSession();
    setCurrentUser(session);
    setTeacherSecurityKeyState(AuthService.getTeacherSecurityKey());

    if (session && session.role === "student" && session.studentId) {
      const found = StudentService.getStudentWithStatsById(session.studentId);
      setCurrentStudent(found || null);
    } else {
      setCurrentStudent(null);
    }

    if (session && session.role === "teacher") {
      const teachers = AuthService.getTeachers();
      const found = teachers.find(
        (t) =>
          t.emailOrUsername.toLowerCase() === session.username?.toLowerCase() ||
          t.id === session.studentId,
      );
      setCurrentTeacher(found || null);
    } else {
      setCurrentTeacher(null);
    }
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  const loginStudent = useCallback(
    (
      username: string,
      password: string,
    ): { success: boolean; student?: Student; error?: string } => {
      const result = AuthService.loginStudent(username, password);
      if (result.success && result.student) {
        const authUser: AuthUser = {
          role: "student",
          studentId: result.student.id,
          name: result.student.name,
          username: result.student.username,
        };
        AuthService.setSession(authUser);
        setCurrentUser(authUser);
        const enriched = StudentService.getStudentWithStatsById(
          result.student.id,
        );
        setCurrentStudent(enriched || null);
        return { success: true, student: result.student };
      }
      return { success: false, error: result.error };
    },
    [],
  );

  const registerStudent = useCallback(
    (params: {
      name: string;
      classId: ClassId;
      username?: string;
      password?: string;
    }): { success: boolean; student?: Student; error?: string } => {
      const result = AuthService.registerStudent(params);
      if (result.success && result.student) {
        const authUser: AuthUser = {
          role: "student",
          studentId: result.student.id,
          name: result.student.name,
          username: result.student.username,
        };
        AuthService.setSession(authUser);
        setCurrentUser(authUser);
        const enriched = StudentService.getStudentWithStatsById(
          result.student.id,
        );
        setCurrentStudent(enriched || null);
        return { success: true, student: result.student };
      }
      return { success: false, error: result.error };
    },
    [],
  );

  const loginTeacher = useCallback(
    (
      emailOrUsername: string,
      password: string,
    ): { success: boolean; teacher?: TeacherAccount; error?: string } => {
      const result = AuthService.loginTeacher(emailOrUsername, password);
      if (result.success && result.teacher) {
        const authUser: AuthUser = {
          role: "teacher",
          studentId: result.teacher.id,
          name: result.teacher.name,
          username: result.teacher.emailOrUsername,
        };
        AuthService.setSession(authUser);
        setCurrentUser(authUser);
        setCurrentTeacher(result.teacher);
        return { success: true, teacher: result.teacher };
      }
      return { success: false, error: result.error };
    },
    [],
  );

  const registerTeacher = useCallback(
    (params: {
      name: string;
      emailOrUsername: string;
      password: string;
      securityKey: string;
    }): { success: boolean; teacher?: TeacherAccount; error?: string } => {
      const result = AuthService.registerTeacher(params);
      if (result.success && result.teacher) {
        const authUser: AuthUser = {
          role: "teacher",
          studentId: result.teacher.id,
          name: result.teacher.name,
          username: result.teacher.emailOrUsername,
        };
        AuthService.setSession(authUser);
        setCurrentUser(authUser);
        setCurrentTeacher(result.teacher);
        return { success: true, teacher: result.teacher };
      }
      return { success: false, error: result.error };
    },
    [],
  );

  const logout = useCallback(() => {
    AuthService.clearSession();
    setCurrentUser(null);
    setCurrentStudent(null);
    setCurrentTeacher(null);
  }, []);

  const updateTeacherSecurityKey = useCallback((newKey: string) => {
    AuthService.setTeacherSecurityKey(newKey);
    setTeacherSecurityKeyState(newKey);
  }, []);

  const role = currentUser?.role || null;
  const isAuthenticated = !!currentUser;
  const isTeacher = role === "teacher";
  const isStudent = role === "student";

  const value = useMemo(
    () => ({
      currentUser,
      role,
      isAuthenticated,
      isTeacher,
      isStudent,
      currentStudent,
      currentTeacher,
      teacherSecurityKey,
      loginStudent,
      registerStudent,
      loginTeacher,
      registerTeacher,
      logout,
      updateTeacherSecurityKey,
      refreshAuth,
    }),
    [
      currentUser,
      role,
      isAuthenticated,
      isTeacher,
      isStudent,
      currentStudent,
      currentTeacher,
      teacherSecurityKey,
      loginStudent,
      registerStudent,
      loginTeacher,
      registerTeacher,
      logout,
      updateTeacherSecurityKey,
      refreshAuth,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
