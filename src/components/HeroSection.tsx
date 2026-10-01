import React from 'react';
import { ChevronRight, Sparkles } from 'lucide-react';

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
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/70 backdrop-blur-md text-[10px] sm:text-xs font-bold uppercase tracking-wider text-red-100 border border-white/20 shadow-xl max-w-full truncate hover:border-red-500/60 transition-colors">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span className="truncate">CENTRO OFICIAL N.º 0400030892</span>
          <span className="hidden xs:inline">·</span>
          <span className="hidden xs:inline">JUNTA DE ANDALUCÍA & SEPE</span>
        </div>

        {/* Main Headline - Fluid Clamp Typography */}
        <h1 className="font-display text-[clamp(2.2rem,7vw,4rem)] font-black tracking-wider uppercase text-white leading-[1.1] drop-shadow-xl max-w-4xl mx-auto">
          ACADEMIAS <span className="text-[#FF4D4D] drop-shadow-[0_0_25px_rgba(255,77,77,0.5)]">PÉNDULO</span>
        </h1>

        {/* Subtitle Decorative Red Line */}
        <div className="w-48 sm:w-96 h-1 bg-[#FF4D4D] mx-auto my-3 shadow-md shadow-red-500/50" />

        {/* Locations List */}
        <p className="text-base sm:text-2xl font-medium text-red-50 tracking-wide drop-shadow-md max-w-2xl mx-auto leading-relaxed">
          Sede Oficial Almería | Carrera Doctoral 26
        </p>

        {/* Primary CTA Buttons - Stacked on Mobile (100% width, min 50px height) */}
        <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 max-w-md sm:max-w-none mx-auto">
          <a
            href="#especialidades"
            className="group relative overflow-hidden w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-4 bg-gradient-to-r from-red-600 via-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-extrabold text-sm sm:text-base rounded-2xl shadow-[0_10px_30px_rgba(220,38,38,0.4)] hover:shadow-[0_15px_35px_rgba(220,38,38,0.6)] transition-all duration-300 border border-red-400/60 hover:scale-[1.03] active:scale-95 cursor-pointer min-h-[52px]"
          >
            {/* Shimmer sweep */}
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/35 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out pointer-events-none" />
            <Sparkles className="w-4 h-4 text-amber-300 group-hover:text-yellow-200 group-hover:scale-125 group-hover:rotate-45 group-hover:drop-shadow-[0_0_8px_rgba(253,224,71,0.9)] transition-all duration-300" />
            <span className="relative z-10 tracking-wide">Ver 33 Especialidades Oficiales</span>
            <ChevronRight className="w-5 h-5 stroke-[3] shrink-0 group-hover:translate-x-1 transition-transform duration-300 relative z-10" />
          </a>

          {onOpenWorkWithUs && (
            <button
              onClick={onOpenWorkWithUs}
              className="group relative overflow-hidden w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 bg-black/70 hover:bg-black/90 backdrop-blur-md text-gray-200 hover:text-white font-bold text-sm sm:text-base rounded-2xl border border-white/30 hover:border-white/70 hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all duration-300 hover:scale-[1.03] active:scale-95 cursor-pointer min-h-[52px]"
            >
              <span className="relative z-10">Trabaja con Nosotros</span>
            </button>
          )}
        </div>

      </div>
    </section>
  );
};
