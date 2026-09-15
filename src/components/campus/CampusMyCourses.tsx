import React from 'react';
import { useCampus } from '../../context/CampusContext';
import { BookOpen, PlayCircle, GraduationCap, Layers, UserCheck } from 'lucide-react';

export const CampusMyCourses: React.FC = () => {
  const { currentUser, getUserEnrollments, getCourseProgress, navigateTo } = useCampus();

  if (!currentUser) return null;

  const enrollments = getUserEnrollments(currentUser.id);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-heading flex items-center gap-3">
          <BookOpen className="w-7 h-7 text-red-500" />
          Mis Cursos Matriculados
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 mt-1">
          Accede al contenido formativo oficial, temarios en PDF y clases en vídeo de tus especialidades activas.
        </p>
      </div>

      {/* Courses List */}
      {enrollments.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center max-w-md mx-auto my-12">
          <GraduationCap className="w-14 h-14 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-base font-bold text-zinc-200">No tienes cursos activos actualmente.</h3>
          <p className="text-xs text-zinc-500 mt-2">
            No figura ninguna matrícula activa vinculada a tu cuenta de estudiante.
          </p>
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
                      <span className="truncate">{course.profesorNombre || 'Prof. Asignado'}</span>
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
