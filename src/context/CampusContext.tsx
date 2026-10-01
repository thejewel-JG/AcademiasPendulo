import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  UserProfile,
  Enrollment,
  QuestionThread,
  QuestionMessage,
  SecretaryRequest,
  SecretaryMessage,
  Announcement,
  CampusCourse,
  CampusView,
  ResourceItem,
  ContactRequest,
  ContactRequestStatus,
  UserRole,
} from '../types/campus';
import { MOCK_COURSES } from '../data/campusMockData';

interface ActiveEnrollmentData {
  matricula_id: string;
  estado: string;
  fecha_inicio: string;
  grupo_id: string;
  grupo_nombre: string;
  especialidad_id: string;
  especialidad_codigo: string;
  especialidad_nombre: string;
  profesor_id: string;
  profesor_nombre: string;
}

interface CampusContextType {
  currentUser: UserProfile | null;
  currentView: CampusView;
  isCampusRoute: boolean;
  activeCourseId: string | null;
  authError: string | null;
  campusTheme: 'dark' | 'light';
  toggleCampusTheme: () => void;
  setCampusTheme: (theme: 'dark' | 'light') => void;

  users: UserProfile[];
  courses: CampusCourse[];
  enrollments: Enrollment[];
  questions: QuestionThread[];
  secretaryRequests: SecretaryRequest[];
  announcements: Announcement[];
  contactRequests: ContactRequest[];
  emailThreads: any[];
  completedLessonIds: string[];
  
  // Real DB state
  activeEnrollmentData: ActiveEnrollmentData | null;
  specialties: any[];
  groups: any[];

  // Navigation & Auth
  navigateTo: (view: CampusView, courseId?: string) => void;
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;

  // Data Queries
  getCourseById: (courseId: string) => CampusCourse | undefined;
  getUserEnrollments: (userId: string) => { course: CampusCourse; enrollment: Enrollment }[];
  userHasActiveEnrollment: (userId: string, courseId: string) => boolean;
  getCourseProgress: (courseId: string) => number;
  getLastVisitedLesson: () => { course: CampusCourse; lesson: any } | null;

  // Actions
  toggleLessonCompletion: (lessonId: string) => void;
  recordLastVisitedLesson: (courseId: string, lessonId: string) => void;
  addQuestionThread: (thread: Omit<QuestionThread, 'id' | 'fechaCreacion' | 'fechaUltimaActualizacion'>) => void;
  addQuestionMessage: (threadId: string, msg: Omit<QuestionMessage, 'id'>) => void;
  addSecretaryRequest: (req: Omit<SecretaryRequest, 'id' | 'fechaCreacion' | 'fechaUltimaActualizacion'>) => void;
  addSecretaryMessage: (reqId: string, msg: Omit<SecretaryMessage, 'id'>) => void;
  addAnnouncement: (ann: Omit<Announcement, 'id'>) => void;
  updateUserProfile: (userId: string, data: Partial<UserProfile>) => void;

  // Material & Email
  publishCourseResource: (courseId: string, moduleId: string, resource: any) => void;

  // Admin Actions
  addUser: (user: Omit<UserProfile, 'id'>) => void;
  toggleUserActive: (userId: string) => void;
  addEnrollment: (studentId: string, courseId: string) => void;
  removeEnrollment: (studentId: string, courseId: string) => void;
  updateSecretaryStatus: (reqId: string, status: SecretaryRequest['estado']) => void;
  submitContactRequest: (data: Omit<ContactRequest, 'id' | 'status' | 'created_at'>) => Promise<boolean>;
}

const CampusContext = createContext<CampusContextType | undefined>(undefined);

