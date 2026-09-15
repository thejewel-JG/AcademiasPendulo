import React from 'react';
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
} from 'lucide-react';

export const CampusStudentDashboard: React.FC = () => {
  const {
    currentUser,
    getUserEnrollments,
    getCourseProgress,
    getLastVisitedLesson,
    navigateTo,
    announcements,
    questions,
    secretaryRequests,
  } = useCampus();

  if (!currentUser) return null;

  const enrollments = getUserEnrollments(currentUser.id);

  // Stats calculate
  const totalCourses = enrollments.length;
  const recentAnnouncements = announcements.slice(0, 3);
  const userQuestions = questions.filter((q) => q.estudianteId === currentUser.id);
  const pendingDoubtsCount = userQuestions.filter((q) => q.estado === 'PENDIENTE').length;
  const userSecretaryRequests = secretaryRequests.filter((r) => r.estudianteId === currentUser.id);

  const lastLessonInfo = getLastVisitedLesson();

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Personalized Header Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-zinc-900 via-zinc-900 to-red-950/40 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-red-600/10 blur-3xl pointer-events-none rounded-full" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/20 border border-red-500/30 text-red-400 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              Bienvenido de nuevo
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight font-heading">
              ¡Hola, {currentUser.nombre}!
            </h1>
            <p className="mt-2 text-sm text-zinc-400 max-w-xl leading-relaxed">
              Tienes <span className="text-white font-semibold">{totalCourses} cursos activos</span> en tu matrícula actual. Continúa con tu aprendizaje técnico profesional.
            </p>
          </div>

          {lastLessonInfo && (
            <div className="bg-zinc-950/80 border border-zinc-800 p-4 rounded-2xl md:w-80 shrink-0 shadow-lg">
              <div className="text-[11px] font-bold text-red-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Última lección visitada
              </div>
              <div className="text-xs font-bold text-white truncate">{lastLessonInfo.lesson.titulo}</div>
              <div className="text-[11px] text-zinc-400 truncate mt-0.5">{lastLessonInfo.course.nombre}</div>
              <button
                onClick={() => navigateTo('curso-detalle', lastLessonInfo.course.id)}
                className="mt-3 w-full flex items-center justify-center gap-2 py-2 px-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-md"
              >
                <PlayCircle className="w-4 h-4" />
                Continuar Curso
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Enrolled Courses Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 font-heading">
            <BookOpen className="w-5 h-5 text-red-500" />
            Tus Cursos Matriculados
          </h2>
          <button
            onClick={() => navigateTo('cursos')}
            className="text-xs text-red-400 hover:text-red-300 font-semibold flex items-center gap-1"
          >
            Ver todos ({totalCourses}) <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {totalCourses === 0 ? (
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-8 text-center">
            <GraduationCap className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-zinc-300">No tienes cursos activos actualmente.</h3>
            <p className="text-xs text-zinc-500 mt-1">
              Contacta con secretaría para formalizar tu matrícula.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enrollments.map(({ course }) => {
              const progress = getCourseProgress(course.id);
              return (
                <div
                  key={course.id}
                  className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl overflow-hidden transition-all hover:shadow-xl hover:shadow-black/50 flex flex-col group"
                >
                  <div className="relative h-40 overflow-hidden bg-zinc-950">
                    <img
                      src={course.imagen}
                      alt={course.nombre}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent" />
                    <span className="absolute top-3 left-3 bg-zinc-950/80 backdrop-blur-md border border-zinc-800 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                      {course.codigo}
                    </span>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <h3 className="font-bold text-white text-base leading-snug line-clamp-2">
                        {course.nombre}
                      </h3>
                      <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                        {course.descripcion}
                      </p>
                    </div>

                    {/* Progress Bar */}
                    <div>
                      <div className="flex justify-between items-center text-xs font-semibold mb-1.5">
                        <span className="text-zinc-400">Progreso del curso</span>
                        <span className="text-red-400">{progress}%</span>
                      </div>
                      <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-red-600 to-red-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    <button
                      onClick={() => navigateTo('curso-detalle', course.id)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-zinc-800 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition-colors group-hover:bg-red-600"
                    >
                      <PlayCircle className="w-4 h-4" />
                      Continuar Curso
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Grid 2 Column Dashboard Section: Announcements & Recent Doubts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Announcements */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2 font-heading">
              <Bell className="w-4 h-4 text-red-500" />
              Últimos Avisos del Campus
            </h2>
            <button
              onClick={() => navigateTo('avisos')}
              className="text-xs text-red-400 hover:text-red-300 font-semibold"
            >
              Ver todos
            </button>
          </div>

          {recentAnnouncements.length === 0 ? (
            <div className="text-center py-6 text-xs text-zinc-500">
              No hay avisos recientes en este momento.
            </div>
          ) : (
            <div className="space-y-3">
              {recentAnnouncements.map((notice) => (
                <div
                  key={notice.id}
                  className="bg-zinc-950 border border-zinc-800/80 p-4 rounded-xl space-y-1.5"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-red-400 font-bold uppercase tracking-wider">
                      {notice.autorNombre}
                    </span>
                    <span className="text-zinc-500">
                      {new Date(notice.fecha).toLocaleDateString('es-ES')}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white">{notice.titulo}</h4>
                  <p className="text-xs text-zinc-400 line-clamp-2">{notice.contenido}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Doubts and Secretary Status Summary */}
        <div className="space-y-6">
          {/* Doubts Card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2 font-heading">
                <HelpCircle className="w-4 h-4 text-red-500" />
                Dudas Académicas
              </h2>
              <button
                onClick={() => navigateTo('dudas')}
                className="text-xs text-red-400 hover:text-red-300 font-semibold"
              >
                Ir a Consultas
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-zinc-950 border border-zinc-800 p-3.5 rounded-xl">
                <div className="text-[11px] text-zinc-400 font-medium">Consultas Abiertas</div>
                <div className="text-xl font-bold text-white mt-1">{pendingDoubtsCount}</div>
              </div>
              <div className="bg-zinc-950 border border-zinc-800 p-3.5 rounded-xl">
                <div className="text-[11px] text-zinc-400 font-medium">Total Planteadas</div>
                <div className="text-xl font-bold text-white mt-1">{userQuestions.length}</div>
              </div>
            </div>
          </div>

          {/* Secretary Requests Summary */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2 font-heading">
                <FileText className="w-4 h-4 text-red-500" />
                Secretaría Online
              </h2>
              <button
                onClick={() => navigateTo('secretaria')}
                className="text-xs text-red-400 hover:text-red-300 font-semibold"
              >
                Nueva Solicitud
              </button>
            </div>

            {userSecretaryRequests.length === 0 ? (
              <div className="text-center py-4 text-xs text-zinc-500">
                No tienes solicitudes administrativas recientes.
              </div>
            ) : (
              <div className="space-y-2.5">
                {userSecretaryRequests.slice(0, 2).map((req) => (
                  <div
                    key={req.id}
                    className="bg-zinc-950 border border-zinc-800 p-3 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="text-zinc-500 text-[10px] block">{req.referencia}</span>
                      <span className="font-bold text-white truncate block max-w-[180px]">
                        {req.asunto}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-md text-[10px] font-bold ${
                        req.estado === 'RESUELTA'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : req.estado === 'RECHAZADA'
                          ? 'bg-red-950 text-red-400 border border-red-800'
                          : 'bg-amber-950 text-amber-400 border border-amber-800'
                      }`}
                    >
                      {req.estado}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
