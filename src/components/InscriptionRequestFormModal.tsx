import React, { useState } from 'react';
import { 
  X, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Send, 
  ShieldCheck, 
  Award, 
  BookOpen, 
  User, 
  Briefcase, 
  PenTool,
  Sparkles
} from 'lucide-react';
import { COURSES } from '../data/coursesData';

interface InscriptionRequestFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedCourseName?: string;
  preselectedCourseId?: string;
  preselectedCourseCode?: string;
}

export const InscriptionRequestFormModal: React.FC<InscriptionRequestFormModalProps> = ({
  isOpen,
  onClose,
  preselectedCourseName = '',
  preselectedCourseId = '',
  preselectedCourseCode = ''
}) => {
  const [loading, setLoading] = useState(false);
  const [submittedRequestNumber, setSubmittedRequestNumber] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [downloadingSubmittedPdf, setDownloadingSubmittedPdf] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    course_id: preselectedCourseId,
    course_name: preselectedCourseName || (COURSES[0] ? COURSES[0].title : 'Mantenimiento Electromecánico de Vehículos'),
    course_code: preselectedCourseCode || 'TMVG0209',
    center: 'Academias Péndulo - Almería',
    edition: 'Convocatoria 2026',
    first_name: '',
    last_name_1: '',
    last_name_2: '',
    dni_nie: '',
    birth_date: '',
    phone: '',
    email: '',
    address: '',
    postal_code: '',
    city: '',
    province: 'Almería',
    employment_status: 'desempleado/a',
    company_activity: '',
    observations: '',
    truth_declaration: true,
    subsidized_training_acceptance: true,
    contact_authorization: true,
    privacy_acceptance: true,
    marketing_consent: false,
    signature_name: '',
    signature_date: new Date().toISOString().split('T')[0]
  });

  React.useEffect(() => {
    if (isOpen) {
      setSubmittedRequestNumber(null);
      setErrorMsg(null);
      if (preselectedCourseName) {
        const found = COURSES.find(c => c.id === preselectedCourseId || c.title === preselectedCourseName);
        setFormData(prev => ({
          ...prev,
          course_id: preselectedCourseId || (found ? found.id : prev.course_id),
          course_name: preselectedCourseName || (found ? found.title : prev.course_name),
          course_code: preselectedCourseCode || (found ? found.code : prev.course_code),
        }));
      }
    }
  }, [isOpen, preselectedCourseName, preselectedCourseId, preselectedCourseCode]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleDownloadSubmittedPdf = async () => {
    if (!submittedRequestNumber) return;
    setDownloadingSubmittedPdf(true);
    try {
      const res = await fetch(`/api/public/inscriptions/${submittedRequestNumber}/pdf`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Error al descargar la solicitud en PDF.');
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Solicitud_Inscripcion_${submittedRequestNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      console.error('Download error:', e);
      alert('Error de conexión al descargar el PDF.');
    } finally {
      setDownloadingSubmittedPdf(false);
    }
  };

  const validateForm = () => {
    if (!formData.course_name.trim()) return 'Debe seleccionar un curso o especialidad.';
    if (!formData.first_name.trim()) return 'El nombre es un campo obligatorio.';
    if (!formData.last_name_1.trim()) return 'El primer apellido es obligatorio.';
    if (!formData.dni_nie.trim()) return 'El DNI/NIE es obligatorio.';
    if (!formData.birth_date) return 'La fecha de nacimiento es obligatoria.';
    if (!formData.phone.trim()) return 'El teléfono de contacto es obligatorio.';
    if (!formData.email.trim()) return 'El correo electrónico es obligatorio.';
    if (!formData.signature_name.trim()) return 'Debe introducir su nombre completo como firma digital.';
    if (!formData.signature_date) return 'La fecha de firma es obligatoria.';
    if (!formData.truth_declaration) return 'Debe declarar que los datos introducidos son veraces.';
    if (!formData.privacy_acceptance) return 'Debe aceptar la política de protección de datos.';

    // Email regex
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      return 'El correo electrónico introducido no tiene un formato válido.';
    }

    // DNI/NIE regex validation
    const cleanDni = formData.dni_nie.trim().toUpperCase();
    if (!/^[0-9XYZ][0-9]{7}[TRWAGMYFPDXBNJZSQVHLCKE]$/i.test(cleanDni)) {
      return 'El DNI/NIE introducido no tiene un formato válido (Ej: 12345678Z o Y1234567Z).';
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const validationError = validateForm();
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/public/inscription-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || 'Ocurrió un error al procesar su solicitud.');
      }

      setSubmittedRequestNumber(resData.request_number);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100 my-8">
        
        {/* Header Modal Bar */}
        <div className="bg-gray-950 text-white p-4 sm:p-6 border-b border-gray-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-500 font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                Solicitud Oficial de Inscripción y Reserva de Plaza
                <span className="hidden sm:inline-block text-[10px] bg-red-600/30 text-red-400 border border-red-500/40 px-2 py-0.5 rounded-full font-bold uppercase">
                  100% Subvencionada
                </span>
              </h2>
              <p className="text-xs text-gray-400">Academias Péndulo · Centro de Formación Profesional N.º 0400030892</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-8 max-h-[82vh] overflow-y-auto">

          {/* CONFIRMATION SCREEN AFTER SUBMISSION */}
          {submittedRequestNumber ? (
            <div className="py-10 text-center space-y-6 animate-fadeIn">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner border-2 border-emerald-300">
                <CheckCircle2 className="w-12 h-12" />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl sm:text-3xl font-black text-gray-900">
                  ✅ Solicitud Registrada y Enviada
                </h3>
                <p className="text-gray-600 text-sm max-w-lg mx-auto">
                  Hemos registrado correctamente tu solicitud de inscripción y enviado una copia oficial con el PDF adjunto a tu correo electrónico y a Secretaría.
                </p>
              </div>

              <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 max-w-md mx-auto shadow-sm">
                <p className="text-xs text-red-700 font-bold uppercase tracking-wider">Número Oficial de Solicitud</p>
                <p className="text-3xl sm:text-4xl font-black text-red-600 tracking-wider mt-1">{submittedRequestNumber}</p>
                <p className="text-xs text-gray-500 mt-2">Documento oficial PDF firmado y archivado en Secretaría.</p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
                <button
                  type="button"
                  onClick={handleDownloadSubmittedPdf}
                  disabled={downloadingSubmittedPdf}
                  className="w-full sm:flex-1 py-3.5 px-4 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-102"
                >
                  <Download className="w-4 h-4" />
                  <span>{downloadingSubmittedPdf ? 'Descargando...' : 'Descargar mi Solicitud en PDF'}</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-6 py-3.5 bg-gray-900 hover:bg-black text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Cerrar
                </button>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl text-left text-xs text-gray-600 max-w-lg mx-auto space-y-2 border border-gray-200">
                <p className="font-bold text-gray-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Siguientes pasos:
                </p>
                <p>1. El equipo de Secretaría revisará los datos introducidos en tu expediente.</p>
                <p>2. Te contactaremos a través del teléfono o email facilitado para confirmar tu grupo o plaza.</p>
              </div>
            </div>
          ) : (

            /* FORM CONTENT */
            <form onSubmit={handleSubmit} className="space-y-8">

              {/* Subsidized Training Prominent Red Banner */}
              <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 sm:p-5 flex items-start gap-4 shadow-xs">
                <div className="p-2 bg-red-600 text-white rounded-xl shrink-0 mt-0.5 shadow-sm">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-extrabold text-red-800 text-sm sm:text-base flex items-center gap-2">
                    FORMACIÓN 100% SUBVENCIONADA
                    <span className="text-[11px] bg-red-200 text-red-900 font-bold px-2 py-0.5 rounded-full">Sin Coste</span>
                  </h4>
                  <p className="text-red-700 text-xs sm:text-sm font-semibold mt-1">
                    “Esta solicitud no requiere pago, transferencia bancaria ni abono en efectivo o con tarjeta.”
                  </p>
                </div>
              </div>

              {errorMsg && (
                <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-xl flex items-start gap-3 text-amber-800 text-xs sm:text-sm">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* SECTION 1: CURSO / ESPECIALIDAD SOLICITADA */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
                  <BookOpen className="w-5 h-5 text-red-600" />
                  <h3 className="font-black text-gray-900 text-base sm:text-lg">1. CURSO / ESPECIALIDAD SOLICITADA</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Curso o especialidad <span className="text-red-600">*</span>
                    </label>
                    <select
                      name="course_name"
                      value={formData.course_name}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-red-500 text-xs sm:text-sm font-semibold bg-gray-50/50"
                      required
                    >
                      {COURSES.map(c => (
                        <option key={c.id} value={c.title}>
                          {c.title} ({c.hours}h - {c.modality})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Código (si procede)</label>
                    <input
                      type="text"
                      name="course_code"
                      value={formData.course_code}
                      onChange={handleChange}
                      placeholder="Ej: TMVG0209"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs sm:text-sm bg-gray-50/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Centro</label>
                    <input
                      type="text"
                      name="center"
                      value={formData.center}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs sm:text-sm bg-gray-100 cursor-not-allowed text-gray-600 font-medium"
                      readOnly
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1">Convocatoria / edición</label>
                    <input
                      type="text"
                      name="edition"
                      value={formData.edition}
                      onChange={handleChange}
                      placeholder="Ej: Convocatoria 2026 - Presencial Almería"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs sm:text-sm bg-gray-50/50"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: DATOS DEL ALUMNO/A */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
                  <User className="w-5 h-5 text-red-600" />
                  <h3 className="font-black text-gray-900 text-base sm:text-lg">2. DATOS DEL ALUMNO/A</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Nombre <span className="text-red-600">*</span></label>
                    <input
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleChange}
                      placeholder="Ej: Manuel"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-red-500 text-xs sm:text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Primer apellido <span className="text-red-600">*</span></label>
                    <input
                      type="text"
                      name="last_name_1"
                      value={formData.last_name_1}
                      onChange={handleChange}
                      placeholder="Ej: García"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-red-500 text-xs sm:text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Segundo apellido</label>
                    <input
                      type="text"
                      name="last_name_2"
                      value={formData.last_name_2}
                      onChange={handleChange}
                      placeholder="Ej: López"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-red-500 text-xs sm:text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">DNI / NIE <span className="text-red-600">*</span></label>
                    <input
                      type="text"
                      name="dni_nie"
                      value={formData.dni_nie}
                      onChange={handleChange}
                      placeholder="12345678Z"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-red-500 text-xs sm:text-sm font-mono uppercase"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Fecha de nacimiento <span className="text-red-600">*</span></label>
                    <input
                      type="date"
                      name="birth_date"
                      value={formData.birth_date}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-red-500 text-xs sm:text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Teléfono móvil <span className="text-red-600">*</span></label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="600 123 456"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-red-500 text-xs sm:text-sm"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Correo electrónico <span className="text-red-600">*</span></label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="tuemail@ejemplo.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-red-500 text-xs sm:text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Dirección habitual</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Calle, número, piso, puerta"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs sm:text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Código postal</label>
                    <input
                      type="text"
                      name="postal_code"
                      value={formData.postal_code}
                      onChange={handleChange}
                      placeholder="04005"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Localidad</label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="Almería"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Provincia</label>
                    <input
                      type="text"
                      name="province"
                      value={formData.province}
                      onChange={handleChange}
                      placeholder="Almería"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs sm:text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: SITUACIÓN LABORAL */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
                  <Briefcase className="w-5 h-5 text-red-600" />
                  <h3 className="font-black text-gray-900 text-base sm:text-lg">3. SITUACIÓN LABORAL</h3>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
                  {[
                    { id: 'desempleado/a', label: 'Desempleado/a' },
                    { id: 'ocupado/a', label: 'Ocupado/a' },
                    { id: 'autónomo/a', label: 'Autónomo/a' },
                    { id: 'otra', label: 'Otra' }
                  ].map(item => (
                    <label key={item.id} className="flex items-center gap-2.5 cursor-pointer text-xs sm:text-sm font-semibold text-gray-800">
                      <input
                        type="radio"
                        name="employment_status"
                        value={item.id}
                        checked={formData.employment_status === item.id}
                        onChange={handleChange}
                        className="w-4 h-4 text-red-600 focus:ring-red-500 border-gray-300"
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Empresa / actividad profesional (opcional)</label>
                  <input
                    type="text"
                    name="company_activity"
                    value={formData.company_activity}
                    onChange={handleChange}
                    placeholder="Nombre de la empresa o sector laboral actual"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs sm:text-sm"
                  />
                </div>
              </div>

              {/* SECTION 4: OBSERVACIONES */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700">4. OBSERVACIONES Y NOTAS</label>
                <textarea
                  name="observations"
                  rows={3}
                  value={formData.observations}
                  onChange={handleChange}
                  placeholder="Indique cualquier detalle o consulta adicional que considere importante para Secretaría..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-red-500"
                />
              </div>

              {/* SECTION 5: DECLARACIONES Y CONSENTIMIENTOS */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
                  <ShieldCheck className="w-5 h-5 text-red-600" />
                  <h3 className="font-black text-gray-900 text-base sm:text-lg">5. DECLARACIONES Y CONSENTIMIENTOS</h3>
                </div>

                <div className="space-y-3 text-xs text-gray-700 bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="truth_declaration"
                      checked={formData.truth_declaration}
                      onChange={handleChange}
                      className="mt-0.5 w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
                    />
                    <span className="font-medium">
                      Declaro que los datos facilitados en esta solicitud son veraces y están actualizados. <span className="text-red-600 font-bold">*</span>
                    </span>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="subsidized_training_acceptance"
                      checked={formData.subsidized_training_acceptance}
                      onChange={handleChange}
                      className="mt-0.5 w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
                    />
                    <span className="font-medium">
                      He sido informado/a de que la formación solicitada es subvencionada y que la admisión puede estar sujeta a requisitos de acceso, disponibilidad de plazas y validación de la convocatoria.
                    </span>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="contact_authorization"
                      checked={formData.contact_authorization}
                      onChange={handleChange}
                      className="mt-0.5 w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
                    />
                    <span className="font-medium">
                      Autorizo a Academias Péndulo a contactar conmigo por teléfono o correo electrónico para gestionar esta solicitud, la matrícula y las comunicaciones relacionadas con el curso.
                    </span>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer pt-2 border-t border-gray-200">
                    <input
                      type="checkbox"
                      name="privacy_acceptance"
                      checked={formData.privacy_acceptance}
                      onChange={handleChange}
                      className="mt-0.5 w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
                    />
                    <span className="font-medium text-gray-900 font-bold">
                      He leído y acepto la política de protección de datos (RGPD / LOPDGDD) necesaria para tramitar mi solicitud. <span className="text-red-600">*</span>
                    </span>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="marketing_consent"
                      checked={formData.marketing_consent}
                      onChange={handleChange}
                      className="mt-0.5 w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
                    />
                    <span className="font-medium text-gray-600">
                      Deseo recibir información sobre futuras convocatorias, cursos y actividades de Academias Péndulo. (Opcional)
                    </span>
                  </label>
                </div>
              </div>

              {/* SECTION 6: CONFIRMACIÓN Y FIRMA DIGITAL */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
                  <PenTool className="w-5 h-5 text-red-600" />
                  <h3 className="font-black text-gray-900 text-base sm:text-lg">6. CONFIRMACIÓN Y FIRMA DEL SOLICITANTE</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-red-50/40 p-4 rounded-xl border border-red-200">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Firma / Nombre completo de conformidad <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      name="signature_name"
                      value={formData.signature_name}
                      onChange={handleChange}
                      placeholder="Escriba su Nombre y Apellidos completos como firma telemática"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-red-500 bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Fecha de solicitud <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="date"
                      name="signature_date"
                      value={formData.signature_date}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs sm:text-sm bg-white"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button Bar */}
              <div className="pt-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-gray-500 text-center sm:text-left">
                  🔒 Sus datos se transmiten de forma cifrada mediante HTTPS y se registran en los servidores de Secretaría de Academias Péndulo.
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-extrabold text-sm uppercase tracking-wider rounded-xl shadow-lg hover:shadow-[0_0_20px_rgba(220,38,38,0.5)] transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-red-500/50"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Procesando solicitud...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Enviar Solicitud Oficial</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          )}

        </div>
      </div>
    </div>
  );
};