export const CampusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('pendulo_campus_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [campusTheme, setCampusThemeState] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('pendulo_campus_theme');
    return (saved === 'light' ? 'light' : 'dark') as 'dark' | 'light';
  });

  const setCampusTheme = (theme: 'dark' | 'light') => {
    setCampusThemeState(theme);
    localStorage.setItem('pendulo_campus_theme', theme);
  };

  const toggleCampusTheme = () => {
    setCampusThemeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('pendulo_campus_theme', next);
      return next;
    });
  };

  const [currentView, setCurrentView] = useState<CampusView>('dashboard');
  const [activeCourseId, setActiveCourseId] = useState<string | null>('TMVG0004');
  const [authError, setAuthError] = useState<string | null>(null);

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [courses, setCourses] = useState<CampusCourse[]>(MOCK_COURSES);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [questions, setQuestions] = useState<QuestionThread[]>([]);
  const [secretaryRequests, setSecretaryRequests] = useState<SecretaryRequest[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [contactRequests, setContactRequests] = useState<ContactRequest[]>([]);
  const [emailThreads, setEmailThreads] = useState<any[]>([]);

  const [activeEnrollmentData, setActiveEnrollmentData] = useState<ActiveEnrollmentData | null>(null);
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);

  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);
  const [lastVisited, setLastVisited] = useState<{ courseId: string; lessonId: string }>({
    courseId: 'TMVG0004',
    lessonId: 'les_1_1',
  });

  const [isCampusRoute, setIsCampusRoute] = useState<boolean>(() => {
    return window.location.pathname.startsWith('/campus');
  });

  // Verify auth session on initial load
  const refreshSession = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        const profile: UserProfile = {
          id: data.user.id,
          nombre: data.user.nombre,
          apellidos: data.user.apellidos,
          email: data.user.email,
          role: data.activeRole === 'ADMINISTRADOR' ? 'ADMINISTRACION' : (data.activeRole as any),
          activo: data.user.estado === 'ACTIVO',
          fechaAlta: new Date().toISOString(),
          mustChangePassword: data.mustChangePassword
        };
        setCurrentUser(profile);
        fetchBackendData(profile);
      } else {
        setCurrentUser(null);
      }
    } catch (e) {
      console.warn('Session check warning:', e);
    }
  };

  const fetchBackendData = async (user: UserProfile) => {
    try {
      // 1. Fetch active enrollment if student
      if (user.role === 'ALUMNO') {
        const enrRes = await fetch('/api/academic/my-enrollment');
        if (enrRes.ok) {
          const enrData = await enrRes.json();
          if (enrData.activeEnrollment) {
            setActiveEnrollmentData(enrData.activeEnrollment);
            // Sync local enrollments representation
            setEnrollments([
              {
                id: enrData.activeEnrollment.matricula_id,
                estudianteId: user.id,
                cursoId: 'TMVG0004',
                fechaMatricula: enrData.activeEnrollment.fecha_inicio,
                estado: 'active',
                progresoCalculado: 0,
              }
            ]);
          } else {
            setActiveEnrollmentData(null);
            setEnrollments([]);
          }
        }
      }

      // 2. Fetch specialties catalog
      const specRes = await fetch('/api/academic/specialties');
      if (specRes.ok) {
        const specData = await specRes.json();
        setSpecialties(specData);
      }

      // 3. Fetch groups catalog
      const grpRes = await fetch('/api/academic/groups');
      if (grpRes.ok) {
        const grpData = await grpRes.json();
        setGroups(grpData);
      }

      // 4. Fetch users list if admin
      if (user.role === 'ADMINISTRACION') {
        const usrRes = await fetch('/api/admin/users');
        if (usrRes.ok) {
          const usrData = await usrRes.json();
          setUsers(
            usrData.users.map((u: any) => ({
              id: u.id,
              nombre: u.nombre,
              apellidos: u.apellidos,
              email: u.email,
              role: u.roles.includes('ADMINISTRADOR') ? 'ADMINISTRACION' : u.roles[0],
              activo: u.estado === 'ACTIVO',
              fechaAlta: u.creado_en
            }))
          );
        }
      }

      // 5. Fetch doubt conversations
      const convRes = await fetch('/api/communications/conversations');
      if (convRes.ok) {
        const convData = await convRes.json();
        setQuestions(
          convData.map((c: any) => ({
            id: c.id,
            estudianteId: c.creador_id,
            estudianteNombre: c.creador_nombre,
            profesorId: c.responsable_id || 'prof1',
            cursoId: 'TMVG0004',
            cursoNombre: 'Mecánica de Vehículos Híbridos',
            moduloUnidad: 'General',
            asunto: c.asunto,
            estado: c.estado === 'ABIERTA' ? 'PENDIENTE' : c.estado,
            fechaCreacion: c.creado_en,
            fechaUltimaActualizacion: c.actualizado_en,
            mensajes: [
              {
                id: `msg_${c.id}`,
                autorId: c.creador_id,
                autorNombre: c.creador_nombre,
                autorRol: 'ALUMNO',
                texto: c.ultimo_mensaje || c.asunto,
                fechaHora: c.actualizado_en
              }
            ]
          }))
        );
      }

    } catch (err) {
      console.warn('Backend data sync error:', err);
    }
  };

  useEffect(() => {
    refreshSession();
  }, []);

  useEffect(() => {
    const checkPath = () => {
      const isCampus = window.location.pathname.startsWith('/campus');
      setIsCampusRoute(isCampus);
    };

    checkPath();
    window.addEventListener('popstate', checkPath);
    return () => window.removeEventListener('popstate', checkPath);
  }, []);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('pendulo_campus_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('pendulo_campus_user');
    }
  }, [currentUser]);

  const navigateTo = (view: CampusView, courseId?: string) => {
    setCurrentView(view);
    setAuthError(null);
    if (courseId) {
      setActiveCourseId(courseId);
    }

    let path = '/campus';
    if (view === 'login') path = '/campus/login';
    else if (view === 'cursos') path = '/campus/cursos';
    else if (view === 'curso-detalle') path = `/campus/cursos/${courseId || activeCourseId || 'TMVG0004'}`;
    else if (view === 'dudas') path = '/campus/dudas';
    else if (view === 'secretaria') path = '/campus/secretaria';
    else if (view === 'avisos') path = '/campus/avisos';
    else if (view === 'perfil') path = '/campus/perfil';
    else if (view === 'profesor-dashboard') path = '/profesor';
    else if (view === 'admin-panel') path = '/admin';
    else if (view === 'admin-usuarios') path = '/admin/usuarios';
    else if (view === 'admin-correo') path = '/admin/correo';
    else if (view === 'admin-solicitudes') path = '/admin/solicitudes';

    window.history.pushState(null, '', path);
    setIsCampusRoute(true);
  };

  const login = async (email: string, pass: string): Promise<boolean> => {
    setAuthError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password: pass })
      });

      const data = await res.json();

      if (!res.ok) {
        setAuthError(data.error || 'Credenciales inválidas.');
        return false;
      }

      const userProfile: UserProfile = {
        id: data.user.id,
        nombre: data.user.nombre,
        apellidos: data.user.apellidos,
        email: data.user.email,
        role: data.activeRole === 'ADMINISTRADOR' ? 'ADMINISTRACION' : (data.activeRole as any),
        activo: data.user.estado === 'ACTIVO',
        fechaAlta: new Date().toISOString(),
        mustChangePassword: data.mustChangePassword
      };

      setCurrentUser(userProfile);
      await fetchBackendData(userProfile);

      // Automatic Role-Based Redirection
      if (data.activeRole === 'ADMINISTRADOR') {
        navigateTo('admin-panel');
      } else if (data.activeRole === 'PROFESOR') {
        navigateTo('profesor-dashboard');
      } else {
        navigateTo('dashboard');
      }

      return true;
    } catch (err: any) {
      setAuthError('Error al conectar con el servidor de autenticación.');
      return false;
    }
  };

  // Explicit Logout: Destroys HTTP session and wipes ALL in-memory private user state
  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.warn('Logout API call error:', e);
    } finally {
      // Clear in-memory private states completely
      setCurrentUser(null);
      setActiveEnrollmentData(null);
      setUsers([]);
      setEnrollments([]);
      setQuestions([]);
      setSecretaryRequests([]);
      setAnnouncements([]);
      setContactRequests([]);
      setEmailThreads([]);
      setCompletedLessonIds([]);

      localStorage.removeItem('pendulo_campus_user');
      navigateTo('login');
    }
  };

  const getCourseById = (courseId: string) => {
    return courses.find((c) => c.id === courseId);
  };

  const getUserEnrollments = (userId: string) => {
    if (activeEnrollmentData && userId === currentUser?.id) {
      const course = courses[0]; // Active course
      return [{ course, enrollment: enrollments[0] || { id: activeEnrollmentData.matricula_id, estudianteId: userId, cursoId: 'TMVG0004', fechaMatricula: activeEnrollmentData.fecha_inicio, estado: 'active', progresoCalculado: 0 } }];
    }
    return enrollments
      .filter((e) => e.estudianteId === userId && e.estado === 'active')
      .map((e) => ({ course: courses.find((c) => c.id === e.cursoId)!, enrollment: e }))
      .filter((item) => item.course !== undefined);
  };

  const userHasActiveEnrollment = (userId: string, courseId: string) => {
    if (userId === currentUser?.id && activeEnrollmentData) {
      return activeEnrollmentData.estado === 'ACTIVA';
    }
    return enrollments.some(
      (e) => e.estudianteId === userId && e.estado === 'active'
    );
  };

  const getCourseProgress = (courseId: string) => {
    const course = getCourseById(courseId);
    if (!course) return 0;
    const allLessons = course.modulos.flatMap((m) => m.lecciones);
    if (allLessons.length === 0) return 0;
    const completedCount = allLessons.filter((l) => completedLessonIds.includes(l.id)).length;
    return Math.round((completedCount / allLessons.length) * 100);
  };

  const getLastVisitedLesson = () => {
    if (!lastVisited.courseId || !lastVisited.lessonId) return null;
    const course = getCourseById(lastVisited.courseId);
    if (!course) return null;
    const allLessons = course.modulos.flatMap((m) => m.lecciones);
    const lesson = allLessons.find((l) => l.id === lastVisited.lessonId);
    if (!lesson) return null;
    return { course, lesson };
  };

  const toggleLessonCompletion = (lessonId: string) => {
    setCompletedLessonIds((prev) =>
      prev.includes(lessonId) ? prev.filter((id) => id !== lessonId) : [...prev, lessonId]
    );
  };

  const recordLastVisitedLesson = (courseId: string, lessonId: string) => {
    setLastVisited({ courseId, lessonId });
  };

  const addQuestionThread = async (threadData: Omit<QuestionThread, 'id' | 'fechaCreacion' | 'fechaUltimaActualizacion'>) => {
    try {
      const res = await fetch('/api/communications/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'ACADEMICA',
          asunto: threadData.asunto,
          grupo_id: activeEnrollmentData?.grupo_id,
          cuerpo: threadData.mensajes[0]?.texto || threadData.asunto
        })
      });
      if (res.ok) {
        if (currentUser) fetchBackendData(currentUser);
      }
    } catch (e) {
      console.error('Error adding question thread:', e);
    }
  };

  const addQuestionMessage = async (threadId: string, msgData: Omit<QuestionMessage, 'id'>) => {
    try {
      const res = await fetch(`/api/communications/conversations/${threadId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cuerpo: msgData.texto })
      });
      if (res.ok) {
        if (currentUser) fetchBackendData(currentUser);
      }
    } catch (e) {
      console.error('Error adding question message:', e);
    }
  };

  const addSecretaryRequest = (reqData: Omit<SecretaryRequest, 'id' | 'fechaCreacion' | 'fechaUltimaActualizacion'>) => {
    const now = new Date().toISOString();
    const newReq: SecretaryRequest = {
      ...reqData,
      id: `sec_${Date.now()}`,
      fechaCreacion: now,
      fechaUltimaActualizacion: now,
    };
    setSecretaryRequests((prev) => [newReq, ...prev]);
  };

  const addSecretaryMessage = (reqId: string, msgData: Omit<SecretaryMessage, 'id'>) => {
    const newMsg: SecretaryMessage = {
      ...msgData,
      id: `sec_msg_${Date.now()}`,
    };
    setSecretaryRequests((prev) =>
      prev.map((r) => {
        if (r.id === reqId) {
          return {
            ...r,
            fechaUltimaActualizacion: new Date().toISOString(),
            mensajes: [...r.mensajes, newMsg],
          };
        }
        return r;
      })
    );
  };

  const addAnnouncement = (annData: Omit<Announcement, 'id'>) => {
    const newAnn: Announcement = {
      ...annData,
      id: `ann_${Date.now()}`,
    };
    setAnnouncements((prev) => [newAnn, ...prev]);
  };

  const updateUserProfile = (userId: string, data: Partial<UserProfile>) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...data } : u)));
    if (currentUser?.id === userId) {
      setCurrentUser((prev) => (prev ? { ...prev, ...data } : null));
    }
  };

  const addUser = async (userData: Omit<UserProfile, 'id'>) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: userData.nombre,
          apellidos: userData.apellidos,
          email: userData.email,
          role: userData.role === 'ADMINISTRACION' ? 'ADMINISTRADOR' : userData.role,
        })
      });
      if (res.ok) {
        if (currentUser) fetchBackendData(currentUser);
      }
    } catch (e) {
      console.error('Add user error:', e);
    }
  };

  const toggleUserActive = async (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: user.activo ? 'INACTIVO' : 'ACTIVO' })
      });
      if (res.ok) {
        if (currentUser) fetchBackendData(currentUser);
      }
    } catch (e) {
      console.error('Toggle user status error:', e);
    }
  };

  const addEnrollment = (studentId: string, courseId: string) => {
    const newEnr: Enrollment = {
      id: `enr_${Date.now()}`,
      estudianteId: studentId,
      cursoId: courseId,
      fechaMatricula: new Date().toISOString(),
      estado: 'active',
      progresoCalculado: 0,
    };
    setEnrollments((prev) => [...prev, newEnr]);
  };

  const removeEnrollment = async (studentId: string, courseId: string) => {
    try {
      const res = await fetch('/api/admin/enrollments/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId })
      });
      if (res.ok) {
        if (currentUser) fetchBackendData(currentUser);
      }
    } catch (e) {
      console.error('Finalize enrollment error:', e);
    }
  };

  const updateSecretaryStatus = (reqId: string, status: SecretaryRequest['estado']) => {
    setSecretaryRequests((prev) =>
      prev.map((r) => (r.id === reqId ? { ...r, estado: status, fechaUltimaActualizacion: new Date().toISOString() } : r))
    );
  };

  const submitContactRequest = async (data: Omit<ContactRequest, 'id' | 'status' | 'created_at'>): Promise<boolean> => {
    try {
      const res = await fetch('/api/public/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const newReq: ContactRequest = {
          ...data,
          id: `req_${Date.now()}`,
          status: 'new',
          created_at: new Date().toISOString(),
        };
        setContactRequests((prev) => [newReq, ...prev]);
        return true;
      }
      return false;
    } catch (e) {
      console.error('Submit contact request error:', e);
      return false;
    }
  };

  const publishCourseResource = (courseId: string, moduleId: string, resource: any) => {
    // Local resource append
    setCourses((prev) =>
      prev.map((c) => {
        if (c.id === courseId) {
          return {
            ...c,
            modulos: c.modulos.map((m) => {
              if (m.id === moduleId) {
                const resList = m.lecciones[0]?.recursos || [];
                return {
                  ...m,
                  lecciones: m.lecciones.map((l, idx) =>
                    idx === 0
                      ? {
                          ...l,
                          recursos: [
                            ...resList,
                            {
                              id: `res_${Date.now()}`,
                              titulo: resource.titulo,
                              tipo: resource.tipo,
                              urlPrivada: resource.urlPrivada,
                              tamano: resource.tamano || '2.5 MB',
                              descripcion: resource.descripcion,
                              permitirDescarga: resource.permitirDescarga ?? true,
                            },
                          ],
                        }
                      : l
                  ),
                };
              }
              return m;
            }),
          };
        }
        return c;
      })
    );
  };

  return (
    <CampusContext.Provider
      value={{
        currentUser,
        currentView,
        isCampusRoute,
        activeCourseId,
        authError,
        campusTheme,
        toggleCampusTheme,
        setCampusTheme,
        users,
        courses,
        enrollments,
        questions,
        secretaryRequests,
        announcements,
        contactRequests,
        emailThreads,
        completedLessonIds,
        activeEnrollmentData,
        specialties,
        groups,
        navigateTo,
        login,
        logout,
        refreshSession,
        getCourseById,
        getUserEnrollments,
        userHasActiveEnrollment,
        getCourseProgress,
        getLastVisitedLesson,
        toggleLessonCompletion,
        recordLastVisitedLesson,
        addQuestionThread,
        addQuestionMessage,
        addSecretaryRequest,
        addSecretaryMessage,
        addAnnouncement,
        updateUserProfile,
        publishCourseResource,
        addUser,
        toggleUserActive,
        addEnrollment,
        removeEnrollment,
        updateSecretaryStatus,
        submitContactRequest,
      }}
    >
      {children}
    </CampusContext.Provider>
  );
};

export const useCampus = () => {
  const context = useContext(CampusContext);
  if (!context) {
    throw new Error('useCampus must be used within a CampusProvider');
  }
  return context;
};
