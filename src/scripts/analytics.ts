import { GA_HOSTS, GA_ID } from '../lib/site';

/*
 * Google Analytics 4, solo con consentimiento previo (lo gestiona consent.ts).
 * Nada de este fichero se ejecuta hasta que alguien llama a loadAnalytics().
 */

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

let loaded = false;

/** ¿Está configurada la analítica? (ID definido; no depende del dominio). */
export function analyticsConfigured(): boolean {
  return !!GA_ID;
}

/** ¿Se puede cargar aquí? Solo con ID y en los dominios de producción. */
function allowedHere(): boolean {
  return !!GA_ID && GA_HOSTS.includes(location.hostname);
}

function setDisabled(value: boolean): void {
  (window as unknown as Record<string, unknown>)['ga-disable-' + GA_ID] = value;
}

export function loadAnalytics(): void {
  if (!allowedHere()) return;
  setDisabled(false);
  if (loaded) return;
  loaded = true;

  window.dataLayer = window.dataLayer || [];
  // gtag.js exige empujar el objeto `arguments`, no un array.
  window.gtag = function () {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };

  // Anuncios siempre denegados; solo se concede la analítica.
  window.gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'granted',
  });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
  document.head.appendChild(script);

  window.gtag('js', new Date());
  window.gtag('config', GA_ID, {
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });
}

/** Retira el consentimiento: deja de enviar y borra las cookies de GA (mejor esfuerzo). */
export function disableAnalytics(): void {
  if (!GA_ID) return;
  setDisabled(true);

  // GA guarda las cookies en el dominio de nivel más alto posible (p. ej. .quesuena.es).
  const labels = location.hostname.split('.');
  const domains: (string | null)[] = [null];
  for (let i = 0; i < labels.length - 1; i++) {
    const d = labels.slice(i).join('.');
    domains.push(d, '.' + d);
  }
  const names = document.cookie
    .split(';')
    .map((c) => c.split('=')[0]!.trim())
    .filter((n) => n === '_ga' || n.startsWith('_ga_'));
  for (const name of names) {
    for (const domain of domains) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domain ? `; domain=${domain}` : ''}`;
    }
  }
}

/** Envía un evento si GA está cargado y activo; si no, no hace nada. */
export function track(name: string, params: Record<string, string | number | boolean> = {}): void {
  if (!loaded || !window.gtag) return;
  if ((window as unknown as Record<string, unknown>)['ga-disable-' + GA_ID]) return;
  try {
    window.gtag('event', name, params);
  } catch {
    /* la analítica nunca debe romper la app */
  }
}
