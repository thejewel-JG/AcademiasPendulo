import React, { useState, useEffect } from 'react';
import {
  Tag,
  DollarSign,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  Users,
  Calendar,
  Lock,
  Edit3,
  X,
  HelpCircle,
  ShoppingBag,
  FileCheck,
  RefreshCw,
  Info,
  Save,
  Check,
  AlertTriangle
} from 'lucide-react';
import { Course } from '../../types';
import { formatCoursePrice } from '../../services/courseService';

interface AdminCourseData {
  id: string;
  codigo: string;
  nombre: string;
  categoria_id: string;
  descripcion?: string;
  nivel?: string;
  horas_totales?: number;
  horas_practicas?: number;
  modalidad?: string;
  estado?: string;
  precio_base: number | null;
  moneda: string;
  tipo_iva: string;
  porcentaje_iva: number | string;
  importe_iva: number | null;
  precio_final: number | null;
  estado_precio: 'SIN_CONFIGURAR' | 'CONFIGURADO';
  tipo_inscripcion: 'COMPRA_DIRECTA' | 'SOLICITUD_APROBACION';
  plazas_maximas: number | null;
  plazas_disponibles: number | null;
  estado_disponibilidad: 'ABIERTA' | 'CERRADA' | 'SUSPENDIDA_TEMPORALMENTE' | 'COMPLETA';
  fecha_apertura_inscripcion: string | null;
  fecha_cierre_inscripcion: string | null;
  estado_publicacion: 'BORRADOR' | 'PUBLICADO' | 'NO_DISPONIBLE' | 'ARCHIVADO';
  actualizado_en?: string;
}

