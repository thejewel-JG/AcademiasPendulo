import React, { useState } from 'react';
import { 
  Award, 
  CheckCircle2, 
  HelpCircle, 
  Layers, 
  Coins, 
  Bus, 
  FileCheck, 
  ArrowRight, 
  Sparkles,
  ShieldAlert
} from 'lucide-react';

export const CertificatesGuide: React.FC<{ onOpenConsultation: () => void }> = ({ onOpenConsultation }) => {
  const [activeTab, setActiveTab] = useState<'que-es' | 'niveles' | 'gratuidad' | 'becas'>('que-es');

  return (
    <section className="py-20 bg-white border-b border-gray-100" id="certificados">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-gray-800 text-xs font-bold uppercase tracking-wider mb-3">
            <Award className="w-3.5 h-3.5 text-red-600" /> Marco Oficial del Sistema Nacional de Cualificaciones
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            Guía Oficial de Certificados de Profesionalidad
          </h2>
          <p className="text-base text-gray-600 mt-3">
            Todo lo que necesitas saber sobre la titulación expedida por el SEPE y la Junta de Andalucía, sus niveles de acceso y el sistema de becas públicas.
          </p>
        </div>

        {/* Tabs Bar */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10 max-w-4xl mx-auto">
          <button
            onClick={() => setActiveTab('que-es')}
            id="tab-btn-que-es"
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'que-es'
                ? 'bg-gray-900 text-red-400 shadow-md scale-102'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>¿Qué es un Certificado?</span>
          </button>

          <button
            onClick={() => setActiveTab('niveles')}
            id="tab-btn-niveles"
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'niveles'
                ? 'bg-gray-900 text-red-400 shadow-md scale-102'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Niveles 1, 2 y 3</span>
          </button>

          <button
            onClick={() => setActiveTab('gratuidad')}
            id="tab-btn-gratuidad"
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'gratuidad'
                ? 'bg-gray-900 text-red-400 shadow-md scale-102'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <Coins className="w-4 h-4" />
            <span>Gratuidad y Financiación</span>
          </button>

          <button
            onClick={() => setActiveTab('becas')}
            id="tab-btn-becas"
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'becas'
                ? 'bg-gray-900 text-red-400 shadow-md scale-102'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <Bus className="w-4 h-4" />
            <span>Becas de Transporte y Ayudas</span>
          </button>
        </div>

        {/* Tab Content Panels */}
        <div className="max-w-4xl mx-auto bg-gray-50 rounded-3xl p-6 sm:p-10 border border-gray-200 shadow-sm" id="certificados-tab-content">
          
          {activeTab === 'que-es' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-2xl bg-red-50 text-red-600 shrink-0">
                  <FileCheck className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-display text-xl sm:text-2xl font-bold text-gray-900">
                    Validez Laboral Oficial en Toda España y la Unión Europea
                  </h3>
                  <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                    Un <strong>Certificado de Profesionalidad</strong> es un documento oficial emitido por el SEPE y la Consejería de Empleo de la Junta de Andalucía. Acredita a quien lo obtiene que posee las competencias profesionales requeridas para el desempeño de una ocupación con plenos efectos en el mercado de trabajo y en oposiciones públicas.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-5">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Certificado de Profesionalidad (Oficial)
                  </span>
                  <ul className="mt-3 space-y-2 text-xs text-gray-700">
                    <li className="flex items-start gap-2"><span className="font-bold text-emerald-600">✓</span><span>Regulado por Real Decreto en el BOE y convalidable con FP reglada.</span></li>
                    <li className="flex items-start gap-2"><span className="font-bold text-emerald-600">✓</span><span>Habilita para profesiones reguladas (Gases Fluorados, Frigorista, RITE).</span></li>
                    <li className="flex items-start gap-2"><span className="font-bold text-emerald-600">✓</span><span>Incluye módulo obligatorio de prácticas en empresas reales de Almería.</span></li>
                    <li className="flex items-start gap-2"><span className="font-bold text-emerald-600">✓</span><span>Puntúa como mérito en bolsas y oposiciones de la administración pública.</span></li>
                  </ul>
                </div>

                <div className="bg-gray-100/80 border border-gray-200 rounded-2xl p-5">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-600 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-gray-400" /> Cursos Privados sin Homologar
                  </span>
                  <ul className="mt-3 space-y-2 text-xs text-gray-600">
                    <li className="flex items-start gap-2"><span className="font-bold text-gray-400">✗</span><span>Títulos propios sin validez legal oficial ante el Ministerio.</span></li>
                    <li className="flex items-start gap-2"><span className="font-bold text-gray-400">✗</span><span>No permiten la firma de boletines ni instalaciones técnicas oficiales.</span></li>
                    <li className="flex items-start gap-2"><span className="font-bold text-gray-400">✗</span><span>Raramente garantizan prácticas concertadas en centros de trabajo.</span></li>
                    <li className="flex items-start gap-2"><span className="font-bold text-gray-400">✗</span><span>Suelen requerir costes elevados de matrícula al alumno.</span></li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'niveles' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <h3 className="font-display text-xl sm:text-2xl font-bold text-gray-900">
                Los 3 Niveles de Cualificación Profesional
              </h3>
              <p className="text-sm text-gray-600">
                Cada certificado tiene asignado un nivel de dificultad y responsabilidad. Dependiendo de tu titulación previa, puedes acceder a uno u otro:
              </p>

              <div className="space-y-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 card-hover">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded bg-blue-100 text-blue-800 text-xs font-mono font-bold">Nivel 1</span>
                      <h4 className="font-bold text-gray-900 text-sm sm:text-base">Iniciación y Operaciones Auxiliares</h4>
                    </div>
                    <p className="text-xs text-gray-600">Ejemplos: Auxiliar de Mecánica de Vehículos (TMVG0109).</p>
                  </div>
                  <div className="bg-gray-50 px-3.5 py-2 rounded-xl text-xs font-semibold text-emerald-800 border border-gray-200 shrink-0">Sin requisitos académicos previos</div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-red-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 card-hover">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded bg-red-100 text-red-800 text-xs font-mono font-bold">Nivel 2</span>
                      <h4 className="font-bold text-gray-900 text-sm sm:text-base">Oficio Técnico Cualificado (Equivalente a FP Grado Medio)</h4>
                    </div>
                    <p className="text-xs text-gray-600">Ejemplos: Sistemas Eléctricos de Vehículos (TMVG0209), Frigorista (IMAR0108), Soldadura TIG (FMEC0110), Gestión Administrativa (ADGD0308).</p>
                  </div>
                  <div className="bg-gray-50 px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-800 border border-gray-200 shrink-0">Graduado en ESO o Competencias Clave N2</div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 card-hover">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded bg-indigo-100 text-indigo-800 text-xs font-mono font-bold">Nivel 3</span>
                      <h4 className="font-bold text-gray-900 text-sm sm:text-base">Mando Intermedio y Especialista (Equivalente a FP Grado Superior)</h4>
                    </div>
                    <p className="text-xs text-gray-600">Ejemplos: Organización y Gestión de Almacenes (COML0309), Gestión Contable y Auditoría (ADGD0108).</p>
                  </div>
                  <div className="bg-gray-50 px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-800 border border-gray-200 shrink-0">Bachillerato, FP Superior o Certificado N2 afín</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'gratuidad' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-2xl bg-red-50 text-red-600 shrink-0">
                  <Coins className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-display text-xl sm:text-2xl font-bold text-gray-900">
                    Formación 100% Subvencionada: ¿Por qué es Gratuita?
                  </h3>
                  <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                    Nuestros cursos no tienen ningún coste de matrícula ni mensualidades para el alumno porque están <strong>financiados íntegramente por los fondos públicos de Formación Profesional para el Empleo</strong> (SEPE, Ministerio de Trabajo y Junta de Andalucía).
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-200 card-hover">
                  <h4 className="font-bold text-gray-900 text-sm flex items-center gap-1.5 mb-2">
                    <Sparkles className="w-4 h-4 text-red-500" /> Para Personas Desempleadas
                  </h4>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Estar dado de alta como demandante de empleo en el SAE (DARDE al día). Incluye material didáctico, EPIS de taller, acceso a maquinaria y seguro de accidentes y responsabilidad civil durante las prácticas.
                  </p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-200 card-hover">
                  <h4 className="font-bold text-gray-900 text-sm flex items-center gap-1.5 mb-2">
                    <Coins className="w-4 h-4 text-red-500" /> Para Trabajadores y Empresas (FUNDAE)
                  </h4>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Las empresas disponen de un crédito anual bonificable en los seguros sociales para formar a sus empleados en nuestro centro homologado, sin coste neto para la plantilla.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'becas' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-2xl bg-red-50 text-red-600 shrink-0">
                  <Bus className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-display text-xl sm:text-2xl font-bold text-gray-900">
                    Sistema de Becas y Ayudas para el Alumnado en Desempleo
                  </h3>
                  <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                    Si eres alumno de cursos de desempleados y cumples los requisitos de la convocatoria pública del SAE, puedes solicitar ayudas económicas directas durante todo el periodo lectivo:
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-1.5 card-hover">
                  <span className="font-bold text-gray-900 block text-sm">Beca de Transporte</span>
                  <p className="text-gray-600">Ayuda por desplazamiento si resides en municipios fuera de Almería capital (Poniente, Levante, etc.) calculada por kilómetro o transporte público.</p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-1.5 card-hover">
                  <span className="font-bold text-gray-900 block text-sm">Beca de Conciliación</span>
                  <p className="text-gray-600">Ayuda diaria para personas con menores de 12 años a su cargo o familiares dependientes de primer grado.</p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-1.5 card-hover">
                  <span className="font-bold text-gray-900 block text-sm">Beca para Discapacidad</span>
                  <p className="text-gray-600">Cuantía fija diaria para personas con grado de discapacidad reconocido igual o superior al 33%.</p>
                </div>
              </div>

              <p className="text-xs text-gray-700 bg-red-50 p-3 rounded-xl border border-red-200/80 font-medium">
                * En la secretaría de Academias Péndulo gestionamos gratuitamente la tramitación de tu solicitud de beca ante el SAE para que no tengas que preocuparte por el papeleo.
              </p>
            </div>
          )}

          {/* Consultation Trigger */}
          <div className="mt-8 pt-6 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-gray-600">
              ¿Dudas sobre tus títulos o qué certificado te corresponde?
            </div>
            <button
              onClick={onOpenConsultation}
              id="btn-consultar-requisitos"
              className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer btn-hover"
            >
              <span>Consultar mis Requisitos con Secretaría</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

      </div>
    </section>
  );
};
