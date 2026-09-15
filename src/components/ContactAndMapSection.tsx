import React, { useState } from 'react';
import { 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  Send, 
  CheckCircle2, 
  ShieldCheck, 
  BellRing,
  Sparkles,
  AlertCircle,
  ChevronDown
} from 'lucide-react';
import { CENTER_INFO, COURSES } from '../data/coursesData';
import { InlineCourseDropdown } from './InlineCourseDropdown';
import { useCampus } from '../context/CampusContext';

export const ContactAndMapSection: React.FC = () => {
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [timePreference, setTimePreference] = useState('manana');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [message, setMessage] = useState('');

  // Newsletter state
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSuccess, setNewsletterSuccess] = useState(false);

  const { submitContactRequest, courses } = useCampus();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !email || isSubmitting) return;

    setIsSubmitting(true);

    const targetCourse = courses.find((c) => c.id === selectedCourseId) || courses[0];
    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0] || name;
    const lastName = nameParts.slice(1).join(' ') || '—';

    submitContactRequest({
      first_name: firstName,
      last_name: lastName,
      email: email.trim(),
      phone: phone.trim(),
      course_id: targetCourse ? targetCourse.id : 'TMVG0004',
      course_code: targetCourse ? targetCourse.codigo : 'TMVG0004',
      course_name: targetCourse ? targetCourse.nombre : 'Mantenimiento de Vehículos Híbridos y Eléctricos',
      preferred_schedule: timePreference === 'manana' ? 'Mañana (09:00 - 14:00)' : timePreference === 'tarde' ? 'Tarde (16:00 - 20:00)' : 'Cualquier horario',
      comments: message,
      message: message,
      source: 'Formulario Web Principal',
    });

    setIsSubmitting(false);
    setFormSubmitted(true);
  };


  const handleNewsletter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail) return;
    setNewsletterSuccess(true);
  };

  return (
    <section className="py-20 bg-gray-50" id="contacto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-gray-800 text-xs font-bold uppercase tracking-wider mb-3">
            <MapPin className="w-3.5 h-3.5 text-red-600" /> Sede Oficial en Almería Capital
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            Ven a Conocernos o Escríbenos Directamente
          </h2>
          <p className="text-base text-gray-600 mt-3">
            Visita nuestras aulas y talleres en Carrera Doctoral 26. Nuestro equipo de secretaría te orientará sobre la matrícula en certificados oficiales y becas del SAE.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* Left Column: Sede Information & Map */}
          <div className="lg:col-span-6 space-y-6">
            
            {/* Info Box */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 space-y-6 shadow-sm">
              <div>
                <span className="text-[11px] font-mono font-bold text-red-700 bg-red-50 px-2.5 py-1 rounded-md uppercase">
                  Centro Homologado Nº {CENTER_INFO.officialCode}
                </span>
                <h3 className="font-display text-2xl font-bold text-gray-900 mt-2">
                  Academias Péndulo Almería
                </h3>
              </div>

              <div className="space-y-4 text-xs sm:text-sm text-gray-700">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-gray-900">Dirección Oficial:</strong>
                    <span>{CENTER_INFO.address}, CP {CENTER_INFO.postalCode}, {CENTER_INFO.city} ({CENTER_INFO.province})</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-gray-900">Teléfonos de Secretaría:</strong>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      <a href={`tel:${CENTER_INFO.phone.replace(/\s+/g, '')}`} className="text-red-600 font-semibold hover:underline">
                        {CENTER_INFO.phone}
                      </a>
                      <a href={`tel:${CENTER_INFO.phoneAlt.replace(/\s+/g, '')}`} className="text-gray-600 hover:underline">
                        {CENTER_INFO.phoneAlt}
                      </a>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-gray-900">Correo de Admisiones:</strong>
                    <a href={`mailto:${CENTER_INFO.email}`} className="text-red-600 font-semibold hover:underline">
                      {CENTER_INFO.email}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-gray-900">Horario de Atención Presencial:</strong>
                    <span>{CENTER_INFO.hours}</span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 text-xs text-gray-600 flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Instalaciones accesibles para personas con movilidad reducida (PMR) y transporte público a 150m.</span>
              </div>
            </div>

            {/* Embedded Google Maps Container */}
            <div className="rounded-3xl overflow-hidden border border-gray-200 shadow-sm h-72 w-full relative bg-gray-100">
              <iframe 
                src="https://maps.google.com/maps?q=Carrera%20Doctoral%2026%20Almer%C3%ADa&t=&z=16&ie=UTF8&iwloc=&output=embed" 
                title="Ubicación Academias Péndulo en Almería"
                className="w-full h-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
              <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-md border border-gray-200 text-xs font-semibold text-gray-800 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-red-500" />
                <span>Carrera Doctoral 26, Almería</span>
              </div>
            </div>

          </div>

          {/* Right Column: Direct Contact Form & Newsletter */}
          <div className="lg:col-span-6 space-y-6">
            
            {/* Contact Form Card */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-sm" id="contacto-form-card">
              <h3 className="font-display text-xl sm:text-2xl font-bold text-gray-900 mb-1">
                Envíanos tu Consulta
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 mb-6">
                Te llamamos en el horario que mejor te venga para resolver tus dudas sin compromiso.
              </p>

              {formSubmitted ? (
                <div className="p-8 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-3 animate-in fade-in duration-300">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-gray-900 text-base">¡Mensaje Recibido en Secretaría!</h4>
                  <p className="text-xs text-gray-600">
                    Nos pondremos en contacto contigo en el horario preferido ({timePreference === 'manana' ? 'Mañana: 09:00 - 14:00' : 'Tarde: 16:00 - 20:00'}).
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4" id="direct-contact-form">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1" htmlFor="direct-name">
                      Nombre y Apellidos *
                    </label>
                    <input
                      type="text"
                      id="direct-name"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Tu nombre completo"
                      className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-red-500 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1" htmlFor="direct-phone">
                        Teléfono *
                      </label>
                      <input
                        type="tel"
                        id="direct-phone"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Móvil de contacto"
                        className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-red-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1" htmlFor="direct-email">
                        Correo Electrónico *
                      </label>
                      <input
                        type="email"
                        id="direct-email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tu@email.com"
                        className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-red-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1" htmlFor="direct-schedule">
                      Preferencia Horaria para Llamarte
                    </label>
                    <select
                      id="direct-schedule"
                      value={timePreference}
                      onChange={(e) => setTimePreference(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-red-500 outline-none"
                    >
                      <option value="manana">Por la mañana (09:00 - 14:00 h)</option>
                      <option value="tarde">Por la tarde (16:00 - 20:00 h)</option>
                      <option value="cualquiera">Cualquier momento</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Selecciona el Curso / Especialidad *
                    </label>

                    {/* Inline Dropdown - Exact width of parent container */}
                    <InlineCourseDropdown 
                      selectedCourseId={selectedCourseId}
                      onSelectCourse={(courseId) => setSelectedCourseId(courseId)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1" htmlFor="direct-message">
                      Comentarios o Estado Laboral (Opcional)
                    </label>
                    <textarea
                      id="direct-message"
                      rows={2}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Indícanos si estás desempleado, trabajador en activo, titulación previa o dudas específicas..."
                      className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-red-500 outline-none"
                    />
                  </div>

                  <div className="text-[11px] text-gray-500">
                    Al enviar este formulario aceptas el tratamiento de tus datos conforme al RGPD por Academias Péndulo como Centro Homologado 0400030892.
                  </div>

                  <button
                    type="submit"
                    id="direct-submit-btn"
                    className="w-full py-3 px-6 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer btn-hover shadow-sm"
                  >
                    <Send className="w-4 h-4" />
                    <span>Enviar Consulta a Secretaría</span>
                  </button>
                </form>
              )}
            </div>

            {/* Newsletter Card for SAE/SEPE call alerts */}
            <div className="bg-white p-6 rounded-3xl border border-red-100 flex flex-col sm:flex-row items-start gap-4">
              <div className="p-3 bg-red-50 text-red-600 rounded-2xl shrink-0">
                <BellRing className="w-6 h-6" />
              </div>
              <div className="space-y-2 flex-1">
                <h4 className="font-bold text-gray-900 text-sm sm:text-base">
                  Avisos de Nuevas Convocatorias del SAE
                </h4>
                <p className="text-xs text-gray-600">
                  Suscríbete para recibir alertas inmediatas en cuanto la Junta de Andalucía abra los plazos de inscripción oficiales.
                </p>

                {newsletterSuccess ? (
                  <p className="text-xs font-bold text-emerald-700 flex items-center gap-1 pt-1">
                    <CheckCircle2 className="w-4 h-4" /> ¡Suscrito con éxito a las alertas oficiales!
                  </p>
                ) : (
                  <form onSubmit={handleNewsletter} className="flex gap-2 pt-1" id="newsletter-form">
                    <input
                      type="email"
                      required
                      id="newsletter-email-input"
                      value={newsletterEmail}
                      onChange={(e) => setNewsletterEmail(e.target.value)}
                      placeholder="Tu correo electrónico"
                      className="flex-1 px-3 py-2 bg-gray-50 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-red-500 outline-none"
                    />
                    <button
                      type="submit"
                      id="newsletter-submit-btn"
                      className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition-colors shrink-0"
                    >
                      Avisarme
                    </button>
                  </form>
                )}
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
