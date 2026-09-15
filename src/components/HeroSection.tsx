import React from 'react';
import { ChevronRight } from 'lucide-react';

const HERO_IMAGE_URL = "https://res.cloudinary.com/dj3wfhav2/image/upload/v1788992590/Automotive_engine_in_dark_bay_2K_202609100021_xr0av6.jpg";

interface HeroSectionProps {
  onOpenConsultation: () => void;
  onSelectCourseById: (courseId: string) => void;
  onOpenWorkWithUs?: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ 
  onOpenWorkWithUs 
}) => {
  return (
    <section className="relative pt-24 min-h-[500px] sm:min-h-[600px] bg-gray-950 flex items-center justify-center text-white overflow-hidden">
      {/* Background Static Engine Image */}
      <img
        src={HERO_IMAGE_URL}
        alt="Motor de Automoción - Academias Péndulo"
        className="absolute inset-0 w-full h-full object-cover object-[center_35%] pointer-events-none select-none"
        loading="eager"
      />

      {/* Dark Gradient Overlay for Maximum Legibility */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-black/90 pointer-events-none" />

      {/* Hero Banner Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-4 sm:space-y-6 py-8 sm:py-12">
        
        {/* Official Center Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full bg-black/60 backdrop-blur-md text-[10px] sm:text-xs font-bold uppercase tracking-wider text-red-100 border border-white/20 shadow-md max-w-full truncate">
          <span className="truncate">CENTRO OFICIAL N.º 0400030892</span>
          <span className="hidden xs:inline">·</span>
          <span className="hidden xs:inline">JUNTA DE ANDALUCÍA & SEPE</span>
        </div>

        {/* Main Headline - Fluid Clamp Typography */}
        <h1 className="font-display text-[clamp(2.2rem,7vw,4rem)] font-black tracking-wider uppercase text-white leading-[1.1] drop-shadow-xl max-w-4xl mx-auto">
          ACADEMIAS <span className="text-[#FF4D4D]">PÉNDULO</span>
        </h1>

        {/* Subtitle Decorative Red Line */}
        <div className="w-48 sm:w-96 h-1 bg-[#FF4D4D] mx-auto my-3 shadow-sm" />

        {/* Locations List */}
        <p className="text-base sm:text-2xl font-medium text-red-50 tracking-wide drop-shadow-md max-w-2xl mx-auto leading-relaxed">
          Sede Oficial Almería | Carrera Doctoral 26
        </p>

        {/* Primary CTA Buttons - Stacked on Mobile (100% width, min 50px height) */}
        <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 max-w-md sm:max-w-none mx-auto">
          <a
            href="#especialidades"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-extrabold text-sm sm:text-base rounded-xl shadow-xl hover:shadow-2xl transition-all border border-red-500 hover:scale-105 active:scale-95 cursor-pointer min-h-[50px]"
          >
            <span>Ver 33 Especialidades Oficiales</span>
            <ChevronRight className="w-5 h-5 stroke-[3] shrink-0" />
          </a>

          {onOpenWorkWithUs && (
            <button
              onClick={onOpenWorkWithUs}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-black/70 hover:bg-black/90 backdrop-blur-md text-gray-200 hover:text-white font-bold text-sm sm:text-base rounded-xl border border-white/30 hover:border-white/60 transition-all hover:scale-105 active:scale-95 cursor-pointer min-h-[50px]"
            >
              <span>Trabaja con Nosotros</span>
            </button>
          )}
        </div>

      </div>
    </section>
  );
};
