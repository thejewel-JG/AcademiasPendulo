import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Send, 
  CheckCircle2, 
  Phone, 
  Clock, 
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { CATEGORIES, COURSES, CENTER_INFO } from '../data/coursesData';
import { useCampus } from '../context/CampusContext';

interface ConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConsultationModal: React.FC<ConsultationModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const { submitContactRequest, courses } = useCampus();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0].id);
  const [status, setStatus] = useState('desempleado');
  const [accepted, setAccepted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || isSubmitting) {
      setError('Por favor completa los campos obligatorios');
      return;
    }
    if (!accepted) {
      setError('Debes aceptar las condiciones de tratamiento de datos');
      return;
    }
    setError('');
    setIsSubmitting(true);

    const targetCourse = courses.find((c) => c.categoryName === category) || courses[0];
    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0] || name;
    const lastName = nameParts.slice(1).join(' ') || '—';

    submitContactRequest({
      first_name: firstName,
      last_name: lastName,
      email: email ? email.trim() : `${phone}@pendiente-email.es`,
      phone: phone.trim(),
      course_id: targetCourse ? targetCourse.id : 'TMVG0004',
      course_code: targetCourse ? targetCourse.codigo : 'TMVG0004',
      course_name: targetCourse ? targetCourse.nombre : 'Mantenimiento de Vehículos Híbridos y Eléctricos',
      employment_status: status === 'desempleado' ? 'Desempleado / Demandante de empleo' : 'Trabajador en activo',
      comments: `Solicitud mediante modal de asesoramiento. Área: ${category}`,
      source: 'Modal Solicitud de Plaza',
    });

    setIsSubmitting(false);
    setSubmitted(true);
  };


  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-950/70 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-gray-100 overflow-hidden relative"
        id="consultation-modal"
      >
        <button
          onClick={onClose}
          id="consultation-close-btn"
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-8">
          <div className="mb-6">
            <span className="text-xs font-bold uppercase tracking-wider text-red-800 bg-red-50 px-2.5 py-0.5 rounded-full">
              Sede Almería · Centro 0400030892
            </span>
            <h3 className="font-display text-2xl font-bold text-gray-900 mt-2">
              Solicitud de Plaza y Asesoramiento Oficial
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Consulta disponibilidad de vacantes y requisitos de becas para las convocatorias 2025 del SEPE y Junta de Andalucía.
            </p>
          </div>

          {submitted ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-lg text-gray-900">¡Solicitud Recibida Correctamente!</h4>
              <p className="text-xs text-gray-600 max-w-xs mx-auto">
                Un orientador pedagógico de nuestra sede en Carrera Doctoral 26 se pondrá en contacto contigo en menos de 24 horas laborables.
              </p>
              <button
                onClick={onClose}
                className="mt-4 px-6 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-colors"
              >
                Cerrar
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" id="consultation-inner-form">
              {error && (
                <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs flex items-center gap-1.5 font-medium border border-red-200">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1" htmlFor="c-name">
                  Nombre y Apellidos *
                </label>
                <input
                  type="text"
                  id="c-name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tu nombre completo"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-red-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1" htmlFor="c-phone">
                    Teléfono Móvil *
                  </label>
                  <input
                    type="tel"
                    id="c-phone"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Teléfono de contacto"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-red-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1" htmlFor="c-email">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    id="c-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@correo.com"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-red-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1" htmlFor="c-area">
                  Especialidad de Interés
                </label>
                <select
                  id="c-area"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-red-500 outline-none"
                >
                  {CATEGORIES.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1" htmlFor="c-status">
                  Situación Laboral
                </label>
                <select
                  id="c-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-red-500 outline-none"
                >
                  <option value="desempleado">Desempleado (Inscrito en el SAE)</option>
                  <option value="trabajador">Trabajador cuenta ajena</option>
                  <option value="autonomo">Autónomo</option>
                  <option value="empresa">Empresa</option>
                </select>
              </div>

              <div className="pt-1">
                <label className="flex items-start gap-2 text-[11px] text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={accepted}
                    onChange={(e) => setAccepted(e.target.checked)}
                    className="mt-0.5 rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <span>
                    Acepto el tratamiento de mis datos personales para ser informado sobre los cursos oficiales del centro homologado 0400030892.
                  </span>
                </label>
              </div>

              <button
                type="submit"
                id="btn-submit-consultation"
                className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-red-600/20 btn-hover"
              >
                <Send className="w-4 h-4" />
                <span>Enviar Solicitud de Información Gratuita</span>
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
