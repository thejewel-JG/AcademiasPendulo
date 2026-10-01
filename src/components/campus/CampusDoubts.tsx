import React, { useState, useEffect } from 'react';
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
  FileText,
  Download,
  AlertCircle,
  BookOpen,
  Check,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { QuestionThread } from '../../types/campus';
import { PdfFileUploader } from './PdfFileUploader';

interface StudentEnrollmentItem {
  matricula_id: string;
  grupo_id: string;
  grupo_nombre: string;
  especialidad_id: string;
  especialidad_codigo: string;
  especialidad_nombre: string;
  profesor_id: string | null;
  profesor_nombre: string | null;
  profesor_email: string | null;
}

interface ThreadMessage {
  id: string;
  conversacion_id: string;
  remitente_id: string;
  cuerpo: string;
  estado: string;
  creado_en: string;
  remitente_nombre: string;
  remitente_email?: string;
  remitente_rol?: string;
}

export const CampusDoubts: React.FC = () => {
  const {
    currentUser,
    questions,
    refreshSession,
  } = useCampus();

  const [selectedThread, setSelectedThread] = useState<QuestionThread | null>(null);
  const [threadMessages, setThreadMessages] = useState<ThreadMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Student enrollments from real DB
  const [enrolledList, setEnrolledList] = useState<StudentEnrollmentItem[]>([]);
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<string>('');

  // New Question Form state
  const [moduloUnidad, setModuloUnidad] = useState('');
  const [asunto, setAsunto] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [attachedPdfName, setAttachedPdfName] = useState('');
  const [attachedPdfSize, setAttachedPdfSize] = useState('');
  const [attachedPdfUrl, setAttachedPdfUrl] = useState('');

  // Reply message state
  const [replyText, setReplyText] = useState('');
  const [replyPdfName, setReplyPdfName] = useState('');
  const [replyPdfSize, setReplyPdfSize] = useState('');
  const [replyPdfUrl, setReplyPdfUrl] = useState('');
  const [showReplyPdfUploader, setShowReplyPdfUploader] = useState(false);

  // Fetch real enrollments for student
  useEffect(() => {
    if (currentUser?.role === 'ALUMNO') {
      fetch('/api/academic/my-enrollment')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) {
            const list: StudentEnrollmentItem[] =
              data.activeEnrollments && data.activeEnrollments.length > 0
                ? data.activeEnrollments
                : data.activeEnrollment
                ? [data.activeEnrollment]
                : [];
            setEnrolledList(list);
            if (list.length > 0 && !selectedEnrollmentId) {
              setSelectedEnrollmentId(list[0].matricula_id);
            }
          }
        })
        .catch((err) => console.error('Error fetching student enrollment in doubts:', err));
    }
  }, [currentUser]);

  // Fetch full message list when selected thread changes
  useEffect(() => {
    if (!selectedThread) {
      setThreadMessages([]);
      return;
    }
    setIsLoadingMessages(true);
    fetch(`/api/communications/conversations/${selectedThread.id}/messages`)
      .then((res) => (res.ok ? res.json() : []))
      .then((msgs) => {
        if (Array.isArray(msgs)) {
          setThreadMessages(msgs);
        }
      })
      .catch((err) => console.error('Error fetching thread messages:', err))
      .finally(() => setIsLoadingMessages(false));
  }, [selectedThread?.id]);

  if (!currentUser) return null;

  // Filter threads based on role
  const userThreads =
    currentUser.role === 'ALUMNO'
      ? questions.filter((q) => q.estudianteId === currentUser.id)
      : currentUser.role === 'PROFESOR'
      ? questions.filter((q) => q.profesorId === currentUser.id || !q.profesorId)
      : questions; // Admin sees all

  const currentSelectedEnr =
    enrolledList.find((e) => e.matricula_id === selectedEnrollmentId) || enrolledList[0];

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asunto.trim() || !mensaje.trim()) return;

    setIsSubmitting(true);
    try {
      const cuerpoFinal = attachedPdfUrl
        ? `${mensaje.trim()}\n\n📎 [PDF Adjunto: ${attachedPdfName || 'documento.pdf'}](${attachedPdfUrl})`
        : mensaje.trim();

      const res = await fetch('/api/communications/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'ACADEMICA',
          asunto: moduloUnidad.trim() ? `[${moduloUnidad.trim()}] ${asunto.trim()}` : asunto.trim(),
          grupo_id: currentSelectedEnr?.grupo_id || null,
          cuerpo: cuerpoFinal,
        }),
      });

      if (res.ok) {
        setShowNewModal(false);
        setAsunto('');
        setMensaje('');
        setModuloUnidad('');
        setAttachedPdfName('');
        setAttachedPdfSize('');
        setAttachedPdfUrl('');
        await refreshSession();
      }
    } catch (err) {
      console.error('Error creating question:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedThread || (!replyText.trim() && !replyPdfUrl)) return;

    const cuerpoFinal = replyPdfUrl
      ? `${replyText.trim() || 'Documento adjunto'}\n\n📎 [PDF Adjunto: ${replyPdfName || 'documento.pdf'}](${replyPdfUrl})`
      : replyText.trim();

    try {
      const res = await fetch(`/api/communications/conversations/${selectedThread.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cuerpo: cuerpoFinal }),
      });

      if (res.ok) {
        setReplyText('');
        setReplyPdfName('');
        setReplyPdfSize('');
        setReplyPdfUrl('');
        setShowReplyPdfUploader(false);

        // Reload messages for active thread
        const msgsRes = await fetch(`/api/communications/conversations/${selectedThread.id}/messages`);
        if (msgsRes.ok) {
          const msgs = await msgsRes.json();
          setThreadMessages(msgs);
        }
        await refreshSession();
      }
    } catch (err) {
      console.error('Error sending reply:', err);
    }
  };

  const handleStatusChange = async (newStatus: 'ABIERTA' | 'RESUELTA' | 'CERRADA') => {
    if (!selectedThread) return;
    try {
      const res = await fetch(`/api/communications/conversations/${selectedThread.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: newStatus }),
      });
      if (res.ok) {
        setSelectedThread((prev) => (prev ? { ...prev, estado: newStatus === 'RESUELTA' ? 'RESPONDIDA' : newStatus === 'CERRADA' ? 'CERRADA' : 'PENDIENTE' } : null));
        await refreshSession();
      }
    } catch (err) {
      console.error('Error changing conversation status:', err);
    }
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
            className="flex items-center gap-2 px-5 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-red-950/40 transition-all shrink-0 active:scale-95"
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
          <div className="flex items-center justify-between text-xs font-bold text-zinc-400 uppercase tracking-wider">
            <span>Conversaciones ({userThreads.length})</span>
            {currentUser.role === 'PROFESOR' && (
              <span className="text-[10px] text-zinc-500 font-normal normal-case">Tus alumnos asignados</span>
            )}
          </div>

          {userThreads.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center text-xs text-zinc-500 space-y-2">
              <MessageSquare className="w-10 h-10 mx-auto text-zinc-700 opacity-50" />
              <p>No tienes ninguna consulta académica abierta.</p>
              {currentUser.role === 'ALUMNO' && (
                <button
                  onClick={() => setShowNewModal(true)}
                  className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 rounded-lg text-[11px] font-bold transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Crear mi primera consulta
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1">
              {userThreads.map((thread) => {
                const isSelected = selectedThread?.id === thread.id;
                const lastMsg = thread.mensajes[thread.mensajes.length - 1];

                return (
                  <div
                    key={thread.id}
                    onClick={() => setSelectedThread(thread)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-zinc-900 border-red-500 shadow-xl ring-1 ring-red-500/30'
                        : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] mb-1.5 gap-2">
                      <span className="text-red-400 font-bold truncate">
                        {thread.cursoNombre}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                          thread.estado === 'RESPONDIDA'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : thread.estado === 'CERRADA'
                            ? 'bg-zinc-800 text-zinc-400'
                            : 'bg-amber-950 text-amber-400 border border-amber-800'
                        }`}
                      >
                        {thread.estado === 'RESPONDIDA' ? 'Respondida' : thread.estado === 'CERRADA' ? 'Cerrada' : 'Pendiente'}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-white mb-1 line-clamp-1">{thread.asunto}</h4>
                    <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                      {lastMsg?.texto || thread.asunto}
                    </p>

                    <div className="mt-3 flex items-center justify-between text-[10px] text-zinc-500 pt-2 border-t border-zinc-800/60">
                      <div className="flex items-center gap-1.5 truncate">
                        <GraduationCap className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span className="truncate">
                          {currentUser.role === 'ALUMNO'
                            ? `Prof: ${thread.profesorNombre || 'Por asignar'}`
                            : `Alumno: ${thread.estudianteNombre}`}
                        </span>
                      </div>
                      <span className="shrink-0 text-zinc-500">
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
        <div className="lg:col-span-7 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 sm:p-6 flex flex-col h-[620px]">
          {selectedThread ? (
            <>
              {/* Thread Header */}
              <div className="pb-4 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] text-red-400 font-bold uppercase tracking-wider">
                      {selectedThread.cursoNombre}
                    </span>
                    {selectedThread.grupoNombre && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 font-medium">
                        {selectedThread.grupoNombre}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-extrabold text-white mt-1">
                    {selectedThread.asunto}
                  </h3>

                  <div className="flex items-center gap-3 text-[11px] text-zinc-400 mt-1 flex-wrap">
                    <span>
                      Estudiante: <strong className="text-zinc-200">{selectedThread.estudianteNombre}</strong>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <GraduationCap className="w-3.5 h-3.5 text-red-400" />
                      Docente: <strong className="text-zinc-200">{selectedThread.profesorNombre || 'Jefatura de Estudios'}</strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      selectedThread.estado === 'RESPONDIDA'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : selectedThread.estado === 'CERRADA'
                        ? 'bg-zinc-800 text-zinc-400'
                        : 'bg-amber-950 text-amber-400 border border-amber-800'
                    }`}
                  >
                    {selectedThread.estado === 'RESPONDIDA' ? 'Respondida' : selectedThread.estado === 'CERRADA' ? 'Cerrada' : 'Pendiente'}
                  </span>

                  {(currentUser.role === 'PROFESOR' || currentUser.role === 'ADMINISTRACION') && (
                    <button
                      onClick={() =>
                        handleStatusChange(
                          selectedThread.estado === 'RESPONDIDA' ? 'ABIERTA' : 'RESUELTA'
                        )
                      }
                      title={
                        selectedThread.estado === 'RESPONDIDA'
                          ? 'Reabrir consulta'
                          : 'Marcar como resuelta'
                      }
                      className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors text-xs flex items-center gap-1"
                    >
                      {selectedThread.estado === 'RESPONDIDA' ? (
                        <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Thread Messages List */}
              <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
                {isLoadingMessages ? (
                  <div className="flex items-center justify-center h-full text-xs text-zinc-500 gap-2">
                    <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                    Cargando mensajes...
                  </div>
                ) : threadMessages.length > 0 ? (
                  threadMessages.map((msg) => {
                    const isMe = msg.remitente_id === currentUser.id;
                    const isTeacher = msg.remitente_rol === 'PROFESOR';

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-lg p-4 rounded-2xl text-xs space-y-1.5 shadow-md ${
                            isMe
                              ? 'bg-red-600 text-white rounded-br-none'
                              : isTeacher
                              ? 'bg-zinc-950 border-2 border-red-500/40 text-zinc-200 rounded-bl-none'
                              : 'bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-bl-none'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] opacity-90 gap-3 font-semibold border-b border-white/10 pb-1 mb-1">
                            <span className="flex items-center gap-1">
                              {isTeacher && <GraduationCap className="w-3.5 h-3.5 text-amber-400" />}
                              {msg.remitente_nombre}
                              {isTeacher && (
                                <span className="ml-1 px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold">
                                  Profesor
                                </span>
                              )}
                            </span>
                            <span>
                              {new Date(msg.creado_en).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="leading-relaxed whitespace-pre-wrap">{msg.cuerpo}</p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  // Fallback to locally loaded thread message if API messages are still syncing
                  selectedThread.mensajes.map((msg) => {
                    const isMe = msg.autorId === currentUser.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-lg p-4 rounded-2xl text-xs space-y-1.5 shadow-md ${
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
                  })
                )}
              </div>

              {/* Reply Input */}
              <form
                onSubmit={handleSendReply}
                className="pt-3 border-t border-zinc-800 flex flex-col gap-2"
              >
                {showReplyPdfUploader && (
                  <div className="mb-2">
                    <PdfFileUploader
                      label="Adjuntar archivo PDF a tu respuesta"
                      selectedFileName={replyPdfName}
                      selectedFileSize={replyPdfSize}
                      onFileSelected={({ name, sizeStr, url }) => {
                        setReplyPdfName(name);
                        setReplyPdfSize(sizeStr);
                        setReplyPdfUrl(url);
                      }}
                      onFileRemoved={() => {
                        setReplyPdfName('');
                        setReplyPdfSize('');
                        setReplyPdfUrl('');
                      }}
                    />
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowReplyPdfUploader(!showReplyPdfUploader)}
                    title="Adjuntar PDF"
                    className={`p-3 rounded-xl border transition-colors ${
                      replyPdfUrl
                        ? 'bg-red-600/20 border-red-500 text-red-400'
                        : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-400'
                    }`}
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>

                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={
                      currentUser.role === 'PROFESOR'
                        ? 'Escribe tu respuesta al alumno...'
                        : 'Escribe tu réplica al profesor...'
                    }
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                  />

                  <button
                    type="submit"
                    className="px-5 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 shrink-0"
                  >
                    <Send className="w-4 h-4" />
                    <span>Enviar</span>
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="m-auto text-center space-y-3 text-zinc-500">
              <MessageSquare className="w-12 h-12 mx-auto text-zinc-700 opacity-60" />
              <div className="text-xs">Selecciona una consulta de la lista para ver el diálogo completo.</div>
            </div>
          )}
        </div>
      </div>

      {/* New Question Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full max-h-[88vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800 shrink-0 bg-zinc-900">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-600/20 text-red-500 flex items-center justify-center font-bold">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white font-heading">
                    Plantear Nueva Consulta Académica
                  </h3>
                  <p className="text-[10px] text-zinc-400">Atención directa con tu docente asignado</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="w-7 h-7 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center text-xs font-bold transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Form Scrollable Body */}
            <form onSubmit={handleCreateQuestion} className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3.5 text-xs">
                {/* Curso Selector & Info */}
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1 flex items-center gap-1.5 text-[11px]">
                    <BookOpen className="w-3.5 h-3.5 text-red-400" />
                    Curso y Especialidad
                  </label>

                  {enrolledList.length > 1 ? (
                    <select
                      required
                      value={selectedEnrollmentId}
                      onChange={(e) => setSelectedEnrollmentId(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-red-500 font-medium"
                    >
                      {enrolledList.map((enr) => (
                        <option key={enr.matricula_id} value={enr.matricula_id}>
                          {enr.especialidad_codigo ? `${enr.especialidad_codigo} - ` : ''}
                          {enr.especialidad_nombre} ({enr.grupo_nombre})
                        </option>
                      ))}
                    </select>
                  ) : enrolledList.length === 1 ? (
                    <div className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-white leading-tight">
                          {currentSelectedEnr?.especialidad_codigo
                            ? `${currentSelectedEnr.especialidad_codigo} - `
                            : ''}
                          {currentSelectedEnr?.especialidad_nombre}
                        </div>
                        <div className="text-[10px] text-zinc-400 mt-0.5">
                          Grupo: <strong className="text-zinc-300">{currentSelectedEnr?.grupo_nombre}</strong>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 shrink-0">
                        Matrícula Activa
                      </span>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-zinc-950 border border-amber-800/40 rounded-xl text-amber-300 text-[11px] flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                      <span>No se ha detectado matrícula activa. La consulta se enviará a Secretaría Docente.</span>
                    </div>
                  )}
                </div>

                {/* Assigned Professor Card */}
                <div className="p-2.5 bg-zinc-950/80 border border-zinc-800/80 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500 font-bold shrink-0">
                        <GraduationCap className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
                          Profesor Asignado
                        </div>
                        <div className="text-xs font-bold text-white">
                          {currentSelectedEnr?.profesor_nombre || 'Docente por asignar (Secretaría Académica)'}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-bold shrink-0 ${
                        currentSelectedEnr?.profesor_nombre
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {currentSelectedEnr?.profesor_nombre ? 'Docente de tu grupo' : 'Jefatura de Estudios'}
                    </span>
                  </div>
                  <p className="text-[9px] text-zinc-400 italic">
                    🔒 Esta duda se dirigirá de forma privada y exclusiva al docente de tu grupo.
                  </p>
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1 text-[11px]">
                    Módulo o Unidad (Opcional)
                  </label>
                  <input
                    type="text"
                    value={moduloUnidad}
                    onChange={(e) => setModuloUnidad(e.target.value)}
                    placeholder="Ej. Módulo 1 / Unidad 2: Sistemas de Alta Tensión"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1 text-[11px]">Asunto</label>
                  <input
                    type="text"
                    required
                    value={asunto}
                    onChange={(e) => setAsunto(e.target.value)}
                    placeholder="Ej. Duda sobre el esquema del inversor trifásico"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1 text-[11px]">Mensaje explicativo</label>
                  <textarea
                    required
                    rows={3}
                    value={mensaje}
                    onChange={(e) => setMensaje(e.target.value)}
                    placeholder="Describe con detalle tu duda para que tu profesor pueda ayudarte con precisión..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 resize-none leading-relaxed"
                  />
                </div>

                <PdfFileUploader
                  label="Adjuntar documento PDF (Opcional - Esquemas, ejercicios, capturas)"
                  selectedFileName={attachedPdfName}
                  selectedFileSize={attachedPdfSize}
                  onFileSelected={({ name, sizeStr, url }) => {
                    setAttachedPdfName(name);
                    setAttachedPdfSize(sizeStr);
                    setAttachedPdfUrl(url);
                  }}
                  onFileRemoved={() => {
                    setAttachedPdfName('');
                    setAttachedPdfSize('');
                    setAttachedPdfUrl('');
                  }}
                />
              </div>

              {/* Modal Fixed Footer with Action Buttons */}
              <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-900 flex justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-bold transition-all text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl font-bold transition-all shadow-lg shadow-red-950/40 flex items-center gap-2 text-xs"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Enviando...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Enviar Duda al Profesor</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
