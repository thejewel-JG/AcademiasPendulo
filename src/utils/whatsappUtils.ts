import { useState, useEffect, useCallback } from 'react';

export const DEFAULT_WHATSAPP_TEMPLATE =
  'Hola, buenas. Estoy interesado/a en el curso de {{nombre_curso}} de Academias Péndulo. Me gustaría recibir información sobre el precio, las próximas fechas y cómo puedo apuntarme. ¡Gracias!';

export interface WhatsappConfig {
  whatsapp_numero: string;
  whatsapp_activo: boolean;
  whatsapp_plantilla: string;
  default_template: string;
  configured: boolean;
  whatsapp_actualizado_por?: string | null;
  whatsapp_actualizado_en?: string | null;
  aviso_sin_configurar?: string | null;
}

const LOWERCASE_WORDS = new Set([
  'a', 'al', 'con', 'de', 'del', 'e', 'el', 'en', 'la', 'las', 'lo', 'los', 'o', 'para', 'por', 'sin', 'sobre', 'u', 'un', 'una', 'unas', 'unos', 'y'
]);

const UPPERCASE_ACRONYMS = new Set([
  'ADAS', 'ITV', 'PRL', 'VMP', 'OBD', 'HEV', 'PHEV', 'BEV', 'CAN', 'ABS', 'ESP', 'BMS', '2T', '4T', '3D'
]);

/**
 * Normalizes a phone number into international digits-only format (e.g. 34620351622).
 * Does not include +, spaces, or dashes.
 */
export function normalizeWhatsappPhone(rawInput: string | null | undefined): {
  valid: boolean;
  normalized: string;
  error?: string;
} {
  if (rawInput === null || rawInput === undefined) {
    return { valid: false, normalized: '' };
  }
  const str = String(rawInput).trim();
  if (!str) {
    return { valid: false, normalized: '' };
  }

  let cleaned = str.replace(/[\s\-\.\(\)]+/g, '');
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.slice(1);
  } else if (cleaned.startsWith('00')) {
    cleaned = cleaned.slice(2);
  }

  if (!/^\d+$/.test(cleaned)) {
    return {
      valid: false,
      normalized: '',
      error: 'El número solo puede contener dígitos numéricos.'
    };
  }

  // Automatic 34 prefix for 9-digit Spanish numbers
  if (cleaned.length === 9 && /^[6789]\d{8}$/.test(cleaned)) {
    cleaned = '34' + cleaned;
  }

  if (cleaned.startsWith('34')) {
    if (!/^34[6789]\d{8}$/.test(cleaned)) {
      return {
        valid: false,
        normalized: '',
        error: 'Para España (34), el número debe tener 11 dígitos (34 seguido de 9 dígitos comenzando por 6, 7, 8 o 9).'
      };
    }
  } else if (cleaned.length < 10 || cleaned.length > 15) {
    return {
      valid: false,
      normalized: '',
      error: 'El número en formato internacional debe contener entre 10 y 15 dígitos.'
    };
  }

  return { valid: true, normalized: cleaned };
}

/**
 * Formats a course title dynamically from real course data.
 * Converts ALL-CAPS database titles (e.g. "INTRODUCCIÓN A LA AUTOMOCIÓN")
 * into natural Spanish title case ("Introducción a la Automoción") while preserving acronyms.
 */
export function formatDynamicCourseName(rawTitle: string): string {
  const trimmed = String(rawTitle || '').trim();
  if (!trimmed) return '';

  // If the title is already mixed-case, keep its exact casing
  if (trimmed !== trimmed.toUpperCase()) {
    return trimmed;
  }

  const words = trimmed.split(/\s+/);
  return words
    .map((word, index) => {
      // Preserve parenthesized or hyphenated tokens carefully
      const cleanUpper = word.replace(/[^A-ZÁÉÍÓÚÜÑ0-9]/gi, '').toUpperCase();
      if (UPPERCASE_ACRONYMS.has(cleanUpper)) {
        return word.toUpperCase();
      }
      const lower = word.toLocaleLowerCase('es-ES');
      if (index > 0 && LOWERCASE_WORDS.has(lower)) {
        return lower;
      }
      return lower.charAt(0).toLocaleUpperCase('es-ES') + lower.slice(1);
    })
    .join(' ');
}

/**
 * Generates the personalized WhatsApp message for a given course using the configured template.
 */
export function buildWhatsappCourseMessage(
  courseOrTitle: { title?: string; titulo?: string; slug?: string } | string,
  template?: string | null
): string {
  const rawName =
    typeof courseOrTitle === 'string'
      ? courseOrTitle
      : courseOrTitle?.title || courseOrTitle?.titulo || '';

  const courseName = formatDynamicCourseName(rawName);
  const activeTemplate =
    template && String(template).trim().length > 0
      ? String(template).trim()
      : DEFAULT_WHATSAPP_TEMPLATE;

  // Replace {{nombre_curso}} safely without executing any code
  let message = activeTemplate.replace(/\{\{\s*nombre_curso\s*\}\}/gi, courseName);

  // If the admin removed {{nombre_curso}} from the custom template, ensure the course name is still identifiable
  if (!/\{\{\s*nombre_curso\s*\}\}/i.test(activeTemplate) && courseName && !message.includes(courseName)) {
    message = `${message} (Curso: ${courseName})`;
  }

  return message;
}

