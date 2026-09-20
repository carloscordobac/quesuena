import { createPlayer } from './audio';
import { createRing } from './ring';

/* ---------- Tipos (coinciden con src/lib/catalog.ts → toManifest) ---------- */
interface Sound {
  id: string;
  name: string;
  emoji: string;
  cat: string;
  hue: number;
  gain: number;
  dur: number;
  file: string;
  origin: 'grabacion' | 'recreacion' | 'sintetico';
}
interface Category {
  id: string;
  name: string;
  hue: number;
}
interface Manifest {
  id: string;
  name: string;
  emoji: string;
  categories: Category[];
  sounds: Sound[];
}
interface CollectionInfo {
  id: string;
  name: string;
  emoji: string;
  count: number;
}

const ALL = 'todo';
const STORE = 'quesuena:v1';

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const root = document.documentElement;
const app = $('app');
const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');

const collections: CollectionInfo[] = JSON.parse($('collections-data').textContent || '[]');
const player = createPlayer(app.dataset.audioBase || '/audio/');

/* ---------- Elementos ---------- */
const canvas = $<HTMLCanvasElement>('ring');
const playBtn = $<HTMLButtonElement>('play');
const face = $<HTMLSpanElement>('face');
const hint = $<HTMLParagraphElement>('hint');
const wordEl = $<HTMLParagraphElement>('word');
const nameEl = $<HTMLParagraphElement>('name');
const replayBtn = $<HTMLButtonElement>('replay');
const revealBtn = $<HTMLButtonElement>('reveal');
const guessBtn = $<HTMLButtonElement>('guess');
const filtersEl = $<HTMLDivElement>('filters');
const gridEl = $<HTMLDivElement>('grid');
const countEl = $<HTMLElement>('count');

const ring = createRing(canvas, () => player.analyser(), () => player.isLive(), () => mqReduce.matches);

const SPEAKER =
  '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 19h8l10-8v26l-10-8H8z"/><path d="M33 17c3 3.5 3 10.5 0 14"/><path d="M38 12c6 6 6 18 0 24"/></svg>';

/* ---------- Estado ---------- */
const state = {
  current: null as Sound | null,
  revealed: false,
  guess: false,
  filter: ALL,
  dur: 1,
  error: '' as '' | 'unsupported' | 'network',
};
const manifests = new Map<string, Manifest>();
const heard = new Set<string>();
let bag: Sound[] = [];
let lastId: string | null = null;
// Se resuelve cuando ya está cargado el catálogo de sonidos.
let ready: Promise<void> = Promise.resolve();

/* ---------- Progreso guardado en este dispositivo (nada sale de él) ---------- */
function loadSaved(): void {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE) || '{}');
    if (Array.isArray(saved.heard)) saved.heard.forEach((id: unknown) => typeof id === 'string' && heard.add(id));
    if (typeof saved.guess === 'boolean') state.guess = saved.guess;
    if (typeof saved.filter === 'string') state.filter = saved.filter;
  } catch {
    /* almacenamiento no disponible: la app funciona igual */
  }
}
function save(): void {
  try {
    localStorage.setItem(STORE, JSON.stringify({ heard: [...heard], guess: state.guess, filter: state.filter }));
  } catch {
    /* nada */
  }
}

/* ---------- Datos ---------- */
async function loadManifests(): Promise<void> {
  await Promise.all(
    collections.map(async (c) => {
      const res = await fetch(`/data/${c.id}.json`);
      if (!res.ok) throw new Error(`No se pudo cargar /data/${c.id}.json`);
      manifests.set(c.id, (await res.json()) as Manifest);
    }),
  );
}

function activeManifests(): Manifest[] {
  return collections
    .filter((c) => state.filter === ALL || state.filter === c.id)
    .map((c) => manifests.get(c.id))
    .filter((m): m is Manifest => !!m);
}
function pool(): Sound[] {
  return activeManifests().flatMap((m) => m.sounds);
}
function categoryName(sound: Sound): string {
  for (const m of manifests.values()) {
    if (!m.sounds.includes(sound)) continue;
    return m.categories.find((k) => k.id === sound.cat)?.name ?? '';
  }
  return '';
}
function soundById(id: string): Sound | undefined {
  for (const m of manifests.values()) {
    const s = m.sounds.find((x) => x.id === id);
    if (s) return s;
  }
  return undefined;
}

/* ---------- Baraja aleatoria ---------- */
function shuffle<T>(a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

// Salen todos los sonidos antes de que se repita ninguno, y nunca el mismo dos veces seguidas.
function nextSound(): Sound | null {
  if (!bag.length) {
    bag = shuffle(pool());
    if (bag.length > 1 && bag[bag.length - 1]!.id === lastId) {
      [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1]!, bag[0]!];
    }
  }
  const s = bag.pop() ?? null;
  if (s) lastId = s.id;
  return s;
}

/* ---------- Interfaz ---------- */
function stretch(): void {
  if (mqReduce.matches) return;
  wordEl.style.setProperty('--dur', `${Math.min(3.5, Math.max(0.8, state.dur))}s`);
  wordEl.classList.remove('stretch');
  void wordEl.offsetWidth;
  wordEl.classList.add('stretch');
}

