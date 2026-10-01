import React, { useState, useEffect } from 'react';
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
  Settings,
  AlertTriangle,
  Download,
  Plus,
  Users,
  Lock
} from 'lucide-react';

interface MailAccount {
  id: string;
  buzon: string;
  proveedor: string;
  estado: 'ACTIVA' | 'INACTIVA' | 'ERROR';
  imap_host: string;
  imap_port: number;
  imap_tls: boolean;
  smtp_host: string;
  smtp_port: number;
  smtp_tls: boolean;
  sync_interval_minutes: number;
  sync_start_date: string | null;
  max_msg_size_mb: number;
  max_attachment_size_mb: number;
  ultima_sincronizacion: string | null;
  ultimo_error: string | null;
}

interface MailAttachment {
  archivo_id: string;
  nombre_original: string;
  mime_type: string;
  tamano_bytes: number;
}

interface MailMessage {
  id: string;
  message_id: string;
  in_reply_to: string | null;
  references_header: string | null;
  sender_name: string;
  sender_email: string;
  recipients: string[];
  subject: string;
  body_text: string;
  body_html: string;
  received_at: string;
  direction: 'inbound' | 'outbound';
  attachments: MailAttachment[];
}

interface Thread {
  id: string;
  cuenta_id: string;
  cuenta_buzon: string;
  external_thread_id: string;
  subject: string;
  sender_name: string;
  sender_email: string;
  status: 'PENDIENTE' | 'RESPONDIDO' | 'ARCHIVADO';
  last_message_at: string;
  messages: MailMessage[];
}

