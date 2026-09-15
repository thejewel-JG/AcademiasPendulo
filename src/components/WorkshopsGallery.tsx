import React, { useState } from 'react';
import { 
  Wrench, 
  MapPin, 
  ShieldCheck, 
  CheckCircle2, 
  Maximize2, 
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { WORKSHOPS, CENTER_INFO } from '../data/coursesData';

export const WorkshopsGallery: React.FC = () => {
  const [selectedWorkshop, setSelectedWorkshop] = useState(WORKSHOPS[0]);

  return (
    <section className="py-20 bg-gray-50 border-b border-gray-200" id="talleres">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="max-w-3xl mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 border border-red-100 text-red-700 text-xs font-bold uppercase tracking-wider mb-3">
            <Wrench className="w-3.5 h-3.5" /> Instalaciones Homologadas
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            Talleres Reales y Maquinaria Industrial de Última Generación
          </h2>
          <p className="text-base text-gray-600 mt-3 leading-relaxed">
            La formación no se aprende en un pupitre: se aprende con las manos en la máquina. Nuestras instalaciones en Almería cuentan con <strong>aulas-taller homologadas por la Junta de Andalucía</strong> dotadas con el mismo equipamiento que utilizan las empresas líderes del sector.
          </p>
        </div>

        {/* Interactive Workshop Showcase */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Workshop Selector Tabs */}
          <div className="lg:col-span-5 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 px-1 mb-2">
              Selecciona una Instalación Técnica
            </p>
            {WORKSHOPS.map((workshop) => {
              const isSelected = selectedWorkshop.id === workshop.id;

              return (
                <button
                  key={workshop.id}
                  id={`btn-workshop-${workshop.id}`}
                  onClick={() => setSelectedWorkshop(workshop)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-white border-red-500 text-gray-900 shadow-lg shadow-red-500/10'
                      : 'bg-white/60 border-gray-200 text-gray-600 hover:bg-white hover:text-gray-900 hover:border-red-200'
                  }`}
                >
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-red-600 uppercase tracking-wider block">
                      {workshop.category}
                    </span>
                    <h4 className="text-sm font-bold text-gray-900 leading-snug">
                      {workshop.title}
                    </h4>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-gray-400 shrink-0 ml-2 transition-transform ${isSelected ? 'translate-x-1 text-red-500' : ''}`} />
                </button>
              );
            })}

            {/* Address Badge */}
            <div className="pt-4 p-4 rounded-2xl bg-white border border-gray-200 text-xs text-gray-600 flex items-start gap-3">
              <MapPin className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-gray-900 block">Sede Central Academias Péndulo</span>
                <span>{CENTER_INFO.address}, CP {CENTER_INFO.postalCode}, {CENTER_INFO.city}</span>
                <p className="text-gray-400 text-[11px] mt-1">
                  Espacios climatizados, vestuarios con taquillas individuales y protocolos de seguridad laboral.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Selected Workshop Detail & Gallery Display */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-lg relative overflow-hidden">
            
            {/* Visual Photo Card */}
            <div className="relative h-64 sm:h-80 rounded-2xl overflow-hidden mb-6 group">
              <img
                src={selectedWorkshop.image}
                alt={selectedWorkshop.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover img-zoom"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-950/80 via-transparent to-transparent" />
              
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs">
                <span className="px-3 py-1 rounded-full bg-white/90 backdrop-blur-md text-red-600 font-bold border border-gray-200">
                  {selectedWorkshop.category}
                </span>
                <span className="flex items-center gap-1 text-white bg-gray-900/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-gray-700">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Acreditado Junta Andalucía
                </span>
              </div>
            </div>

            {/* Detailed Description */}
            <h3 className="font-display text-xl sm:text-2xl font-bold text-gray-900 mb-2">
              {selectedWorkshop.title}
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed mb-6">
              {selectedWorkshop.description}
            </p>

            {/* Equipment Grid */}
            <div className="border-t border-gray-200 pt-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-red-600 mb-3 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Equipamiento Técnico Destacado
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {selectedWorkshop.equipment.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-700 hover:border-red-200 transition-colors">
                    <CheckCircle2 className="w-4 h-4 text-red-500 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
