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
  Sparkles,
  Search,
  Layers
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
      case 'automocion': return <Car className="w-5 h-5" />;
      case 'climatizacion': return <Snowflake className="w-5 h-5" />;
      case 'soldadura': return <Flame className="w-5 h-5" />;
      case 'seguridad': return <ShieldCheck className="w-5 h-5" />;
      case 'administracion': return <Briefcase className="w-5 h-5" />;
      default: return <Layers className="w-5 h-5" />;
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
    <section className="py-20 bg-gray-50 border-b border-gray-200" id="especialidades">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-800 text-xs font-bold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5 text-red-600" /> Catálogo Oficial Homologado
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            Especialidades Formativas y Certificados
          </h2>
          <p className="text-base text-gray-600 mt-3 leading-relaxed">
            Programas formativos completos con <strong>titulación oficial SEPE y Junta de Andalucía</strong>. Formación práctica en talleres con maquinaria profesional y prácticas no laborales en empresas concertadas.
          </p>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-10">
          
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
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
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
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
            />
          </div>
        </div>

        {/* Courses Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {filteredCourses.map((course) => {
            const isExpanded = expandedCourseId === course.id;

            return (
              <div 
                key={course.id}
                id={`course-card-${course.id}`}
                className="bg-white rounded-3xl border border-gray-200/90 shadow-[0_10px_30px_rgba(0,0,0,0.08)] hover:shadow-[0_20px_45px_rgba(0,0,0,0.15)] transition-all duration-300 hover:-translate-y-1.5 hover:border-red-300 overflow-hidden flex flex-col justify-between"
              >
                <div>
                  {/* Card Banner Image with Badges */}
                  <div className="relative h-48 sm:h-56 w-full overflow-hidden bg-gray-100">
                    <img
                      src={course.imageUrl}
                      alt={course.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover img-zoom"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-950/80 via-gray-950/20 to-transparent" />
                    
                    {/* Top Badges */}
                    <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 text-red-600 font-mono text-xs font-bold backdrop-blur-md border border-gray-200">
                        {course.code}
                      </span>

                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-600/90 text-white text-xs font-bold backdrop-blur-md shadow-xs">
                        <Sparkles className="w-3.5 h-3.5" /> 100% Subvencionado
                      </span>
                    </div>

                    {/* Bottom overlay info */}
                    <div className="absolute bottom-4 left-4 right-4 text-white">
                      <span className="text-xs text-red-300 font-bold uppercase tracking-wider">
                        {course.categoryName}
                      </span>
                      <h3 className="font-display text-lg sm:text-xl font-bold leading-snug line-clamp-2 mt-0.5 text-white">
                        {course.title}
                      </h3>
                    </div>
                  </div>

                  {/* Card Content & Key Metrics */}
                  <div className="p-6">
                    {/* Quick Metric Pills */}
                    <div className="grid grid-cols-3 gap-2 pb-4 border-b border-gray-100 text-center">
                      <div className="bg-gray-50 rounded-xl p-2">
                        <span className="text-[10px] text-gray-500 block uppercase font-bold">Nivel Oficial</span>
                        <span className="text-xs font-bold text-gray-800">{course.level}</span>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-2">
                        <span className="text-[10px] text-gray-500 block uppercase font-bold">Horas Totales</span>
                        <span className="text-xs font-bold text-gray-800">{course.totalHours}h</span>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-2">
                        <span className="text-[10px] text-gray-500 block uppercase font-bold">Prácticas</span>
                        <span className="text-xs font-bold text-red-600">{course.practiceHours}h garantizadas</span>
                      </div>
                    </div>

                    {/* Short Description */}
                    <p className="text-xs sm:text-sm text-gray-600 mt-4 leading-relaxed">
                      {course.shortDescription}
                    </p>

                    {/* Schedule and places */}
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500 bg-red-50/50 p-2.5 rounded-xl border border-red-100">
                      <span className="flex items-center gap-1 font-medium text-gray-700">
                        <Clock className="w-3.5 h-3.5 text-red-600" /> {course.schedule}
                      </span>
                      <span className="font-semibold text-red-700">
                        Próximo inicio: {course.nextCall}
                      </span>
                    </div>

                    {/* Accordion Trigger */}
                    <div className="mt-4">
                      <button
                        onClick={() => toggleAccordion(course.id)}
                        id={`accordion-btn-${course.id}`}
                        className="w-full py-2 px-3 rounded-xl bg-gray-100 hover:bg-gray-200/80 text-gray-800 text-xs font-bold flex items-center justify-between transition-colors"
                      >
                        <span className="flex items-center gap-1.5">
                          <BookOpen className="w-4 h-4 text-red-600" />
                          {isExpanded ? 'Ocultar Temario y Requisitos' : 'Ver Módulos Oficiales, Salidas y Requisitos'}
                        </span>
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-red-600' : ''}`} />
                      </button>

                      {/* Accordion Content */}
                      {isExpanded && (
                        <div className="mt-4 space-y-4 pt-2 border-t border-gray-100 text-xs animate-in fade-in duration-200" id={`accordion-content-${course.id}`}>
                          {/* Modules List */}
                          <div>
                            <h4 className="font-bold text-gray-900 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
                              <BookOpen className="w-3.5 h-3.5 text-red-600" /> Módulos Formativos Oficiales
                            </h4>
                            <div className="space-y-1.5">
                              {course.modules.map(mod => (
                                <div key={mod.code} className="p-2 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-between">
                                  <div>
                                    <span className="font-mono font-semibold text-gray-400 mr-2">{mod.code}</span>
                                    <span className="text-gray-800 font-medium">{mod.name}</span>
                                  </div>
                                  <span className="font-semibold text-gray-600 shrink-0 ml-2">{mod.hours}h</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Job Outlets */}
                          <div>
                            <h4 className="font-bold text-gray-900 uppercase tracking-wider text-[11px] mb-1.5 flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-red-600" /> Principales Salidas Laborales
                            </h4>
                            <ul className="space-y-1 pl-1">
                              {course.jobOutlets.map((job, jIdx) => (
                                <li key={jIdx} className="flex items-center gap-2 text-gray-700">
                                  <CheckCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                                  <span>{job}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Access Requirements */}
                          <div>
                            <h4 className="font-bold text-gray-900 uppercase tracking-wider text-[11px] mb-1.5 flex items-center gap-1.5">
                              <Award className="w-3.5 h-3.5 text-red-600" /> Requisitos de Acceso
                            </h4>
                            <ul className="space-y-1 pl-1">
                              {course.requirements.map((req, rIdx) => (
                                <li key={rIdx} className="flex items-start gap-2 text-gray-600">
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
                </div>

                {/* Card Action Buttons - 48px touch targets */}
                <div className="p-5 sm:p-6 pt-0 flex flex-col sm:flex-row items-center gap-3">
                  <button
                    onClick={() => onSelectCourse(course)}
                    id={`btn-dossier-${course.id}`}
                    className="w-full sm:w-1/2 py-3 px-4 rounded-xl border border-gray-300 hover:bg-gray-50 hover:border-red-300 text-gray-700 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all min-h-[48px] cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-gray-500" />
                    <span>Solicitar Dossier PDF</span>
                  </button>

                  <button
                    onClick={() => onSelectCourse(course)}
                    id={`btn-reserva-${course.id}`}
                    className="w-full sm:w-1/2 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer min-h-[48px]"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Reservar Plaza Oficial</span>
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
