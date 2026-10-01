import React, { useState, useEffect } from 'react';
import { useCampus } from '../../context/CampusContext';
import {
  Shield,
  Users,
  GraduationCap,
  BookOpen,
  FileText,
  Bell,
  Plus,
  UserCheck,
  UserX,
  CheckCircle2,
  XCircle,
  Edit,
  FolderPlus,
  Upload,
  BarChart3,
  Filter,
  Search,
} from 'lucide-react';
import { UserRole } from '../../types/campus';
import { CampusAdminRequests } from './CampusAdminRequests';
import { PdfFileUploader } from './PdfFileUploader';

interface AdminGlobalProgress {
  alumno_id: string;
  nombre: string;
  email: string;
  grupo_codigo: string;
  especialidad_nombre: string;
  total_publicados: number;
  completados: number;
  porcentaje_global: number;
}

export const CampusAdminPanel: React.FC = () => {
  const {
    users,
    courses,
    enrollments,
    secretaryRequests,
    announcements,
    contactRequests,
    addUser,
    toggleUserActive,
    addEnrollment,
    removeEnrollment,
    updateSecretaryStatus,
    publishCourseResource,
  } = useCampus();

  const [activeTab, setActiveTab] = useState<'solicitudes' | 'usuarios' | 'matriculas' | 'secretaria' | 'seguimiento'>('solicitudes');

  // Global Progress Analytics State
  const [globalProgress, setGlobalProgress] = useState<AdminGlobalProgress[]>([]);
  const [loadingProgress, setLoadingProgress] = useState<boolean>(false);
  const [filterEspecialidad, setFilterEspecialidad] = useState<string>('');
  const [filterGrupo, setFilterGrupo] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Admin PDF Publish Modal State
  const [showPublishPdfModal, setShowPublishPdfModal] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState(courses[0]?.id || 'TMVG0004');
  const [selectedModuleId, setSelectedModuleId] = useState('mod1');
  const [pdfTitle, setPdfTitle] = useState('');
  const [pdfDesc, setPdfDesc] = useState('');
  const [attachedPdfName, setAttachedPdfName] = useState('');
  const [attachedPdfSize, setAttachedPdfSize] = useState('');
  const [attachedPdfDataUrl, setAttachedPdfDataUrl] = useState('');
  const [publishSuccessMsg, setPublishSuccessMsg] = useState('');

  // New User Form State
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newNombre, setNewNombre] = useState('');
  const [newApellidos, setNewApellidos] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('ALUMNO');

  // New Enrollment Form State
  const [showAddEnrollmentModal, setShowAddEnrollmentModal] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedEnrollCourseId, setSelectedEnrollCourseId] = useState('');

  const students = users.filter((u) => u.role === 'ALUMNO');
  const teachers = users.filter((u) => u.role === 'PROFESOR');

  // Fetch Global Analytics from backend
  const fetchGlobalAnalytics = async () => {
    setLoadingProgress(true);
    try {
      const queryParams = new URLSearchParams();
      if (filterEspecialidad) queryParams.append('especialidadId', filterEspecialidad);
      if (filterGrupo) queryParams.append('grupoId', filterGrupo);

      const res = await fetch(`/api/admin/progress/analytics?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setGlobalProgress(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.warn('Error fetching admin progress analytics:', e);
    } finally {
      setLoadingProgress(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'seguimiento') {
      fetchGlobalAnalytics();
    }
  }, [activeTab, filterEspecialidad, filterGrupo]);

  const handleAdminPublishPdf = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId || !pdfTitle || !attachedPdfDataUrl) return;

    publishCourseResource(selectedCourseId, selectedModuleId, {
      cursoId: selectedCourseId,
      moduloId: selectedModuleId,
      titulo: pdfTitle,
      descripcion: pdfDesc,
      tipo: 'PDF',
      urlPrivada: attachedPdfDataUrl,
      tamano: attachedPdfSize || '2.0 MB',
      permitirDescarga: true,
      publicado: true,
    });

    setPublishSuccessMsg(`Documento PDF "${pdfTitle}" publicado correctamente en el curso.`);
    setShowPublishPdfModal(false);
    setPdfTitle('');
    setPdfDesc('');
    setAttachedPdfName('');
    setAttachedPdfSize('');
    setAttachedPdfDataUrl('');
    setTimeout(() => setPublishSuccessMsg(''), 5000);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNombre || !newEmail) return;

    addUser({
      nombre: newNombre,
      apellidos: newApellidos,
      email: newEmail,
      role: newRole,
      activo: true,
    });

    setShowAddUserModal(false);
    setNewNombre('');
    setNewApellidos('');
    setNewEmail('');
  };

  const handleCreateEnrollment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !selectedCourseId) return;

    addEnrollment(selectedStudentId, selectedCourseId);
    setShowAddEnrollmentModal(false);
  };

  // Filter local search for global progress
  const filteredProgress = globalProgress.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return p.nombre.toLowerCase().includes(q) || p.email.toLowerCase().includes(q) || p.grupo_codigo.toLowerCase().includes(q);
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-red-950/60 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/20 border border-red-500/30 text-red-400 text-xs font-semibold mb-3">
            <Shield className="w-4 h-4" />
            Administración Global Academias Péndulo
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight font-heading">
            Panel de Control Administrativo
          </h1>
          <p className="mt-2 text-sm text-zinc-400 max-w-2xl">
            Gestión centralizada de alumnos autorizados, profesores, matrículas académicas, contenidos y seguimiento de progreso global.
          </p>
        </div>

        <button
          onClick={() => setShowPublishPdfModal(true)}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider shadow-lg shadow-red-950/40 transition-all shrink-0"
        >
          <Upload className="w-4 h-4" /> Adjuntar PDF / Material
        </button>
      </div>

      {publishSuccessMsg && (
        <div className="p-4 bg-emerald-950/90 border border-emerald-800 text-emerald-300 rounded-2xl text-xs font-bold shadow-xl">
          {publishSuccessMsg}
        </div>
      )}

      {/* Admin Stat Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
          <div className="text-xs text-zinc-400 font-semibold">Total Alumnos</div>
          <div className="text-2xl font-extrabold text-white mt-1">{students.length}</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
          <div className="text-xs text-zinc-400 font-semibold">Profesores</div>
          <div className="text-2xl font-extrabold text-white mt-1">{teachers.length}</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
          <div className="text-xs text-zinc-400 font-semibold">Cursos Activos</div>
          <div className="text-2xl font-extrabold text-white mt-1">{courses.length}</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
          <div className="text-xs text-zinc-400 font-semibold">Matrículas</div>
          <div className="text-2xl font-extrabold text-red-400 mt-1">{enrollments.length}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800 gap-4 text-xs font-bold overflow-x-auto">
        <button
          onClick={() => setActiveTab('solicitudes')}
          className={`pb-3 transition-colors shrink-0 ${
            activeTab === 'solicitudes'
              ? 'text-red-400 border-b-2 border-red-500 font-heading'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Solicitudes y Leads ({contactRequests.length})
        </button>
        <button
          onClick={() => setActiveTab('usuarios')}
          className={`pb-3 transition-colors shrink-0 ${
            activeTab === 'usuarios'
              ? 'text-red-400 border-b-2 border-red-500 font-heading'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Gestión de Usuarios ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('matriculas')}
          className={`pb-3 transition-colors shrink-0 ${
            activeTab === 'matriculas'
              ? 'text-red-400 border-b-2 border-red-500 font-heading'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Matrículas ({enrollments.length})
        </button>
        <button
          onClick={() => setActiveTab('secretaria')}
          className={`pb-3 transition-colors shrink-0 ${
            activeTab === 'secretaria'
              ? 'text-red-400 border-b-2 border-red-500 font-heading'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Trámites Secretaría ({secretaryRequests.length})
        </button>
        <button
          onClick={() => setActiveTab('seguimiento')}
          className={`pb-3 transition-colors shrink-0 flex items-center gap-1.5 ${
            activeTab === 'seguimiento'
              ? 'text-red-400 border-b-2 border-red-500 font-heading'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-red-500" />
          Seguimiento Académico Global
        </button>
      </div>

      {/* TAB 0: CONTACT REQUESTS & LEADS */}
      {activeTab === 'solicitudes' && <CampusAdminRequests />}

      {/* TAB: GLOBAL ACADEMIC PROGRESS TRACKING ANALYTICS */}
      {activeTab === 'seguimiento' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2 font-heading">
                <BarChart3 className="w-5 h-5 text-red-500" />
                Seguimiento Global de Progreso por Alumno
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Consulta el avance académico en vivo sobre el catálogo de materiales publicados aplicables por especialidad y grupo.
              </p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Buscar por alumno o email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white w-48 sm:w-64"
                />
              </div>

              <select
                value={filterEspecialidad}
                onChange={(e) => setFilterEspecialidad(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-semibold"
              >
                <option value="">Todas las Especialidades (33)</option>
                <option value="esp-mecanica-hibridos">Mecánica de Vehículos Híbridos</option>
                <option value="esp-electricidad">Electricidad del Automóvil</option>
              </select>

              <button
                onClick={fetchGlobalAnalytics}
                className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold transition-all"
              >
                Actualizar Datos
              </button>
            </div>
          </div>

          {loadingProgress ? (
            <div className="text-center py-12 text-xs text-zinc-400">Cargando datos de progreso global...</div>
          ) : filteredProgress.length === 0 ? (
            <div className="text-center py-12 text-xs text-zinc-500">
              No se encontraron registros de progreso para los filtros seleccionados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-zinc-950 text-zinc-400 uppercase font-bold text-[10px] tracking-wider border-b border-zinc-800">
                    <th className="p-3">Alumno</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Especialidad / Grupo</th>
                    <th className="p-3 text-center">Materiales Publicados</th>
                    <th className="p-3 text-center">Completados</th>
                    <th className="p-3 text-right">Progreso Global</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {filteredProgress.map((p) => (
                    <tr key={p.alumno_id} className="hover:bg-zinc-850/50 transition-colors">
                      <td className="p-3 font-bold text-white">{p.nombre}</td>
                      <td className="p-3 text-zinc-400 font-mono text-[11px]">{p.email}</td>
                      <td className="p-3">
                        <div className="text-white font-semibold">{p.especialidad_nombre}</div>
                        <span className="bg-zinc-950 border border-zinc-800 px-2 py-0.5 rounded text-[10px] font-bold text-red-400">
                          {p.grupo_codigo}
                        </span>
                      </td>
                      <td className="p-3 text-center font-bold text-zinc-300">{p.total_publicados}</td>
                      <td className="p-3 text-center font-bold text-emerald-400">{p.completados}</td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2.5">
                          <span className="font-extrabold text-white">{p.porcentaje_global}%</span>
                          <div className="w-20 bg-zinc-800 h-2.5 rounded-full overflow-hidden border border-zinc-700">
                            <div
                              className="bg-gradient-to-r from-red-600 to-emerald-500 h-full rounded-full"
                              style={{ width: `${p.porcentaje_global}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 1: USERS */}
      {activeTab === 'usuarios' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white font-heading">Gestión de Cuentas de Usuario</h2>
            <button
              onClick={() => setShowAddUserModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-md"
            >
              <Plus className="w-4 h-4" /> Crear Usuario
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-zinc-950 text-zinc-400 uppercase font-bold text-[10px] tracking-wider border-b border-zinc-800">
                  <th className="p-3">Nombre</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Rol</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-zinc-850/50 transition-colors">
                    <td className="p-3 font-bold text-white">{u.nombre} {u.apellidos}</td>
                    <td className="p-3 text-zinc-400 font-mono text-[11px]">{u.email}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-950 border border-zinc-800 text-red-400 uppercase">
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.activo
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : 'bg-zinc-950 text-zinc-500 border border-zinc-800'
                        }`}
                      >
                        {u.activo ? 'ACTIVO' : 'INACTIVO'}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => toggleUserActive(u.id)}
                        className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-[11px] font-semibold"
                      >
                        {u.activo ? 'Desactivar' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: ENROLLMENTS */}
      {activeTab === 'matriculas' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white font-heading">Matrículas Académicas Activas</h2>
            <button
              onClick={() => setShowAddEnrollmentModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-md"
            >
              <Plus className="w-4 h-4" /> Nueva Matrícula
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-zinc-950 text-zinc-400 uppercase font-bold text-[10px] tracking-wider border-b border-zinc-800">
                  <th className="p-3">Estudiante</th>
                  <th className="p-3">Curso / Especialidad</th>
                  <th className="p-3">Fecha Alta</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {enrollments.map((e) => {
                  const student = users.find((u) => u.id === e.estudianteId);
                  const course = courses.find((c) => c.id === e.cursoId);
                  return (
                    <tr key={e.id} className="hover:bg-zinc-850/50 transition-colors">
                      <td className="p-3 font-bold text-white">{student ? `${student.nombre} ${student.apellidos}` : e.estudianteId}</td>
                      <td className="p-3 text-zinc-300 font-semibold">{course ? course.nombre : e.cursoId}</td>
                      <td className="p-3 text-zinc-400">{new Date(e.fechaInscripcion).toLocaleDateString('es-ES')}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                          {e.estado}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => removeEnrollment(e.estudianteId, e.cursoId)}
                          className="px-3 py-1 bg-red-950 hover:bg-red-900 text-red-400 rounded-lg text-[11px] font-semibold border border-red-800"
                        >
                          Cancelar Matrícula
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SECRETARY */}
      {activeTab === 'secretaria' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-bold text-white font-heading">Trámites y Solicitudes de Secretaría</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-zinc-950 text-zinc-400 uppercase font-bold text-[10px] tracking-wider border-b border-zinc-800">
                  <th className="p-3">Ref</th>
                  <th className="p-3">Solicitante</th>
                  <th className="p-3">Tipo</th>
                  <th className="p-3">Asunto</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3 text-right">Gestionar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {secretaryRequests.map((r) => (
                  <tr key={r.id} className="hover:bg-zinc-850/50 transition-colors">
                    <td className="p-3 text-zinc-500 font-mono text-[11px]">{r.referencia}</td>
                    <td className="p-3 font-bold text-white">{r.estudianteNombre}</td>
                    <td className="p-3 text-red-400 font-bold">{r.tipo}</td>
                    <td className="p-3 text-zinc-300 font-medium">{r.asunto}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          r.estado === 'RESUELTA'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : 'bg-amber-950 text-amber-400 border border-amber-800'
                        }`}
                      >
                        {r.estado}
                      </span>
                    </td>
                    <td className="p-3 text-right flex justify-end gap-2">
                      <button
                        onClick={() => updateSecretaryStatus(r.id, 'RESUELTA')}
                        className="px-2.5 py-1 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 rounded text-[11px] font-bold"
                      >
                        Resolver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Admin Publish Material Modal */}
      {showPublishPdfModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <h3 className="text-lg font-bold text-white">Publicar Documento / Material Formativo</h3>
              <button onClick={() => setShowPublishPdfModal(false)} className="text-zinc-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleAdminPublishPdf} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Curso Destino *</label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.codigo} - {c.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Título del Material *</label>
                <input
                  type="text"
                  required
                  value={pdfTitle}
                  onChange={(e) => setPdfTitle(e.target.value)}
                  placeholder="Ej. Guía Oficial de Desconexión de Alta Tensión"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Descripción</label>
                <textarea
                  rows={2}
                  value={pdfDesc}
                  onChange={(e) => setPdfDesc(e.target.value)}
                  placeholder="Descripción detallada para el alumnado..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white resize-none"
                />
              </div>

              <PdfFileUploader
                label="Seleccionar o arrastrar PDF desde tu ordenador *"
                selectedFileName={attachedPdfName}
                selectedFileSize={attachedPdfSize}
                onFileSelected={({ name, sizeStr, url }) => {
                  setAttachedPdfName(name);
                  setAttachedPdfSize(sizeStr);
                  setAttachedPdfDataUrl(url);
                  if (!pdfTitle) setPdfTitle(name.replace(/\.pdf$/i, ''));
                }}
                onFileRemoved={() => {
                  setAttachedPdfName('');
                  setAttachedPdfSize('');
                  setAttachedPdfDataUrl('');
                }}
              />

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowPublishPdfModal(false)}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-xl font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-extrabold"
                >
                  Publicar en el Curso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white border-b border-zinc-800 pb-3">Crear Nueva Cuenta</h3>
            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1">Nombre</label>
                <input
                  type="text"
                  required
                  value={newNombre}
                  onChange={(e) => setNewNombre(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white"
                />
              </div>
              <div>
                <label className="block text-zinc-400 mb-1">Apellidos</label>
                <input
                  type="text"
                  value={newApellidos}
                  onChange={(e) => setNewApellidos(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white"
                />
              </div>
              <div>
                <label className="block text-zinc-400 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white"
                />
              </div>
              <div>
                <label className="block text-zinc-400 mb-1">Rol</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white"
                >
                  <option value="ALUMNO">Alumno</option>
                  <option value="PROFESOR">Profesor</option>
                  <option value="ADMINISTRACION">Administración</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-xl font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-red-600 text-white rounded-xl font-bold"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Enrollment Modal */}
      {showAddEnrollmentModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white border-b border-zinc-800 pb-3">Formalizar Matrícula</h3>
            <form onSubmit={handleCreateEnrollment} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1">Seleccionar Alumno</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white"
                >
                  <option value="">-- Elige un Alumno --</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre} {s.apellidos} ({s.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-zinc-400 mb-1">Seleccionar Curso</label>
                <select
                  value={selectedEnrollCourseId}
                  onChange={(e) => setSelectedEnrollCourseId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white"
                >
                  <option value="">-- Elige un Curso --</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.codigo} - {c.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddEnrollmentModal(false)}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-xl font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-red-600 text-white rounded-xl font-bold"
                >
                  Formalizar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
