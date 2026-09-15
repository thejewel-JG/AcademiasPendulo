import React, { useEffect, useState, useRef } from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  FileCheck,
  ChevronRight
} from 'lucide-react';
import { CENTER_INFO } from '../data/coursesData';

export const CredibilitySection: React.FC = () => {
  return (
    <section className="bg-white py-12" id="credibilidad">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* 3 Sector Highlight Cards - 3D Box Shadow Style */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: Agrario / Maquinaria */}
          <a href="#especialidades" className="group relative h-64 rounded-2xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.15)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.3)] border border-gray-200/80 transition-all duration-300 hover:-translate-y-1.5 block">
            <img 
              src="https://res.cloudinary.com/dj3wfhav2/image/upload/v1788989687/Mechanic_toolbox_in_foreground_202609092333_h8ydqx.jpg" 
              alt="Sector Agrario y Maquinaria" 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent p-6 flex flex-col justify-between text-white">
              <div />
              <div className="space-y-2">
                <h3 className="font-display font-bold text-xl text-white">Cursos Sector Agrario</h3>
                <p className="text-xs text-gray-300 line-clamp-2">
                  Empieza tu curso en uno de los sectores más importantes a nivel nacional
                </p>
                <div className="flex justify-end pt-2">
                  <span className="p-1.5 rounded-full bg-white/20 group-hover:bg-[#DC2626] transition-colors shadow-md">
                    <ChevronRight className="w-5 h-5 text-white" />
                  </span>
                </div>
              </div>
            </div>
          </a>

          {/* Card 2: Construcción / Vehículos Pesados */}
          <a href="#especialidades" className="group relative h-64 rounded-2xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.15)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.3)] border border-gray-200/80 transition-all duration-300 hover:-translate-y-1.5 block">
            <img 
              src="https://res.cloudinary.com/dj3wfhav2/image/upload/v1788989687/Mechanic_working_inside_engine_bay_202609092333_vqmr7f.jpg" 
              alt="Sector Construcción" 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent p-6 flex flex-col justify-between text-white">
              <div />
              <div className="space-y-2">
                <h3 className="font-display font-bold text-xl text-white">Cursos Sector Construcción</h3>
                <p className="text-xs text-gray-300 line-clamp-2">
                  Prepara tu futuro con cursos en un sector en auge
                </p>
                <div className="flex justify-end pt-2">
                  <span className="p-1.5 rounded-full bg-white/20 group-hover:bg-[#DC2626] transition-colors shadow-md">
                    <ChevronRight className="w-5 h-5 text-white" />
                  </span>
                </div>
              </div>
            </div>
          </a>

          {/* Card 3: Metal / Electromecánica */}
          <a href="#especialidades" className="group relative h-64 rounded-2xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.15)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.3)] border border-gray-200/80 transition-all duration-300 hover:-translate-y-1.5 block">
            <img 
              src="https://res.cloudinary.com/dj3wfhav2/image/upload/v1788989687/Mechanic_using_torque_wrench_on_202609092333_jr6cdc.jpg" 
              alt="Sector Metal" 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent p-6 flex flex-col justify-between text-white">
              <div />
              <div className="space-y-2">
                <h3 className="font-display font-bold text-xl text-white">Cursos Sector Metal</h3>
                <p className="text-xs text-gray-300 line-clamp-2">
                  Fórmate para entrar a uno de los principales sectores industriales
                </p>
                <div className="flex justify-end pt-2">
                  <span className="p-1.5 rounded-full bg-white/20 group-hover:bg-[#DC2626] transition-colors shadow-md">
                    <ChevronRight className="w-5 h-5 text-white" />
                  </span>
                </div>
              </div>
            </div>
          </a>

        </div>

        {/* 4-Column Counter Bar - 3D Box Shadow */}
        <div className="bg-gradient-to-r from-gray-950 via-black to-gray-950 rounded-2xl text-white py-10 px-6 border border-gray-800 shadow-[0_15px_35px_rgba(0,0,0,0.35)] transform transition-transform hover:scale-[1.01]">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            
            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-extrabold text-white">0400030892</div>
              <div className="text-xs font-bold uppercase tracking-wider text-red-400">CÓDIGO CENTRO</div>
              <p className="text-[11px] text-gray-400">Homologado Junta de Andalucía</p>
            </div>

            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-extrabold text-white">33</div>
              <div className="text-xs font-bold uppercase tracking-wider text-red-400">ESPECIALIDADES</div>
              <p className="text-[11px] text-gray-400">Inscritas o Autorizadas</p>
            </div>

            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-extrabold text-white">32</div>
              <div className="text-xs font-bold uppercase tracking-wider text-red-400">AUTOMOCIÓN</div>
              <p className="text-[11px] text-gray-400">Mecánica, Eléctricos y ADAS</p>
            </div>

            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-extrabold text-white">04005</div>
              <div className="text-xs font-bold uppercase tracking-wider text-red-400">ALMERÍA</div>
              <p className="text-[11px] text-gray-400">Carrera Doctoral 26</p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};
