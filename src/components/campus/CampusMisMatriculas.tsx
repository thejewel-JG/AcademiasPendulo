import React, { useState, useEffect } from 'react';
import { useCampus } from '../../context/CampusContext';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Upload,
  ArrowRight,
  Download,
  Building2,
  Copy,
  Check,
  Eye,
  ShieldAlert,
  Info,
  Calendar,
  Layers,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

interface EnrollmentRecord {
  id: number | string;
  request_number: string;
  course_id: string;
  course_name: string;
  created_at: string;
  modalidad_inscripcion: string;
  estado_admision: string;
  estado_transferencia: string;
  estado_matricula: string;
  estado_acceso: string;
  estado_legible: string;
  fecha_aprobacion?: string | null;
  precio_final?: string | number | null;
  referencia_transferencia?: string | null;
  pdf_path?: string | null;
  has_receipt: boolean;
  justificante_nombre?: string | null;
  justificante_subido_en?: string | null;
  canConsultRequest: boolean;
  canConsultBankInfo: boolean;
  canUploadReceipt: boolean;
  canAccessCourse: boolean;
}

export const CampusMisMatriculas: React.FC = () => {
  const { currentUser, navigateTo } = useCampus();

  const [enrollments, setEnrollments] = useState<EnrollmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Bank Info Modal
  const [bankModalRecord, setBankModalRecord] = useState<EnrollmentRecord | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Receipt Upload Modal
  const [uploadModalRecord, setUploadModalRecord] = useState<EnrollmentRecord | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchEnrollments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/student/my-enrollments');
      if (!res.ok) {
        throw new Error('No se pudieron obtener las solicitudes y matrículas.');
      }
      const data = await res.json();
      setEnrollments(data.enrollments || []);
    } catch (err: any) {
      setError(err.message || 'Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnrollments();
  }, [currentUser]);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        setUploadMsg({ type: 'error', text: 'El archivo supera el límite de 10 MB.' });
        return;
      }
      setReceiptFile(file);
      setUploadMsg(null);
    }
  };

  const handleUploadReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadModalRecord || !receiptFile) return;

    setUploading(true);
    setUploadMsg(null);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result as string;
        const res = await fetch(`/api/student/my-payments/${uploadModalRecord.id}/receipt`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: receiptFile.name,
            base64Data
          })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Error al subir el justificante.');
        }

        setUploadMsg({ type: 'success', text: data.message });
        setReceiptFile(null);
        setTimeout(() => {
          setUploadModalRecord(null);
          setUploadMsg(null);
          fetchEnrollments();
        }, 2000);
      } catch (err: any) {
        setUploadMsg({ type: 'error', text: err.message || 'Fallo de subida.' });
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(receiptFile);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Matrícula aprobada':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Matrícula aprobada
          </span>
        );
      case 'Transferencia verificada':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-teal-500/10 text-teal-400 border border-teal-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Transferencia verificada
          </span>
        );
      case 'Matrícula pendiente de aprobación':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5" />
            Matrícula pendiente de aprobación
          </span>
        );
      case 'Pago pendiente de comprobación':
      case 'Transferencia comunicada':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Clock className="w-3.5 h-3.5" />
            Pago pendiente de comprobación
          </span>
        );
      case 'Pendiente de transferencia':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5" />
            Pendiente de transferencia
          </span>
        );
      case 'Preaprobada':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Preaprobada
          </span>
        );
      case 'Pendiente de documentación':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-orange-500/10 text-orange-400 border border-orange-500/20">
            <AlertCircle className="w-3.5 h-3.5" />
            Pendiente de documentación
          </span>
        );
      case 'En revisión':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Clock className="w-3.5 h-3.5" />
            En revisión
          </span>
        );
      case 'Matrícula cancelada o rechazada':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-red-500/10 text-red-400 border border-red-500/20">
            <XCircle className="w-3.5 h-3.5" />
            Matrícula cancelada o rechazada
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-zinc-800 text-zinc-300 border border-zinc-700">
            <Clock className="w-3.5 h-3.5" />
            Solicitud recibida
          </span>
        );
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-heading flex items-center gap-3">
          <FileText className="w-7 h-7 text-red-500" />
          Mis Matrículas
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 mt-1">
          Consulta en tiempo real el estado de tus solicitudes, validación de transferencias bancarias y matrículas autorizadas.
        </p>
      </div>

      {/* Info notice about bank transfer process */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-5 flex items-start gap-4 text-xs text-zinc-400">
        <Info className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-zinc-200">
            Procedimiento oficial de matrícula por transferencia bancaria:
          </p>
          <p>
            SOLICITUD → TRANSFERENCIA → VERIFICACIÓN MANUAL → APROBACIÓN ADMINISTRATIVA → ACCESO AL CAMPUS.
          </p>
          <p className="text-[11px] text-zinc-500">
            El acceso al campus se habilita únicamente cuando el personal de Administración aprueba oficialmente la matrícula tras comprobar el ingreso en cuenta.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-zinc-400">
          <div className="inline-block w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs">Cargando tus solicitudes y matrículas...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-red-950/80 border border-red-800 text-red-300 rounded-2xl text-xs flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : enrollments.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 sm:p-12 text-center max-w-lg mx-auto my-8 space-y-4">
          <FileText className="w-12 h-12 text-zinc-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No tienes solicitudes registradas</h3>
          <p className="text-xs text-zinc-400">
            Actualmente no dispones de ninguna solicitud de admisión ni matrícula en curso.
          </p>
          <button
            onClick={() => navigateTo('cursos')}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-md"
          >
            Ver catálogo de cursos
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {enrollments.map((enr) => (
            <div
              key={enr.id}
              className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-5 sm:p-6 transition-all shadow-lg space-y-4"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono font-bold text-red-400 bg-red-950/60 px-2 py-0.5 rounded border border-red-900/40">
                      {enr.request_number}
                    </span>
                    <span className="text-[11px] text-zinc-500">
                      Fecha: {new Date(enr.created_at).toLocaleDateString('es-ES')}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white">{enr.course_name}</h3>
                  <div className="text-xs text-zinc-400 mt-0.5">
                    Modalidad:{' '}
                    <strong className="text-zinc-300">
                      {enr.modalidad_inscripcion === 'COMPRA_DIRECTA' ? 'Inscripción Directa Oficial' : 'Admisión con Aprobación Previa'}
                    </strong>
                  </div>
                </div>

                <div className="flex flex-col items-start md:items-end gap-2">
                  {getStatusBadge(enr.estado_legible)}
                  {enr.fecha_aprobacion && (
                    <span className="text-[11px] text-emerald-400 font-medium">
                      Aprobada el {new Date(enr.fecha_aprobacion).toLocaleDateString('es-ES')}
                    </span>
                  )}
                </div>
              </div>

              {/* Status details bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-zinc-950/60 p-3.5 rounded-xl border border-zinc-800/60">
                <div>
                  <span className="text-zinc-500 block text-[10px] uppercase font-bold">Estado Admisión</span>
                  <span className="text-zinc-200 font-semibold">{enr.estado_admision || 'RECIBIDA'}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px] uppercase font-bold">Estado Transferencia</span>
                  <span className="text-zinc-200 font-semibold">{enr.estado_transferencia || 'PENDIENTE'}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px] uppercase font-bold">Estado Matrícula</span>
                  <span className="text-zinc-200 font-semibold">{enr.estado_matricula || 'PENDIENTE'}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex flex-wrap items-center gap-2">
                  {enr.pdf_path && (
                    <a
                      href={enr.pdf_path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Descargar Resumen PDF
                    </a>
                  )}

                  {enr.canConsultBankInfo && (
                    <button
                      onClick={() => setBankModalRecord(enr)}
                      className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Building2 className="w-3.5 h-3.5 text-amber-400" />
                      Instrucciones de Transferencia
                    </button>
                  )}

                  {enr.canUploadReceipt && (
                    <button
                      onClick={() => setUploadModalRecord(enr)}
                      className="px-3.5 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {enr.has_receipt ? 'Actualizar Justificante' : 'Adjuntar Justificante'}
                    </button>
                  )}
                </div>

                <div>
                  {enr.canAccessCourse ? (
                    <button
                      onClick={() => navigateTo('curso-detalle', enr.course_id)}
                      className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-red-950/50 transition-all"
                    >
                      Acceder al curso <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <span className="text-[11px] text-zinc-500 italic flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> Acceso disponible tras aprobación administrativa
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bank Instructions Modal */}
      {bankModalRecord && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl relative">
            <div className="flex items-start justify-between border-b border-zinc-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-red-500" />
                  Instrucciones de Transferencia Bancaria
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Curso: <strong className="text-white">{bankModalRecord.course_name}</strong>
                </p>
              </div>
              <button
                onClick={() => setBankModalRecord(null)}
                className="text-zinc-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl space-y-3 font-mono">
                <div>
                  <span className="text-zinc-500 text-[10px] block uppercase">Beneficiario</span>
                  <div className="flex items-center justify-between text-white font-bold">
                    <span>ACADEMIAS PÉNDULO S.L.</span>
                    <button
                      onClick={() => copyToClipboard('ACADEMIAS PÉNDULO S.L.', 'titular')}
                      className="text-red-400 hover:text-red-300 text-[11px] flex items-center gap-1"
                    >
                      {copiedField === 'titular' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-zinc-500 text-[10px] block uppercase">Entidad Bancaria</span>
                  <span className="text-zinc-200">CaixaBank (BIC: CAIXESBBXXX)</span>
                </div>

                <div>
                  <span className="text-zinc-500 text-[10px] block uppercase">IBAN</span>
                  <div className="flex items-center justify-between text-white font-bold text-sm tracking-wider">
                    <span>ES91 2100 0418 4502 0005 1332</span>
                    <button
                      onClick={() => copyToClipboard('ES91 2100 0418 4502 0005 1332', 'iban')}
                      className="text-red-400 hover:text-red-300 text-[11px] flex items-center gap-1"
                    >
                      {copiedField === 'iban' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-zinc-500 text-[10px] block uppercase">Importe Exacto</span>
                  <div className="flex items-center justify-between text-emerald-400 font-extrabold text-sm">
                    <span>{bankModalRecord.precio_final ? `${bankModalRecord.precio_final} €` : 'Consultar en Secretaría'}</span>
                    <button
                      onClick={() => copyToClipboard(String(bankModalRecord.precio_final || ''), 'importe')}
                      className="text-red-400 hover:text-red-300 text-[11px] flex items-center gap-1"
                    >
                      {copiedField === 'importe' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                <div className="bg-red-950/40 border border-red-900/50 p-2.5 rounded-lg">
                  <span className="text-red-300 text-[10px] block uppercase font-bold">Concepto Obligatorio</span>
                  <div className="flex items-center justify-between text-white font-extrabold text-sm">
                    <span>{bankModalRecord.referencia_transferencia || bankModalRecord.request_number}</span>
                    <button
                      onClick={() => copyToClipboard(bankModalRecord.referencia_transferencia || bankModalRecord.request_number, 'concepto')}
                      className="text-red-400 hover:text-red-300 text-[11px] flex items-center gap-1"
                    >
                      {copiedField === 'concepto' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-zinc-400 leading-relaxed">
                <strong>Importante:</strong> Es indispensable incluir el <strong className="text-white">Concepto Obligatorio</strong> en tu transferencia para que Administración pueda identificar tu ingreso y aprobar tu matrícula.
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setBankModalRecord(null)}
                className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Receipt Modal */}
      {uploadModalRecord && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl relative">
            <div className="flex items-start justify-between border-b border-zinc-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Upload className="w-5 h-5 text-indigo-400" />
                  Adjuntar Justificante Bancario
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Solicitud: <strong className="text-white">{uploadModalRecord.request_number}</strong>
                </p>
              </div>
              <button
                onClick={() => setUploadModalRecord(null)}
                className="text-zinc-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            {uploadMsg && (
              <div
                className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  uploadMsg.type === 'success'
                    ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300'
                    : 'bg-red-950/80 border border-red-800 text-red-300'
                }`}
              >
                {uploadMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{uploadMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleUploadReceipt} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-400 font-semibold mb-2">
                  Selecciona archivo PDF o imagen (JPG, PNG - máx. 10 MB)
                </label>
                <input
                  type="file"
                  accept=".pdf,image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="w-full text-zinc-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-zinc-800 file:text-white hover:file:bg-zinc-700 cursor-pointer"
                />
              </div>

              {receiptFile && (
                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-[11px] text-zinc-300 flex items-center justify-between">
                  <span className="truncate">{receiptFile.name}</span>
                  <span className="text-zinc-500 font-mono">{(receiptFile.size / 1024).toFixed(1)} KB</span>
                </div>
              )}

              <div className="text-[11px] text-zinc-500">
                Al subir el justificante, el estado de pago cambiará a <strong className="text-zinc-300">Pago pendiente de comprobación</strong> hasta que Administración verifique la transferencia.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setUploadModalRecord(null)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!receiptFile || uploading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold disabled:opacity-50 flex items-center gap-2 shadow-lg"
                >
                  {uploading ? 'Subiendo...' : 'Confirmar Envío'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
