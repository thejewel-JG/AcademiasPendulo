import React, { useState } from 'react';
import { useCampus } from '../../context/CampusContext';
import {
  BookOpen,
  CheckCircle2,
  Circle,
  PlayCircle,
  FileText,
  Download,
  Eye,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  Lock,
  Layers,
  Sparkles,
  HelpCircle,
  ShieldCheck,
} from 'lucide-react';
import { Lesson, ResourceItem } from '../../types/campus';

export const CampusCourseDetail: React.FC = () => {
  const {
    activeCourseId,
    getCourseById,
    currentUser,
    completedLessonIds,
    toggleLessonCompletion,
    navigateTo,
    recordLastVisitedLesson,
    userHasActiveEnrollment,
  } = useCampus();

  const course = activeCourseId ? getCourseById(activeCourseId) : null;

  // Track expanded modules in sidebar
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({
    mod1: true,
    mod2: true,
    mod3: true,
  });

  // Track selected lesson
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(() => {
    if (course && course.modulos.length > 0 && course.modulos[0].lecciones.length > 0) {
      return course.modulos[0].lecciones[0];
    }
    return null;
  });

  // Track active PDF preview modal
  const [activePdfPreview, setActivePdfPreview] = useState<ResourceItem | null>(null);

  // Responsive mobile module index toggle state
  const [mobileIndexOpen, setMobileIndexOpen] = useState(false);

  if (!course) {
    return (
      <div className="p-8 text-center text-white">
        <h2 className="text-xl font-bold">Curso no encontrado</h2>
        <button
          onClick={() => navigateTo('cursos')}
          className="mt-4 px-4 py-2 bg-red-600 rounded-xl text-xs font-bold"
        >
          Volver a Mis Cursos
        </button>
      </div>
    );
  }

  // Security Authorization check: Student must have active enrollment or be Admin/Teacher
  const canAccess =
    currentUser?.role === 'ADMINISTRACION' ||
    currentUser?.role === 'PROFESOR' ||
    (currentUser && userHasActiveEnrollment(currentUser.id, course.id));

  if (!canAccess) {
    return (
      <div className="p-8 max-w-lg mx-auto my-12 bg-zinc-900 border border-zinc-800 rounded-2xl text-center space-y-4">
        <Lock className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-extrabold text-white">Acceso Denegado</h2>
        <p className="text-xs text-zinc-400">
          No estás matriculado en el curso <strong className="text-white">{course.nombre}</strong>. Solo puedes consultar cursos con matrícula activa autorizada.
        </p>
        <button
          onClick={() => navigateTo('cursos')}
          className="px-5 py-2.5 bg-red-600 text-white rounded-xl text-xs font-bold"
        >
          Volver a Mis Cursos
        </button>
      </div>
    );
  }

  const handleSelectLesson = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    recordLastVisitedLesson(course.id, lesson.id);
    setMobileIndexOpen(false);
  };

  const toggleModuleAccordion = (modId: string) => {
    setExpandedModules((prev) => ({ ...prev, [modId]: !prev[modId] }));
  };

  // Calculate total lessons and completed count
  const allLessons = course.modulos.flatMap((m) => m.lecciones);
  const completedCount = allLessons.filter((l) => completedLessonIds.includes(l.id)).length;
  const progressPct = allLessons.length > 0 ? Math.round((completedCount / allLessons.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      {/* Top Header Navigation Bar */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigateTo('cursos')}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors"
            title="Volver a mis cursos"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-red-600/20 text-red-400 font-bold px-2 py-0.5 rounded border border-red-500/30 uppercase">
                {course.codigo}
              </span>
              <h1 className="text-xs sm:text-sm font-bold text-white truncate max-w-xs sm:max-w-md">
                {course.nombre}
              </h1>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Index Toggle Button */}
        <div className="lg:hidden">
          <button
            onClick={() => setMobileIndexOpen(!mobileIndexOpen)}
            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-xl text-xs font-semibold text-white"
          >
            <Layers className="w-4 h-4 text-red-400" />
            <span>Índice del Curso</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Course Overall Progress Indicator */}
        <div className="hidden lg:flex items-center gap-3">
          <div className="text-right text-xs">
            <div className="text-zinc-400 font-medium">Progreso general</div>
            <div className="text-white font-extrabold">{progressPct}% completado</div>
          </div>
          <div className="w-24 bg-zinc-800 h-2.5 rounded-full overflow-hidden border border-zinc-700">
            <div
              className="bg-red-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Container Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Mobile Expandable Index Drawer */}
        {mobileIndexOpen && (
          <div className="lg:hidden bg-zinc-900 border-b border-zinc-800 p-4 space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Módulos y Lecciones ({completedCount}/{allLessons.length})
              </span>
              <span className="text-xs font-bold text-red-400">{progressPct}%</span>
            </div>
            {course.modulos.map((modulo, idx) => (
              <div key={modulo.id} className="space-y-1">
                <div className="text-xs font-bold text-red-400 uppercase tracking-wider">
                  Módulo {idx + 1}: {modulo.titulo}
                </div>
                <div className="pl-2 space-y-1">
                  {modulo.lecciones.map((lesson) => {
                    const isCompleted = completedLessonIds.includes(lesson.id);
                    const isSelected = selectedLesson?.id === lesson.id;
                    return (
                      <button
                        key={lesson.id}
                        onClick={() => handleSelectLesson(lesson)}
                        className={`w-full text-left p-2.5 rounded-xl text-xs flex items-center justify-between ${
                          isSelected
                            ? 'bg-red-600 text-white font-bold'
                            : 'bg-zinc-950 text-zinc-300'
                        }`}
                      >
                        <span className="truncate">{lesson.titulo}</span>
                        {isCompleted && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Desktop Left Sidebar Course Syllabus (Index) */}
        <aside className="hidden lg:block w-80 bg-zinc-950 border-r border-zinc-800 overflow-y-auto shrink-0 p-4 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider font-heading flex items-center gap-2">
              <Layers className="w-4 h-4 text-red-500" />
              Temario del Curso
            </span>
            <span className="text-xs text-zinc-400 font-semibold">
              {completedCount} / {allLessons.length}
            </span>
          </div>

          <div className="space-y-3">
            {course.modulos.map((modulo, mIdx) => {
              const isExpanded = expandedModules[modulo.id] !== false;
              return (
                <div
                  key={modulo.id}
                  className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden"
                >
                  <button
                    onClick={() => toggleModuleAccordion(modulo.id)}
                    className="w-full p-3.5 flex items-center justify-between bg-zinc-900 hover:bg-zinc-850 transition-colors text-left"
                  >
                    <div className="pr-2">
                      <div className="text-[10px] font-bold text-red-400 uppercase tracking-wider">
                        Módulo {mIdx + 1}
                      </div>
                      <div className="text-xs font-bold text-white line-clamp-1">
                        {modulo.titulo}
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="p-2 space-y-1 border-t border-zinc-800/60">
                      {modulo.lecciones.map((lesson) => {
                        const isSelected = selectedLesson?.id === lesson.id;
                        const isCompleted = completedLessonIds.includes(lesson.id);

                        return (
                          <button
                            key={lesson.id}
                            onClick={() => handleSelectLesson(lesson)}
                            className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-medium transition-all ${
                              isSelected
                                ? 'bg-red-600 text-white font-bold shadow-md shadow-red-950/40'
                                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/80'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 truncate">
                              {isCompleted ? (
                                <CheckCircle2 className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-emerald-500'}`} />
                              ) : (
                                <Circle className="w-4 h-4 shrink-0 text-zinc-600" />
                              )}
                              <span className="truncate">{lesson.titulo}</span>
                            </div>
                            <span className="text-[10px] opacity-75 shrink-0 ml-1">
                              {lesson.duracion}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {selectedLesson ? (
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Lesson Top Bar Title & Mark as Complete Button */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
                <div>
                  <div className="text-xs font-bold text-red-400 uppercase tracking-wider mb-1">
                    Unidad / Lección
                  </div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white font-heading">
                    {selectedLesson.titulo}
                  </h2>
                </div>

                <button
                  onClick={() => toggleLessonCompletion(selectedLesson.id)}
                  className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-bold transition-all shadow-md ${
                    completedLessonIds.includes(selectedLesson.id)
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-zinc-800 hover:bg-red-600 text-white border border-zinc-700'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {completedLessonIds.includes(selectedLesson.id)
                      ? 'Unidad Completada'
                      : 'Marcar como Completada'}
                  </span>
                </button>
              </div>

              {/* Video Player Section (if lesson has video) */}
              {selectedLesson.videoUrl && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl space-y-3 p-4">
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <PlayCircle className="w-4 h-4 text-red-500" />
                    Clase en Vídeo HD
                  </div>
                  <div className="relative aspect-video bg-black rounded-xl overflow-hidden border border-zinc-800">
                    <iframe
                      src={selectedLesson.videoUrl}
                      title={selectedLesson.titulo}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}

              {/* Text / HTML Lesson Content */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-zinc-800 pb-3">
                  Contenido Teórico de la Unidad
                </h3>
                <div
                  className="prose prose-invert max-w-none text-zinc-300 text-sm leading-relaxed space-y-4"
                  dangerouslySetInnerHTML={{ __html: selectedLesson.contenidoHtml }}
                />
              </div>

              {/* Resources & Private PDFs Section */}
              {selectedLesson.recursos && selectedLesson.recursos.length > 0 && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <FileText className="w-4 h-4 text-red-500" />
                      Documentos y Temarios Privados
                    </h3>
                    <span className="text-[10px] bg-zinc-950 border border-zinc-800 px-2.5 py-1 rounded-full text-zinc-400 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" /> Almacenamiento Seguro
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedLesson.recursos.map((res) => (
                      <div
                        key={res.id}
                        className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl space-y-3 flex flex-col justify-between"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">
                              {res.tipo}
                            </span>
                            <span className="text-[10px] text-zinc-500">{res.tamano}</span>
                          </div>
                          <h4 className="text-xs font-bold text-white">{res.titulo}</h4>
                          <p className="text-[11px] text-zinc-400 line-clamp-2">
                            {res.descripcion}
                          </p>
                        </div>

                        {/* Action Buttons: Ver PDF / Descargar PDF */}
                        <div className="flex items-center gap-2 pt-2 border-t border-zinc-900">
                          <button
                            onClick={() => setActivePdfPreview(res)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-semibold transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Ver PDF
                          </button>

                          {res.permitirDescarga && (
                            <a
                              href={res.urlPrivada}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 rounded-lg text-xs font-semibold transition-all"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Descargar
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Direct Doubt Button for this module */}
              <div className="bg-gradient-to-r from-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-5 flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-red-400" />
                    ¿Tienes dudas sobre esta unidad?
                  </h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Envía una consulta directa a tu tutor asignado ({course.profesorNombre}).
                  </p>
                </div>
                <button
                  onClick={() => navigateTo('dudas')}
                  className="px-4 py-2 bg-zinc-800 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition-colors shrink-0"
                >
                  Plantear Duda
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-zinc-400">
              Selecciona una lección del temario para comenzar a estudiar.
            </div>
          )}
        </main>
      </div>

      {/* PDF View Modal */}
      {activePdfPreview && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col p-4 sm:p-6">
          <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
            <div>
              <h3 className="text-sm font-bold text-white">{activePdfPreview.titulo}</h3>
              <p className="text-xs text-zinc-400">{activePdfPreview.descripcion}</p>
            </div>
            <button
              onClick={() => setActivePdfPreview(null)}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold"
            >
              Cerrar Visor
            </button>
          </div>

          <div className="flex-1 my-4 bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800">
            <iframe
              src={activePdfPreview.urlPrivada}
              className="w-full h-full"
              title={activePdfPreview.titulo}
            />
          </div>
        </div>
      )}
    </div>
  );
};