/**
 * Builds the official WhatsApp Click-to-Chat URL (https://wa.me/NUMERO?text=MENSAJE_CODIFICADO).
 * Strictly enforces the official https://wa.me/ domain and digits-only phone format.
 */
export function buildWhatsappUrl(
  phone: string | null | undefined,
  courseOrTitle: { title?: string; titulo?: string; slug?: string } | string,
  template?: string | null
): string | null {
  const phoneCheck = normalizeWhatsappPhone(phone);
  if (!phoneCheck.valid || !phoneCheck.normalized) {
    return null;
  }
  const message = buildWhatsappCourseMessage(courseOrTitle, template);
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${phoneCheck.normalized}?text=${encodedMessage}`;
}

let cachedConfig: WhatsappConfig | null = null;
const listeners = new Set<(cfg: WhatsappConfig) => void>();

export async function fetchPublicWhatsappConfig(forceRefresh = false): Promise<WhatsappConfig> {
  if (cachedConfig && !forceRefresh) {
    return cachedConfig;
  }
  try {
    const res = await fetch('/api/public/whatsapp-config', {
      headers: { Accept: 'application/json' },
      cache: 'no-store'
    });
    if (res.ok) {
      const data = await res.json();
      const phoneCheck = normalizeWhatsappPhone(data.whatsapp_numero);
      const activo = Boolean(data.whatsapp_activo);
      const configured = Boolean(activo && phoneCheck.valid && phoneCheck.normalized);
      cachedConfig = {
        whatsapp_numero: phoneCheck.valid ? phoneCheck.normalized : '',
        whatsapp_activo: activo,
        whatsapp_plantilla: data.whatsapp_plantilla || DEFAULT_WHATSAPP_TEMPLATE,
        default_template: data.default_template || DEFAULT_WHATSAPP_TEMPLATE,
        configured
      };
      listeners.forEach(fn => fn(cachedConfig!));
      return cachedConfig;
    }
  } catch (err) {
    console.error('Error fetching WhatsApp configuration:', err);
  }

  const fallback: WhatsappConfig = {
    whatsapp_numero: '34633977320',
    whatsapp_activo: true,
    whatsapp_plantilla: DEFAULT_WHATSAPP_TEMPLATE,
    default_template: DEFAULT_WHATSAPP_TEMPLATE,
    configured: true
  };
  return cachedConfig || fallback;
}

export function notifyWhatsappConfigUpdated(newConfig?: Partial<WhatsappConfig>) {
  if (newConfig && cachedConfig) {
    const phoneCheck = normalizeWhatsappPhone(newConfig.whatsapp_numero ?? cachedConfig.whatsapp_numero);
    const activo = newConfig.whatsapp_activo ?? cachedConfig.whatsapp_activo;
    cachedConfig = {
      ...cachedConfig,
      ...newConfig,
      whatsapp_numero: phoneCheck.valid ? phoneCheck.normalized : '',
      whatsapp_activo: Boolean(activo),
      configured: Boolean(activo && phoneCheck.valid && phoneCheck.normalized)
    };
    listeners.forEach(fn => fn(cachedConfig!));
  }
  fetchPublicWhatsappConfig(true);
}

export function useWhatsappConfig() {
  const [config, setConfig] = useState<WhatsappConfig>(
    cachedConfig || {
      whatsapp_numero: '34633977320',
      whatsapp_activo: true,
      whatsapp_plantilla: DEFAULT_WHATSAPP_TEMPLATE,
      default_template: DEFAULT_WHATSAPP_TEMPLATE,
      configured: true
    }
  );

  useEffect(() => {
    let mounted = true;
    const listener = (updated: WhatsappConfig) => {
      if (mounted) setConfig(updated);
    };
    listeners.add(listener);
    fetchPublicWhatsappConfig(true).then(cfg => {
      if (mounted) setConfig(cfg);
    });
    return () => {
      mounted = false;
      listeners.delete(listener);
    };
  }, []);

  const openCourseWhatsapp = useCallback(
    (
      course: { title?: string; titulo?: string; slug?: string } | string,
      onFallback?: () => void
    ): boolean => {
      if (config.configured && config.whatsapp_numero && config.whatsapp_activo) {
        const url = buildWhatsappUrl(config.whatsapp_numero, course, config.whatsapp_plantilla);
        if (url) {
          window.open(url, '_blank', 'noopener,noreferrer');
          return true;
        }
      }
      if (onFallback) {
        onFallback();
      }
      return false;
    },
    [config]
  );

  const getCourseWhatsappUrl = useCallback(
    (course: { title?: string; titulo?: string; slug?: string } | string): string | null => {
      if (!config.configured || !config.whatsapp_numero || !config.whatsapp_activo) {
        return null;
      }
      return buildWhatsappUrl(config.whatsapp_numero, course, config.whatsapp_plantilla);
    },
    [config]
  );

  return {
    whatsappConfig: config,
    openCourseWhatsapp,
    getCourseWhatsappUrl,
    refreshWhatsappConfig: () => fetchPublicWhatsappConfig(true)
  };
}

