/**
 * Anillo alrededor del círculo. En reposo dibuja los cinco arcos de la marca; mientras suena,
 * dibuja la onda del sonido como un anillo que vibra.
 */

const BRAND_ARCS = ['#F2A93B', '#E8553D', '#5A5BD9', '#1FA6D6', '#45B36B'];

export function createRing(
  canvas: HTMLCanvasElement,
  getAnalyser: () => AnalyserNode | null,
  isLive: () => boolean,
  reduceMotion: () => boolean,
) {
  const g = canvas.getContext('2d')!;
  const samples = new Uint8Array(1024);
  let dpr = 1;
  let raf = 0;

  function resize(): void {
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    const s = Math.max(1, Math.round(canvas.clientWidth * dpr));
    canvas.width = s;
    canvas.height = s;
    draw(false);
  }

  function idleArcs(w: number): void {
    const c = w / 2;
    const r = w * 0.4;
    g.lineWidth = w * 0.07;
    g.lineCap = 'round';
    const rad = (deg: number) => ((deg - 90) * Math.PI) / 180;
    BRAND_ARCS.forEach((color, i) => {
      const a0 = 10 + i * 72;
      g.strokeStyle = color;
      g.beginPath();
      g.arc(c, c, r, rad(a0), rad(a0 + 52));
      g.stroke();
    });
  }

  function wave(w: number): void {
    const analyser = getAnalyser();
    if (!analyser) return idleArcs(w);
    analyser.getByteTimeDomainData(samples);
    const c = w / 2;
    const R = w * 0.4;
    const A = w * 0.07;
    const N = 200;
    g.strokeStyle = 'currentColor';
    g.lineWidth = 3 * dpr;
    g.lineJoin = 'round';
    g.beginPath();
    for (let i = 0; i <= N; i++) {
      // Onda simétrica para que el anillo cierre sin saltos.
      const p = i <= N / 2 ? i / (N / 2) : (N - i) / (N / 2);
      const v = (samples[Math.floor(p * (samples.length - 1))]! - 128) / 128;
      const r = R + v * A * 1.6;
      const ang = (i / N) * Math.PI * 2 - Math.PI / 2;
      const x = c + Math.cos(ang) * r;
      const y = c + Math.sin(ang) * r;
      if (i) g.lineTo(x, y);
      else g.moveTo(x, y);
    }
    g.closePath();
    g.stroke();
  }

  function draw(live: boolean): void {
    const w = canvas.width;
    g.clearRect(0, 0, w, w);
    if (live) wave(w);
    else idleArcs(w);
  }

  function frame(): void {
    raf = 0;
    const live = isLive() && !reduceMotion();
    draw(live);
    if (live) raf = requestAnimationFrame(frame);
  }

  function start(): void {
    if (!raf) raf = requestAnimationFrame(frame);
  }

  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(resize).observe(canvas);
  else window.addEventListener('resize', resize);
  resize();

  return { start };
}
