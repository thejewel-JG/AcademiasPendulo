import React, { useState, useEffect } from 'react';
import { 
  Car, 
  Snowflake, 
  Flame, 
  ShieldCheck, 
  Briefcase, 
  ChevronDown, 
  Clock, 
  Award, 
  Building2, 
  BookOpen, 
  FileText, 
  CheckCircle,
  CheckCircle2, 
  Sparkles,
  Search,
  Layers,
  Coins,
  CreditCard,
  Tag,
  Check,
  HelpCircle
} from 'lucide-react';
import { CATEGORIES, COURSES } from '../data/coursesData';
import { Course } from '../types';
import { 
  formatCoursePrice, 
  getAvailabilityInfo, 
  fetchPublicCoursesWithCommercial 
} from '../services/courseService';
import { CourseInfoRequestModal } from './CourseInfoRequestModal';

interface SpecialtiesGridProps {
  onSelectCourse: (course: Course) => void;
  onOpenConsultation: () => void;
  onOpenInscription?: (course: Course) => void;
}

export const SpecialtiesGrid: React.FC<SpecialtiesGridProps> = ({ 
  onSelectCourse, 
  onOpenConsultation,
  onOpenInscription
}) => {
  const [coursesList, setCoursesList] = useState<Course[]>(COURSES);
  const [infoRequestCourse, setInfoRequestCourse] = useState<Course | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [modalityFilter, setModalityFilter] = useState<'all' | 'presencial' | 'teleformacion'>('all');
  const [priceFilter, setPriceFilter] = useState<'all' | 'configured' | 'unconfigured'>('all');
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    fetchPublicCoursesWithCommercial().then(data => {
      if (data && data.length > 0) setCoursesList(data);
    });
  }, []);

  const getCategoryIcon = (id: string) => {
    switch (id) {
      case 'automocion': return <Car className="w-4 h-4" />;
      case 'climatizacion': return <Snowflake className="w-4 h-4" />;
      case 'soldadura': return <Flame className="w-4 h-4" />;
      case 'seguridad': return <ShieldCheck className="w-4 h-4" />;
      case 'administracion': return <Briefcase className="w-4 h-4" />;
      default: return <Layers className="w-4 h-4" />;
    }
  };

  // Strictly sorted according to Section 5:
  // Priority 1: Matrícula abierta first, then matrícula cerrada
  // Priority 2: Manual administrative order (orden_visualizacion ASC)
  // Priority 3: Stable tie-breaker (code ASC)
  const sortedCourses = [...coursesList].sort((a, b) => {
    const aOpen = a.estado_disponibilidad === 'ABIERTA' ? 0 : 1;
    const bOpen = b.estado_disponibilidad === 'ABIERTA' ? 0 : 1;
    if (aOpen !== bOpen) return aOpen - bOpen;

    const aOrder = a.orden_visualizacion || 0;
    const bOrder = b.orden_visualizacion || 0;
    if (aOrder !== bOrder) return aOrder - bOrder;

    return a.code.localeCompare(b.code);
  });

  const filteredCourses = sortedCourses.filter(course => {
    const matchesCategory = activeCategory === 'all' || course.categoryId === activeCategory;
    const matchesSearch = 
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.categoryName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.shortDescription.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesModality = 
      modalityFilter === 'all' ||
      (modalityFilter === 'presencial' && course.modality.toLowerCase().includes('presencial')) ||
      (modalityFilter === 'teleformacion' && (course.modality.toLowerCase().includes('teleformacion') || course.modality.toLowerCase().includes('híbrida') || course.modality.toLowerCase().includes('online')));

    const matchesPrice = 
      priceFilter === 'all' ||
      (priceFilter === 'configured' && course.estado_precio === 'CONFIGURADO' && course.precio_final !== null) ||
      (priceFilter === 'unconfigured' && (course.estado_precio !== 'CONFIGURADO' || course.precio_final === null));

    return matchesCategory && matchesSearch && matchesModality && matchesPrice;
  });

  const toggleAccordion = (courseId: string) => {
    setExpandedCourseId(prev => (prev === courseId ? null : courseId));
  };

  return (
    <section className="py-16 bg-gray-50 border-b border-gray-200" id="especialidades">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-red-50 text-red-800 text-xs font-bold uppercase tracking-wider mb-3 border border-red-200">
            <Sparkles className="w-3.5 h-3.5 text-red-600" /> Catálogo de Formación Privada Especializada
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            Programas Formativos y Especialidades Oficiales
          </h2>
          <p className="text-base text-gray-600 mt-3 leading-relaxed">
            Formación técnica de alto nivel en automoción, diagnosis avanzada, movilidad eléctrica y seguridad. Consulta precios, modalidades y reserva tu plaza.
          </p>
        </div>

        {/* Search & Filter Controls Bar */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-sm mb-8 space-y-4">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            
            {/* Category Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setActiveCategory('all')}
                id="filter-cat-all"
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  activeCategory === 'all'
                    ? 'bg-gray-900 text-white shadow-md'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                Todas las Áreas ({coursesList.length})
              </button>
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  id={`filter-cat-${cat.id}`}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    activeCategory === cat.id
                      ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  <span>{getCategoryIcon(cat.id)}</span>
                  <span>{cat.shortName}</span>
                </button>
              ))}
            </div>

            {/* Search Box */}
            <div className="relative w-full lg:w-72 shrink-0">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                id="courses-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar curso, código (ej: TMVG)..."
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
              />
            </div>
          </div>

          {/* Secondary Filters: Modalidad & Precio */}
          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-gray-100 text-xs">
            <span className="font-bold text-gray-500 uppercase tracking-wider text-[11px] flex items-center gap-1">
              <Tag className="w-3 h-3 text-red-600" /> Filtros:
            </span>

            {/* Modality Filter */}
            <select
              value={modalityFilter}
              onChange={(e) => setModalityFilter(e.target.value as any)}
              className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 focus:ring-2 focus:ring-red-500 focus:outline-none"
            >
              <option value="all">Todas las Modalidades</option>
              <option value="presencial">Presencial (Taller)</option>
              <option value="teleformacion">Teleformación / Híbrida</option>
            </select>

            {/* Price Filter */}
            <select
              value={priceFilter}
              onChange={(e) => setPriceFilter(e.target.value as any)}
              className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 focus:ring-2 focus:ring-red-500 focus:outline-none"
            >
              <option value="all">Todos los Precios</option>
              <option value="configured">Con Precio Establecido</option>
              <option value="unconfigured">Precio a Consultar</option>
            </select>

            <span className="text-gray-400 ml-auto font-medium">
              Mostrando {filteredCourses.length} de {coursesList.length} cursos
            </span>
          </div>
        </div>

        {/* COURSES GRID */}
        {filteredCourses.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-gray-200 shadow-sm space-y-3">
            <Layers className="w-12 h-12 text-gray-300 mx-auto" />
            <h3 className="font-bold text-lg text-gray-800">No se encontraron cursos con estos filtros</h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              Prueba a cambiar los criterios de búsqueda o seleccionar &quot;Todas las Áreas&quot; para ver el catálogo completo.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            {filteredCourses.map((course) => {
              const isExpanded = expandedCourseId === course.id;
              const { priceLabel, isConfigured, taxNote } = formatCoursePrice(course);
              const avail = getAvailabilityInfo(course);

              return (
                <div 
                  key={course.id}
                  id={`course-card-${course.id}`}
                  className={`bg-white rounded-3xl border transition-all duration-300 overflow-hidden flex flex-col justify-between ${
                    isExpanded 
                      ? 'border-red-400 shadow-xl ring-2 ring-red-500/10' 
                      : 'border-gray-200 shadow-md hover:shadow-lg hover:border-gray-300'
                  }`}
                >
                  <div>
                    {/* ALWAYS VISIBLE: Image Header Banner with Badges & Title */}
                    <div className="relative h-56 sm:h-64 w-full overflow-hidden bg-gray-900">
                      <img
                        src={course.imageUrl}
                        alt={course.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover img-zoom"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/40 to-transparent" />
                      
                      {/* Top Badges (Code + Price + Availability) */}
                      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10 gap-2">
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/95 text-red-700 font-mono text-xs font-extrabold shadow-sm">
                          {course.code}
                        </span>

                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          {/* Price Pill */}
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold shadow-md ${
                            isConfigured 
                              ? 'bg-white text-gray-950 border border-gray-100' 
                              : 'bg-black/75 text-amber-300 border border-amber-400/40 backdrop-blur-xs'
                          }`}>
                            <Coins className="w-3.5 h-3.5 text-amber-500" />
                            <span>{priceLabel}</span>
                          </span>

                          {/* Availability Pill */}
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border backdrop-blur-xs ${avail.badgeClass}`}>
                            {avail.label}
                          </span>
                        </div>
                      </div>

                      {/* Bottom overlay info */}
                      <div className="absolute bottom-4 left-4 right-4 text-white z-10">
                        <span className="text-xs text-red-300 font-bold uppercase tracking-wider block">
                          {course.categoryName}
                        </span>
                        <h3 className="font-display text-lg sm:text-xl font-extrabold leading-snug text-white mt-1">
                          {course.title}
                        </h3>
                      </div>
                    </div>

                    {/* CARD BODY WITH DYNAMIC INTERACTIVE TRIGGER BUTTON */}
                    <div className="p-5 sm:p-6 space-y-3">
                      
                      {/* Dynamic Collapsible Trigger Button */}
                      <button
                        onClick={() => toggleAccordion(course.id)}
                        id={`accordion-btn-${course.id}`}
                        className={`group relative w-full py-3.5 px-5 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-between transition-all duration-300 cursor-pointer overflow-hidden ${
                          isExpanded 
                            ? 'bg-gradient-to-r from-red-50 via-white to-red-50 text-red-900 border-2 border-red-500/80 shadow-[0_4px_20px_rgba(239,68,68,0.2)]' 
                            : 'bg-white hover:bg-gradient-to-r hover:from-red-50/70 hover:to-amber-50/50 text-gray-800 border border-gray-200 hover:border-red-400 hover:shadow-[0_8px_25px_rgba(239,68,68,0.2)] hover:text-red-700'
                        }`}
                      >
                        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out pointer-events-none" />

                        <span className="relative flex items-center gap-2.5 font-bold z-10">
                          <span className={`p-1.5 rounded-xl transition-all duration-300 ${
                            isExpanded 
                              ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30 scale-110' 
                              : 'bg-red-100 text-red-600 group-hover:bg-red-600 group-hover:text-white group-hover:scale-110 group-hover:shadow-md group-hover:shadow-red-600/30'
                          }`}>
                            {isExpanded ? (
                              <CheckCircle2 className="w-4 h-4 text-white animate-in zoom-in duration-300" />
                            ) : (
                              <BookOpen className="w-4 h-4 transition-transform group-hover:rotate-12 duration-300" />
                            )}
                          </span>

                          <span className="relative py-0.5">
                            <span className="transition-colors duration-300">
                              {isExpanded ? 'Ocultar Información y Temario' : 'Ver Información del Curso, Horas y Temario'}
                            </span>
                            <span className={`absolute bottom-0 left-0 h-[2px] rounded-full bg-gradient-to-r from-red-600 via-amber-500 to-red-600 transition-all duration-300 ${
                              isExpanded ? 'w-full' : 'w-0 group-hover:w-full'
                            }`} />
                          </span>
                        </span>

                        <span className={`relative z-10 p-1.5 rounded-xl transition-all duration-300 ${
                          isExpanded 
                            ? 'bg-red-600 text-white shadow-md shadow-red-600/30 rotate-180' 
                            : 'bg-gray-100 text-gray-600 group-hover:bg-red-600 group-hover:text-white group-hover:shadow-md group-hover:shadow-red-600/20'
                        }`}>
                          <ChevronDown className="w-4 h-4 transition-transform duration-300" />
                        </span>
                      </button>

                      {/* Quick Metric Grid with Commercial Fields */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center bg-gray-50/80 p-3 rounded-2xl border border-gray-200/80">
                        <div>
                          <span className="text-[10px] text-gray-500 uppercase font-bold block">Modalidad</span>
                          <span className="text-xs font-bold text-gray-900">{course.modality}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-500 uppercase font-bold block">Horas Totales</span>
                          <span className="text-xs font-bold text-gray-900">{course.totalHours}h</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-500 uppercase font-bold block">Inscripción</span>
                          <span className={`text-[11px] font-extrabold ${course.tipo_inscripcion === 'COMPRA_DIRECTA' ? 'text-amber-700' : 'text-blue-700'}`}>
                            {course.tipo_inscripcion === 'COMPRA_DIRECTA' ? 'Compra Directa' : 'Con Aprobación'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-500 uppercase font-bold block">Precio Oficial</span>
                          <span className="text-xs font-extrabold text-red-600 block">{priceLabel}</span>
                          <span className="text-[9px] text-gray-500 block leading-tight">{taxNote}</span>
                        </div>
                      </div>

                      {/* EXPANDABLE COLLAPSIBLE CONTENT */}
                      {isExpanded && (
                        <div className="space-y-4 pt-3 border-t border-gray-100 animate-in fade-in duration-200" id={`accordion-content-${course.id}`}>
                          
                          {/* Short Description */}
                          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                            {course.shortDescription}
                          </p>

                          {/* Schedule and Next Call */}
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600 bg-red-50/60 p-3 rounded-xl border border-red-100">
                            <span className="flex items-center gap-1.5 font-semibold text-gray-800">
                              <Clock className="w-4 h-4 text-red-600" /> {course.schedule}
                            </span>
                            <span className="font-bold text-red-700">
                              Próximo inicio: {course.nextCall}
                            </span>
                          </div>

                          {/* Modules List */}
                          <div className="space-y-2">
                            <h4 className="font-bold text-gray-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                              <BookOpen className="w-3.5 h-3.5 text-red-600" /> Módulos Formativos Oficiales
                            </h4>
                            <div className="space-y-1.5">
                              {course.modules.map(mod => (
                                <div key={mod.code} className="p-2.5 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-between text-xs">
                                  <div className="pr-2 truncate">
                                    <span className="font-mono text-[10px] font-semibold text-gray-400 mr-2">{mod.code}</span>
                                    <span className="text-gray-800 font-medium">{mod.name}</span>
                                  </div>
                                  <span className="font-bold text-gray-700 shrink-0">{mod.hours}h</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Job Outlets */}
                          <div className="space-y-1.5">
                            <h4 className="font-bold text-gray-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-red-600" /> Principales Salidas Profesionales
                            </h4>
                            <ul className="space-y-1 pl-1 text-xs text-gray-700">
                              {course.jobOutlets.map((job, jIdx) => (
                                <li key={jIdx} className="flex items-center gap-2">
                                  <CheckCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                                  <span>{job}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Access Requirements */}
                          <div className="space-y-1.5">
                            <h4 className="font-bold text-gray-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                              <Award className="w-3.5 h-3.5 text-red-600" /> Requisitos de Admisión
                            </h4>
                            <ul className="space-y-1 pl-1 text-xs text-gray-600">
                              {course.requirements.map((req, rIdx) => (
                                <li key={rIdx} className="flex items-start gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                                  <span>{req}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                        </div>
                      )}
                    </div>
                  </div>

                  {/* CARD ACTION BUTTONS */}
                  <div className="p-5 sm:p-6 pt-0 flex flex-col sm:flex-row items-center gap-3">
                    <button
                      onClick={() => onSelectCourse(course)}
                      id={`btn-dossier-${course.id}`}
                      className="group relative overflow-hidden w-full sm:w-1/2 py-3 px-4 rounded-xl border border-gray-300 hover:border-red-400 hover:bg-gradient-to-r hover:from-gray-50 hover:to-red-50/40 text-gray-700 hover:text-red-700 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all duration-300 shadow-xs hover:shadow-md hover:scale-[1.02] active:scale-95 min-h-[48px] cursor-pointer"
                    >
                      <FileText className="w-4 h-4 text-gray-500 group-hover:text-red-600 group-hover:scale-125 transition-all duration-300" />
                      <span className="relative z-10">Consultar Ficha y Temario</span>
                    </button>

                    {!avail.isOpen ? (
                      <button
                        onClick={() => setInfoRequestCourse(course)}
                        id={`btn-solicitar-info-${course.id}`}
                        className="group relative overflow-hidden w-full sm:w-1/2 py-3 px-4 rounded-xl bg-gradient-to-r from-zinc-800 to-zinc-900 hover:from-zinc-700 hover:to-zinc-800 text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all duration-300 shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-95 cursor-pointer min-h-[48px] border border-zinc-700"
                      >
                        <HelpCircle className="w-4 h-4 text-zinc-300" />
                        <span className="relative z-10 tracking-wide">Solicitar información</span>
                      </button>
                    ) : course.tipo_inscripcion === 'COMPRA_DIRECTA' ? (
                      <button
                        onClick={() => {
                          if (onOpenInscription) {
                            onOpenInscription(course);
                          } else {
                            onSelectCourse(course);
                          }
                        }}
                        id={`btn-reserva-${course.id}`}
                        className="group relative overflow-hidden w-full sm:w-1/2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all duration-300 shadow-md hover:shadow-[0_10px_25px_rgba(16,185,129,0.4)] hover:scale-[1.03] active:scale-95 cursor-pointer min-h-[48px] border border-emerald-400/50"
                      >
                        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/35 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out pointer-events-none" />
                        <CreditCard className="w-4 h-4 text-emerald-200" />
                        <span className="relative z-10 tracking-wide">Matricularme</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          if (onOpenInscription) {
                            onOpenInscription(course);
                          } else {
                            onSelectCourse(course);
                          }
                        }}
                        id={`btn-reserva-${course.id}`}
                        className="group relative overflow-hidden w-full sm:w-1/2 py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 via-red-600 to-amber-600 hover:from-red-500 hover:via-red-600 hover:to-amber-500 text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all duration-300 shadow-md hover:shadow-[0_10px_25px_rgba(239,68,68,0.4)] hover:scale-[1.03] active:scale-95 cursor-pointer min-h-[48px] border border-red-400/50"
                      >
                        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/35 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out pointer-events-none" />
                        <Sparkles className="w-4 h-4 text-amber-200 group-hover:text-yellow-200" />
                        <span className="relative z-10 tracking-wide">Solicitar plaza</span>
                      </button>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}

        {/* Bottom Banner for Prospective Students */}
        <div className="mt-14 bg-white rounded-3xl p-8 border-2 border-red-100 flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg">
          <div className="space-y-2 text-center md:text-left">
            <span className="text-xs font-bold uppercase tracking-wider text-red-600">
              ¿Dudas sobre qué itinerario formativo elegir?
            </span>
            <h3 className="font-display text-2xl font-bold text-gray-900">
              Asesoramiento Académico y Comercial Personalizado
            </h3>
            <p className="text-sm text-gray-600 max-w-xl">
              Nuestro equipo docente y de secretaría analiza tu formación previa, objetivos y disponibilidad horaria para recomendarte la especialidad y modalidad más conveniente.
            </p>
          </div>
          <button
            onClick={onOpenConsultation}
            id="btn-asesoramiento-gratuito"
            className="px-6 py-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shrink-0 btn-hover shadow-md shadow-red-600/20"
          >
            Hablar con un Asesor Ahora
          </button>
        </div>

        {/* Course Info Request Modal for Closed Enrollment Courses */}
        <CourseInfoRequestModal
          course={infoRequestCourse}
          isOpen={!!infoRequestCourse}
          onClose={() => setInfoRequestCourse(null)}
        />

      </div>
    </section>
  );
};
