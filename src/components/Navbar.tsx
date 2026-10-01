import React, { useState, useEffect } from 'react';
import { 
  Phone, 
  Mail, 
  MapPin, 
  GraduationCap, 
  ChevronDown, 
  Menu, 
  X, 
  Search,
  Twitter,
  Facebook,
  Linkedin,
  Instagram,
  MessageCircle,
  Briefcase
} from 'lucide-react';
import { CENTER_INFO, CATEGORIES, COURSES } from '../data/coursesData';
import { Course } from '../types';

interface NavbarProps {
  onOpenCampus: () => void;
  onSelectCourse: (course: Course) => void;
  onOpenConsultation: () => void;
  onOpenWorkWithUs?: () => void;
  onOpenEmploymentPool?: () => void;
  onOpenInscriptionModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  onOpenCampus, 
  onSelectCourse, 
  onOpenConsultation,
  onOpenWorkWithUs,
  onOpenEmploymentPool,
  onOpenInscriptionModal
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full transition-all duration-300">
      {/* Top Bar - Sleek Dark Black/Zinc with Subtle Red Accent Accent Line */}
      <div className="bg-gray-950 text-white text-xs py-2 px-4 sm:px-8 border-b border-gray-800/80 shadow-xs">
        <div className="max-w-[1440px] mx-auto flex justify-between items-center">
          {/* Contact Information */}
          <div className="flex items-center gap-4 sm:gap-8">
            <a 
              href={`mailto:${CENTER_INFO.email}`}
              className="flex items-center gap-2 hover:text-red-300 transition-colors min-h-[32px] text-gray-300 hover:scale-105"
            >
              <Mail className="w-3.5 h-3.5 text-red-500" />
              <span className="truncate max-w-[140px] sm:max-w-none font-medium">{CENTER_INFO.email}</span>
            </a>
            <a 
              href={`tel:${CENTER_INFO.phone.replace(/\s+/g, '')}`}
              className="flex items-center gap-2 hover:text-red-300 transition-colors font-bold min-h-[32px] text-gray-200 hover:scale-105"
            >
              <Phone className="w-3.5 h-3.5 text-red-500" />
              <span>{CENTER_INFO.phone}</span>
            </a>
          </div>

          {/* Social Icons & Official Accreditation Badge */}
          <div className="hidden md:flex items-center gap-4">
            <span className="text-[11px] text-gray-400 font-semibold tracking-wide border-r border-gray-800 pr-4 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Matrícula Abierta Convocatoria 2026
            </span>
            <div className="flex items-center gap-3 text-gray-400">
              <a href="#" className="hover:text-red-400 transition-colors hover:scale-110"><Twitter className="w-3.5 h-3.5" /></a>
              <a href="#" className="hover:text-red-400 transition-colors hover:scale-110"><Facebook className="w-3.5 h-3.5" /></a>
              <a href="#" className="hover:text-red-400 transition-colors hover:scale-110"><Linkedin className="w-3.5 h-3.5" /></a>
              <a href="#" className="hover:text-red-400 transition-colors hover:scale-110"><Instagram className="w-3.5 h-3.5" /></a>
              <a href="#" className="hover:text-red-400 transition-colors hover:scale-110"><MessageCircle className="w-3.5 h-3.5" /></a>
            </div>
          </div>
        </div>
      </div>

      {/* Main Nav Bar - Glassmorphism & High-Aesthetic Styling */}
      <nav className={`w-full bg-white/95 backdrop-blur-md border-b border-gray-100 transition-all duration-300 ${isScrolled ? 'shadow-lg py-2.5' : 'shadow-sm py-3.5'}`}>
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          
          {/* Brand Logo - Bigger & Crisp with Clear Spacing */}
          <a href="#" className="flex items-center gap-3 group shrink-0 py-1">
            <div className="flex items-center gap-3">
              {CENTER_INFO.logoUrl ? (
                <div className="relative">
                  <img 
                    src={CENTER_INFO.logoUrl} 
                    alt="Academia Péndulo Logo" 
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl object-contain bg-white border border-gray-200/90 shadow-sm p-1 group-hover:scale-105 group-hover:shadow-md transition-all duration-300" 
                  />
                  <div className="absolute inset-0 rounded-xl ring-2 ring-red-500/20 group-hover:ring-red-500/40 transition-all pointer-events-none" />
                </div>
              ) : (
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shadow-sm">
                  <GraduationCap className="w-6 h-6" />
                </div>
              )}
              <div className="flex flex-col justify-center">
                <span className="font-display font-black text-base sm:text-xl tracking-tight text-gray-900 leading-none group-hover:text-black transition-colors">
                  ACADEMIAS <span className="text-[#DC2626] font-extrabold group-hover:text-red-700">PÉNDULO</span>
                </span>
                <span className="text-[9px] sm:text-[11px] text-gray-500 font-bold tracking-wider mt-0.5 uppercase">
                  Centro N.º 0400030892
                </span>
              </div>
            </div>
          </a>