export const CampusAdminInbox: React.FC = () => {
  const { currentUser, contactRequests, users, courses } = useCampus();

  const [accounts, setAccounts] = useState<MailAccount[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [filterFolder, setFilterFolder] = useState<'ENTRADA' | 'PENDIENTE' | 'RESPONDIDO' | 'ARCHIVADO'>('ENTRADA');
  const [replyText, setReplyText] = useState('');
  const [replyAll, setReplyAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Config Modal State
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configBuzon, setConfigBuzon] = useState('info@academiaspendulo.com');
  const [configProveedor, setConfigProveedor] = useState('Hostinger IMAP/SMTP');
  const [configPassword, setConfigPassword] = useState('');
  const [configImapHost, setConfigImapHost] = useState('mail.hostinger.com');
  const [configImapPort, setConfigImapPort] = useState('993');
  const [configSmtpHost, setConfigSmtpHost] = useState('smtp.hostinger.com');
  const [configSmtpPort, setConfigSmtpPort] = useState('465');
  const [configSyncInterval, setConfigSyncInterval] = useState('5');
  const [configSyncStartDate, setConfigSyncStartDate] = useState('');
  const [configSaving, setConfigSaving] = useState(false);

  // Convert Lead Modal State
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [leadName, setLeadName] = useState('');
  const [leadLastName, setLeadLastName] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadSpecialtyId, setLeadSpecialtyId] = useState('');
  const [leadSaving, setLeadSaving] = useState(false);

  // Fetch Accounts and Threads from Backend API
  const loadMailData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const [accRes, thRes] = await Promise.all([
        fetch('/api/admin/mail/accounts'),
        fetch(`/api/admin/mail/threads?folder=${filterFolder}&search=${encodeURIComponent(searchQuery)}`)
      ]);

      if (accRes.ok) {
        const accData = await accRes.json();
        setAccounts(accData);
        if (accData.length > 0 && !configBuzon) {
          setConfigBuzon(accData[0].buzon);
        }
      }

      if (thRes.ok) {
        const thData = await thRes.json();
        setThreads(thData);
        if (thData.length > 0 && !selectedThreadId) {
          setSelectedThreadId(thData[0].id);
        }
      }
    } catch (err: any) {
      console.error('Error fetching mail data:', err);
      setErrorMsg('No se pudo conectar con la bandeja de correo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.role === 'ADMINISTRACION') {
      loadMailData();
    }
  }, [filterFolder, searchQuery]);

  // Handle Manual Sync Trigger
  const handleTriggerSync = async () => {
    try {
      setSyncing(true);
      const res = await fetch('/api/admin/mail/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      const data = await res.json();
      if (res.ok) {
        await loadMailData();
      } else {
        alert(data.error || 'Error al sincronizar buzón');
      }
    } catch (err) {
      alert('Error de conexión al sincronizar');
    } finally {
      setSyncing(false);
    }
  };

  // Handle Saving Account Settings
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configBuzon) return alert('Ingresa la dirección del buzón.');

    try {
      setConfigSaving(true);
      const res = await fetch('/api/admin/mail/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buzon: configBuzon,
          proveedor: configProveedor,
          password: configPassword,
          imap_host: configImapHost,
          imap_port: configImapPort,
          imap_tls: true,
          smtp_host: configSmtpHost,
          smtp_port: configSmtpPort,
          smtp_tls: true,
          sync_interval_minutes: configSyncInterval,
          sync_start_date: configSyncStartDate || null
        })
      });

      const data = await res.json();
      if (res.ok) {
        alert('Configuración de buzón guardada con éxito.');
        setShowConfigModal(false);
        setConfigPassword('');
        await loadMailData();
      } else {
        alert(data.error || 'Error al guardar la configuración');
      }
    } catch (err) {
      alert('Error al conectar con el servidor.');
    } finally {
      setConfigSaving(false);
    }
  };

  // Handle Sending Outbound Reply
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedThread || !replyText.trim()) return;

    const lastMsg = selectedThread.messages[selectedThread.messages.length - 1];

    // Determine recipients
    let recipientsList = [selectedThread.sender_email];
    if (replyAll && lastMsg.recipients && lastMsg.recipients.length > 0) {
      const activeAccount = accounts[0]?.buzon || 'info@academiaspendulo.com';
      const allRecs = Array.from(new Set([selectedThread.sender_email, ...lastMsg.recipients]));
      recipientsList = allRecs.filter(r => r.toLowerCase() !== activeAccount.toLowerCase());
      if (recipientsList.length === 0) recipientsList = [selectedThread.sender_email];
    }

    try {
      const res = await fetch('/api/admin/mail/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cuentaId: selectedThread.cuenta_id,
          hiloId: selectedThread.id,
          destinatarios: recipientsList,
          asunto: selectedThread.subject.startsWith('Re:') ? selectedThread.subject : `Re: ${selectedThread.subject}`,
          cuerpoTexto: replyText.trim(),
          cuerpoHtml: `<p>${replyText.trim().replace(/\n/g, '<br>')}</p>`,
          inReplyTo: lastMsg.message_id || null,
          referencesHeader: lastMsg.references_header || lastMsg.message_id || null
        })
      });

      const data = await res.json();
      if (res.ok) {
        setReplyText('');
        alert('Respuesta oficial encolada para envío.');
        await loadMailData();
      } else {
        alert(data.error || 'Error al enviar respuesta');
      }
    } catch (err) {
      alert('Error de conexión al enviar respuesta');
    }
  };

  // Handle Converting Email Sender to Lead
  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadEmail || !leadName) return;

    try {
      setLeadSaving(true);
      const res = await fetch('/api/admin/mail/leads/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: leadEmail,
          nombre: leadName,
          apellidos: leadLastName,
          especialidad_id: leadSpecialtyId || null
        })
      });

      const data = await res.json();
      if (res.ok) {
        alert('Solicitud de preinscripción creada con éxito.');
        setShowLeadModal(false);
      } else {
        alert(data.error || 'Error al crear la ficha de solicitud');
      }
    } catch (err) {
      alert('Error al conectar con el servidor.');
    } finally {
      setLeadSaving(false);
    }
  };

  // Open Lead Modal with preset sender info
  const openLeadModalForSender = (email: string, name: string) => {
    const parts = name.split(' ');
    setLeadEmail(email);
    setLeadName(parts[0] || name);
    setLeadLastName(parts.slice(1).join(' ') || '');
    setShowLeadModal(true);
  };

  // Security authorization check: ONLY ADMINISTRADOR allowed
  if (!currentUser || currentUser.role !== 'ADMINISTRACION') {
    return (
      <div className="p-8 text-center text-white space-y-4 max-w-md mx-auto my-12 bg-zinc-900 border border-zinc-800 rounded-3xl">
        <Shield className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold font-heading">Acceso Restringido</h2>
        <p className="text-xs text-zinc-400">
          La bandeja de correo corporativo de Secretaría está reservada exclusivamente al perfil Administrador.
        </p>
      </div>
    );
  }

  const selectedThread = threads.find((t) => t.id === selectedThreadId);
  const activeAccount = accounts[0];
  const pendingCount = threads.filter((t) => t.status === 'PENDIENTE').length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-zinc-900 via-zinc-900 to-red-950/40 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/20 border border-red-500/30 text-red-400 text-xs font-semibold mb-2">
            <Mail className="w-3.5 h-3.5" />
            Buzón Corporativo Oficial {activeAccount ? activeAccount.buzon : 'Secretaría'}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-heading">
            Bandeja de Correo Electrónico
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Recepción por IMAP, cola de envío SMTP segura y gestión administrativa oficial.
          </p>
          <div className="text-[11px] text-zinc-500 mt-2 flex items-center gap-3">
            <span>
              Comprobación: <strong>Cada {activeAccount?.sync_interval_minutes || 5} minutos</strong>
            </span>
            <span>•</span>
            <span>
              Última sinc.: {activeAccount?.ultima_sincronizacion ? new Date(activeAccount.ultima_sincronizacion).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : 'Pendiente'}
            </span>
            {activeAccount?.ultimo_error && (
              <span className="text-red-400 font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Error de conexión
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleTriggerSync}
            disabled={syncing}
            className="px-4 py-2.5 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-white rounded-2xl text-xs font-bold flex items-center gap-2 transition-all shadow-md disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin text-red-400' : 'text-zinc-400'}`} />
            {syncing ? 'Sincronizando...' : 'Sincronizar ahora'}
          </button>

          <button
            onClick={() => setShowConfigModal(true)}
            className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-xs font-extrabold flex items-center gap-2 transition-all shadow-md"
          >
            <Settings className="w-4 h-4" /> Configurar Buzón
          </button>
        </div>
      </div>

      {/* Folders & Search Bar */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Folder Pills */}
        <div className="flex items-center gap-2 text-xs font-bold w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilterFolder('ENTRADA')}
            className={`px-3.5 py-2 rounded-xl transition-all ${
              filterFolder === 'ENTRADA' ? 'bg-red-600 text-white font-extrabold' : 'bg-zinc-950 text-zinc-400 hover:text-white'
            }`}
          >
            Todos los Mensajes ({threads.length})
          </button>
          <button
            onClick={() => setFilterFolder('PENDIENTE')}
            className={`px-3.5 py-2 rounded-xl transition-all ${
              filterFolder === 'PENDIENTE' ? 'bg-amber-600 text-white font-extrabold' : 'bg-zinc-950 text-zinc-400 hover:text-white'
            }`}
          >
            Pendientes ({pendingCount})
          </button>
          <button
            onClick={() => setFilterFolder('RESPONDIDO')}
            className={`px-3.5 py-2 rounded-xl transition-all ${
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
          {loading ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center text-xs text-zinc-500 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-red-500" /> Cargando mensajes del servidor...
            </div>
          ) : threads.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center text-xs text-zinc-500 space-y-3">
              <Mail className="w-8 h-8 text-zinc-700 mx-auto" />
              <div>No hay mensajes en este buzón.</div>
              {!activeAccount && (
                <button
                  onClick={() => setShowConfigModal(true)}
                  className="px-3 py-1.5 bg-red-600/20 border border-red-500/30 text-red-400 rounded-lg text-xs font-semibold hover:bg-red-600 hover:text-white transition-all"
                >
                  Configurar Buzón IMAP/SMTP
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[700px] overflow-y-auto pr-1">
              {threads.map((thread) => {
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
                      {lastMsg?.body_text || 'Sin vista previa disponible'}
                    </p>

                    <div className="mt-3 flex items-center justify-between text-[10px] text-zinc-500 pt-2 border-t border-zinc-800/60">
                      <span className="truncate max-w-[200px]">{thread.sender_email}</span>
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
              <div className="pb-4 border-b border-zinc-800 space-y-3 shrink-0">
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

                {/* Related Lead Match Notice & Action */}
                <div className="bg-red-950/30 border border-red-900/40 p-3 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-red-400 shrink-0" />
                    <span>
                      Remitente: <strong className="text-white">{selectedThread.sender_email}</strong>
                    </span>
                  </div>

                  <button
                    onClick={() => openLeadModalForSender(selectedThread.sender_email, selectedThread.sender_name)}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 transition-all shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" /> Convertir en Ficha / Solicitud Alumno
                  </button>
                </div>
              </div>

              {/* Message History Thread */}
              <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
                {selectedThread.messages.map((msg) => {
                  const isInbound = msg.direction === 'inbound';
                  return (
                    <div key={msg.id} className="space-y-2">
                      <div
                        className={`p-4 rounded-2xl text-xs space-y-3 border ${
                          isInbound
                            ? 'bg-zinc-950 border-zinc-800 text-zinc-200'
                            : 'bg-red-950/40 border-red-900/60 text-white ml-6'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] text-zinc-400 font-semibold border-b border-zinc-800/60 pb-2">
                          <span>
                            {msg.sender_name} &lt;{msg.sender_email}&gt;
                          </span>
                          <span>{new Date(msg.received_at).toLocaleString('es-ES')}</span>
                        </div>

                        {/* Render Body (Sanitized HTML or fallback Text) */}
                        {msg.body_html ? (
                          <div
                            className="leading-relaxed text-zinc-200 prose prose-invert max-w-none text-xs"
                            dangerouslySetInnerHTML={{ __html: msg.body_html }}
                          />
                        ) : (
                          <p className="leading-relaxed whitespace-pre-wrap">{msg.body_text}</p>
                        )}

                        {/* Attachments List */}
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="pt-2 border-t border-zinc-800/60 space-y-1.5">
                            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                              <Paperclip className="w-3 h-3 text-red-400" /> Archivos Adjuntos ({msg.attachments.length}):
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {msg.attachments.map((att) => (
                                <a
                                  key={att.archivo_id}
                                  href={`/api/files/${att.archivo_id}/download`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 rounded-xl text-[11px] text-zinc-200 font-medium transition-all"
                                >
                                  <Download className="w-3.5 h-3.5 text-red-400" />
                                  <span>{att.nombre_original}</span>
                                  <span className="text-[9px] text-zinc-500">
                                    ({Math.round(att.tamano_bytes / 1024)} KB)
                                  </span>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Outbound Reply Editor */}
              <form onSubmit={handleSendReply} className="pt-4 border-t border-zinc-800 space-y-3 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-zinc-300">
                    Responder desde {activeAccount ? activeAccount.buzon : 'info@academiaspendulo.com'}
                  </div>

                  <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={replyAll}
                      onChange={(e) => setReplyAll(e.target.checked)}
                      className="rounded border-zinc-800 bg-zinc-950 text-red-600 focus:ring-red-500"
                    />
                    <span>Responder a Todos</span>
                  </label>
                </div>

                <textarea
                  rows={3}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Escribe tu respuesta oficial corporativa..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-red-500 resize-none"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-extrabold shadow-md uppercase tracking-wider"
                  >
                    <Send className="w-4 h-4" /> Enviar Respuesta por SMTP
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

      {/* Mailbox Config Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <h3 className="text-lg font-extrabold text-white font-heading flex items-center gap-2">
                <Settings className="w-5 h-5 text-red-500" /> Configuración del Buzón Corporativo
              </h3>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-zinc-400 hover:text-white font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Dirección de Correo del Buzón</label>
                <input
                  type="email"
                  value={configBuzon}
                  onChange={(e) => setConfigBuzon(e.target.value)}
                  placeholder="secretaria@academiaspendulo.com"
                  required
                  className="w-full p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Servidor IMAP (Entrada)</label>
                  <input
                    type="text"
                    value={configImapHost}
                    onChange={(e) => setConfigImapHost(e.target.value)}
                    placeholder="mail.hostinger.com"
                    className="w-full p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Puerto IMAP TLS</label>
                  <input
                    type="number"
                    value={configImapPort}
                    onChange={(e) => setConfigImapPort(e.target.value)}
                    placeholder="993"
                    className="w-full p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Servidor SMTP (Salida)</label>
                  <input
                    type="text"
                    value={configSmtpHost}
                    onChange={(e) => setConfigSmtpHost(e.target.value)}
                    placeholder="smtp.hostinger.com"
                    className="w-full p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Puerto SMTP TLS</label>
                  <input
                    type="number"
                    value={configSmtpPort}
                    onChange={(e) => setConfigSmtpPort(e.target.value)}
                    placeholder="465"
                    className="w-full p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Contraseña del Buzón / Token de Aplicación</label>
                <input
                  type="password"
                  value={configPassword}
                  onChange={(e) => setConfigPassword(e.target.value)}
                  placeholder={accounts.length > 0 ? '(Sin cambios salvo que introduzcas nueva contraseña)' : 'Contraseña corporativa'}
                  className="w-full p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-500"
                />
                <p className="text-[10px] text-zinc-500 mt-1 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-emerald-400" /> Protegido con cifrado AES-256-GCM en base de datos.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Frecuencia Sinc. (Minutos)</label>
                  <input
                    type="number"
                    value={configSyncInterval}
                    onChange={(e) => setConfigSyncInterval(e.target.value)}
                    placeholder="5"
                    className="w-full p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Fecha de Inicio de Sinc.</label>
                  <input
                    type="date"
                    value={configSyncStartDate}
                    onChange={(e) => setConfigSyncStartDate(e.target.value)}
                    className="w-full p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 bg-zinc-950 text-zinc-300 rounded-xl text-xs font-bold hover:bg-zinc-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={configSaving}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider"
                >
                  {configSaving ? 'Guardando...' : 'Guardar y Probar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Convert to Lead Modal */}
      {showLeadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-extrabold text-white font-heading flex items-center gap-2">
                <Plus className="w-4 h-4 text-red-500" /> Registrar Solicitud / Preinscripción
              </h3>
              <button
                onClick={() => setShowLeadModal(false)}
                className="text-zinc-400 hover:text-white font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Nombre</label>
                <input
                  type="text"
                  value={leadName}
                  onChange={(e) => setLeadName(e.target.value)}
                  required
                  className="w-full p-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Apellidos</label>
                <input
                  type="text"
                  value={leadLastName}
                  onChange={(e) => setLeadLastName(e.target.value)}
                  className="w-full p-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Email</label>
                <input
                  type="email"
                  value={leadEmail}
                  onChange={(e) => setLeadEmail(e.target.value)}
                  required
                  className="w-full p-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Especialidad de Interés</label>
                <select
                  value={leadSpecialtyId}
                  onChange={(e) => setLeadSpecialtyId(e.target.value)}
                  className="w-full p-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white"
                >
                  <option value="">-- Seleccionar especialidad --</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} - {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowLeadModal(false)}
                  className="px-4 py-2 bg-zinc-950 text-zinc-300 rounded-xl text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={leadSaving}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider"
                >
                  {leadSaving ? 'Guardando...' : 'Crear Solicitud'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
