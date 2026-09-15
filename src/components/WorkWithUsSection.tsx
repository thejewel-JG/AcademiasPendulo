import React from 'react';
import { Briefcase, UploadCloud } from 'lucide-react';

interface WorkWithUsSectionProps {
  onOpenModal: () => void;
}

export const WorkWithUsSection: React.FC<WorkWithUsSectionProps> = ({ onOpenModal }) => {
  return (
    <section className="py-10 bg-gradient-to-r from-zinc-950 via-gray-900 to-zinc-950 text-white border-y border-white/10" id="trabaja-con-nosotros">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-red-950/40 via-zinc-900/90 to-red-950/40 rounded-2xl p-6 sm:p-8 border border-red-500/20 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
          
          <div className="space-y-2 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-bold uppercase tracking-wider">
              <Briefcase className="w-3.5 h-3.5" /> Claustro Docente & Técnico
            </div>
            <h3 className="font-display text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              ¿Quieres Trabajar con Nosotros?
            </h3>
            <p className="text-xs sm:text-sm text-gray-300 max-w-xl leading-relaxed">
              Buscamos docentes de automoción, instructores de taller y profesores de PRL para nuestras instalaciones homologadas en Almería (Centro N.º 0400030892).
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-3">
            <button
              onClick={onOpenModal}
              className="px-6 py-3 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg hover:shadow-red-900/40 transition-all flex items-center gap-2 border border-red-500 hover:scale-105 active:scale-95 cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Adjuntar CV (PDF, DOC...)</span>
            </button>
          </div>

        </div>
      </div>
    </section>
  );
};
