import React, { useState, useEffect } from 'react';
import {
  Save,
  RotateCcw,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Eye,
  Phone,
  Power
} from 'lucide-react';
import {
  DEFAULT_WHATSAPP_TEMPLATE,
  normalizeWhatsappPhone,
  buildWhatsappCourseMessage,
  buildWhatsappUrl,
  notifyWhatsappConfigUpdated
} from '../../utils/whatsappUtils';
import { WhatsappIcon } from '../WhatsappCourseButton';
import { COURSES } from '../../data/coursesData';

export const CampusWhatsappConfigPanel: React.FC = () => {
  const [phoneInput, setPhoneInput] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [template, setTemplate] = useState<string>(DEFAULT_WHATSAPP_TEMPLATE);
  const [updatedBy, setUpdatedBy] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [previewCourseTitle, setPreviewCourseTitle] = useState<string>('Introducción a la Automoción');

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadConfig = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/whatsapp-config', {
        headers: { Accept: 'application/json' },
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setPhoneInput(data.whatsapp_numero || '');
        setIsActive(Boolean(data.whatsapp_activo));
        setTemplate(data.whatsapp_plantilla || DEFAULT_WHATSAPP_TEMPLATE);
        setUpdatedBy(data.whatsapp_actualizado_por || null);
        setUpdatedAt(data.whatsapp_actualizado_en || null);
      } else {
        const err = await res.json().catch(() => ({}));
        setFeedback({
          type: 'error',
          text: err.error || 'No se pudo cargar la configuración de WhatsApp.'
        });
      }
    } catch (error) {
      console.error('Error loading WhatsApp config:', error);
      setFeedback({
        type: 'error',
        text: 'Error de conexión al consultar la configuración de WhatsApp.'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const phoneValidation = normalizeWhatsappPhone(phoneInput);
  const isPhoneEmpty = phoneInput.trim() === '';
  const previewMessage = buildWhatsappCourseMessage(previewCourseTitle, template);
  const previewUrl = phoneValidation.valid
    ? buildWhatsappUrl(phoneValidation.normalized, previewCourseTitle, template)
    : null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (phoneInput.trim() !== '' && !phoneValidation.valid) {
      setFeedback({
        type: 'error',
        text: phoneValidation.error || 'El formato del número de WhatsApp no es válido.'
      });
      return;
    }

    if (phoneInput.trim() === '' && isActive) {
      setFeedback({
        type: 'error',
        text: 'Introduce un número de WhatsApp válido en formato internacional (ej. 34620351622) o desactiva las consultas por WhatsApp.'
      });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/whatsapp-config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          whatsapp_numero: phoneValidation.valid ? phoneValidation.normalized : phoneInput.trim(),
          whatsapp_activo: isActive,
          whatsapp_plantilla: template
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const cfg = data.config;
        setPhoneInput(cfg.whatsapp_numero || '');
        setIsActive(Boolean(cfg.whatsapp_activo));
        setTemplate(cfg.whatsapp_plantilla || DEFAULT_WHATSAPP_TEMPLATE);
        setUpdatedBy(cfg.whatsapp_actualizado_por || null);
        setUpdatedAt(cfg.whatsapp_actualizado_en || null);
        notifyWhatsappConfigUpdated(cfg);
        setFeedback({
          type: 'success',
          text: 'Configuración de WhatsApp guardada correctamente. Todos los botones públicos han sido actualizados.'
        });
      } else {
        setFeedback({
          type: 'error',
          text: data.error || 'Error al guardar la configuración de WhatsApp.'
        });
      }
    } catch (error) {
      console.error('Error saving WhatsApp config:', error);
      setFeedback({
        type: 'error',
        text: 'Error de red al guardar los cambios.'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRestoreDefaultTemplate = () => {
    setTemplate(DEFAULT_WHATSAPP_TEMPLATE);
    setFeedback({
      type: 'success',
      text: 'Plantilla predeterminada restaurada en el editor. Pulsa "Guardar" para aplicar el cambio.'
    });
  };

  const handleTestWhatsapp = () => {
    if (!phoneValidation.valid || !previewUrl) {
      setFeedback({
        type: 'error',
        text: 'Introduce un número de WhatsApp válido antes de probar el enlace.'
      });
      return;
    }
    window.open(previewUrl, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center text-zinc-400 text-sm">
        Cargando configuración de WhatsApp de Atención al Alumno...
      </div>
    );
  }

  return (
    <div className="space-y-6" id="admin-whatsapp-config-panel">
      {/* Header Banner */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-950/80 border border-emerald-700/50 flex items-center justify-center text-[#25D366] shrink-0">
            <WhatsappIcon className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 block">
              CONFIGURACIÓN → WHATSAPP
            </span>
            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
              WHATSAPP DE ATENCIÓN AL ALUMNO
            </h2>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              Gestiona el número oficial de WhatsApp Business y la plantilla personalizada para todos los botones públicos &quot;Solicitar información&quot; del catálogo, fichas y tarjetas de cursos.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end md:self-center">
          <span
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border flex items-center gap-1.5 ${
              isActive && phoneValidation.valid
                ? 'bg-emerald-950/70 border-emerald-700 text-emerald-300'
                : 'bg-amber-950/70 border-amber-700 text-amber-300'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isActive && phoneValidation.valid ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            {isActive && phoneValidation.valid
              ? `Activo (${phoneValidation.normalized})`
              : !isActive
              ? 'Consultas WhatsApp Desactivadas'
              : 'Pendiente de Configurar Número'}
          </span>
        </div>
      </div>

      {/* Warning Notice when not configured or inactive */}
      {(!phoneValidation.valid || !isActive) && (
        <div className="bg-amber-950/40 border border-amber-700/60 rounded-2xl p-4 flex items-start gap-3 text-amber-200 text-xs">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-amber-300">
              {!phoneValidation.valid
                ? 'Atención Administración: El número de WhatsApp no está configurado o tiene un formato no válido.'
                : 'Las consultas por WhatsApp se encuentran desactivadas.'}
            </p>
            <p className="text-amber-200/80">
              Mientras las consultas por WhatsApp no estén activas con un número válido, los botones &quot;Solicitar información&quot; de la web conservarán automáticamente el método de contacto alternativo (formulario oficial de consulta a Secretaría).
            </p>
          </div>
        </div>
      )}

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border flex items-center gap-3 text-xs font-bold ${
            feedback.type === 'success'
              ? 'bg-emerald-950/50 border-emerald-700 text-emerald-200'
              : 'bg-red-950/50 border-red-700 text-red-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Number & Active State + Template Editor */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Número y Estado */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                  1. Número Oficial y Estado del Servicio
                </h3>
              </div>

              {/* Active/Inactive Switch */}
              <button
                type="button"
                id="btn-toggle-whatsapp-active"
                onClick={() => setIsActive(!isActive)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-2 ${
                  isActive
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                }`}
              >
                <Power className="w-3.5 h-3.5" />
                <span>{isActive ? 'Consultas Activas' : 'Consultas Desactivadas'}</span>
              </button>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="input-whatsapp-numero"
                className="block text-xs font-bold text-zinc-300"
              >
                Número de WhatsApp de la Academia (Formato Internacional)
              </label>
              <div className="relative">
                <input
                  id="input-whatsapp-numero"
                  type="text"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="Ej: 34620351622"
                  className="w-full px-4 py-3 bg-zinc-950 border border-zinc-700 rounded-xl text-sm font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Format Validation Indicator */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px]">
                <span className="text-zinc-400">
                  Para España, el número comenzará por <strong className="text-white">34</strong> seguido de los 9 dígitos (sin +, espacios ni guiones).
                </span>
                {!isPhoneEmpty && (
                  <span
                    className={`font-mono font-bold ${
                      phoneValidation.valid ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {phoneValidation.valid
                      ? `Formato válido normalizado: ${phoneValidation.normalized}`
                      : phoneValidation.error || 'Formato no válido'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 2. Plantilla de Mensaje */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                  2. PLANTILLA DE MENSAJE
                </h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Utiliza la variable <code className="px-1.5 py-0.5 rounded bg-zinc-800 text-emerald-400 font-mono">{"{{nombre_curso}}"}</code> para insertar automáticamente el nombre real del curso.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTemplate((prev) => `${prev} {{nombre_curso}}`.trim())}
                className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-emerald-400 text-xs font-mono font-bold border border-zinc-700 cursor-pointer shrink-0"
              >
                + Insertar {"{{nombre_curso}}"}
              </button>
            </div>

            <div className="space-y-2">
              <textarea
                id="textarea-whatsapp-plantilla"
                rows={4}
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                placeholder={DEFAULT_WHATSAPP_TEMPLATE}
                className="w-full p-3.5 bg-zinc-950 border border-zinc-700 rounded-xl text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 leading-relaxed"
              />
              <div className="flex items-center justify-between text-[11px] text-zinc-400">
                <span>
                  {template.includes('{{nombre_curso}}')
                    ? 'La variable {{nombre_curso}} está presente y se reemplazará dinámicamente.'
                    : 'Aviso: Si no incluyes {{nombre_curso}}, el nombre del curso se añadirá automáticamente al final.'}
                </span>
                <span>{template.length}/1000 caracteres</span>
              </div>
            </div>

            {/* Action Buttons: Guardar, Restaurar mensaje predeterminado, Probar WhatsApp */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="submit"
                id="btn-save-whatsapp-config"
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer shadow-md"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Guardando...' : 'Guardar'}</span>
              </button>

              <button
                type="button"
                id="btn-restore-whatsapp-template"
                onClick={handleRestoreDefaultTemplate}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold flex items-center gap-2 border border-zinc-700 transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restaurar mensaje predeterminado</span>
              </button>

              <button
                type="button"
                id="btn-test-whatsapp"
                onClick={handleTestWhatsapp}
                className="px-4 py-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-[#25D366] text-xs font-bold flex items-center gap-2 border border-emerald-700/60 transition-all cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Probar WhatsApp</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Live Message Preview & Security Info */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
              <Eye className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                Vista Previa del Mensaje
              </h3>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-zinc-400">
                Curso de prueba para la simulación:
              </label>
              <select
                id="select-preview-course"
                value={previewCourseTitle}
                onChange={(e) => setPreviewCourseTitle(e.target.value)}
                className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="Introducción a la Automoción">
                  Ejemplo 1: Introducción a la Automoción
                </option>
                <option value="Básico de Prevención de Riesgos Laborales">
                  Ejemplo 2: Básico de Prevención de Riesgos Laborales
                </option>
                {COURSES.map((c) => (
                  <option key={c.id} value={c.title}>
                    [{c.code}] {c.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Simulated WhatsApp Chat Bubble */}
            <div className="p-4 rounded-2xl bg-[#0b141a] border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between text-[11px] text-zinc-400 border-b border-zinc-800 pb-2">
                <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <WhatsappIcon className="w-3.5 h-3.5" />
                  Academias Péndulo ({phoneValidation.valid ? `+${phoneValidation.normalized}` : 'Sin número'})
                </span>
                <span>Click to Chat Oficial</span>
              </div>
              <div
                id="whatsapp-live-preview-text"
                className="p-3.5 rounded-2xl rounded-tr-xs bg-[#005c4b] text-white text-xs leading-relaxed shadow-xs break-words"
              >
                {previewMessage}
              </div>
            </div>

            {/* Generated Official wa.me URL */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-zinc-400 block">
                Enlace oficial generado (wa.me):
              </span>
              <div
                id="whatsapp-live-preview-url"
                className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 font-mono text-[11px] text-emerald-400 break-all"
              >
                {previewUrl || 'Introduce un número válido para generar el enlace https://wa.me/...'}
              </div>
            </div>

            {/* Audit & Security Footer */}
            <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 space-y-1.5 text-[11px] text-zinc-400">
              <div className="flex items-center gap-1.5 text-zinc-300 font-bold">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Seguridad y Auditoría</span>
              </div>
              <p>
                El enlace utiliza exclusivamente el dominio oficial <code className="text-zinc-200">https://wa.me/</code> sin exponer datos privados ni crear pedidos automáticos.
              </p>
              {updatedBy && (
                <p className="text-zinc-500 pt-1 border-t border-zinc-800/80">
                  Última modificación por <strong className="text-zinc-300">{updatedBy}</strong>
                  {updatedAt ? ` el ${new Date(updatedAt).toLocaleString('es-ES')}` : ''}
                </p>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
