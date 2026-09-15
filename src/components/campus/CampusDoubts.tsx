import React, { useState } from 'react';
import { useCampus } from '../../context/CampusContext';
import {
  HelpCircle,
  Plus,
  MessageSquare,
  Clock,
  CheckCircle2,
  XCircle,
  Send,
  User,
  Paperclip,
  GraduationCap,
} from 'lucide-react';
import { QuestionThread } from '../../types/campus';

export const CampusDoubts: React.FC = () => {
  const {
    currentUser,
    questions,
    courses,
    getUserEnrollments,
    addQuestionThread,
    addQuestionMessage,
  } = useCampus();

  const [selectedThread, setSelectedThread] = useState<QuestionThread | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);

  // New Question Form state
  const [courseId, setCourseId] = useState('');
  const [moduloUnidad, setModuloUnidad] = useState('');
  const [asunto, setAsunto] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [adjuntoNombre, setAdjuntoNombre] = useState('');

  // Reply message state
  const [replyText, setReplyText] = useState('');

  if (!currentUser) return null;

  // Filter threads based on role
  const userThreads =
    currentUser.role === 'ALUMNO'
      ? questions.filter((q) => q.estudianteId === currentUser.id)
      : currentUser.role === 'PROFESOR'
      ? questions.filter((q) => q.profesorId === currentUser.id)
      : questions; // Admin sees all

  const enrollments = getUserEnrollments(currentUser.id);

  const handleCreateQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId || !asunto || !mensaje) return;

    const course = courses.find((c) => c.id === courseId);
    const profesorId = course?.profesorId || 'prof1';

    addQuestionThread({
      estudianteId: currentUser.id,
      estudianteNombre: `${currentUser.nombre} ${currentUser.apellidos}`,
      profesorId: profesorId,
      cursoId: courseId,
      cursoNombre: course?.nombre || 'Curso',
      moduloUnidad: moduloUnidad || 'General',
      asunto: asunto,
      estado: 'PENDIENTE',
      adjuntoUrl: adjuntoNombre ? '#' : undefined,
      mensajes: [
        {
          id: `msg_${Date.now()}`,
          autorId: currentUser.id,
          autorNombre: `${currentUser.nombre} ${currentUser.apellidos}`,
          autorRol: currentUser.role,
          texto: mensaje,
          fechaHora: new Date().toISOString(),
          adjuntoUrl: adjuntoNombre ? '#' : undefined,
        },
      ],
    });

    setShowNewModal(false);
    setAsunto('');
    setMensaje('');
    setModuloUnidad('');
    setAdjuntoNombre('');
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedThread || !replyText.trim()) return;

    addQuestionMessage(selectedThread.id, {
      autorId: currentUser.id,
      autorNombre: `${currentUser.nombre} ${currentUser.apellidos}`,
      autorRol: currentUser.role,
      texto: replyText.trim(),
      fechaHora: new Date().toISOString(),
    });

    setReplyText('');

    // Update active thread view state locally
    const updated = questions.find((q) => q.id === selectedThread.id);
    if (updated) setSelectedThread(updated);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-heading flex items-center gap-3">
            <HelpCircle className="w-7 h-7 text-red-500" />
            Dudas al Profesor
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Plantea tus consultas académicas directamente a tu profesor asignado dentro del campus.
          </p>
        </div>

        {currentUser.role === 'ALUMNO' && (
          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-2 px-5 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-red-950/40 transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            Nueva Consulta
          </button>
        )}
      </div>

      {/* Main Grid View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Thread List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
            Conversaciones ({userThreads.length})
          </div>

          {userThreads.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center text-xs text-zinc-500">
              No tienes ninguna consulta abierta.
            </div>
          ) : (
            <div className="space-y-3">
              {userThreads.map((thread) => {
                const isSelected = selectedThread?.id === thread.id;
                const lastMsg = thread.mensajes[thread.mensajes.length - 1];

                return (
                  <div
                    key={thread.id}
                    onClick={() => setSelectedThread(thread)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-zinc-900 border-red-500 shadow-xl'
                        : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] mb-1.5">
                      <span className="text-red-400 font-bold truncate max-w-[180px]">
                        {thread.cursoNombre}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          thread.estado === 'RESPONDIDA'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : thread.estado === 'CERRADA'
                            ? 'bg-zinc-800 text-zinc-400'
                            : 'bg-amber-950 text-amber-400 border border-amber-800'
                        }`}
                      >
                        {thread.estado}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-white mb-1">{thread.asunto}</h4>
                    <p className="text-[11px] text-zinc-400 line-clamp-2">{lastMsg?.texto}</p>

                    <div className="mt-3 flex items-center justify-between text-[10px] text-zinc-500 pt-2 border-t border-zinc-800/60">
                      <span>Unidad: {thread.moduloUnidad}</span>
                      <span>
                        {new Date(thread.fechaUltimaActualizacion).toLocaleDateString('es-ES')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Active Thread Messages */}
        <div className="lg:col-span-7 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 sm:p-6 flex flex-col h-[600px]">
          {selectedThread ? (
            <>
              {/* Thread Header */}
              <div className="pb-4 border-b border-zinc-800 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-red-400 font-bold uppercase">
                    {selectedThread.cursoNombre} • {selectedThread.moduloUnidad}
                  </div>
                  <h3 className="text-base font-extrabold text-white mt-0.5">
                    {selectedThread.asunto}
                  </h3>
                  <div className="text-[11px] text-zinc-400 mt-1">
                    Estudiante:{' '}
                    <strong className="text-zinc-200">{selectedThread.estudianteNombre}</strong>
                  </div>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    selectedThread.estado === 'RESPONDIDA'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : 'bg-amber-950 text-amber-400 border border-amber-800'
                  }`}
                >
                  {selectedThread.estado}
                </span>
              </div>

              {/* Thread Messages List */}
              <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
                {selectedThread.mensajes.map((msg) => {
                  const isMe = msg.autorId === currentUser.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-md p-4 rounded-2xl text-xs space-y-1.5 shadow-md ${
                          isMe
                            ? 'bg-red-600 text-white rounded-br-none'
                            : 'bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-bl-none'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] opacity-80 gap-3 font-semibold">
                          <span>{msg.autorNombre}</span>
                          <span>
                            {new Date(msg.fechaHora).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="leading-relaxed whitespace-pre-wrap">{msg.texto}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reply Input */}
              <form
                onSubmit={handleSendReply}
                className="pt-4 border-t border-zinc-800 flex items-center gap-3"
              >
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Escribe tu respuesta..."
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                />
                <button
                  type="submit"
                  className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="m-auto text-center space-y-3 text-zinc-500">
              <MessageSquare className="w-12 h-12 mx-auto text-zinc-700" />
              <div className="text-xs">Selecciona una consulta para ver la conversación.</div>
            </div>
          )}
        </div>
      </div>

      {/* New Question Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <h3 className="text-lg font-bold text-white font-heading">Plantear Nueva Consulta</h3>

            <form onSubmit={handleCreateQuestion} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Curso</label>
                <select
                  required
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-red-500"
                >
                  <option value="">Selecciona un curso</option>
                  {enrollments.map(({ course }) => (
                    <option key={course.id} value={course.id}>
                      {course.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">
                  Módulo o Unidad (Opcional)
                </label>
                <input
                  type="text"
                  value={moduloUnidad}
                  onChange={(e) => setModuloUnidad(e.target.value)}
                  placeholder="Ej. Módulo 1 / Unidad 2"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Asunto</label>
                <input
                  type="text"
                  required
                  value={asunto}
                  onChange={(e) => setAsunto(e.target.value)}
                  placeholder="Breve resumen de tu consulta"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Mensaje explicativo</label>
                <textarea
                  required
                  rows={4}
                  value={mensaje}
                  onChange={(e) => setMensaje(e.target.value)}
                  placeholder="Describe detalladamente tu duda académica..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-red-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-xl font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold"
                >
                  Enviar Duda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
