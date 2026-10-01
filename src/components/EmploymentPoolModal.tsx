import React, { useState } from 'react';
import { 
  X, 
  Briefcase, 
  Send, 
  CheckCircle2, 
  Phone, 
  Mail, 
  MapPin, 
  Wrench, 
  Award, 
  Sparkles,
  AlertCircle,
  FileText,
  UserCheck
} from 'lucide-react';

interface EmploymentPoolModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AUTOMOTIVE_SPECIALTIES = [
  'Electromecánica y Diagnóstico Avanzado ADAS',
  'Mantenimiento de Vehículos Híbridos y Eléctricos',
  'Chapa, Pintura y Carrocería',
  'Soldadura TIG / MIG para Estructuras y Chasis',
  'Climatización y Frío Industrial en Automoción',
  'Gestión de Taller, Recepción y Recambios',
  'Mantenimiento de Vehículos pesados / Maquinaria',
  'General / Otras especialidades de Automoción'
];

const QUALIFICATIONS = [
  'Certificado de Profesionalidad Oficial (Nivel 1, 2 o 3)',
  'Formación Profesional Grado Medio (Electromecánica / Carrocería)',
  'Formación Profesional Grado Superior (Automoción / Mantenimiento)',
  'Alumno / Estudiante actual en Academias Péndulo',
  'Cursos Específicos de Especialización Técnica',
  'Experiencia Práctica en Taller (Sin Titulación Oficial)'
];

const EXPERIENCE_YEARS = [
  'Sin experiencia previa (Busco mi primer empleo / Prácticas)',
  'Menos de 1 año',
  'De 1 a 3 años',
  'De 3 a 5 años',
  'Más de 5 años de experiencia'
];

const AVAILABILITY = [
  'Inmediata (Jornada Completa)',
  'Jornada Parcial (Mañanas)',
  'Jornada Parcial (Tardes)',
  'Flexibilidad Horaria / Fines de semana'
];

