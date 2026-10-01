import React, { useState } from 'react';
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
  Info
} from 'lucide-react';
import { CATEGORIES, COURSES } from '../data/coursesData';
import { Course } from '../types';

interface SpecialtiesGridProps {
  onSelectCourse: (course: Course) => void;
  onOpenConsultation: () => void;
}

export const SpecialtiesGrid: React.FC<SpecialtiesGridProps> = ({ 
  onSelectCourse, 
  onOpenConsultation 
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

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

  const filteredCourses = COURSES.filter(course => {
    const matchesCategory = activeCategory === 'all' || course.categoryId === activeCategory;
    const matchesSearch = 
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.categoryName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.shortDescription.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const toggleAccordion = (courseId: string) => {
    setExpandedCourseId(prev => (prev === courseId ? null : courseId));
  };

  return (
    <section className="py-16 bg-gray-50 border-b border-gray-200" id="especialidades">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-800 text-xs font-bold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5 text-red-600" /> Catálogo Oficial Homologado
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            Especialidades Formativas y Certificados
          </h2>
          <p className="text-base text-gray-600 mt-3 leading-relaxed">
            Explora las especialidades oficiales subvencionadas. Pasa el ratón sobre <strong>Ver Información</strong> de cualquier curso para descubrir sus detalles de forma interactiva.
          </p>
        </div>

        {/* Search & Filter Controls Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
          
          {/* Category Pills */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => setActiveCategory('all')}
              id="filter-cat-all"
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeCategory === 'all'
                  ? 'bg-gray-900 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              Todas las Áreas ({COURSES.length})
            </button>
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                id={`filter-cat-${cat.id}`}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  activeCategory === cat.id
                    ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <span>{getCategoryIcon(cat.id)}</span>
                <span>{cat.shortName}</span>
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="courses-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar curso, código (ej: TMVG)..."
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
            />
          </div>
        </div>

        {/* COURSES GRID WITH IMAGE HEADER ALWAYS VISIBLE & DYNAMIC INTERACTIVE BUTTON */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {filteredCourses.map((course) => {
            const isExpanded = expandedCourseId === course.id;

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
                  <div className="relative h-52 sm:h-60 w-full overflow-hidden bg-gray-900">
                    <img
                      src={course.imageUrl}
                      alt={course.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover img-zoom"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/40 to-transparent" />
                    
                    {/* Top Badges */}
                    <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/95 text-red-700 font-mono text-xs font-extrabold shadow-sm">
                        {course.code}
                      </span>

                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-600 text-white text-xs font-extrabold shadow-md">
                        <Sparkles className="w-3.5 h-3.5" /> 100% Subvencionado
                      </span>
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

                  {/* CARD BODY WITH STUNNING DYNAMIC INTERACTIVE TRIGGER BUTTON */}
                  <div className="p-5 sm:p-6 space-y-3">
                    
                    {/* Dynamic Collapsible Trigger Button with Hover Glow, Animated Underline & Green Tick Morph */}
                    <button
                      onClick={() => toggleAccordion(course.id)}
                      id={`accordion-btn-${course.id}`}
                      className={`group relative w-full py-3.5 px-5 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-between transition-all duration-300 cursor-pointer overflow-hidden ${
                        isExpanded 
                          ? 'bg-gradient-to-r from-red-50 via-white to-red-50 text-red-900 border-2 border-red-500/80 shadow-[0_4px_20px_rgba(239,68,68,0.2)]' 
                          : 'bg-white hover:bg-gradient-to-r hover:from-red-50/70 hover:to-amber-50/50 text-gray-800 border border-gray-200 hover:border-red-400 hover:shadow-[0_8px_25px_rgba(239,68,68,0.2)] hover:text-red-700'
                      }`}
                    >
                      {/* Shimmer illumination sweep line on hover */}
                      <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out pointer-events-none" />

                      <span className="relative flex items-center gap-2.5 font-bold z-10">
                        {/* Dynamic morphing icon: turns into a vibrant green CheckCircle2 when opened, or glows BookOpen on hover */}
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

                        {/* Text with animated red gradient underline on hover */}
                        <span className="relative py-0.5">
                          <span className="transition-colors duration-300">
                            {isExpanded ? 'Ocultar Información y Temario' : 'Ver Información del Curso, Horas y Temario'}
                          </span>
                          {/* Cool animated underline on hover */}
                          <span className={`absolute bottom-0 left-0 h-[2px] rounded-full bg-gradient-to-r from-red-600 via-amber-500 to-red-600 transition-all duration-300 ${
                            isExpanded ? 'w-full' : 'w-0 group-hover:w-full'
                          }`} />
                        </span>
                      </span>

                      {/* Chevron Badge with glowing ring */}
                      <span className={`relative z-10 p-1.5 rounded-xl transition-all duration-300 ${
                        isExpanded 
                          ? 'bg-red-600 text-white shadow-md shadow-red-600/30 rotate-180' 
                          : 'bg-gray-100 text-gray-600 group-hover:bg-red-600 group-hover:text-white group-hover:shadow-md group-hover:shadow-red-600/20'
                      }`}>
                        <ChevronDown className="w-4 h-4 transition-transform duration-300" />
                      </span>
                    </button>

                    {/* EXPANDABLE COLLAPSIBLE CONTENT (Only visible when user clicks the desplegable) */}
                    {isExpanded && (
                      <div className="space-y-4 pt-3 border-t border-gray-100 animate-in fade-in duration-200" id={`accordion-content-${course.id}`}>
                        
                        {/* Quick Metric Pills */}
                        <div className="grid grid-cols-3 gap-2 text-center bg-gray-50/80 p-3 rounded-2xl border border-gray-200/80">
                          <div>
                            <span className="text-[10px] text-gray-500 uppercase font-bold block">Nivel Oficial</span>
                            <span className="text-xs font-bold text-gray-900">{course.level}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-500 uppercase font-bold block">Horas Totales</span>
                            <span className="text-xs font-bold text-gray-900">{course.totalHours}h</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-500 uppercase font-bold block">Prácticas</span>
                            <span className="text-xs font-bold text-red-600">{course.practiceHours}h garantizadas</span>
                          </div>
                        </div>

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
                            <Building2 className="w-3.5 h-3.5 text-red-600" /> Principales Salidas Laborales
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
                            <Award className="w-3.5 h-3.5 text-red-600" /> Requisitos de Acceso
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

                {/* CARD ACTION BUTTONS (ALWAYS ACCESSIBLE AT BOTTOM) WITH RICH MICRO-ANIMATIONS */}
                <div className="p-5 sm:p-6 pt-0 flex flex-col sm:flex-row items-center gap-3">
                  <button
                    onClick={() => onSelectCourse(course)}
                    id={`btn-dossier-${course.id}`}
                    className="group relative overflow-hidden w-full sm:w-1/2 py-3 px-4 rounded-xl border border-gray-300 hover:border-red-400 hover:bg-gradient-to-r hover:from-gray-50 hover:to-red-50/40 text-gray-700 hover:text-red-700 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all duration-300 shadow-xs hover:shadow-md hover:scale-[1.02] active:scale-95 min-h-[48px] cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-gray-500 group-hover:text-red-600 group-hover:scale-125 transition-all duration-300" />
                    <span className="relative z-10">Solicitar Dossier PDF</span>
                  </button>

                  <button
                    onClick={() => onSelectCourse(course)}
                    id={`btn-reserva-${course.id}`}
                    className="group relative overflow-hidden w-full sm:w-1/2 py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 via-red-600 to-amber-600 hover:from-red-500 hover:via-red-600 hover:to-amber-500 text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all duration-300 shadow-md hover:shadow-[0_10px_25px_rgba(239,68,68,0.4)] hover:scale-[1.03] active:scale-95 cursor-pointer min-h-[48px] border border-red-400/50"
                  >
                    {/* Shimmer illumination sweep on hover */}
                    <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/35 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out pointer-events-none" />

                    {/* Glowing Sparkles Star Icon */}
                    <Sparkles className="w-4 h-4 text-amber-200 group-hover:text-yellow-200 group-hover:scale-135 group-hover:rotate-45 group-hover:drop-shadow-[0_0_10px_rgba(253,224,71,1)] transition-all duration-300" />
                    <span className="relative z-10 tracking-wide">Reservar Plaza Oficial</span>
                  </button>
                </div>

              </div>
            );
          })}
        </div>

        {/* Bottom Banner for Unsure Students */}
        <div className="mt-14 bg-white rounded-3xl p-8 border-2 border-red-100 flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg">
          <div className="space-y-2 text-center md:text-left">
            <span className="text-xs font-bold uppercase tracking-wider text-red-600">
              ¿No tienes claro cuál es tu nivel o qué curso elegir?
            </span>
            <h3 className="font-display text-2xl font-bold text-gray-900">
              Orientación Pedagógica Personalizada en Almería
            </h3>
            <p className="text-sm text-gray-600 max-w-xl">
              Revisamos tu titulación previa (ESO, Bachiller, competencias clave) y te explicamos cómo acceder a los cursos 100% subvencionados del SAE.
            </p>
          </div>
          <button
            onClick={onOpenConsultation}
            id="btn-asesoramiento-gratuito"
            className="px-6 py-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shrink-0 btn-hover shadow-md shadow-red-600/20"
          >
            Hablar con un Orientador Ahora
          </button>
        </div>

      </div>
    </section>
  );
};
