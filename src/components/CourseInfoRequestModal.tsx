import React, { useState } from 'react';
import { 
  X, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  BookOpen, 
  Clock, 
  HelpCircle, 
  ShieldCheck,
  User,
  Mail,
  Phone,
  MessageSquare
} from 'lucide-react';
import { Course } from '../types';

interface CourseInfoRequestModalProps {
  course: Course | null;
  isOpen: boolean;
  onClose: () => void;
}

export const CourseInfoRequestModal: React.FC<CourseInfoRequestModalProps> = ({
  course,
  isOpen,
  onClose
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successSubmitted, setSuccessSubmitted] = useState(false);

  if (!isOpen || !course) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!firstName.trim()) {
      setErrorMsg('Por favor, indica tu nombre.');
      return;
    }

    if (!email.trim() && !phone.trim()) {
      setErrorMsg('Por favor, indica al menos un método de contacto (correo electrónico o teléfono).');
      return;
    }

    if (email.trim() && !email.includes('@')) {
      setErrorMsg('El formato del correo electrónico no es válido.');
      return;
    }

    if (!privacyAccepted) {
      setErrorMsg('Debes aceptar la política de privacidad y protección de datos para continuar.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        course_id: course.id,
        course_code: course.code,
        course_name: course.title,
        comments: message.trim() || `Interés en información para próximas convocatorias del curso ${course.title} (${course.code}).`,
        source: 'Boton Solicitar Informacion - Curso Cerrado'
      };

      const res = await fetch('/api/public/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al enviar la consulta.');
      }

      setSuccessSubmitted(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error de conexión al enviar la consulta.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setMessage('');
    setPrivacyAccepted(false);
    setErrorMsg('');
    setSuccessSubmitted(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-gray-100 relative my-auto max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="course-info-modal-title"
      >
        {/* Close Button */}
        <button
          onClick={handleResetAndClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100 transition cursor-pointer"
          aria-label="Cerrar ventana"
        >
          <X className="w-5 h-5" />
        </button>

        {successSubmitted ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h3 className="font-display text-2xl font-bold text-gray-900">
              ¡Consulta Recibida con Éxito!
            </h3>
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-emerald-900 text-sm leading-relaxed max-w-md mx-auto">
              Hemos recibido tu consulta sobre este curso. Nuestro equipo se pondrá en contacto contigo para facilitarte más información.
            </div>
            <p className="text-xs text-gray-500">
              Curso consultado: <strong>{course.title}</strong> ({course.code})
            </p>
            <div className="pt-3">
              <button
                onClick={handleResetAndClose}
                className="px-6 py-3 rounded-xl bg-gray-900 hover:bg-black text-white font-bold text-sm shadow-md transition"
              >
                Entendido y Cerrar
              </button>
            </div>
          </div>
        ) : (
          <div>
            {/* Header */}
            <div className="mb-6 space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Solicitud de Información y Próximas Convocatorias</span>
              </div>
              <h2 id="course-info-modal-title" className="font-display text-xl sm:text-2xl font-extrabold text-gray-900 pt-1">
                Solicitar Información del Curso
              </h2>
              <p className="text-xs text-gray-600 leading-relaxed">
                Este curso tiene la matrícula temporalmente cerrada. Completa tus datos y Secretaría te contactará con los horarios, temarios y fechas de inicio de la próxima convocatoria.
              </p>
            </div>

            {/* Readonly Course Info Card (Section 3: Course ID non-editable by user) */}
            <div className="mb-5 bg-gradient-to-r from-gray-50 to-red-50/30 p-4 rounded-2xl border border-gray-200/90 flex items-center gap-4">
              <img
                src={course.imageUrl}
                alt={course.title}
                className="w-16 h-16 rounded-xl object-cover border border-gray-200 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded">
                    {course.code}
                  </span>
                  <span className="text-[11px] font-semibold text-gray-500">
                    {course.totalHours && course.totalHours > 0 ? `${course.totalHours} horas • ` : ''}{course.modality}
                  </span>
                </div>
                <h4 className="font-bold text-sm text-gray-900 truncate mt-0.5">
                  {course.title}
                </h4>
                <div className="text-[11px] text-zinc-500 flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3 text-zinc-400" />
                  <span>Matrícula actual cerrada · Próximas plazas</span>
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Nombre */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-gray-400" /> Nombre *
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Ej. Carlos"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition"
                  />
                </div>

                {/* Apellidos */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Apellidos
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Ej. García López"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Correo Electrónico */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-gray-400" /> Correo Electrónico *
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition"
                  />
                </div>

                {/* Teléfono (Opcional según sección 3) */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-gray-400" /> Teléfono (opcional)
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="600 000 000"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition"
                  />
                </div>
              </div>

              {/* Mensaje / Consulta */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5 text-gray-400" /> Mensaje o Consulta
                </label>
                <textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Escribe aquí si tienes disponibilidad de mañanas o tardes, o cualquier duda sobre el temario..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition resize-none"
                />
              </div>

              {/* RGPD y Privacidad */}
              <div className="pt-1">
                <label className="flex items-start gap-2.5 cursor-pointer text-xs text-gray-600">
                  <input
                    type="checkbox"
                    checked={privacyAccepted}
                    onChange={(e) => setPrivacyAccepted(e.target.checked)}
                    className="mt-0.5 rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <span>
                    He leído y acepto la <a href="#privacidad" className="text-red-600 font-semibold underline">política de privacidad</a> y el tratamiento de mis datos personales para resolver mi consulta y facilitarme información sobre este curso de <strong>Academias Péndulo</strong>.
                  </span>
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-gray-900 to-black hover:from-black hover:to-gray-900 text-white font-bold text-xs shadow-md hover:shadow-lg transition flex items-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Enviando consulta...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Enviar Consulta</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        )}

      </div>
    </div>
  );
};
