import React, { useState } from 'react';
import { useCampus } from '../../context/CampusContext';
import { FileText, Plus, Send, Clock, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { SecretaryRequest, SecretaryType } from '../../types/campus';

export const CampusSecretary: React.FC = () => {
  const { currentUser, secretaryRequests, addSecretaryRequest, addSecretaryMessage } = useCampus();

  const [selectedRequest, setSelectedRequest] = useState<SecretaryRequest | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [tipo, setTipo] = useState<SecretaryType>('Solicitud de certificado');
  const [asunto, setAsunto] = useState('');
  const [descripcion, setDescripcion] = useState('');

  // Reply message
  const [replyText, setReplyText] = useState('');

  if (!currentUser) return null;

  const userRequests =
    currentUser.role === 'ALUMNO'
      ? secretaryRequests.filter((r) => r.estudianteId === currentUser.id)
      : secretaryRequests; // Admin sees all

  const handleCreateRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!asunto || !descripcion) return;

    addSecretaryRequest({
      estudianteId: currentUser.id,
      estudianteNombre: `${currentUser.nombre} ${currentUser.apellidos}`,
      tipo,
      asunto,
      descripcion,
      referencia: `SEC-${Math.floor(1000 + Math.random() * 9000)}`,
      estado: 'PENDIENTE',
      mensajes: [
        {
          id: `sec_msg_${Date.now()}`,
          autorId: currentUser.id,
          autorNombre: `${currentUser.nombre} ${currentUser.apellidos}`,
          autorRol: currentUser.role,
          texto: descripcion,
          fechaHora: new Date().toISOString(),
        },
      ],
    });

    setShowModal(false);
    setAsunto('');
    setDescripcion('');
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest || !replyText.trim()) return;

    addSecretaryMessage(selectedRequest.id, {
      autorId: currentUser.id,
      autorNombre: `${currentUser.nombre} ${currentUser.apellidos}`,
      autorRol: currentUser.role,
      texto: replyText.trim(),
      fechaHora: new Date().toISOString(),
    });

    setReplyText('');
    const updated = secretaryRequests.find((r) => r.id === selectedRequest.id);
    if (updated) setSelectedRequest(updated);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-heading flex items-center gap-3">
            <FileText className="w-7 h-7 text-red-500" />
            Secretaría Online
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Tramita certificados, justificantes, actualización de expediente e incidencias administrativas.
          </p>
        </div>

        {currentUser.role === 'ALUMNO' && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-5 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-red-950/40 transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            Nueva Solicitud
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Request List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
            Historial de Solicitudes ({userRequests.length})
          </div>

          {userRequests.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center text-xs text-zinc-500">
              No tienes ninguna solicitud en trámite.
            </div>
          ) : (
            <div className="space-y-3">
              {userRequests.map((req) => {
                const isSelected = selectedRequest?.id === req.id;
                return (
                  <div
                    key={req.id}
                    onClick={() => setSelectedRequest(req)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-zinc-900 border-red-500 shadow-xl'
                        : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-zinc-500 font-mono">{req.referencia}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
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

                    <div className="text-[11px] text-red-400 font-bold uppercase">{req.tipo}</div>
                    <h4 className="text-xs font-bold text-white mt-0.5">{req.asunto}</h4>

                    <div className="mt-3 flex items-center justify-between text-[10px] text-zinc-500 pt-2 border-t border-zinc-800/60">
                      <span>Última act: {new Date(req.fechaUltimaActualizacion).toLocaleDateString('es-ES')}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Request Details & Messages */}
        <div className="lg:col-span-7 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 sm:p-6 flex flex-col h-[600px]">
          {selectedRequest ? (
            <>
              <div className="pb-4 border-b border-zinc-800 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-red-400 font-bold uppercase">
                    {selectedRequest.referencia} • {selectedRequest.tipo}
                  </div>
                  <h3 className="text-base font-extrabold text-white mt-0.5">
                    {selectedRequest.asunto}
                  </h3>
                  <div className="text-[11px] text-zinc-400 mt-1">
                    Solicitante:{' '}
                    <strong className="text-zinc-200">{selectedRequest.estudianteNombre}</strong>
                  </div>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    selectedRequest.estado === 'RESUELTA'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : 'bg-amber-950 text-amber-400 border border-amber-800'
                  }`}
                >
                  {selectedRequest.estado}
                </span>
              </div>

              {/* Messages Thread */}
              <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
                {selectedRequest.mensajes.map((msg) => {
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
                          <span>{msg.autorNombre} ({msg.autorRol})</span>
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

              {/* Reply Form */}
              <form
                onSubmit={handleSendReply}
                className="pt-4 border-t border-zinc-800 flex items-center gap-3"
              >
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Escribe un mensaje..."
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                />
                <button
                  type="submit"
                  className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="m-auto text-center space-y-3 text-zinc-500">
              <FileText className="w-12 h-12 mx-auto text-zinc-700" />
              <div className="text-xs">Selecciona una solicitud para ver los detalles y estado del trámite.</div>
            </div>
          )}
        </div>
      </div>

      {/* New Request Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <h3 className="text-lg font-bold text-white font-heading">Nueva Solicitud Administrativa</h3>

            <form onSubmit={handleCreateRequest} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Tipo de Solicitud</label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as SecretaryType)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-red-500"
                >
                  <option value="Solicitud de certificado">Solicitud de certificado</option>
                  <option value="Solicitud de justificante">Solicitud de justificante</option>
                  <option value="Entrega de documentación">Entrega de documentación</option>
                  <option value="Actualización de datos">Actualización de datos</option>
                  <option value="Incidencia administrativa">Incidencia administrativa</option>
                  <option value="Consulta administrativa">Consulta administrativa</option>
                  <option value="Otra solicitud">Otra solicitud</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Asunto</label>
                <input
                  type="text"
                  required
                  value={asunto}
                  onChange={(e) => setAsunto(e.target.value)}
                  placeholder="Título breve del trámite"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Descripción detallada</label>
                <textarea
                  required
                  rows={4}
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Detalla las especificaciones de tu solicitud..."
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
                  Registrar Solicitud
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
