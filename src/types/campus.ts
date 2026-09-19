export type UserRole = 'ALUMNO' | 'PROFESOR' | 'ADMINISTRACION';

export type CampusView =
  | 'login'
  | 'dashboard'
  | 'cursos'
  | 'curso-detalle'
  | 'dudas'
  | 'secretaria'
  | 'avisos'
  | 'perfil'
  | 'profesor-dashboard'
  | 'admin-panel'
  | 'admin-solicitudes'
  | 'admin-usuarios'
  | 'admin-correo';

export type SecretaryType =
  | 'Solicitud de certificado'
  | 'Solicitud de justificante'
  | 'Entrega de documentación'
  | 'Actualización de datos'
  | 'Incidencia administrativa'
  | 'Consulta administrativa'
  | 'Otra solicitud';

export interface UserProfile {
  id: string;
  nombre: string;
  apellidos: string;
  email: string;
  telefono?: string;
  role: UserRole;
  avatarUrl?: string;
  activo: boolean;
  fechaAlta?: string;
  invitedAt?: string;
  passwordSet?: boolean;
  mustChangePassword?: boolean;
}

export interface ResourceItem {
  id: string;
  cursoId: string;
  moduloId: string;
  leccionId?: string;
  titulo: string;
  descripcion?: string;
  tipo: 'PDF' | 'VIDEO' | 'DOCUMENTO' | 'ENLACE';
  urlPrivada: string; // Storage path or signed URL
  storagePath?: string;
  tamano?: string;
  permitirDescarga?: boolean;
  duracionVideo?: string;
  publicado: boolean;
  creadoPor: string;
  fechaCreacion: string;
}

export interface Lesson {
  id: string;
  moduloId: string;
  titulo: string;
  descripcion: string;
  duracion: string;
  orden: number;
  videoUrl?: string;
  contenidoHtml: string;
  recursos: ResourceItem[];
}

export interface ModuleSection {
  id: string;
  cursoId: string;
  titulo: string;
  orden: number;
  lecciones: Lesson[];
}

export interface CampusCourse {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  imagen: string;
  profesorNombre: string;
  profesorId: string;
  modulos: ModuleSection[];
}

export interface Enrollment {
  id: string;
  estudianteId: string;
  cursoId: string;
  fechaMatricula: string;
  estado: 'active' | 'completed' | 'cancelled' | 'suspended';
  progresoCalculado: number;
  ultimaLeccionId?: string;
  startDate?: string;
  endDate?: string;
}

export interface TeacherAssignment {
  id: string;
  teacherId: string;
  courseId: string;
  assignedAt: string;
}

export interface EmailMessage {
  id: string;
  thread_id: string;
  external_message_id: string;
  sender_name: string;
  sender_email: string;
  recipient_email: string;
  subject: string;
  body: string;
  received_at: string;
  direction: 'inbound' | 'outbound';
  read: boolean;
}

export interface EmailThread {
  id: string;
  external_thread_id: string;
  subject: string;
  status: 'PENDIENTE' | 'RESPONDIDO' | 'ARCHIVADO';
  related_request_id?: string;
  related_student_id?: string;
  related_course_id?: string;
  last_message_at: string;
  sender_name: string;
  sender_email: string;
  messages: EmailMessage[];
}


export interface QuestionMessage {
  id: string;
  autorId: string;
  autorNombre: string;
  autorRol: UserRole;
  texto: string;
  fechaHora: string;
  adjuntoUrl?: string;
}

export interface QuestionThread {
  id: string;
  estudianteId: string;
  estudianteNombre: string;
  profesorId: string;
  cursoId: string;
  cursoNombre: string;
  moduloUnidad: string;
  asunto: string;
  estado: 'PENDIENTE' | 'RESPONDIDA' | 'CERRADA';
  adjuntoUrl?: string;
  mensajes: QuestionMessage[];
  fechaCreacion: string;
  fechaUltimaActualizacion: string;
}

export interface SecretaryMessage {
  id: string;
  autorId: string;
  autorNombre: string;
  autorRol: UserRole;
  texto: string;
  fechaHora: string;
  adjuntoUrl?: string;
}

export interface SecretaryRequest {
  id: string;
  referencia: string; // e.g. SEC-8492
  estudianteId: string;
  estudianteNombre: string;
  tipo: SecretaryType;
  asunto: string;
  descripcion: string;
  adjuntoUrl?: string;
  estado: 'PENDIENTE' | 'EN_TRAMITE' | 'RESUELTA' | 'RECHAZADA';
  mensajes: SecretaryMessage[];
  fechaCreacion: string;
  fechaUltimaActualizacion: string;
}

export type ContactRequestStatus =
  | 'new'
  | 'contacted'
  | 'documentation_pending'
  | 'enrolled'
  | 'rejected'
  | 'archived';

export interface ContactRequest {
  id: string;
  created_at: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  course_id: string;
  course_code: string;
  course_name: string;
  preferred_schedule?: string;
  employment_status?: string;
  comments?: string;
  message?: string;
  status: ContactRequestStatus;
  assigned_admin_id?: string;
  assigned_admin_name?: string;
  student_id?: string | null;
  internal_notes?: string;
  source: string;
}

export interface Announcement {

  id: string;
  titulo: string;
  contenido: string;
  autorNombre: string;
  autorId: string;
  cursoId?: string;
  destinatarios: 'TODOS' | 'ALUMNOS' | 'PROFESORES';
  fecha: string;
}
