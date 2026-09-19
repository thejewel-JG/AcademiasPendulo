import React, { useState } from 'react';
import { useCampus } from '../../context/CampusContext';
import {
  Inbox,
  Mail,
  Send,
  User,
  BookOpen,
  FileText,
  Clock,
  CheckCircle2,
  RefreshCw,
  Search,
  ChevronRight,
  Shield,
  Tag,
  Paperclip,
} from 'lucide-react';
import { EmailThread } from '../../types/campus';

export const CampusAdminInbox: React.FC = () => {
  const { currentUser, emailThreads, sendEmailReply, contactRequests, users, courses } = useCampus();

  const [selectedThreadId, setSelectedThreadId] = useState<string | null>('th-1');
  const [filterFolder, setFilterFolder] = useState<'ENTRADA' | 'PENDIENTE' | 'RESPONDIDO' | 'ARCHIVADO'>('ENTRADA');
  const [replyText, setReplyText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  if (!currentUser || currentUser.role !== 'ADMINISTRACION') {
    return (
      <div className="p-8 text-center text-white space-y-4">
        <Shield className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold">Acceso Restringido</h2>
        <p className="text-xs text-zinc-400">
          La bandeja de correo oficial está reservada exclusivamente a la administración.
        </p>
      </div>
    );
  }

  const selectedThread = emailThreads.find((t) => t.id === selectedThreadId);

  // Filter threads
  const filteredThreads = emailThreads.filter((t) => {
    const matchesSearch =
      !searchQuery ||
      t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.sender_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.sender_email.toLowerCase().includes(searchQuery.toLowerCase());

    if (filterFolder === 'PENDIENTE') return matchesSearch && t.status === 'PENDIENTE';
    if (filterFolder === 'RESPONDIDO') return matchesSearch && t.status === 'RESPONDIDO';
    if (filterFolder === 'ARCHIVADO') return matchesSearch && t.status === 'ARCHIVADO';
    return matchesSearch;
  });

  const pendingCount = emailThreads.filter((t) => t.status === 'PENDIENTE').length;

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedThreadId || !replyText.trim()) return;

    sendEmailReply(selectedThreadId, replyText.trim());
    setReplyText('');
  };

  // Identify related lead or student by email matching
  const findRelatedLead = (email: string) => {
    return contactRequests.find((r) => r.email.toLowerCase() === email.toLowerCase());
  };

  const findRelatedStudent = (email: string) => {
    return users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-zinc-900 via-zinc-900 to-red-950/40 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/20 border border-red-500/30 text-red-400 text-xs font-semibold mb-2">
            <Mail className="w-3.5 h-3.5" />
            Correo Oficial info@academiaspendulo.com
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-heading">
            Bandeja de Correo Electrónico
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Gestión de mensajes oficiales, respuestas integradas y vinculación directa con solicitudes de alumnos.
          </p>
        </div>

        <div className="bg-zinc-950/90 border border-zinc-800 p-4 rounded-2xl shrink-0 flex items-center gap-4 shadow-xl">
          <div className="w-12 h-12 rounded-xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-extrabold text-xl">
            {pendingCount}
          </div>
          <div>
            <div className="text-xs font-bold text-white uppercase tracking-wider font-heading">
              Correos Pendientes
            </div>
            <div className="text-[11px] text-zinc-400">Requieren respuesta oficial</div>
          </div>
        </div>
      </div>

      {/* Folders & Search Bar */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Folder Pills */}
        <div className="flex items-center gap-2 text-xs font-bold w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilterFolder('ENTRADA')}
            className={`px-3 py-2 rounded-xl transition-all ${
              filterFolder === 'ENTRADA' ? 'bg-red-600 text-white font-extrabold' : 'bg-zinc-950 text-zinc-400 hover:text-white'
            }`}
          >
            Entrada ({emailThreads.length})
          </button>
          <button
            onClick={() => setFilterFolder('PENDIENTE')}
            className={`px-3 py-2 rounded-xl transition-all ${
              filterFolder === 'PENDIENTE' ? 'bg-amber-600 text-white font-extrabold' : 'bg-zinc-950 text-zinc-400 hover:text-white'
            }`}
          >
            Pendientes ({pendingCount})
          </button>
          <button
            onClick={() => setFilterFolder('RESPONDIDO')}
            className={`px-3 py-2 rounded-xl transition-all ${
              filterFolder === 'RESPONDIDO' ? 'bg-emerald-600 text-white font-extrabold' : 'bg-zinc-950 text-zinc-400 hover:text-white'
            }`}
          >
            Respondidos
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por asunto, remitente..."
            className="w-full pl-9 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
          />
        </div>
      </div>

      {/* Main Mail Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Thread List */}
        <div className="lg:col-span-5 space-y-3">
          {filteredThreads.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center text-xs text-zinc-500">
              No hay mensajes en esta carpeta.
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredThreads.map((thread) => {
                const isSelected = selectedThreadId === thread.id;
                const lastMsg = thread.messages[thread.messages.length - 1];

                return (
                  <div
                    key={thread.id}
                    onClick={() => setSelectedThreadId(thread.id)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-zinc-900 border-red-500 shadow-xl'
                        : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-extrabold text-white truncate max-w-[180px]">
                        {thread.sender_name}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          thread.status === 'RESPONDIDO'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : 'bg-amber-950 text-amber-400 border border-amber-800'
                        }`}
                      >
                        {thread.status}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-red-400 truncate">{thread.subject}</h4>
                    <p className="text-[11px] text-zinc-400 line-clamp-2 mt-1">
                      {lastMsg?.body}
                    </p>

                    <div className="mt-3 flex items-center justify-between text-[10px] text-zinc-500 pt-2 border-t border-zinc-800/60">
                      <span>{thread.sender_email}</span>
                      <span>
                        {new Date(thread.last_message_at).toLocaleDateString('es-ES', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Reading Pane and Reply Editor */}
        <div className="lg:col-span-7 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 sm:p-6 flex flex-col h-[700px]">
          {selectedThread ? (
            <>
              {/* Mail Reader Header */}
              <div className="pb-4 border-b border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-zinc-500 font-mono">
                    ID Hilo: {selectedThread.external_thread_id}
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      selectedThread.status === 'RESPONDIDO'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : 'bg-amber-950 text-amber-400 border border-amber-800'
                    }`}
                  >
                    {selectedThread.status}
                  </span>
                </div>

                <h2 className="text-lg font-extrabold text-white font-heading">
                  {selectedThread.subject}
                </h2>

                <div className="text-xs text-zinc-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-zinc-950 p-3 rounded-xl border border-zinc-800/80">
                  <div>
                    Remitente: <strong className="text-white">{selectedThread.sender_name}</strong>{' '}
                    &lt;{selectedThread.sender_email}&gt;
                  </div>
                  <div className="text-zinc-500 text-[11px]">
                    {new Date(selectedThread.last_message_at).toLocaleString('es-ES')}
                  </div>
                </div>

                {/* Related Lead Match Notice */}
                {(() => {
                  const lead = findRelatedLead(selectedThread.sender_email);
                  const student = findRelatedStudent(selectedThread.sender_email);
                  if (!lead && !student) return null;

                  return (
                    <div className="bg-red-950/40 border border-red-900/60 p-3 rounded-xl text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-red-400" />
                        <span>
                          Contacto relacionado encontrado:{' '}
                          <strong className="text-white">
                            {lead ? `${lead.first_name} ${lead.last_name} (${lead.course_code})` : `${student?.nombre} ${student?.apellidos} (Alumno)`}
                          </strong>
                        </span>
                      </div>
                      <span className="text-[10px] bg-red-600 text-white font-bold px-2 py-0.5 rounded uppercase">
                        Vinculado
                      </span>
                    </div>
                  );
                })()}
              </div>

              {/* Message History Thread */}
              <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
                {selectedThread.messages.map((msg) => {
                  const isInbound = msg.direction === 'inbound';
                  return (
                    <div key={msg.id} className="space-y-2">
                      <div
                        className={`p-4 rounded-2xl text-xs space-y-2 border ${
                          isInbound
                            ? 'bg-zinc-950 border-zinc-800 text-zinc-200'
                            : 'bg-red-950/50 border-red-900/60 text-white ml-6'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] text-zinc-400 font-semibold border-b border-zinc-800/60 pb-2">
                          <span>
                            {msg.sender_name} &lt;{msg.sender_email}&gt;
                          </span>
                          <span>{new Date(msg.received_at).toLocaleString('es-ES')}</span>
                        </div>
                        <p className="leading-relaxed whitespace-pre-wrap">{msg.body}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Outbound Reply Editor */}
              <form onSubmit={handleSendReply} className="pt-4 border-t border-zinc-800 space-y-3">
                <div className="text-xs font-bold text-zinc-300">
                  Responder desde info@academiaspendulo.com
                </div>
                <textarea
                  rows={3}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Escribe tu respuesta oficial..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-red-500 resize-none"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-extrabold shadow-md uppercase tracking-wider"
                  >
                    <Send className="w-4 h-4" /> Enviar Respuesta Oficial
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="m-auto text-center space-y-3 text-zinc-500">
              <Mail className="w-12 h-12 mx-auto text-zinc-700" />
              <div className="text-xs">Selecciona un correo de la lista para leer y responder.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
