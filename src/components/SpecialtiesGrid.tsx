import React, { useState, useEffect, useMemo } from 'react';
import { 
  Car, 
  ShieldCheck, 
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
  HelpCircle,
  Zap,
  Activity,
  Wrench,
  Gauge,
  LayoutGrid,
  List,
  Scale,
  X,
  ChevronRight,
  SlidersHorizontal,
  RotateCcw
} from 'lucide-react';
import { COURSES } from '../data/coursesData';
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

type TechnicalTrackId = 'all' | 'certificados' | 'ev' | 'diagnosis' | 'mecanica' | 'motos_prl';
type CardTabType = 'resumen' | 'modulos' | 'taller';
type ProfileLevelFilter = 'all' | 'inicial' | 'avanzado' | 'oficial';

const TECHNICAL_TRACKS: {
  id: TechnicalTrackId;
  title: string;
  subtitle: string;
  codes: string[];
}[] = [
  {
    id: 'all',
    title: 'Catálogo Global',
    subtitle: '33 Especialidades Oficiales',
    codes: []
  },
  {
    id: 'certificados',
    title: 'Certificados SEPE',
    subtitle: 'Títulos Oficiales BOE',
    codes: ['TMVG0109', 'TMVG0209', 'TMVG0309', 'TMVG0409', 'TMVG0110']
  },
  {
    id: 'ev',
    title: 'Híbridos y EV',
    subtitle: 'Alta Tensión 1000V',
    codes: ['TMVG0004', 'TMVG03', 'TMVG05', 'TMVG06', 'TMVG07']
  },
  {
    id: 'diagnosis',
    title: 'Diagnosis y ADAS',
    subtitle: 'Osciloscopio, OBD y Radar',
    codes: ['TMVG0008', 'TMVG004PO', 'TMVG007PO', 'TMVG04', 'TMVG08', 'TMVG0072', 'TMVG13']
  },
  {
    id: 'mecanica',
    title: 'Mecánica y Motor',
    subtitle: 'Distribución, Taller e ITV',
    codes: ['TMVG0002', 'TMVG0021', 'TMVG0022', 'TMVG0063', 'TMVG0065', 'TMVG0066', 'TMVG0068', 'TMVG0069', 'TMVG0071', 'TMVG012PO']
  },
  {
    id: 'motos_prl',
    title: 'Motos, VMP y PRL',
    subtitle: '2 Ruedas, E-Bikes y Seguridad',
    codes: ['TMVG0064', 'TMVG0067', 'TMVG0070', 'TMVG12', 'TMVG14', 'FCOS02']
  }
];

function getCourseTrack(course: Course): TechnicalTrackId {
  const code = course.code.toUpperCase();
  for (const track of TECHNICAL_TRACKS) {
    if (track.id !== 'all' && track.codes.includes(code)) {
      return track.id;
    }
  }
  return course.categoryId === 'fco' ? 'motos_prl' : 'mecanica';
}

function getCourseProfileTypes(course: Course): ProfileLevelFilter[] {
  const profiles: ProfileLevelFilter[] = [];
  const isOfficialCert = ['TMVG0109', 'TMVG0209', 'TMVG0309', 'TMVG0409', 'TMVG0110'].includes(course.code.toUpperCase()) ||
    course.level.toLowerCase().includes('certificado');
  if (isOfficialCert) {
    profiles.push('oficial');
  }
  const reqText = (course.requirements || []).join(' ').toLowerCase();
  if (reqText.includes('sin requisitos') || course.code === 'TMVG0109' || course.code === 'TMVG0002' || course.code === 'TMVG0021') {
    profiles.push('inicial');
  } else {
    profiles.push('avanzado');
  }
  return profiles;
}

