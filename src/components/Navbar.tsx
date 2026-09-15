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
  MessageCircle
} from 'lucide-react';
import { CENTER_INFO, CATEGORIES, COURSES } from '../data/coursesData';
import { Course } from '../types';

interface NavbarProps {
  onOpenCampus: () => void;
  onSelectCourse: (course: Course) => void;
  onOpenConsultation: () => void;
  onOpenWorkWithUs?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  onOpenCampus, 
  onSelectCourse, 
  onOpenConsultation,
  onOpenWorkWithUs
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
      {/* Top Bar - Sleek Dark Black/Zinc */}
      <div className="bg-gray-950 text-white text-xs py-2 px-4 border-b border-gray-800">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          {/* Contact Information */}
          <div className="flex items-center gap-4 sm:gap-6">
            <a 
              href={`mailto:${CENTER_INFO.email}`}
              className="flex items-center gap-1.5 hover:text-red-200 transition-colors min-h-[32px]"
            >
              <Mail className="w-3.5 h-3.5" />
              <span className="truncate max-w-[140px] sm:max-w-none">{CENTER_INFO.email}</span>
            </a>
            <a 
              href={`tel:${CENTER_INFO.phone.replace(/\s+/g, '')}`}
              className="flex items-center gap-1.5 hover:text-red-200 transition-colors font-bold min-h-[32px]"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>{CENTER_INFO.phone}</span>
            </a>
          </div>

          {/* Social Icons */}
          <div className="hidden md:flex items-center gap-3">
            <a href="#" className="hover:text-red-200"><Twitter className="w-3.5 h-3.5" /></a>
            <a href="#" className="hover:text-red-200"><Facebook className="w-3.5 h-3.5" /></a>
            <a href="#" className="hover:text-red-200"><Linkedin className="w-3.5 h-3.5" /></a>
            <a href="#" className="hover:text-red-200"><Instagram className="w-3.5 h-3.5" /></a>
            <a href="#" className="hover:text-red-200"><MessageCircle className="w-3.5 h-3.5" /></a>
          </div>
        </div>
      </div>

