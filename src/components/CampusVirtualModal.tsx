import React, { useState } from 'react';
import { 
  X, 
  GraduationCap, 
  BookOpen, 
  Calendar, 
  FileText, 
  UserCheck, 
  ArrowRight, 
  Sparkles, 
  Lock, 
  Download,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { CENTER_INFO } from '../data/coursesData';

interface CampusVirtualModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CampusVirtualModal: React.FC<CampusVirtualModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const [isDemoMode, setIsDemoMode] = useState(false);
  const [username, setUsername] = useState('alumno.demo@pendulo.es');
  const [password, setPassword] = useState('••••••••');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setTimeout(() => {
      setIsLoggingIn(false);
      setIsDemoMode(true);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-950/75 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-gray-100 overflow-hidden relative"
        id="campus-virtual-modal"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          id="campus-close-btn"
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {!isDemoMode ? (
          /* Login Screen */
          <div className="p-8 sm:p-12">
            <div className="text-center max-w-md mx-auto space-y-4 mb-8">
              <div className="w-14 h-14 bg-gradient-to-tr from-gray-900 to-red-900 rounded-2xl flex items-center justify-center text-white mx-auto shadow-md">
                <GraduationCap className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-display text-2xl font-bold text-gray-900">
                  Campus Virtual Péndulo
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  Plataforma de formación online, apuntes técnicos y gestión de prácticas para alumnos matriculados.
                </p>
              </div>
            </div>

            <form onSubmit={handleLogin} className="max-w-md mx-auto space-y-4" id="campus-login-form">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1" htmlFor="campus-user">
                  Usuario / DNI / Correo del Alumno
                </label>
                <input
                  type="text"
                  id="campus-user"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-red-500 outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider" htmlFor="campus-password">
                    Contraseña de Acceso
                  </label>
                  <a href="#contacto" onClick={onClose} className="text-[11px] text-red-600 hover:underline">
                    ¿Olvidaste tu contraseña?
                  </a>
                </div>
                <input
                  type="password"
                  id="campus-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-red-500 outline-none"
                />
              </div>

              <div className="pt-2 flex flex-col gap-2.5">
                <button
                  type="submit"
                  id="btn-login-campus"
                  disabled={isLoggingIn}
                  className="w-full py-3 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                >
                  <Lock className="w-4 h-4 text-red-400" />
                  <span>{isLoggingIn ? 'Verificando credenciales...' : 'Iniciar Sesión en el Campus'}</span>
                </button>

                <button
                  type="button"
                  id="btn-demo-campus"
                  onClick={() => setIsDemoMode(true)}
                  className="w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-800 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all border border-red-200 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-red-600" />
                  <span>Explorar Modo Alumno Demo (Prueba Rápida)</span>
                </button>
              </div>

              <p className="text-[11px] text-center text-gray-500 pt-2 font-medium">
                Soporte Campus: <a href={`mailto:${CENTER_INFO.email}`} className="text-red-600 hover:underline">{CENTER_INFO.email}</a> o en secretaría (Carrera Doctoral 26).
              </p>
            </form>
          </div>
        ) : (
          /* Student Demo Dashboard */
          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-gray-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-600 text-white font-bold flex items-center justify-center">
                  AD
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-sm sm:text-base">
                    Alumno Demo: Alejandro Delgado Ruiz
                  </h4>
                  <span className="text-xs text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded font-medium">
                    Matrícula Activa · Promoción 2025
                  </span>
                </div>
              </div>

              <button
                onClick={() => setIsDemoMode(false)}
                className="text-xs text-gray-500 hover:text-gray-800 underline"
              >
                Cerrar sesión
              </button>
            </div>

            {/* Current Enrolled Course Summary */}
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-[11px] font-mono font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">
                    TMVG0209
                  </span>
                  <h5 className="font-bold text-gray-900 text-sm mt-1">
                    Mantenimiento de Sistemas Eléctricos y Electrónicos de Vehículos
                  </h5>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-500 block">Progreso lectivo</span>
                  <span className="font-bold text-gray-900 text-sm">340 / 520 horas (65%)</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
                <div className="bg-red-600 h-full rounded-full" style={{ width: '65%' }} />
              </div>
            </div>

            {/* Modules and materials */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-gray-200 space-y-2">
                <span className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-red-600" /> Material Didáctico Reciente
                </span>
                <ul className="space-y-1.5 text-xs text-gray-600">
                  <li className="flex items-center justify-between p-1.5 bg-gray-50 rounded">
                    <span>Unidad 4: Diagnosis de bus CAN automotriz.pdf</span>
                    <Download className="w-3.5 h-3.5 text-gray-400 cursor-pointer hover:text-red-600 transition-colors" />
                  </li>
                  <li className="flex items-center justify-between p-1.5 bg-gray-50 rounded">
                    <span>Esquemas eléctricos de inyección Common Rail.pdf</span>
                    <Download className="w-3.5 h-3.5 text-gray-400 cursor-pointer hover:text-red-600 transition-colors" />
                  </li>
                  <li className="flex items-center justify-between p-1.5 bg-gray-50 rounded">
                    <span>Normativa de seguridad en baterías de alta tensión.pdf</span>
                    <Download className="w-3.5 h-3.5 text-gray-400 cursor-pointer hover:text-red-600 transition-colors" />
                  </li>
                </ul>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-gray-200 space-y-2">
                <span className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-emerald-600" /> Prácticas en Empresa Asignada
                </span>
                <div className="text-xs text-gray-600 space-y-1 bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-100">
                  <p className="font-semibold text-gray-900">Talleres AutoSur Almería (Polígono San Rafael)</p>
                  <p>Tutor de empresa: Manuel Segura (Jefe de Taller)</p>
                  <p>Inicio fase de prácticas: 19 de Mayo de 2025</p>
                  <p className="text-emerald-700 font-bold">Estado: Convenio firmado y plaza reservada ✓</p>
                </div>
              </div>
            </div>

            <div className="text-center pt-2">
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-colors"
              >
                Volver a la Web Principal
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
