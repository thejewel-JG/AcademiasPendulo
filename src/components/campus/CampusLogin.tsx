import React, { useState } from 'react';
import { useCampus } from '../../context/CampusContext';
import { LogIn, ShieldAlert, KeyRound, UserCheck, ArrowLeft, Lock, Mail, Sun, Moon } from 'lucide-react';

export const CampusLogin: React.FC = () => {
  const { login, authError, navigateTo, campusTheme, toggleCampusTheme } = useCampus();
  const [email, setEmail] = useState('alumno@pendulo.es');
  const [password, setPassword] = useState('123456');
  const [showForgotMsg, setShowForgotMsg] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(email, password);
  };

  const setDemoAccount = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('123456');
    setShowForgotMsg(false);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Background Decorative Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-red-900/10 blur-3xl pointer-events-none rounded-full" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-red-600/5 blur-3xl pointer-events-none rounded-full" />

      {/* Top Bar Actions */}
      <div className="absolute top-6 left-6 right-6 z-10 flex items-center justify-between">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            window.location.hash = '';
            window.history.pushState(null, '', '/');
            window.dispatchEvent(new Event('popstate'));
          }}
          className="inline-flex items-center gap-2 text-xs sm:text-sm text-zinc-400 hover:text-white transition-colors bg-zinc-900/80 px-4 py-2 rounded-full border border-zinc-800 backdrop-blur-md font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a la Web Principal
        </a>

        <button
          type="button"
          onClick={toggleCampusTheme}
          className="inline-flex items-center gap-2 text-xs font-extrabold text-amber-400 hover:text-amber-300 bg-zinc-900/90 px-4 py-2 rounded-full border border-zinc-800 backdrop-blur-md shadow-lg transition-all"
        >
          {campusTheme === 'dark' ? (
            <>
              <Sun className="w-4 h-4" />
              <span>Modo Día (Claro)</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-indigo-400" />
              <span>Modo Noche (Oscuro)</span>
            </>
          )}
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-red-600/10 rounded-2xl border border-red-600/30 flex items-center justify-center mb-4 shadow-lg shadow-red-900/20">
            <Lock className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white uppercase font-heading">
            Campus Virtual
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Plataforma Privada de Formación • <span className="text-red-500 font-semibold">Academias Péndulo</span>
          </p>
        </div>

        {/* Access Restriction Notice */}
        <div className="mt-6 bg-zinc-900/70 border border-zinc-800/80 rounded-xl p-4 text-xs text-zinc-400 flex items-start gap-3 backdrop-blur-sm">
          <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-zinc-200 block mb-0.5">Acceso exclusivo a usuarios autorizados</strong>
            Las cuentas son dadas de alta únicamente por la secretaría de Academias Péndulo. No se permiten registros públicos sin matrícula activa.
          </div>
        </div>

        {/* Demo Access Selector Pills */}
        <div className="mt-6 bg-zinc-900/90 border border-zinc-800 p-2 rounded-xl">
          <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider text-center mb-2">
            Probar cuentas de demostración:
          </div>
          <div className="grid grid-cols-3 gap-1.5 text-xs font-medium">
            <button
              type="button"
              onClick={() => setDemoAccount('alumno@pendulo.es')}
              className={`py-2 px-2 rounded-lg border text-center transition-all ${
                email === 'alumno@pendulo.es'
                  ? 'bg-red-600/20 border-red-500/50 text-red-400'
                  : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              Alumno
            </button>
            <button
              type="button"
              onClick={() => setDemoAccount('profesor@pendulo.es')}
              className={`py-2 px-2 rounded-lg border text-center transition-all ${
                email === 'profesor@pendulo.es'
                  ? 'bg-red-600/20 border-red-500/50 text-red-400'
                  : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              Profesor
            </button>
            <button
              type="button"
              onClick={() => setDemoAccount('admin@pendulo.es')}
              className={`py-2 px-2 rounded-lg border text-center transition-all ${
                email === 'admin@pendulo.es'
                  ? 'bg-red-600/20 border-red-500/50 text-red-400'
                  : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              Admin
            </button>
          </div>
        </div>

        {/* Login Form Container */}
        <div className="mt-6 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 sm:p-8 relative">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {authError && (
              <div className="p-3 rounded-lg bg-red-950/80 border border-red-800 text-red-300 text-xs font-medium flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-2">
                Correo electrónico
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@pendulo.es"
                  className="block w-full pl-10 pr-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  Contraseña
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotMsg(true)}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors underline font-medium"
                >
                  ¿Has olvidado tu contraseña?
                </button>
              </div>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                />
              </div>
            </div>

            {showForgotMsg && (
              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-400 leading-relaxed">
                Por motivos de seguridad, para restablecer la contraseña debes contactar con Secretaría en{' '}
                <a href="mailto:secretaria@academiaspendulo.es" className="text-red-400 underline">
                  secretaria@academiaspendulo.es
                </a>{' '}
                o llamando al <span className="text-white font-medium">950 00 00 00</span>.
              </div>
            )}

            <button
              type="submit"
              className="w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all uppercase tracking-wider"
            >
              <LogIn className="w-4 h-4" />
              Iniciar Sesión
            </button>
          </form>

          <div className="mt-6 border-t border-zinc-800/80 pt-4 text-center">
            <p className="text-xs text-zinc-500">
              Servidor seguro con cifrado SSL & Control de Matrícula en tiempo real.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
