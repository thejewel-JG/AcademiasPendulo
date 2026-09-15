import React, { useState } from 'react';
import { useCampus } from '../../context/CampusContext';
import {
  Inbox,
  Search,
  Filter,
  User,
  Mail,
  Phone,
  BookOpen,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  UserCheck,
  ChevronRight,
  Shield,
  ArrowLeft,
  Save,
  UserPlus,
  Sparkles,
} from 'lucide-react';
import { ContactRequest, ContactRequestStatus } from '../../types/campus';

export const CampusAdminRequests: React.FC = () => {
  const {
    currentUser,
    contactRequests,
    courses,
    updateContactRequestStatus,
    saveInternalNotes,
    enrollContactRequestAsStudent,
  } = useCampus();

  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCourse, setFilterCourse] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Internal Notes State
  const [notesInput, setNotesInput] = useState('');
  const [enrollSuccessMsg, setEnrollSuccessMsg] = useState('');

  if (!currentUser || currentUser.role !== 'ADMINISTRACION') {
    return (
      <div className="p-8 text-center text-white space-y-4">
        <Shield className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold">Acceso Restringido</h2>
        <p className="text-xs text-zinc-400">
          Esta sección de gestión de solicitudes de información y matrículas está reservada exclusivamente para el rol de ADMINISTRACIÓN.
        </p>
      </div>
    );
  }

  const selectedRequest = contactRequests.find((r) => r.id === selectedRequestId);

  // Filter requests
  const filteredRequests = contactRequests.filter((req) => {
    const fullName = `${req.first_name} ${req.last_name}`.toLowerCase();
    const query = searchQuery.toLowerCase().trim();

    const matchesSearch =
      !query ||
      fullName.includes(query) ||
      req.email.toLowerCase().includes(query) ||
      req.phone.toLowerCase().includes(query);

    const matchesCourse = filterCourse === 'ALL' || req.course_id === filterCourse;
    const matchesStatus = filterStatus === 'ALL' || req.status === filterStatus;

    return matchesSearch && matchesCourse && matchesStatus;
  });

  // Count new requests
  const newRequestsCount = contactRequests.filter((r) => r.status === 'new').length;

  const handleSelectRequest = (req: ContactRequest) => {
    setSelectedRequestId(req.id);
    setNotesInput(req.internal_notes || '');
    setEnrollSuccessMsg('');
  };

  const handleSaveNotes = () => {
    if (!selectedRequestId) return;
    saveInternalNotes(selectedRequestId, notesInput);
  };

  const handleEnrollStudent = () => {
    if (!selectedRequestId) return;
    try {
      const { student, enrollment } = enrollContactRequestAsStudent(selectedRequestId);
      setEnrollSuccessMsg(
        `¡Alumno ${student.nombre} ${student.apellidos} matriculado con éxito en ${enrollment.cursoId}! Su cuenta de usuario está activa en el Campus Virtual.`
      );
    } catch (err: any) {
      alert(err.message || 'Error al matricular alumno');
    }
  };

  const getStatusBadge = (status: ContactRequestStatus) => {
    switch (status) {
      case 'new':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-red-600 text-white uppercase tracking-wider shadow-md shadow-red-950/40 border border-red-500/40 animate-pulse">
            Nueva
          </span>
        );
      case 'contacted':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-950 text-blue-400 border border-blue-800 uppercase">
            Contactado
          </span>
        );
      case 'documentation_pending':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-800 uppercase">
            Doc. Pendiente
          </span>
        );
      case 'enrolled':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-950 text-emerald-400 border border-emerald-800 uppercase">
            Matriculado
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-zinc-800 text-zinc-400 uppercase">
            Descartado
          </span>
        );
      case 'archived':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-zinc-900 text-zinc-500 uppercase">
            Archivado
          </span>
        );
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-zinc-900 via-zinc-900 to-red-950/40 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/20 border border-red-500/30 text-red-400 text-xs font-semibold mb-2">
            <Inbox className="w-3.5 h-3.5" />
            Gestión Centralizada de Solicitudes y Leads
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-heading">
            Solicitudes de Información y Matrículas
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Recepción automática desde el formulario web, gestión de estados y matriculación directa de alumnos al Campus Virtual.
          </p>
        </div>

        {/* Counter Badge */}
        <div className="bg-zinc-950/90 border border-zinc-800 p-4 rounded-2xl shrink-0 flex items-center gap-4 shadow-xl">
          <div className="w-12 h-12 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-500 font-extrabold text-xl">
            {newRequestsCount}
          </div>
          <div>
            <div className="text-xs font-bold text-white uppercase tracking-wider font-heading">
              Nuevas Solicitudes
            </div>
            <div className="text-[11px] text-zinc-400">Pendientes de contactar</div>
          </div>
        </div>
      </div>

      {/* Filters & Search Control Bar */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por alumno, email o teléfono..."
            className="w-full pl-10 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
          />
        </div>

        {/* Filter Course */}
        <div>
          <select
            value={filterCourse}
            onChange={(e) => setFilterCourse(e.target.value)}
            className="w-full py-2 px-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-500"
          >
            <option value="ALL">Todas las Especialidades</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.codigo} - {c.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Filter Status */}
        <div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full py-2 px-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-500"
          >
            <option value="ALL">Todos los Estados</option>
            <option value="new">Nueva (Nuevas)</option>
            <option value="contacted">Contactado</option>
            <option value="documentation_pending">Documentación Pendiente</option>
            <option value="enrolled">Matriculado</option>
            <option value="rejected">Descartado</option>
            <option value="archived">Archivado</option>
          </select>
        </div>
      </div>

      {/* Main Content Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Requests List Table / Cards */}
        <div className="lg:col-span-6 space-y-3">
          <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex justify-between">
            <span>Resultados ({filteredRequests.length})</span>
            <span>Orden: Más reciente primero</span>
          </div>

          {filteredRequests.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center text-xs text-zinc-500">
              No hay ninguna solicitud que coincida con los criterios de búsqueda.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRequests.map((req) => {
                const isSelected = selectedRequestId === req.id;
                const isNew = req.status === 'new';

                return (
                  <div
                    key={req.id}
                    onClick={() => handleSelectRequest(req)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-zinc-900 border-red-500 shadow-xl'
                        : isNew
                        ? 'bg-zinc-900/90 border-red-600/40 hover:border-red-500'
                        : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-white text-sm">
                          {req.first_name} {req.last_name}
                        </span>
                      </div>
                      {getStatusBadge(req.status)}
                    </div>

                    <div className="text-[11px] text-red-400 font-bold uppercase truncate">
                      {req.course_code} • {req.course_name}
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-zinc-400">
                      <div className="flex items-center gap-1.5 truncate">
                        <Mail className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        <span className="truncate">{req.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        <span>{req.phone}</span>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-[10px] text-zinc-500 pt-2 border-t border-zinc-800/60">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(req.created_at).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span>Origen: {req.source}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Request File Detail & Actions */}
        <div className="lg:col-span-6 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 sm:p-6 flex flex-col h-[750px] overflow-y-auto">
          {selectedRequest ? (
            <div className="space-y-6">
              {/* File Header */}
              <div className="pb-4 border-b border-zinc-800 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-zinc-400 font-mono">
                    ID Solicitud: {selectedRequest.id}
                  </div>
                  <h2 className="text-xl font-extrabold text-white mt-0.5 font-heading">
                    {selectedRequest.first_name} {selectedRequest.last_name}
                  </h2>
                </div>
                <div>{getStatusBadge(selectedRequest.status)}</div>
              </div>

              {enrollSuccessMsg && (
                <div className="p-4 bg-emerald-950/90 border border-emerald-800 text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>{enrollSuccessMsg}</span>
                </div>
              )}

              {/* 1. Applicant Contact Info */}
              <div className="bg-zinc-950 border border-zinc-800/80 p-4 rounded-xl space-y-3">
                <div className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-2">
                  <User className="w-4 h-4" /> Datos del Interesado
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-zinc-500 block text-[10px]">Nombre Completo</span>
                    <strong className="text-white">
                      {selectedRequest.first_name} {selectedRequest.last_name}
                    </strong>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px]">Teléfono Móvil</span>
                    <a href={`tel:${selectedRequest.phone}`} className="text-red-400 font-bold hover:underline">
                      {selectedRequest.phone}
                    </a>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px]">Correo Electrónico</span>
                    <a href={`mailto:${selectedRequest.email}`} className="text-red-400 font-bold hover:underline">
                      {selectedRequest.email}
                    </a>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px]">Fecha de Solicitud</span>
                    <span className="text-zinc-200">
                      {new Date(selectedRequest.created_at).toLocaleString('es-ES')}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Requested Course */}
              <div className="bg-zinc-950 border border-zinc-800/80 p-4 rounded-xl space-y-3">
                <div className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-2">
                  <BookOpen className="w-4 h-4" /> Formación Solicitada
                </div>
                <div className="text-xs space-y-1">
                  <div className="font-extrabold text-white text-sm">
                    {selectedRequest.course_code} - {selectedRequest.course_name}
                  </div>
                  {selectedRequest.preferred_schedule && (
                    <div className="text-zinc-400 text-[11px]">
                      Horario preferido:{' '}
                      <strong className="text-zinc-200">{selectedRequest.preferred_schedule}</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Additional Details */}
              {(selectedRequest.employment_status || selectedRequest.comments || selectedRequest.message) && (
                <div className="bg-zinc-950 border border-zinc-800/80 p-4 rounded-xl space-y-3 text-xs">
                  <div className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Información Adicional
                  </div>
                  {selectedRequest.employment_status && (
                    <div>
                      <span className="text-zinc-500 block text-[10px]">Situación Laboral</span>
                      <span className="text-zinc-200">{selectedRequest.employment_status}</span>
                    </div>
                  )}
                  {selectedRequest.message && (
                    <div>
                      <span className="text-zinc-500 block text-[10px]">Mensaje del Interesado</span>
                      <p className="text-zinc-300 bg-zinc-900 p-3 rounded-lg mt-1 whitespace-pre-wrap">
                        {selectedRequest.message}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* 4. State Management */}
              <div className="bg-zinc-950 border border-zinc-800/80 p-4 rounded-xl space-y-3 text-xs">
                <div className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Cambiar Estado de la Solicitud
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => updateContactRequestStatus(selectedRequest.id, 'contacted')}
                    className={`py-2 px-2 rounded-lg border text-center font-bold text-[11px] ${
                      selectedRequest.status === 'contacted'
                        ? 'bg-blue-600 text-white border-blue-500'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    Contactado
                  </button>
                  <button
                    onClick={() => updateContactRequestStatus(selectedRequest.id, 'documentation_pending')}
                    className={`py-2 px-2 rounded-lg border text-center font-bold text-[11px] ${
                      selectedRequest.status === 'documentation_pending'
                        ? 'bg-amber-600 text-white border-amber-500'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    Doc. Pendiente
                  </button>
                  <button
                    onClick={() => updateContactRequestStatus(selectedRequest.id, 'rejected')}
                    className={`py-2 px-2 rounded-lg border text-center font-bold text-[11px] ${
                      selectedRequest.status === 'rejected'
                        ? 'bg-zinc-700 text-white border-zinc-600'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    Descartado
                  </button>
                </div>
              </div>

              {/* 5. Internal Notes (Private to Admin) */}
              <div className="bg-zinc-950 border border-zinc-800/80 p-4 rounded-xl space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                    Notas Internas (Solo Visibles por Administración)
                  </span>
                  <button
                    onClick={handleSaveNotes}
                    className="flex items-center gap-1 text-red-400 hover:text-red-300 font-bold text-[11px]"
                  >
                    <Save className="w-3.5 h-3.5" /> Guardar Nota
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder="Añade anotaciones internas sobre llamadas, preferencias o seguimiento..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-red-500 resize-none text-xs"
                />
              </div>

              {/* 6. CONVERT REQUEST TO ENROLLED STUDENT */}
              <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-red-950/40 border border-red-900/50 p-5 rounded-2xl space-y-3 shadow-xl">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-red-500" />
                  <h4 className="text-sm font-extrabold text-white">
                    Convertir Solicitud en Matrícula Directa
                  </h4>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Crea o vincula la cuenta de alumno con este correo electrónico ({selectedRequest.email}) y genera automáticamente la matrícula activa en <strong className="text-white">{selectedRequest.course_code}</strong>.
                </p>

                <button
                  onClick={handleEnrollStudent}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all shadow-lg shadow-red-950/40"
                >
                  <UserCheck className="w-4 h-4" />
                  Matricular Alumno en Campus Virtual
                </button>
              </div>
            </div>
          ) : (
            <div className="m-auto text-center space-y-3 text-zinc-500">
              <Inbox className="w-12 h-12 mx-auto text-zinc-700" />
              <div className="text-xs">
                Selecciona una solicitud del listado para consultar la ficha completa y gestionar la matrícula.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
