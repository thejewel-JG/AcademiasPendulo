import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Search, 
  Filter, 
  Eye, 
  Download, 
  Send, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Mail, 
  Phone, 
  User, 
  Users,
  Briefcase,
  BookOpen, 
  ShieldCheck, 
  RefreshCw,
  MessageSquare,
  UserPlus,
  UserCheck,
  AlertTriangle,
  Check,
  History,
  Trash2
} from 'lucide-react';

interface InscriptionRequest {
  id: number;
  request_number: string;
  course_id: string | null;
  course_name: string;
  course_code: string | null;
  center: string;
  edition: string;
  first_name: string;
  last_name_1: string;
  last_name_2: string | null;
  dni_nie: string;
  birth_date: string;
  phone: string;
  email: string;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  province: string | null;
  employment_status: string;
  company_activity: string | null;
  observations: string | null;
  truth_declaration: number;
  subsidized_training_acceptance: number;
  contact_authorization: number;
  privacy_acceptance: number;
  marketing_consent: number;
  signature_name: string;
  signature_date: string;
  pdf_path: string | null;
  status: 'Nueva' | 'En revisión' | 'Pendiente de documentación' | 'Contactado' | 'Aceptada' | 'Rechazada' | 'Cerrada' | 'Matriculado';
  secretary_notes: string | null;
  converted_to_student?: boolean | number;
  student_user_id?: number | null;
  converted_at?: string | null;
  student_name?: string;
  student_email?: string;
  student_course?: string;
  created_at: string;
  updated_at: string;
}

interface MessageHistory {
  id: number;
  request_id: number;
  sender_user_id: number | null;
  sender_type: string;
  recipient_email: string;
  subject: string;
  message: string;
  created_at: string;
  sender_name?: string;
}

interface RequestHistoryEvent {
  id: number;
  request_id: number;
  user_id: number | null;
  event_type: string;
  description: string;
  created_at: string;
}

