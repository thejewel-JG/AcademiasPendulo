import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, CheckCircle2, AlertCircle, ArrowRight, Eye, EyeOff, Building2 } from 'lucide-react';
import { useCampus } from '../../context/CampusContext';

export const CampusAccountActivation: React.FC = () => {
  const [token, setToken] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [tokenInfo, setTokenInfo] = useState<{
    valid: boolean;
    email?: string;
    first_name?: string;
    last_name_1?: string;
    last_name_2?: string;
    course_name?: string;
    error?: string;
  } | null>(null);

  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const { refreshSession } = useCampus();

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const tok = searchParams.get('token');
    if (!tok) {
      setLoading(false);
      setTokenInfo({ valid: false, error: 'Enlace de activación no válido o incompleto.' });
      return;
    }
    setToken(tok);

    const fetchTokenInfo = async () => {
      try {
        const res = await fetch(`/api/auth/activation-info?token=${encodeURIComponent(tok)}`);
        const data = await res.json();
        setTokenInfo(data);
      } catch (err) {
        console.error('Error checking activation token:', err);
        setTokenInfo({ valid: false, error: 'Error de conexión al verificar el enlace de activación.' });
      } finally {
        setLoading(false);
      }
    };

    fetchTokenInfo();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (password.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Las contraseñas no coinciden. Por favor, compruébelas.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/auth/activate-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess(true);
        if (data.user) {
          localStorage.setItem('pendulo_campus_user', JSON.stringify(data.user));
        }
        await refreshSession();
        setTimeout(() => {
          window.location.href = '/campus';
        }, 2000);
      } else {
        setErrorMsg(data.error || 'Error al activar la cuenta.');
      }
    } catch (err) {
      console.error('Error activating account:', err);
      setErrorMsg('Error al conectar con el servidor.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col justify-between selection:bg-red-600 selection:text-white">
      {/* Top Bar */}
      <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center font-black text-xl tracking-wider shadow-lg shadow-red-900/30">
            AP
          </div>
          <div>
            <h1 className="font-extrabold text-sm sm:text-base text-white tracking-tight">ACADEMIAS PÉNDULO</h1>
            <p className="text-[11px] text-zinc-400">Campus Virtual Oficial — Activación de Cuenta</p>
          </div>
        </div>
        <a href="/" className="text-xs text-zinc-400 hover:text-white transition-colors font-semibold">
          Volver a la web principal
        </a>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 relative overflow-hidden">
          
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

          {loading ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-red-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm font-semibold text-zinc-400">Verificando enlace de activación...</p>
            </div>
          ) : !tokenInfo?.valid ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-14 h-14 bg-red-950/60 border border-red-800/80 text-red-500 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                <AlertCircle className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white">Enlace No Válido o Expirado</h2>
                <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
                  {tokenInfo?.error || 'Este enlace de activación ya ha sido utilizado o ha caducado por razones de seguridad.'}
                </p>
              </div>
              <div className="pt-2">
                <a
                  href="/campus/login"
                  className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-xl transition-all"
                >
                  Ir al Inicio de Sesión del Campus
                </a>
              </div>
            </div>
          ) : success ? (
            <div className="text-center space-y-4 py-4 animate-fadeIn">
              <div className="w-16 h-16 bg-emerald-950/80 border border-emerald-700 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-900/30">
                <CheckCircle2 className="w-9 h-9 animate-bounce" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white">¡Cuenta Activada con Éxito!</h2>
                <p className="text-xs text-zinc-300 mt-1">
                  Tu contraseña ha sido guardada. Redirigiéndote a tu Campus Virtual...
                </p>
              </div>
              <div className="pt-2">
                <a
                  href="/campus"
                  className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-xl transition-all shadow-lg shadow-red-900/40"
                >
                  <span>Entrar al Campus Ahora</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          ) : (
            <>
              {/* Header & Welcome Banner */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Solicitud Aceptada
                  </span>
                </div>
                <h2 className="text-xl font-black text-white tracking-tight">
                  Hola, {tokenInfo.first_name} {tokenInfo.last_name_1}
                </h2>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Estás a un paso de comenzar tu formación en <span className="text-white font-bold">{tokenInfo.course_name}</span>. Establece tu contraseña para activar tu acceso.
                </p>
              </div>

              <div className="bg-zinc-950/60 p-3.5 rounded-xl border border-zinc-800 text-xs space-y-1">
                <div className="text-zinc-500 font-bold">Usuario de Acceso:</div>
                <div className="font-mono text-red-400 font-bold">{tokenInfo.email}</div>
              </div>

              {errorMsg && (
                <div className="bg-red-950/80 border border-red-800 text-red-300 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Password Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1.5">Nueva Contraseña</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      required
                      minLength={6}
                      className="w-full pl-10 pr-10 py-2.5 bg-zinc-950 border border-zinc-700 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 font-medium"
                    />
                    <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-zinc-500 hover:text-zinc-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1.5">Confirmar Contraseña</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Repita la contraseña"
                      required
                      minLength={6}
                      className="w-full pl-10 pr-10 py-2.5 bg-zinc-950 border border-zinc-700 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 font-medium"
                    />
                    <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-xl shadow-lg shadow-red-900/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Activando Cuenta...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>ACTIVAR MI CUENTA Y ENTRAR AL CAMPUS</span>
                    </>
                  )}
                </button>
              </form>
            </>
          )}

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 px-6 py-4 text-center text-xs text-zinc-600">
        &copy; {new Date().getFullYear()} Academias Péndulo. Formación Profesional en Automoción. Todos los derechos reservados.
      </footer>
    </div>
  );
};