export const EmploymentPoolModal: React.FC<EmploymentPoolModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [ciudad, setCiudad] = useState('Almería');
  const [especialidad, setEspecialidad] = useState(AUTOMOTIVE_SPECIALTIES[0]);
  const [titulacion, setTitulacion] = useState(QUALIFICATIONS[0]);
  const [experiencia, setExperiencia] = useState(EXPERIENCE_YEARS[0]);
  const [disponibilidad, setDisponibilidad] = useState(AVAILABILITY[0]);
  const [observaciones, setObservaciones] = useState('');
  const [accepted, setAccepted] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !telefono || !email || isSubmitting) {
      setError('Por favor completa los campos requeridos (Nombre, Teléfono y Email)');
      return;
    }
    if (!accepted) {
      setError('Debes aceptar las condiciones de tratamiento de datos para la Bolsa de Empleo');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/public/employment-pool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nombre.trim(),
          telefono: telefono.trim(),
          email: email.trim(),
          ciudad: ciudad.trim(),
          especialidad,
          titulacion,
          experiencia,
          disponibilidad,
          observaciones: observaciones.trim()
        })
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        const data = await res.json();
        setError(data.error || 'Error al enviar tu solicitud a la Bolsa de Empleo.');
      }
    } catch (err: any) {
      setError('Error de conexión con el servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-950/75 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-gray-100 overflow-hidden relative max-h-[90vh] flex flex-col"
        id="employment-pool-modal"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          id="btn-close-employment-modal"
          className="absolute top-4 right-4 z-10 p-2.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors cursor-pointer"
          aria-label="Cerrar ventana"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Banner */}
        <div className="bg-gradient-to-r from-gray-900 via-gray-950 to-red-950 text-white p-6 sm:p-8 shrink-0 relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-red-600/20 rounded-full blur-2xl pointer-events-none" />
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/90 text-white text-xs font-bold uppercase tracking-wider mb-2 backdrop-blur-md">
            <Briefcase className="w-3.5 h-3.5" /> Bolsa de Empleo Oficial Automoción
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
            Inscripción Candidatos · Academias Péndulo
          </h2>
          <p className="text-xs sm:text-sm text-gray-300 mt-1 max-w-lg">
            Conectamos a profesionales y alumnos capacitados con talleres, concesionarios y empresas colaboradoras del sector automoción en Almería y Andalucía.
          </p>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1">
          {submitted ? (
            <div className="py-10 text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-xl text-gray-900">¡Candidatura Registrada con Éxito!</h3>
              <p className="text-xs sm:text-sm text-gray-600 max-w-md mx-auto leading-relaxed">
                Hemos incorporado tu perfil a la <strong>Bolsa de Empleo de Academias Péndulo</strong> para la especialidad de <strong>{especialidad}</strong>. Te hemos enviado un correo de confirmación a <span className="font-bold text-gray-900">{email}</span>.
              </p>
              <div className="pt-4">
                <button
                  onClick={onClose}
                  className="px-8 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-bold transition-colors shadow-md"
                >
                  Entendido y Cerrar
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5" id="employment-form">
              {error && (
                <div className="p-3.5 bg-red-50 text-red-700 rounded-xl text-xs flex items-center gap-2 font-semibold border border-red-200">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{error}</span>
                </div>
              )}

              {/* Personal Data Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-900 flex items-center gap-1.5 border-b border-gray-200 pb-1.5">
                  <UserCheck className="w-4 h-4 text-red-600" /> 1. Datos Personales de Contacto
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1" htmlFor="emp-name">
                      Nombre y Apellidos *
                    </label>
                    <input
                      type="text"
                      id="emp-name"
                      required
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      placeholder="Tu nombre completo"
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-red-500 outline-none font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1" htmlFor="emp-phone">
                      Teléfono Móvil *
                    </label>
                    <input
                      type="tel"
                      id="emp-phone"
                      required
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      placeholder="Teléfono de contacto"
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-red-500 outline-none font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1" htmlFor="emp-email">
                      Correo Electrónico *
                    </label>
                    <input
                      type="email"
                      id="emp-email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ejemplo@correo.com"
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-red-500 outline-none font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1" htmlFor="emp-city">
                      Ciudad / Municipio *
                    </label>
                    <input
                      type="text"
                      id="emp-city"
                      required
                      value={ciudad}
                      onChange={(e) => setCiudad(e.target.value)}
                      placeholder="ej: Almería, Roquetas, El Ejido"
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-red-500 outline-none font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Automotive Specialty & Experience Section */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-900 flex items-center gap-1.5 border-b border-gray-200 pb-1.5">
                  <Wrench className="w-4 h-4 text-red-600" /> 2. Especialidad en Automoción y Experiencia
                </h4>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1" htmlFor="emp-specialty">
                    Especialidad de Interés Principal (Mundo Automoción) *
                  </label>
                  <select
                    id="emp-specialty"
                    value={especialidad}
                    onChange={(e) => setEspecialidad(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs sm:text-sm font-bold text-gray-900 focus:ring-2 focus:ring-red-500 outline-none cursor-pointer"
                  >
                    {AUTOMOTIVE_SPECIALTIES.map((spec, sIdx) => (
                      <option key={sIdx} value={spec}>{spec}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1" htmlFor="emp-qualification">
                      Nivel de Titulación / Certificación *
                    </label>
                    <select
                      id="emp-qualification"
                      value={titulacion}
                      onChange={(e) => setTitulacion(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs sm:text-sm font-medium text-gray-900 focus:ring-2 focus:ring-red-500 outline-none cursor-pointer"
                    >
                      {QUALIFICATIONS.map((qual, qIdx) => (
                        <option key={qIdx} value={qual}>{qual}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1" htmlFor="emp-experience">
                      Años de Experiencia en el Sector *
                    </label>
                    <select
                      id="emp-experience"
                      value={experiencia}
                      onChange={(e) => setExperiencia(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs sm:text-sm font-medium text-gray-900 focus:ring-2 focus:ring-red-500 outline-none cursor-pointer"
                    >
                      {EXPERIENCE_YEARS.map((exp, eIdx) => (
                        <option key={eIdx} value={exp}>{exp}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1" htmlFor="emp-availability">
                    Disponibilidad Laboral *
                  </label>
                  <select
                    id="emp-availability"
                    value={disponibilidad}
                    onChange={(e) => setDisponibilidad(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs sm:text-sm font-medium text-gray-900 focus:ring-2 focus:ring-red-500 outline-none cursor-pointer"
                  >
                    {AVAILABILITY.map((av, aIdx) => (
                      <option key={aIdx} value={av}>{av}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1" htmlFor="emp-obs">
                    Resumen de Experiencia / Maquinaria o Herramientas que dominas:
                  </label>
                  <textarea
                    id="emp-obs"
                    rows={3}
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Detalla talleres anteriores, manejo de equipos de diagnosis, soldadura, pintura o vehículos en los que has trabajado..."
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs sm:text-sm text-gray-900 focus:ring-2 focus:ring-red-500 outline-none font-medium"
                  />
                </div>
              </div>

              {/* Checkbox Terms */}
              <div className="pt-2">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={accepted}
                    onChange={(e) => setAccepted(e.target.checked)}
                    className="mt-0.5 rounded text-red-600 focus:ring-red-500 w-4 h-4 cursor-pointer shrink-0"
                  />
                  <span className="text-[11px] text-gray-600 leading-snug">
                    Acepto la incorporación de mis datos a la **Bolsa de Empleo de Academias Péndulo** y la cesión a empresas colaboradoras del sector automoción para procesos de selección.
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  id="btn-submit-employment"
                  className="group relative overflow-hidden w-full py-3.5 px-6 bg-gradient-to-r from-red-600 via-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-extrabold text-sm sm:text-base rounded-2xl shadow-xl hover:shadow-[0_10px_30px_rgba(239,68,68,0.4)] transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/35 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out pointer-events-none" />
                  <Briefcase className="w-5 h-5 text-amber-300 group-hover:rotate-12 transition-transform duration-300" />
                  <span className="relative z-10">
                    {isSubmitting ? 'Inscribiendo en Bolsa de Empleo...' : 'Apuntarse a la Bolsa de Empleo Oficial'}
                  </span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