          {/* Desktop Navigation Links - Compact & Perfectly Spaced */}
          <div className="hidden lg:flex items-center justify-end flex-1 gap-2 xl:gap-5 text-xs xl:text-sm font-bold text-gray-800 ml-4 xl:ml-8 mr-3">
            
            {/* Cursos Dropdown */}
            <div 
              className="relative group"
              onMouseEnter={() => setActiveDropdown('cursos')}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button className="flex items-center gap-1 hover:text-[#DC2626] py-2 px-1.5 transition-all font-bold cursor-pointer whitespace-nowrap">
                <span>Cursos</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${activeDropdown === 'cursos' ? 'rotate-180 text-red-600' : ''}`} />
              </button>

              {activeDropdown === 'cursos' && (
                <div className="absolute top-full left-0 w-64 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-100 border-t-4 border-t-[#DC2626] py-2 text-xs font-semibold animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                  <a href="#especialidades" className="block px-4 py-2.5 hover:bg-red-50 text-gray-900 hover:text-[#DC2626] transition-colors rounded-lg mx-1">Cursos Online</a>
                  <a href="#especialidades" className="block px-4 py-2.5 hover:bg-red-50 text-gray-900 hover:text-[#DC2626] transition-colors rounded-lg mx-1">Cursos Presenciales</a>
                  <a href="#especialidades" className="block px-4 py-2.5 hover:bg-red-50 text-gray-900 hover:text-[#DC2626] transition-colors rounded-lg mx-1">Cursos Privados</a>
                  <a href="#especialidades" className="block px-4 py-2.5 hover:bg-red-50 text-gray-900 hover:text-[#DC2626] transition-colors rounded-lg mx-1">Cursos por Familias Profesionales</a>
                </div>
              )}
            </div>

            {/* Servicios Dropdown */}
            <div 
              className="relative group"
              onMouseEnter={() => setActiveDropdown('servicios')}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button className="flex items-center gap-1 hover:text-[#DC2626] py-2 px-1.5 transition-all font-bold cursor-pointer whitespace-nowrap">
                <span>Servicios</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${activeDropdown === 'servicios' ? 'rotate-180 text-red-600' : ''}`} />
              </button>

              {activeDropdown === 'servicios' && (
                <div className="absolute top-full left-0 w-56 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-100 border-t-4 border-t-[#DC2626] py-2 text-xs font-semibold animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                  <a href="#empresas" className="block px-4 py-2.5 hover:bg-red-50 text-gray-900 hover:text-[#DC2626] transition-colors rounded-lg mx-1">Formación a Empresas</a>
                  <a href="#empresas" className="block px-4 py-2.5 hover:bg-red-50 text-gray-900 hover:text-[#DC2626] transition-colors rounded-lg mx-1">Gestión FUNDAE</a>
                  <a href="#contacto" className="block px-4 py-2.5 hover:bg-red-50 text-gray-900 hover:text-[#DC2626] transition-colors rounded-lg mx-1">Alquiler de Aulas</a>
                </div>
              )}
            </div>

            {/* Certificados Dropdown */}
            <div 
              className="relative group"
              onMouseEnter={() => setActiveDropdown('certificados')}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button className="flex items-center gap-1 hover:text-[#DC2626] py-2 px-1.5 transition-all font-bold cursor-pointer whitespace-nowrap">
                <span>Certificados</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${activeDropdown === 'certificados' ? 'rotate-180 text-red-600' : ''}`} />
              </button>

              {activeDropdown === 'certificados' && (
                <div className="absolute top-full left-0 w-64 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-100 border-t-4 border-t-[#DC2626] py-2 text-xs font-semibold animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                  <a href="#certificados" className="block px-4 py-2.5 hover:bg-red-50 text-gray-900 hover:text-[#DC2626] transition-colors rounded-lg mx-1">¿Qué es un Certificado?</a>
                  <a href="#certificados" className="block px-4 py-2.5 hover:bg-red-50 text-gray-900 hover:text-[#DC2626] transition-colors rounded-lg mx-1">Niveles de Acceso 1, 2 y 3</a>
                  <a href="#certificados" className="block px-4 py-2.5 hover:bg-red-50 text-gray-900 hover:text-[#DC2626] transition-colors rounded-lg mx-1">Convocatorias Junta de Andalucía</a>
                </div>
              )}
            </div>

            {/* Quienes Somos Dropdown */}
            <div 
              className="relative group"
              onMouseEnter={() => setActiveDropdown('quienes')}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button className="flex items-center gap-1 hover:text-[#DC2626] py-2 px-1.5 transition-all font-bold cursor-pointer whitespace-nowrap">
                <span>Quienes Somos</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${activeDropdown === 'quienes' ? 'rotate-180 text-red-600' : ''}`} />
              </button>

              {activeDropdown === 'quienes' && (
                <div className="absolute top-full left-0 w-56 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-100 border-t-4 border-t-[#DC2626] py-2 text-xs font-semibold animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                  <a href="#talleres" className="block px-4 py-2.5 hover:bg-red-50 text-gray-900 hover:text-[#DC2626] transition-colors rounded-lg mx-1">Nuestros Centros</a>
                  <a href="#credibilidad" className="block px-4 py-2.5 hover:bg-red-50 text-gray-900 hover:text-[#DC2626] transition-colors rounded-lg mx-1">Acreditaciones Oficiales</a>
                  {onOpenWorkWithUs ? (
                    <button 
                      onClick={onOpenWorkWithUs} 
                      className="w-full text-left px-4 py-2.5 hover:bg-red-50 text-[#DC2626] font-bold rounded-lg mx-1 block"
                    >
                      Trabaja con Nosotros
                    </button>
                  ) : (
                    <a href="#trabaja-con-nosotros" className="block px-4 py-2.5 hover:bg-red-50 text-[#DC2626] font-bold rounded-lg mx-1">Trabaja con Nosotros</a>
                  )}
                </div>
              )}
            </div>

            {/* Bolsa de Empleo Pill Button - Clean single line badge */}
            {onOpenEmploymentPool && (
              <button
                onClick={onOpenEmploymentPool}
                className="whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 hover:bg-red-100 text-red-600 font-bold border border-red-200/80 shadow-xs hover:shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
                id="nav-btn-bolsa-empleo"
              >
                <Briefcase className="w-3.5 h-3.5 text-red-600 shrink-0" />
                <span className="tracking-tight text-xs font-extrabold">Bolsa de Empleo</span>
              </button>
            )}

            {/* Contacto Pill Button - Matching Bolsa de Empleo style */}
            <a 
              href="#contacto" 
              className="whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 hover:bg-red-100 text-red-600 font-bold border border-red-200/80 shadow-xs hover:shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
              id="nav-btn-contacto"
            >
              <Phone className="w-3.5 h-3.5 text-red-600 shrink-0" />
              <span className="tracking-tight text-xs font-extrabold">Contacto</span>
            </a>
          </div>

          {/* Right Action: Campus Button + Search Icon + Mobile Menu */}
          <div className="flex shrink-0 items-center gap-2">
            {/* Desktop / Tablet Campus Button with Glowing Hover Micro-animation */}
            <button 
              onClick={onOpenCampus} 
              className="group relative overflow-hidden hidden sm:flex px-4 py-2.5 bg-gradient-to-r from-red-600 via-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md hover:shadow-[0_0_20px_rgba(220,38,38,0.5)] transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer items-center gap-2 border border-red-400/50 shrink-0"
            >
              {/* Shimmer illumination sweep */}
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/35 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out pointer-events-none" />
              <GraduationCap className="w-4 h-4 text-white group-hover:scale-125 group-hover:rotate-12 transition-transform duration-300 drop-shadow-sm" />
              <span className="relative z-10 whitespace-nowrap">Campus Virtual</span>
            </button>

            {/* Mobile Compact Icon-Only Campus Button */}
            <button 
              onClick={onOpenCampus} 
              className="group sm:hidden flex items-center justify-center p-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md hover:shadow-[0_0_15px_rgba(220,38,38,0.6)] transition-all active:scale-95 cursor-pointer"
              title="Campus Virtual"
              aria-label="Campus Virtual"
            >
              <GraduationCap className="w-4 h-4 group-hover:scale-125 transition-transform" />
            </button>

            <button 
              onClick={onOpenConsultation}
              className="text-gray-700 hover:text-[#DC2626] p-2 transition-colors rounded-xl hover:bg-gray-100 min-w-[40px] min-h-[40px] sm:min-w-[48px] sm:min-h-[48px] flex items-center justify-center"
              title="Buscar cursos"
              aria-label="Buscar cursos"
            >
              <Search className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Mobile Hamburger Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-gray-900 hover:bg-gray-100 rounded-xl min-w-[40px] min-h-[40px] sm:min-w-[48px] sm:min-h-[48px] flex items-center justify-center transition-colors"
              aria-label={mobileMenuOpen ? "Cerrar menú" : "Abrir menú de navegación"}
            >
              {mobileMenuOpen ? <X className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" /> : <Menu className="w-5 h-5 sm:w-6 sm:h-6" />}
            </button>
          </div>

        </div>

        {/* Mobile Navigation Drawer Fullscreen Overlay */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-x-0 top-[102px] bottom-0 bg-white z-50 flex flex-col justify-between overflow-y-auto animate-fadeIn border-t border-gray-200 px-6 py-6 space-y-4">
            <div className="space-y-1 divide-y divide-gray-100">
              <a 
                href="#" 
                onClick={() => setMobileMenuOpen(false)} 
                className="flex items-center justify-between py-3.5 text-base font-bold text-gray-900 min-h-[52px]"
              >
                <span>Inicio</span>
              </a>
              <a 
                href="#especialidades" 
                onClick={() => setMobileMenuOpen(false)} 
                className="flex items-center justify-between py-3.5 text-base font-bold text-gray-900 min-h-[52px]"
              >
                <span>33 Especialidades Oficiales</span>
              </a>
              <a 
                href="#certificados" 
                onClick={() => setMobileMenuOpen(false)} 
                className="flex items-center justify-between py-3.5 text-base font-bold text-gray-900 min-h-[52px]"
              >
                <span>Certificados de Profesionalidad</span>
              </a>
              <a 
                href="#talleres" 
                onClick={() => setMobileMenuOpen(false)} 
                className="flex items-center justify-between py-3.5 text-base font-bold text-gray-900 min-h-[52px]"
              >
                <span>Nuestros Talleres e Instalaciones</span>
              </a>
              {onOpenWorkWithUs && (
                <button 
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenWorkWithUs();
                  }} 
                  className="w-full text-left flex items-center justify-between py-3.5 text-base font-bold text-red-600 min-h-[52px]"
                >
                  <span>Trabaja con Nosotros</span>
                </button>
              )}
              {onOpenEmploymentPool && (
                <button 
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenEmploymentPool();
                  }} 
                  className="w-full text-left flex items-center justify-between py-3.5 text-base font-bold text-red-600 min-h-[52px]"
                >
                  <span className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-red-600 shrink-0" />
                    Bolsa de Empleo Automoción
                  </span>
                </button>
              )}
              <a 
                href="#contacto" 
                onClick={() => setMobileMenuOpen(false)} 
                className="flex items-center justify-between py-3.5 text-base font-bold text-gray-900 min-h-[52px]"
              >
                <span>Contacto y Ubicación</span>
              </a>
            </div>

            <div className="pt-6 border-t border-gray-200 space-y-3">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenCampus();
                }}
                className="w-full py-3.5 bg-gray-900 hover:bg-black text-white font-extrabold text-sm uppercase tracking-wider rounded-xl shadow-md min-h-[52px] flex items-center justify-center gap-2 border border-gray-800"
              >
                <GraduationCap className="w-5 h-5 text-red-500" />
                <span>Acceder al Campus Virtual</span>
              </button>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenConsultation();
                }}
                className="w-full py-3.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-extrabold text-sm uppercase tracking-wider rounded-xl shadow-md min-h-[52px] flex items-center justify-center gap-2"
              >
                <span>Solicitar Información Gratis</span>
              </button>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};
