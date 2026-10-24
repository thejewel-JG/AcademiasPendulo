import React, { useState } from 'react';
import { useCampus } from '../../context/CampusContext';
import {
  Users,
  UserPlus,
  Mail,
  Send,
  CheckCircle2,
  ShieldAlert,
  UserCheck,
  BookOpen,
  Plus,
  Trash2,
  Shield,
  GraduationCap,
  FileText,
  Calendar,
  KeyRound,
  Lock,
  Unlock,
  Building2,
  Clock,
  DollarSign,
  AlertCircle,
  ExternalLink,
  Edit2,
  Check,
  XCircle,
  RefreshCw
} from 'lucide-react';
import { UserRole } from '../../types/campus';
import { getAcademicLevelLabel } from '../../data/academicLevels';

interface StudentFileState {
  personal: {
    id: string;
    nombre: string;
    apellidos: string;
    dni_nie: string;
    email: string;
    telefono: string;
    direccion: string;
    codigo_postal: string;
    ciudad: string;
    provincia: string;
    fecha_creacion: string;
    estado_cuenta: string;
    cambio_password_obligatorio: boolean;
    ultimo_acceso?: string | null;
  };
  academica: {
    nivel_estudios: string;
    titulacion: string;
    formacion_complementaria: string;
    situacion_laboral: string;
    solicitudes_academicas: any[];
  };
  matriculas: any[];
  pagos: any[];
  acceso: {
    usuario: string;
    email: string;
    estado_cuenta: string;
    cursos_autorizados: string[];
    fecha_creacion: string;
    fecha_activacion: string;
    ultimo_acceso?: string | null;
    bienvenida_email_enviado: boolean;
    cambio_password_obligatorio: boolean;
    tiene_password_activo: boolean;
  };
  historial: any[];
}

