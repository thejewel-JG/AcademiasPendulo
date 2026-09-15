import React, { useState } from 'react';
import { 
  X, 
  Clock, 
  Award, 
  Building2, 
  CheckCircle2, 
  Download, 
  Send, 
  Check, 
  Sparkles, 
  Wrench,
  FileText,
  AlertCircle
} from 'lucide-react';
import { Course } from '../types';
import { CENTER_INFO } from '../data/coursesData';

interface CourseDetailModalProps {
  course: Course | null;
  onClose: () => void;
}

export const CourseDetailModal: React.FC<CourseDetailModalProps> = ({ course, onClose }) => {
  if (!course) return null;

  const [activeTab, setActiveTab] = useState<'temario' | 'salidas' | 'requisitos' | 'equipamiento'>('temario');
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('desempleado');
  const [submitted, setSubmitted] = useState(false);

  const handleDownloadPdf = () => {
    setDownloading(true);
    setTimeout(() => {
      setDownloading(false);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    }, 1200);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;
    setSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-950/70 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-gray-100 overflow-hidden relative max-h-[90vh] flex flex-col"
        id="course-detail-modal"
      >
        {/* Modal Close Button */}
        <button
          onClick={onClose}
          id="modal-close-btn"
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-gray-900/60 hover:bg-gray-900 text-white transition-colors cursor-pointer"
          aria-label="Cerrar ventana"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header Banner */}
        <div className="relative h-44 sm:h-52 w-full bg-gray-900 shrink-0">
          <img 
            src={course.imageUrl} 
            alt={course.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover opacity-35"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-900/60 to-transparent" />
          
          <div className="absolute bottom-4 left-6 right-16 text-white">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="font-mono text-xs font-bold bg-red-600 text-white px-2.5 py-0.5 rounded">
                {course.code}
              </span>
              <span className="text-xs bg-gray-800 text-gray-200 px-2 py-0.5 rounded border border-gray-700">
                {course.level}
              </span>
              <span className="text-xs text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded font-semibold border border-emerald-800/80">
                100% Subvencionado SEPE
              </span>
            </div>
            <h2 className="font-display text-lg sm:text-2xl font-bold leading-tight">
              {course.title}
            </h2>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto p-6 sm:p-8 flex-1 space-y-8">
          
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-200 text-center">
            <div>
              <span className="text-[10px] text-gray-500 uppercase font-bold block">Horas Totales</span>
              <span className="text-sm font-extrabold text-gray-900">{course.totalHours} horas</span>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 uppercase font-bold block">Prácticas en Empresa</span>
              <span className="text-sm font-extrabold text-red-600">{course.practiceHours} horas</span>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 uppercase font-bold block">Modalidad</span>
              <span className="text-sm font-extrabold text-gray-900">{course.modality}</span>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 uppercase font-bold block">Próximo Inicio</span>
              <span className="text-sm font-extrabold text-red-600">{course.nextCall}</span>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="font-display text-base font-bold text-gray-900 mb-2">
              Descripción y Objetivos del Certificado
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              {course.fullDescription}
            </p>
          </div>

          {/* Tab navigation inside modal */}
          <div>
            <div className="flex border-b border-gray-200 gap-4 mb-4">
              <button
                onClick={() => setActiveTab('temario')}
                className={`pb-2 text-xs sm:text-sm font-bold transition-all border-b-2 cursor-pointer ${
                  activeTab === 'temario'
                    ? 'border-red-500 text-red-700'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Módulos Formativos ({course.modules.length})
              </button>
              <button
                onClick={() => setActiveTab('salidas')}
                className={`pb-2 text-xs sm:text-sm font-bold transition-all border-b-2 cursor-pointer ${
                  activeTab === 'salidas'
                    ? 'border-red-500 text-red-700'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Salidas Laborales
              </button>
              <button
                onClick={() => setActiveTab('requisitos')}
                className={`pb-2 text-xs sm:text-sm font-bold transition-all border-b-2 cursor-pointer ${
                  activeTab === 'requisitos'
                    ? 'border-red-500 text-red-700'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Requisitos de Acceso
              </button>
              <button
                onClick={() => setActiveTab('equipamiento')}
                className={`pb-2 text-xs sm:text-sm font-bold transition-all border-b-2 cursor-pointer ${
                  activeTab === 'equipamiento'
                    ? 'border-red-500 text-red-700'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Maquinaria de Taller
              </button>
            </div>

            {/* Tab content */}
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
              {activeTab === 'temario' && (
                <div className="space-y-2">
                  {course.modules.map(m => (
                    <div key={m.code} className="p-3 bg-white rounded-xl border border-gray-200 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-mono font-bold text-red-600 mr-2">{m.code}</span>
                        <span className="font-semibold text-gray-800">{m.name}</span>
                      </div>
                      <span className="font-bold text-gray-600 shrink-0 ml-2">{m.hours} horas</span>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'salidas' && (
                <ul className="space-y-2">
                  {course.jobOutlets.map((j, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-xs text-gray-700 bg-white p-2.5 rounded-xl border border-gray-200">
                      <CheckCircle2 className="w-4 h-4 text-red-500 shrink-0" />
                      <span className="font-medium">{j}</span>
                    </li>
                  ))}
                </ul>
              )}

              {activeTab === 'requisitos' && (
                <ul className="space-y-2">
                  {course.requirements.map((r, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-gray-700 bg-white p-2.5 rounded-xl border border-gray-200">
                      <span className="w-2 h-2 rounded-full bg-red-500 mt-1 shrink-0" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              )}

              {activeTab === 'equipamiento' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {course.equipmentHighlights.map((eq, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-gray-700 bg-white p-2.5 rounded-xl border border-gray-200">
                      <Wrench className="w-4 h-4 text-red-600 shrink-0" />
                      <span>{eq}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Dossier Download Action Bar */}
          <div className="p-4 bg-red-50 rounded-2xl border border-red-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-gray-900">
                Guía Formativa y Ficha Oficial del BOE ({course.code})
              </h4>
              <p className="text-xs text-gray-600">
                Descarga el temario desglosado con todos los criterios de evaluación.
              </p>
            </div>
            
            <button
              onClick={handleDownloadPdf}
              id="btn-download-pdf-dossier"
              disabled={downloading}
              className="px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 cursor-pointer shadow-xs"
            >
              {downloading ? (
                <span>Generando PDF oficial...</span>
              ) : downloadSuccess ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> ¡Dossier descargado!
                </span>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 text-red-400" />
                  <span>Descargar Dossier Completo (PDF)</span>
                </>
              )}
            </button>
          </div>

          {/* Registration Form inside modal */}
          <div className="bg-gray-900 text-white p-6 rounded-3xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-red-400 font-bold uppercase tracking-wider block">
                  Convocatoria Junta de Andalucía
                </span>
                <h3 className="font-display text-lg sm:text-xl font-bold">
                  Reserva tu Plaza en este Curso
                </h3>
              </div>
              <span className="text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1 rounded-full">
                {course.placesLeft} plazas restantes
              </span>
            </div>

            {submitted ? (
              <div className="p-6 bg-gray-800/80 rounded-2xl text-center space-y-2 border border-gray-700">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <h4 className="font-bold text-base text-white">¡Preinscripción Registrada!</h4>
                <p className="text-xs text-gray-300">
                  Hemos reservado provisionalmente tu plaza en <strong>{course.code}</strong>. Te llamaremos para cotejar tus datos del SAE y asignarte grupo.
                </p>
              </div>
            ) : (
              <form onSubmit={handleRegister} className="grid grid-cols-1 sm:grid-cols-3 gap-3" id="modal-reserve-form">
                <div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nombre completo *"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-xs text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Teléfono móvil *"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-xs text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="desempleado">Desempleado (SAE)</option>
                    <option value="trabajador">Trabajador cuenta ajena</option>
                    <option value="autonomo">Autónomo</option>
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <button
                    type="submit"
                    id="btn-confirm-reserve"
                    className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-red-600/20 btn-hover"
                  >
                    <Send className="w-4 h-4" />
                    <span>Confirmar Preinscripción Gratuita en {course.code}</span>
                  </button>
                </div>
              </form>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