      {/* Main Nav Bar - White */}
      <nav className={`w-full bg-white transition-all duration-300 ${isScrolled ? 'shadow-md py-2' : 'py-3'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          
          {/* Brand Logo - ACADEMIAS en negro, PÉNDULO en rojo */}
          <a href="#" className="flex items-center gap-2 group shrink-0">
            <div className="flex items-center gap-2">
              {CENTER_INFO.logoUrl ? (
                <img 
                  src={CENTER_INFO.logoUrl} 
                  alt="Academia Péndulo Logo" 
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg object-cover border border-gray-200 shadow-xs group-hover:scale-105 transition-transform" 
                />
              ) : (
                <svg className="w-8 h-8 text-[#DC2626]" viewBox="0 0 100 100" fill="currentColor">
                  <path d="M10 50 Q 50 10, 90 50 Q 50 40, 10 50 Z" />
                  <path d="M10 65 Q 50 25, 90 65 Q 50 55, 10 65 Z" fill="#8B0000" />
                </svg>
              )}
              <div className="flex flex-col">
                <span className="font-display font-black text-sm sm:text-xl tracking-tight text-gray-900 leading-none">
                  ACADEMIAS <span className="text-[#DC2626] font-extrabold">PÉNDULO</span>
                </span>
                <span className="text-[8px] sm:text-[10px] text-gray-500 font-bold tracking-wider">Centro N.º 0400030892</span>
              </div>
            </div>
          </a>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex flex-1 items-center justify-center gap-7 text-sm font-bold text-gray-900 pr-8">
            
            {/* Cursos Dropdown */}
            <div 
              className="relative"
              onMouseEnter={() => setActiveDropdown('cursos')}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button className="flex items-center gap-1 hover:text-[#DC2626] py-2 transition-colors">
                <span>Cursos</span>
                <ChevronDown className="w-4 h-4" />
              </button>

              {activeDropdown === 'cursos' && (
                <div className="absolute top-full left-0 w-64 bg-white rounded-b-xl shadow-xl border-t-2 border-[#DC2626] py-2 text-xs font-semibold animate-in fade-in duration-150">
                  <a href="#especialidades" className="block px-4 py-2.5 hover:bg-red-50 text-gray-900 hover:text-[#DC2626]">Cursos Online</a>
                  <a href="#especialidades" className="block px-4 py-2.5 hover:bg-red-50 text-gray-900 hover:text-[#DC2626]">Cursos Presenciales</a>
                  <a href="#especialidades" className="block px-4 py-2.5 hover:bg-red-50 text-gray-900 hover:text-[#DC2626]">Cursos Privados</a>
                  <a href="#especialidades" className="block px-4 py-2.5 hover:bg-red-50 text-gray-900 hover:text-[#DC2626]">Cursos por Familias Profesionales</a>
                </div>
              )}
            </div>

            {/* Servicios Dropdown */}
            <div 
              className="relative"
              onMouseEnter={() => setActiveDropdown('servicios')}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button className="flex items-center gap-1 hover:text-[#DC2626] py-2 transition-colors">
                <span>Servicios</span>
                <ChevronDown className="w-4 h-4" />
              </button>

              {activeDropdown === 'servicios' && (
                <div className="absolute top-full left-0 w-56 bg-white rounded-b-xl shadow-xl border-t-2 border-[#DC2626] py-2 text-xs font-semibold animate-in fade-in duration-150">
                  <a href="#empresas" className="block px-4 py-2.5 hover:bg-red-50 text-gray-900 hover:text-[#DC2626]">Formación a Empresas</a>
                  <a href="#empresas" className="block px-4 py-2.5 hover:bg-red-50 text-gray-900 hover:text-[#DC2626]">Gestión FUNDAE</a>
                  <a href="#contacto" className="block px-4 py-2.5 hover:bg-red-50 text-gray-900 hover:text-[#DC2626]">Alquiler de Aulas</a>
                </div>
              )}
            </div>

            {/* Certificados de Profesionalidad Dropdown */}
            <div 
              className="relative"
              onMouseEnter={() => setActiveDropdown('certificados')}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button className="flex items-center gap-1 hover:text-[#DC2626] py-2 transition-colors">
                <span>Certificados de Profesionalidad</span>
                <ChevronDown className="w-4 h-4" />
              </button>

              {activeDropdown === 'certificados' && (
                <div className="absolute top-full left-0 w-64 bg-white rounded-b-xl shadow-xl border-t-2 border-[#DC2626] py-2 text-xs font-semibold animate-in fade-in duration-150">
                  <a href="#certificados" className="block px-4 py-2.5 hover:bg-red-50 text-gray-900 hover:text-[#DC2626]">¿Qué es un Certificado?</a>
                  <a href="#certificados" className="block px-4 py-2.5 hover:bg-red-50 text-gray-900 hover:text-[#DC2626]">Niveles de Acceso 1, 2 y 3</a>
                  <a href="#certificados" className="block px-4 py-2.5 hover:bg-red-50 text-gray-900 hover:text-[#DC2626]">Convocatorias Junta de Andalucía</a>
                </div>
              )}
            </div>

            {/* Quienes Somos Dropdown */}
            <div 
              className="relative"
              onMouseEnter={() => setActiveDropdown('quienes')}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button className="flex items-center gap-1 hover:text-[#DC2626] py-2 transition-colors">
                <span>Quienes Somos</span>
                <ChevronDown className="w-4 h-4" />
              </button>

              {activeDropdown === 'quienes' && (
                <div className="absolute top-full left-0 w-56 bg-white rounded-b-xl shadow-xl border-t-2 border-[#DC2626] py-2 text-xs font-semibold animate-in fade-in duration-150">
                  <a href="#talleres" className="block px-4 py-2.5 hover:bg-red-50 text-gray-900 hover:text-[#DC2626]">Nuestros Centros</a>
                  <a href="#credibilidad" className="block px-4 py-2.5 hover:bg-red-50 text-gray-900 hover:text-[#DC2626]">Acreditaciones Oficiales</a>
                  <a href="#trabaja-con-nosotros" className="block px-4 py-2.5 hover:bg-red-50 text-[#DC2626] font-bold">Trabaja con Nosotros</a>
                </div>
              )}
            </div>

            {onOpenWorkWithUs ? (
              <button 
                onClick={onOpenWorkWithUs} 
                className="hover:text-[#DC2626] py-2 transition-colors font-medium text-gray-800 hover:scale-105"
                id="hero-work-with-us-btn"
              >
                Trabaja con Nosotros
              </button>
            ) : (
              <a href="#trabaja-con-nosotros" className="hover:text-[#DC2626] py-2 transition-colors">
                Trabaja con Nosotros
              </a>
            )}

            <a href="#contacto" className="hover:text-[#DC2626] py-2 transition-colors">
              Contacto
            </a>
          </div>

          {/* Right Action: Campus Button + Search Icon + Mobile Menu */}
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            {/* Desktop / Tablet Campus Button */}
            <button 
              onClick={onOpenCampus} 
              className="hidden sm:flex px-4 py-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs transition-all hover:scale-105 active:scale-95 cursor-pointer items-center gap-1.5"
            >
              <GraduationCap className="w-4 h-4" />
              <span>Campus Virtual</span>
            </button>

            {/* Mobile Compact Icon-Only Campus Button */}
            <button 
              onClick={onOpenCampus} 
              className="sm:hidden flex items-center justify-center p-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
              title="Campus Virtual"
              aria-label="Campus Virtual"
            >
              <GraduationCap className="w-4 h-4" />
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
