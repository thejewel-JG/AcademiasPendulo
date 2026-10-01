import React, { useState } from 'react';
import { 
  Briefcase, 
  UploadCloud, 
  CheckCircle2, 
  X, 
  Send,
  AlertCircle,
  FileCheck,
  Mail,
  Phone,
  User,
  Sparkles,
  ShieldCheck
} from 'lucide-react';

interface WorkWithUsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WorkWithUsModal: React.FC<WorkWithUsModalProps> = ({ isOpen, onClose }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [position, setPosition] = useState('Docente de Automoción (Mecánica, Híbridos/Eléctricos)');
  const [notes, setNotes] = useState('');
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.odt', '.txt', '.rtf'];
  const MAX_SIZE_MB = 15;

  const validateFile = (file: File): boolean => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setErrorMsg(`Formato de archivo no válido (${ext}). Por favor adjunta un archivo en PDF, DOC, DOCX o RTF.`);
      return false;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setErrorMsg(`El archivo excede el tamaño máximo permitido (${MAX_SIZE_MB} MB).`);
      return false;
    }
    setErrorMsg(null);
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
      }
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
      }
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !phone.trim()) {
      setErrorMsg('Por favor completa todos los campos obligatorios.');
      return;
    }
    if (!selectedFile) {
      setErrorMsg('Por favor adjunta tu currículum vitae (CV).');
      return;
    }
    if (!privacyAccepted) {
      setErrorMsg('Debes aceptar la política de privacidad y protección de datos.');
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const cvBase64 = await fileToBase64(selectedFile);

      const res = await fetch('/api/public/work-with-us', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          position,
          notes: notes.trim(),
          cv_filename: selectedFile.name,
          cv_base64: cvBase64
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al procesar tu candidatura.');
      }

      setSubmitted(true);
    } catch (err: any) {
      console.error('Submit CV error:', err);
      setErrorMsg(err.message || 'Hubo un error al enviar tu currículum. Por favor inténtalo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setPhone('');
    setSelectedFile(null);
    setNotes('');
    setPrivacyAccepted(false);
    setSubmitted(false);
    setErrorMsg(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100 relative max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-950 via-[#8B0000] to-gray-950 p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-600/30 border border-red-400/30 text-white">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg leading-tight">Trabaja con Nosotros</h3>
              <p className="text-xs text-red-200">Envía tu CV al equipo docente y técnico</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {submitted ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-inner">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h4 className="text-xl font-bold text-gray-900">¡Candidatura Registrada con Éxito!</h4>
              <p className="text-sm text-gray-600 max-w-sm mx-auto leading-relaxed">
                Gracias, <strong>{name}</strong>. Tu currículum ha sido entregado a la **Secretaría y Dirección Académica** de Academias Péndulo.
              </p>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 max-w-sm mx-auto">
                📧 Te hemos enviado un correo de confirmación a <strong>{email}</strong>.
              </div>
              <button
                onClick={resetForm}
                className="px-6 py-2.5 bg-gray-950 hover:bg-gray-800 text-white font-semibold text-sm rounded-xl transition-all shadow-md"
              >
                Cerrar Ventana
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5 text-left">
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Nombre y Apellidos *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Carmen García López"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-red-500 focus:bg-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Teléfono Móvil *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="600 000 000"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-red-500 focus:bg-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Email de Contacto *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="correo@ejemplo.com"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-red-500 focus:bg-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Puesto de Interés *</label>
                  <select
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-red-500 focus:bg-white outline-none font-medium text-gray-800"
                  >
                    <option value="Docente de Automoción (Mecánica, Híbridos/Eléctricos)">Docente de Automoción (Mecánica/Híbridos/Eléctricos)</option>
                    <option value="Docente de Chapa y Pintura">Docente de Chapa y Pintura</option>
                    <option value="Docente de Prevención de Riesgos (PRL)">Docente de Prevención de Riesgos (PRL)</option>
                    <option value="Docente de Maquinaria y Carretillas">Docente de Maquinaria y Carretillas</option>
                    <option value="Instructor Práctico de Taller">Instructor Práctico de Taller</option>
                    <option value="Administración / Secretaría Académica">Administración / Secretaría Académica</option>
                    <option value="Otro Perfil Técnico/Docente">Otro Perfil Técnico / Docente</option>
                  </select>
                </div>
              </div>

              {/* Multi-format File dropzone */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Adjuntar Currículum Vitae (CV) * <span className="text-[10px] text-gray-500 font-normal">(PDF, DOC, DOCX - Máx 15MB)</span>
                </label>

                {selectedFile ? (
                  <div className="p-3 bg-red-50/70 border border-red-200 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="w-8 h-8 rounded-lg bg-red-600/10 flex items-center justify-center text-red-600 shrink-0">
                        <FileCheck className="w-5 h-5" />
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-bold text-gray-900 truncate">{selectedFile.name}</p>
                        <p className="text-[10px] text-gray-500">{(selectedFile.size / 1024).toFixed(0)} KB · Listo para enviar</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      className="p-1 text-gray-400 hover:text-red-600 rounded-md transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-xl p-4 text-center transition-all cursor-pointer ${
                      dragActive ? 'border-red-500 bg-red-50/50' : 'border-gray-300 bg-gray-50/50 hover:bg-gray-50 hover:border-gray-400'
                    }`}
                  >
                    <input
                      type="file"
                      id="cv-upload-input"
                      accept=".pdf,.doc,.docx,.odt,.txt,.rtf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <label htmlFor="cv-upload-input" className="cursor-pointer space-y-1 block">
                      <UploadCloud className="w-8 h-8 text-red-500 mx-auto" />
                      <p className="text-xs font-bold text-gray-700">
                        Haz clic para seleccionar tu CV o arrástralo aquí
                      </p>
                      <p className="text-[10px] text-gray-400">PDF, Word o RTF</p>
                    </label>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Carta de Presentación o Experiencia Previa (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Detalla tu experiencia docente, certificaciones técnicas, disponibilidad horaria o motivación..."
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-red-500 focus:bg-white outline-none resize-none"
                />
              </div>

              <div className="flex items-start gap-2 pt-1">
                <input
                  type="checkbox"
                  id="privacy-work-with-us"
                  required
                  checked={privacyAccepted}
                  onChange={(e) => setPrivacyAccepted(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
                />
                <label htmlFor="privacy-work-with-us" className="text-[11px] text-gray-600 leading-tight cursor-pointer">
                  Acepto el tratamiento de mis datos curriculares para los procesos de selección y contratación docente de <strong>Academias Péndulo</strong> según la política de privacidad.
                </label>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-red-950/20 transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Enviando Candidatura y CV...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Enviar Currículum a Secretaría</span>
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
