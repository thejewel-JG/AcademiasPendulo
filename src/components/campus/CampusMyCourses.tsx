import React, { useState, useEffect } from 'react';
import { useCampus } from '../../context/CampusContext';
import {
  BookOpen,
  PlayCircle,
  GraduationCap,
  Layers,
  UserCheck,
  FileText,
  Lock,
  Clock,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

interface CourseCardData {
  id: string;
  matricula_id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  categoria: string;
  duracion: string;
  modalidad: string;
  profesor: string;
  profesor_email?: string;
  estado_academico: string;
  estado_acceso: string;
  progreso: number;
  fecha_inicio: string;
  fecha_aprobacion?: string;
  imagen: string;
}

export const CampusMyCourses: React.FC = () => {
  const { currentUser, navigateTo } = useCampus();

  const [courses, setCourses] = useState<CourseCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMyCourses = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/student/my-courses');
      if (!res.ok) {
        throw new Error('No se pudieron consultar los cursos activos.');
      }
      const data = await res.json();
      setCourses(data.courses || []);
    } catch (err: any) {
      setError(err.message || 'Error de conexión.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchMyCourses();
    }
  }, [currentUser]);

  if (!currentUser) return null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-heading flex items-center gap-3">
          <BookOpen className="w-7 h-7 text-red-500" />
          Mis Cursos Matriculados
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 mt-1">
          Cursos autorizados con matrícula aprobada y activa. Accede a los temarios oficiales, PDFs y lecciones.
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-zinc-400">
          <div className="inline-block w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs">Cargando tus cursos autorizados...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-red-950/80 border border-red-800 text-red-300 rounded-2xl text-xs flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : courses.length === 0 ? (
        /* Empty state matching Section 12 */
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 sm:p-12 text-center max-w-lg mx-auto my-8 space-y-4 shadow-2xl">
          <div className="w-16 h-16 bg-red-950/80 border border-red-800 rounded-full flex items-center justify-center mx-auto text-red-400">
            <Lock className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-white">Todavía no tienes cursos activos</h3>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              Todavía no tienes cursos activos. Puedes consultar tus solicitudes en el apartado Mis matrículas.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigateTo('mis-matriculas')}
              className="w-full sm:w-auto px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-red-950/40"
            >
              <FileText className="w-4 h-4" />
              Ir a Mis Matrículas
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((c) => (
            <div
              key={c.matricula_id}
              className="bg-zinc-900 border border-zinc-800 hover:border-red-600/50 rounded-2xl overflow-hidden shadow-xl transition-all duration-300 flex flex-col group"
            >
              {/* Header Image with Code Badge */}
              <div className="relative h-48 bg-zinc-950 overflow-hidden">
                <img
                  src={c.imagen || '/hero.png'}
                  alt={c.nombre}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/30 to-transparent" />

                <span className="absolute top-3 left-3 bg-zinc-950/80 backdrop-blur-md border border-zinc-800 text-white text-[11px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                  {c.codigo}
                </span>

                <span className="absolute top-3 right-3 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                  {c.estado_academico}
                </span>
              </div>

              {/* Content Body */}
              <div className="p-6 flex-1 flex flex-col justify-between space-y-5">
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-red-400 uppercase tracking-wider">
                    {c.categoria}
                  </div>
                  <h3 className="font-extrabold text-white text-lg leading-snug group-hover:text-red-400 transition-colors">
                    {c.nombre}
                  </h3>
                  <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed">
                    {c.descripcion || 'Formación especializada oficial en automoción.'}
                  </p>
                </div>

                {/* Metadata Chips (Section 3.B) */}
                <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-400">
                  <div className="bg-zinc-950 border border-zinc-800/80 px-3 py-2 rounded-xl flex items-center gap-2 truncate">
                    <Clock className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    <span>{c.duracion}</span>
                  </div>
                  <div className="bg-zinc-950 border border-zinc-800/80 px-3 py-2 rounded-xl flex items-center gap-2 truncate">
                    <UserCheck className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    <span className="truncate">{c.profesor}</span>
                  </div>
                </div>

                <div className="text-[11px] text-zinc-400 bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800/60 flex items-center justify-between">
                  <span>Modalidad: <strong className="text-zinc-200">{c.modalidad}</strong></span>
                  <span className="text-emerald-400 font-semibold">Acceso Habilitado</span>
                </div>

                {/* Progress Indicator */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-zinc-400">Progreso general</span>
                    <span className="text-red-400 font-bold">{c.progreso}%</span>
                  </div>
                  <div className="w-full bg-zinc-950 rounded-full h-2 border border-zinc-800 overflow-hidden">
                    <div
                      className="bg-red-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(0, c.progreso))}%` }}
                    />
                  </div>
                </div>

                {/* Button Acceder al curso */}
                <button
                  onClick={() => navigateTo('curso-detalle', c.id)}
                  className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-red-950/50 flex items-center justify-center gap-2 group-hover:scale-[1.01]"
                >
                  <PlayCircle className="w-4 h-4" />
                  Acceder al curso
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
