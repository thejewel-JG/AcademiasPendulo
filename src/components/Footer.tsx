import React from 'react';
import { 
  Phone, 
  Mail, 
  MapPin, 
  GraduationCap, 
  ShieldCheck, 
  ArrowUp,
  Award
} from 'lucide-react';
import { CENTER_INFO, CATEGORIES } from '../data/coursesData';

interface FooterProps {
  onOpenCampus: () => void;
  onOpenConsultation: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenCampus, onOpenConsultation }) => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-gray-950 text-white text-xs border-t border-gray-800">
      
      {/* Top Banner inside footer with Official Accreditations Logos */}
      <div className="border-b border-gray-800 py-6 bg-black/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row items-center justify-between gap-6 text-center lg:text-left">
          
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <p className="text-white font-bold text-sm">
                  Centro de Formación Oficial Homologado Nº {CENTER_INFO.officialCode}
                </p>
                <p className="text-gray-400 text-xs">
                  Acreditado por el Servicio Andaluz de Empleo (SAE) y el Ministerio de Trabajo (SEPE).
                </p>
              </div>
            </div>

            {/* Official Logos - Separated, Larger & Clearer */}
            <div className="flex items-center gap-4 shrink-0 pt-2 sm:pt-0">
              <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-gray-200 shadow-sm flex items-center justify-center">
                <img 
                  src="https://res.cloudinary.com/dj3wfhav2/image/upload/v1789337561/ChatGPT_Image_14_sept_2026_00_11_16_xwq7gu.png" 
                  alt="Junta de Andalucía" 
                  className="h-10 sm:h-12 w-auto object-contain"
                />
              </div>
              <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-gray-200 shadow-sm flex items-center justify-center">
                <img 
                  src="https://res.cloudinary.com/dj3wfhav2/image/upload/v1789337561/ChatGPT_Image_14_sept_2026_00_11_27_rdhsa9.png" 
                  alt="SEPE / Ministerio de Trabajo" 
                  className="h-10 sm:h-12 w-auto object-contain"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onOpenConsultation}
              className="px-5 py-2.5 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer"
            >
              Solicitar Plaza
            </button>
          </div>

        </div>
      </div>

      {/* Main Footer Links - 1 Column Mobile, 2 Col Tablet, 4 Col Desktop */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 py-12">
          
          {/* Col 1: Brand & Contact Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              {CENTER_INFO.logoUrl ? (
                <img 
                  src={CENTER_INFO.logoUrl} 
                  alt="Academia Péndulo Logo" 
                  className="w-10 h-10 rounded-lg object-cover border border-gray-800 shadow-xs" 
                />
              ) : (
                <svg className="w-8 h-8 text-[#FF4D4D]" viewBox="0 0 100 100" fill="currentColor">
                  <path d="M10 50 Q 50 10, 90 50 Q 50 40, 10 50 Z" />
                  <path d="M10 65 Q 50 25, 90 65 Q 50 55, 10 65 Z" fill="#ffffff" />
                </svg>
              )}
              <span className="font-display font-extrabold text-xl tracking-tight text-white">
                ACADEMIAS <span className="text-[#FF4D4D]">PÉNDULO</span>
              </span>
            </div>

            <p className="text-gray-400 leading-relaxed text-xs">
              Centro Oficial de Formación Profesional para el Empleo N.º 0400030892. Inscrito en el Registro de Centros y Entidades de la Junta de Andalucía.
            </p>

            <div className="space-y-2.5 text-gray-300 text-xs pt-1">
              <p className="flex items-center gap-2 min-h-[36px]">
                <MapPin className="w-4 h-4 text-[#FF4D4D] shrink-0" />
                <span>{CENTER_INFO.address}, {CENTER_INFO.city}</span>
              </p>
              <p className="flex items-center gap-2 min-h-[36px]">
                <Phone className="w-4 h-4 text-[#FF4D4D] shrink-0" />
                <a href={`tel:${CENTER_INFO.phone.replace(/\s+/g, '')}`} className="hover:text-white transition-colors py-1">
                  {CENTER_INFO.phone}
                </a>
              </p>
              <p className="flex items-center gap-2 min-h-[36px]">
                <Mail className="w-4 h-4 text-[#FF4D4D] shrink-0" />
                <a href={`mailto:${CENTER_INFO.email}`} className="hover:text-white transition-colors py-1">
                  {CENTER_INFO.email}
                </a>
              </p>
            </div>
          </div>

          {/* Col 2: Áreas Formativas */}
          <div className="space-y-3">
            <h4 className="text-white font-bold text-xs uppercase tracking-wider">
              Cursos
            </h4>
            <ul className="space-y-2 text-gray-400 text-xs">
              <li><a href="#especialidades" className="hover:text-[#FF4D4D] transition-colors inline-block py-1.5 min-h-[36px]">Cursos Online</a></li>
              <li><a href="#especialidades" className="hover:text-[#FF4D4D] transition-colors inline-block py-1.5 min-h-[36px]">Cursos Presenciales</a></li>
              <li><a href="#especialidades" className="hover:text-[#FF4D4D] transition-colors inline-block py-1.5 min-h-[36px]">Cursos Privados</a></li>
              <li><a href="#especialidades" className="hover:text-[#FF4D4D] transition-colors inline-block py-1.5 min-h-[36px]">Cursos por Familias Profesionales</a></li>
            </ul>
          </div>

          {/* Col 3: Enlaces de Interés */}
          <div className="space-y-3">
            <h4 className="text-white font-bold text-xs uppercase tracking-wider">
              Enlaces Rápidos
            </h4>
            <ul className="space-y-2 text-gray-400 text-xs">
              <li><a href="#cursos" className="hover:text-[#FF4D4D] transition-colors inline-block py-1.5 min-h-[36px]">Oferta Formativa</a></li>
              <li><a href="#instalaciones" className="hover:text-[#FF4D4D] transition-colors inline-block py-1.5 min-h-[36px]">Nuestras Instalaciones</a></li>
              <li><a href="#trabaja-con-nosotros" className="hover:text-[#FF4D4D] transition-colors font-semibold text-gray-200 inline-block py-1.5 min-h-[36px]">Trabaja con Nosotros</a></li>
              <li><a href="#contacto" className="hover:text-[#FF4D4D] transition-colors inline-block py-1.5 min-h-[36px]">Almería</a></li>
            </ul>
          </div>

          {/* Col 4: Legal & Acreditaciones */}
          <div className="space-y-3">
            <h4 className="text-white font-bold text-xs uppercase tracking-wider">
              Legal
            </h4>
            <ul className="space-y-2 text-gray-400 text-xs">
              <li><a href="#contacto" className="hover:text-[#FF4D4D] transition-colors inline-block py-1.5 min-h-[36px]">Aviso Legal</a></li>
              <li><a href="#contacto" className="hover:text-[#FF4D4D] transition-colors inline-block py-1.5 min-h-[36px]">Política de Privacidad</a></li>
              <li><a href="#contacto" className="hover:text-[#FF4D4D] transition-colors inline-block py-1.5 min-h-[36px]">Política de Cookies</a></li>
            </ul>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-6 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-gray-400 text-center sm:text-left">
          <p className="text-xs">
            © {new Date().getFullYear()} ACADEMIAS PÉNDULO. Centro N.º 0400030892. Todos los derechos reservados.
          </p>

          <button
            onClick={scrollToTop}
            className="flex items-center justify-center gap-1.5 text-gray-400 hover:text-white transition-colors text-xs py-2 px-3 rounded-lg hover:bg-gray-900 min-h-[44px]"
          >
            <span>Volver arriba</span>
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </footer>
  );
};
