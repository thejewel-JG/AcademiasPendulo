import React, { useState, useEffect } from 'react';
import { useCampus } from '../../context/CampusContext';
import {
  BookOpen,
  PlayCircle,
  Clock,
  ArrowRight,
  Bell,
  HelpCircle,
  FileText,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  Sparkles,
  Layers,
  UserCheck,
  Calendar,
  MessageSquare,
  ChevronRight,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';

interface ActiveCourse {
  matricula_id: string;
  course_id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  duracion_horas: number;
  modalidad: string;
  profesor_nombre: string;
  profesor_email?: string;
  estado_academico: string;
  estado_acceso: string;
  fecha_inicio: string;
  fecha_aprobacion?: string;
  progreso: number;
}

interface LatestMaterial {
  id: string;
  titulo: string;
  descripcion?: string;
  tipo: string;
  modulo_unidad?: string;
  archivo_id?: string;
  creado_en: string;
  curso_nombre: string;
}

export const CampusStudentDashboard: React.FC = () => {
  const { currentUser, navigateTo } = useCampus();

  const [loading, setLoading] = useState(true);
  const [hasActiveCourses, setHasActiveCourses] = useState(false);
  const [emptyMessage, setEmptyMessage] = useState<string | null>(null);
  const [activeCourses, setActiveCourses] = useState<ActiveCourse[]>([]);
  const [overallProgress, setOverallProgress] = useState<{ total_publicados: number; completados: number; porcentaje_global: number }>({
    total_publicados: 0,
    completados: 0,
    porcentaje_global: 0
  });
  const [latestMaterials, setLatestMaterials] = useState<LatestMaterial[]>([]);
  const [recentCommunications, setRecentCommunications] = useState<any[]>([]);
  const [pendingNotifications, setPendingNotifications] = useState<any[]>([]);

  const [lastVisitedMaterial, setLastVisitedMaterial] = useState<any | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/student/dashboard');
      if (res.ok) {
        const data = await res.json();
        setHasActiveCourses(data.hasActiveCourses);
        setEmptyMessage(data.emptyMessage);
        setActiveCourses(data.activeCourses || []);
        if (data.overallProgress) {
          setOverallProgress(data.overallProgress);
        }
        setLatestMaterials(data.latestMaterials || []);
        setRecentCommunications(data.recentCommunications || []);
        setPendingNotifications(data.pendingNotifications || []);
      }
    } catch (err) {
      console.warn('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }

    // Also fetch last visited material
    try {
      const lastRes = await fetch('/api/progress/last-visited');
      if (lastRes.ok) {
        const lastData = await lastRes.json();
        if (lastData && lastData.lastVisited) {
          setLastVisitedMaterial(lastData.lastVisited);
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    if (currentUser) {
      fetchDashboardData();
    }
  }, [currentUser]);

  if (!currentUser) return null;

  const formatMinSec = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Personalized Header Welcome Banner (Section 3.A) */}
      <div className="relative overflow-hidden bg-gradient-to-r from-zinc-900 via-zinc-900 to-red-950/40 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-red-600/10 blur-3xl pointer-events-none rounded-full" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/20 border border-red-500/30 text-red-400 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              Bienvenido/a de nuevo al campus
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight font-heading">
              ¡Hola, {currentUser.nombre}!
            </h1>
            <p className="mt-2 text-sm text-zinc-400 max-w-xl leading-relaxed">
              {hasActiveCourses ? (
                <>
                  Tienes <strong className="text-white">{activeCourses.length} curso(s) activo(s)</strong>. Progreso académico global:{' '}
                  <span className="text-red-400 font-bold">{overallProgress.porcentaje_global}%</span>{' '}
                  ({overallProgress.completados} de {overallProgress.total_publicados} materiales completados).
                </>
              ) : (
                'Bienvenido a Academias Péndulo. En este panel podrás realizar el seguimiento de tu formación y tus solicitudes.'
              )}
            </p>
          </div>

          {/* Continue Last Visited Material Card */}
          {lastVisitedMaterial && hasActiveCourses && (
            <div className="bg-zinc-950/90 border border-zinc-800 p-4 rounded-2xl md:w-80 shrink-0 shadow-lg space-y-2">
              <div className="text-[11px] font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Continuar último material
              </div>
              <div className="text-xs font-bold text-white truncate">{lastVisitedMaterial.titulo}</div>
              <div className="text-[11px] text-zinc-400 flex items-center justify-between">
                <span>Tipo: {lastVisitedMaterial.tipo}</span>
                {lastVisitedMaterial.posicion_segundos > 0 && (
                  <span className="text-red-400 font-semibold font-mono">
                    {formatMinSec(lastVisitedMaterial.posicion_segundos)}
                  </span>
                )}
              </div>
              <button
                onClick={() => navigateTo('curso-detalle', activeCourses[0]?.course_id)}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-md"
              >
                <PlayCircle className="w-4 h-4" />
                Continuar lección
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Cursos Activos del Alumno (Section 3.A & 12) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 font-heading">
            <BookOpen className="w-5 h-5 text-red-500" />
            Tus Cursos Activos
          </h2>
          {hasActiveCourses && (
            <button
              onClick={() => navigateTo('cursos')}
              className="text-xs text-red-400 hover:text-red-300 font-semibold flex items-center gap-1"
            >
              Ver todos ({activeCourses.length}) <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {loading ? (
          <div className="p-12 text-center text-zinc-400">
            <div className="inline-block w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs">Cargando tus cursos activos...</p>
          </div>
        ) : !hasActiveCourses ? (
          /* Empty state matching Section 12 */
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 sm:p-12 text-center max-w-xl mx-auto space-y-4 shadow-xl">
            <div className="w-14 h-14 bg-red-950/60 border border-red-900/50 rounded-2xl flex items-center justify-center mx-auto text-red-400">
              <GraduationCap className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Todavía no tienes cursos activos</h3>
              <p className="text-xs text-zinc-400 leading-relaxed max-w-md mx-auto">
                {emptyMessage || 'Todavía no tienes cursos activos. Puedes consultar tus solicitudes en el apartado Mis matrículas.'}
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={() => navigateTo('mis-matriculas')}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-2 mx-auto"
              >
                <FileText className="w-4 h-4" />
                Consultar Mis Matrículas
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeCourses.map((c) => (
              <div
                key={c.matricula_id}
                className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl overflow-hidden transition-all hover:shadow-xl hover:shadow-black/50 flex flex-col group"
              >
                <div className="relative h-40 overflow-hidden bg-zinc-950">
                  <img
                    src="/hero.png"
                    alt={c.nombre}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent" />
                  <span className="absolute top-3 left-3 bg-zinc-950/80 backdrop-blur-md border border-zinc-800 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                    {c.codigo || 'CURSO'}
                  </span>
                  <span className="absolute top-3 right-3 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                    Matrícula Activa
                  </span>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="font-bold text-white text-base leading-snug line-clamp-2">
                      {c.nombre}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                      {c.descripcion || 'Especialidad formativa oficial en automoción.'}
                    </p>
                  </div>

                  {/* Metadata Chips */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-400">
                    <div className="bg-zinc-950 border border-zinc-800/80 px-3 py-1.5 rounded-xl flex items-center gap-1.5 truncate">
                      <Clock className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      <span>{c.duracion_horas ? `${c.duracion_horas}h` : 'Estándar'}</span>
                    </div>
                    <div className="bg-zinc-950 border border-zinc-800/80 px-3 py-1.5 rounded-xl flex items-center gap-1.5 truncate">
                      <UserCheck className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      <span className="truncate">{c.profesor_nombre}</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-zinc-400 text-[11px]">Progreso</span>
                      <span className="text-red-400 font-bold">{c.progreso}%</span>
                    </div>
                    <div className="w-full bg-zinc-950 rounded-full h-2 border border-zinc-800 overflow-hidden">
                      <div
                        className="bg-red-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(0, c.progreso))}%` }}
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => navigateTo('curso-detalle', c.course_id)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-zinc-800 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition-all shadow-md group-hover:bg-red-600"
                  >
                    Acceder al curso <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Two Columns: Latest Materials & Recent Communications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latest Available Materials (Section 3.A) */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2 font-heading">
              <FileText className="w-4 h-4 text-red-500" />
              Últimos Materiales Disponibles
            </h3>
            <span className="text-[11px] text-zinc-500">Publicaciones recientes</span>
          </div>

          {latestMaterials.length === 0 ? (
            <p className="text-xs text-zinc-500 text-center py-6">
              No hay nuevos materiales publicados en este momento.
            </p>
          ) : (
            <div className="space-y-3">
              {latestMaterials.map((m) => (
                <div
                  key={m.id}
                  className="bg-zinc-950/80 border border-zinc-800/80 p-3.5 rounded-xl flex items-center justify-between text-xs hover:border-zinc-700 transition-colors"
                >
                  <div className="space-y-0.5 truncate pr-2">
                    <span className="text-[10px] text-red-400 font-bold uppercase block truncate">
                      {m.curso_nombre} · {m.modulo_unidad || 'General'}
                    </span>
                    <span className="font-bold text-white truncate block">{m.titulo}</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-1 bg-zinc-900 rounded border border-zinc-800 text-zinc-400 shrink-0 uppercase">
                    {m.tipo}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Communications / Doubts (Section 3.A) */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2 font-heading">
              <MessageSquare className="w-4 h-4 text-red-500" />
              Comunicaciones Recientes
            </h3>
            <button
              onClick={() => navigateTo('dudas')}
              className="text-xs text-red-400 hover:text-red-300 font-semibold flex items-center gap-1"
            >
              Ir a Mensajes <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {recentCommunications.length === 0 ? (
            <p className="text-xs text-zinc-500 text-center py-6">
              No tienes mensajes activos con profesores o secretaría.
            </p>
          ) : (
            <div className="space-y-3">
              {recentCommunications.map((c) => (
                <div
                  key={c.id}
                  onClick={() => navigateTo('dudas')}
                  className="bg-zinc-950/80 border border-zinc-800/80 p-3.5 rounded-xl flex items-center justify-between text-xs hover:border-zinc-700 cursor-pointer transition-colors"
                >
                  <div className="truncate pr-2">
                    <span className="font-bold text-white truncate block">{c.asunto}</span>
                    <span className="text-[11px] text-zinc-500">
                      Actualizado: {new Date(c.actualizado_en).toLocaleDateString('es-ES')}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 ${
                      c.estado === 'ABIERTA' || c.estado === 'PENDIENTE'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}
                  >
                    {c.estado}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pending Notifications & Announcements (Section 3.A) */}
      {pendingNotifications.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2 font-heading">
            <Bell className="w-4 h-4 text-red-500" />
            Avisos y Comunicaciones Oficiales
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingNotifications.map((ann) => (
              <div
                key={ann.id}
                className="bg-zinc-950 border border-zinc-800/80 p-4 rounded-xl text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between text-[11px] text-zinc-500">
                  <span className="text-red-400 font-bold uppercase">{ann.prioridad || 'GENERAL'}</span>
                  <span>{new Date(ann.creado_en).toLocaleDateString('es-ES')}</span>
                </div>
                <h4 className="font-bold text-white text-sm">{ann.titulo}</h4>
                <p className="text-zinc-400 line-clamp-2 leading-relaxed">{ann.contenido}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
