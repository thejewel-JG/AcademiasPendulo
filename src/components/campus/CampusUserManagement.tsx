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
} from 'lucide-react';
import { UserRole } from '../../types/campus';

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

    // 1. Create Authorized User
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

    // 2. Assign initial course enrollments if ALUMNO
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
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-zinc-900 via-zinc-900 to-red-950/50 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/20 border border-red-500/30 text-red-400 text-xs font-semibold mb-2">
            <Users className="w-3.5 h-3.5" />
            Gestión Centralizada de Permisos y Roles
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-heading">
            Usuarios e Invitaciones de Acceso
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Solo los correos autorizados en esta lista pueden acceder al Campus Virtual.
          </p>
        </div>

        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-2 px-5 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider shadow-lg shadow-red-950/40 transition-all shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          Nuevo Usuario / Invitar
        </button>
      </div>

      {inviteSuccessMsg && (
        <div className="p-4 bg-emerald-950/90 border border-emerald-800 text-emerald-300 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xl">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{inviteSuccessMsg}</span>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between text-xs">
          <span className="font-bold text-white uppercase tracking-wider">
            Usuarios Registrados en Base de Datos ({users.length})
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-zinc-950 text-zinc-400 uppercase font-semibold border-b border-zinc-800">
              <tr>
                <th className="p-4">Usuario</th>
                <th className="p-4">Correo Electrónico</th>
                <th className="p-4">Rol Asignado</th>
                <th className="p-4">Estado Cuenta</th>
                <th className="p-4">Cursos / Asignaciones</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {users.map((u) => {
                const userEnrs = enrollments.filter((e) => e.estudianteId === u.id && e.estado === 'active');
                return (
                  <tr key={u.id} className="hover:bg-zinc-850/50 transition-colors">
                    <td className="p-4 font-bold text-white">
                      {u.nombre} {u.apellidos}
                    </td>
                    <td className="p-4 text-zinc-300 font-mono">{u.email}</td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase border ${
                          u.role === 'ADMINISTRACION'
                            ? 'bg-red-950 text-red-400 border-red-800'
                            : u.role === 'PROFESOR'
                            ? 'bg-blue-950 text-blue-400 border-blue-800'
                            : 'bg-zinc-800 text-zinc-200 border-zinc-700'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold ${
                          u.activo
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : 'bg-red-950 text-red-400 border border-red-800'
                        }`}
                      >
                        {u.activo ? 'ACTIVO' : 'INACTIVO'}
                      </span>
                    </td>
                    <td className="p-4 text-[11px] text-zinc-400">
                      {u.role === 'ALUMNO' ? (
                        <span>{userEnrs.length} Cursos Matriculados</span>
                      ) : u.role === 'PROFESOR' ? (
                        <span>Profesor Titular Especialidades</span>
                      ) : (
                        <span>Acceso Global</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
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
                <label className="block text-zinc-400 font-semibold mb-1">Correo Electrónico *</label>
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

              {/* Course selection if ALUMNO */}
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
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-xl font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-extrabold flex items-center gap-2"
                >
                  <Send className="w-4 h-4" /> Autorizar e Invitar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