export const CampusUserManagement: React.FC = () => {
  const { currentUser, users, courses, enrollments, addUser, toggleUserActive, addEnrollment, removeEnrollment } =
    useCampus();

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [nombre, setNombre] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [role, setRole] = useState<UserRole>('ALUMNO');
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [inviteSuccessMsg, setInviteSuccessMsg] = useState('');

  // Ficha Centralizada del Alumno (Section 7)
  const [selectedStudentUser, setSelectedStudentUser] = useState<any | null>(null);
  const [studentFile, setStudentFile] = useState<StudentFileState | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'personal' | 'academica' | 'matriculas' | 'pagos' | 'acceso' | 'historial'>('personal');

  // Edit Personal Data State
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [editNombre, setEditNombre] = useState('');
  const [editApellidos, setEditApellidos] = useState('');
  const [editTelefono, setEditTelefono] = useState('');
  const [savingPersonal, setSavingPersonal] = useState(false);

  // Administrative action feedback
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Suspension prompt modal
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');

  const openStudentFullFile = async (targetUser: any) => {
    setSelectedStudentUser(targetUser);
    setLoadingFile(true);
    setFileError(null);
    setStudentFile(null);
    setActiveTab('personal');
    setIsEditingPersonal(false);
    setActionMsg(null);

    try {
      const res = await fetch(`/api/admin/students/${encodeURIComponent(targetUser.id)}/full-file`);
      if (!res.ok) {
        throw new Error('No se pudo obtener la ficha del alumno.');
      }
      const data = await res.json();
      setStudentFile(data.studentFile);
      setEditNombre(data.studentFile.personal.nombre);
      setEditApellidos(data.studentFile.personal.apellidos);
      setEditTelefono(data.studentFile.personal.telefono);
    } catch (err: any) {
      setFileError(err.message || 'Error al consultar la ficha del alumno.');
    } finally {
      setLoadingFile(false);
    }
  };

  const handleSavePersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentUser) return;
    setSavingPersonal(true);
    setActionMsg(null);

    try {
      const res = await fetch(`/api/admin/students/${selectedStudentUser.id}/personal-data`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: editNombre,
          apellidos: editApellidos,
          telefono: editTelefono
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar datos personales.');

      setActionMsg({ type: 'success', text: data.message });
      setIsEditingPersonal(false);
      // Refresh file
      openStudentFullFile(selectedStudentUser);
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message });
    } finally {
      setSavingPersonal(false);
    }
  };

  const handleResendAccess = async () => {
    if (!selectedStudentUser) return;
    setActionMsg(null);
    try {
      const res = await fetch(`/api/admin/students/${selectedStudentUser.id}/resend-access`, {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al reenviar credenciales.');
      setActionMsg({ type: 'success', text: data.message });
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message });
    }
  };

  const handleSendPasswordReset = async () => {
    if (!selectedStudentUser) return;
    setActionMsg(null);
    try {
      const res = await fetch(`/api/admin/students/${selectedStudentUser.id}/send-password-reset`, {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al enviar enlace de restablecimiento.');
      setActionMsg({ type: 'success', text: data.message });
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message });
    }
  };

  const handleToggleAccess = async (suspend: boolean) => {
    if (!selectedStudentUser) return;
    setActionMsg(null);
    try {
      const res = await fetch(`/api/admin/students/${selectedStudentUser.id}/toggle-access`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suspend,
          motivo: suspend ? suspendReason : 'Restauración autorizada por Secretaría'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cambiar acceso.');
      setActionMsg({ type: 'success', text: data.message });
      setShowSuspendModal(false);
      setSuspendReason('');
      openStudentFullFile(selectedStudentUser);
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message });
    }
  };

  if (!currentUser || currentUser.role !== 'ADMINISTRACION') {
    return (
      <div className="p-8 text-center text-white space-y-4">
        <Shield className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold">Acceso Restringido</h2>
        <p className="text-xs text-zinc-400">Solo administradores autorizados pueden gestionar usuarios e invitaciones.</p>
      </div>
    );
  }

  const handleCreateAndInviteUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !email) return;

    addUser({
      nombre,
      apellidos,
      email: email.trim(),
      telefono,
      role,
      activo: true,
      fechaAlta: new Date().toISOString(),
      invitedAt: new Date().toISOString(),
    });

    const createdStudent = users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim());
    const studentId = createdStudent ? createdStudent.id : `usr_${Date.now()}`;

    selectedCourseIds.forEach((cId) => {
      addEnrollment(studentId, cId);
    });

    setInviteSuccessMsg(
      `¡Invitación segura enviada a ${email}! El usuario ha sido dado de alta en la base de datos y puede establecer su contraseña.`
    );

    setShowInviteModal(false);
    setNombre('');
    setApellidos('');
    setEmail('');
    setTelefono('');
    setSelectedCourseIds([]);
    setTimeout(() => setInviteSuccessMsg(''), 6000);
  };

  const toggleCourseSelection = (courseId: string) => {
    setSelectedCourseIds((prev) =>
      prev.includes(courseId) ? prev.filter((id) => id !== courseId) : [...prev, courseId]
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-heading flex items-center gap-3">
            <Users className="w-7 h-7 text-red-500" />
            Gestión Centralizada de Usuarios y Alumnos
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Fichas completas de alumnos, expedientes académicos, control de accesos e invitaciones institucionales.
          </p>
        </div>

        <button
          onClick={() => setShowInviteModal(true)}
          className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-red-950/40 flex items-center gap-2 self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          Nueva Invitación / Alta Manual
        </button>
      </div>

      {inviteSuccessMsg && (
        <div className="p-4 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{inviteSuccessMsg}</span>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-base font-bold text-white font-heading">
            Directorio de Usuarios Registrados ({users.length})
          </h2>
          <span className="text-xs text-zinc-500">Base de Datos Hostinger MySQL</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-[11px] font-bold text-zinc-400 bg-zinc-950/50 uppercase tracking-wider">
                <th className="p-4">Usuario / Nombre</th>
                <th className="p-4">Rol Asignado</th>
                <th className="p-4">Estado Cuenta</th>
                <th className="p-4">Formación / Cursos</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {users.map((u) => {
                const userEnrs = enrollments.filter((e) => e.estudianteId === u.id);

                return (
                  <tr key={u.id} className="hover:bg-zinc-950/40 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-white text-sm">
                        {u.nombre} {u.apellidos}
                      </div>
                      <div className="text-[11px] text-zinc-400 flex items-center gap-1.5 font-mono">
                        <Mail className="w-3 h-3 text-red-400" />
                        {u.email}
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          u.role === 'ADMINISTRACION'
                            ? 'bg-purple-950 text-purple-300 border border-purple-800'
                            : u.role === 'PROFESOR'
                            ? 'bg-blue-950 text-blue-300 border border-blue-800'
                            : 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          u.activo
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : 'bg-red-950 text-red-400 border border-red-800'
                        }`}
                      >
                        {u.activo ? 'ACTIVO' : 'INACTIVO / SUSPENDIDO'}
                      </span>
                    </td>
                    <td className="p-4 text-[11px] text-zinc-400">
                      {u.role === 'ALUMNO' ? (
                        <span>{userEnrs.length} Curso(s) Matriculado(s)</span>
                      ) : u.role === 'PROFESOR' ? (
                        <span>Profesor Titular</span>
                      ) : (
                        <span>Acceso Global</span>
                      )}
                    </td>
                    <td className="p-4 text-right whitespace-nowrap">
                      {u.role === 'ALUMNO' && (
                        <button
                          onClick={() => openStudentFullFile(u)}
                          title="Consultar ficha completa y centralizada del alumno"
                          className="text-xs font-bold px-3 py-1.5 rounded-lg border bg-zinc-800 border-zinc-700 text-zinc-200 hover:text-white hover:border-red-500 transition-colors inline-flex items-center gap-1.5 mr-2"
                        >
                          <UserCheck className="w-3.5 h-3.5 text-red-500" />
                          <span>Ficha Completa</span>
                        </button>
                      )}
                      <button
                        onClick={() => toggleUserActive(u.id)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${
                          u.activo
                            ? 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-red-400'
                            : 'bg-emerald-950 border-emerald-800 text-emerald-400'
                        }`}
                      >
                        {u.activo ? 'Desactivar' : 'Activar Cuenta'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-lg font-bold text-white font-heading">
                Dar de Alta / Enviar Invitación
              </h3>
              <button onClick={() => setShowInviteModal(false)} className="text-zinc-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAndInviteUser} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Nombre *</label>
                  <input
                    type="text"
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Nombre"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Apellidos</label>
                  <input
                    type="text"
                    value={apellidos}
                    onChange={(e) => setApellidos(e.target.value)}
                    placeholder="Apellidos"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Correo Electrónico (Nombre de usuario) *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@email.com"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="Opcional"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Rol en el Campus *</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-red-500 font-bold"
                  >
                    <option value="ALUMNO">ALUMNO</option>
                    <option value="PROFESOR">PROFESOR</option>
                    <option value="ADMINISTRACION">ADMINISTRADOR</option>
                  </select>
                </div>
              </div>

              {role === 'ALUMNO' && (
                <div className="space-y-2 pt-2 border-t border-zinc-800">
                  <label className="block text-zinc-300 font-bold uppercase tracking-wider">
                    Asignar Especialidades / Cursos
                  </label>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto p-2 bg-zinc-950 border border-zinc-800 rounded-xl">
                    {courses.map((c) => (
                      <label
                        key={c.id}
                        className="flex items-center gap-2 p-2 hover:bg-zinc-900 rounded-lg cursor-pointer text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={selectedCourseIds.includes(c.id)}
                          onChange={() => toggleCourseSelection(c.id)}
                          className="accent-red-600 rounded"
                        />
                        <span className="text-white font-bold">{c.codigo}</span>
                        <span className="text-zinc-400 truncate">{c.nombre}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 bg-zinc-800 text-white rounded-xl font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg"
                >
                  <Send className="w-4 h-4" /> Autorizar e Invitar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* FICHA COMPLETA CENTRALIZADA DEL ALUMNO (Section 7)      */}
      {/* ======================================================== */}
      {selectedStudentUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-4xl w-full p-6 sm:p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-red-600/20 border border-red-500/30 text-red-400">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white font-heading">
                    Ficha Centralizada del Alumno
                  </h3>
                  <p className="text-xs text-zinc-400">
                    {selectedStudentUser.nombre} {selectedStudentUser.apellidos} · <span className="font-mono text-zinc-300">{selectedStudentUser.email}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudentUser(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Action Feedback Alerts */}
            {actionMsg && (
              <div
                className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  actionMsg.type === 'success'
                    ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300'
                    : 'bg-red-950/80 border border-red-800 text-red-300'
                }`}
              >
                {actionMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{actionMsg.text}</span>
              </div>
            )}

            {loadingFile ? (
              <div className="py-16 text-center text-zinc-400 text-xs font-bold flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                Cargando datos completos del alumno desde la base de datos...
              </div>
            ) : fileError ? (
              <div className="p-4 bg-red-950/60 border border-red-800 text-red-300 rounded-xl text-xs font-semibold">
                ⚠️ {fileError}
              </div>
            ) : studentFile ? (
              <div className="space-y-6">
                {/* 6 Tabs Navigation Bar (Section 7) */}
                <div className="flex flex-wrap border-b border-zinc-800 gap-1 text-xs font-bold">
                  <button
                    onClick={() => setActiveTab('personal')}
                    className={`px-3.5 py-2 rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 ${
                      activeTab === 'personal'
                        ? 'border-red-600 text-white bg-zinc-950'
                        : 'border-transparent text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    1. Datos Personales
                  </button>
                  <button
                    onClick={() => setActiveTab('academica')}
                    className={`px-3.5 py-2 rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 ${
                      activeTab === 'academica'
                        ? 'border-red-600 text-white bg-zinc-950'
                        : 'border-transparent text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    2. Formación Académica
                  </button>
                  <button
                    onClick={() => setActiveTab('matriculas')}
                    className={`px-3.5 py-2 rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 ${
                      activeTab === 'matriculas'
                        ? 'border-red-600 text-white bg-zinc-950'
                        : 'border-transparent text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    3. Matrículas ({studentFile.matriculas.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('pagos')}
                    className={`px-3.5 py-2 rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 ${
                      activeTab === 'pagos'
                        ? 'border-red-600 text-white bg-zinc-950'
                        : 'border-transparent text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    4. Pagos y Transferencias ({studentFile.pagos.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('acceso')}
                    className={`px-3.5 py-2 rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 ${
                      activeTab === 'acceso'
                        ? 'border-red-600 text-white bg-zinc-950'
                        : 'border-transparent text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    5. Acceso al Campus
                  </button>
                  <button
                    onClick={() => setActiveTab('historial')}
                    className={`px-3.5 py-2 rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 ${
                      activeTab === 'historial'
                        ? 'border-red-600 text-white bg-zinc-950'
                        : 'border-transparent text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    6. Historial Administrativo
                  </button>
                </div>

                {/* TAB 1: DATOS PERSONALES */}
                {activeTab === 'personal' && (
                  <div className="space-y-4 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-300 uppercase text-[11px] tracking-wider">
                        Información Personal y de Contacto
                      </span>
                      {!isEditingPersonal ? (
                        <button
                          onClick={() => setIsEditingPersonal(true)}
                          className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg flex items-center gap-1.5 font-semibold"
                        >
                          <Edit2 className="w-3.5 h-3.5" /> Editar Datos
                        </button>
                      ) : (
                        <button
                          onClick={() => setIsEditingPersonal(false)}
                          className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-lg font-semibold"
                        >
                          Cancelar Edición
                        </button>
                      )}
                    </div>

                    {!isEditingPersonal ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 bg-zinc-950 p-5 rounded-2xl border border-zinc-800">
                        <div>
                          <span className="text-zinc-500 font-bold block text-[10px] uppercase">Nombre</span>
                          <span className="text-white font-semibold text-sm">{studentFile.personal.nombre}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500 font-bold block text-[10px] uppercase">Apellidos</span>
                          <span className="text-white font-semibold text-sm">{studentFile.personal.apellidos}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500 font-bold block text-[10px] uppercase">DNI / NIE</span>
                          <span className="text-white font-mono font-bold text-sm">{studentFile.personal.dni_nie}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500 font-bold block text-[10px] uppercase">Correo Electrónico (Usuario)</span>
                          <span className="text-white font-mono">{studentFile.personal.email}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500 font-bold block text-[10px] uppercase">Teléfono</span>
                          <span className="text-white font-mono">{studentFile.personal.telefono}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500 font-bold block text-[10px] uppercase">Estado de la Cuenta</span>
                          <span className={`font-bold ${studentFile.personal.estado_cuenta === 'ACTIVO' ? 'text-emerald-400' : 'text-red-400'}`}>
                            {studentFile.personal.estado_cuenta}
                          </span>
                        </div>
                        <div className="sm:col-span-2">
                          <span className="text-zinc-500 font-bold block text-[10px] uppercase">Dirección</span>
                          <span className="text-zinc-300">
                            {studentFile.personal.direccion} {studentFile.personal.codigo_postal ? `(${studentFile.personal.codigo_postal} ${studentFile.personal.ciudad})` : ''}
                          </span>
                        </div>
                        <div>
                          <span className="text-zinc-500 font-bold block text-[10px] uppercase">Fecha de Registro</span>
                          <span className="text-zinc-400">{new Date(studentFile.personal.fecha_creacion).toLocaleDateString('es-ES')}</span>
                        </div>
                      </div>
                    ) : (
                      <form onSubmit={handleSavePersonal} className="space-y-4 bg-zinc-950 p-5 rounded-2xl border border-zinc-800">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-zinc-400 font-semibold mb-1">Nombre</label>
                            <input
                              type="text"
                              required
                              value={editNombre}
                              onChange={(e) => setEditNombre(e.target.value)}
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-red-500"
                            />
                          </div>
                          <div>
                            <label className="block text-zinc-400 font-semibold mb-1">Apellidos</label>
                            <input
                              type="text"
                              required
                              value={editApellidos}
                              onChange={(e) => setEditApellidos(e.target.value)}
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-red-500"
                            />
                          </div>
                          <div>
                            <label className="block text-zinc-400 font-semibold mb-1">Teléfono</label>
                            <input
                              type="text"
                              value={editTelefono}
                              onChange={(e) => setEditTelefono(e.target.value)}
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-red-500"
                            />
                          </div>
                          <div>
                            <label className="block text-zinc-400 font-semibold mb-1">Email / DNI (Protegidos por integridad)</label>
                            <input
                              type="text"
                              disabled
                              value={`${studentFile.personal.email} · ${studentFile.personal.dni_nie}`}
                              className="w-full bg-zinc-900/40 border border-zinc-800 rounded-xl p-2.5 text-zinc-500 cursor-not-allowed"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setIsEditingPersonal(false)}
                            className="px-4 py-2 bg-zinc-800 text-white rounded-xl font-bold"
                          >
                            Cancelar
                          </button>
                          <button
                            type="submit"
                            disabled={savingPersonal}
                            className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-md"
                          >
                            {savingPersonal ? 'Guardando...' : 'Guardar Cambios'}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}

                {/* TAB 2: FORMACIÓN ACADÉMICA */}
                {activeTab === 'academica' && (
                  <div className="space-y-4 text-xs">
                    <div className="bg-zinc-950 p-5 rounded-2xl border border-zinc-800 space-y-3">
                      <div className="text-[11px] font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                        <GraduationCap className="w-4 h-4" /> Estudios y Titulaciones Declaradas
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <span className="text-zinc-500 font-bold block text-[10px] uppercase">Nivel de Estudios</span>
                          <span className="text-white font-semibold">
                            {getAcademicLevelLabel(studentFile.academica.nivel_estudios) || studentFile.academica.nivel_estudios}
                          </span>
                        </div>
                        <div>
                          <span className="text-zinc-500 font-bold block text-[10px] uppercase">Titulación Académica</span>
                          <span className="text-white font-semibold">{studentFile.academica.titulacion}</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-zinc-500 font-bold block text-[10px] uppercase">Formación Complementaria</span>
                        <p className="text-zinc-300 whitespace-pre-wrap">{studentFile.academica.formacion_complementaria}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <span className="font-bold text-zinc-400 block text-[11px] uppercase">Histórico de Solicitudes de Admisión</span>
                      {studentFile.academica.solicitudes_academicas.length === 0 ? (
                        <p className="text-zinc-500 italic">No hay solicitudes de admisión previas registradas.</p>
                      ) : (
                        <div className="space-y-2">
                          {studentFile.academica.solicitudes_academicas.map((sa, idx) => (
                            <div key={idx} className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-between">
                              <div>
                                <span className="font-mono text-red-400 font-bold mr-2">{sa.request_number}</span>
                                <span className="text-white font-semibold">{sa.course_name}</span>
                              </div>
                              <span className="text-zinc-500 text-[11px]">
                                {new Date(sa.created_at).toLocaleDateString('es-ES')}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 3: MATRÍCULAS */}
                {activeTab === 'matriculas' && (
                  <div className="space-y-4 text-xs">
                    {studentFile.matriculas.length === 0 ? (
                      <p className="text-zinc-500 italic text-center py-6">El alumno no dispone de ninguna matrícula registrada.</p>
                    ) : (
                      <div className="space-y-3">
                        {studentFile.matriculas.map((mat) => (
                          <div key={mat.matricula_id} className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-2">
                              <div>
                                <span className="text-[10px] font-mono font-bold text-red-400 bg-red-950/60 px-2 py-0.5 rounded border border-red-900/40 mr-2">
                                  {mat.request_number}
                                </span>
                                <span className="text-white font-bold text-sm">{mat.curso_nombre}</span>
                              </div>
                              <span
                                className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase ${
                                  mat.estado_matricula === 'ACTIVA' && mat.estado_acceso === 'HABILITADO'
                                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                    : 'bg-red-950 text-red-400 border border-red-800'
                                }`}
                              >
                                {mat.estado_matricula} · ACCESO: {mat.estado_acceso}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] text-zinc-400">
                              <div>
                                <span className="text-zinc-500 block text-[10px] uppercase font-bold">Fecha Matrícula</span>
                                <span className="text-zinc-200">{new Date(mat.fecha_matricula).toLocaleDateString('es-ES')}</span>
                              </div>
                              <div>
                                <span className="text-zinc-500 block text-[10px] uppercase font-bold">Aprobado Por</span>
                                <span className="text-zinc-200">{mat.operador_aprobacion}</span>
                              </div>
                              <div>
                                <span className="text-zinc-500 block text-[10px] uppercase font-bold">Grupo Asignado</span>
                                <span className="text-zinc-200 truncate block">{mat.grupo_nombre}</span>
                              </div>
                              <div>
                                <span className="text-zinc-500 block text-[10px] uppercase font-bold">Progreso Académico</span>
                                <span className="text-red-400 font-bold">{mat.progreso || 0}%</span>
                              </div>
                            </div>

                            {mat.motivo_suspension && (
                              <div className="p-2.5 bg-red-950/40 border border-red-900/60 rounded-xl text-[11px] text-red-300">
                                <strong>Causa de suspensión:</strong> {mat.motivo_suspension} (Suspendido por {mat.suspendido_por})
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 4: PAGOS Y TRANSFERENCIAS */}
                {activeTab === 'pagos' && (
                  <div className="space-y-4 text-xs">
                    {studentFile.pagos.length === 0 ? (
                      <p className="text-zinc-500 italic text-center py-6">No hay registros de transferencias o pagos bancarios.</p>
                    ) : (
                      <div className="space-y-3">
                        {studentFile.pagos.map((p, idx) => (
                          <div key={idx} className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-2">
                              <div>
                                <span className="font-mono text-red-400 font-bold mr-2">{p.request_number}</span>
                                <span className="text-white font-bold">{p.curso_nombre}</span>
                              </div>
                              <span className="text-base font-extrabold text-emerald-400 font-mono">
                                {p.importe} {p.moneda}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] text-zinc-400">
                              <div>
                                <span className="text-zinc-500 block text-[10px] uppercase font-bold">Estado Pago</span>
                                <span className="font-bold text-zinc-200">{p.estado_pago}</span>
                              </div>
                              <div>
                                <span className="text-zinc-500 block text-[10px] uppercase font-bold">Concepto Transferencia</span>
                                <span className="text-white font-mono">{p.referencia_bancaria}</span>
                              </div>
                              <div>
                                <span className="text-zinc-500 block text-[10px] uppercase font-bold">Comunicación Pago</span>
                                <span className="text-zinc-300">{p.fecha_comunicacion ? new Date(p.fecha_comunicacion).toLocaleDateString('es-ES') : 'No comunicada'}</span>
                              </div>
                              <div>
                                <span className="text-zinc-500 block text-[10px] uppercase font-bold">Verificado Por</span>
                                <span className="text-zinc-300">{p.verificado_por || 'Pendiente'}</span>
                              </div>
                            </div>

                            {p.has_receipt && (
                              <div className="flex items-center justify-between p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-[11px]">
                                <span className="text-zinc-300">
                                  Justificante bancario aportado: <strong>{p.justificante_nombre}</strong>
                                </span>
                                {p.justificante_url && (
                                  <a
                                    href={p.justificante_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-red-400 hover:text-red-300 font-bold flex items-center gap-1 underline"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" /> Consultar Justificante
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 5: ACCESO AL CAMPUS */}
                {activeTab === 'acceso' && (
                  <div className="space-y-5 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-zinc-950 p-5 rounded-2xl border border-zinc-800">
                      <div>
                        <span className="text-zinc-500 font-bold block text-[10px] uppercase">Nombre de Usuario (Login)</span>
                        <span className="text-white font-mono font-bold text-sm">{studentFile.acceso.usuario}</span>
                        <span className="text-[10px] text-zinc-500 block mt-0.5">El usuario es estrictamente el email, nunca el DNI.</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 font-bold block text-[10px] uppercase">Estado de la Cuenta</span>
                        <span className={`font-bold text-sm ${studentFile.acceso.estado_cuenta === 'ACTIVO' ? 'text-emerald-400' : 'text-red-400'}`}>
                          {studentFile.acceso.estado_cuenta}
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-500 font-bold block text-[10px] uppercase">Fecha de Creación</span>
                        <span className="text-zinc-300">{new Date(studentFile.acceso.fecha_creacion).toLocaleDateString('es-ES')}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 font-bold block text-[10px] uppercase">Último Acceso al Campus</span>
                        <span className="text-zinc-300">
                          {studentFile.acceso.ultimo_acceso ? new Date(studentFile.acceso.ultimo_acceso).toLocaleString('es-ES') : 'Aún no ha iniciado sesión'}
                        </span>
                      </div>
                    </div>

                    <div className="bg-zinc-950 p-5 rounded-2xl border border-zinc-800 space-y-2">
                      <span className="text-zinc-500 font-bold block text-[10px] uppercase">Cursos con Acceso Autorizado</span>
                      {studentFile.acceso.cursos_autorizados.length === 0 ? (
                        <p className="text-zinc-500 italic">No tiene ningún curso autorizado actualmente.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {studentFile.acceso.cursos_autorizados.map((c, i) => (
                            <span key={i} className="px-3 py-1 bg-red-950/60 border border-red-900/50 text-red-300 rounded-lg text-xs font-semibold">
                              {c}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Administrative Actions on Campus Access (Section 7) */}
                    <div className="space-y-3 pt-2 border-t border-zinc-800">
                      <span className="text-zinc-300 font-bold block text-xs uppercase tracking-wider">
                        Acciones Administrativas de Acceso
                      </span>

                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={handleResendAccess}
                          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors"
                        >
                          <Send className="w-3.5 h-3.5 text-red-400" />
                          Reenviar Instrucciones de Acceso
                        </button>

                        <button
                          onClick={handleSendPasswordReset}
                          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                          Iniciar Recuperación de Contraseña
                        </button>

                        {studentFile.acceso.estado_cuenta === 'ACTIVO' ? (
                          <button
                            onClick={() => setShowSuspendModal(true)}
                            className="px-4 py-2 bg-red-950 hover:bg-red-900 text-red-300 border border-red-800 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            Suspender Acceso al Campus
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggleAccess(false)}
                            className="px-4 py-2 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors"
                          >
                            <Unlock className="w-3.5 h-3.5" />
                            Restaurar Acceso al Campus
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 6: HISTORIAL ADMINISTRATIVO */}
                {activeTab === 'historial' && (
                  <div className="space-y-4 text-xs">
                    {studentFile.historial.length === 0 ? (
                      <p className="text-zinc-500 italic text-center py-6">No hay registros en el historial administrativo de este alumno.</p>
                    ) : (
                      <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                        {studentFile.historial.map((h) => (
                          <div key={h.id} className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl space-y-1">
                            <div className="flex items-center justify-between text-[11px] text-zinc-500">
                              <span className="font-bold text-red-400 uppercase tracking-wider">{h.tipo_evento}</span>
                              <span>{new Date(h.fecha_hora).toLocaleString('es-ES')}</span>
                            </div>
                            <p className="text-zinc-200 text-xs">{h.descripcion}</p>
                            <span className="text-[10px] text-zinc-500 block">Operador: {h.operador}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : null}

            {/* Modal Footer */}
            <div className="pt-4 border-t border-zinc-800 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedStudentUser(null)}
                className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Cerrar Ficha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend Access Reason Modal */}
      {showSuspendModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-red-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-red-500" />
              Confirmar Suspensión de Acceso
            </h3>
            <p className="text-xs text-zinc-400">
              Indica la causa administrativa justificada para suspender el acceso del alumno al campus virtual. El registro histórico se conservará íntegro.
            </p>
            <div>
              <label className="block text-zinc-400 text-xs font-semibold mb-1">Motivo / Causa de la suspensión *</label>
              <textarea
                rows={3}
                required
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="Ej. Incidencia de pago pendiente de regularizar, baja temporal solicitada..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-red-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSuspendModal(false)}
                className="px-4 py-2 bg-zinc-800 text-white rounded-xl text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!suspendReason.trim()}
                onClick={() => handleToggleAccess(true)}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold disabled:opacity-50"
              >
                Suspender Acceso
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