export const SpecialtiesGrid: React.FC<SpecialtiesGridProps> = ({ 
  onSelectCourse, 
  onOpenConsultation,
  onOpenInscription
}) => {
  const [coursesList, setCoursesList] = useState<Course[]>(COURSES);
  const [infoRequestCourse, setInfoRequestCourse] = useState<Course | null>(null);
  const [activeTrack, setActiveTrack] = useState<TechnicalTrackId>('all');
  const [profileFilter, setProfileFilter] = useState<ProfileLevelFilter>('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'open'>('all');
  const [modalityFilter, setModalityFilter] = useState<'all' | 'presencial' | 'teleformacion'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [visibleCount, setVisibleCount] = useState<number>(6);
  const [cardTabs, setCardTabs] = useState<Record<string, CardTabType>>({});
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState<boolean>(false);

  useEffect(() => {
    fetchPublicCoursesWithCommercial().then(data => {
      if (data && data.length > 0) setCoursesList(data);
    });
  }, []);

  const getTrackIcon = (id: TechnicalTrackId) => {
    switch (id) {
      case 'certificados': return <Award className="w-4 h-4" />;
      case 'ev': return <Zap className="w-4 h-4" />;
      case 'diagnosis': return <Activity className="w-4 h-4" />;
      case 'mecanica': return <Wrench className="w-4 h-4" />;
      case 'motos_prl': return <Gauge className="w-4 h-4" />;
      default: return <Layers className="w-4 h-4" />;
    }
  };

  // Strictly sorted according to Section 5:
  // Priority 1: Matrícula abierta first, then matrícula cerrada
  // Priority 2: Manual administrative order (orden_visualizacion ASC)
  // Priority 3: Stable tie-breaker (code ASC)
  const sortedCourses = useMemo(() => {
    return [...coursesList].sort((a, b) => {
      const aOpen = a.estado_disponibilidad === 'ABIERTA' ? 0 : 1;
      const bOpen = b.estado_disponibilidad === 'ABIERTA' ? 0 : 1;
      if (aOpen !== bOpen) return aOpen - bOpen;

      const aOrder = a.orden_visualizacion || 0;
      const bOrder = b.orden_visualizacion || 0;
      if (aOrder !== bOrder) return aOrder - bOrder;

      return a.code.localeCompare(b.code);
    });
  }, [coursesList]);

  const trackCounts = useMemo(() => {
    const counts: Record<TechnicalTrackId, number> = {
      all: sortedCourses.length,
      certificados: 0,
      ev: 0,
      diagnosis: 0,
      mecanica: 0,
      motos_prl: 0
    };
    sortedCourses.forEach(c => {
      const t = getCourseTrack(c);
      counts[t] = (counts[t] || 0) + 1;
    });
    return counts;
  }, [sortedCourses]);

  const filteredCourses = useMemo(() => {
    return sortedCourses.filter(course => {
      const matchesTrack = activeTrack === 'all' || getCourseTrack(course) === activeTrack;
      const profiles = getCourseProfileTypes(course);
      const matchesProfile = profileFilter === 'all' || profiles.includes(profileFilter);

      const avail = getAvailabilityInfo(course);
      const matchesAvailability = availabilityFilter === 'all' || (availabilityFilter === 'open' && avail.isOpen);

      const q = searchQuery.trim().toLowerCase();
      const matchesSearch = !q ||
        course.title.toLowerCase().includes(q) ||
        course.code.toLowerCase().includes(q) ||
        course.categoryName.toLowerCase().includes(q) ||
        course.shortDescription.toLowerCase().includes(q) ||
        (course.equipmentHighlights || []).join(' ').toLowerCase().includes(q);

      const matchesModality =
        modalityFilter === 'all' ||
        (modalityFilter === 'presencial' && course.modality.toLowerCase().includes('presencial')) ||
        (modalityFilter === 'teleformacion' && (course.modality.toLowerCase().includes('teleformacion') || course.modality.toLowerCase().includes('híbrida') || course.modality.toLowerCase().includes('online')));

      return matchesTrack && matchesProfile && matchesAvailability && matchesSearch && matchesModality;
    });
  }, [sortedCourses, activeTrack, profileFilter, availabilityFilter, searchQuery, modalityFilter]);

  const visibleCourses = useMemo(() => {
    return filteredCourses.slice(0, visibleCount);
  }, [filteredCourses, visibleCount]);

  const handleTrackChange = (trackId: TechnicalTrackId) => {
    setActiveTrack(trackId);
    setVisibleCount(6);
  };

  const handleCardTab = (courseId: string, tab: CardTabType) => {
    setCardTabs(prev => ({ ...prev, [courseId]: tab }));
  };

  const toggleCompareCourse = (courseId: string) => {
    setCompareIds(prev => {
      if (prev.includes(courseId)) {
        return prev.filter(id => id !== courseId);
      }
      if (prev.length >= 3) {
        return [...prev.slice(1), courseId];
      }
      return [...prev, courseId];
    });
  };

  const resetAllFilters = () => {
    setActiveTrack('all');
    setProfileFilter('all');
    setAvailabilityFilter('all');
    setModalityFilter('all');
    setSearchQuery('');
    setVisibleCount(6);
  };

  const comparedCourses = useMemo(() => {
    return compareIds.map(id => coursesList.find(c => c.id === id)).filter((c): c is Course => !!c);
  }, [compareIds, coursesList]);

  return (
    <section className="py-16 bg-gray-50 border-b border-gray-200 relative" id="especialidades">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Interactive Header & Live Configurator Banner */}
        <div className="bg-gray-950 text-white rounded-3xl p-6 sm:p-8 border border-gray-800 shadow-xl relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center relative z-10">
            
            <div className="lg:col-span-5 space-y-2.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-wider">
                <SlidersHorizontal className="w-3.5 h-3.5 text-red-400" />
                Explorador Técnico Interactivo
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                Programas Formativos y Especialidades Oficiales
              </h2>
              <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                Filtra por itinerario técnico o nivel previo. Cada tarjeta permite inspeccionar temario, módulos y equipamiento en taller sin recargar ni alargar la página.
              </p>
            </div>

            {/* Interactive Configurator Controls */}
            <div className="lg:col-span-7 bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Profile / Experience Filter */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                    1. Nivel / Objetivo Profesional
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: 'all', label: 'Todos los niveles' },
                      { id: 'inicial', label: 'Desde cero (Sin estudios)' },
                      { id: 'avanzado', label: 'Especialización Taller' },
                      { id: 'oficial', label: 'Certificado Oficial BOE' }
                    ].map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setProfileFilter(opt.id as ProfileLevelFilter);
                          setVisibleCount(6);
                        }}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border text-left transition-all cursor-pointer ${
                          profileFilter === opt.id
                            ? 'bg-red-600 text-white border-red-500 shadow-sm'
                            : 'bg-zinc-950 text-gray-300 border-zinc-800 hover:border-zinc-600 hover:text-white'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Search & Availability Filter */}
                <div className="space-y-3 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                      2. Estado y Modalidad
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setAvailabilityFilter(prev => prev === 'open' ? 'all' : 'open');
                          setVisibleCount(6);
                        }}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          availabilityFilter === 'open'
                            ? 'bg-emerald-600 text-white border-emerald-500'
                            : 'bg-zinc-950 text-gray-300 border-zinc-800 hover:border-zinc-600'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Solo Matrícula Abierta</span>
                      </button>

                      <select
                        value={modalityFilter}
                        onChange={(e) => {
                          setModalityFilter(e.target.value as any);
                          setVisibleCount(6);
                        }}
                        className="px-2.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-semibold text-gray-200 focus:ring-2 focus:ring-red-500 focus:outline-none cursor-pointer"
                      >
                        <option value="all">Todas las Modalidades</option>
                        <option value="presencial">Presencial (Taller)</option>
                        <option value="teleformacion">Teleformación / Flexible</option>
                      </select>
                    </div>
                  </div>

                  {/* Instant Search Input */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      id="courses-search-input"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setVisibleCount(12);
                      }}
                      placeholder="Buscar por código (TMVG0209), ADAS, osciloscopio, híbridos..."
                      className="w-full pl-9 pr-8 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500 transition-all"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>

        {/* 6 Technical Sub-Families Bento Selector (No Emojis, Clean SVG Vector Icons) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {TECHNICAL_TRACKS.map(track => {
            const isActive = activeTrack === track.id;
            const count = trackCounts[track.id] || 0;
            return (
              <button
                key={track.id}
                type="button"
                id={track.id === 'all' ? 'filter-cat-all' : `filter-cat-${track.id}`}
                onClick={() => handleTrackChange(track.id)}
                className={`p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between gap-2.5 ${
                  isActive
                    ? 'bg-gray-950 text-white border-red-500 shadow-lg ring-2 ring-red-500/20 -translate-y-0.5'
                    : 'bg-white text-gray-900 border-gray-200 hover:border-red-400 hover:shadow-md'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={`p-2 rounded-xl transition-colors ${
                    isActive ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {getTrackIcon(track.id)}
                  </span>
                  <span className={`px-2 py-0.5 rounded-md font-mono text-xs font-extrabold ${
                    isActive
                      ? 'bg-zinc-800 text-red-400 border border-zinc-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {count}
                  </span>
                </div>
                <div>
                  <div className="font-extrabold text-xs sm:text-sm leading-tight">
                    {track.title}
                  </div>
                  <div className={`text-[11px] mt-0.5 truncate ${isActive ? 'text-gray-400' : 'text-gray-500'}`}>
                    {track.subtitle}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Status Bar & View Switcher (3-Col Interactive Cards vs. Executive Technical Table) */}
        <div className="bg-white px-4 py-3 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 text-red-700 font-extrabold border border-red-200">
              <Tag className="w-3.5 h-3.5 text-red-600" />
              Mostrando {visibleCourses.length} de {filteredCourses.length} especialidades
            </span>
            <span className="text-gray-500 hidden md:inline">
              Usa las pestañas <strong className="text-gray-800">Resumen / Módulos / Taller</strong> en cada tarjeta o selecciona hasta 3 cursos en <strong className="text-gray-800">Comparar</strong>.
            </span>
            {(activeTrack !== 'all' || profileFilter !== 'all' || availabilityFilter !== 'all' || modalityFilter !== 'all' || searchQuery) && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Restablecer filtros
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto bg-gray-100 p-1 rounded-xl border border-gray-200">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-gray-900 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Tarjetas Interactivas</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-gray-900 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Tabla Técnica</span>
            </button>
          </div>
        </div>

        {/* COURSES VIEWPORT */}
        {filteredCourses.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-gray-200 shadow-xs space-y-3">
            <Layers className="w-10 h-10 text-gray-300 mx-auto" />
            <h3 className="font-bold text-base text-gray-800">No se encontraron especialidades con estos criterios</h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              Prueba a restablecer los filtros activos o seleccionar &quot;Catálogo Global&quot; para explorar las 33 especialidades autorizadas.
            </p>
            <button
              type="button"
              onClick={resetAllFilters}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Ver las 33 especialidades
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
            {visibleCourses.map((course) => {
              const activeTab: CardTabType = cardTabs[course.id] || 'resumen';
              const isCompared = compareIds.includes(course.id);
              const { priceLabel, isConfigured, taxNote } = formatCoursePrice(course);
              const avail = getAvailabilityInfo(course);

              return (
                <div
                  key={course.id}
                  id={`course-card-${course.id}`}
                  className={`bg-white rounded-3xl border transition-all duration-300 overflow-hidden flex flex-col justify-between group ${
                    isCompared
                      ? 'border-red-600 shadow-xl ring-2 ring-red-500/20'
                      : 'border-gray-200 shadow-xs hover:shadow-xl hover:border-gray-300 hover:-translate-y-1'
                  }`}
                >
                  <div>
                    {/* Compact Technical Header with Course Photo & Quick Compare Button */}
                    <div className="relative h-44 w-full overflow-hidden bg-gray-950">
                      <img
                        src={course.imageUrl}
                        alt={course.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover opacity-85 group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/55 to-black/30" />

                      {/* Top Bar: Code + Compare + Availability */}
                      <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between z-10 gap-2">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-white text-red-700 font-mono text-xs font-extrabold shadow-xs">
                          {course.code}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold border backdrop-blur-xs ${avail.badgeClass}`}>
                            {avail.label}
                          </span>

                          <button
                            type="button"
                            onClick={() => toggleCompareCourse(course.id)}
                            title="Añadir al comparador técnico"
                            className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1 backdrop-blur-xs ${
                              isCompared
                                ? 'bg-red-600 text-white border-red-500 shadow-xs'
                                : 'bg-black/70 text-gray-200 border-white/25 hover:border-white'
                            }`}
                          >
                            <Scale className="w-3 h-3" />
                            <span>{isCompared ? 'En comparador' : 'Comparar'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Bottom Title Overlay */}
                      <div className="absolute bottom-3 left-3.5 right-3.5 text-white z-10">
                        <div className="flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-wider text-red-300">
                          <span className="truncate">{course.level.split('(')[0].trim()}</span>
                          <span className="shrink-0 text-amber-300 flex items-center gap-1">
                            <Coins className="w-3 h-3" />
                            {priceLabel}
                          </span>
                        </div>
                        <h3 className="font-display text-sm sm:text-base font-extrabold leading-snug text-white mt-0.5 line-clamp-2">
                          {course.title}
                        </h3>
                      </div>
                    </div>

                    {/* Interactive Micro-Tabs Bar inside Card (Does not stretch card height) */}
                    <div className="px-4 pt-3.5">
                      <div className="grid grid-cols-3 gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200 text-xs">
                        <button
                          type="button"
                          id={`accordion-btn-${course.id}`}
                          onClick={() => handleCardTab(course.id, 'resumen')}
                          className={`py-1.5 px-2 rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                            activeTab === 'resumen'
                              ? 'bg-white text-gray-900 shadow-xs'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          <span>Resumen</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCardTab(course.id, 'modulos')}
                          className={`py-1.5 px-2 rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                            activeTab === 'modulos'
                              ? 'bg-white text-gray-900 shadow-xs'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          <span>Módulos ({course.modules.length})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCardTab(course.id, 'taller')}
                          className={`py-1.5 px-2 rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                            activeTab === 'taller'
                              ? 'bg-white text-gray-900 shadow-xs'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          <span>Taller y Salida</span>
                        </button>
                      </div>
                    </div>

                    {/* Fixed-Height Interactive Tab Viewport */}
                    <div className="p-4 min-h-[165px] flex flex-col justify-between">
                      {activeTab === 'resumen' && (
                        <div className="space-y-3 animate-in fade-in duration-200">
                          <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">
                            {course.shortDescription}
                          </p>
                          <div className="grid grid-cols-3 gap-2 text-center bg-gray-50 p-2.5 rounded-xl border border-gray-200/80">
                            <div>
                              <span className="text-[10px] text-gray-400 uppercase font-bold block">Modalidad</span>
                              <span className="text-xs font-bold text-gray-900 truncate block">{course.modality}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-gray-400 uppercase font-bold block">Duración</span>
                              <span className="text-xs font-extrabold text-gray-900">
                                {course.totalHours && course.totalHours > 0 ? `${course.totalHours}h` : '—'}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-gray-400 uppercase font-bold block">Turno</span>
                              <span className="text-xs font-bold text-gray-900 truncate block">{course.schedule.split(':')[0]}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeTab === 'modulos' && (
                        <div className="space-y-1.5 animate-in fade-in duration-200 max-h-[145px] overflow-y-auto pr-1">
                          {course.modules.map(mod => (
                            <div
                              key={mod.code}
                              className="p-2 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-between text-xs"
                            >
                              <div className="pr-2 truncate">
                                <span className="font-mono text-[10px] font-bold text-red-600 mr-1.5">{mod.code}</span>
                                <span className="text-gray-800 font-medium">{mod.name}</span>
                              </div>
                              <span className="font-mono font-bold text-gray-700 shrink-0">
                                {course.totalHours && course.totalHours > 0 ? `${mod.hours}h` : '—'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {activeTab === 'taller' && (
                        <div className="space-y-2 animate-in fade-in duration-200 text-xs">
                          <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200 space-y-1">
                            <span className="font-bold text-gray-900 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                              <Wrench className="w-3 h-3 text-red-600" /> Equipamiento Técnico:
                            </span>
                            <p className="text-gray-600 line-clamp-2">
                              {(course.equipmentHighlights || []).join(' · ')}
                            </p>
                          </div>
                          <div className="p-2.5 rounded-xl bg-red-50/70 border border-red-100 space-y-0.5">
                            <span className="font-bold text-red-900 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                              <Building2 className="w-3 h-3 text-red-600" /> Salida Profesional:
                            </span>
                            <p className="text-red-800 line-clamp-1 font-medium">
                              {(course.jobOutlets || [])[0] || 'Inserción en talleres del sector automotriz'}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Footer Action Buttons */}
                  <div className="p-4 pt-0 flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => onSelectCourse(course)}
                      id={`btn-dossier-${course.id}`}
                      className="w-1/2 py-2.5 px-3 rounded-xl border border-gray-300 hover:border-gray-900 text-gray-700 hover:text-gray-950 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer min-h-[42px]"
                    >
                      <FileText className="w-3.5 h-3.5 text-gray-500" />
                      <span>Ficha y Temario</span>
                    </button>

                    {!avail.isOpen ? (
                      <button
                        type="button"
                        onClick={() => setInfoRequestCourse(course)}
                        id={`btn-solicitar-info-${course.id}`}
                        className="w-1/2 py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer min-h-[42px]"
                      >
                        <HelpCircle className="w-3.5 h-3.5 text-zinc-300" />
                        <span>Solicitar info</span>
                      </button>
                    ) : course.tipo_inscripcion === 'COMPRA_DIRECTA' ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (onOpenInscription) onOpenInscription(course);
                          else onSelectCourse(course);
                        }}
                        id={`btn-reserva-${course.id}`}
                        className="w-1/2 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer min-h-[42px] shadow-xs"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Matricularme</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (onOpenInscription) onOpenInscription(course);
                          else onSelectCourse(course);
                        }}
                        id={`btn-reserva-${course.id}`}
                        className="w-1/2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer min-h-[42px] shadow-xs"
                      >
                        <span>Solicitar plaza</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Executive Technical Table View */
          <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden divide-y divide-gray-200">
            {visibleCourses.map(course => {
              const isCompared = compareIds.includes(course.id);
              const { priceLabel } = formatCoursePrice(course);
              const avail = getAvailabilityInfo(course);

              return (
                <div
                  key={course.id}
                  className="p-4 hover:bg-gray-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <span className="px-2.5 py-1 rounded-md bg-gray-950 text-white font-mono text-xs font-extrabold shrink-0">
                      {course.code}
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm text-gray-900 truncate">{course.title}</h3>
                      <div className="text-xs text-gray-500 flex flex-wrap items-center gap-2 mt-0.5">
                        <span>{course.modality}</span>
                        <span>·</span>
                        <span>{course.totalHours && course.totalHours > 0 ? `${course.totalHours}h` : 'Horas a consultar'}</span>
                        <span>·</span>
                        <span className="font-semibold text-gray-700">{priceLabel}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold border ${avail.badgeClass}`}>
                      {avail.label}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleCompareCourse(course.id)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                        isCompared
                          ? 'bg-red-50 border-red-500 text-red-700'
                          : 'border-gray-300 text-gray-700 hover:border-gray-900'
                      }`}
                    >
                      {isCompared ? 'Comparando' : '+ Comparar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectCourse(course)}
                      className="px-3 py-1.5 rounded-xl border border-gray-300 hover:border-gray-900 text-xs font-bold text-gray-800 cursor-pointer"
                    >
                      Ficha
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!avail.isOpen) setInfoRequestCourse(course);
                        else if (onOpenInscription) onOpenInscription(course);
                        else onSelectCourse(course);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold cursor-pointer"
                    >
                      {avail.isOpen ? 'Solicitar plaza' : 'Solicitar info'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Progressive Load Bar ("Ver más especialidades" / "Recoger") */}
        {filteredCourses.length > 6 && (
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-gray-950 text-white flex items-center justify-center font-mono text-xs font-extrabold shrink-0">
                {visibleCourses.length}/{filteredCourses.length}
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-gray-900">
                  Visualizando {visibleCourses.length} de {filteredCourses.length} especialidades en este itinerario
                </p>
                <p className="text-xs text-gray-500">
                  Despliega más programas bajo demanda o utiliza los filtros superiores para ir directo a tu especialidad.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
              {visibleCount < filteredCourses.length ? (
                <>
                  <button
                    type="button"
                    onClick={() => setVisibleCount(prev => Math.min(prev + 6, filteredCourses.length))}
                    className="px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-red-600 text-white text-xs font-extrabold transition-colors cursor-pointer"
                  >
                    Cargar 6 más (+{Math.min(6, filteredCourses.length - visibleCount)})
                  </button>
                  <button
                    type="button"
                    onClick={() => setVisibleCount(filteredCourses.length)}
                    className="px-4 py-2.5 rounded-xl border border-gray-300 hover:border-gray-900 text-gray-800 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Ver todas ({filteredCourses.length})
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setVisibleCount(6);
                    const el = document.getElementById('especialidades');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Recoger vista a 6 destacados
                </button>
              )}
            </div>
          </div>
        )}

        {/* Bottom Banner for Prospective Students */}
        <div className="mt-10 bg-white rounded-3xl p-8 border-2 border-red-100 flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg">
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
            type="button"
            onClick={onOpenConsultation}
            id="btn-asesoramiento-gratuito"
            className="px-6 py-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shrink-0 btn-hover shadow-md shadow-red-600/20 cursor-pointer"
          >
            Hablar con un Asesor Ahora
          </button>
        </div>

        {/* Floating Interactive Comparator Dock */}
        {comparedCourses.length > 0 && (
          <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 bg-gray-950 text-white px-4 sm:px-5 py-3 rounded-2xl border border-red-500/50 shadow-2xl flex items-center justify-between gap-4 max-w-3xl w-[94%]">
            <div className="flex items-center gap-3 min-w-0">
              <span className="px-2.5 py-1 rounded-lg bg-red-600 text-white font-extrabold text-xs shrink-0 flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5" />
                {comparedCourses.length}/3
              </span>
              <div className="flex items-center gap-1.5 overflow-x-auto">
                {comparedCourses.map(c => (
                  <span
                    key={c.id}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-gray-200 font-mono text-xs font-bold shrink-0"
                  >
                    {c.code}
                    <button
                      type="button"
                      onClick={() => toggleCompareCourse(c.id)}
                      className="text-gray-400 hover:text-white ml-1 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setCompareIds([])}
                className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-gray-300 text-xs font-semibold cursor-pointer"
              >
                Limpiar
              </button>
              <button
                type="button"
                onClick={() => setIsCompareModalOpen(true)}
                className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-extrabold cursor-pointer shadow-md"
              >
                Comparar lado a lado
              </button>
            </div>
          </div>
        )}

        {/* Side-by-Side Technical Comparator Modal */}
        {isCompareModalOpen && comparedCourses.length > 0 && (
          <div
            onClick={() => setIsCompareModalOpen(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl max-w-5xl w-full p-6 border border-gray-200 shadow-2xl space-y-5 max-h-[88vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-red-600">
                    Comparador Técnico de Especialidades
                  </span>
                  <h3 className="text-lg sm:text-xl font-extrabold text-gray-900">
                    Comparativa Lado a Lado ({comparedCourses.length} seleccionadas)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCompareModalOpen(false)}
                  className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {comparedCourses.map(c => {
                  const { priceLabel } = formatCoursePrice(c);
                  const avail = getAvailabilityInfo(c);
                  return (
                    <div
                      key={c.id}
                      className="rounded-2xl border border-gray-200 p-4 bg-gray-50 flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2.5 py-0.5 rounded bg-red-600 text-white font-mono text-xs font-extrabold">
                            {c.code}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${avail.badgeClass}`}>
                            {avail.label}
                          </span>
                        </div>
                        <h4 className="font-extrabold text-sm text-gray-900 leading-snug">{c.title}</h4>
                        <p className="text-xs text-gray-600 line-clamp-2">{c.shortDescription}</p>
                      </div>

                      <div className="space-y-2 text-xs border-t border-gray-200 pt-3">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Horas Totales:</span>
                          <strong className="text-gray-900">{c.totalHours && c.totalHours > 0 ? `${c.totalHours}h` : 'A consultar'}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Modalidad:</span>
                          <strong className="text-gray-900">{c.modality}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Precio Oficial:</span>
                          <strong className="text-red-600">{priceLabel}</strong>
                        </div>
                        <div className="pt-1">
                          <span className="text-gray-500 block">Requisitos de acceso:</span>
                          <strong className="text-gray-800">{(c.requirements || []).join(', ')}</strong>
                        </div>
                        <div className="pt-1">
                          <span className="text-gray-500 block">Módulos ({c.modules.length}):</span>
                          <strong className="text-gray-800 line-clamp-2">{c.modules.map(m => m.name).join(' · ')}</strong>
                        </div>
                        <div className="pt-1">
                          <span className="text-gray-500 block">Salida Profesional:</span>
                          <strong className="text-gray-800">{(c.jobOutlets || [])[0]}</strong>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsCompareModalOpen(false);
                            onSelectCourse(c);
                          }}
                          className="w-1/2 py-2 rounded-xl border border-gray-300 hover:border-gray-900 text-xs font-bold text-gray-800 cursor-pointer"
                        >
                          Ver Ficha
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsCompareModalOpen(false);
                            if (!avail.isOpen) setInfoRequestCourse(c);
                            else if (onOpenInscription) onOpenInscription(c);
                            else onSelectCourse(c);
                          }}
                          className="w-1/2 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold cursor-pointer"
                        >
                          {avail.isOpen ? 'Solicitar plaza' : 'Solicitar info'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

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
