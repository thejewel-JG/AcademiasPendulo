import React, { useState, useEffect } from 'react';
import { useCampus } from '../../context/CampusContext';
import {
  DollarSign,
  Building2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Copy,
  Check,
  Upload,
  FileText,
  ShieldCheck,
  Info,
  Calendar,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';

interface PaymentRecord {
  id: number | string;
  request_number: string;
  course_name: string;
  amount: string | number;
  currency: string;
  referencia_transferencia: string;
  estado_pago: string;
  mensaje_descriptivo: string;
  fecha_solicitud: string;
  fecha_verificacion?: string | null;
  has_receipt: boolean;
  justificante_nombre?: string | null;
  justificante_subido_en?: string | null;
  can_upload_receipt: boolean;
}

interface BankConfig {
  bank_holder: string;
  bank_iban: string;
  bank_bic: string;
  bank_name: string;
}

export const CampusMisPagos: React.FC = () => {
  const { currentUser, navigateTo } = useCampus();

  const [bankConfig, setBankConfig] = useState<BankConfig | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Upload modal
  const [uploadRecord, setUploadRecord] = useState<PaymentRecord | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchPayments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/student/my-payments');
      if (!res.ok) {
        throw new Error('No se pudieron obtener los datos de pagos.');
      }
      const data = await res.json();
      setBankConfig(data.bankConfig || null);
      setPayments(data.payments || []);
    } catch (err: any) {
      setError(err.message || 'Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
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
    if (!uploadRecord || !receiptFile) return;

    setUploading(true);
    setUploadMsg(null);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result as string;
        const res = await fetch(`/api/student/my-payments/${uploadRecord.id}/receipt`, {
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
          setUploadRecord(null);
          setUploadMsg(null);
          fetchPayments();
        }, 2000);
      } catch (err: any) {
        setUploadMsg({ type: 'error', text: err.message || 'Error en la subida.' });
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(receiptFile);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-heading flex items-center gap-3">
          <DollarSign className="w-7 h-7 text-red-500" />
          Mis Pagos y Transferencias
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 mt-1">
          Información bancaria oficial, estado de tus transferencias y gestión de justificantes de pago.
        </p>
      </div>

      {/* Official Bank Account Information Card */}
      {bankConfig && (
        <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-red-600/10 blur-3xl rounded-full pointer-events-none" />

          <div className="relative z-10 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Cuenta Bancaria Oficial para Transferencias</h2>
                  <p className="text-xs text-zinc-400">Exclusivamente mediante transferencia bancaria nacional o SEPA</p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 self-start sm:self-auto">
                Canal Oficial Verificado
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
              <div className="bg-zinc-950/80 border border-zinc-800/80 p-4 rounded-2xl space-y-1">
                <span className="text-zinc-500 text-[10px] uppercase font-bold block">Titular de la cuenta</span>
                <div className="flex items-center justify-between text-white font-bold">
                  <span>{bankConfig.bank_holder}</span>
                  <button
                    onClick={() => copyToClipboard(bankConfig.bank_holder, 'holder')}
                    className="text-red-400 hover:text-red-300 text-[11px]"
                    title="Copiar titular"
                  >
                    {copiedField === 'holder' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="bg-zinc-950/80 border border-zinc-800/80 p-4 rounded-2xl space-y-1 md:col-span-2">
                <span className="text-zinc-500 text-[10px] uppercase font-bold block">
                  IBAN ({bankConfig.bank_name} · BIC: {bankConfig.bank_bic})
                </span>
                <div className="flex items-center justify-between text-white font-extrabold text-sm tracking-wider">
                  <span>{bankConfig.bank_iban}</span>
                  <button
                    onClick={() => copyToClipboard(bankConfig.bank_iban, 'iban')}
                    className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1 font-sans"
                    title="Copiar IBAN"
                  >
                    {copiedField === 'iban' ? (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Copiado
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Copy className="w-3.5 h-3.5" /> Copiar IBAN
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-zinc-400 flex items-center gap-2">
              <Info className="w-4 h-4 text-red-400 shrink-0" />
              <span>
                Para agilizar la comprobación de tu pago, indica como concepto el código único asignado a tu matrícula y adjunta el justificante emitido por tu banco.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Payments List */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 font-heading">
          <Clock className="w-5 h-5 text-red-500" />
          Historial y Estado de Pagos
        </h2>

        {loading ? (
          <div className="p-12 text-center text-zinc-400">
            <div className="inline-block w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs">Consultando registros de pago...</p>
          </div>
        ) : error ? (
          <div className="p-6 bg-red-950/80 border border-red-800 text-red-300 rounded-2xl text-xs flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : payments.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center text-zinc-400 text-xs">
            No tienes pagos ni transferencias pendientes de tramitación.
          </div>
        ) : (
          <div className="space-y-4">
            {payments.map((p) => {
              const isVerified = p.estado_pago === 'TRANSFERENCIA_VERIFICADA';
              const isCommunicated = p.estado_pago === 'TRANSFERENCIA_COMUNICADA';
              const isApproved = p.mensaje_descriptivo.includes('Tu matrícula está aprobada');

              return (
                <div
                  key={p.id}
                  className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-6 transition-all shadow-lg space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-mono font-bold text-red-400 bg-red-950/60 px-2 py-0.5 rounded border border-red-900/40">
                          {p.request_number}
                        </span>
                        <span className="text-[11px] text-zinc-500">
                          Solicitud: {new Date(p.fecha_solicitud).toLocaleDateString('es-ES')}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-white">{p.course_name}</h3>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1">
                      <span className="text-xl font-extrabold text-emerald-400 font-mono">
                        {p.amount} {p.currency}
                      </span>
                      {p.fecha_verificacion && (
                        <span className="text-[10px] text-zinc-500">
                          Verificado: {new Date(p.fecha_verificacion).toLocaleDateString('es-ES')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Mandatory Transfer Concept */}
                  <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="text-zinc-500 text-[10px] uppercase font-bold block">
                        Concepto de Transferencia Único
                      </span>
                      <span className="text-white font-mono font-extrabold text-sm tracking-wide">
                        {p.referencia_transferencia}
                      </span>
                    </div>

                    <button
                      onClick={() => copyToClipboard(p.referencia_transferencia, `ref-${p.id}`)}
                      className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto transition-colors"
                    >
                      {copiedField === `ref-${p.id}` ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" /> Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-red-400" /> Copiar Concepto
                        </>
                      )}
                    </button>
                  </div>

                  {/* Status Box with designated message (Section 3.D) */}
                  <div
                    className={`p-4 rounded-xl border text-xs flex items-start gap-3 ${
                      isApproved
                        ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                        : isVerified
                        ? 'bg-teal-950/40 border-teal-800/60 text-teal-300'
                        : isCommunicated
                        ? 'bg-indigo-950/40 border-indigo-800/60 text-indigo-300'
                        : 'bg-amber-950/40 border-amber-800/60 text-amber-300'
                    }`}
                  >
                    {isApproved || isVerified ? (
                      <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                    ) : (
                      <Clock className="w-5 h-5 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-0.5">
                      <div className="font-bold uppercase tracking-wider text-[10px]">
                        {p.estado_pago.replace(/_/g, ' ')}
                      </div>
                      <p className="leading-relaxed">{p.mensaje_descriptivo}</p>
                    </div>
                  </div>

                  {/* Receipt status & actions */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs">
                    <div>
                      {p.has_receipt ? (
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-400 text-[11px]">
                            Justificante adjuntado: <strong className="text-zinc-200">{p.justificante_nombre}</strong>
                          </span>
                          <a
                            href={`/api/student/my-payments/${p.id}/receipt`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-red-400 hover:text-red-300 text-[11px] font-semibold flex items-center gap-1 underline"
                          >
                            <ExternalLink className="w-3 h-3" /> Ver archivo
                          </a>
                        </div>
                      ) : (
                        <span className="text-zinc-500 text-[11px] italic">
                          Aún no has adjuntado el justificante bancario de esta transferencia.
                        </span>
                      )}
                    </div>

                    {p.can_upload_receipt && (
                      <button
                        onClick={() => setUploadRecord(p)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        {p.has_receipt ? 'Actualizar Justificante' : 'Adjuntar Justificante'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upload Receipt Modal */}
      {uploadRecord && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl relative">
            <div className="flex items-start justify-between border-b border-zinc-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Upload className="w-5 h-5 text-indigo-400" />
                  Subir Justificante Bancario
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Matrícula: <strong className="text-white">{uploadRecord.request_number}</strong>
                </p>
              </div>
              <button
                onClick={() => setUploadRecord(null)}
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
                  Selecciona comprobante en PDF o imagen (JPG, PNG - máx. 10 MB)
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

              <div className="text-[11px] text-zinc-500 leading-relaxed">
                Al subir tu justificante, Administración comprobará la entrada del ingreso en nuestra cuenta y procederá a la aprobación oficial de tu matrícula.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setUploadRecord(null)}
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
