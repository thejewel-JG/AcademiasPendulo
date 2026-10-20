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
  Trash2,
  GraduationCap,
  CreditCard,
  Calendar,
  FileCheck,
  Zap,
  Info
} from 'lucide-react';
import { getAcademicLevelLabel } from '../../data/academicLevels';

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
  academic_level?: string | null;
  academic_degree?: string | null;
  additional_training?: string | null;
  observations: string | null;
  truth_declaration: number;
  subsidized_training_acceptance: number;
  contact_authorization: number;
  privacy_acceptance: number;
  marketing_consent: number;
  signature_name: string;
  signature_date: string;
  pdf_path: string | null;
  status: string;
  // Mod 03 Snapshot & Separated Statuses
  modalidad_inscripcion?: 'COMPRA_DIRECTA' | 'SOLICITUD_APROBACION' | string;
  precio_base_snapshot?: number | string | null;
  moneda_snapshot?: string | null;
  tipo_iva_snapshot?: string | null;
  porcentaje_iva_snapshot?: number | string | null;
  importe_iva_snapshot?: number | string | null;
  precio_final_snapshot?: number | string | null;
  estado_solicitud?: string;
  estado_pago?: string;
  estado_matricula?: string;
  documentos_requeridos?: string | null;
  documentos_aportados?: string | null;
  motivo_rechazo?: string | null;
  preaprobado_por?: number | null;
  preaprobado_en?: string | null;
  verificado_pago_por?: number | null;
  verificado_pago_en?: string | null;
  aprobado_final_por?: number | null;
  aprobado_final_en?: string | null;
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
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<InscriptionRequest | null>(null);
  const [messages, setMessages] = useState<MessageHistory[]>([]);
  const [history, setHistory] = useState<RequestHistoryEvent[]>([]);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [modalityFilter, setModalityFilter] = useState('ALL');
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [enrollmentFilter, setEnrollmentFilter] = useState('ALL');
  const [courseFilter, setCourseFilter] = useState('ALL');
  const [coursesList, setCoursesList] = useState<{ id: string | number; nombre: string }[]>([]);

  // Aggregate KPI metrics
  const [kpis, setKpis] = useState({
    total_count: 0,
    pending_count: 0,
    review_count: 0,
    docs_count: 0,
    preapproved_count: 0,
    rejected_count: 0,
    direct_purchase_count: 0,
    approval_mode_count: 0
  });

  // Action status / notes
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(false);

  // Modals for Actions
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [customDocNotes, setCustomDocNotes] = useState('');

  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

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

  // PDF download loading state
  const [downloadingId, setDownloadingId] = useState<number | string | null>(null);

  // Fetch unique courses for filter
  const fetchCourses = async () => {
    try {
      const res = await fetch('/api/courses');
      if (res.ok) {
        const data = await res.json();
        setCoursesList(data.map((c: any) => ({ id: c.id, nombre: c.nombre || c.name })));
      }
    } catch (e) {
      console.warn('Could not load course list for filter:', e);
    }
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.append('q', searchTerm.trim());
      if (statusFilter !== 'ALL') params.append('estado_solicitud', statusFilter);
      if (modalityFilter !== 'ALL') params.append('modalidad_inscripcion', modalityFilter);
      if (paymentFilter !== 'ALL') params.append('estado_pago', paymentFilter);
      if (enrollmentFilter !== 'ALL') params.append('estado_matricula', enrollmentFilter);
      if (courseFilter !== 'ALL') params.append('course', courseFilter);

      const res = await fetch(`/api/admin/inscriptions?${params.toString()}`);
      const data = await res.json();

      if (res.ok) {
        setRequests(data.requests || []);
        setKpis({
          total_count: data.total_count || 0,
          pending_count: data.pending_count || 0,
          review_count: data.review_count || 0,
          docs_count: data.docs_count || 0,
          preapproved_count: data.preapproved_count || 0,
          rejected_count: data.rejected_count || 0,
          direct_purchase_count: data.direct_purchase_count || 0,
          approval_mode_count: data.approval_mode_count || 0
        });
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
    fetchCourses();
  }, []);

  useEffect(() => {
    if (activeTab === 'inscripciones') {
      fetchRequests();
    } else if (activeTab === 'trabaja') {
      fetchWorkApps();
    } else if (activeTab === 'bolsa') {
      fetchEmploymentPool();
    }
  }, [activeTab, searchTerm, statusFilter, modalityFilter, paymentFilter, enrollmentFilter, courseFilter]);

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
    setReplySubject(`Información referente a tu Solicitud de Inscripción ${req.request_number} — Academias Péndulo`);
    setReplyMessage('');
    setReplySuccess(null);
    setResendEmailResult(null);

    try {
      const res = await fetch(`/api/admin/inscriptions/${req.id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedRequest(data.request);
        setMessages(data.messages || []);
        setNotes(data.request.secretary_notes || '');
      }
      fetchHistory(req.id);
    } catch (err) {
      console.error('Error fetching request detail:', err);
    }
  };

  const handleDownloadInscriptionPdf = async (reqId: number, reqNumber: string) => {
    setDownloadingId(reqId);
    try {
      const res = await fetch(`/api/admin/inscriptions/${reqId}/pdf`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Error al descargar el documento PDF.');
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `solicitud_${reqNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      console.error('Download inscription PDF error:', e);
      alert('Error de conexión al descargar el PDF.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleViewInscriptionPdf = async (reqId: number) => {
    try {
      const res = await fetch(`/api/admin/inscriptions/${reqId}/pdf`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Error al abrir el PDF.');
        return;
      }
      const blob = await res.blob();
      const fileUrl = window.URL.createObjectURL(blob);
      window.open(fileUrl, '_blank');
    } catch (e) {
      console.error('View PDF error:', e);
      alert('Error al abrir el visor de PDF.');
    }
  };

  const handleDownloadCv = async (appId: string, filename: string) => {
    setDownloadingId(appId);
    try {
      const res = await fetch(`/api/admin/work-with-us/${appId}/cv`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Error al descargar el CV.');
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'CV.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      console.error('Download CV error:', e);
      alert('Error al descargar el currículum.');
    } finally {
      setDownloadingId(null);
    }
  };

  // State Transition 1: Iniciar Revisión
  const handleStartReview = async () => {
    if (!selectedRequest) return;
    setActionInProgress(true);
    try {
      const res = await fetch(`/api/admin/inscriptions/${selectedRequest.id}/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await openDetail(selectedRequest);
        fetchRequests();
      } else {
        alert(data.error || 'No se pudo iniciar la revisión.');
      }
    } catch (err) {
      console.error('Error starting review:', err);
      alert('Error de conexión al iniciar la revisión.');
    } finally {
      setActionInProgress(false);
    }
  };

  // State Transition 2: Solicitar Documentación
  const handleConfirmRequestDocs = async () => {
    if (!selectedRequest) return;
    if (selectedDocs.length === 0) {
      alert('Seleccione al menos un documento a solicitar.');
      return;
    }
    setActionInProgress(true);
    try {
      const res = await fetch(`/api/admin/inscriptions/${selectedRequest.id}/request-docs`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentos: selectedDocs,
          observaciones: customDocNotes
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsDocModalOpen(false);
        setSelectedDocs([]);
        setCustomDocNotes('');
        await openDetail(selectedRequest);
        fetchRequests();
      } else {
        alert(data.error || 'No se pudo solicitar la documentación.');
      }
    } catch (err) {
      console.error('Error requesting docs:', err);
      alert('Error de conexión al solicitar documentación.');
    } finally {
      setActionInProgress(false);
    }
  };

  // State Transition 3: Preaprobar Solicitud
  const handlePreapprove = async () => {
    if (!selectedRequest) return;
    const confirmPre = window.confirm(
      `¿Desea preaprobar académicamente la solicitud de ${selectedRequest.first_name} ${selectedRequest.last_name_1}?\n\n` +
      `IMPORTANTE:\nLa preaprobación académica autoriza al alumno a proceder al pago del curso cuando la pasarela esté habilitada.\n` +
      `NO activa automáticamente el acceso al Campus Virtual.`
    );
    if (!confirmPre) return;

    setActionInProgress(true);
    try {
      const res = await fetch(`/api/admin/inscriptions/${selectedRequest.id}/preapprove`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await openDetail(selectedRequest);
        fetchRequests();
      } else {
        alert(data.error || 'No se pudo preaprobar la solicitud.');
      }
    } catch (err) {
      console.error('Error preapproving request:', err);
      alert('Error de conexión al preaprobar la solicitud.');
    } finally {
      setActionInProgress(false);
    }
  };

  // State Transition 4: Rechazar Solicitud
  const handleConfirmReject = async () => {
    if (!selectedRequest) return;
    if (!rejectReason.trim()) {
      alert('Por favor especifique el motivo del rechazo.');
      return;
    }
    setActionInProgress(true);
    try {
      const res = await fetch(`/api/admin/inscriptions/${selectedRequest.id}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo: rejectReason.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsRejectModalOpen(false);
        setRejectReason('');
        await openDetail(selectedRequest);
        fetchRequests();
      } else {
        alert(data.error || 'No se pudo rechazar la solicitud.');
      }
    } catch (err) {
      console.error('Error rejecting request:', err);
      alert('Error de conexión al rechazar la solicitud.');
    } finally {
      setActionInProgress(false);
    }
  };

  // State Transition 5: Cancelar Solicitud
  const handleCancelRequest = async () => {
    if (!selectedRequest) return;
    const confirmCancel = window.confirm(
      `¿Desea cancelar la solicitud ${selectedRequest.request_number}?\nEsta acción marcará la solicitud como cancelada.`
    );
    if (!confirmCancel) return;

    setActionInProgress(true);
    try {
      const res = await fetch(`/api/admin/inscriptions/${selectedRequest.id}/cancel`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await openDetail(selectedRequest);
        fetchRequests();
      } else {
        alert(data.error || 'No se pudo cancelar la solicitud.');
      }
    } catch (err) {
      console.error('Error cancelling request:', err);
      alert('Error de conexión al cancelar la solicitud.');
    } finally {
      setActionInProgress(false);
    }
  };

  // Save Secretary Internal Notes
  const handleSaveNotes = async () => {
    if (!selectedRequest) return;
    setSavingNotes(true);
    try {
      const res = await fetch(`/api/admin/inscriptions/${selectedRequest.id}/notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSelectedRequest(prev => prev ? { ...prev, secretary_notes: notes } : null);
        fetchRequests();
        fetchHistory(selectedRequest.id);
        alert('Notas guardadas correctamente.');
      } else {
        alert(data.error || 'No se pudieron guardar las notas.');
      }
    } catch (err) {
      console.error('Error saving notes:', err);
      alert('Error de conexión al guardar las notas.');
    } finally {
      setSavingNotes(false);
    }
  };

  // Send Email Reply
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
        
        const detailRes = await fetch(`/api/admin/inscriptions/${selectedRequest.id}`);
        if (detailRes.ok) {
          const detailData = await detailRes.json();
          setMessages(detailData.messages || []);
          setSelectedRequest(detailData.request);
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

  // Badge helpers
  const getModalityBadge = (mod?: string) => {
    if (mod === 'COMPRA_DIRECTA') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
          <Zap className="w-3 h-3 text-indigo-600" />
          Compra Directa
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
        <FileCheck className="w-3 h-3 text-amber-600" />
        Con Aprobación
      </span>
    );
  };

  const getEstadoSolicitudBadge = (st?: string) => {
    const val = st || 'NUEVA';
    switch (val) {
      case 'NUEVA':
      case 'Nueva':
        return (
          <span className="bg-red-100 text-red-800 border border-red-200 px-2.5 py-1 rounded-full font-black text-xs flex items-center gap-1 animate-pulse">
            <Clock className="w-3 h-3" /> NUEVA
          </span>
        );
      case 'EN_REVISION':
      case 'En revisión':
        return (
          <span className="bg-amber-100 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-full font-bold text-xs flex items-center gap-1">
            <Eye className="w-3 h-3" /> EN REVISIÓN
          </span>
        );
      case 'PENDIENTE_DOCUMENTACION':
      case 'Pendiente de documentación':
        return (
          <span className="bg-orange-100 text-orange-900 border border-orange-200 px-2.5 py-1 rounded-full font-bold text-xs flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-orange-600" /> DOC. PENDIENTE
          </span>
        );
      case 'PREAPROBADA':
      case 'Aceptada':
        return (
          <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-full font-black text-xs flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> PREAPROBADA
          </span>
        );
      case 'RECHAZADA':
      case 'Rechazada':
        return (
          <span className="bg-rose-100 text-rose-800 border border-rose-200 px-2.5 py-1 rounded-full font-bold text-xs flex items-center gap-1">
            <XCircle className="w-3 h-3" /> RECHAZADA
          </span>
        );
      case 'CANCELADA':
      case 'Cerrada':
        return (
          <span className="bg-gray-100 text-gray-700 border border-gray-200 px-2.5 py-1 rounded-full font-bold text-xs flex items-center gap-1">
            CANCELADA
          </span>
        );
      default:
        return <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full font-bold text-xs">{val}</span>;
    }
  };

  const getEstadoPagoBadge = (st?: string) => {
    const val = st || 'NO_INICIADO';
    switch (val) {
      case 'NO_INICIADO':
        return <span className="bg-gray-100 text-gray-600 border border-gray-200 px-2 py-0.5 rounded text-[11px] font-semibold">No Iniciado</span>;
      case 'PENDIENTE':
        return <span className="bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded text-[11px] font-bold">Pendiente</span>;
      case 'EN_PROCESO':
        return <span className="bg-blue-100 text-blue-800 border border-blue-200 px-2 py-0.5 rounded text-[11px] font-bold">En Proceso</span>;
      case 'CONFIRMADO_PROVEEDOR':
        return <span className="bg-indigo-100 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded text-[11px] font-black">Confirmado Proveedor</span>;
      case 'PENDIENTE_VERIFICACION_ADMINISTRATIVA':
        return <span className="bg-purple-100 text-purple-800 border border-purple-200 px-2 py-0.5 rounded text-[11px] font-black">Pend. Verif. Admin</span>;
      case 'VERIFICADO_ADMINISTRACION':
        return <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded text-[11px] font-black">Verificado Admin</span>;
      case 'FALLIDO':
        return <span className="bg-rose-100 text-rose-800 border border-rose-200 px-2 py-0.5 rounded text-[11px] font-bold">Fallido</span>;
      case 'CANCELADO':
        return <span className="bg-gray-100 text-gray-700 border border-gray-200 px-2 py-0.5 rounded text-[11px]">Cancelado</span>;
      case 'REEMBOLSADO':
        return <span className="bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded text-[11px]">Reembolsado</span>;
      default:
        return <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-[11px] font-medium">{val}</span>;
    }
  };

  const getEstadoMatriculaBadge = (st?: string) => {
    const val = st || 'PENDIENTE';
    switch (val) {
      case 'PENDIENTE':
        return <span className="bg-gray-100 text-gray-700 border border-gray-200 px-2 py-0.5 rounded text-[11px] font-medium">Pendiente</span>;
      case 'PENDIENTE_APROBACION_FINAL':
        return <span className="bg-purple-100 text-purple-800 border border-purple-200 px-2 py-0.5 rounded text-[11px] font-black">Pend. Aprobación Final</span>;
      case 'ACTIVA':
        return <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded text-[11px] font-black flex items-center gap-1"><UserCheck className="w-3 h-3 text-emerald-600" /> ACTIVA</span>;
      case 'RECHAZADA':
        return <span className="bg-rose-100 text-rose-800 border border-rose-200 px-2 py-0.5 rounded text-[11px] font-semibold">Rechazada</span>;
      case 'CANCELADA':
        return <span className="bg-gray-100 text-gray-700 border border-gray-200 px-2 py-0.5 rounded text-[11px]">Cancelada</span>;
      case 'FINALIZADA':
        return <span className="bg-blue-100 text-blue-800 border border-blue-200 px-2 py-0.5 rounded text-[11px] font-bold">Finalizada</span>;
      default:
        return <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-[11px] font-medium">{val}</span>;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-950 to-black text-white p-6 rounded-2xl shadow-xl border border-gray-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Secretaría → Gestión de Solicitudes de Admisión y Matrícula
            </h1>
            {kpis.pending_count > 0 && (
              <span className="bg-red-600 text-white text-xs font-black px-3 py-1 rounded-full shadow-lg animate-bounce">
                {kpis.pending_count} Nuevas
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Gestión completa del recorrido de aspirantes: admisión, modalidades privada de pago, revisión de requisitos y aprobación final de matrícula.
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

      {/* KPI Counters Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs">
          <div className="text-[10px] font-bold text-gray-400 uppercase">Total Solicitudes</div>
          <div className="text-xl font-black text-gray-900 mt-0.5">{kpis.total_count}</div>
        </div>
        <div className="bg-red-50 p-3.5 rounded-xl border border-red-200 shadow-xs">
          <div className="text-[10px] font-bold text-red-600 uppercase">Nuevas (Pendientes)</div>
          <div className="text-xl font-black text-red-700 mt-0.5">{kpis.pending_count}</div>
        </div>
        <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200 shadow-xs">
          <div className="text-[10px] font-bold text-amber-600 uppercase">En Revisión</div>
          <div className="text-xl font-black text-amber-700 mt-0.5">{kpis.review_count}</div>
        </div>
        <div className="bg-orange-50 p-3.5 rounded-xl border border-orange-200 shadow-xs">
          <div className="text-[10px] font-bold text-orange-600 uppercase">Doc. Pendiente</div>
          <div className="text-xl font-black text-orange-700 mt-0.5">{kpis.docs_count}</div>
        </div>
        <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200 shadow-xs">
          <div className="text-[10px] font-bold text-emerald-600 uppercase">Preaprobadas</div>
          <div className="text-xl font-black text-emerald-700 mt-0.5">{kpis.preapproved_count}</div>
        </div>
        <div className="bg-indigo-50 p-3.5 rounded-xl border border-indigo-200 shadow-xs">
          <div className="text-[10px] font-bold text-indigo-600 uppercase">Compra Directa</div>
          <div className="text-xl font-black text-indigo-700 mt-0.5">{kpis.direct_purchase_count}</div>
        </div>
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
          <span>Solicitudes de Admisión & Matrícula</span>
          {kpis.pending_count > 0 && (
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-white/25 text-white font-black">
              {kpis.pending_count}
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
          {/* Multi-Filters & Search Bar */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 space-y-3">
            <div className="flex flex-col md:flex-row gap-3 items-center">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  placeholder="Buscar por Aspirante, DNI/NIE, Email, Teléfono, Nº Solicitud (PEN-2026-...) o Curso..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 font-medium"
                />
              </div>

              {/* Reset Filters button */}
              {(statusFilter !== 'ALL' || modalityFilter !== 'ALL' || paymentFilter !== 'ALL' || enrollmentFilter !== 'ALL' || courseFilter !== 'ALL' || searchTerm) && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('ALL');
                    setModalityFilter('ALL');
                    setPaymentFilter('ALL');
                    setEnrollmentFilter('ALL');
                    setCourseFilter('ALL');
                  }}
                  className="px-3 py-2 text-xs text-red-600 hover:text-red-800 font-bold hover:underline shrink-0"
                >
                  Limpiar filtros
                </button>
              )}
            </div>

            {/* Filter Dropdowns Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-2 border-t border-gray-100 text-xs">
              
              {/* Filter 1: Estado Solicitud */}
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Estado Solicitud</label>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold text-gray-800 bg-gray-50"
                >
                  <option value="ALL">Todos los estados</option>
                  <option value="NUEVA">NUEVA</option>
                  <option value="EN_REVISION">EN REVISIÓN</option>
                  <option value="PENDIENTE_DOCUMENTACION">PENDIENTE DOC.</option>
                  <option value="PREAPROBADA">PREAPROBADA</option>
                  <option value="RECHAZADA">RECHAZADA</option>
                  <option value="CANCELADA">CANCELADA</option>
                </select>
              </div>

              {/* Filter 2: Modalidad */}
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Tipo Inscripción</label>
                <select
                  value={modalityFilter}
                  onChange={e => setModalityFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold text-gray-800 bg-gray-50"
                >
                  <option value="ALL">Todas las modalidades</option>
                  <option value="COMPRA_DIRECTA">Modalidad A: Compra Directa</option>
                  <option value="SOLICITUD_APROBACION">Modalidad B: Con Aprobación</option>
                </select>
              </div>

              {/* Filter 3: Estado Pago */}
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Situación de Pago</label>
                <select
                  value={paymentFilter}
                  onChange={e => setPaymentFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold text-gray-800 bg-gray-50"
                >
                  <option value="ALL">Todos los pagos</option>
                  <option value="NO_INICIADO">No Iniciado</option>
                  <option value="PENDIENTE">Pendiente</option>
                  <option value="CONFIRMADO_PROVEEDOR">Confirmado Proveedor</option>
                  <option value="PENDIENTE_VERIFICACION_ADMINISTRATIVA">Pend. Verif. Admin</option>
                  <option value="VERIFICADO_ADMINISTRACION">Verificado Admin</option>
                  <option value="FALLIDO">Fallido</option>
                </select>
              </div>

              {/* Filter 4: Estado Matrícula */}
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Estado Matrícula</label>
                <select
                  value={enrollmentFilter}
                  onChange={e => setEnrollmentFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold text-gray-800 bg-gray-50"
                >
                  <option value="ALL">Todas las matrículas</option>
                  <option value="PENDIENTE">Pendiente</option>
                  <option value="PENDIENTE_APROBACION_FINAL">Pend. Aprobación Final</option>
                  <option value="ACTIVA">ACTIVA (En Campus)</option>
                  <option value="RECHAZADA">Rechazada</option>
                  <option value="CANCELADA">Cancelada</option>
                </select>
              </div>

              {/* Filter 5: Curso */}
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Filtrar por Curso</label>
                <select
                  value={courseFilter}
                  onChange={e => setCourseFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold text-gray-800 bg-gray-50 truncate"
                >
                  <option value="ALL">Todos los cursos</option>
                  {coursesList.map(c => (
                    <option key={c.id} value={c.nombre}>{c.nombre}</option>
                  ))}
                </select>
              </div>

            </div>
          </div>

          {/* Inscriptions Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-gray-500 text-sm font-semibold flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                Cargando solicitudes de admisión y matrículas...
              </div>
            ) : requests.length === 0 ? (
              <div className="p-12 text-center text-gray-500 space-y-2">
                <FileText className="w-10 h-10 text-gray-300 mx-auto" />
                <p className="font-bold text-base text-gray-700">No se encontraron solicitudes</p>
                <p className="text-xs text-gray-500">Pruebe a cambiar los términos de búsqueda o los filtros seleccionados.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-600">
                  <thead className="bg-gray-50 border-b border-gray-200 text-[11px] uppercase tracking-wider font-extrabold text-gray-700">
                    <tr>
                      <th className="p-3.5">N.º Solicitud</th>
                      <th className="p-3.5">Fecha</th>
                      <th className="p-3.5">Aspirante</th>
                      <th className="p-3.5">DNI / NIE</th>
                      <th className="p-3.5">Curso</th>
                      <th className="p-3.5">Modalidad</th>
                      <th className="p-3.5 text-center">Estado Solicitud</th>
                      <th className="p-3.5 text-center">Estado Pago</th>
                      <th className="p-3.5 text-center">Matrícula</th>
                      <th className="p-3.5 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {requests.map(req => (
                      <tr key={req.id} className="hover:bg-red-50/30 transition-colors">
                        <td className="p-3.5 font-black text-gray-900 whitespace-nowrap">
                          <span className="text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md font-mono text-[11px]">
                            {req.request_number}
                          </span>
                        </td>
                        <td className="p-3.5 whitespace-nowrap text-gray-500 text-[11px]">
                          <div>{new Date(req.created_at).toLocaleDateString('es-ES')}</div>
                          <div className="text-[10px] text-gray-400">{new Date(req.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</div>
                        </td>
                        <td className="p-3.5 font-bold text-gray-900 whitespace-nowrap">
                          <div>{req.first_name} {req.last_name_1} {req.last_name_2 || ''}</div>
                          <div className="text-[11px] font-normal text-gray-500 flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3 text-gray-400" />
                            <span>{req.email}</span>
                          </div>
                        </td>
                        <td className="p-3.5 font-mono font-bold text-gray-700 whitespace-nowrap">
                          <span className="bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                            {req.dni_nie}
                          </span>
                        </td>
                        <td className="p-3.5 font-semibold text-gray-900 max-w-xs truncate" title={req.course_name}>
                          <div>{req.course_name}</div>
                          {req.course_code && (
                            <div className="text-[10px] font-mono text-gray-400">{req.course_code}</div>
                          )}
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          {getModalityBadge(req.modalidad_inscripcion)}
                        </td>
                        <td className="p-3.5 text-center whitespace-nowrap">
                          {getEstadoSolicitudBadge(req.estado_solicitud || req.status)}
                        </td>
                        <td className="p-3.5 text-center whitespace-nowrap">
                          {getEstadoPagoBadge(req.estado_pago)}
                        </td>
                        <td className="p-3.5 text-center whitespace-nowrap">
                          {getEstadoMatriculaBadge(req.estado_matricula)}
                        </td>
                        <td className="p-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center gap-1.5 justify-end">
                            <button
                              onClick={() => openDetail(req)}
                              className="px-3 py-1.5 bg-gray-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Ver Ficha</span>
                            </button>
                            {(req.status === 'Rechazada' || req.estado_solicitud === 'RECHAZADA' || req.status === 'Cerrada' || req.estado_solicitud === 'CANCELADA') && (
                              <button
                                onClick={() => { setDeleteTarget(req); setDeleteError(null); }}
                                className="px-2 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all"
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
                            <button
                              type="button"
                              onClick={() => handleDownloadCv(app.id, app.cv_nombre)}
                              disabled={downloadingId === app.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span className="truncate max-w-[150px]">{downloadingId === app.id ? 'Descargando...' : app.cv_nombre}</span>
                            </button>
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
                  <button
                    type="button"
                    onClick={() => handleDownloadCv(selectedWorkApp.id, selectedWorkApp.cv_nombre)}
                    disabled={downloadingId === selectedWorkApp.id}
                    className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" />
                    <span>{downloadingId === selectedWorkApp.id ? 'Descargando...' : `Descargar ${selectedWorkApp.cv_nombre}`}</span>
                  </button>
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

      {/* ─── MODAL ACCIÓN: SOLICITAR DOCUMENTACIÓN ────────────────────── */}
      {isDocModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-[70] overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden space-y-4">
            <div className="bg-orange-600 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-black text-base">Solicitar Documentación</h3>
                  <p className="text-xs text-orange-100">Expediente {selectedRequest.request_number} — {selectedRequest.first_name} {selectedRequest.last_name_1}</p>
                </div>
              </div>
              <button onClick={() => setIsDocModalOpen(false)} className="text-white hover:text-orange-200 font-bold">✕</button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-gray-600 font-medium">
                Seleccione qué documentos debe aportar el aspirante para continuar con la tramitación de su admisión:
              </p>

              <div className="space-y-2 bg-gray-50 p-4 rounded-xl border border-gray-200">
                {[
                  'Documento Nacional de Identidad (DNI) o NIE en vigor',
                  'Titulación académica oficial o certificado de estudios requeridos',
                  'Certificados acreditativos de formación complementaria',
                  'Informe de Vida Laboral actualizado o certificado de empresa',
                  'Acreditación de carnet de conducir o habilitación específica'
                ].map(docItem => (
                  <label key={docItem} className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={selectedDocs.includes(docItem)}
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedDocs([...selectedDocs, docItem]);
                        } else {
                          setSelectedDocs(selectedDocs.filter(d => d !== docItem));
                        }
                      }}
                      className="mt-0.5 rounded text-orange-600 focus:ring-orange-500"
                    />
                    <span className="font-semibold text-gray-800">{docItem}</span>
                  </label>
                ))}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                  Instrucciones o detalles adicionales para el aspirante (Opcional):
                </label>
                <textarea
                  rows={3}
                  value={customDocNotes}
                  onChange={e => setCustomDocNotes(e.target.value)}
                  placeholder="Ej: Por favor adjunte el anverso y reverso del título en formato PDF legible..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-amber-600" />
                  Notificación al aspirante
                </p>
                <p className="text-[11px] text-amber-800">
                  La solicitud pasará a estado <strong>PENDIENTE DE DOCUMENTACIÓN</strong> y el alumno recibirá un correo electrónico con la lista de documentos requeridos y las instrucciones de entrega.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDocModalOpen(false)}
                  disabled={actionInProgress}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRequestDocs}
                  disabled={actionInProgress || selectedDocs.length === 0}
                  className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-black flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {actionInProgress ? 'Guardando...' : 'Requerir Documentación'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL ACCIÓN: RECHAZAR SOLICITUD ─────────────────────────── */}
      {isRejectModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-[70] overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden space-y-4">
            <div className="bg-rose-600 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-black text-base">Rechazar Solicitud</h3>
                  <p className="text-xs text-rose-100">{selectedRequest.request_number} — {selectedRequest.first_name}</p>
                </div>
              </div>
              <button onClick={() => setIsRejectModalOpen(false)} className="text-white hover:text-rose-200 font-bold">✕</button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-gray-700 font-medium">
                Indique el motivo administrativo o académico por el cual se rechaza esta solicitud. Este motivo quedará registrado en el expediente y se notificará al alumno:
              </p>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                  Motivo de rechazo *
                </label>
                <textarea
                  rows={4}
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="Ej: No cumple con los requisitos académicos mínimos de titulación exigidos para esta especialidad..."
                  className="w-full px-3 py-2 rounded-xl border border-rose-300 text-xs focus:ring-2 focus:ring-rose-500"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRejectModalOpen(false)}
                  disabled={actionInProgress}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReject}
                  disabled={actionInProgress || !rejectReason.trim()}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {actionInProgress ? 'Procesando...' : 'Confirmar Rechazo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── FICHA DETALLADA DE SOLICITUD (DRAWER / MODAL) ─────────────── */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
          <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100 my-6">
            
            {/* Modal Header */}
            <div className="bg-gray-950 text-white p-4 sm:p-6 border-b border-gray-800 flex justify-between items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                    Expediente: {selectedRequest.request_number}
                  </h2>
                  {getEstadoSolicitudBadge(selectedRequest.estado_solicitud || selectedRequest.status)}
                  {getModalityBadge(selectedRequest.modalidad_inscripcion)}
                </div>
                <p className="text-xs text-gray-400 mt-1">
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

            {/* Modal Body: Organized in 7 Clear Mandatory Blocks */}
            <div className="p-4 sm:p-6 max-h-[80vh] overflow-y-auto space-y-6">
              
              {/* PDF Actions & Direct Quick Banner */}
              <div className="bg-gradient-to-r from-red-50 via-white to-gray-50 border border-red-100 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold shrink-0 shadow-md">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-red-900">Documento Oficial PDF de Inscripción Generado</p>
                    <p className="text-[11px] text-red-700">Archivado de forma segura en almacenamiento privado del servidor.</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => handleViewInscriptionPdf(selectedRequest.id)}
                    className="flex-1 sm:flex-none px-4 py-2 bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-red-600" />
                    <span>Ver PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownloadInscriptionPdf(selectedRequest.id, selectedRequest.request_number)}
                    disabled={downloadingId === selectedRequest.id}
                    className="flex-1 sm:flex-none px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{downloadingId === selectedRequest.id ? 'Descargando...' : 'Descargar PDF'}</span>
                  </button>
                </div>
              </div>

              {/* ─── BLOQUE 1: DATOS PERSONALES ─────────────────────────────── */}
              <div className="bg-gray-50 p-4 sm:p-5 rounded-xl border border-gray-200 space-y-3">
                <h3 className="font-extrabold text-gray-900 text-sm flex items-center gap-2 border-b border-gray-200 pb-2">
                  <User className="w-4 h-4 text-red-600" />
                  1. Datos Personales del Solicitante
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs text-gray-700">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Nombre completo</span>
                    <span className="font-bold text-gray-900 text-sm">{selectedRequest.first_name} {selectedRequest.last_name_1} {selectedRequest.last_name_2 || ''}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">DNI / NIE</span>
                    <span className="font-mono bg-white px-2 py-0.5 rounded border border-gray-300 font-bold text-gray-900">{selectedRequest.dni_nie}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Fecha de nacimiento</span>
                    <span className="font-semibold">{selectedRequest.birth_date ? new Date(selectedRequest.birth_date).toLocaleDateString('es-ES') : '---'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Teléfono de contacto</span>
                    <a href={`tel:${selectedRequest.phone}`} className="text-red-600 font-bold hover:underline flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {selectedRequest.phone}
                    </a>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Correo electrónico</span>
                    <a href={`mailto:${selectedRequest.email}`} className="text-red-600 font-bold hover:underline flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {selectedRequest.email}
                    </a>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Situación Laboral</span>
                    <span className="uppercase font-bold text-gray-900 bg-white px-2 py-0.5 rounded border border-gray-200">{selectedRequest.employment_status || '---'}</span>
                  </div>
                  <div className="sm:col-span-2 lg:col-span-3">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Dirección postal</span>
                    <span className="text-gray-800">{selectedRequest.address || '---'}, {selectedRequest.postal_code || ''} {selectedRequest.city || ''} ({selectedRequest.province || ''})</span>
                  </div>
                </div>
              </div>

              {/* ─── BLOQUE 2: INFORMACIÓN ACADÉMICA ───────────────────────── */}
              <div className="bg-gray-50 p-4 sm:p-5 rounded-xl border border-gray-200 space-y-3">
                <h3 className="font-extrabold text-gray-900 text-sm flex items-center gap-2 border-b border-gray-200 pb-2">
                  <GraduationCap className="w-4 h-4 text-red-600" />
                  2. Información Académica Declarada
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-gray-700">
                  <div className="space-y-2">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-400 block">Nivel de estudios finalizados</span>
                      <span className="font-bold text-gray-900 bg-white px-2.5 py-1 rounded-md border border-gray-200 inline-block mt-0.5">
                        {selectedRequest.academic_level
                          ? (getAcademicLevelLabel(selectedRequest.academic_level) || selectedRequest.academic_level)
                          : 'No especificado'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-400 block">Estudios o titulación</span>
                      <span className="font-semibold text-gray-900">{selectedRequest.academic_degree || 'No especificado'}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Formación complementaria y cursos previos</span>
                    <div className="bg-white p-3 rounded-lg border border-gray-200 text-gray-800 whitespace-pre-wrap min-h-[60px]">
                      {selectedRequest.additional_training || 'Sin formación complementaria indicada.'}
                    </div>
                  </div>
                </div>

                {/* Consent & Declarations */}
                <div className="pt-2 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-gray-600">
                  <div className="flex items-center gap-1.5">
                    {selectedRequest.truth_declaration ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-gray-300" />}
                    <span>Declaración de veracidad</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {selectedRequest.privacy_acceptance ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-gray-300" />}
                    <span>Aceptación RGPD / Privacidad</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-gray-700">Firma:</span>
                    <span className="italic font-serif font-bold text-red-700">{selectedRequest.signature_name}</span>
                  </div>
                </div>
              </div>

              {/* ─── BLOQUE 3: CURSO SOLICITADO Y SNAPSHOT COMERCIAL ────────── */}
              <div className="bg-gray-50 p-4 sm:p-5 rounded-xl border border-gray-200 space-y-3">
                <h3 className="font-extrabold text-gray-900 text-sm flex items-center gap-2 border-b border-gray-200 pb-2">
                  <BookOpen className="w-4 h-4 text-red-600" />
                  3. Curso Solicitado y Condiciones Comerciales (Snapshot Histórico)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="sm:col-span-2 space-y-1.5">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-400 block">Curso Solicitado</span>
                      <span className="font-black text-red-600 text-base">{selectedRequest.course_name}</span>
                    </div>
                    <div className="flex gap-4 text-gray-600 text-[11px]">
                      <span><strong>Código:</strong> {selectedRequest.course_code || '---'}</span>
                      <span><strong>Centro:</strong> {selectedRequest.center}</span>
                      <span><strong>Convocatoria:</strong> {selectedRequest.edition}</span>
                    </div>
                    <div className="pt-1">
                      <span className="text-[10px] uppercase font-bold text-gray-400 block">Modalidad de Inscripción Fijada</span>
                      {getModalityBadge(selectedRequest.modalidad_inscripcion)}
                    </div>
                  </div>

                  {/* Pricing snapshot card */}
                  <div className="bg-white p-3.5 rounded-xl border border-gray-200 space-y-2 shadow-xs">
                    <div className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Tarifa Aceptada al Solicitar</div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between text-gray-600">
                        <span>Base imponible:</span>
                        <span className="font-mono font-bold">{selectedRequest.precio_base_snapshot != null ? `${Number(selectedRequest.precio_base_snapshot).toFixed(2)} €` : '---'}</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>IVA ({selectedRequest.tipo_iva_snapshot || '21%'}):</span>
                        <span className="font-mono">{selectedRequest.importe_iva_snapshot != null ? `${Number(selectedRequest.importe_iva_snapshot).toFixed(2)} €` : '---'}</span>
                      </div>
                      <div className="pt-1 border-t border-gray-200 flex justify-between font-black text-gray-900 text-sm">
                        <span>Precio Final:</span>
                        <span className="text-red-600 font-mono">{selectedRequest.precio_final_snapshot != null ? `${Number(selectedRequest.precio_final_snapshot).toFixed(2)} €` : 'Pendiente de tarificación'}</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-400 italic mt-1 leading-tight">
                      * Este precio está congelado e inmune a futuras modificaciones comerciales del catálogo.
                    </p>
                  </div>
                </div>
              </div>

              {/* ─── BLOQUE 4: DOCUMENTACIÓN APORTADA & REQUERIDA ──────────── */}
              <div className="bg-gray-50 p-4 sm:p-5 rounded-xl border border-gray-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200 pb-2">
                  <h3 className="font-extrabold text-gray-900 text-sm flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-red-600" />
                    4. Documentación Aportada & Requerida
                  </h3>
                  
                  {/* Action button to open Request Docs Modal */}
                  {(selectedRequest.estado_solicitud !== 'RECHAZADA' && selectedRequest.estado_solicitud !== 'CANCELADA') && (
                    <button
                      type="button"
                      onClick={() => setIsDocModalOpen(true)}
                      className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-lg shadow-xs flex items-center gap-1.5 transition-all self-start sm:self-auto"
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Requerir Documentación al Alumno</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Documentos Solicitados por Secretaría:</span>
                    {selectedRequest.documentos_requeridos ? (
                      <div className="bg-orange-50/70 border border-orange-200 p-3 rounded-lg text-orange-950 space-y-1">
                        <p className="font-bold text-[11px] text-orange-900">Documentos marcados como pendientes:</p>
                        <p className="whitespace-pre-wrap">{selectedRequest.documentos_requeridos}</p>
                      </div>
                    ) : (
                      <p className="text-gray-500 italic bg-white p-3 rounded-lg border border-gray-200">
                        No se ha requerido documentación adicional para esta solicitud.
                      </p>
                    )}
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Documentos Aportados / Archivo Digital:</span>
                    <div className="bg-white p-3 rounded-lg border border-gray-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-gray-800">1. Formulario Oficial PDF</span>
                        <button
                          type="button"
                          onClick={() => handleViewInscriptionPdf(selectedRequest.id)}
                          className="text-red-600 hover:underline font-bold text-[11px]"
                        >
                          Ver documento
                        </button>
                      </div>
                      {selectedRequest.documentos_aportados ? (
                        <div className="pt-2 border-t border-gray-100 text-gray-700">
                          {selectedRequest.documentos_aportados}
                        </div>
                      ) : (
                        <p className="text-[11px] text-gray-400 italic">
                          El aspirante no ha subido aún archivos complementarios adicionales.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ─── BLOQUE 5: REVISIÓN DE SECRETARÍA & ACCIONES DE ESTADO ─── */}
              <div className="bg-amber-50/50 p-4 sm:p-5 rounded-xl border border-amber-200 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200 pb-2">
                  <h3 className="font-black text-amber-950 text-sm flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                    5. Revisión Administrativa de Secretaría
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-600">Estado actual:</span>
                    {getEstadoSolicitudBadge(selectedRequest.estado_solicitud || selectedRequest.status)}
                  </div>
                </div>

                {/* State Explanatory & Guidance Box */}
                <div className="bg-white p-3.5 rounded-xl border border-amber-200 text-xs space-y-1.5">
                  <p className="font-bold text-gray-900">
                    {selectedRequest.estado_solicitud === 'NUEVA' && '⚡ Solicitud Nueva: Requiere revisión inicial de requisitos o pase directo a preaprobación.'}
                    {selectedRequest.estado_solicitud === 'EN_REVISION' && '🔍 Solicitud En Revisión: Secretaría está analizando los datos aportados por el aspirante.'}
                    {selectedRequest.estado_solicitud === 'PENDIENTE_DOCUMENTACION' && '⏳ Documentación Pendiente: El aspirante debe entregar los títulos o acreditaciones requeridas.'}
                    {selectedRequest.estado_solicitud === 'PREAPROBADA' && '✅ Solicitud Preaprobada: El aspirante está validado académicamente para proceder al pago.'}
                    {selectedRequest.estado_solicitud === 'RECHAZADA' && `❌ Solicitud Rechazada: ${selectedRequest.motivo_rechazo || 'Requisitos no cumplidos.'}`}
                    {selectedRequest.estado_solicitud === 'CANCELADA' && 'Solicitud cancelada administrativamente.'}
                  </p>
                  {selectedRequest.preaprobado_en && (
                    <p className="text-[11px] text-gray-500">
                      Preaprobada el {new Date(selectedRequest.preaprobado_en).toLocaleString('es-ES')}.
                    </p>
                  )}
                </div>

                {/* State Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  
                  {/* Action A: Iniciar Revisión */}
                  {(selectedRequest.estado_solicitud === 'NUEVA' || selectedRequest.status === 'Nueva') && (
                    <button
                      type="button"
                      onClick={handleStartReview}
                      disabled={actionInProgress}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Iniciar Revisión</span>
                    </button>
                  )}

                  {/* Action B: Preaprobar Solicitud */}
                  {(selectedRequest.estado_solicitud !== 'PREAPROBADA' && selectedRequest.estado_solicitud !== 'RECHAZADA' && selectedRequest.estado_solicitud !== 'CANCELADA') && (
                    <button
                      type="button"
                      onClick={handlePreapprove}
                      disabled={actionInProgress}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md shadow-emerald-900/10 transition-all flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Preaprobar Solicitud (Autorizar Pago)</span>
                    </button>
                  )}

                  {/* Action C: Solicitar Documentación */}
                  {(selectedRequest.estado_solicitud !== 'RECHAZADA' && selectedRequest.estado_solicitud !== 'CANCELADA') && (
                    <button
                      type="button"
                      onClick={() => setIsDocModalOpen(true)}
                      disabled={actionInProgress}
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Solicitar Documentos</span>
                    </button>
                  )}

                  {/* Action D: Rechazar Solicitud */}
                  {(selectedRequest.estado_solicitud !== 'RECHAZADA' && selectedRequest.estado_solicitud !== 'CANCELADA') && (
                    <button
                      type="button"
                      onClick={() => setIsRejectModalOpen(true)}
                      disabled={actionInProgress}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Rechazar Solicitud</span>
                    </button>
                  )}

                  {/* Action E: Cancelar Solicitud */}
                  {(selectedRequest.estado_solicitud !== 'CANCELADA') && (
                    <button
                      type="button"
                      onClick={handleCancelRequest}
                      disabled={actionInProgress}
                      className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold text-xs rounded-xl transition-all ml-auto disabled:opacity-50"
                    >
                      Cancelar Solicitud
                    </button>
                  )}

                </div>

                {/* Internal Secretary Notes */}
                <div className="pt-2 border-t border-amber-200/80 space-y-2">
                  <label className="block text-xs font-bold text-gray-800">
                    Anotaciones Internas de Secretaría (Privadas)
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Escriba aquí cualquier observación confidencial sobre el expediente del alumno..."
                    className="w-full px-3.5 py-2 rounded-xl border border-amber-300 text-xs bg-white focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    type="button"
                    onClick={handleSaveNotes}
                    disabled={savingNotes}
                    className="px-4 py-1.5 bg-gray-900 hover:bg-black text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {savingNotes ? 'Guardando...' : 'Guardar Anotaciones Internas'}
                  </button>
                </div>

                {/* CONVERT TO STUDENT SECTION (Final Administrative Approval) */}
                <div className="pt-3 border-t border-amber-200">
                  {selectedRequest.converted_to_student ? (
                    <div className="bg-purple-900/10 border border-purple-200 p-4 rounded-xl space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-200/60 pb-2">
                        <span className="bg-purple-700 text-white text-xs font-black px-3 py-1 rounded-full flex items-center gap-1.5 w-fit">
                          <UserCheck className="w-3.5 h-3.5" /> Alumno Activo en el Campus
                        </span>
                        <span className="text-[11px] text-purple-900 font-semibold">
                          Aprobado finalmente el: {selectedRequest.aprobado_final_en || selectedRequest.converted_at ? new Date(selectedRequest.aprobado_final_en || selectedRequest.converted_at!).toLocaleString('es-ES') : '---'}
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
                  ) : (selectedRequest.estado_solicitud === 'PREAPROBADA' || selectedRequest.status === 'Aceptada') ? (
                    <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Solicitud Preaprobada — Aprobación Final de Matrícula
                        </p>
                        <p className="text-[11px] text-emerald-800 mt-0.5">
                          Atención: La activación definitiva del acceso al campus requiere la aprobación final de Administración tras verificar el ingreso del curso.
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
                            <span>APROBACIÓN FINAL Y ACTIVAR ALUMNO</span>
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500 bg-gray-100 p-3 rounded-xl border border-gray-200 flex items-center justify-between">
                      <span>Para poder otorgar la aprobación final y conceder acceso al campus, la solicitud debe estar en estado <strong>PREAPROBADA</strong>.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* ─── BLOQUE 6: ESTADO ECONÓMICO Y DE PAGO ──────────────────── */}
              <div className="bg-gray-50 p-4 sm:p-5 rounded-xl border border-gray-200 space-y-3">
                <h3 className="font-extrabold text-gray-900 text-sm flex items-center gap-2 border-b border-gray-200 pb-2">
                  <CreditCard className="w-4 h-4 text-red-600" />
                  6. Estado Económico y Situación de Pago
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-xl border border-gray-200">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Estado del Pago</span>
                    <div className="mt-1">{getEstadoPagoBadge(selectedRequest.estado_pago)}</div>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-gray-200">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Estado de la Matrícula</span>
                    <div className="mt-1">{getEstadoMatriculaBadge(selectedRequest.estado_matricula)}</div>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-gray-200">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Importe Total Fijado</span>
                    <span className="font-black text-gray-900 font-mono text-base block mt-0.5">
                      {selectedRequest.precio_final_snapshot != null ? `${Number(selectedRequest.precio_final_snapshot).toFixed(2)} €` : '---'}
                    </span>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-blue-900 text-xs space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-blue-600" />
                    Modelo de Pagos — Modificación 03
                  </p>
                  <p className="text-[11px] text-blue-800">
                    La pasarela de cobro telemático se integrará en la Modificación 04. La base de datos y la gestión interna están plenamente configuradas para distinguir entre pago confirmado por el proveedor y la verificación administrativa obligatoria previa a la activación de la matrícula.
                  </p>
                </div>
              </div>

              {/* ─── BLOQUE 7: HISTORIAL DE ACTUACIONES Y AUDITORÍA ─────────── */}
              <div className="bg-gray-50 p-4 sm:p-5 rounded-xl border border-gray-200 space-y-3">
                <h3 className="font-black text-gray-900 text-sm flex items-center gap-2 border-b border-gray-200 pb-2">
                  <History className="w-4 h-4 text-red-600" />
                  7. Historial de Actuaciones y Auditoría ({history.length} eventos)
                </h3>

                {history.length === 0 ? (
                  <p className="text-xs text-gray-500 italic">No hay eventos de auditoría registrados en este expediente aún.</p>
                ) : (
                  <div className="space-y-3 relative pl-4 border-l-2 border-red-300 max-h-60 overflow-y-auto pr-1">
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

              {/* SECTION: RESPONDER AL SOLICITANTE VIA EMAIL ─────────────────── */}
              <div className="bg-gray-50 p-4 sm:p-5 rounded-xl border border-gray-200 space-y-4">
                <h3 className="font-black text-gray-900 text-sm flex items-center gap-2">
                  <Mail className="w-4 h-4 text-red-600" />
                  Comunicación con el Solicitante por Correo Electrónico
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
                        <span>Enviar Comunicación al Solicitante</span>
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

      {/* ─── MODAL COMPROBACIONES Y CONFIRMACIÓN DE CREACIÓN ALUMNO ──── */}
      {isConvertModalOpen && convertCheckData && selectedRequest && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white text-gray-900 rounded-2xl shadow-2xl max-w-xl w-full p-6 space-y-5 border border-gray-200 my-6">
            
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-600" />
                Aprobación Final de Matrícula & Activación en Campus
              </h3>
              <button onClick={() => setIsConvertModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-600">
              Esta operación otorga la aprobación administrativa final, activa la matrícula y genera las credenciales de acceso al Campus Virtual para el alumno.
            </p>

            {/* Resumen de Datos a transferir */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-xs space-y-1.5">
              <p><span className="font-bold text-gray-900">Aspirante:</span> {selectedRequest.first_name} {selectedRequest.last_name_1} {selectedRequest.last_name_2 || ''}</p>
              <p><span className="font-bold text-gray-900">DNI / NIE:</span> <span className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-gray-300">{selectedRequest.dni_nie}</span></p>
              <p><span className="font-bold text-gray-900">Email:</span> {selectedRequest.email}</p>
              <p><span className="font-bold text-gray-900">Teléfono:</span> {selectedRequest.phone}</p>
              <p><span className="font-bold text-gray-900">Curso:</span> <span className="font-black text-red-600">{selectedRequest.course_name}</span></p>
              <p><span className="font-bold text-gray-900">Modalidad:</span> {selectedRequest.modalidad_inscripcion === 'COMPRA_DIRECTA' ? 'Compra Directa' : 'Solicitud con Aprobación'}</p>
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
                    Usuario registrado: <strong>{convertCheckData.emailUserExists.nombre} {convertCheckData.emailUserExists.apellidos}</strong>. Se asociará la nueva matrícula a la cuenta existente sin duplicar el usuario.
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
                    <span>Aprobando matrícula...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Confirmar Aprobación Final</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ─── NOTIFICACIÓN FINAL TRAS CREAR ALUMNO ────────────────────── */}
      {conversionResult && selectedRequest && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white text-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5 text-center border border-gray-200">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-black text-gray-900">✅ Matrícula Aprobada y Activada</h3>
              <p className="text-xs text-gray-500">
                La solicitud ha sido convertida e integrada en el Campus Virtual con estado de matrícula ACTIVA.
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-left text-xs space-y-2">
              <p><span className="font-bold text-gray-900">Nombre:</span> {selectedRequest.first_name} {selectedRequest.last_name_1}</p>
              <p><span className="font-bold text-gray-900">Curso:</span> {selectedRequest.course_name}</p>
              <p><span className="font-bold text-gray-900">Usuario de acceso:</span> {selectedRequest.email}</p>
              <p><span className="font-bold text-gray-900">Estado de Matrícula:</span> <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[11px]">ACTIVA</span></p>
              <p><span className="font-bold text-gray-900">Email de bienvenida e instrucciones:</span> {conversionResult.emailSent ? <span className="text-emerald-600 font-bold">Enviado al alumno</span> : <span className="text-amber-600 font-bold">Pendiente (puede reenviarse)</span>}</p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setConversionResult(null)}
                className="px-6 py-2.5 bg-gray-900 hover:bg-black text-white font-extrabold text-xs rounded-xl shadow-md transition-all"
              >
                Volver a la Lista
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
