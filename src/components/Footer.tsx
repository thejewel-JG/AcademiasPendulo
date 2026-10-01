import React from 'react';
import { 
  Phone, 
  Mail, 
  MapPin, 
  GraduationCap, 
  ShieldCheck, 
  ArrowUp,
  Award,
  Facebook,
  Instagram,
  Youtube
} from 'lucide-react';
import { CENTER_INFO, CATEGORIES } from '../data/coursesData';

interface FooterProps {
  onOpenCampus: () => void;
  onOpenConsultation: () => void;
  onOpenEmploymentPool?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenCampus, onOpenConsultation, onOpenEmploymentPool }) => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-gray-950 text-white text-xs border-t border-gray-800">
      
      {/* Top Banner inside footer with Official Accreditations Logos & Social Media Links */}
      <div className="border-b border-gray-800 py-6 bg-black/90">
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

            {/* Official Logos */}
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

          {/* Social Media Icons (Facebook, TikTok, YouTube, Instagram) */}
          <div className="flex items-center justify-center lg:justify-end gap-3 shrink-0">
            {/* Facebook */}
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook Academias Péndulo"
              title="Facebook"
              className="w-11 h-11 rounded-xl bg-gray-900 border border-gray-800 hover:border-blue-500/60 hover:bg-blue-600/20 text-blue-400 hover:text-white flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-sm cursor-pointer"
            >
              <Facebook className="w-5 h-5" />
            </a>

            {/* TikTok */}
            <a
              href="https://tiktok.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="TikTok Academias Péndulo"
              title="TikTok"
              className="w-11 h-11 rounded-xl bg-gray-900 border border-gray-800 hover:border-pink-500/60 hover:bg-pink-600/20 text-gray-200 hover:text-white flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-sm cursor-pointer group"
            >
              <svg className="w-5 h-5 fill-current text-gray-200 group-hover:text-pink-400 transition-colors" viewBox="0 0 24 24">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 1 1-5.2-1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .56.04.83.1v-3.6a6.35 6.35 0 0 0-.83-.05A6.34 6.34 0 1 0 15.82 12V8.42a8.2 8.2 0 0 0 4.77 1.52v-3.25a4.83 4.83 0 0 1-1-.03z" />
              </svg>
            </a>

            {/* YouTube */}
            <a
              href="https://youtube.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="YouTube Academias Péndulo"
              title="YouTube"
              className="w-11 h-11 rounded-xl bg-gray-900 border border-gray-800 hover:border-red-500/60 hover:bg-red-600/20 text-red-500 hover:text-white flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-sm cursor-pointer"
            >
              <Youtube className="w-5 h-5" />
            </a>

            {/* Instagram */}
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram Academias Péndulo"
              title="Instagram"
              className="w-11 h-11 rounded-xl bg-gray-900 border border-gray-800 hover:border-pink-500/60 hover:bg-pink-600/20 text-pink-400 hover:text-white flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-sm cursor-pointer"
            >
              <Instagram className="w-5 h-5" />
            </a>
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
