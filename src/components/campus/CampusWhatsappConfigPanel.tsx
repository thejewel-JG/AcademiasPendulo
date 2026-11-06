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
  Power,
  QrCode,
  Bot,
  Send,
  RefreshCw,
  Unplug
} from 'lucide-react';
import {
  DEFAULT_WHATSAPP_TEMPLATE,
  normalizeWhatsappPhone,
  buildWhatsappCourseMessage,
  buildWhatsappUrl,
  notifyWhatsappConfigUpdated,
  formatDynamicCourseName
} from '../../utils/whatsappUtils';
import { WhatsappIcon } from '../WhatsappCourseButton';
import { COURSES } from '../../data/coursesData';

export const DEFAULT_AUTOREPLY_TEMPLATE_FRONTEND = `¡Hola! Gracias por contactar con *Academias Péndulo* (Centro Oficial Homologado Nº 0400030892 en Almería).

Hemos recibido tu solicitud de información sobre el curso:
*{{nombre_curso}}* (Código: {{codigo_curso}})
• *Duración:* {{horas_curso}}
• *Modalidad:* {{modalidad_curso}}
• *Precio:* {{precio_curso}}
• *Estado de matrícula:* {{estado_matricula}}

• *Ficha completa y temario:* {{enlace_curso}}

Un asesor de Secretaría revisará tu consulta y te responderá personalmente en breve para indicarte las próximas fechas e iniciar tu inscripción si lo deseas.
Horario de atención: Lunes a Viernes de 09:00 a 14:00 y de 16:00 a 20:00.`;

interface BotState {
  status: 'DISCONNECTED' | 'CONNECTING' | 'QR_READY' | 'CONNECTED';
  qrDataUrl?: string | null;
  connectedPhone?: string | null;
  connectedName?: string | null;
  lastError?: string | null;
  lastAutoReply?: {
    to: string;
    courseName: string;
    timestamp: string;
  } | null;
}

