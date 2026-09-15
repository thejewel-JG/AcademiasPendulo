import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  UserProfile,
  Enrollment,
  ModuleSection,
  QuestionThread,
  QuestionMessage,
  SecretaryRequest,
  SecretaryMessage,
  Announcement,
  CampusCourse,
  CampusView,
  SecretaryType,
  ResourceItem,
  EmailThread,
  EmailMessage,
  ContactRequest,
  ContactRequestStatus,
} from '../types/campus';
import {
  MOCK_USERS,
  MOCK_ENROLLMENTS,
  MOCK_COURSES,
  MOCK_QUESTIONS,
  MOCK_SECRETARY_REQUESTS,
  MOCK_ANNOUNCEMENTS,
  MOCK_CONTACT_REQUESTS,
  MOCK_EMAIL_THREADS,
} from '../data/campusMockData';

interface CampusContextType {
  currentUser: UserProfile | null;
  currentView: CampusView;
  isCampusRoute: boolean;
  activeCourseId: string | null;
  authError: string | null;
  users: UserProfile[];
  courses: CampusCourse[];
  enrollments: Enrollment[];
  questions: QuestionThread[];
  secretaryRequests: SecretaryRequest[];
  announcements: Announcement[];
  contactRequests: ContactRequest[];
  emailThreads: any[];
  completedLessonIds: string[];
  
  // Navigation & Auth
  navigateTo: (view: CampusView, courseId?: string) => void;
  login: (email: string, pass: string) => boolean;
  logout: () => void;
  
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

  // Contact Requests & Lead Management
  submitContactRequest: (data: Omit<ContactRequest, 'id' | 'created_at' | 'status'>) => ContactRequest;
  updateContactRequestStatus: (requestId: string, status: ContactRequestStatus, assignedAdminName?: string) => void;
  saveInternalNotes: (requestId: string, notes: string) => void;
  enrollContactRequestAsStudent: (requestId: string) => { student: UserProfile; enrollment: Enrollment };

  // Material & Email
  publishCourseResource: (courseId: string, moduleId: string, resource: any) => void;
  unpublishCourseResource: (courseId: string, resourceId: string) => void;
  sendEmailReply: (threadId: string, replyText: string) => void;

  // Admin Actions
  addUser: (user: Omit<UserProfile, 'id'>) => void;
  toggleUserActive: (userId: string) => void;
  addEnrollment: (studentId: string, courseId: string) => void;
  removeEnrollment: (studentId: string, courseId: string) => void;
  updateSecretaryStatus: (reqId: string, status: SecretaryRequest['estado']) => void;
}


const CampusContext = createContext<CampusContextType | undefined>(undefined);

