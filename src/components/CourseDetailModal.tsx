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
  AlertCircle,
  Coins,
  CreditCard,
  Calendar,
  ShieldCheck,
  Info
} from 'lucide-react';
import { Course } from '../types';
import { CENTER_INFO } from '../data/coursesData';
import { useCampus } from '../context/CampusContext';
import { formatCoursePrice, getAvailabilityInfo } from '../services/courseService';

interface CourseDetailModalProps {
  course: Course | null;
  onClose: () => void;
  onOpenConsultation?: () => void;
  onOpenInscription?: (course: Course) => void;
}

export const CourseDetailModal: React.FC<CourseDetailModalProps> = ({ 
  course, 
  onClose, 
  onOpenInscription 
}) => {
  if (!course) return null;

  const { submitContactRequest } = useCampus();

  const [activeTab, setActiveTab] = useState<'temario' | 'salidas' | 'requisitos' | 'equipamiento'>('temario');
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [showDirectBuyNotice, setShowDirectBuyNotice] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('trabajador');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { priceLabel, isConfigured, taxNote } = formatCoursePrice(course);
  const avail = getAvailabilityInfo(course);

  const handleDownloadPdf = () => {
    setDownloading(true);
    setTimeout(() => {
      setDownloading(false);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    }, 1200);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || isSubmitting) return;

    setIsSubmitting(true);
    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0] || name;
    const lastName = nameParts.slice(1).join(' ') || '—';

    await submitContactRequest({
      first_name: firstName,
      last_name: lastName,
      email: email ? email.trim() : `${phone}@pendiente-email.es`,
      phone: phone.trim(),
      course_id: course.code || course.id || 'TMVG0004',
      course_code: course.code || course.id || 'TMVG0004',
      course_name: course.title,
      employment_status: status === 'desempleado' ? 'Desempleado / Demandante de empleo' : 'Trabajador en activo / Empresa',
      comments: `Solicitud de información sobre matrícula en: ${course.title} (${course.code})`,
      source: 'Modal Detalle de Curso',
    });

    setIsSubmitting(false);
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
        <div className="relative h-48 sm:h-56 w-full bg-gray-900 shrink-0">
          <img 
            src={course.imageUrl} 
            alt={course.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover opacity-35"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-900/60 to-transparent" />
          
          <div className="absolute bottom-4 left-6 right-16 text-white">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="font-mono text-xs font-bold bg-red-600 text-white px-2.5 py-0.5 rounded shadow-sm">
                {course.code}
              </span>
              <span className="text-xs bg-gray-800 text-gray-200 px-2.5 py-0.5 rounded border border-gray-700">
                {course.level}
              </span>
              <span className={`text-xs px-2.5 py-0.5 rounded font-bold border ${avail.badgeClass}`}>
                {avail.label}
              </span>
            </div>
            <h2 className="font-display text-lg sm:text-2xl font-extrabold leading-tight">
              {course.title}
            </h2>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto p-6 sm:p-8 flex-1 space-y-8">
          
          {/* BLOQUE VISUAL DESTACADO DE MATRICULACIÓN Y CONDICIONES ECONÓMICAS (SECCIÓN 5) */}
          <div className="bg-gradient-to-r from-gray-950 via-zinc-900 to-red-950 text-white p-6 rounded-3xl border border-red-900/40 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <span className="text-xs font-bold text-red-400 uppercase tracking-wider block">
                  Información Económica y Condiciones de Venta
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    {priceLabel}
                  </span>
                  <span className="text-xs text-zinc-400 font-medium">
                    {taxNote}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${course.tipo_inscripcion === 'COMPRA_DIRECTA' ? 'bg-amber-950 text-amber-300 border-amber-800' : 'bg-blue-950 text-blue-300 border-blue-800'}`}>
                  {course.tipo_inscripcion === 'COMPRA_DIRECTA' ? 'Compra Directa Online' : 'Admisión con Solicitud Previa'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                <span className="text-zinc-400 block text-[10px] uppercase font-bold">Plazas Disponibles</span>
                <span className="text-white font-extrabold text-sm">
                  {course.plazas_disponibles !== null && course.plazas_disponibles !== undefined ? `${course.plazas_disponibles} plazas` : (course.placesLeft ? `${course.placesLeft} plazas` : 'Limitadas')}
                </span>
              </div>
              <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                <span className="text-zinc-400 block text-[10px] uppercase font-bold">Modalidad</span>
                <span className="text-white font-bold">{course.modality}</span>
              </div>
              <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                <span className="text-zinc-400 block text-[10px] uppercase font-bold">Apertura Inscripción</span>
                <span className="text-white font-bold">
                  {course.fecha_apertura_inscripcion ? new Date(course.fecha_apertura_inscripcion).toLocaleDateString('es-ES') : 'Abierta'}
                </span>
              </div>
              <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                <span className="text-zinc-400 block text-[10px] uppercase font-bold">Cierre Inscripción</span>
                <span className="text-white font-bold">
                  {course.fecha_cierre_inscripcion ? new Date(course.fecha_cierre_inscripcion).toLocaleDateString('es-ES') : 'Hasta completar'}
                </span>
              </div>
            </div>

            {/* BOTÓN SEGÚN TIPO DE INSCRIPCIÓN (SECCIÓN 5) */}
            <div className="pt-2">
              {!avail.isOpen ? (
                <button
                  disabled
                  className="w-full py-3.5 px-6 rounded-2xl bg-zinc-800 text-zinc-400 text-sm font-bold flex items-center justify-center gap-2 cursor-not-allowed border border-zinc-700"
                >
                  <Clock className="w-4 h-4" />
                  <span>Inscripciones cerradas para esta convocatoria</span>
                </button>
              ) : course.tipo_inscripcion === 'COMPRA_DIRECTA' ? (
                <div className="space-y-2">
                  <button
                    onClick={() => setShowDirectBuyNotice(true)}
                    className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm sm:text-base font-black flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-emerald-950/40 cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <CreditCard className="w-5 h-5 text-emerald-200" />
                    <span>Matricularme ahora</span>
                  </button>
                  <p className="text-[11px] text-zinc-400 text-center">
                    * El pago de la matrícula no activa automáticamente el acceso al campus. Todo alumno requiere verificación administrativa manual de secretaría previa a la activación de sus credenciales.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      onClose();
                      if (onOpenInscription) onOpenInscription(course);
                    }}
                    className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-red-600 via-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white text-sm sm:text-base font-black flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-red-950/40 cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <Sparkles className="w-5 h-5 text-amber-200" />
                    <span>Solicitar plaza</span>
                  </button>
                  <p className="text-[11px] text-zinc-400 text-center">
                    * El alumno debe cumplimentar el formulario de admisión telemática con su información académica para que el equipo administrativo revise y autorice su matrícula.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-200 text-center">
            <div>
              <span className="text-[10px] text-gray-500 uppercase font-bold block">Horas Totales</span>
              <span className="text-sm font-extrabold text-gray-900">{course.totalHours} horas</span>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 uppercase font-bold block">Prácticas en Taller</span>
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
              Descripción y Objetivos Formativos
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              {course.fullDescription}
            </p>
          </div>

          {/* Tab navigation inside modal */}
          <div>
            <div className="flex border-b border-gray-200 gap-4 mb-4 overflow-x-auto">
              <button
                onClick={() => setActiveTab('temario')}
                className={`pb-2 text-xs sm:text-sm font-bold transition-all border-b-2 cursor-pointer shrink-0 ${
                  activeTab === 'temario'
                    ? 'border-red-500 text-red-700'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Módulos Formativos ({course.modules.length})
              </button>
              <button
                onClick={() => setActiveTab('salidas')}
                className={`pb-2 text-xs sm:text-sm font-bold transition-all border-b-2 cursor-pointer shrink-0 ${
                  activeTab === 'salidas'
                    ? 'border-red-500 text-red-700'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Salidas Profesionales
              </button>
              <button
                onClick={() => setActiveTab('requisitos')}
                className={`pb-2 text-xs sm:text-sm font-bold transition-all border-b-2 cursor-pointer shrink-0 ${
                  activeTab === 'requisitos'
                    ? 'border-red-500 text-red-700'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Requisitos de Admisión
              </button>
              <button
                onClick={() => setActiveTab('equipamiento')}
                className={`pb-2 text-xs sm:text-sm font-bold transition-all border-b-2 cursor-pointer shrink-0 ${
                  activeTab === 'equipamiento'
                    ? 'border-red-500 text-red-700'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Equipamiento de Taller
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
                <ul className="space-y-2 text-xs text-gray-700">
                  {course.jobOutlets.map((job, idx) => (
                    <li key={idx} className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-gray-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="font-medium">{job}</span>
                    </li>
                  ))}
                </ul>
              )}

              {activeTab === 'requisitos' && (
                <div className="space-y-2 text-xs text-gray-700">
                  {course.requirements.map((req, idx) => (
                    <div key={idx} className="p-3 bg-white rounded-xl border border-gray-200 flex items-start gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0" />
                      <span className="leading-relaxed">{req}</span>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'equipamiento' && (
                <div className="space-y-2 text-xs text-gray-700">
                  {course.equipmentHighlights.map((eq, idx) => (
                    <div key={idx} className="p-3 bg-white rounded-xl border border-gray-200 flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-red-500 shrink-0" />
                      <span className="font-medium">{eq}</span>
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
                Guía Formativa y Dossier Oficial ({course.code})
              </h4>
              <p className="text-xs text-gray-600">
                Descarga el temario desglosado con todos los módulos y criterios de evaluación.
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

          {/* Consultation Form inside modal */}
          <div className="bg-gray-900 text-white p-6 rounded-3xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-red-400 font-bold uppercase tracking-wider block">
                  Atención Personalizada
                </span>
                <h3 className="font-display text-lg sm:text-xl font-bold">
                  Consulta o Solicita Asesoramiento en este Curso
                </h3>
              </div>
            </div>

            {submitted ? (
              <div className="p-6 bg-gray-800/80 rounded-2xl text-center space-y-2 border border-gray-700">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <h4 className="font-bold text-base text-white">¡Consulta Registrada!</h4>
                <p className="text-xs text-gray-300">
                  Hemos recibido tu solicitud para <strong>{course.code}</strong>. Nuestro equipo de admisiones se pondrá en contacto contigo en breve.
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
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email de contacto"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div className="sm:col-span-3">
                  <button
                    type="submit"
                    id="btn-confirm-reserve"
                    className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-red-600/20 btn-hover"
                  >
                    <Send className="w-4 h-4" />
                    <span>Enviar Consulta a Secretaría sobre {course.code}</span>
                  </button>
                </div>
              </form>
            )}
          </div>

        </div>

      </div>

      {/* MODAL DIRECT BUY NOTICE (In Compliance with Section 5 & 7) */}
      {showDirectBuyNotice && (
        <div className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-3xl max-w-lg w-full p-6 text-white space-y-5 shadow-2xl">
            <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
              <div className="p-3 bg-emerald-950 border border-emerald-800 rounded-2xl text-emerald-400">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base font-heading">
                  Matriculación Directa: {course.code}
                </h3>
                <p className="text-xs text-zinc-400">
                  {priceLabel} {taxNote}
                </p>
              </div>
            </div>

            <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800 space-y-3 text-xs text-zinc-300 leading-relaxed">
              <div className="flex items-start gap-2 text-amber-400 font-bold">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Protocolo de Admisión y Acceso al Campus</span>
              </div>
              <p>
                La pasarela telemática de pago con tarjeta está en proceso de apertura para esta convocatoria.
              </p>
              <div className="p-3 bg-red-950/40 border border-red-900/50 rounded-xl text-red-200 font-medium">
                <strong>Normativa oficial:</strong> La realización del pago no concede acceso automático al campus. Secretaría verifica manualmente el ingreso y aprueba las credenciales antes de habilitar el acceso del alumno.
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowDirectBuyNotice(false)}
                className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold transition-all"
              >
                Entendido
              </button>
              <button
                onClick={() => {
                  setShowDirectBuyNotice(false);
                  onClose();
                  if (onOpenInscription) onOpenInscription(course);
                }}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all"
              >
                Tramitar Admisión Oficial
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
