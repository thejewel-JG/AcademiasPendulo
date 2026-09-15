import React, { useState } from 'react';
import { useCampus } from '../../context/CampusContext';
import { GraduationCap, BookOpen, Users, HelpCircle, Bell, ArrowRight, PlayCircle } from 'lucide-react';

export const CampusTeacherDashboard: React.FC = () => {
  const { currentUser, courses, questions, announcements, navigateTo, publishCourseResource } = useCampus();

  if (!currentUser) return null;

  // Filter courses assigned to this teacher
  const assignedCourses = courses.filter((c) => c.profesorId === currentUser.id);
  const teacherQuestions = questions.filter((q) => q.profesorId === currentUser.id);
  const pendingCount = teacherQuestions.filter((q) => q.estado === 'PENDIENTE').length;

  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState(assignedCourses[0]?.id || 'TMVG0004');
  const [selectedModuleId, setSelectedModuleId] = useState('mod1');
  const [resourceTitle, setResourceTitle] = useState('');
  const [resourceDesc, setResourceDesc] = useState('');
  const [resourceType, setResourceType] = useState<'PDF' | 'VIDEO'>('PDF');
  const [resourceUrl, setResourceUrl] = useState('');
  const [allowDownload, setAllowDownload] = useState(true);
  const [publishSuccessMsg, setPublishSuccessMsg] = useState('');

  const handlePublishMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId || !resourceTitle) return;

    publishCourseResource(selectedCourseId, selectedModuleId, {
      cursoId: selectedCourseId,
      moduloId: selectedModuleId,
      titulo: resourceTitle,
      descripcion: resourceDesc,
      tipo: resourceType,
      urlPrivada: resourceUrl || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      tamano: resourceType === 'PDF' ? '4.2 MB' : undefined,
      permitirDescarga: allowDownload,
      publicado: true,
    });

    setPublishSuccessMsg(
      `¡Material "${resourceTitle}" publicado con éxito! Todos los alumnos matriculados ya tienen acceso.`
    );
    setShowMaterialModal(false);
    setResourceTitle('');
    setResourceDesc('');
    setResourceUrl('');
    setTimeout(() => setPublishSuccessMsg(''), 5000);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Teacher Banner */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-red-950/40 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/20 border border-red-500/30 text-red-400 text-xs font-semibold mb-3">
            <GraduationCap className="w-4 h-4" />
            Panel Docente Académico
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight font-heading">
            Bienvenido, Profesor {currentUser.nombre}
          </h1>
          <p className="mt-2 text-sm text-zinc-400 max-w-xl">
            Gestiona únicamente tus asignaturas tutorizadas, atiende consultas de alumnos y publica material formativo (PDFs y vídeos).
          </p>
        </div>

        <button
          onClick={() => setShowMaterialModal(true)}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider shadow-lg shadow-red-950/40 transition-all shrink-0"
        >
          <BookOpen className="w-4 h-4" /> Publicar PDF / Vídeo
        </button>
      </div>

      {publishSuccessMsg && (
        <div className="p-4 bg-emerald-950/90 border border-emerald-800 text-emerald-300 rounded-2xl text-xs font-bold shadow-xl">
          {publishSuccessMsg}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl space-y-1">
          <div className="text-xs text-zinc-400 font-semibold">Cursos Asignados</div>
          <div className="text-3xl font-extrabold text-white">{assignedCourses.length}</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl space-y-1">
          <div className="text-xs text-zinc-400 font-semibold">Consultas Pendientes</div>
          <div className="text-3xl font-extrabold text-amber-400">{pendingCount}</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl space-y-1">
          <div className="text-xs text-zinc-400 font-semibold">Total Dudas Atendidas</div>
          <div className="text-3xl font-extrabold text-emerald-400">{teacherQuestions.length}</div>
        </div>
      </div>

      {/* Assigned Courses Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 font-heading">
          <BookOpen className="w-5 h-5 text-red-500" />
          Tus Cursos Asignados
        </h2>

        {assignedCourses.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl text-center text-xs text-zinc-500">
            No tienes cursos asignados como profesor titular actualmente.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {assignedCourses.map((course) => (
              <div
                key={course.id}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between space-y-4 shadow-xl"
              >
                <div>
                  <span className="text-[10px] bg-red-600/20 text-red-400 font-extrabold px-2.5 py-0.5 rounded border border-red-500/30 uppercase">
                    {course.codigo}
                  </span>
                  <h3 className="text-lg font-bold text-white mt-2">{course.nombre}</h3>
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{course.descripcion}</p>
                </div>

                <div className="flex items-center justify-between text-xs text-zinc-400 pt-3 border-t border-zinc-800">
                  <span>{course.modulos.length} Módulos</span>
                  <button
                    onClick={() => navigateTo('curso-detalle', course.id)}
                    className="flex items-center gap-1 text-red-400 font-bold hover:underline"
                  >
                    Ver Contenidos <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Doubts and Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-red-500" />
              Consultas Recientes de Alumnos
            </h3>
            <button onClick={() => navigateTo('dudas')} className="text-xs text-red-400 font-semibold">
              Ver Todas
            </button>
          </div>

          {teacherQuestions.length === 0 ? (
            <div className="text-xs text-zinc-500 py-4 text-center">Sin preguntas pendientes.</div>
          ) : (
            <div className="space-y-2.5">
              {teacherQuestions.slice(0, 3).map((q) => (
                <div
                  key={q.id}
                  onClick={() => navigateTo('dudas')}
                  className="bg-zinc-950 border border-zinc-800/80 p-3.5 rounded-xl cursor-pointer hover:border-zinc-700 transition-all text-xs"
                >
                  <div className="flex justify-between items-center text-[10px] text-zinc-400 mb-1">
                    <span className="text-white font-bold">{q.estudianteNombre}</span>
                    <span className="text-amber-400 font-bold">{q.estado}</span>
                  </div>
                  <div className="font-bold text-white">{q.asunto}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Bell className="w-4 h-4 text-red-500" />
              Publicar Comunicado Lectivo
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Publica notas de clase, convocatorias de exámenes o materiales complementarios para los alumnos de tus asignaturas.
            </p>
          </div>

          <button
            onClick={() => navigateTo('avisos')}
            className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-red-950/40"
          >
            Ir al Tablón de Avisos
          </button>
        </div>
      </div>

      {/* Publish Material Modal */}
      {showMaterialModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <h3 className="text-lg font-bold text-white">Publicar Material Formativo</h3>
              <button onClick={() => setShowMaterialModal(false)} className="text-zinc-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handlePublishMaterial} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Curso Asignado *</label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white"
                >
                  {assignedCourses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.codigo} - {c.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Tipo de Material</label>
                  <select
                    value={resourceType}
                    onChange={(e) => setResourceType(e.target.value as any)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white font-bold"
                  >
                    <option value="PDF">Documento PDF</option>
                    <option value="VIDEO">Vídeo Formativo (URL)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Módulo Destino</label>
                  <select
                    value={selectedModuleId}
                    onChange={(e) => setSelectedModuleId(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white"
                  >
                    <option value="mod1">Módulo 1: Seguridad y Desconexión</option>
                    <option value="mod2">Módulo 2: Baterías y BMS</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Título del Recurso *</label>
                <input
                  type="text"
                  required
                  value={resourceTitle}
                  onChange={(e) => setResourceTitle(e.target.value)}
                  placeholder="Ej. Manual práctico de montaje en taller"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Descripción</label>
                <textarea
                  rows={2}
                  value={resourceDesc}
                  onChange={(e) => setResourceDesc(e.target.value)}
                  placeholder="Indicaciones para los alumnos..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white resize-none"
                />
              </div>

              {resourceType === 'VIDEO' ? (
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">URL del Vídeo (YouTube / Vimeo / CDN)</label>
                  <input
                    type="url"
                    required
                    value={resourceUrl}
                    onChange={(e) => setResourceUrl(e.target.value)}
                    placeholder="https://www.youtube.com/embed/..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="allowDownload"
                    checked={allowDownload}
                    onChange={(e) => setAllowDownload(e.target.checked)}
                    className="accent-red-600 rounded"
                  />
                  <label htmlFor="allowDownload" className="text-zinc-300 font-semibold">
                    Permitir descarga del archivo PDF a los alumnos
                  </label>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowMaterialModal(false)}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-xl font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-extrabold"
                >
                  Publicar Inmediatamente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
