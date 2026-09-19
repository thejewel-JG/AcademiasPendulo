import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, X, AlertCircle } from 'lucide-react';

interface PdfFileUploaderProps {
  onFileSelected: (data: { name: string; sizeStr: string; url: string; file: File }) => void;
  onFileRemoved?: () => void;
  selectedFileName?: string;
  selectedFileSize?: string;
  label?: string;
  className?: string;
}

export const PdfFileUploader: React.FC<PdfFileUploaderProps> = ({
  onFileSelected,
  onFileRemoved,
  selectedFileName,
  selectedFileSize,
  label = 'Adjuntar documento PDF desde PC',
  className = '',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const processFile = (file: File) => {
    setErrorMessage(null);

    // Validate type or extension
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      setErrorMessage('Formato no permitido. Por favor, selecciona o arrastra únicamente archivos PDF.');
      return;
    }

    const sizeStr = formatFileSize(file.size);

    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      onFileSelected({
        name: file.name,
        sizeStr,
        url,
        file,
      });
    };
    reader.onerror = () => {
      setErrorMessage('Error al leer el archivo desde el equipo.');
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      processFile(file);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const handleRemove = () => {
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (onFileRemoved) {
      onFileRemoved();
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && <label className="block text-xs font-semibold text-zinc-300">{label}</label>}

      {selectedFileName ? (
        <div className="flex items-center justify-between p-3.5 bg-red-950/20 border border-red-500/40 rounded-xl">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-lg bg-red-600/20 border border-red-500/40 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-red-400" />
            </div>
            <div className="truncate">
              <div className="text-xs font-bold text-white truncate">{selectedFileName}</div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                  <CheckCircle2 className="w-3 h-3 inline mr-1" /> PDF Cargado
                </span>
                {selectedFileSize && (
                  <span className="text-[10px] text-zinc-400 font-mono">{selectedFileSize}</span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRemove}
            className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors shrink-0"
            title="Eliminar archivo"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-red-500 bg-red-950/30 scale-[1.01]'
              : 'border-zinc-700 hover:border-red-500/50 bg-zinc-950/60 hover:bg-zinc-900/80'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            onChange={handleInputChange}
            className="hidden"
          />

          <div className="flex flex-col items-center justify-center gap-2">
            <div className="w-10 h-10 rounded-full bg-red-600/10 border border-red-500/30 flex items-center justify-center text-red-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">
                Arrastra tu PDF aquí o <span className="text-red-400 underline">haz clic para examinar</span>
              </p>
              <p className="text-[10px] text-zinc-400 mt-0.5">
                Admite archivos .PDF desde tu ordenador (Manuales, Ejercicios, Esquemas, etc.)
              </p>
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 text-[11px] text-red-400 font-semibold bg-red-950/40 border border-red-800/60 p-2.5 rounded-lg">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
