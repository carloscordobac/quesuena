/**
 * Motor de audio: descarga el mp3 de cada sonido solo cuando hace falta, lo decodifica con Web Audio
 * y lo reproduce a través de un compresor y un analizador (el anillo dibuja esa onda).
 */

export interface Playable {
  id: string;
  file: string;
  /** Ajuste de volumen en dB (viene del manifiesto). */
  gain: number;
}

export type PlayResult =
  | { status: 'playing'; duration: number }
  | { status: 'superseded' }
  | { status: 'unsupported' }
  | { status: 'error' };

export function createPlayer(baseUrl: string) {
  let ctx: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let comp: DynamicsCompressorNode | null = null;
  let bus: GainNode | null = null;
  let liveUntil = 0;
  let token = 0;
  let unlocked = false;

  const raw = new Map<string, Promise<ArrayBuffer>>();
  const decoded = new Map<string, Promise<AudioBuffer>>();

  function init(): boolean {
    try {
      if (!ctx) {
        const AC: typeof AudioContext | undefined =
          window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AC) return false;
        ctx = new AC();
        comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -12;
        comp.knee.value = 10;
        comp.ratio.value = 6;
        comp.attack.value = 0.003;
        comp.release.value = 0.15;
        analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        comp.connect(analyser);
        analyser.connect(ctx.destination);
      }
      if (ctx.state === 'suspended') void ctx.resume();
      return true;
    } catch {
      return false;
    }
  }

  // En iPhone, el interruptor de silencio corta Web Audio salvo que la sesión sea de reproducción.
  function unlockMedia(): void {
    if (unlocked) return;
    unlocked = true;
    try {
      const nav = navigator as Navigator & { audioSession?: { type: string } };
      if (nav.audioSession) nav.audioSession.type = 'playback';
    } catch {
      /* nada */
    }
    try {
      const a = new Audio(
        'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==',
      );
      void a.play()?.catch(() => {});
    } catch {
      /* nada */
    }
  }

  // Cada reproducción usa su propio «bus»: al pulsar de nuevo, el anterior se apaga con un fundido.
  function newBus(): GainNode {
    const c = ctx!;
    const now = c.currentTime;
    if (bus) {
      const old = bus;
      old.gain.cancelScheduledValues(now);
      old.gain.setTargetAtTime(0, now, 0.02);
      setTimeout(() => {
        try {
          old.disconnect();
        } catch {
          /* nada */
        }
      }, 300);
    }
    bus = c.createGain();
    bus.connect(comp!);
    return bus;
  }

  function fetchRaw(file: string): Promise<ArrayBuffer> {
    let p = raw.get(file);
    if (!p) {
      p = fetch(baseUrl + file).then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status} en ${file}`);
        return r.arrayBuffer();
      });
      raw.set(file, p);
      p.catch(() => raw.delete(file));
      if (raw.size > 24) raw.delete(raw.keys().next().value!);
    }
    return p;
  }

  function decode(file: string): Promise<AudioBuffer> {
    const hit = decoded.get(file);
    if (hit) {
      // Reordena para que el más reciente quede al final (caché LRU).
      decoded.delete(file);
      decoded.set(file, hit);
      return hit;
    }
    const p = fetchRaw(file).then(
      (ab) =>
        new Promise<AudioBuffer>((resolve, reject) => {
          // decodeAudioData consume el buffer: se le pasa una copia.
          const r = ctx!.decodeAudioData(ab.slice(0), resolve, reject);
          if (r && typeof r.then === 'function') r.then(resolve, reject);
        }),
    );
    decoded.set(file, p);
    p.catch(() => decoded.delete(file));
    if (decoded.size > 14) decoded.delete(decoded.keys().next().value!);
    return p;
  }

  async function play(s: Playable): Promise<PlayResult> {
    if (!init()) return { status: 'unsupported' };
    unlockMedia();
    const mine = ++token;
    let buf: AudioBuffer;
    try {
      buf = await decode(s.file);
    } catch {
      return { status: 'error' };
    }
    if (mine !== token) return { status: 'superseded' };

    const out = newBus();
    const src = ctx!.createBufferSource();
    src.buffer = buf;
    const g = ctx!.createGain();
    g.gain.value = Math.pow(10, s.gain / 20);
    src.connect(g);
    g.connect(out);
    const t = ctx!.currentTime + 0.02;
    src.start(t);
    liveUntil = t + buf.duration + 0.1;
    return { status: 'playing', duration: buf.duration };
  }

  /** Deja lista la siguiente grabación para que suene sin retraso. */
  function prefetch(s: Playable): void {
    (ctx ? decode(s.file) : fetchRaw(s.file)).catch(() => {});
  }

  /** Hay que llamarlo dentro del gesto del usuario (un toque) para que el navegador permita el audio. */
  function unlock(): void {
    init();
    unlockMedia();
  }

  return {
    unlock,
    play,
    prefetch,
    analyser: () => analyser,
    isLive: () => !!ctx && ctx.currentTime < liveUntil,
  };
}

export type Player = ReturnType<typeof createPlayer>;