export const CampusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('pendulo_campus_user');
    return saved ? JSON.parse(saved) : MOCK_USERS[0]; // Default student demo
  });

  const [currentView, setCurrentView] = useState<CampusView>('dashboard');
  const [activeCourseId, setActiveCourseId] = useState<string | null>('TMVG0004');
  const [authError, setAuthError] = useState<string | null>(null);

  const [users, setUsers] = useState<UserProfile[]>(MOCK_USERS);
  const [courses, setCourses] = useState<CampusCourse[]>(MOCK_COURSES);
  const [enrollments, setEnrollments] = useState<Enrollment[]>(MOCK_ENROLLMENTS);
  const [questions, setQuestions] = useState<QuestionThread[]>(MOCK_QUESTIONS);
  const [secretaryRequests, setSecretaryRequests] = useState<SecretaryRequest[]>(MOCK_SECRETARY_REQUESTS);
  const [announcements, setAnnouncements] = useState<Announcement[]>(MOCK_ANNOUNCEMENTS);

  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>(['les_1_1', 'les_1_2']);
  const [lastVisited, setLastVisited] = useState<{ courseId: string; lessonId: string }>({
    courseId: 'TMVG0004',
    lessonId: 'les_1_3',
  });

  // Track if current window location is inside /campus
  const [isCampusRoute, setIsCampusRoute] = useState<boolean>(() => {
    return window.location.pathname.startsWith('/campus');
  });

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

  const login = (email: string, pass: string): boolean => {
    setAuthError(null);
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim());

    if (!user) {
      setAuthError('No existe ninguna cuenta de usuario autorizada con este correo electrónico.');
      return false;
    }

    if (!user.activo) {
      setAuthError('Tu cuenta se encuentra inactiva. Contacta con la secretaría de Academias Péndulo.');
      return false;
    }

    setCurrentUser(user);

    // Automatic Role-Based Redirection
    if (user.role === 'ADMINISTRACION') {
      navigateTo('admin-panel');
    } else if (user.role === 'PROFESOR') {
      navigateTo('profesor-dashboard');
    } else {
      navigateTo('dashboard');
    }

    return true;
  };


  const logout = () => {
    setCurrentUser(null);
    navigateTo('login');
  };

  const getCourseById = (courseId: string) => {
    return courses.find((c) => c.id === courseId);
  };

  const getUserEnrollments = (userId: string) => {
    return enrollments
      .filter((e) => e.estudianteId === userId && e.estado === 'ACTIVA')
      .map((e) => {
        const course = courses.find((c) => c.id === e.cursoId);
        return { course: course!, enrollment: e };
      })
      .filter((item) => item.course !== undefined);
  };

  const userHasActiveEnrollment = (userId: string, courseId: string) => {
    return enrollments.some(
      (e) => e.estudianteId === userId && e.cursoId === courseId && e.estado === 'ACTIVA'
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

  const addQuestionThread = (threadData: Omit<QuestionThread, 'id' | 'fechaCreacion' | 'fechaUltimaActualizacion'>) => {
    const now = new Date().toISOString();
    const newThread: QuestionThread = {
      ...threadData,
      id: `q_${Date.now()}`,
      fechaCreacion: now,
      fechaUltimaActualizacion: now,
    };
    setQuestions((prev) => [newThread, ...prev]);
  };

  const addQuestionMessage = (threadId: string, msgData: Omit<QuestionMessage, 'id'>) => {
    const newMsg: QuestionMessage = {
      ...msgData,
      id: `msg_${Date.now()}`,
    };
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id === threadId) {
          const isProf = msgData.autorRol === 'PROFESOR';
          return {
            ...q,
            estado: isProf ? 'RESPONDIDA' : 'PENDIENTE',
            fechaUltimaActualizacion: new Date().toISOString(),
            mensajes: [...q.mensajes, newMsg],
          };
        }
        return q;
      })
    );
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

  const addUser = (userData: Omit<UserProfile, 'id'>) => {
    const newUser: UserProfile = {
      ...userData,
      id: `usr_${Date.now()}`,
    };
    setUsers((prev) => [...prev, newUser]);
  };

  const toggleUserActive = (userId: string) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, activo: !u.activo } : u)));
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

  const removeEnrollment = (studentId: string, courseId: string) => {
    setEnrollments((prev) =>
      prev.map((e) =>
        e.estudianteId === studentId && e.cursoId === courseId ? { ...e, estado: 'cancelled' } : e
      )
    );
  };

  const updateSecretaryStatus = (reqId: string, status: SecretaryRequest['estado']) => {
    setSecretaryRequests((prev) =>
      prev.map((r) => (r.id === reqId ? { ...r, estado: status, fechaUltimaActualizacion: new Date().toISOString() } : r))
    );
  };

  const [contactRequests, setContactRequests] = useState<ContactRequest[]>(MOCK_CONTACT_REQUESTS);

  const submitContactRequest = (data: Omit<ContactRequest, 'id' | 'created_at' | 'status'>): ContactRequest => {
    const newReq: ContactRequest = {
      ...data,
      id: `req-${Date.now()}`,
      created_at: new Date().toISOString(),
      status: 'new',
    };

    setContactRequests((prev) => [newReq, ...prev]);

    // Simulate sending email notification in background without blocking DB record
    console.log(`[EMAIL DISPATCH] Sending notification email to info@academiaspendulo.es: Nueva solicitud - [${data.course_code}] · [${data.course_name}] from ${data.first_name} ${data.last_name}`);

    return newReq;
  };

  const updateContactRequestStatus = (requestId: string, status: ContactRequestStatus, assignedAdminName?: string) => {
    setContactRequests((prev) =>
      prev.map((r) => {
        if (r.id === requestId) {
          return {
            ...r,
            status,
            assigned_admin_name: assignedAdminName || r.assigned_admin_name,
          };
        }
        return r;
      })
    );
  };

  const saveInternalNotes = (requestId: string, notes: string) => {
    setContactRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, internal_notes: notes } : r))
    );
  };

  const enrollContactRequestAsStudent = (requestId: string) => {
    const req = contactRequests.find((r) => r.id === requestId);
    if (!req) throw new Error('Solicitud no encontrada');

    // 1. Check if user already exists with this email
    let student = users.find((u) => u.email.toLowerCase() === req.email.toLowerCase().trim());

    if (!student) {
      student = {
        id: `usr_st_${Date.now()}`,
        nombre: req.first_name,
        apellidos: req.last_name,
        email: req.email,
        telefono: req.phone,
        role: 'ALUMNO',
        activo: true,
        fechaAlta: new Date().toISOString(),
      };
      setUsers((prev) => [...prev, student!]);
    }

    // 2. Check if student already enrolled in this course
    let existingEnrollment = enrollments.find(
      (e) => e.estudianteId === student!.id && e.cursoId === req.course_id && e.estado === 'ACTIVA'
    );
    if (!existingEnrollment) {
      existingEnrollment = {
        id: `enr_${Date.now()}`,
        estudianteId: student.id,
        cursoId: req.course_id,
        fechaMatricula: new Date().toISOString(),
        estado: 'active',
        progresoCalculado: 0,
      };
      setEnrollments((prev) => [...prev, existingEnrollment!]);
    }

    // 3. Update contact request status to 'enrolled' and associate student_id
    updateContactRequestStatus(requestId, 'enrolled');
    setContactRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, student_id: student!.id, status: 'enrolled' } : r))
    );

    return { student, enrollment: existingEnrollment };
  };

  const [emailThreads, setEmailThreads] = useState<EmailThread[]>(MOCK_EMAIL_THREADS);

  const publishCourseResource = (
    courseId: string,
    moduleId: string,
    resource: Omit<ResourceItem, 'id' | 'creadoPor' | 'fechaCreacion'>
  ) => {
    const newRes: ResourceItem = {
      ...resource,
      id: `res_${Date.now()}`,
      creadoPor: currentUser ? `${currentUser.nombre} ${currentUser.apellidos}` : 'Administrador',
      fechaCreacion: new Date().toISOString(),
    };

    setCourses((prev) =>
      prev.map((course) => {
        if (course.id === courseId) {
          const updatedModules = course.modulos.map((mod) => {
            if (mod.id === moduleId) {
              const updatedLessons = mod.lecciones.map((les, idx) => {
                if (idx === 0) {
                  return { ...les, recursos: [...les.recursos, newRes] };
                }
                return les;
              });
              return { ...mod, lecciones: updatedLessons };
            }
            return mod;
          });
          return { ...course, modulos: updatedModules };
        }
        return course;
      })
    );
  };

  const unpublishCourseResource = (courseId: string, resourceId: string) => {
    setCourses((prev) =>
      prev.map((course) => {
        if (course.id === courseId) {
          const updatedModules = course.modulos.map((mod) => ({
            ...mod,
            lecciones: mod.lecciones.map((les) => ({
              ...les,
              recursos: les.recursos.filter((r) => r.id !== resourceId),
            })),
          }));
          return { ...course, modulos: updatedModules };
        }
        return course;
      })
    );
  };

  const sendEmailReply = (threadId: string, replyText: string) => {
    const now = new Date().toISOString();
    setEmailThreads((prev) =>
      prev.map((th) => {
        if (th.id === threadId) {
          const newMsg: EmailMessage = {
            id: `emsg_${Date.now()}`,
            thread_id: threadId,
            external_message_id: `gmail-outbound-${Date.now()}`,
            sender_name: 'Secretaría Academias Péndulo',
            sender_email: 'secretaria@academiaspendulo.es',
            recipient_email: th.sender_email,
            subject: `RE: ${th.subject}`,
            body: replyText,
            received_at: now,
            direction: 'outbound',
            read: true,
          };
          return {
            ...th,
            status: 'RESPONDIDO',
            last_message_at: now,
            messages: [...th.messages, newMsg],
          };
        }
        return th;
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
        users,
        courses,
        enrollments,
        questions,
        secretaryRequests,
        announcements,
        contactRequests,
        emailThreads,
        completedLessonIds,
        navigateTo,
        login,
        logout,
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
        submitContactRequest,
        updateContactRequestStatus,
        saveInternalNotes,
        enrollContactRequestAsStudent,
        publishCourseResource,
        unpublishCourseResource,
        sendEmailReply,
        addUser,
        toggleUserActive,
        addEnrollment,
        removeEnrollment,
        updateSecretaryStatus,
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
