import React, { useState } from 'react';
import { useCampus } from '../../context/CampusContext';
import { Bell, Plus, Filter, Tag, Calendar, UserCheck } from 'lucide-react';
import { Announcement } from '../../types/campus';

export const CampusAnnouncements: React.FC = () => {
  const { currentUser, announcements, courses, addAnnouncement } = useCampus();
  const [filterCourseId, setFilterCourseId] = useState<string>('ALL');
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [titulo, setTitulo] = useState('');
  const [contenido, setContenido] = useState('');
  const [cursoIdTarget, setCursoIdTarget] = useState<string>('TODOS');
  const [destinatariosRol, setDestinatariosRol] = useState<'TODOS' | 'ALUMNOS' | 'PROFESORES'>('TODOS');

  if (!currentUser) return null;

  // Filter announcements for user view
  const filteredAnnouncements = announcements.filter((notice) => {
    if (filterCourseId !== 'ALL') {
      return notice.cursoId === filterCourseId || notice.cursoId === 'TODOS';
    }
    return true;
  });

  const canPublish = currentUser.role === 'ADMINISTRACION' || currentUser.role === 'PROFESOR';

  const handleCreateAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo || !contenido) return;

    addAnnouncement({
      titulo,
      contenido,
      autorId: currentUser.id,
      autorNombre: `${currentUser.nombre} ${currentUser.apellidos}`,
      cursoId: cursoIdTarget === 'TODOS' ? undefined : cursoIdTarget,
      destinatarios: destinatariosRol,
      fecha: new Date().toISOString(),
    });

    setShowModal(false);
    setTitulo('');
    setContenido('');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-heading flex items-center gap-3">
            <Bell className="w-7 h-7 text-red-500" />
            Avisos y Noticias del Campus
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Tablón oficial de comunicaciones, convocatorias de exámenes y avisos lectivos.
          </p>
        </div>

        {canPublish && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-5 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-red-950/40 transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            Publicar Aviso
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-red-400" />
          <span>Filtrar por curso:</span>
        </div>

        <select
          value={filterCourseId}
          onChange={(e) => setFilterCourseId(e.target.value)}
          className="w-full sm:w-72 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
        >
          <option value="ALL">Todos los avisos globales y de mis cursos</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.codigo} - {c.nombre}
            </option>
          ))}
        </select>
      </div>

      {/* Announcements Grid */}
      {filteredAnnouncements.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center text-xs text-zinc-500">
          No hay avisos publicados para el filtro seleccionado.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredAnnouncements.map((notice) => (
            <div
              key={notice.id}
              className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-6 space-y-4 shadow-xl transition-all"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-950/60 border border-red-800/80 text-red-400 font-extrabold uppercase tracking-wider text-[10px]">
                  <Tag className="w-3 h-3" />
                  {notice.cursoId ? 'Aviso de Curso' : 'Aviso Global Campus'}
                </span>

                <span className="text-zinc-500 flex items-center gap-1 text-[11px]">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(notice.fecha).toLocaleDateString('es-ES')}
                </span>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-base font-extrabold text-white">{notice.titulo}</h3>
                <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">
                  {notice.contenido}
                </p>
              </div>

              <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-red-400" />
                  Publicado por: <strong className="text-zinc-200">{notice.autorNombre}</strong>
                </span>
                <span className="text-zinc-500 uppercase font-semibold">
                  {notice.destinatarios}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Publish Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <h3 className="text-lg font-bold text-white font-heading">Publicar Nuevo Aviso</h3>

            <form onSubmit={handleCreateAnnouncement} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Título del Aviso</label>
                <input
                  type="text"
                  required
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ej. Convocatoria de exámenes finales"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">
                  Curso Destino (Opcional)
                </label>
                <select
                  value={cursoIdTarget}
                  onChange={(e) => setCursoIdTarget(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-red-500"
                >
                  <option value="TODOS">Todos los Cursos (Aviso Global)</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.codigo} - {c.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Contenido del Aviso</label>
                <textarea
                  required
                  rows={5}
                  value={contenido}
                  onChange={(e) => setContenido(e.target.value)}
                  placeholder="Escribe el cuerpo del aviso..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-red-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-xl font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold"
                >
                  Publicar Aviso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
