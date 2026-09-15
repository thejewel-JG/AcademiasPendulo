import React, { useState } from 'react';
import { 
  Building2, 
  Quote, 
  Star, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles, 
  Coins, 
  Briefcase,
  Send
} from 'lucide-react';
import { TESTIMONIALS } from '../data/coursesData';

export const CompaniesAndTestimonials: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'testimonios' | 'empresas'>('testimonios');
  const [companyFormSent, setCompanyFormSent] = useState(false);
  const [cName, setCName] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cPhone, setCPhone] = useState('');

  const handleCompanySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cName || !cEmail) return;
    setCompanyFormSent(true);
  };

  return (
    <section className="py-20 bg-white border-b border-gray-200" id="empresas">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Toggle between Testimonials & Business section */}
        <div className="flex justify-center mb-12">
          <div className="bg-gray-100 p-1.5 rounded-2xl flex items-center gap-1">
            <button
              onClick={() => setActiveTab('testimonios')}
              id="tab-view-testimonios"
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'testimonios'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Prácticas y Empleabilidad Real
            </button>
            <button
              onClick={() => setActiveTab('empresas')}
              id="tab-view-empresas"
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'empresas'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Para Empresas & FUNDAE
            </button>
          </div>
        </div>

        {activeTab === 'testimonios' ? (
          <div className="text-center max-w-3xl mx-auto py-8 space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-800 text-xs font-bold uppercase tracking-wider">
              <Building2 className="w-3.5 h-3.5 text-red-600" /> Orientación y Salidas Profesionales
            </div>
            <h2 className="font-display text-3xl font-extrabold text-gray-900 tracking-tight">
              Formación Práctica enfocada a la Empleabilidad Real
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed max-w-2xl mx-auto">
              Todos nuestros Certificados de Profesionalidad incluyen un <strong>módulo obligatorio de prácticas profesionales no laborales en empresas</strong> de Almería. Consulta en nuestra secretaría los convenios activos en tu especialidad.
            </p>
          </div>
        ) : (
          /* FOR BUSINESS / FUNDAE */
          <div className="space-y-12">
            <div className="text-center max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-800 text-xs font-bold uppercase tracking-wider mb-3">
                <Coins className="w-3.5 h-3.5 text-red-600" /> Crédito de Formación Bonificada
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
                Formación a Medida para Empresas y Talleres (FUNDAE)
              </h2>
              <p className="text-base text-gray-600 mt-3 leading-relaxed">
                Aprovecha el crédito estatal de tu empresa para reciclar a tu plantilla en diagnosis avanzada, soldadura homologada, manipulación de gases fluorados o prevención de riesgos laborales con coste cero.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Value cards */}
              <div className="lg:col-span-7 space-y-4">
                <div className="bg-white p-6 rounded-3xl border border-gray-200 space-y-2 card-hover hover:border-red-200">
                  <div className="flex items-center gap-2 text-red-600 font-bold text-base">
                    <Sparkles className="w-5 h-5" />
                    <span>Gestión Integral de la Bonificación FUNDAE</span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                    Nos encargamos de todo el trámite ante la Fundación Estatal para la Formación en el Empleo (comunicación de inicio, seguimiento y certificados) para que tu empresa se deduzca el coste directamente en los seguros sociales (TC1).
                  </p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-gray-200 space-y-2 card-hover hover:border-red-200">
                  <div className="flex items-center gap-2 text-red-600 font-bold text-base">
                    <Briefcase className="w-5 h-5" />
                    <span>Cursos a Medida en Nuestras Instalaciones o en tu Centro</span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                    Diseñamos planes específicos para tu maquinaria y procedimientos: homologación de soldadores bajo norma UNE-EN ISO 9606, cursos de alto voltaje para talleres mecánicos, o carnés de carretillero y PEMP para tu equipo logístico.
                  </p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-gray-200 space-y-2 card-hover hover:border-red-200">
                  <div className="flex items-center gap-2 text-red-600 font-bold text-base">
                    <Building2 className="w-5 h-5" />
                    <span>Bolsa de Empleo y Selección de Alumnos en Prácticas</span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                    ¿Buscas mecánicos, frigoristas o soldadores cualificados? Firma un convenio de prácticas no laborales con Academias Péndulo y evalúa candidatos formados en nuestras instalaciones antes de su contratación definitiva.
                  </p>
                </div>
              </div>

              {/* Fast Business Contact Form */}
              <div className="lg:col-span-5 bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-lg">
                <h3 className="font-display text-xl font-bold text-gray-900 mb-1">
                  Consulta el Crédito de tu Empresa
                </h3>
                <p className="text-xs text-gray-600 mb-6">
                  Indícanos tus datos y calculamos gratuitamente el importe bonificable disponible para tu plantilla este año.
                </p>

                {companyFormSent ? (
                  <div className="p-6 bg-emerald-50 rounded-2xl text-center space-y-3 border border-emerald-200">
                    <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                    <h4 className="font-bold text-gray-900 text-sm">¡Solicitud para Empresas Recibida!</h4>
                    <p className="text-xs text-gray-600">
                      Un asesor del departamento de empresas se pondrá en contacto para informarte de la cuantía bonificable y las opciones de calendario.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleCompanySubmit} className="space-y-4" id="fundae-company-form">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1" htmlFor="company-name-input">
                        Nombre de la Empresa o Taller *
                      </label>
                      <input
                        type="text"
                        id="company-name-input"
                        required
                        value={cName}
                        onChange={(e) => setCName(e.target.value)}
                        placeholder="Ej: Talleres Mecánicos Almería S.L."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-red-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1" htmlFor="company-phone-input">
                        Teléfono de Contacto *
                      </label>
                      <input
                        type="tel"
                        id="company-phone-input"
                        required
                        value={cPhone}
                        onChange={(e) => setCPhone(e.target.value)}
                        placeholder="Teléfono directo de RRHH / Gerencia"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-red-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1" htmlFor="company-email-input">
                        Email Corporativo *
                      </label>
                      <input
                        type="email"
                        id="company-email-input"
                        required
                        value={cEmail}
                        onChange={(e) => setCEmail(e.target.value)}
                        placeholder="contacto@tuempresa.es"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-red-500 outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      id="company-submit-btn"
                      className="w-full py-3 px-6 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer btn-hover"
                    >
                      <Send className="w-4 h-4" />
                      <span>Calcular Crédito y Planes Disponibles</span>
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </section>
  );
};
