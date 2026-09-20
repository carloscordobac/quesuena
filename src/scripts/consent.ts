import { ANALYTICS_ENABLED } from '../lib/site';
import { disableAnalytics, loadAnalytics } from './analytics';

/*
 * Consentimiento de analítica. La decisión vive solo en este navegador (localStorage)
 * y caduca a los 12 meses. Sin decisión no se carga nada de terceros.
 */
const KEY = 'quesuena:consent:v1';
const MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;

type Choice = 'granted' | 'denied';

function readChoice(): Choice | null {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    const at = Date.parse(saved?.at);
    if ((saved?.analytics !== 'granted' && saved?.analytics !== 'denied') || Number.isNaN(at)) return null;
    if (Date.now() - at > MAX_AGE_MS) return null;
    return saved.analytics;
  } catch {
    return null;
  }
}

function saveChoice(analytics: Choice): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ analytics, at: new Date().toISOString() }));
  } catch {
    /* sin almacenamiento: la decisión vale solo para esta visita */
  }
}

function init(): void {
  const banner = document.getElementById('consent');
  const reopen = document.querySelectorAll<HTMLButtonElement>('[data-consent-open]');
  // Sin analítica (sin PUBLIC_GA_ID) no hay nada que consentir: ni aviso ni botón «Cookies».
  if (!banner || !ANALYTICS_ENABLED) return;
  const root = document.documentElement;
  let opener: HTMLElement | null = null;

  // Mientras está visible, reserva su alto abajo para que no tape contenido.
  const sync = (): void => root.style.setProperty('--consent-h', `${banner.offsetHeight}px`);
  const observer = new ResizeObserver(sync);

  function show(focus: boolean): void {
    banner!.hidden = false;
    root.dataset.consent = 'open';
    sync();
    observer.observe(banner!);
    if (focus) banner!.focus();
  }
  function hide(): void {
    banner!.hidden = true;
    delete root.dataset.consent;
    root.style.removeProperty('--consent-h');
    observer.disconnect();
  }

  banner.querySelectorAll<HTMLButtonElement>('[data-consent]').forEach((b) =>
    b.addEventListener('click', () => {
      const choice = b.dataset.consent as Choice;
      saveChoice(choice);
      if (choice === 'granted') loadAnalytics();
      else disableAnalytics();
      hide();
      opener?.focus();
      opener = null;
    }),
  );

  reopen.forEach((b) => {
    b.hidden = false;
    b.addEventListener('click', () => {
      opener = b;
      show(true);
    });
  });

  const choice = readChoice();
  if (choice === 'granted') loadAnalytics();
  else if (choice === null) show(false);
}

init();
