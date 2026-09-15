import React, { useState } from 'react';
import { useCampus } from '../../context/CampusContext';
import {
  Shield,
  Users,
  GraduationCap,
  BookOpen,
  FileText,
  Bell,
  Plus,
  UserCheck,
  UserX,
  CheckCircle2,
  XCircle,
  Edit,
  FolderPlus,
} from 'lucide-react';
import { UserRole } from '../../types/campus';
import { CampusAdminRequests } from './CampusAdminRequests';

export const CampusAdminPanel: React.FC = () => {
  const {
    users,
    courses,
    enrollments,
    secretaryRequests,
    announcements,
    contactRequests,
    addUser,
    toggleUserActive,
    addEnrollment,
    removeEnrollment,
    updateSecretaryStatus,
  } = useCampus();

  const [activeTab, setActiveTab] = useState<'solicitudes' | 'usuarios' | 'matriculas' | 'secretaria'>('solicitudes');


  // New User Form State
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newNombre, setNewNombre] = useState('');
  const [newApellidos, setNewApellidos] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('ALUMNO');

  // New Enrollment Form State
  const [showAddEnrollmentModal, setShowAddEnrollmentModal] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');

  const students = users.filter((u) => u.role === 'ALUMNO');
  const teachers = users.filter((u) => u.role === 'PROFESOR');

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNombre || !newEmail) return;

    addUser({
      nombre: newNombre,
      apellidos: newApellidos,
      email: newEmail,
      role: newRole,
      activo: true,
    });

    setShowAddUserModal(false);
    setNewNombre('');
    setNewApellidos('');
    setNewEmail('');
  };

  const handleCreateEnrollment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !selectedCourseId) return;

    addEnrollment(selectedStudentId, selectedCourseId);
    setShowAddEnrollmentModal(false);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-red-950/60 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/20 border border-red-500/30 text-red-400 text-xs font-semibold mb-3">
          <Shield className="w-4 h-4" />
          Administración Global Academias Péndulo
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight font-heading">
          Panel de Control Administrativo
        </h1>
        <p className="mt-2 text-sm text-zinc-400 max-w-2xl">
          Gestión centralizada de alumnos autorizados, profesores, matrículas académicas, contenidos y trámites de secretaría online.
        </p>
      </div>

      {/* Admin Stat Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
          <div className="text-xs text-zinc-400 font-semibold">Total Alumnos</div>
          <div className="text-2xl font-extrabold text-white mt-1">{students.length}</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
          <div className="text-xs text-zinc-400 font-semibold">Profesores</div>
          <div className="text-2xl font-extrabold text-white mt-1">{teachers.length}</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
          <div className="text-xs text-zinc-400 font-semibold">Cursos Activos</div>
          <div className="text-2xl font-extrabold text-white mt-1">{courses.length}</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
          <div className="text-xs text-zinc-400 font-semibold">Matrículas</div>
          <div className="text-2xl font-extrabold text-red-400 mt-1">{enrollments.length}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800 gap-4 text-xs font-bold">
        <button
          onClick={() => setActiveTab('solicitudes')}
          className={`pb-3 transition-colors ${
            activeTab === 'solicitudes'
              ? 'text-red-400 border-b-2 border-red-500 font-heading'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Solicitudes y Leads ({contactRequests.length})
        </button>
        <button
          onClick={() => setActiveTab('usuarios')}
          className={`pb-3 transition-colors ${
            activeTab === 'usuarios'
              ? 'text-red-400 border-b-2 border-red-500 font-heading'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Gestión de Usuarios ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('matriculas')}
          className={`pb-3 transition-colors ${
            activeTab === 'matriculas'
              ? 'text-red-400 border-b-2 border-red-500 font-heading'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Matrículas ({enrollments.length})
        </button>
        <button
          onClick={() => setActiveTab('secretaria')}
          className={`pb-3 transition-colors ${
            activeTab === 'secretaria'
              ? 'text-red-400 border-b-2 border-red-500 font-heading'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Trámites Secretaría ({secretaryRequests.length})
        </button>
      </div>

      {/* TAB 0: CONTACT REQUESTS & LEADS */}
      {activeTab === 'solicitudes' && <CampusAdminRequests />}


      {/* TAB 1: USERS MANAGEMENT */}
      {activeTab === 'usuarios' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold text-white">Listado de Usuarios Autorizados</h2>
            <button
              onClick={() => setShowAddUserModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold"
            >
              <Plus className="w-4 h-4" /> Alta de Usuario
            </button>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="bg-zinc-950 text-zinc-400 uppercase font-semibold border-b border-zinc-800">
                  <tr>
                    <th className="p-3.5">Usuario</th>
                    <th className="p-3.5">Email</th>
                    <th className="p-3.5">Rol</th>
                    <th className="p-3.5">Estado</th>
                    <th className="p-3.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-zinc-850/50 transition-colors">
                      <td className="p-3.5 font-bold text-white">
                        {u.nombre} {u.apellidos}
                      </td>
                      <td className="p-3.5 text-zinc-400">{u.email}</td>
                      <td className="p-3.5">
                        <span className="bg-zinc-800 text-zinc-200 px-2.5 py-0.5 rounded text-[10px] font-bold">
                          {u.role}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            u.activo
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : 'bg-red-950 text-red-400 border border-red-800'
                          }`}
                        >
                          {u.activo ? 'ACTIVO' : 'INACTIVO'}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => toggleUserActive(u.id)}
                          className="text-xs text-zinc-400 hover:text-white underline font-semibold"
                        >
                          {u.activo ? 'Desactivar' : 'Activar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ENROLLMENTS */}
      {activeTab === 'matriculas' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold text-white">Matrículas de Alumnos por Curso</h2>
            <button
              onClick={() => setShowAddEnrollmentModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold"
            >
              <Plus className="w-4 h-4" /> Asignar Matrícula
            </button>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="bg-zinc-950 text-zinc-400 uppercase font-semibold border-b border-zinc-800">
                  <tr>
                    <th className="p-3.5">Alumno</th>
                    <th className="p-3.5">Curso</th>
                    <th className="p-3.5">Fecha Matrícula</th>
                    <th className="p-3.5">Estado</th>
                    <th className="p-3.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {enrollments.map((enr) => {
                    const student = users.find((u) => u.id === enr.estudianteId);
                    const course = courses.find((c) => c.id === enr.cursoId);

                    return (
                      <tr key={enr.id} className="hover:bg-zinc-850/50 transition-colors">
                        <td className="p-3.5 font-bold text-white">
                          {student ? `${student.nombre} ${student.apellidos}` : enr.estudianteId}
                        </td>
                        <td className="p-3.5 text-red-400 font-semibold">
                          {course ? course.nombre : enr.cursoId}
                        </td>
                        <td className="p-3.5 text-zinc-400">
                          {new Date(enr.fechaMatricula).toLocaleDateString('es-ES')}
                        </td>
                        <td className="p-3.5">
                          <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">
                            {enr.estado}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => removeEnrollment(enr.estudianteId, enr.cursoId)}
                            className="text-xs text-red-400 hover:text-red-300 underline font-semibold"
                          >
                            Dar de baja
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SECRETARY */}
      {activeTab === 'secretaria' && (
        <div className="space-y-4">
          <h2 className="text-base font-bold text-white">Gestión de Trámites Administrativos</h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
            {secretaryRequests.map((req) => (
              <div
                key={req.id}
                className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500 font-mono text-[10px]">{req.referencia}</span>
                    <span className="text-red-400 font-bold uppercase">{req.tipo}</span>
                  </div>
                  <div className="font-bold text-white text-sm mt-0.5">{req.asunto}</div>
                  <div className="text-zinc-400 mt-1">Solicitante: {req.estudianteNombre}</div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={req.estado}
                    onChange={(e) =>
                      updateSecretaryStatus(req.id, e.target.value as any)
                    }
                    className="bg-zinc-900 border border-zinc-800 text-white rounded-lg px-3 py-1.5 text-xs font-bold"
                  >
                    <option value="PENDIENTE">PENDIENTE</option>
                    <option value="EN_TRAMITE">EN_TRAMITE</option>
                    <option value="RESUELTA">RESUELTA</option>
                    <option value="RECHAZADA">RECHAZADA</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Alta de Nuevo Usuario Autorizado</h3>
            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Nombre</label>
                <input
                  type="text"
                  required
                  value={newNombre}
                  onChange={(e) => setNewNombre(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Apellidos</label>
                <input
                  type="text"
                  value={newApellidos}
                  onChange={(e) => setNewApellidos(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Rol</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white"
                >
                  <option value="ALUMNO">ALUMNO</option>
                  <option value="PROFESOR">PROFESOR</option>
                  <option value="ADMINISTRACION">ADMINISTRACION</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-xl font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold"
                >
                  Crear Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Enrollment Modal */}
      {showAddEnrollmentModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Asignar Matrícula a Alumno</h3>
            <form onSubmit={handleCreateEnrollment} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Seleccionar Alumno</label>
                <select
                  required
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white"
                >
                  <option value="">Selecciona estudiante...</option>
                  {students.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.nombre} {st.apellidos} ({st.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Seleccionar Curso</label>
                <select
                  required
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white"
                >
                  <option value="">Selecciona curso...</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.codigo} - {c.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddEnrollmentModal(false)}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-xl font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold"
                >
                  Asignar Matrícula
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
