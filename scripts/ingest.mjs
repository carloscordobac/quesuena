#!/usr/bin/env node
/**
 * npm run ingest [-- --force] [-- ruta/opcional]
 *
 * Convierte los originales de raw/<coleccion>/<categoria>/<id>.<ext> en:
 *   public/audio/<coleccion>/<categoria>/<id>.mp3          (mono, sin silencios, máx. 8 s, con fundido)
 *   src/content/sounds/<coleccion>/<categoria>/<id>.json   (ficha con duración, volumen, crédito y licencia)
 *
 * Cada original necesita una ficha con el mismo nombre: raw/<coleccion>/<categoria>/<id>.json
 *   {
 *     "name": "Vaca",
 *     "emoji": "🐮",
 *     "species": "opcional",
 *     "article": "el",                  // opcional: el | la | los | las («del gato», «de la vaca»)
 *     "sound": "mugido", "verb": "mugir", "onomatopoeia": "muuu",   // opcionales, solo con datos verificados
 *     "description": "1-2 frases ciertas (máx. 280 caracteres)",     // opcional
 *     "origin": "grabacion",            // grabacion | recreacion | sintetico (por defecto: grabacion)
 *     "credit": { "title": "…", "author": "…", "license": "CC-BY-SA-4.0", "url": "https://…" }
 *   }
 *
 * Requiere ffmpeg y ffprobe instalados (brew install ffmpeg · apt install ffmpeg · winget install ffmpeg).
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RAW = join(ROOT, 'raw');
const AUDIO_OUT = join(ROOT, 'public', 'audio');
const JSON_OUT = join(ROOT, 'src', 'content', 'sounds');

const MAX_SECONDS = 8;
const TARGET_MEAN_DB = -17;
const BITRATE = '96k';
const EXTENSIONS = new Set(['.ogg', '.oga', '.opus', '.wav', '.flac', '.mp3', '.m4a', '.aac']);

const licenses = JSON.parse(readFileSync(join(ROOT, 'src/lib/licenses.json'), 'utf8'));
const collections = JSON.parse(readFileSync(join(ROOT, 'src/content/collections.json'), 'utf8'));

const args = process.argv.slice(2);
const force = args.includes('--force');
const filters = args.filter((a) => !a.startsWith('--')).map((a) => resolve(a));

function run(cmd, cmdArgs) {
  const r = spawnSync(cmd, cmdArgs, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.error) {
    if (r.error.code === 'ENOENT') {
      console.error(`No encuentro «${cmd}». Instala ffmpeg (incluye ffprobe): brew install ffmpeg · sudo apt install ffmpeg · winget install ffmpeg`);
      process.exit(1);
    }
    throw r.error;
  }
  return r;
}

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

function duration(file) {
  const r = run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]);
  const d = parseFloat(r.stdout.trim());
  if (!Number.isFinite(d)) throw new Error(`No se pudo leer la duración de ${file}`);
  return d;
}

function volume(file) {
  const r = run('ffmpeg', ['-hide_banner', '-i', file, '-af', 'volumedetect', '-f', 'null', '-']);
  const mean = /mean_volume: (-?[\d.]+) dB/.exec(r.stderr);
  const max = /max_volume: (-?[\d.]+) dB/.exec(r.stderr);
  if (!mean || !max) throw new Error(`No se pudo medir el volumen de ${file}`);
  return { mean: parseFloat(mean[1]), max: parseFloat(max[1]) };
}

function validateMeta(meta, where) {
  const errors = [];
  if (!meta.name) errors.push('falta «name»');
  if (!meta.emoji) errors.push('falta «emoji»');
  const c = meta.credit;
  if (!c || !c.title || !c.author || !c.url) errors.push('«credit» necesita title, author y url');
  else if (!licenses[c.license]) errors.push(`licencia «${c.license}» no permitida. Válidas: ${Object.keys(licenses).join(', ')}`);
  if (meta.article && !['el', 'la', 'los', 'las'].includes(meta.article)) errors.push('«article» debe ser el, la, los o las');
  for (const k of ['sound', 'verb', 'onomatopoeia', 'description']) {
    if (meta[k] !== undefined && (typeof meta[k] !== 'string' || !meta[k].trim())) errors.push(`«${k}» debe ser un texto no vacío`);
  }
  if (meta.description && meta.description.length > 280) errors.push('«description» no puede pasar de 280 caracteres');
  if (meta.origin && !['grabacion', 'recreacion', 'sintetico'].includes(meta.origin)) errors.push('«origin» debe ser grabacion, recreacion o sintetico');
  if (errors.length) throw new Error(`${where}: ${errors.join('; ')}`);
}

function ingestOne(file) {
  const rel = relative(RAW, file).split(/[\\/]/);
  if (rel.length !== 3) throw new Error(`${file}: usa raw/<coleccion>/<categoria>/<id>.<ext>`);
  const [collectionId, categoryId, filename] = rel;
  const id = basename(filename, extname(filename));

  const collection = collections.find((c) => c.id === collectionId);
  if (!collection) throw new Error(`La colección «${collectionId}» no existe en src/content/collections.json`);
  if (!collection.categories.some((k) => k.id === categoryId)) {
    throw new Error(`La categoría «${categoryId}» no existe en «${collectionId}» (src/content/collections.json)`);
  }

  const metaPath = join(dirname(file), `${id}.json`);
  if (!existsSync(metaPath)) throw new Error(`Falta la ficha ${relative(ROOT, metaPath)}`);
  const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
  validateMeta(meta, relative(ROOT, metaPath));

  const outAudio = join(AUDIO_OUT, collectionId, categoryId, `${id}.mp3`);
  const outJson = join(JSON_OUT, collectionId, categoryId, `${id}.json`);
  if (!force && existsSync(outAudio) && existsSync(outJson)) {
    console.log(`= ${collectionId}/${categoryId}/${id} (ya existe; usa --force para rehacerlo)`);
    return;
  }

  const tmp = mkdtempSync(join(tmpdir(), 'quesuena-'));
  try {
    // 1) Quita el silencio del principio y del final, pasa a mono y a 44,1 kHz.
    const trimmed = join(tmp, 'trimmed.wav');
    const silence = (s) => `silenceremove=start_periods=1:start_threshold=-45dB:start_silence=${s}`;
    let r = run('ffmpeg', ['-y', '-v', 'error', '-i', file, '-vn', '-ac', '1', '-ar', '44100',
      '-af', `${silence(0.05)},areverse,${silence(0.15)},areverse`, trimmed]);
    if (r.status !== 0) throw new Error(r.stderr);

    // 2) Recorta a 8 s con fundido de salida y codifica a mp3.
    const len = duration(trimmed);
    const fade = len > MAX_SECONDS
      ? `atrim=0:${MAX_SECONDS},afade=t=out:st=${MAX_SECONDS - 0.4}:d=0.4`
      : `afade=t=out:st=${Math.max(0, len - 0.1).toFixed(3)}:d=0.1`;
    mkdirSync(dirname(outAudio), { recursive: true });
    r = run('ffmpeg', ['-y', '-v', 'error', '-i', trimmed, '-af', fade, '-c:a', 'libmp3lame', '-b:a', BITRATE, outAudio]);
    if (r.status !== 0) throw new Error(r.stderr);

    // 3) Mide duración y volumen del mp3 final y calcula el ajuste (sin pasar de -1 dB de pico).
    const finalDur = Math.round(duration(outAudio) * 100) / 100;
    const { mean, max } = volume(outAudio);
    const gain = Math.round(Math.max(-12, Math.min(12, Math.min(TARGET_MEAN_DB - mean, -1 - max))) * 10) / 10;

    const entry = {
      name: meta.name,
      emoji: meta.emoji,
      file: `${collectionId}/${categoryId}/${id}.mp3`,
      duration: finalDur,
      gain,
      origin: meta.origin ?? 'grabacion',
      ...(meta.species ? { species: meta.species } : {}),
      ...Object.fromEntries(['article', 'sound', 'verb', 'onomatopoeia', 'description'].filter((k) => meta[k]).map((k) => [k, meta[k]])),
      ...(meta.hue !== undefined ? { hue: meta.hue } : {}),
      credit: meta.credit,
    };
    mkdirSync(dirname(outJson), { recursive: true });
    writeFileSync(outJson, JSON.stringify(entry, null, 2) + '\n');
    console.log(`+ ${collectionId}/${categoryId}/${id}  ${finalDur} s, ${gain > 0 ? '+' : ''}${gain} dB`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

const files = walk(RAW)
  .filter((f) => EXTENSIONS.has(extname(f).toLowerCase()))
  .filter((f) => !filters.length || filters.some((p) => f === p || f.startsWith(p + '/') || f.startsWith(p + '\\')));

if (!files.length) {
  console.log('No hay originales en raw/. Guía: docs/CONTENIDO.md');
  process.exit(0);
}

let failed = 0;
for (const f of files) {
  try {
    ingestOne(f);
  } catch (e) {
    failed++;
    console.error(`x ${relative(ROOT, f)}: ${e.message.trim()}`);
  }
}
if (failed) {
  console.error(`\n${failed} sin procesar.`);
  process.exit(1);
}
console.log('\nListo. Ejecuta «npm run build» para comprobar que todo encaja.');