export const CampusCommercialCatalog: React.FC = () => {
  const [courses, setCourses] = useState<AdminCourseData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successToast, setSuccessToast] = useState<string>('');

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [priceStatusFilter, setPriceStatusFilter] = useState<string>('ALL');
  const [enrollmentTypeFilter, setEnrollmentTypeFilter] = useState<string>('ALL');
  const [publicationFilter, setPublicationFilter] = useState<string>('ALL');

  // Modal State for "CONFIGURACIÓN COMERCIAL"
  const [editingCourse, setEditingCourse] = useState<AdminCourseData | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);

  // Form Fields State
  const [formPrecioBase, setFormPrecioBase] = useState<string>('');
  const [formTipoIva, setFormTipoIva] = useState<string>('EXENTO');
  const [formTipoInscripcion, setFormTipoInscripcion] = useState<'COMPRA_DIRECTA' | 'SOLICITUD_APROBACION'>('SOLICITUD_APROBACION');
  const [formPlazasMaximas, setFormPlazasMaximas] = useState<string>('');
  const [formPlazasDisponibles, setFormPlazasDisponibles] = useState<string>('');
  const [formEstadoDisponibilidad, setFormEstadoDisponibilidad] = useState<'ABIERTA' | 'CERRADA' | 'SUSPENDIDA_TEMPORALMENTE' | 'COMPLETA'>('ABIERTA');
  const [formFechaApertura, setFormFechaApertura] = useState<string>('');
  const [formFechaCierre, setFormFechaCierre] = useState<string>('');
  const [formEstadoPublicacion, setFormEstadoPublicacion] = useState<'BORRADOR' | 'PUBLICADO' | 'NO_DISPONIBLE' | 'ARCHIVADO'>('PUBLICADO');

  // Load courses from backend
  const fetchCourses = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
      const res = await fetch('/api/admin/courses', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        // Fallback to public endpoint if admin token has any issue
        const pubRes = await fetch('/api/public/courses');
        if (pubRes.ok) {
          const pubData = await pubRes.json();
          setCourses(Array.isArray(pubData) ? pubData : []);
          return;
        }
        throw new Error('Error al cargar cursos administrativos.');
      }
      const data = await res.json();
      setCourses(data.courses || []);
    } catch (err: any) {
      console.error('Error fetching courses for admin catalog:', err);
      setErrorMsg(err.message || 'Error de conexión con el catálogo de cursos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  // Open modal & populate fields
  const handleEditCourse = (course: AdminCourseData) => {
    setEditingCourse(course);
    setFormErrors([]);
    setFormPrecioBase(course.precio_base !== null && course.precio_base !== undefined ? String(course.precio_base) : '');
    setFormTipoIva(course.tipo_iva || 'EXENTO');
    setFormTipoInscripcion(course.tipo_inscripcion || 'SOLICITUD_APROBACION');
    setFormPlazasMaximas(course.plazas_maximas !== null && course.plazas_maximas !== undefined ? String(course.plazas_maximas) : '');
    setFormPlazasDisponibles(course.plazas_disponibles !== null && course.plazas_disponibles !== undefined ? String(course.plazas_disponibles) : '15');
    setFormEstadoDisponibilidad(course.estado_disponibilidad || 'ABIERTA');
    setFormFechaApertura(course.fecha_apertura_inscripcion ? course.fecha_apertura_inscripcion.slice(0, 10) : '');
    setFormFechaCierre(course.fecha_cierre_inscripcion ? course.fecha_cierre_inscripcion.slice(0, 10) : '');
    setFormEstadoPublicacion(course.estado_publicacion || 'PUBLICADO');
  };

  // Real-time tax and price calculations
  const calculateLivePrice = () => {
    const base = parseFloat(formPrecioBase);
    if (isNaN(base) || base <= 0) {
      return {
        base: null,
        taxPercent: 0,
        taxAmount: null,
        finalPrice: null,
        status: 'SIN_CONFIGURAR' as const
      };
    }

    let taxPercent = 0;
    if (formTipoIva === 'GENERAL_21') taxPercent = 21;
    else if (formTipoIva === 'REDUCIDO_10') taxPercent = 10;
    else if (formTipoIva === 'SUPERREDUCIDO_4') taxPercent = 4;
    else taxPercent = 0; // EXENTO

    const taxAmount = Math.round((base * (taxPercent / 100)) * 100) / 100;
    const finalPrice = Math.round((base + taxAmount) * 100) / 100;

    return {
      base,
      taxPercent,
      taxAmount,
      finalPrice,
      status: 'CONFIGURADO' as const
    };
  };

  const liveCalculation = calculateLivePrice();

  // Validate form before sending
  const validateForm = (): boolean => {
    const errors: string[] = [];

    // 1. Price validation
    if (formPrecioBase.trim() !== '') {
      const numBase = parseFloat(formPrecioBase);
      if (isNaN(numBase) || numBase < 0) {
        errors.push('El precio base no puede ser negativo.');
      }
    }

    // 2. Seats validation
    if (formPlazasMaximas.trim() !== '') {
      const numMax = parseInt(formPlazasMaximas, 10);
      if (isNaN(numMax) || numMax < 0) {
        errors.push('El número máximo de plazas no puede ser negativo.');
      }
    }

    if (formPlazasDisponibles.trim() !== '') {
      const numDisp = parseInt(formPlazasDisponibles, 10);
      if (isNaN(numDisp) || numDisp < 0) {
        errors.push('Las plazas disponibles no pueden ser negativas.');
      }
    }

    // 3. Date validation
    if (formFechaApertura && formFechaCierre) {
      if (new Date(formFechaCierre) < new Date(formFechaApertura)) {
        errors.push('La fecha de cierre de inscripciones no puede ser anterior a la fecha de apertura.');
      }
    }

    // 4. Commercial publication rule
    // Cannot publish for online direct sale without configured price
    if (formTipoInscripcion === 'COMPRA_DIRECTA' && formEstadoPublicacion === 'PUBLICADO') {
      if (formPrecioBase.trim() === '' || isNaN(parseFloat(formPrecioBase)) || parseFloat(formPrecioBase) <= 0) {
        errors.push('No se puede publicar un curso para venta online directa sin haber configurado previamente su precio comercial oficial.');
      }
    }

    setFormErrors(errors);
    return errors.length === 0;
  };

  // Submit configuration to server
  const handleSaveCommercialConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourse) return;

    if (!validateForm()) {
      return;
    }

    setSaving(true);
    setFormErrors([]);

    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
      const payload = {
        precio_base: formPrecioBase.trim() === '' ? null : parseFloat(formPrecioBase),
        tipo_iva: formTipoIva,
        tipo_inscripcion: formTipoInscripcion,
        plazas_maximas: formPlazasMaximas.trim() === '' ? null : parseInt(formPlazasMaximas, 10),
        plazas_disponibles: formPlazasDisponibles.trim() === '' ? null : parseInt(formPlazasDisponibles, 10),
        estado_disponibilidad: formEstadoDisponibilidad,
        fecha_apertura_inscripcion: formFechaApertura || null,
        fecha_cierre_inscripcion: formFechaCierre || null,
        estado_publicacion: formEstadoPublicacion,
      };

      const res = await fetch(`/api/admin/courses/${editingCourse.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al guardar la configuración comercial.');
      }

      setSuccessToast(`¡Configuración comercial de ${editingCourse.codigo} actualizada con éxito en la base de datos!`);
      setTimeout(() => setSuccessToast(''), 4500);

      // Close modal and refresh list
      setEditingCourse(null);
      await fetchCourses();

    } catch (err: any) {
      console.error('Error saving commercial configuration:', err);
      setFormErrors([err.message || 'Error al conectar con el servidor.']);
    } finally {
      setSaving(false);
    }
  };

  // Filter courses in list
  const filteredCourses = courses.filter((c) => {
    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCode = c.codigo.toLowerCase().includes(q);
      const matchName = c.nombre.toLowerCase().includes(q);
      if (!matchCode && !matchName) return false;
    }

    // Category
    if (categoryFilter !== 'ALL') {
      if (c.categoria_id?.toLowerCase() !== categoryFilter.toLowerCase()) return false;
    }

    // Price status
    if (priceStatusFilter !== 'ALL') {
      if (priceStatusFilter === 'CONFIGURADO' && c.estado_precio !== 'CONFIGURADO') return false;
      if (priceStatusFilter === 'SIN_CONFIGURAR' && c.estado_precio === 'CONFIGURADO') return false;
    }

    // Enrollment type
    if (enrollmentTypeFilter !== 'ALL') {
      if (c.tipo_inscripcion !== enrollmentTypeFilter) return false;
    }

    // Publication status
    if (publicationFilter !== 'ALL') {
      if (c.estado_publicacion !== publicationFilter) return false;
    }

    return true;
  });

  // Calculate statistics
  const totalCourses = courses.length;
  const configuredPricesCount = courses.filter(c => c.estado_precio === 'CONFIGURADO').length;
  const directPurchaseCount = courses.filter(c => c.tipo_inscripcion === 'COMPRA_DIRECTA').length;
  const publishedCount = courses.filter(c => c.estado_publicacion === 'PUBLICADO').length;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 px-4 py-3 rounded-xl flex items-center gap-3 shadow-2xl animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="text-sm font-medium">{successToast}</p>
        </div>
      )}

      {/* Header and Stats */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/60 border border-red-800/50 text-red-400 text-xs font-bold uppercase tracking-wider mb-2">
              <DollarSign className="w-3.5 h-3.5" />
              Gestión Comercial y Precios Privados
            </div>
            <h2 className="text-xl font-bold text-white font-heading">
              Catálogo Oficial de Cursos — Configuración Comercial
            </h2>
            <p className="text-xs text-zinc-400 mt-1 max-w-3xl">
              Configura individualmente para cada una de las 33 especialidades su precio de venta en EUR, régimen fiscal (IVA), modelo de matrícula (Compra Directa vs Solicitud con Aprobación), plazas y estado de publicación.
            </p>
          </div>

          <button
            onClick={fetchCourses}
            disabled={loading}
            className="self-start md:self-auto inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl transition border border-zinc-700 shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Actualizar Catálogo
          </button>
        </div>

        {/* Commercial Overview KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-zinc-950 border border-zinc-800/80 p-3.5 rounded-xl">
            <div className="text-[11px] text-zinc-400 font-semibold">Total Cursos Oficiales</div>
            <div className="text-xl font-extrabold text-white mt-1">{totalCourses}</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">32 TMV + 1 FCO</div>
          </div>

          <div className="bg-zinc-950 border border-zinc-800/80 p-3.5 rounded-xl">
            <div className="text-[11px] text-zinc-400 font-semibold">Precios Configurados</div>
            <div className="text-xl font-extrabold text-emerald-400 mt-1">{configuredPricesCount}</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">{totalCourses - configuredPricesCount} sin precio ("Consultar")</div>
          </div>

          <div className="bg-zinc-950 border border-zinc-800/80 p-3.5 rounded-xl">
            <div className="text-[11px] text-zinc-400 font-semibold">Venta Online Directa</div>
            <div className="text-xl font-extrabold text-blue-400 mt-1">{directPurchaseCount}</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">{totalCourses - directPurchaseCount} con Solicitud de Admisión</div>
          </div>

          <div className="bg-zinc-950 border border-zinc-800/80 p-3.5 rounded-xl">
            <div className="text-[11px] text-zinc-400 font-semibold">Cursos Publicados</div>
            <div className="text-xl font-extrabold text-red-400 mt-1">{publishedCount}</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">Visibles en la web pública</div>
          </div>
        </div>

        {/* Important Rule Banner (Section 7) */}
        <div className="bg-amber-950/30 border border-amber-800/40 rounded-xl p-3 text-xs text-amber-200/90 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-amber-300">Regla fundamental del sistema:</span> El pago y la aprobación administrativa son dos condiciones distintas. Ninguna compra directa ni pago otorga acceso automático al campus virtual. Siempre se requiere verificación y activación manual por parte de Secretaría.
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-xl flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Buscar por código (TMVG...) o nombre del curso..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition"
          />
        </div>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-red-500 font-semibold"
        >
          <option value="ALL">Todas las Categorías</option>
          <option value="tmv">Automoción y TMV (32)</option>
          <option value="fco">Prevención PRL / FCO (1)</option>
        </select>

        {/* Price Status Filter */}
        <select
          value={priceStatusFilter}
          onChange={(e) => setPriceStatusFilter(e.target.value)}
          className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-red-500 font-semibold"
        >
          <option value="ALL">Todos los Precios</option>
          <option value="CONFIGURADO">Con Precio Configurado</option>
          <option value="SIN_CONFIGURAR">Sin Precio ("Consultar precio")</option>
        </select>

        {/* Enrollment Type Filter */}
        <select
          value={enrollmentTypeFilter}
          onChange={(e) => setEnrollmentTypeFilter(e.target.value)}
          className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-red-500 font-semibold"
        >
          <option value="ALL">Cualquier Matrícula</option>
          <option value="COMPRA_DIRECTA">Compra Directa</option>
          <option value="SOLICITUD_APROBACION">Solicitud con Aprobación</option>
        </select>

        {/* Publication Status Filter */}
        <select
          value={publicationFilter}
          onChange={(e) => setPublicationFilter(e.target.value)}
          className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-red-500 font-semibold"
        >
          <option value="ALL">Cualquier Publicación</option>
          <option value="PUBLICADO">Publicado</option>
          <option value="BORRADOR">Borrador</option>
          <option value="NO_DISPONIBLE">No disponible</option>
          <option value="ARCHIVADO">Archivado</option>
        </select>
      </div>

      {/* Courses Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950/80 border-b border-zinc-800 text-zinc-400 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Curso / Código</th>
                <th className="py-3.5 px-3">Precio Final (EUR)</th>
                <th className="py-3.5 px-3">Régimen Fiscal</th>
                <th className="py-3.5 px-3">Tipo Matrícula</th>
                <th className="py-3.5 px-3">Plazas</th>
                <th className="py-3.5 px-3">Disponibilidad</th>
                <th className="py-3.5 px-3">Publicación</th>
                <th className="py-3.5 px-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-red-500" />
                    Cargando catálogo comercial desde MySQL...
                  </td>
                </tr>
              ) : filteredCourses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-400">
                    No se encontraron cursos que coincidan con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredCourses.map((course) => {
                  const hasPrice = course.estado_precio === 'CONFIGURADO' && course.precio_final !== null && course.precio_final !== undefined;
                  const formattedPrice = hasPrice
                    ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(course.precio_final!)
                    : 'Consultar precio';

                  return (
                    <tr key={course.id} className="hover:bg-zinc-800/40 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white">{course.nombre}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-[11px] font-semibold text-red-400 bg-red-950/40 px-1.5 py-0.5 rounded border border-red-800/30">
                            {course.codigo}
                          </span>
                          <span className="text-[11px] text-zinc-400">
                            {course.horas_totales || 0}h • {course.modalidad || 'Presencial'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        {hasPrice ? (
                          <div>
                            <div className="font-extrabold text-sm text-emerald-400">
                              {formattedPrice}
                            </div>
                            <div className="text-[10px] text-zinc-400">
                              Base: {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(course.precio_base || 0)}
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded-full border border-zinc-700">
                            <HelpCircle className="w-3 h-3 text-zinc-500" />
                            Consultar precio
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="text-[11px] text-zinc-300 font-medium">
                          {course.tipo_iva === 'EXENTO' && 'Exento de IVA'}
                          {course.tipo_iva === 'GENERAL_21' && '21% Rég. General'}
                          {course.tipo_iva === 'REDUCIDO_10' && '10% Reducido'}
                          {course.tipo_iva === 'SUPERREDUCIDO_4' && '4% Superreducido'}
                        </span>
                      </td>

                      <td className="py-3.5 px-3">
                        {course.tipo_inscripcion === 'COMPRA_DIRECTA' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-950/70 border border-blue-800 text-blue-300">
                            <ShoppingBag className="w-3 h-3" />
                            Compra Directa
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-950/70 border border-amber-800 text-amber-300">
                            <FileCheck className="w-3 h-3" />
                            Solicitud Aprobación
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-zinc-300">
                        <div className="font-semibold">
                          {course.plazas_disponibles !== null ? course.plazas_disponibles : '—'} disp.
                        </div>
                        <div className="text-[10px] text-zinc-500">
                          {course.plazas_maximas ? `Máx: ${course.plazas_maximas}` : 'Sin límite'}
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        {course.estado_disponibilidad === 'ABIERTA' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/70 border border-emerald-800 text-emerald-400">
                            Abierta
                          </span>
                        )}
                        {course.estado_disponibilidad === 'CERRADA' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950/70 border border-rose-800 text-rose-400">
                            Cerrada
                          </span>
                        )}
                        {course.estado_disponibilidad === 'SUSPENDIDA_TEMPORALMENTE' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-950/70 border border-yellow-800 text-yellow-400">
                            Suspendida
                          </span>
                        )}
                        {course.estado_disponibilidad === 'COMPLETA' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-950/70 border border-purple-800 text-purple-400">
                            Completa
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-3">
                        {course.estado_publicacion === 'PUBLICADO' && (
                          <span className="text-zinc-200 font-semibold text-[11px] flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Publicado
                          </span>
                        )}
                        {course.estado_publicacion === 'BORRADOR' && (
                          <span className="text-zinc-400 font-medium text-[11px] flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-500"></span>
                            Borrador
                          </span>
                        )}
                        {course.estado_publicacion === 'NO_DISPONIBLE' && (
                          <span className="text-amber-400 font-medium text-[11px] flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            No disp.
                          </span>
                        )}
                        {course.estado_publicacion === 'ARCHIVADO' && (
                          <span className="text-zinc-500 font-medium text-[11px] flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-600"></span>
                            Archivado
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleEditCourse(course)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600/90 hover:bg-red-600 text-white font-semibold rounded-lg text-xs transition shadow-sm"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Configuración Comercial
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: CONFIGURACIÓN COMERCIAL */}
      {editingCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-fade-in my-auto">
            {/* Modal Header */}
            <div className="p-5 border-b border-zinc-800 flex items-start justify-between bg-zinc-900/60 rounded-t-2xl">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-bold text-red-400 bg-red-950 px-2 py-0.5 rounded border border-red-800/40">
                    {editingCourse.codigo}
                  </span>
                  <span className="text-xs text-zinc-400">Modificación Comercial de Curso</span>
                </div>
                <h3 className="text-lg font-bold text-white font-heading">
                  {editingCourse.nombre}
                </h3>
              </div>

              <button
                onClick={() => setEditingCourse(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveCommercialConfig} className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* Validation errors alert */}
              {formErrors.length > 0 && (
                <div className="bg-red-950/80 border border-red-800 text-red-200 p-3.5 rounded-xl space-y-1">
                  <div className="flex items-center gap-2 font-bold text-red-300">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    Por favor revisa los siguientes errores:
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 pl-1 text-[11px] text-red-300/90">
                    {formErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* SECCIÓN 1: INFORMACIÓN ECONÓMICA */}
              <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <h4 className="font-bold text-sm text-white flex items-center gap-2 font-heading">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    1. Información Económica y Precios
                  </h4>
                  <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">
                    Moneda Oficial: EUR (€)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Precio Base */}
                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">
                      Precio Base (sin impuestos) en EUR:
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Dejar vacío para 'Consultar precio'"
                        value={formPrecioBase}
                        onChange={(e) => setFormPrecioBase(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono text-sm placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition"
                      />
                      <span className="absolute right-3 top-2.5 text-zinc-400 font-bold text-xs">EUR €</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-1">
                      Si se deja vacío, el catálogo público mostrará "Consultar precio".
                    </p>
                  </div>

                  {/* Tratamiento fiscal aplicable */}
                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">
                      Tratamiento Fiscal / IVA aplicable:
                    </label>
                    <select
                      value={formTipoIva}
                      onChange={(e) => setFormTipoIva(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-emerald-500 transition"
                    >
                      <option value="EXENTO">Exento de IVA (Formación Reglada / Certificados)</option>
                      <option value="GENERAL_21">Régimen General — 21% IVA</option>
                      <option value="REDUCIDO_10">Régimen Reducido — 10% IVA</option>
                      <option value="SUPERREDUCIDO_4">Régimen Superreducido — 4% IVA</option>
                    </select>
                    <p className="text-[10px] text-zinc-500 mt-1">
                      No se presupone exención universal para todos los cursos.
                    </p>
                  </div>
                </div>

                {/* Live Calculated Final Price Breakdown */}
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">
                      Desglose Cálculo Fiscal
                    </div>
                    <div className="text-xs text-zinc-300">
                      Base: <span className="font-mono font-semibold">{liveCalculation.base !== null ? `${liveCalculation.base.toFixed(2)} €` : '—'}</span>
                      {' • '}
                      IVA ({liveCalculation.taxPercent}%): <span className="font-mono font-semibold">{liveCalculation.taxAmount !== null ? `${liveCalculation.taxAmount.toFixed(2)} €` : '0.00 €'}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">
                      Precio Final de Venta al Público
                    </div>
                    <div className="text-lg font-extrabold text-emerald-400 font-mono">
                      {liveCalculation.finalPrice !== null
                        ? `${liveCalculation.finalPrice.toFixed(2)} €`
                        : 'Consultar precio'}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECCIÓN 2: CONFIGURACIÓN DE MATRÍCULA */}
              <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-xl p-4 space-y-4">
                <div className="border-b border-zinc-800 pb-2">
                  <h4 className="font-bold text-sm text-white flex items-center gap-2 font-heading">
                    <Users className="w-4 h-4 text-blue-400" />
                    2. Modalidad de Matriculación y Plazas
                  </h4>
                </div>

                {/* Tipo de matriculación: COMPRA_DIRECTA vs SOLICITUD_APROBACION */}
                <div>
                  <label className="block text-zinc-300 font-semibold mb-2">
                    Tipo de Inscripción del Curso:
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label
                      className={`p-3.5 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                        formTipoInscripcion === 'COMPRA_DIRECTA'
                          ? 'bg-blue-950/40 border-blue-500 text-white'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold text-xs mb-1 text-blue-300">
                        <input
                          type="radio"
                          name="tipo_inscripcion"
                          value="COMPRA_DIRECTA"
                          checked={formTipoInscripcion === 'COMPRA_DIRECTA'}
                          onChange={() => setFormTipoInscripcion('COMPRA_DIRECTA')}
                          className="text-blue-500"
                        />
                        <ShoppingBag className="w-4 h-4" />
                        A. COMPRA DIRECTA
                      </div>
                      <p className="text-[11px] leading-relaxed text-zinc-300/90">
                        El alumno podrá iniciar el proceso de compra sin aprobación previa. 
                        <span className="block mt-1 text-[10px] text-amber-300 font-semibold">
                          * Nota: No otorga acceso automático al campus. Requiere verificación de pago y alta administrativa.
                        </span>
                      </p>
                    </label>

                    <label
                      className={`p-3.5 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                        formTipoInscripcion === 'SOLICITUD_APROBACION'
                          ? 'bg-amber-950/40 border-amber-500 text-white'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold text-xs mb-1 text-amber-300">
                        <input
                          type="radio"
                          name="tipo_inscripcion"
                          value="SOLICITUD_APROBACION"
                          checked={formTipoInscripcion === 'SOLICITUD_APROBACION'}
                          onChange={() => setFormTipoInscripcion('SOLICITUD_APROBACION')}
                          className="text-amber-500"
                        />
                        <FileCheck className="w-4 h-4" />
                        B. SOLICITUD CON APROBACIÓN
                      </div>
                      <p className="text-[11px] leading-relaxed text-zinc-300/90">
                        El alumno enviará una solicitud de admisión con sus datos académicos. Secretaría revisa la solicitud antes de autorizar el proceso de matriculación y cobro.
                      </p>
                    </label>
                  </div>
                </div>

                {/* Plazas y Disponibilidad */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">
                      Plazas Máximas:
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="Sin límite"
                      value={formPlazasMaximas}
                      onChange={(e) => setFormPlazasMaximas(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">
                      Plazas Disponibles:
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formPlazasDisponibles}
                      onChange={(e) => setFormPlazasDisponibles(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">
                      Estado Disponibilidad:
                    </label>
                    <select
                      value={formEstadoDisponibilidad}
                      onChange={(e: any) => setFormEstadoDisponibilidad(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-white font-semibold"
                    >
                      <option value="ABIERTA">Abierta</option>
                      <option value="CERRADA">Cerrada</option>
                      <option value="SUSPENDIDA_TEMPORALMENTE">Suspendida Temporalmente</option>
                      <option value="COMPLETA">Completa (Agotada)</option>
                    </select>
                  </div>
                </div>

                {/* Fechas de convocatoria */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">
                      Fecha Apertura Inscripciones:
                    </label>
                    <input
                      type="date"
                      value={formFechaApertura}
                      onChange={(e) => setFormFechaApertura(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">
                      Fecha Cierre Inscripciones:
                    </label>
                    <input
                      type="date"
                      value={formFechaCierre}
                      onChange={(e) => setFormFechaCierre(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-white"
                    />
                  </div>
                </div>
              </div>

              {/* SECCIÓN 3: ESTADO DE PUBLICACIÓN */}
              <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-xl p-4 space-y-3">
                <div className="border-b border-zinc-800 pb-2">
                  <h4 className="font-bold text-sm text-white flex items-center gap-2 font-heading">
                    <Tag className="w-4 h-4 text-red-400" />
                    3. Estado de Publicación en el Catálogo
                  </h4>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[
                    { val: 'PUBLICADO', label: 'Publicado', desc: 'Visible en la web', color: 'emerald' },
                    { val: 'BORRADOR', label: 'Borrador', desc: 'Oculto al público', color: 'zinc' },
                    { val: 'NO_DISPONIBLE', label: 'No disponible', desc: 'Aviso sin inscripción', color: 'amber' },
                    { val: 'ARCHIVADO', label: 'Archivado', desc: 'Inactivo histórico', color: 'rose' }
                  ].map((st) => (
                    <label
                      key={st.val}
                      className={`p-3 rounded-xl border cursor-pointer text-center transition ${
                        formEstadoPublicacion === st.val
                          ? 'bg-red-950/60 border-red-500 text-white font-bold'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="estado_publicacion"
                        value={st.val}
                        checked={formEstadoPublicacion === st.val}
                        onChange={() => setFormEstadoPublicacion(st.val as any)}
                        className="sr-only"
                      />
                      <div className="text-xs">{st.label}</div>
                      <div className="text-[10px] text-zinc-400 mt-0.5">{st.desc}</div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingCourse(null)}
                  disabled={saving}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold rounded-xl transition"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition shadow-lg shadow-red-900/30"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Guardando en MySQL...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Guardar Configuración Comercial
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
