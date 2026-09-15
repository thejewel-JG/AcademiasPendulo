import React, { useState } from 'react';
import { useCampus } from '../../context/CampusContext';
import { User, KeyRound, ShieldAlert, CheckCircle2, Lock, Mail, Phone, BookOpen } from 'lucide-react';

export const CampusProfile: React.FC = () => {
  const { currentUser, updateUserProfile, getUserEnrollments } = useCampus();

  if (!currentUser) return null;

  const enrollments = getUserEnrollments(currentUser.id);

  // Editable Form fields
  const [telefono, setTelefono] = useState(currentUser.telefono || '');
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleUpdateContact = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserProfile(currentUser.id, { telefono });
    setSuccessMsg('Datos de contacto actualizados correctamente.');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (newPass.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (newPass !== confirmPass) {
      setErrorMsg('Las contraseñas nuevas no coinciden.');
      return;
    }

    setSuccessMsg('Contraseña actualizada con éxito.');
    setCurrentPass('');
    setNewPass('');
    setConfirmPass('');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-heading flex items-center gap-3">
          <User className="w-7 h-7 text-red-500" />
          Mi Perfil de Usuario
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 mt-1">
          Gestiona tus datos personales autorizados y la seguridad de tu contraseña.
        </p>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-950/80 border border-red-800 text-red-300 rounded-xl text-xs font-bold flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* User Information Summary Card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6 shadow-xl">
        <div className="flex items-center gap-4 border-b border-zinc-800 pb-5">
          <div className="w-14 h-14 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-xl font-bold text-red-500 shadow-inner">
            {currentUser.nombre.charAt(0)}
            {currentUser.apellidos.charAt(0)}
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              {currentUser.nombre} {currentUser.apellidos}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] bg-red-600/20 text-red-400 font-extrabold px-2.5 py-0.5 rounded-md border border-red-500/30 uppercase tracking-wider">
                Rol: {currentUser.role}
              </span>
              <span className="text-[10px] text-zinc-400">
                Estado:{' '}
                <strong className={currentUser.activo ? 'text-emerald-400' : 'text-red-400'}>
                  {currentUser.activo ? 'Cuenta Activa' : 'Inactiva'}
                </strong>
              </span>
            </div>
          </div>
        </div>

        {/* Read-Only Restricted Fields Notice */}
        <div className="bg-zinc-950/60 border border-zinc-800/80 p-4 rounded-xl text-xs text-zinc-400 flex items-start gap-3">
          <Lock className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div>
            Por razones de seguridad institucional, el cambio de <strong className="text-zinc-200">Rol, Nombre, DNI/NIE o Matrículas</strong> únicamente puede ser efectuado por la administración de Academias Péndulo.
          </div>
        </div>

        {/* Form contact updates */}
        <form onSubmit={handleUpdateContact} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-400 font-semibold mb-1">Correo Electrónico (No editable)</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  disabled
                  value={currentUser.email}
                  className="w-full pl-10 pr-4 py-3 bg-zinc-950/40 border border-zinc-800 rounded-xl text-zinc-400 cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-zinc-400 font-semibold mb-1">Teléfono de contacto</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="Número de teléfono"
                  className="w-full pl-10 pr-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-red-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all shadow-md"
            >
              Guardar Teléfono
            </button>
          </div>
        </form>
      </div>

      {/* Change Password Card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <h3 className="text-base font-bold text-white flex items-center gap-2 font-heading">
          <KeyRound className="w-4 h-4 text-red-500" />
          Cambiar Contraseña
        </h3>

        <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
          <div>
            <label className="block text-zinc-400 font-semibold mb-1">Contraseña actual</label>
            <input
              type="password"
              required
              value={currentPass}
              onChange={(e) => setCurrentPass(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-red-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-400 font-semibold mb-1">Nueva contraseña</label>
              <input
                type="password"
                required
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-zinc-400 font-semibold mb-1">Confirmar nueva contraseña</label>
              <input
                type="password"
                required
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                placeholder="Repite la nueva contraseña"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all shadow-md"
            >
              Actualizar Contraseña
            </button>
          </div>
        </form>
      </div>

      {/* Enrolled Courses Overview */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2 font-heading">
          <BookOpen className="w-4 h-4 text-red-500" />
          Resumen de Matrículas Activas
        </h3>

        {enrollments.length === 0 ? (
          <p className="text-xs text-zinc-500">No hay matrículas activas registradas.</p>
        ) : (
          <div className="space-y-2.5">
            {enrollments.map(({ course, enrollment }) => (
              <div
                key={course.id}
                className="bg-zinc-950 border border-zinc-800/80 p-3.5 rounded-xl flex items-center justify-between text-xs"
              >
                <div>
                  <span className="text-[10px] text-red-400 font-bold uppercase block">
                    {course.codigo}
                  </span>
                  <span className="font-bold text-white">{course.nombre}</span>
                </div>
                <div className="text-right text-[11px] text-zinc-400">
                  Alta: {new Date(enrollment.fechaMatricula).toLocaleDateString('es-ES')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
