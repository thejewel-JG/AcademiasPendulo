import React from 'react';
import { useCampus } from '../../context/CampusContext';
import { BookOpen, PlayCircle, GraduationCap, Layers, UserCheck, FileText, Lock } from 'lucide-react';

export const CampusMyCourses: React.FC = () => {
  const { currentUser, getUserEnrollments, getCourseProgress, navigateTo, activeEnrollmentData } = useCampus();

  if (!currentUser) return null;

  const enrollments = getUserEnrollments(currentUser.id);
  const hasActiveEnrollment = activeEnrollmentData ? activeEnrollmentData.estado === 'ACTIVA' : enrollments.length > 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-heading flex items-center gap-3">
          <BookOpen className="w-7 h-7 text-red-500" />
          Mis Cursos Matriculados
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 mt-1">
          Accede al contenido formativo oficial, temarios en PDF y clases en vídeo de tu especialidad autorizada.
        </p>
      </div>

      {/* Check Enrollment Status */}
      {!hasActiveEnrollment ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 sm:p-12 text-center max-w-lg mx-auto my-8 space-y-4 shadow-2xl">
          <div className="w-16 h-16 bg-red-950/80 border border-red-800 rounded-full flex items-center justify-center mx-auto text-red-400">
            <Lock className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-white">Sin Matrícula Activa en el Campus</h3>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              Actualmente tu cuenta de estudiante no tiene formalizada ninguna matrícula activa en el catálogo de las 33 especialidades. Por política de seguridad, el acceso a los contenidos formativos está reservado a alumnos matriculados.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigateTo('secretaria')}
              className="w-full sm:w-auto px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-red-950/40"
            >
              <FileText className="w-4 h-4" />
              Solicitar Tramitación en Secretaría
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {enrollments.map(({ course }) => {
            const progress = getCourseProgress(course.id);
            const totalModules = course.modulos.length;

            return (
              <div
                key={course.id}
                className="bg-zinc-900 border border-zinc-800 hover:border-red-600/50 rounded-2xl overflow-hidden shadow-xl transition-all duration-300 flex flex-col group"
              >
                {/* Header Image with Code Badge */}
                <div className="relative h-48 bg-zinc-950 overflow-hidden">
                  <img
                    src={course.imagen}
                    alt={course.nombre}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/30 to-transparent" />

                  <span className="absolute top-3 left-3 bg-zinc-950/80 backdrop-blur-md border border-zinc-800 text-white text-[11px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                    {course.codigo}
                  </span>
                </div>

                {/* Content Body */}
                <div className="p-6 flex-1 flex flex-col justify-between space-y-5">
                  <div className="space-y-2">
                    <h3 className="font-extrabold text-white text-lg leading-snug group-hover:text-red-400 transition-colors">
                      {course.nombre}
                    </h3>
                    <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed">
                      {course.descripcion}
                    </p>
                  </div>

                  {/* Metadata Chips */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-400">
                    <div className="bg-zinc-950 border border-zinc-800/80 px-3 py-2 rounded-xl flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      <span>{totalModules} Módulos</span>
                    </div>
                    <div className="bg-zinc-950 border border-zinc-800/80 px-3 py-2 rounded-xl flex items-center gap-2 truncate">
                      <UserCheck className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      <span className="truncate">{activeEnrollmentData?.profesor_nombre || course.profesorNombre || 'Prof. Asignado'}</span>
                    </div>
                  </div>

                  {/* Progress Indicator */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-zinc-400">Progreso general</span>
                      <span className="text-red-400 font-extrabold">{progress}%</span>
                    </div>
                    <div className="w-full bg-zinc-950 h-2.5 rounded-full overflow-hidden border border-zinc-800">
                      <div
                        className="bg-gradient-to-r from-red-600 to-red-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Primary CTA */}
                  <button
                    onClick={() => navigateTo('curso-detalle', course.id)}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-red-950/40"
                  >
                    <PlayCircle className="w-4.5 h-4.5" />
                    Continuar Curso
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
