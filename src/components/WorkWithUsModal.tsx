import React, { useState } from 'react';
import { 
  Briefcase, 
  UploadCloud, 
  CheckCircle2, 
  X, 
  Send,
  AlertCircle,
  FileCheck
} from 'lucide-react';

interface WorkWithUsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WorkWithUsModal: React.FC<WorkWithUsModalProps> = ({ isOpen, onClose }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [position, setPosition] = useState('docente-automocion');
  const [notes, setNotes] = useState('');
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.odt', '.txt', '.rtf'];
  const MAX_SIZE_MB = 10;

  const validateFile = (file: File): boolean => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setErrorMsg(`Formato de archivo no válido (${ext}). Por favor adjunta un archivo en PDF, DOC, DOCX, ODT, TXT o RTF.`);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !phone) {
      setErrorMsg('Por favor completa todos los campos requeridos.');
      return;
    }
    if (!selectedFile) {
      setErrorMsg('Por favor adjunta tu CV.');
      return;
    }
    if (!privacyAccepted) {
      setErrorMsg('Debes aceptar la política de privacidad.');
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
    }, 700);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100 relative max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-900 via-[#8B0000] to-gray-900 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-red-600/30 border border-red-400/30">
              <Briefcase className="w-5 h-5 text-red-300" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Trabaja con Nosotros</h3>
              <p className="text-xs text-red-200">Envía tu CV a Academias Péndulo</p>
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
        <div className="p-5 overflow-y-auto space-y-4">
          {submitted ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-xl font-bold text-gray-900">¡Candidatura Recibida!</h4>
              <p className="text-sm text-gray-600 max-w-xs mx-auto">
                Gracias, <strong>{name}</strong>. Hemos guardado tu CV para los procesos de selección docente y técnico.
              </p>
              <button
                onClick={resetForm}
                className="px-6 py-2.5 bg-gray-900 hover:bg-gray-800 text-white font-semibold text-sm rounded-xl transition-all"
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Nombre completo *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Carmen García"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-red-500 focus:bg-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Teléfono *</label>
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Email *</label>
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
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Puesto de interés</label>
                  <select
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-red-500 focus:bg-white outline-none"
                  >
                    <option value="docente-automocion">Docente de Automoción</option>
                    <option value="docente-prl">Docente de PRL</option>
                    <option value="instructor-taller">Instructor de Taller</option>
                    <option value="otro">Otro Perfil Docente/Técnico</option>
                  </select>
                </div>
              </div>

              {/* Multi-format File dropzone */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Adjuntar CV * <span className="text-[10px] text-gray-500 font-normal">(PDF, DOC, DOCX, ODT, TXT, RTF - Máx 10MB)</span>
                </label>

                {selectedFile ? (
                  <div className="p-3 bg-red-50/60 border border-red-200 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileCheck className="w-5 h-5 text-red-600 shrink-0" />
                      <div className="truncate">
                        <p className="text-xs font-bold text-gray-900 truncate">{selectedFile.name}</p>
                        <p className="text-[10px] text-gray-500">{(selectedFile.size / 1024).toFixed(0)} KB</p>
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
                      accept=".pdf,.doc,.docx,.odt,.txt,.rtf"
                      onChange={handleFileChange}
                      className="hidden"
                      id="cv-upload-modal-file"
                    />
                    <label htmlFor="cv-upload-modal-file" className="cursor-pointer block">
                      <UploadCloud className="w-6 h-6 text-red-500 mx-auto mb-1" />
                      <p className="text-xs font-bold text-gray-700">Arrastra tu CV aquí o <span className="text-red-600 underline">examina</span></p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Formatos: PDF, DOC, DOCX, ODT, TXT, RTF</p>
                    </label>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Comentario breve (Opcional)</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Acreditaciones SEPE, especialidades..."
                  className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-red-500 outline-none"
                />
              </div>

              <div className="flex items-start gap-2 pt-1">
                <input
                  type="checkbox"
                  id="privacy-modal"
                  checked={privacyAccepted}
                  onChange={(e) => setPrivacyAccepted(e.target.checked)}
                  className="mt-0.5 rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <label htmlFor="privacy-modal" className="text-[11px] text-gray-500 leading-tight">
                  Acepto el tratamiento de mis datos de carácter personal para procesos de selección docente.
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow hover:shadow-md transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <span>Enviando candidatura...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Enviar Currículum Vitae</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