export const CampusSecretaryInscriptions: React.FC = () => {
  const [requests, setRequests] = useState<InscriptionRequest[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<InscriptionRequest | null>(null);
  const [messages, setMessages] = useState<MessageHistory[]>([]);
  const [history, setHistory] = useState<RequestHistoryEvent[]>([]);

  // Management state for selected request
  const [notes, setNotes] = useState('');
  const [currentStatus, setCurrentStatus] = useState<string>('Nueva');
  const [savingStatus, setSavingStatus] = useState(false);

  // Email Reply state
  const [replySubject, setReplySubject] = useState('');
  const [replyMessage, setReplyMessage] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [replySuccess, setReplySuccess] = useState<string | null>(null);

  // Convert to Student state
  const [checkingConversion, setCheckingConversion] = useState(false);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [convertCheckData, setConvertCheckData] = useState<any | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | number | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionResult, setConversionResult] = useState<any | null>(null);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [resendEmailResult, setResendEmailResult] = useState<string | null>(null);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<InscriptionRequest | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Tab selection state
  const [activeTab, setActiveTab] = useState<'inscripciones' | 'trabaja' | 'bolsa'>('inscripciones');

  // Trabaja con Nosotros (Work With Us) state
  const [workApps, setWorkApps] = useState<any[]>([]);
  const [loadingWorkApps, setLoadingWorkApps] = useState(false);
  const [selectedWorkApp, setSelectedWorkApp] = useState<any | null>(null);
  const [workAppStatus, setWorkAppStatus] = useState<string>('PENDIENTE');
  const [updatingWorkStatus, setUpdatingWorkStatus] = useState(false);

  // Bolsa de Empleo state
  const [employmentPool, setEmploymentPool] = useState<any[]>([]);
  const [loadingPool, setLoadingPool] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      let url = `/api/admin/inscriptions?`;
      if (searchTerm) url += `q=${encodeURIComponent(searchTerm)}&`;
      if (statusFilter) url += `status=${encodeURIComponent(statusFilter)}&`;

      const res = await fetch(url);
      const data = await res.json();

      if (res.ok) {
        setRequests(data.requests || []);
        setPendingCount(data.pending_count || 0);
      }
    } catch (err) {
      console.error('Error fetching inscriptions:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkApps = async () => {
    setLoadingWorkApps(true);
    try {
      const res = await fetch('/api/admin/work-with-us');
      if (res.ok) {
        const data = await res.json();
        setWorkApps(data || []);
      }
    } catch (e) {
      console.error('Error fetching work applications:', e);
    } finally {
      setLoadingWorkApps(false);
    }
  };

  const fetchEmploymentPool = async () => {
    setLoadingPool(true);
    try {
      const res = await fetch('/api/admin/employment-pool');
      if (res.ok) {
        const data = await res.json();
        setEmploymentPool(data || []);
      }
    } catch (e) {
      console.error('Error fetching employment pool:', e);
    } finally {
      setLoadingPool(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'inscripciones') {
      fetchRequests();
    } else if (activeTab === 'trabaja') {
      fetchWorkApps();
    } else if (activeTab === 'bolsa') {
      fetchEmploymentPool();
    }
  }, [activeTab, searchTerm, statusFilter]);

  const handleUpdateWorkStatus = async (appId: string, newStatus: string) => {
    setUpdatingWorkStatus(true);
    try {
      const res = await fetch(`/api/admin/work-with-us/${appId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: newStatus })
      });
      if (res.ok) {
        setWorkAppStatus(newStatus);
        setSelectedWorkApp((prev: any) => (prev ? { ...prev, estado: newStatus } : null));
        fetchWorkApps();
      }
    } catch (e) {
      console.error('Error updating work application status:', e);
    } finally {
      setUpdatingWorkStatus(false);
    }
  };

  const fetchHistory = async (requestId: number) => {
    try {
      const res = await fetch(`/api/admin/inscriptions/${requestId}/history`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  };

  const handleDeleteRequest = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/admin/inscriptions/${deleteTarget.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setDeleteTarget(null);
        // If we were viewing this request, close the detail
        if (selectedRequest?.id === deleteTarget.id) setSelectedRequest(null);
        fetchRequests();
      } else {
        setDeleteError(data.error || 'No se pudo eliminar la solicitud.');
      }
    } catch (err) {
      setDeleteError('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setIsDeleting(false);
    }
  };

  const openDetail = async (req: InscriptionRequest) => {
    setSelectedRequest(req);
    setNotes(req.secretary_notes || '');
    setCurrentStatus(req.status);
    setReplySubject(`Información referente a tu Solicitud de Inscripción ${req.request_number} — Academias Péndulo`);
    setReplyMessage('');
    setReplySuccess(null);
    setResendEmailResult(null);

    // Fetch messages, history & updated detail
    try {
      const res = await fetch(`/api/admin/inscriptions/${req.id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedRequest(data.request);
        setMessages(data.messages || []);
        setNotes(data.request.secretary_notes || '');
        setCurrentStatus(data.request.status);
      }
      fetchHistory(req.id);
    } catch (err) {
      console.error('Error fetching request detail:', err);
    }
  };

  const handleUpdateStatusAndNotes = async () => {
    if (!selectedRequest) return;
    setSavingStatus(true);
    try {
      const res = await fetch(`/api/admin/inscriptions/${selectedRequest.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: currentStatus, secretary_notes: notes })
      });

      if (res.ok) {
        setSelectedRequest(prev => prev ? { ...prev, status: currentStatus as any, secretary_notes: notes } : null);
        fetchRequests();
        fetchHistory(selectedRequest.id);
      }
    } catch (err) {
      console.error('Error updating status:', err);
    } finally {
      setSavingStatus(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest || !replySubject || !replyMessage) return;

    setSendingReply(true);
    setReplySuccess(null);

    try {
      const res = await fetch(`/api/admin/inscriptions/${selectedRequest.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: replySubject, message: replyMessage })
      });

      const data = await res.json();
      if (res.ok) {
        setReplySuccess('Respuesta enviada por correo electrónico y registrada en el historial.');
        setReplyMessage('');
        
        // Refresh messages & history
        const detailRes = await fetch(`/api/admin/inscriptions/${selectedRequest.id}`);
        if (detailRes.ok) {
          const detailData = await detailRes.json();
          setMessages(detailData.messages || []);
          setSelectedRequest(detailData.request);
          setCurrentStatus(detailData.request.status);
        }
        fetchHistory(selectedRequest.id);
        fetchRequests();
      } else {
        alert(data.error || 'Error al enviar respuesta.');
      }
    } catch (err) {
      console.error('Error sending reply:', err);
    } finally {
      setSendingReply(false);
    }
  };

  // Pre-conversion checks
  const handleStartConversion = async () => {
    if (!selectedRequest) return;
    setCheckingConversion(true);
    try {
      const res = await fetch(`/api/admin/inscriptions/${selectedRequest.id}/convert-checks`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setConvertCheckData(data);
        if (data.matchedGroups && data.matchedGroups.length > 0) {
          setSelectedGroupId(data.matchedGroups[0].id);
        } else {
          setSelectedGroupId(null);
        }
        setIsConvertModalOpen(true);
      } else {
        alert(data.error || 'Error al realizar comprobaciones previas.');
      }
    } catch (err) {
      console.error('Error executing conversion checks:', err);
      alert('Error de conexión al verificar la solicitud.');
    } finally {
      setCheckingConversion(false);
    }
  };

  // Confirm conversion
  const handleConfirmConversion = async () => {
    if (!selectedRequest) return;
    setIsConverting(true);
    try {
      const res = await fetch(`/api/admin/inscriptions/${selectedRequest.id}/convert-to-student`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_id: selectedGroupId })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setConversionResult(data);
        setIsConvertModalOpen(false);
        // Refresh detail
        await openDetail(selectedRequest);
        fetchRequests();
      } else {
        alert(data.error || 'Error al convertir la solicitud en alumno.');
      }
    } catch (err) {
      console.error('Error converting student:', err);
      alert('Error de conexión al procesar la conversión.');
    } finally {
      setIsConverting(false);
    }
  };

  // Resend activation email
  const handleResendActivationEmail = async () => {
    if (!selectedRequest) return;
    setResendingEmail(true);
    setResendEmailResult(null);
    try {
      const res = await fetch(`/api/admin/inscriptions/${selectedRequest.id}/resend-activation-email`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setResendEmailResult('✅ Correo de activación reenviado correctamente al alumno.');
        fetchHistory(selectedRequest.id);
      } else {
        setResendEmailResult(`⚠️ ${data.error || 'No se pudo reenviar el correo.'}`);
      }
    } catch (err) {
      console.error('Error resending email:', err);
      setResendEmailResult('⚠️ Error de conexión al reenviar el correo.');
    } finally {
      setResendingEmail(false);
    }
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'Nueva':
        return <span className="bg-red-100 text-red-700 border border-red-200 px-2.5 py-1 rounded-full font-bold text-xs flex items-center gap-1 animate-pulse"><Clock className="w-3 h-3" /> Nueva</span>;
      case 'En revisión':
        return <span className="bg-amber-100 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-full font-bold text-xs flex items-center gap-1"><Eye className="w-3 h-3" /> En revisión</span>;
      case 'Pendiente de documentación':
        return <span className="bg-orange-100 text-orange-800 border border-orange-200 px-2.5 py-1 rounded-full font-bold text-xs flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Documentación</span>;
      case 'Contactado':
        return <span className="bg-blue-100 text-blue-800 border border-blue-200 px-2.5 py-1 rounded-full font-bold text-xs flex items-center gap-1"><Mail className="w-3 h-3" /> Contactado</span>;
      case 'Aceptada':
        return <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-full font-bold text-xs flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Aceptada</span>;
      case 'Rechazada':
        return <span className="bg-rose-100 text-rose-800 border border-rose-200 px-2.5 py-1 rounded-full font-bold text-xs flex items-center gap-1"><XCircle className="w-3 h-3" /> Rechazada</span>;
      case 'Cerrada':
        return <span className="bg-gray-100 text-gray-700 border border-gray-200 px-2.5 py-1 rounded-full font-bold text-xs flex items-center gap-1">Cerrada</span>;
      case 'Matriculado':
        return <span className="bg-purple-100 text-purple-800 border border-purple-200 px-2.5 py-1 rounded-full font-bold text-xs flex items-center gap-1 font-black"><UserCheck className="w-3 h-3" /> Matriculado</span>;
      default:
        return <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full font-bold text-xs">{st}</span>;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-950 to-black text-white p-6 rounded-2xl shadow-xl border border-gray-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Secretaría → Solicitudes de Inscripción
            </h1>
            {pendingCount > 0 && (
              <span className="bg-red-600 text-white text-xs font-black px-3 py-1 rounded-full shadow-lg animate-bounce">
                {pendingCount} Pendientes
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Gestión oficial de expedientes de inscripción y matriculación directa de alumnos en el Campus Virtual.
          </p>
        </div>

        <button
          onClick={fetchRequests}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-xs font-bold transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Actualizar Lista
        </button>
      </div>

      {/* Top Tabs Selector */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-3">
        <button
          onClick={() => { setActiveTab('inscripciones'); setSelectedWorkApp(null); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all ${
            activeTab === 'inscripciones'
              ? 'bg-red-600 text-white shadow-md shadow-red-950/20'
              : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Solicitudes de Inscripción</span>
          {pendingCount > 0 && (
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-white/25 text-white font-black">
              {pendingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => { setActiveTab('trabaja'); setSelectedRequest(null); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all ${
            activeTab === 'trabaja'
              ? 'bg-red-600 text-white shadow-md shadow-red-950/20'
              : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          <span>Candidaturas & CVs (Trabaja con Nosotros)</span>
          {workApps.length > 0 && (
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-amber-400 text-black font-black">
              {workApps.length}
            </span>
          )}
        </button>

        <button
          onClick={() => { setActiveTab('bolsa'); setSelectedRequest(null); setSelectedWorkApp(null); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all ${
            activeTab === 'bolsa'
              ? 'bg-red-600 text-white shadow-md shadow-red-950/20'
              : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Bolsa de Empleo Automoción</span>
          {employmentPool.length > 0 && (
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-gray-200 text-gray-800 font-black">
              {employmentPool.length}
            </span>
          )}
        </button>
      </div>

      {/* ─── TAB 1: SOLICITUDES DE INSCRIPCIÓN ─────────────────────────── */}
      {activeTab === 'inscripciones' && (
        <>
          {/* Filters & Search Bar */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                placeholder="Buscar por Nombre, DNI/NIE, Email, Teléfono, Nº Solicitud (PEN-2026-...) o Curso..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 font-medium"
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <Filter className="w-4 h-4 text-gray-500 shrink-0" />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 bg-gray-50"
              >
                <option value="">Todos los Estados</option>
                <option value="Nueva">Nuevas ({pendingCount})</option>
                <option value="En revisión">En revisión</option>
                <option value="Pendiente de documentación">Pendiente de documentación</option>
                <option value="Contactado">Contactado</option>
                <option value="Aceptada">Aceptada</option>
                <option value="Matriculado">Matriculado</option>
                <option value="Rechazada">Rechazada</option>
                <option value="Cerrada">Cerrada</option>
              </select>
            </div>
          </div>

          {/* Inscriptions Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-gray-500 text-sm font-semibold flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                Cargando solicitudes de inscripción...
              </div>
            ) : requests.length === 0 ? (
              <div className="p-12 text-center text-gray-500 space-y-2">
                <FileText className="w-10 h-10 text-gray-300 mx-auto" />
                <p className="font-bold text-base text-gray-700">No se encontraron solicitudes</p>
                <p className="text-xs text-gray-500">Pruebe a cambiar los términos de búsqueda o el filtro de estado.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-600">
                  <thead className="bg-gray-50 border-b border-gray-200 text-[11px] uppercase tracking-wider font-extrabold text-gray-700">
                    <tr>
                      <th className="p-4">N.º Solicitud</th>
                      <th className="p-4">Solicitante</th>
                      <th className="p-4">DNI / NIE</th>
                      <th className="p-4">Curso Solicitado</th>
                      <th className="p-4">Contacto</th>
                      <th className="p-4">Fecha</th>
                      <th className="p-4 text-center">Estado</th>
                      <th className="p-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {requests.map(req => (
                      <tr key={req.id} className="hover:bg-red-50/30 transition-colors">
                        <td className="p-4 font-black text-gray-900 whitespace-nowrap">
                          <span className="text-red-600 bg-red-50 border border-red-100 px-2 py-1 rounded-md">
                            {req.request_number}
                          </span>
                        </td>
                        <td className="p-4 font-bold text-gray-900 whitespace-nowrap">
                          {req.first_name} {req.last_name_1} {req.last_name_2 || ''}
                        </td>
                        <td className="p-4 font-mono font-bold text-gray-700 whitespace-nowrap">
                          {req.dni_nie}
                        </td>
                        <td className="p-4 font-semibold text-gray-900 max-w-xs truncate">
                          {req.course_name}
                        </td>
                        <td className="p-4 whitespace-nowrap space-y-0.5">
                          <div className="flex items-center gap-1 font-bold text-gray-800">
                            <Phone className="w-3 h-3 text-gray-400" />
                            <span>{req.phone}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-gray-500">
                            <Mail className="w-3 h-3 text-gray-400" />
                            <span>{req.email}</span>
                          </div>
                        </td>
                        <td className="p-4 whitespace-nowrap text-gray-500 text-[11px]">
                          {new Date(req.created_at).toLocaleDateString('es-ES')} {new Date(req.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="p-4 text-center whitespace-nowrap">
                          {getStatusBadge(req.status)}
                        </td>
                        <td className="p-4 text-right whitespace-nowrap">
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              onClick={() => openDetail(req)}
                              className="px-3.5 py-1.5 bg-gray-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Ver Ficha</span>
                            </button>
                            {(req.status === 'Rechazada' || req.status === 'Cerrada') && (
                              <button
                                onClick={() => { setDeleteTarget(req); setDeleteError(null); }}
                                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                                title="Eliminar solicitud"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ─── TAB 2: TRABAJA CON NOSOTROS (CANDIDATURAS & CVS) ──────────── */}
      {activeTab === 'trabaja' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {loadingWorkApps ? (
              <div className="p-12 text-center text-gray-500 text-sm font-semibold flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                Cargando candidaturas recibidas...
              </div>
            ) : workApps.length === 0 ? (
              <div className="p-12 text-center text-gray-500 space-y-2">
                <UserPlus className="w-10 h-10 text-gray-300 mx-auto" />
                <p className="font-bold text-base text-gray-700">No hay candidaturas registradas</p>
                <p className="text-xs text-gray-500">Los currículums enviados a través de "Trabaja con Nosotros" aparecerán aquí.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-600">
                  <thead className="bg-gray-50 border-b border-gray-200 text-[11px] uppercase tracking-wider font-extrabold text-gray-700">
                    <tr>
                      <th className="p-4">Candidato</th>
                      <th className="p-4">Puesto Solicitado</th>
                      <th className="p-4">Contacto</th>
                      <th className="p-4">Currículum (CV)</th>
                      <th className="p-4">Fecha</th>
                      <th className="p-4 text-center">Estado</th>
                      <th className="p-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {workApps.map((app) => (
                      <tr key={app.id} className="hover:bg-red-50/30 transition-colors">
                        <td className="p-4 font-bold text-gray-900 whitespace-nowrap">
                          {app.nombre}
                        </td>
                        <td className="p-4 font-bold text-red-600">
                          {app.puesto}
                        </td>
                        <td className="p-4 whitespace-nowrap space-y-0.5">
                          <div className="flex items-center gap-1 font-bold text-gray-800">
                            <Phone className="w-3 h-3 text-gray-400" />
                            <a href={`tel:${app.telefono}`} className="hover:underline">{app.telefono}</a>
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-gray-500">
                            <Mail className="w-3 h-3 text-gray-400" />
                            <a href={`mailto:${app.email}`} className="hover:underline">{app.email}</a>
                          </div>
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          {app.cv_nombre ? (
                            <a
                              href={`/api/admin/work-with-us/${app.id}/cv`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-bold transition-all"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span className="truncate max-w-[150px]">{app.cv_nombre}</span>
                            </a>
                          ) : (
                            <span className="text-gray-400 italic">Sin archivo</span>
                          )}
                        </td>
                        <td className="p-4 whitespace-nowrap text-gray-500 text-[11px]">
                          {new Date(app.creado_en).toLocaleDateString('es-ES')} {new Date(app.creado_en).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="p-4 text-center whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                            app.estado === 'PENDIENTE'
                              ? 'bg-amber-100 text-amber-800 border-amber-200'
                              : app.estado === 'REVISADO'
                              ? 'bg-blue-100 text-blue-800 border-blue-200'
                              : app.estado === 'EN_PROCESO'
                              ? 'bg-purple-100 text-purple-800 border-purple-200'
                              : app.estado === 'SELECCIONADO'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : 'bg-gray-100 text-gray-700 border-gray-200'
                          }`}>
                            {app.estado}
                          </span>
                        </td>
                        <td className="p-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => { setSelectedWorkApp(app); setWorkAppStatus(app.estado); }}
                            className="px-3.5 py-1.5 bg-gray-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 ml-auto"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ver Detalle</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 3: BOLSA DE EMPLEO ─────────────────────────────────────── */}
      {activeTab === 'bolsa' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {loadingPool ? (
              <div className="p-12 text-center text-gray-500 text-sm font-semibold flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                Cargando candidatos de la bolsa de empleo...
              </div>
            ) : employmentPool.length === 0 ? (
              <div className="p-12 text-center text-gray-500 space-y-2">
                <Users className="w-10 h-10 text-gray-300 mx-auto" />
                <p className="font-bold text-base text-gray-700">No hay candidatos en la bolsa de empleo</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-600">
                  <thead className="bg-gray-50 border-b border-gray-200 text-[11px] uppercase tracking-wider font-extrabold text-gray-700">
                    <tr>
                      <th className="p-4">Candidato</th>
                      <th className="p-4">Especialidad</th>
                      <th className="p-4">Ciudad</th>
                      <th className="p-4">Contacto</th>
                      <th className="p-4">Titulación / Exp.</th>
                      <th className="p-4">Disponibilidad</th>
                      <th className="p-4">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {employmentPool.map((cand) => (
                      <tr key={cand.id} className="hover:bg-red-50/30 transition-colors">
                        <td className="p-4 font-bold text-gray-900 whitespace-nowrap">
                          {cand.nombre}
                        </td>
                        <td className="p-4 font-bold text-red-600">
                          {cand.especialidad}
                        </td>
                        <td className="p-4 whitespace-nowrap font-medium text-gray-700">
                          {cand.ciudad || 'Almería'}
                        </td>
                        <td className="p-4 whitespace-nowrap space-y-0.5">
                          <div className="flex items-center gap-1 font-bold text-gray-800">
                            <Phone className="w-3 h-3 text-gray-400" />
                            <a href={`tel:${cand.telefono}`} className="hover:underline">{cand.telefono}</a>
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-gray-500">
                            <Mail className="w-3 h-3 text-gray-400" />
                            <a href={`mailto:${cand.email}`} className="hover:underline">{cand.email}</a>
                          </div>
                        </td>
                        <td className="p-4 text-gray-700">
                          <div className="font-semibold">{cand.titulacion || 'No especificada'}</div>
                          <div className="text-[11px] text-gray-500">{cand.experiencia || 'Sin experiencia previa'}</div>
                        </td>
                        <td className="p-4 whitespace-nowrap font-semibold text-emerald-700">
                          {cand.disponibilidad || 'Inmediata'}
                        </td>
                        <td className="p-4 whitespace-nowrap text-gray-500 text-[11px]">
                          {new Date(cand.creado_en).toLocaleDateString('es-ES')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── MODAL DETALLE TRABAJA CON NOSOTROS (CV) ────────────────────── */}
      {selectedWorkApp && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden space-y-4">
            <div className="bg-gradient-to-r from-gray-900 to-black text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-red-600 text-white font-bold">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Candidatura: {selectedWorkApp.nombre}</h3>
                  <p className="text-xs text-gray-400">{selectedWorkApp.puesto}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedWorkApp(null)}
                className="text-gray-400 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                <div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase">Teléfono</div>
                  <div className="font-bold text-gray-900">
                    <a href={`tel:${selectedWorkApp.telefono}`} className="text-red-600 hover:underline">{selectedWorkApp.telefono}</a>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase">Email</div>
                  <div className="font-bold text-gray-900">
                    <a href={`mailto:${selectedWorkApp.email}`} className="text-red-600 hover:underline">{selectedWorkApp.email}</a>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-[11px] font-bold text-gray-700 uppercase mb-1">Carta de Presentación / Mensaje</div>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {selectedWorkApp.observaciones || 'Sin mensaje adicional adjunto.'}
                </div>
              </div>

              {selectedWorkApp.cv_nombre && (
                <div>
                  <div className="text-[11px] font-bold text-gray-700 uppercase mb-1.5">Currículum Vitae (CV)</div>
                  <a
                    href={`/api/admin/work-with-us/${selectedWorkApp.id}/cv`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-md transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>Descargar {selectedWorkApp.cv_nombre}</span>
                  </a>
                </div>
              )}

              <div>
                <div className="text-[11px] font-bold text-gray-700 uppercase mb-1.5">Estado de la Candidatura</div>
                <div className="flex items-center gap-2">
                  <select
                    value={workAppStatus}
                    onChange={(e) => handleUpdateWorkStatus(selectedWorkApp.id, e.target.value)}
                    disabled={updatingWorkStatus}
                    className="flex-1 p-2.5 border border-gray-300 rounded-xl text-xs font-bold bg-white"
                  >
                    <option value="PENDIENTE">PENDIENTE</option>
                    <option value="REVISADO">REVISADO</option>
                    <option value="EN_PROCESO">EN PROCESO</option>
                    <option value="SELECCIONADO">SELECCIONADO</option>
                    <option value="DESCARTADO">DESCARTADO</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setSelectedWorkApp(null)}
                className="px-5 py-2 bg-gray-900 text-white font-bold rounded-xl text-xs"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── DELETE CONFIRMATION MODAL ─────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[60] overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="bg-rose-600 p-5 flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-white font-black text-base">¿Eliminar solicitud?</h2>
                <p className="text-rose-100 text-xs">Esta acción es permanente e irreversible.</p>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 space-y-1">
                <p className="text-xs font-black text-rose-900">Solicitud a eliminar:</p>
                <p className="font-extrabold text-gray-900">{deleteTarget.request_number}</p>
                <p className="text-sm text-gray-700">{deleteTarget.first_name} {deleteTarget.last_name_1} — <span className="font-mono">{deleteTarget.dni_nie}</span></p>
                <p className="text-xs text-gray-500">{deleteTarget.course_name}</p>
                <p className="text-xs font-bold text-rose-700 mt-1">Estado: {deleteTarget.status}</p>
              </div>
              {deleteError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs font-bold text-red-800">
                  ⚠️ {deleteError}
                </div>
              )}
              <p className="text-xs text-gray-500 text-center">
                Se eliminará el expediente completo, historial y mensajes. Esta acción queda registrada en auditoría.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteTarget(null)}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteRequest}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-extrabold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isDeleting
                    ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Eliminando...</>
                    : <><Trash2 className="w-4 h-4" />Sí, eliminar definitivamente</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL / DRAWER */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
          <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100 my-6">
            
            {/* Modal Header */}
            <div className="bg-gray-950 text-white p-4 sm:p-6 border-b border-gray-800 flex justify-between items-center">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                    Expediente: {selectedRequest.request_number}
                  </h2>
                  {getStatusBadge(currentStatus)}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  Registrado el {new Date(selectedRequest.created_at).toLocaleString('es-ES')}
                </p>
              </div>

              <button
                onClick={() => setSelectedRequest(null)}
                className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-gray-800 transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 max-h-[80vh] overflow-y-auto space-y-6">
              
              {/* Top Quick Actions & Conversion Section */}
              <div className="bg-gradient-to-r from-red-50 via-white to-gray-50 border border-red-100 p-4 rounded-xl space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold shrink-0 shadow-md">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-red-900">Documento Oficial PDF Generado</p>
                      <p className="text-[11px] text-red-700">Archivado de forma segura en almacenamiento privado del servidor.</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <a
                      href={`/api/admin/inscriptions/${selectedRequest.id}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 sm:flex-none px-4 py-2 bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Eye className="w-3.5 h-3.5 text-red-600" />
                      <span>Ver PDF</span>
                    </a>

                    <a
                      href={`/api/admin/inscriptions/${selectedRequest.id}/pdf`}
                      download={`solicitud_${selectedRequest.request_number}.pdf`}
                      className="flex-1 sm:flex-none px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Descargar PDF</span>
                    </a>
                  </div>
                </div>

                {/* CONVERT TO STUDENT BUTTON / STATUS BADGE */}
                <div className="pt-3 border-t border-red-100/60">
                  {selectedRequest.converted_to_student ? (
                    <div className="bg-purple-900/10 border border-purple-200 p-4 rounded-xl space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-200/60 pb-2">
                        <span className="bg-purple-700 text-white text-xs font-black px-3 py-1 rounded-full flex items-center gap-1.5 w-fit">
                          <UserCheck className="w-3.5 h-3.5" /> Alumno creado
                        </span>
                        <span className="text-[11px] text-purple-900 font-semibold">
                          Fecha conversión: {selectedRequest.converted_at ? new Date(selectedRequest.converted_at).toLocaleString('es-ES') : '---'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-purple-950 font-medium pt-1">
                        <p><span className="font-extrabold text-gray-900">Nombre:</span> {selectedRequest.first_name} {selectedRequest.last_name_1}</p>
                        <p><span className="font-extrabold text-gray-900">Email:</span> {selectedRequest.email}</p>
                        <p><span className="font-extrabold text-gray-900">Curso:</span> {selectedRequest.course_name}</p>
                      </div>

                      <div className="flex items-center gap-3 pt-2">
                        <button
                          onClick={handleResendActivationEmail}
                          disabled={resendingEmail}
                          className="px-3.5 py-1.5 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          <span>{resendingEmail ? 'Reenviando...' : 'Reenviar Email de Acceso'}</span>
                        </button>

                        {resendEmailResult && (
                          <span className="text-xs font-bold text-purple-900">{resendEmailResult}</span>
                        )}
                      </div>
                    </div>
                  ) : currentStatus === 'Aceptada' ? (
                    <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Solicitud Aceptada — Lista para Convertir
                        </p>
                        <p className="text-[11px] text-emerald-800 mt-0.5">
                          Pulse el botón para crear automáticamente la cuenta de alumno, asignar matrícula y notificar al profesor.
                        </p>
                      </div>

                      <button
                        onClick={handleStartConversion}
                        disabled={checkingConversion}
                        className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5 shrink-0"
                      >
                        {checkingConversion ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Comprobando...</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4" />
                            <span>CREAR ALUMNO EN EL CAMPUS</span>
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500 bg-gray-100 p-3 rounded-xl border border-gray-200 flex items-center justify-between">
                      <span>Para poder convertir esta solicitud en un alumno del campus, primero cambie el estado a <strong>Aceptada</strong>.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Data Grid: Applicant + Course + Employment */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Card 1: Datos del Solicitante */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                  <h3 className="font-extrabold text-gray-900 text-sm flex items-center gap-2 border-b border-gray-200 pb-2">
                    <User className="w-4 h-4 text-red-600" />
                    Datos Personales del Solicitante
                  </h3>

                  <div className="space-y-1.5 text-xs text-gray-700">
                    <p><span className="font-bold text-gray-900">Nombre completo:</span> {selectedRequest.first_name} {selectedRequest.last_name_1} {selectedRequest.last_name_2 || ''}</p>
                    <p><span className="font-bold text-gray-900">DNI / NIE:</span> <span className="font-mono bg-white px-2 py-0.5 rounded border border-gray-200 font-bold">{selectedRequest.dni_nie}</span></p>
                    <p><span className="font-bold text-gray-900">Fecha nacimiento:</span> {selectedRequest.birth_date ? new Date(selectedRequest.birth_date).toLocaleDateString('es-ES') : '---'}</p>
                    <p><span className="font-bold text-gray-900">Teléfono:</span> <a href={`tel:${selectedRequest.phone}`} className="text-red-600 font-bold">{selectedRequest.phone}</a></p>
                    <p><span className="font-bold text-gray-900">Email:</span> <a href={`mailto:${selectedRequest.email}`} className="text-red-600 font-bold">{selectedRequest.email}</a></p>
                    <p><span className="font-bold text-gray-900">Dirección:</span> {selectedRequest.address || '---'}, {selectedRequest.postal_code || ''} {selectedRequest.city || ''} ({selectedRequest.province || ''})</p>
                  </div>
                </div>

                {/* Card 2: Curso y Situación Laboral */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                  <h3 className="font-extrabold text-gray-900 text-sm flex items-center gap-2 border-b border-gray-200 pb-2">
                    <BookOpen className="w-4 h-4 text-red-600" />
                    Curso & Situación Laboral
                  </h3>

                  <div className="space-y-1.5 text-xs text-gray-700">
                    <p><span className="font-bold text-gray-900">Curso Solicitado:</span> <span className="text-red-600 font-extrabold">{selectedRequest.course_name}</span></p>
                    <p><span className="font-bold text-gray-900">Código de Especialidad:</span> {selectedRequest.course_code || '---'}</p>
                    <p><span className="font-bold text-gray-900">Centro de Impartición:</span> {selectedRequest.center}</p>
                    <p><span className="font-bold text-gray-900">Convocatoria:</span> {selectedRequest.edition}</p>
                    <hr className="border-gray-200 my-2" />
                    <p><span className="font-bold text-gray-900">Situación Laboral:</span> <span className="uppercase font-bold text-gray-900 bg-white px-2 py-0.5 rounded border border-gray-200">{selectedRequest.employment_status}</span></p>
                    <p><span className="font-bold text-gray-900">Empresa / Actividad:</span> {selectedRequest.company_activity || 'No indicada'}</p>
                  </div>
                </div>

              </div>

              {/* Declarations & Signature info */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2">
                <h3 className="font-extrabold text-gray-900 text-sm flex items-center gap-2 border-b border-gray-200 pb-2">
                  <ShieldCheck className="w-4 h-4 text-red-600" />
                  Declaraciones y Firma Telemática
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-700">
                  <p className="flex items-center gap-1.5 font-medium">
                    {selectedRequest.truth_declaration ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <XCircle className="w-4 h-4 text-gray-300" />}
                    <span>Declaración de datos veraces</span>
                  </p>
                  <p className="flex items-center gap-1.5 font-medium">
                    {selectedRequest.subsidized_training_acceptance ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <XCircle className="w-4 h-4 text-gray-300" />}
                    <span>Aceptación de formación subvencionada</span>
                  </p>
                  <p className="flex items-center gap-1.5 font-medium">
                    {selectedRequest.privacy_acceptance ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <XCircle className="w-4 h-4 text-gray-300" />}
                    <span>Aceptación Política Privacidad (RGPD)</span>
                  </p>
                  <p className="flex items-center gap-1.5 font-medium">
                    {selectedRequest.marketing_consent ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <XCircle className="w-4 h-4 text-gray-300" />}
                    <span>Consentimiento información futura cursos</span>
                  </p>
                </div>

                <div className="pt-2 text-xs text-gray-800 border-t border-gray-200 flex flex-col sm:flex-row justify-between">
                  <p><span className="font-bold">Firma telemática:</span> <span className="font-semibold italic text-red-700">{selectedRequest.signature_name}</span></p>
                  <p><span className="font-bold">Fecha de firma:</span> {selectedRequest.signature_date ? new Date(selectedRequest.signature_date).toLocaleDateString('es-ES') : '---'}</p>
                </div>
              </div>

              {/* SECTION: GESTIÓN INTERNA Y NOTAS DE SECRETARÍA */}
              <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200 space-y-4">
                <h3 className="font-black text-amber-900 text-sm flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  Gestión Interna de Secretaría (Privado)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1">Cambiar Estado de la Solicitud</label>
                    <select
                      value={currentStatus}
                      onChange={e => setCurrentStatus(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-amber-300 text-xs font-bold bg-white focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="Nueva">Nueva</option>
                      <option value="En revisión">En revisión</option>
                      <option value="Pendiente de documentación">Pendiente de documentación</option>
                      <option value="Contactado">Contactado</option>
                      <option value="Aceptada">Aceptada</option>
                      <option value="Matriculado">Matriculado</option>
                      <option value="Rechazada">Rechazada</option>
                      <option value="Cerrada">Cerrada</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-800 mb-1">Notas de Secretaría (Privadas)</label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Añada cualquier anotación interna relevante sobre la documentación o contacto con el alumno..."
                      className="w-full px-3 py-2 rounded-xl border border-amber-300 text-xs bg-white focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <button
                  onClick={handleUpdateStatusAndNotes}
                  disabled={savingStatus}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                >
                  {savingStatus ? 'Guardando...' : 'Guardar Cambios de Secretaría'}
                </button>
              </div>

              {/* SECTION: ACTIVIDAD E HISTORIAL DE LA SOLICITUD */}
              <div className="bg-gray-50 p-4 sm:p-5 rounded-xl border border-gray-200 space-y-3">
                <h3 className="font-black text-gray-900 text-sm flex items-center gap-2">
                  <History className="w-4 h-4 text-red-600" />
                  Actividad e Historial de Eventos ({history.length})
                </h3>

                {history.length === 0 ? (
                  <p className="text-xs text-gray-500 italic">No hay eventos registrados en la actividad aún.</p>
                ) : (
                  <div className="space-y-3 relative pl-4 border-l-2 border-red-200 max-h-56 overflow-y-auto pr-1">
                    {history.map(ev => (
                      <div key={ev.id} className="relative text-xs space-y-0.5">
                        <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-red-600 ring-4 ring-gray-50" />
                        <div className="flex justify-between items-center text-gray-500 text-[11px]">
                          <span className="font-black text-red-800 uppercase tracking-wider">{ev.event_type}</span>
                          <span>{new Date(ev.created_at).toLocaleString('es-ES')}</span>
                        </div>
                        <p className="text-gray-800 font-semibold">{ev.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION: RESPONDER AL SOLICITANTE VIA EMAIL */}
              <div className="bg-gray-50 p-4 sm:p-5 rounded-xl border border-gray-200 space-y-4">
                <h3 className="font-black text-gray-900 text-sm flex items-center gap-2">
                  <Mail className="w-4 h-4 text-red-600" />
                  Responder al Solicitante por Correo Electrónico
                </h3>

                {replySuccess && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{replySuccess}</span>
                  </div>
                )}

                <form onSubmit={handleSendReply} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Asunto del Correo</label>
                    <input
                      type="text"
                      value={replySubject}
                      onChange={e => setReplySubject(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Mensaje para {selectedRequest.first_name} ({selectedRequest.email})</label>
                    <textarea
                      rows={4}
                      value={replyMessage}
                      onChange={e => setReplyMessage(e.target.value)}
                      placeholder="Escriba aquí la respuesta o instrucciones requeridas para el solicitante..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={sendingReply}
                    className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {sendingReply ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Enviando correo...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Enviar Respuesta al Solicitante</span>
                      </>
                    )}
                  </button>
                </form>

                {/* Message History Timeline */}
                {messages.length > 0 && (
                  <div className="pt-4 border-t border-gray-200 space-y-3">
                    <h4 className="font-bold text-xs text-gray-800 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-gray-500" />
                      Historial de Comunicaciones Enviadas ({messages.length})
                    </h4>

                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {messages.map(msg => (
                        <div key={msg.id} className="bg-white p-3 rounded-xl border border-gray-200 text-xs space-y-1">
                          <div className="flex justify-between items-center text-gray-500 text-[11px]">
                            <span className="font-bold text-gray-900">{msg.subject}</span>
                            <span>{new Date(msg.created_at).toLocaleString('es-ES')}</span>
                          </div>
                          <p className="text-gray-700 whitespace-pre-wrap">{msg.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* MODAL COMPROBACIONES Y CONFIRMACIÓN DE CREACIÓN */}
      {isConvertModalOpen && convertCheckData && selectedRequest && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white text-gray-900 rounded-2xl shadow-2xl max-w-xl w-full p-6 space-y-5 border border-gray-200 my-6">
            
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-600" />
                Crear Alumno en el Campus
              </h3>
              <button onClick={() => setIsConvertModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-600">
              Se creará una cuenta de alumno con los datos de esta solicitud y se le asignará el curso seleccionado.
            </p>

            {/* Resumen de Datos a transferir */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-xs space-y-1.5">
              <p><span className="font-bold text-gray-900">Nombre completo:</span> {selectedRequest.first_name} {selectedRequest.last_name_1} {selectedRequest.last_name_2 || ''}</p>
              <p><span className="font-bold text-gray-900">DNI / NIE:</span> <span className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-gray-300">{selectedRequest.dni_nie}</span></p>
              <p><span className="font-bold text-gray-900">Email:</span> {selectedRequest.email}</p>
              <p><span className="font-bold text-gray-900">Teléfono:</span> {selectedRequest.phone}</p>
              <p><span className="font-bold text-gray-900">Curso / Especialidad:</span> <span className="font-black text-red-600">{selectedRequest.course_name}</span></p>
            </div>

            {/* Comprobaciones automáticas */}
            <div className="space-y-3">
              
              {/* Comprobación 1: Email */}
              {convertCheckData.emailUserExists ? (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs text-amber-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-amber-800">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Ya existe un usuario con este correo electrónico.</span>
                  </div>
                  <p className="text-amber-700">
                    Usuario registrado: <strong>{convertCheckData.emailUserExists.nombre} {convertCheckData.emailUserExists.apellidos}</strong> (Rol: {convertCheckData.emailUserExists.role}). No se creará un usuario duplicado; se asociará la nueva matrícula a la cuenta existente.
                  </p>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl text-xs text-emerald-800 flex items-center gap-2 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Comprobación 1 (Email): Ningún usuario previo registrado con {selectedRequest.email}.</span>
                </div>
              )}

              {/* Comprobación 2: DNI/NIE */}
              {convertCheckData.dniStudentExists ? (
                <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl text-xs text-rose-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-rose-800">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Atención: Ya existe un alumno con el mismo DNI/NIE ({selectedRequest.dni_nie}).</span>
                  </div>
                  <p className="text-rose-700">
                    Alumno encontrado: <strong>{convertCheckData.dniStudentExists.nombre} {convertCheckData.dniStudentExists.apellidos}</strong>.
                  </p>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl text-xs text-emerald-800 flex items-center gap-2 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Comprobación 2 (DNI/NIE): Documento único en el campus.</span>
                </div>
              )}

              {/* Comprobación 3: Asignación de Grupo/Curso */}
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1">
                  Comprobación 3 (Curso): Seleccionar Grupo de Impartición
                </label>
                {convertCheckData.matchedGroups && convertCheckData.matchedGroups.length > 0 ? (
                  <select
                    value={selectedGroupId || ''}
                    onChange={e => setSelectedGroupId(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs font-bold bg-white focus:ring-2 focus:ring-emerald-500"
                  >
                    {convertCheckData.matchedGroups.map((g: any) => (
                      <option key={g.id} value={g.id}>
                        {g.nombre} (Especialidad: {g.especialidad_nombre || g.especialidad_codigo})
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs text-gray-500 italic bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                    Se creará la matrícula en la especialidad solicitada.
                  </p>
                )}
              </div>

            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                onClick={() => setIsConvertModalOpen(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-all"
              >
                Cancelar
              </button>

              <button
                onClick={handleConfirmConversion}
                disabled={isConverting}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isConverting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Creando alumno...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Confirmar y Crear Alumno</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* NOTIFICACIÓN FINAL TRAS CREAR ALUMNO */}
      {conversionResult && selectedRequest && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white text-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5 text-center border border-gray-200">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-black text-gray-900">✅ Alumno creado correctamente</h3>
              <p className="text-xs text-gray-500">
                La solicitud ha sido convertida e integrada en el Campus Virtual.
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-left text-xs space-y-2">
              <p><span className="font-bold text-gray-900">Nombre:</span> {selectedRequest.first_name} {selectedRequest.last_name_1}</p>
              <p><span className="font-bold text-gray-900">Curso:</span> {selectedRequest.course_name}</p>
              <p><span className="font-bold text-gray-900">Usuario:</span> {selectedRequest.email}</p>
              <p><span className="font-bold text-gray-900">Estado:</span> <span className="bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded text-[11px]">Matriculado</span></p>
              <p><span className="font-bold text-gray-900">Email de acceso:</span> {conversionResult.emailSent ? <span className="text-emerald-600 font-bold">Enviado</span> : <span className="text-rose-600 font-bold">Error al enviar (puede reenviarse)</span>}</p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setConversionResult(null)}
                className="px-6 py-2.5 bg-gray-900 hover:bg-black text-white font-extrabold text-xs rounded-xl shadow-md transition-all"
              >
                Volver a Solicitudes
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
