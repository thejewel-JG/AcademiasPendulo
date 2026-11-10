import React from 'react';

export const CredibilitySection: React.FC = () => {
  return (
    <section className="bg-white py-8" id="credibilidad">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