function render(pop = false): void {
  const s = state.current;
  const show = !!s && state.revealed;

  root.dataset.tone = show ? 'on' : 'idle';
  if (show) root.style.setProperty('--h', String(s!.hue));

  if (!s) {
    face.className = 'face';
    face.innerHTML = SPEAKER;
  } else if (show) {
    face.className = 'face';
    face.textContent = s.emoji;
  } else {
    face.className = 'face q';
    face.textContent = '?';
  }
  if (pop && s && !mqReduce.matches) {
    void face.offsetWidth;
    face.classList.add('pop');
  }

  let hintText = '';
  if (state.error === 'unsupported') hintText = 'Tu navegador no puede reproducir audio. Prueba con otro.';
  else if (state.error === 'network') hintText = 'No se pudo cargar el sonido. Comprueba tu conexión e inténtalo de nuevo.';
  else if (!s) hintText = 'Toca el círculo para oír algo al azar.';
  hint.textContent = hintText;
  hint.hidden = !hintText;

  const w = s ? (show ? s.name : '¿Quién será?') : '';
  wordEl.textContent = w;
  wordEl.hidden = !w;
  wordEl.style.setProperty('--len', String(Math.max(4, w.length)));
  nameEl.textContent = s ? (show ? categoryName(s) : 'Toca Revelar cuando lo sepas.') : '';
  nameEl.hidden = !s;

  replayBtn.disabled = !s;
  revealBtn.hidden = !(s && !state.revealed);
  playBtn.setAttribute('aria-label', show ? 'Reproducir otro sonido al azar' : 'Reproducir el sonido de algo al azar');

  updateGrid();
}

/* ---------- Colección de escuchados ---------- */
const tileById = new Map<string, HTMLButtonElement>();

function buildGrid(): void {
  gridEl.replaceChildren();
  tileById.clear();
  const multi = activeManifests().length > 1;
  for (const m of activeManifests()) {
    for (const cat of m.categories) {
      const items = m.sounds.filter((s) => s.cat === cat.id);
      if (!items.length) continue;
      const group = document.createElement('div');
      const h = document.createElement('h3');
      h.textContent = multi ? `${m.name}: ${cat.name}` : cat.name;
      const ul = document.createElement('ul');
      ul.className = 'grid';
      for (const s of items) {
        const li = document.createElement('li');
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'tile empty';
        b.addEventListener('click', () => void playSpecific(s));
        li.appendChild(b);
        ul.appendChild(li);
        tileById.set(s.id, b);
      }
      group.append(h, ul);
      gridEl.appendChild(group);
    }
  }
}

function updateGrid(): void {
  const all = pool();
  let n = 0;
  for (const s of all) {
    const b = tileById.get(s.id);
    if (!b) continue;
    const on = heard.has(s.id);
    if (on) n++;
    b.className = on ? 'tile' : 'tile empty';
    b.disabled = !on;
    b.textContent = on ? s.emoji : '';
    b.setAttribute('aria-label', on ? `Escuchar de nuevo: ${s.name}` : 'Aún sin escuchar');
    if (on) b.title = s.name;
    else b.removeAttribute('title');
  }
  countEl.textContent = !all.length
    ? 'Colección'
    : n === all.length
      ? '¡Los has oído todos!'
      : `${n} de ${all.length} escuchados`;
}

function buildFilters(): void {
  if (collections.length < 2) return;
  const options = [{ id: ALL, label: 'Todo' }, ...collections.map((c) => ({ id: c.id, label: c.name }))];
  filtersEl.replaceChildren(
    ...options.map((o) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.textContent = o.label;
      b.dataset.id = o.id;
      b.setAttribute('aria-pressed', String(state.filter === o.id));
      b.addEventListener('click', () => setFilter(o.id));
      return b;
    }),
  );
  filtersEl.hidden = false;
}

function setFilter(id: string): void {
  state.filter = id;
  bag = [];
  lastId = null;
  filtersEl.querySelectorAll<HTMLButtonElement>('.chip').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.id === id)));
  buildGrid();
  save();
  render();
}

/* ---------- Reproducción ---------- */
async function start(sound: Sound): Promise<'ok' | 'skip' | 'fail'> {
  const res = await player.play(sound);
  if (res.status === 'superseded') return 'skip';
  if (res.status === 'playing') {
    state.dur = res.duration;
    ring.start();
    state.error = '';
    return 'ok';
  }
  state.current = null;
  state.error = res.status === 'unsupported' ? 'unsupported' : 'network';
  render();
  return 'fail';
}

async function playRandom(): Promise<void> {
  player.unlock(); // dentro del toque, antes de cualquier espera
  await ready;
  const s = nextSound();
  if (!s) return;
  state.current = s;
  state.revealed = !state.guess;
  if ((await start(s)) !== 'ok') return;
  if (state.revealed) heard.add(s.id);
  save();
  render(true);
  if (state.revealed) stretch();
  if (bag.length) player.prefetch(bag[bag.length - 1]!);
}

async function playSpecific(s: Sound): Promise<void> {
  player.unlock();
  state.current = s;
  state.revealed = true;
  if ((await start(s)) !== 'ok') return;
  heard.add(s.id);
  save();
  render(true);
  stretch();
}

playBtn.addEventListener('click', () => void playRandom());

replayBtn.addEventListener('click', async () => {
  if (!state.current) return;
  player.unlock();
  if ((await start(state.current)) === 'ok' && state.revealed) stretch();
});

revealBtn.addEventListener('click', () => {
  if (!state.current) return;
  state.revealed = true;
  heard.add(state.current.id);
  save();
  render(true);
  stretch();
});

guessBtn.addEventListener('click', () => {
  state.guess = !state.guess;
  guessBtn.setAttribute('aria-checked', String(state.guess));
  save();
});

/* ---------- Arranque ---------- */
loadSaved();
if (state.filter !== ALL && !collections.some((c) => c.id === state.filter)) state.filter = ALL;
guessBtn.setAttribute('aria-checked', String(state.guess));
buildFilters();
render();

ready = loadManifests().then(
  () => {
    buildGrid();
    // Descarta ids guardados que ya no existen en el catálogo.
    for (const id of [...heard]) if (!soundById(id)) heard.delete(id);
    render();
  },
  () => {
    state.error = 'network';
    render();
  },
);