export const CampusWhatsappConfigPanel: React.FC = () => {
  const [phoneInput, setPhoneInput] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [template, setTemplate] = useState<string>(DEFAULT_WHATSAPP_TEMPLATE);
  const [autoReplyActive, setAutoReplyActive] = useState<boolean>(true);
  const [autoReplyTemplate, setAutoReplyTemplate] = useState<string>(DEFAULT_AUTOREPLY_TEMPLATE_FRONTEND);
  const [updatedBy, setUpdatedBy] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [previewCourseTitle, setPreviewCourseTitle] = useState<string>('Introducción a la Automoción');

  const [botState, setBotState] = useState<BotState>({ status: 'DISCONNECTED' });
  const [botActionLoading, setBotActionLoading] = useState<boolean>(false);

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
        setAutoReplyActive(
          data.whatsapp_autorespuesta_activa !== undefined
            ? Boolean(data.whatsapp_autorespuesta_activa)
            : true
        );
        setAutoReplyTemplate(data.whatsapp_plantilla_respuesta || DEFAULT_AUTOREPLY_TEMPLATE_FRONTEND);
        setUpdatedBy(data.whatsapp_actualizado_por || null);
        setUpdatedAt(data.whatsapp_actualizado_en || null);
        if (data.botState) {
          setBotState(data.botState);
        }
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

  const pollBotStatus = async () => {
    try {
      const res = await fetch('/api/admin/whatsapp-bot/status', {
        headers: { Accept: 'application/json' },
        credentials: 'include'
      });
      if (res.ok) {
        const state = await res.json();
        setBotState(state);
      }
    } catch {}
  };

  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      pollBotStatus();
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const phoneValidation = normalizeWhatsappPhone(phoneInput);
  const isPhoneEmpty = phoneInput.trim() === '';
  const previewMessage = buildWhatsappCourseMessage(previewCourseTitle, template);
  const previewUrl = phoneValidation.valid
    ? buildWhatsappUrl(phoneValidation.normalized, previewCourseTitle, template)
    : null;

  // Build simulated auto-reply preview for selected course
  const matchedPreviewCourse =
    COURSES.find(
      (c) =>
        formatDynamicCourseName(c.title).toLowerCase() ===
        formatDynamicCourseName(previewCourseTitle).toLowerCase()
    ) || COURSES[1];

  const previewAutoReplyMessage = autoReplyTemplate
    .replace(/\{\{\s*nombre_curso\s*\}\}/gi, formatDynamicCourseName(matchedPreviewCourse?.title || previewCourseTitle))
    .replace(/\{\{\s*codigo_curso\s*\}\}/gi, matchedPreviewCourse?.code || 'TMVG0002')
    .replace(
      /\{\{\s*horas_curso\s*\}\}/gi,
      matchedPreviewCourse?.totalHours ? `${matchedPreviewCourse.totalHours} horas` : '40 horas'
    )
    .replace(/\{\{\s*modalidad_curso\s*\}\}/gi, matchedPreviewCourse?.modality || 'Presencial en Almería')
    .replace(/\{\{\s*precio_curso\s*\}\}/gi, 'Consultar condiciones / Subvencionable')
    .replace(
      /\{\{\s*estado_matricula\s*\}\}/gi,
      matchedPreviewCourse?.estado_disponibilidad === 'ABIERTA'
        ? 'Matrícula Abierta (Plazas disponibles)'
        : 'Próxima convocatoria — Lista de reserva prioritaria abierta'
    )
    .replace(
      /\{\{\s*enlace_curso\s*\}\}/gi,
      `https://penduloformacion.com/cursos/${matchedPreviewCourse?.slug || 'introduccion-a-la-automocion'}`
    );

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
          whatsapp_plantilla: template,
          whatsapp_autorespuesta_activa: autoReplyActive,
          whatsapp_plantilla_respuesta: autoReplyTemplate
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const cfg = data.config;
        setPhoneInput(cfg.whatsapp_numero || '');
        setIsActive(Boolean(cfg.whatsapp_activo));
        setTemplate(cfg.whatsapp_plantilla || DEFAULT_WHATSAPP_TEMPLATE);
        setAutoReplyActive(Boolean(cfg.whatsapp_autorespuesta_activa));
        setAutoReplyTemplate(cfg.whatsapp_plantilla_respuesta || DEFAULT_AUTOREPLY_TEMPLATE_FRONTEND);
        setUpdatedBy(cfg.whatsapp_actualizado_por || null);
        setUpdatedAt(cfg.whatsapp_actualizado_en || null);
        notifyWhatsappConfigUpdated(cfg);
        setFeedback({
          type: 'success',
          text: 'Configuración de WhatsApp y respuesta automática guardada correctamente.'
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

  const handleConnectBot = async () => {
    setBotActionLoading(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/whatsapp-bot/connect', {
        method: 'POST',
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok) {
        setBotState(data);
      } else {
        setFeedback({ type: 'error', text: data.error || 'Error al iniciar la vinculación QR.' });
      }
    } catch {
      setFeedback({ type: 'error', text: 'Error de conexión al generar el código QR.' });
    } finally {
      setBotActionLoading(false);
    }
  };

  const handleDisconnectBot = async () => {
    setBotActionLoading(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/whatsapp-bot/disconnect', {
        method: 'POST',
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok) {
        setBotState(data);
        setFeedback({ type: 'success', text: 'Sesión de respuesta automática desvinculada correctamente.' });
      }
    } catch {
      setFeedback({ type: 'error', text: 'Error al desvincular el dispositivo.' });
    } finally {
      setBotActionLoading(false);
    }
  };

  const handleSendTestAutoReply = async () => {
    setBotActionLoading(true);
    setFeedback(null);
    try {
      const targetPhone = phoneValidation.valid ? phoneValidation.normalized : botState.connectedPhone;
      const res = await fetch('/api/admin/whatsapp-bot/test-autoreply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          phone: targetPhone,
          course: previewCourseTitle
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({
          type: 'success',
          text: `Respuesta automática del curso "${data.courseName}" enviada en vivo por WhatsApp al número +${data.to}.`
        });
        pollBotStatus();
      } else {
        setFeedback({
          type: 'error',
          text: data.error || 'No se pudo enviar la respuesta automática de prueba.'
        });
      }
    } catch {
      setFeedback({ type: 'error', text: 'Error al enviar el mensaje automático de prueba.' });
    } finally {
      setBotActionLoading(false);
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
              WHATSAPP DE ATENCIÓN AL ALUMNO Y RESPUESTA AUTOMÁTICA
            </h2>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              Gestiona el número oficial, la plantilla de consulta del alumno y el bot de respuesta automática inteligente por curso vinculado mediante código QR.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-end md:self-center">
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
              ? `Enlace Activo (+${phoneValidation.normalized})`
              : 'Pendiente / Desactivado'}
          </span>

          <span
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border flex items-center gap-1.5 ${
              botState.status === 'CONNECTED'
                ? 'bg-emerald-950/70 border-emerald-600 text-emerald-300'
                : botState.status === 'QR_READY'
                ? 'bg-blue-950/70 border-blue-600 text-blue-300'
                : 'bg-zinc-800 border-zinc-700 text-zinc-400'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            {botState.status === 'CONNECTED'
              ? `Auto-Respuesta Conectada (+${botState.connectedPhone || ''})`
              : botState.status === 'QR_READY'
              ? 'QR Listo para Escanear'
              : 'Bot Desconectado'}
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
              Mientras las consultas por WhatsApp no estén activas con un número válido, los botones &quot;Solicitar información&quot; de la web conservarán automáticamente el método de contacto alternativo.
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

      {/* SECTION 3: QR BOT CONNECTION & INTELLIGENT AUTO-RESPONDER */}
      <div className="bg-zinc-900 border-2 border-emerald-800/50 rounded-2xl p-6 space-y-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-700/60 flex items-center justify-center text-emerald-400 shrink-0">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-white uppercase tracking-wider">
                Vincular WhatsApp por QR — Respuesta Automática Inteligente por Curso
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Escanea el código QR desde tu móvil para que cuando un alumno envíe una solicitud de información sobre cualquiera de los 33 cursos, reciba al instante la ficha técnica real de ese curso.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setAutoReplyActive(!autoReplyActive)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-2 ${
                autoReplyActive
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>{autoReplyActive ? 'Auto-Respuesta Activa' : 'Auto-Respuesta Pausada'}</span>
            </button>

            {botState.status === 'CONNECTED' ? (
              <button
                type="button"
                onClick={handleDisconnectBot}
                disabled={botActionLoading}
                className="px-3.5 py-2 rounded-xl bg-red-950/70 hover:bg-red-900 text-red-200 border border-red-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Unplug className="w-3.5 h-3.5" />
                <span>Desvincular</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConnectBot}
                disabled={botActionLoading}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${botActionLoading ? 'animate-spin' : ''}`} />
                <span>{botState.status === 'QR_READY' ? 'Actualizar QR' : 'Generar Código QR'}</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* QR Box or Connected Card */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center p-5 rounded-2xl bg-zinc-950 border border-zinc-800 min-h-[260px] text-center">
            {botState.status === 'CONNECTED' ? (
              <div className="space-y-3">
                <div className="w-14 h-14 rounded-full bg-emerald-950 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700 text-[11px] font-bold">
                    Dispositivo Vinculado y Escuchando
                  </span>
                  <h4 className="text-base font-black text-white mt-2">
                    +{botState.connectedPhone} ({botState.connectedName})
                  </h4>
                  <p className="text-xs text-zinc-400 mt-1">
                    Cuando un alumno pulse &quot;Solicitar información&quot; y envíe su consulta, recibirá automáticamente los datos oficiales del curso.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSendTestAutoReply}
                  disabled={botActionLoading}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold inline-flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Enviar Respuesta Automática de Prueba Ahora</span>
                </button>

                {botState.lastAutoReply && (
                  <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300">
                    Última respuesta enviada a <strong>+{botState.lastAutoReply.to}</strong> ({botState.lastAutoReply.courseName})
                  </div>
                )}
              </div>
            ) : botState.status === 'QR_READY' && botState.qrDataUrl ? (
              <div className="space-y-3">
                <div className="bg-white p-3 rounded-2xl inline-block shadow-lg">
                  <img
                    src={botState.qrDataUrl}
                    alt="Código QR de vinculación de WhatsApp"
                    className="w-52 h-52 object-contain"
                  />
                </div>
                <p className="text-xs text-emerald-300 font-bold">
                  1. Abre WhatsApp en tu teléfono ({phoneInput || '633 977 320'})<br />
                  2. Toca Menú / Ajustes → Dispositivos vinculados → Vincular un dispositivo<br />
                  3. Escanea este código QR
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-w-xs">
                <QrCode className="w-12 h-12 text-zinc-600 mx-auto" />
                <p className="text-xs text-zinc-400">
                  {botState.status === 'CONNECTING'
                    ? 'Generando código QR seguro de WhatsApp Multi-Dispositivo...'
                    : 'Pulsa en "Generar Código QR" para vincular el WhatsApp de la academia y activar la respuesta automática inteligente por curso.'}
                </p>
              </div>
            )}
          </div>

          {/* Auto-Reply Template Editor */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-extrabold text-white uppercase tracking-wider">
                Plantilla de Respuesta Automática al Alumno (Datos Reales del Curso)
              </label>
              <button
                type="button"
                onClick={() => setAutoReplyTemplate(DEFAULT_AUTOREPLY_TEMPLATE_FRONTEND)}
                className="text-[11px] text-emerald-400 hover:underline font-bold cursor-pointer"
              >
                Restaurar respuesta automática predeterminada
              </button>
            </div>
            <p className="text-[11px] text-zinc-400">
              Variables automáticas del curso consultado:{' '}
              <code className="text-emerald-400 font-mono">{"{{nombre_curso}}"}</code>,{' '}
              <code className="text-emerald-400 font-mono">{"{{codigo_curso}}"}</code>,{' '}
              <code className="text-emerald-400 font-mono">{"{{horas_curso}}"}</code>,{' '}
              <code className="text-emerald-400 font-mono">{"{{modalidad_curso}}"}</code>,{' '}
              <code className="text-emerald-400 font-mono">{"{{precio_curso}}"}</code>,{' '}
              <code className="text-emerald-400 font-mono">{"{{estado_matricula}}"}</code>,{' '}
              <code className="text-emerald-400 font-mono">{"{{enlace_curso}}"}</code>
            </p>
            <textarea
              rows={7}
              value={autoReplyTemplate}
              onChange={(e) => setAutoReplyTemplate(e.target.value)}
              className="w-full p-3.5 bg-zinc-950 border border-zinc-700 rounded-xl text-xs text-white font-mono leading-relaxed focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      </div>

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
                  placeholder="Ej: 34633977320"
                  className="w-full px-4 py-3 bg-zinc-950 border border-zinc-700 rounded-xl text-sm font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px]">
                <span className="text-zinc-400">
                  Para España, el número comenzará por <strong className="text-white">34</strong> seguido de los 9 dígitos.
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

          {/* 2. Plantilla de Mensaje del Alumno */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                  2. PLANTILLA DE MENSAJE (SOLICITUD DEL ALUMNO)
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
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="submit"
                id="btn-save-whatsapp-config"
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer shadow-md"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Guardando...' : 'Guardar Todo'}</span>
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

        {/* Right Column: Live Message Preview (Both Student Inquiry & Bot Auto-Reply) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
              <Eye className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                Simulación en Vivo de la Conversación
              </h3>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-zinc-400">
                Curso seleccionado para la simulación:
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

            {/* Simulated WhatsApp Conversation (Student Message + Bot Auto-Reply) */}
            <div className="p-4 rounded-2xl bg-[#0b141a] border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between text-[11px] text-zinc-400 border-b border-zinc-800 pb-2">
                <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <WhatsappIcon className="w-3.5 h-3.5" />
                  Academias Péndulo ({phoneValidation.valid ? `+${phoneValidation.normalized}` : 'Sin número'})
                </span>
                <span>Flujo Completo</span>
              </div>

              {/* 1. Student Inquiry Bubble */}
              <div className="space-y-1">
                <span className="text-[10px] text-zinc-400 font-bold block text-right">
                  1. Mensaje que envía el alumno al pulsar &quot;Solicitar información&quot;:
                </span>
                <div
                  id="whatsapp-live-preview-text"
                  className="p-3 rounded-2xl rounded-tr-xs bg-[#005c4b] text-white text-xs leading-relaxed shadow-xs break-words ml-6"
                >
                  {previewMessage}
                </div>
              </div>

              {/* 2. Bot Automatic Reply Bubble */}
              {autoReplyActive && (
                <div className="space-y-1 pt-1">
                  <span className="text-[10px] text-emerald-400 font-bold block">
                    2. Respuesta automática instantánea que recibe el alumno (2 seg después):
                  </span>
                  <div className="p-3 rounded-2xl rounded-tl-xs bg-[#202c33] text-zinc-100 text-xs leading-relaxed shadow-xs whitespace-pre-line break-words mr-6 border border-zinc-700/60">
                    {previewAutoReplyMessage}
                  </div>
                </div>
              )}
            </div>

            {updatedBy && (
              <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80 text-[11px] text-zinc-400">
                <div className="flex items-center gap-1.5 text-zinc-300 font-bold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Última modificación por {updatedBy}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};
