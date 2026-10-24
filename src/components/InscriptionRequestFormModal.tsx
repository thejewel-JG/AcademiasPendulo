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
  Sparkles,
  Download,
  GraduationCap
} from 'lucide-react';
import { COURSES } from '../data/coursesData';
import { ACADEMIC_LEVELS } from '../data/academicLevels';

interface InscriptionRequestFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedCourseName?: string;
  preselectedCourseId?: string;
  preselectedCourseCode?: string;
  onSuccess?: (requestNumber: string, courseName: string) => void;
}

export const InscriptionRequestFormModal: React.FC<InscriptionRequestFormModalProps> = ({
  isOpen,
  onClose,
  preselectedCourseName = '',
  preselectedCourseId = '',
  preselectedCourseCode = '',
  onSuccess
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
    academic_level: '',
    academic_degree: '',
    additional_training: '',
    observations: '',
    truth_declaration: true,
    subsidized_training_acceptance: true,
    contact_authorization: true,
    privacy_acceptance: true,
    marketing_consent: false,
    signature_name: '',
    signature_date: new Date().toISOString().split('T')[0]
  });

  // Bank transfer & submission state
  const [submissionResult, setSubmissionResult] = useState<{
    request_number: string;
    modalidad_inscripcion?: string;
    referencia_transferencia?: string;
    importe_total?: number;
    bank_details?: {
      titular_cuenta?: string;
      iban?: string;
      nombre_entidad?: string;
      bic_swift?: string;
      instrucciones_adicionales?: string;
    };
  } | null>(null);
  const [selectedReceiptFile, setSelectedReceiptFile] = useState<File | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [receiptUploadSuccess, setReceiptUploadSuccess] = useState<string | null>(null);
  const [receiptUploadError, setReceiptUploadError] = useState<string | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setSubmittedRequestNumber(null);
      setSubmissionResult(null);
      setSelectedReceiptFile(null);
      setReceiptUploadSuccess(null);
      setReceiptUploadError(null);
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

  const handleUploadReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReceiptFile || !submittedRequestNumber) return;

    setUploadingReceipt(true);
    setReceiptUploadSuccess(null);
    setReceiptUploadError(null);

    try {
      const form = new FormData();
      form.append('justificante', selectedReceiptFile);

      const res = await fetch(`/api/public/inscriptions/${submittedRequestNumber}/upload-receipt`, {
        method: 'POST',
        body: form
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setReceiptUploadSuccess('Justificante de transferencia adjuntado correctamente. El equipo de Administración procederá a verificar el ingreso.');
        setSelectedReceiptFile(null);
      } else {
        setReceiptUploadError(data.error || 'No se pudo subir el archivo justificante.');
      }
    } catch (err) {
      console.error('Error uploading receipt:', err);
      setReceiptUploadError('Error de conexión al subir el justificante.');
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleCopyReference = (ref: string) => {
    navigator.clipboard.writeText(ref);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2500);
  };

  const validateForm = () => {
    if (!formData.course_name.trim()) return 'Debe seleccionar un curso o especialidad.';
    if (!formData.first_name.trim()) return 'El nombre es un campo obligatorio.';
    if (!formData.last_name_1.trim()) return 'El primer apellido es obligatorio.';
    if (!formData.dni_nie.trim()) return 'El DNI/NIE es obligatorio.';
    if (!formData.birth_date) return 'La fecha de nacimiento es obligatoria.';
    if (!formData.phone.trim()) return 'El teléfono de contacto es obligatorio.';
    if (!formData.email.trim()) return 'El correo electrónico es obligatorio.';
    if (!formData.academic_level || !formData.academic_level.trim()) {
      return 'Debe seleccionar su nivel de estudios finalizados.';
    }
    if (!formData.academic_degree || !formData.academic_degree.trim()) {
      return 'Debe indicar los estudios o titulación realizada (o indicar "Sin titulación").';
    }
    if (formData.academic_degree.trim().length > 255) {
      return 'El campo de estudios o titulación no puede superar los 255 caracteres.';
    }
    if (formData.additional_training && formData.additional_training.length > 1500) {
      return 'El campo de formación complementaria no puede superar los 1500 caracteres.';
    }
    if (!formData.signature_name.trim()) return 'Debe introducir su nombre completo como firma digital.';
    if (!formData.signature_date) return 'La fecha de firma es obligatoria.';
    if (!formData.truth_declaration) return 'Debe declarar que los datos introducidos son veraces.';
    if (!formData.privacy_acceptance) return 'Debe aceptar la política de protección de datos.';

    // Email regex
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      return 'El correo electrónico introducido no tiene un formato válido.';
    }

    // DNI/NIE official checksum validation
    const cleanDni = formData.dni_nie.trim().toUpperCase();
    const dniRegex = /^[0-9XYZ][0-9]{7}[TRWAGMYFPDXBNJZSQVHLCKE]$/;
    if (!dniRegex.test(cleanDni)) {
      return 'El DNI/NIE introducido no tiene un formato válido (Ej: 12345678Z o Y1234567Z).';
    }
    const validLetters = 'TRWAGMYFPDXBNJZSQVHLCKE';
    let numberPart = cleanDni.slice(0, 8);
    const letter = cleanDni.charAt(8);
    if (numberPart.startsWith('X')) numberPart = '0' + numberPart.slice(1);
    else if (numberPart.startsWith('Y')) numberPart = '1' + numberPart.slice(1);
    else if (numberPart.startsWith('Z')) numberPart = '2' + numberPart.slice(1);
    const num = parseInt(numberPart, 10);
    if (isNaN(num) || letter !== validLetters[num % 23]) {
      return 'La letra del DNI/NIE no se corresponde con el número introducido según el algoritmo oficial español.';
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
      setSubmissionResult(resData);

      // Trigger automatic PDF download in the background
      try {
        const pdfRes = await fetch(`/api/public/inscriptions/${resData.request_number}/pdf`);
        if (pdfRes.ok) {
          const blob = await pdfRes.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `Solicitud_Inscripcion_${resData.request_number}.pdf`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }
      } catch (dlErr) {
        console.warn('Auto PDF download trigger error:', dlErr);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleFinishAndClose = () => {
    if (onSuccess && submittedRequestNumber) {
      onSuccess(submittedRequestNumber, formData.course_name);
    }
    onClose();
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
                Solicitud Oficial de Inscripción y Admisión
                <span className="hidden sm:inline-block text-[10px] bg-red-600/30 text-red-400 border border-red-500/40 px-2 py-0.5 rounded-full font-bold uppercase">
                  Formación Especializada
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
            <div className="py-6 space-y-6 animate-fadeIn">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner border-2 border-emerald-300">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="text-center space-y-1">
                <h3 className="text-2xl font-black text-gray-900">
                  ✅ Solicitud Registrada con Éxito
                </h3>
                <p className="text-gray-600 text-xs sm:text-sm max-w-lg mx-auto">
                  Hemos generado tu expediente oficial. Se ha enviado un correo con copia del PDF a <strong>{formData.email}</strong>.
                </p>
              </div>

              {/* Unique Reference & Course Box */}
              <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 text-center max-w-md mx-auto">
                <p className="text-[11px] text-red-700 font-bold uppercase tracking-wider">Referencia Única de Solicitud</p>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <span className="text-2xl sm:text-3xl font-black text-red-600 font-mono tracking-wider">
                    {submissionResult?.referencia_transferencia || submittedRequestNumber}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyReference(submissionResult?.referencia_transferencia || submittedRequestNumber)}
                    className="px-2.5 py-1 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-all shadow-xs"
                    title="Copiar referencia"
                  >
                    {copiedRef ? '✓ Copiado' : 'Copiar'}
                  </button>
                </div>
                <p className="text-xs text-gray-700 mt-2 font-medium">Curso: <strong>{formData.course_name}</strong></p>
              </div>

              {/* MODALIDAD A: COMPRA DIRECTA -> INSTRUCCIONES DE TRANSFERENCIA */}
              {submissionResult?.modalidad_inscripcion === 'COMPRA_DIRECTA' ? (
                <div className="bg-indigo-50/70 border-2 border-indigo-200 rounded-2xl p-5 max-w-xl mx-auto space-y-4 text-left">
                  <div className="flex items-center justify-between border-b border-indigo-200 pb-2">
                    <div className="flex items-center gap-2 text-indigo-950 font-black text-sm">
                      <BookOpen className="w-4 h-4 text-indigo-600" />
                      <span>Instrucciones para Transferencia Bancaria</span>
                    </div>
                    <span className="bg-indigo-600 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
                      Compra Directa
                    </span>
                  </div>

                  <p className="text-xs text-indigo-900 leading-relaxed">
                    Para formalizar tu matrícula, realiza una transferencia bancaria utilizando exactamente los siguientes datos:
                  </p>

                  <div className="bg-white p-4 rounded-xl border border-indigo-200 space-y-2.5 text-xs text-gray-800 font-medium">
                    <div className="flex justify-between items-center border-b border-gray-100 pb-1.5">
                      <span className="text-gray-500 font-bold">Titular de la cuenta:</span>
                      <span className="font-bold text-gray-900">{submissionResult.bank_details?.titular_cuenta || 'Academias Péndulo S.L.'}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-gray-100 pb-1.5">
                      <span className="text-gray-500 font-bold">Entidad bancaria:</span>
                      <span className="font-bold text-gray-900">{submissionResult.bank_details?.nombre_entidad || 'Banco Santander'}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-gray-100 pb-1.5">
                      <span className="text-gray-500 font-bold">IBAN de la academia:</span>
                      <span className="font-mono font-black text-indigo-900 text-sm tracking-wide bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                        {submissionResult.bank_details?.iban || 'ES00 0000 0000 0000 0000 0000'}
                      </span>
                    </div>
                    {submissionResult.bank_details?.bic_swift && (
                      <div className="flex justify-between items-center border-b border-gray-100 pb-1.5">
                        <span className="text-gray-500 font-bold">BIC / SWIFT:</span>
                        <span className="font-mono text-gray-800">{submissionResult.bank_details.bic_swift}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center border-b border-gray-100 pb-1.5">
                      <span className="text-gray-500 font-bold">Importe exacto:</span>
                      <span className="font-mono font-black text-red-600 text-base">
                        {submissionResult.importe_total != null ? `${Number(submissionResult.importe_total).toFixed(2)} €` : 'A consultar'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-0.5">
                      <span className="text-gray-500 font-bold">Concepto / Referencia:</span>
                      <span className="font-mono font-black text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                        {submissionResult.referencia_transferencia || submittedRequestNumber}
                      </span>
                    </div>
                  </div>

                  {submissionResult.bank_details?.instrucciones_adicionales && (
                    <p className="text-[11px] text-indigo-800 italic bg-indigo-100/60 p-2.5 rounded-lg border border-indigo-200">
                      ℹ️ {submissionResult.bank_details.instrucciones_adicionales}
                    </p>
                  )}

                  {/* Private Receipt Upload Interface */}
                  <div className="bg-white p-4 rounded-xl border border-indigo-200 space-y-3">
                    <h5 className="font-extrabold text-xs text-gray-900 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-indigo-600" />
                      Adjuntar Justificante de Transferencia (Opcional)
                    </h5>
                    <p className="text-[11px] text-gray-600">
                      Puedes adjuntar aquí tu comprobante bancario en formato PDF, PNG o JPG para agilizar la comprobación por Administración.
                    </p>

                    {receiptUploadSuccess ? (
                      <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{receiptUploadSuccess}</span>
                      </div>
                    ) : (
                      <form onSubmit={handleUploadReceipt} className="space-y-2">
                        <input
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg"
                          onChange={e => setSelectedReceiptFile(e.target.files ? e.target.files[0] : null)}
                          className="block w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                        />
                        {receiptUploadError && (
                          <p className="text-xs text-red-600 font-bold">⚠️ {receiptUploadError}</p>
                        )}
                        <button
                          type="submit"
                          disabled={!selectedReceiptFile || uploadingReceipt}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-2"
                        >
                          {uploadingReceipt ? 'Subiendo justificante...' : 'Enviar Justificante a Administración'}
                        </button>
                      </form>
                    )}

                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-[11px] text-amber-900">
                      ⚠️ <strong>Información importante:</strong> La aportación del justificante no concede acceso automático al campus. La activación y el envío de credenciales se realizarán una vez que Administración verifique la recepción de los fondos.
                    </div>
                  </div>
                </div>
              ) : (
                /* MODALIDAD B: SOLICITUD CON APROBACIÓN */
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 max-w-xl mx-auto space-y-3 text-left">
                  <div className="flex items-center gap-2 text-amber-950 font-black text-sm border-b border-amber-200 pb-2">
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                    <span>Modalidad con Aprobación Académica</span>
                  </div>
                  <p className="text-xs text-amber-900 leading-relaxed">
                    Esta especialidad formativa requiere la revisión previa de tu expediente académico y titulación por parte de la Secretaría de la academia.
                  </p>
                  <div className="bg-white p-3.5 rounded-xl border border-amber-200 space-y-1.5 text-xs text-gray-700">
                    <p className="font-bold text-gray-900">Siguientes pasos:</p>
                    <p>1. Secretaría revisará tus datos académicos y titulaciones declaradas.</p>
                    <p>2. En cuanto la solicitud sea preaprobada, recibirás por correo electrónico las instrucciones con el IBAN y referencia para realizar la transferencia.</p>
                    <p>3. El acceso al campus virtual se activará tras la comprobación bancaria del ingreso.</p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto pt-2">
                <button
                  type="button"
                  onClick={handleDownloadSubmittedPdf}
                  disabled={downloadingSubmittedPdf}
                  className="w-full sm:flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>{downloadingSubmittedPdf ? 'Descargando...' : 'Descargar Solicitud (PDF)'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleFinishAndClose}
                  className="w-full sm:w-auto px-6 py-3 bg-gray-900 hover:bg-black text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Entendido y Volver
                </button>
              </div>
            </div>
          ) : (

            /* FORM CONTENT */
            <form onSubmit={handleSubmit} className="space-y-8">

              {/* Course Modality Prominent Information Banner */}
              {(() => {
                const selectedCourse = COURSES.find(c => c.id === formData.course_id || c.title === formData.course_name || c.code === formData.course_code) || COURSES[0];
                const isDirectPurchase = selectedCourse?.tipo_inscripcion === 'COMPRA_DIRECTA';
                return (
                  <div className={`border-2 rounded-2xl p-4 sm:p-5 flex items-start gap-4 shadow-xs ${isDirectPurchase ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                    <div className={`p-2 text-white rounded-xl shrink-0 mt-0.5 shadow-sm ${isDirectPurchase ? 'bg-emerald-600' : 'bg-red-600'}`}>
                      <Award className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className={`font-extrabold text-sm sm:text-base flex items-center gap-2 ${isDirectPurchase ? 'text-emerald-950' : 'text-red-900'}`}>
                        {isDirectPurchase ? 'MODALIDAD A — COMPRA DIRECTA' : 'MODALIDAD B — SOLICITUD CON APROBACIÓN'}
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${isDirectPurchase ? 'bg-emerald-200 text-emerald-900' : 'bg-red-200 text-red-900'}`}>
                          {isDirectPurchase ? 'Matriculación Directa' : 'Revisión Académica Previa'}
                        </span>
                      </h4>
                      <p className={`text-xs sm:text-sm font-semibold mt-1 ${isDirectPurchase ? 'text-emerald-800' : 'text-red-700'}`}>
                        {isDirectPurchase
                          ? '“Esta especialidad permite tramitar la inscripción y avanzar al proceso de pago sin preaprobación previa de Secretaría. El campus se activará tras la confirmación y verificación administrativa del pago.”'
                          : '“Esta especialidad requiere revisión previa de Secretaría sobre tus datos y requisitos académicos antes de autorizar el pago y la posterior activación de matrícula.”'}
                      </p>
                    </div>
                  </div>
                );
              })()}

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

                {(() => {
                  const selCourse = COURSES.find(c => c.id === formData.course_id || c.title === formData.course_name || c.code === formData.course_code) || COURSES[0];
                  const priceStr = selCourse?.precio_final !== undefined && selCourse?.precio_final !== null
                    ? `${Number(selCourse.precio_final).toFixed(2)} €`
                    : '0.00 €';
                  const isDirect = selCourse?.tipo_inscripcion === 'COMPRA_DIRECTA';

                  return (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-xs font-bold text-gray-700 mb-1">
                            Curso o especialidad <span className="text-red-600">*</span>
                          </label>
                          <select
                            name="course_name"
                            value={formData.course_name}
                            onChange={(e) => {
                              const chosen = COURSES.find(c => c.title === e.target.value);
                              if (chosen) {
                                setFormData(prev => ({
                                  ...prev,
                                  course_id: chosen.id,
                                  course_name: chosen.title,
                                  course_code: chosen.code
                                }));
                              } else {
                                handleChange(e);
                              }
                            }}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-red-500 text-xs sm:text-sm font-semibold bg-gray-50/50"
                            required
                          >
                            {COURSES.map(c => (
                              <option key={c.id} value={c.title}>
                                {c.title} ({c.totalHours}h - {c.modality})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Código identificativo</label>
                          <input
                            type="text"
                            name="course_code"
                            value={selCourse.code || formData.course_code}
                            readOnly
                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs sm:text-sm bg-gray-100 font-mono text-gray-700 font-bold cursor-not-allowed"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Centro autorizado</label>
                          <input
                            type="text"
                            name="center"
                            value={formData.center}
                            readOnly
                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs sm:text-sm bg-gray-100 cursor-not-allowed text-gray-600 font-medium"
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

                      {/* Course Commercial Details Snapshot Card (Read-only for Applicant) */}
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 sm:p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-gray-400 block">Modalidad Formativa</span>
                          <span className="font-extrabold text-gray-800">{selCourse.modality || 'Presencial'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-gray-400 block">Duración Total</span>
                          <span className="font-extrabold text-gray-800">{selCourse.totalHours} h ({selCourse.practiceHours}h prácticas)</span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-gray-400 block">Precio Vigente</span>
                          <span className="font-black text-red-600 text-sm">{priceStr}</span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-gray-400 block">Tipo de Inscripción</span>
                          <span className={`inline-block px-2 py-0.5 rounded-md font-extrabold text-[11px] ${isDirect ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-blue-100 text-blue-800 border border-blue-200'}`}>
                            {isDirect ? 'Compra Directa' : 'Con Aprobación'}
                          </span>
                        </div>
                      </div>
                      <p className="text-[11px] text-gray-500 italic">
                        * La información económica y formativa es verificada directamente por el servidor contra los registros oficiales del centro.
                      </p>
                    </div>
                  );
                })()}
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

              {/* SECTION 3: ESTUDIOS Y FORMACIÓN ACADÉMICA */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
                  <GraduationCap className="w-5 h-5 text-red-600" />
                  <h3 className="font-black text-gray-900 text-base sm:text-lg">3. ESTUDIOS Y FORMACIÓN ACADÉMICA</h3>
                </div>

                <div className="space-y-4">
                  {/* CAMPO A - Nivel de estudios finalizados */}
                  <div>
                    <label htmlFor="field-academic-level" className="block text-xs font-bold text-gray-700 mb-1">
                      Nivel de estudios finalizados <span className="text-red-600">*</span>
                    </label>
                    <select
                      id="field-academic-level"
                      name="academic_level"
                      value={formData.academic_level}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-red-500 text-xs sm:text-sm font-semibold bg-gray-50/50"
                      required
                    >
                      <option value="">Selecciona tu nivel de estudios...</option>
                      {ACADEMIC_LEVELS.map(lvl => (
                        <option key={lvl.value} value={lvl.value}>
                          {lvl.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* CAMPO B - Estudios o titulación */}
                  <div>
                    <label htmlFor="field-academic-degree" className="block text-xs font-bold text-gray-700 mb-1">
                      Indica qué estudios has realizado <span className="text-red-600">*</span>
                    </label>
                    <p className="text-[11px] text-gray-500 mb-1.5 leading-relaxed">
                      Escribe el nombre de tus estudios o de la titulación obtenida. Si no tienes estudios finalizados, puedes indicarlo.
                    </p>
                    <input
                      id="field-academic-degree"
                      type="text"
                      name="academic_degree"
                      value={formData.academic_degree}
                      onChange={handleChange}
                      maxLength={255}
                      placeholder="Ej: Técnico en Electromecánica de Vehículos Automóviles, Bachillerato de Ciencias, ESO o Sin titulación"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-red-500 text-xs sm:text-sm"
                      required
                    />
                  </div>

                  {/* CAMPO C - Formación complementaria */}
                  <div>
                    <label htmlFor="field-additional-training" className="block text-xs font-bold text-gray-700 mb-1">
                      Otros cursos o formación complementaria <span className="text-gray-400 font-normal">(Opcional)</span>
                    </label>
                    <textarea
                      id="field-additional-training"
                      name="additional_training"
                      rows={3}
                      maxLength={1500}
                      value={formData.additional_training}
                      onChange={handleChange}
                      placeholder="Indique otros cursos, certificados de profesionalidad o formación complementaria relacionada (opcional)..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 4: SITUACIÓN LABORAL */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
                  <Briefcase className="w-5 h-5 text-red-600" />
                  <h3 className="font-black text-gray-900 text-base sm:text-lg">4. SITUACIÓN LABORAL</h3>
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

              {/* SECTION 5: OBSERVACIONES */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700">5. OBSERVACIONES Y NOTAS</label>
                <textarea
                  name="observations"
                  rows={3}
                  value={formData.observations}
                  onChange={handleChange}
                  placeholder="Indique cualquier detalle o consulta adicional que considere importante para Secretaría..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-red-500"
                />
              </div>

              {/* SECTION 6: DECLARACIONES Y CONSENTIMIENTOS */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
                  <ShieldCheck className="w-5 h-5 text-red-600" />
                  <h3 className="font-black text-gray-900 text-base sm:text-lg">6. DECLARACIONES Y CONSENTIMIENTOS</h3>
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
                      He sido informado/a de las condiciones del programa formativo y de que la admisión definitiva está sujeta a revisión administrativa, disponibilidad de plazas y confirmación por Secretaría.
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

              {/* SECTION 7: CONFIRMACIÓN Y FIRMA DIGITAL */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
                  <PenTool className="w-5 h-5 text-red-600" />
                  <h3 className="font-black text-gray-900 text-base sm:text-lg">7. CONFIRMACIÓN Y FIRMA DEL SOLICITANTE</h3>
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
                  ) : (() => {
                    const selCourse = COURSES.find(c => c.id === formData.course_id || c.title === formData.course_name || c.code === formData.course_code) || COURSES[0];
                    const isDirect = selCourse?.tipo_inscripcion === 'COMPRA_DIRECTA';
                    return (
                      <>
                        <Send className="w-4 h-4" />
                        <span>{isDirect ? 'Matricularme ahora (Compra directa)' : 'Enviar Solicitud de Admisión'}</span>
                      </>
                    );
                  })()}
                </button>
              </div>

            </form>
          )}

        </div>
      </div>
    </div>
  );
};
