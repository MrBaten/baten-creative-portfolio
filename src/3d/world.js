/**
 * NEON NIGHT STUDIO — the 3D world behind optiobyte.com
 * ------------------------------------------------------------------
 * Opening ("noise to film"): ~30,000 glowing particles start as pure
 * noise, resolve into the name, then into frames from the commercials,
 * cycling — the way generative video turns noise into film. The pointer
 * pushes particles away. Scrolling blows the particles past the camera
 * and flies into a dark studio lit by neon: framed portraits (About),
 * monitors playing the films (Work), a neon lighting rig over a product
 * (Services), a dolly track with four glowing tape marks (Process) and a
 * clapperboard (Contact).
 *
 * Palette: midnight indigo, electric cyan, solar orange, laser lime.
 *
 * Source file. The browser loads src/app/world.bundle.js — rebuild with
 * `npm run build:3d` after editing.
 */
import {
  WebGLRenderer, WebGLRenderTarget, HalfFloatType, Scene, Color, Fog, PerspectiveCamera, ACESFilmicToneMapping,
  SRGBColorSpace, PMREMGenerator, HemisphereLight, DirectionalLight, Group, Mesh, Points, BufferGeometry,
  BufferAttribute, PlaneGeometry, BoxGeometry, CylinderGeometry, TorusGeometry, SphereGeometry, CircleGeometry,
  MeshStandardMaterial, MeshPhysicalMaterial, MeshBasicMaterial, ShaderMaterial, CanvasTexture, TextureLoader,
  VideoTexture, Vector2, Vector3, Plane, Raycaster, CatmullRomCurve3, MathUtils, AdditiveBlending, BackSide,
  GridHelper,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

/* ── Palette ──────────────────────────────────────────────────────── */
const SKY_TOP = '#07051a';
const HORIZON = '#22135a';
const FOG = '#22135a';                         // = horizon, so distant props dissolve into it
const FLOOR = '#0c0926';
const CYAN = '#22e4ff';
const ORANGE = '#ff8a00';
const LIME = '#c6ff3d';
const VIOLET = '#8b5cff';
const ICE = '#f4f2ff';
const TAPE = [CYAN, ORANGE, LIME, VIOLET];   // one glowing tape mark per process step (matches the page)

const smooth = (a, b, x) => { const t = MathUtils.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const smoother = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const DISPLAY = '"Big Shoulders Display", "Arial Narrow", Impact, sans-serif';
const BODY = '"Schibsted Grotesk", Arial, sans-serif';

/* ── Small factories ──────────────────────────────────────────────── */
function canvasTexture(w, h, draw, anisotropy = 4) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = anisotropy;
  return t;
}

// Neon: colour pushed above 1.0 so the bloom pass makes it glow.
const neon = (hex, k = 3) => new MeshBasicMaterial({ color: new Color(hex).multiplyScalar(k) });

let radialTex;
const radial = () => (radialTex ||= canvasTexture(128, 128, (g, W, H) => {
  // alphaMap reads the green channel, so paint a grey falloff on opaque black.
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  const r = g.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W / 2);
  r.addColorStop(0, '#fff'); r.addColorStop(0.35, '#6a6a6a'); r.addColorStop(1, '#000');
  g.fillStyle = r; g.fillRect(0, 0, W, H);
}));

// A pool of coloured light on the glossy floor under a neon object.
function glowPool(hex, w, d, opacity = 0.5) {
  const m = new Mesh(new PlaneGeometry(w, d), new MeshBasicMaterial({
    color: hex, alphaMap: radial(), transparent: true, opacity, depthWrite: false, blending: AdditiveBlending,
  }));
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.006;
  m.renderOrder = 1;
  return m;
}

// Thin glowing outline around a w×h rectangle (in the XY plane).
function neonFrame(hex, w, h, t = 0.025, k = 3.2) {
  const g = new Group();
  const mat = neon(hex, k);
  const top = new Mesh(new BoxGeometry(w + t, t, t), mat); top.position.y = h / 2;
  const bot = top.clone(); bot.position.y = -h / 2;
  const l = new Mesh(new BoxGeometry(t, h + t, t), mat); l.position.x = -w / 2;
  const r = l.clone(); r.position.x = w / 2;
  g.add(top, bot, l, r);
  return g;
}

/* ── Opening: noise → name → films ────────────────────────────────── */
const particleVertex = /* glsl */ `
  attribute vec3 aFrom;
  attribute vec3 aTo;
  attribute vec3 aColFrom;
  attribute vec3 aColTo;
  attribute float aSeed;
  uniform float uMorph;
  uniform float uTime;
  uniform float uNoise;
  uniform float uScatter;
  uniform vec3 uMouse;
  uniform float uMouseK;
  uniform float uSize;
  uniform float uJitter;
  uniform float uPixelRatio;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float delay = aSeed * 0.4;
    float t = clamp((uMorph - delay) / 0.6, 0.0, 1.0);
    t = t * t * (3.0 - 2.0 * t);
    vec3 p = mix(aFrom, aTo, t);
    // While travelling, particles swirl through noise before settling.
    float transit = sin(3.14159 * t);
    vec3 drift = vec3(
      sin(uTime * 0.71 + aSeed * 31.0) + sin(uTime * 0.23 + p.y * 1.7),
      cos(uTime * 0.63 + aSeed * 17.0) + sin(uTime * 0.31 + p.x * 1.3),
      sin(uTime * 0.52 + aSeed * 11.0));
    p += drift * (transit * 0.55 + uNoise * 0.35 + 0.006);
    // Pointer pushes particles away.
    vec2 dm = p.xy - uMouse.xy;
    float dl = length(dm);
    float f = uMouseK * smoothstep(0.95, 0.0, dl);
    p.xy += (dm / max(dl, 0.0001)) * f * 0.55;
    p.z += f * 0.5;
    // Scroll: the field blows past the camera.
    vec3 outward = normalize(p + vec3(0.0001, 0.0, 0.0));
    p += outward * uScatter * (3.0 + aSeed * 7.0);
    p.z += uScatter * uScatter * (5.0 + aSeed * 9.0);

    vColor = mix(aColFrom, aColTo, t);
    vAlpha = (1.0 - smoothstep(0.55, 1.0, uScatter)) * (0.78 + 0.22 * sin(uTime * 2.3 + aSeed * 40.0));
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uSize * uPixelRatio * (9.0 / -mv.z) * (1.0 + (aSeed - 0.5) * uJitter);
    gl_Position = projectionMatrix * mv;
  }
`;
const particleFragment = /* glsl */ `
  uniform float uGain;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.08, d) * vAlpha;
    if (a < 0.01) discard;
    gl_FragColor = vec4(vColor * uGain, a);
  }
`;

function shuffled(n) {
  const a = new Uint32Array(n);
  for (let i = 0; i < n; i++) a[i] = i;
  for (let i = n - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; const t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}

const PAL = [CYAN, CYAN, CYAN, ORANGE, ORANGE, LIME, VIOLET, VIOLET].map((h) => new Color(h));

function noiseTarget(N) {
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 15 + 1.2;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 8.5;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 6 - 1;
    const c = PAL[(Math.random() * PAL.length) | 0];
    const k = 0.22 + Math.random() * 0.5;
    col[i * 3] = c.r * k; col[i * 3 + 1] = c.g * k; col[i * 3 + 2] = c.b * k;
  }
  return { pos, col };
}

function wordTarget(N, word, width) {
  const W = 1000, H = 320;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  let size = 290;
  g.font = `900 ${size}px ${DISPLAY}`;
  const mw = g.measureText(word).width;
  if (mw > W * 0.94) { size *= (W * 0.94) / mw; g.font = `900 ${size}px ${DISPLAY}`; }
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff';
  g.fillText(word, W / 2, H / 2 + size * 0.04);
  const data = g.getImageData(0, 0, W, H).data;
  const pts = [];
  for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) if (data[(y * W + x) * 4 + 3] > 128) pts.push(x, y);
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
  const cyan = new Color(CYAN), orange = new Color(ORANGE), lime = new Color(LIME), ice = new Color(ICE);
  const scale = width / W;
  for (let i = 0; i < N; i++) {
    const k = ((Math.random() * pts.length) / 2 | 0) * 2;
    const px = pts[k] + (Math.random() - 0.5) * 2.2, py = pts[k + 1] + (Math.random() - 0.5) * 2.2;
    pos[i * 3] = (px - W / 2) * scale;
    pos[i * 3 + 1] = (H / 2 - py) * scale;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 0.2;
    // Dithered gradient: cyan on the left, solar orange gathering to the right, lime sparks.
    const t = px / W;
    const r = Math.random();
    const c2 = r < 0.04 ? lime : r < 0.08 ? ice : Math.random() < t * t * 0.95 ? orange : cyan;
    col[i * 3] = c2.r; col[i * 3 + 1] = c2.g; col[i * 3 + 2] = c2.b;
  }
  return { pos, col };
}

function frameTarget(N, img, perm, frameH) {
  const frameW = frameH * 9 / 16;
  const gw = Math.round(Math.sqrt(N * 9 / 16)), gh = Math.ceil(N / gw);
  const c = document.createElement('canvas'); c.width = gw; c.height = gh;
  const g = c.getContext('2d');
  // Cover-crop the poster to 9:16.
  const ir = img.naturalWidth / img.naturalHeight, tr = 9 / 16;
  let sw = img.naturalWidth, sh = img.naturalHeight, sx = 0, sy = 0;
  if (ir > tr) { sw = sh * tr; sx = (img.naturalWidth - sw) / 2; } else { sh = sw / tr; sy = (img.naturalHeight - sh) / 2; }
  g.drawImage(img, sx, sy, sw, sh, 0, 0, gw, gh);
  const data = g.getImageData(0, 0, gw, gh).data;
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
  const lin = (v) => Math.pow(v / 255, 2.2);
  for (let i = 0; i < N; i++) {
    const cell = perm[i];
    const cx = cell % gw, cy = (cell / gw) | 0;
    const o = (cy * gw + cx) * 4;
    const r = lin(data[o]), gg = lin(data[o + 1]), b = lin(data[o + 2]);
    const lum = 0.2126 * r + 0.7152 * gg + 0.0722 * b;
    pos[i * 3] = ((cx + 0.5) / gw - 0.5) * frameW;
    pos[i * 3 + 1] = (0.5 - (cy + 0.5) / gh) * frameH;
    pos[i * 3 + 2] = (lum - 0.25) * 0.45;         // bright areas lift toward you: a shallow relief
    // Lift the blacks to a faint indigo so the frame's silhouette still reads.
    // Lift midtones (keeping hue); let near-black fall away so the subject floats on the night.
    const lift = (Math.pow(lum, 0.55) / Math.max(lum, 0.0001)) * 0.9 * (lum < 0.03 ? 0.25 : 1);
    col[i * 3] = Math.min(1, r * lift); col[i * 3 + 1] = Math.min(1, gg * lift); col[i * 3 + 2] = Math.min(1, b * lift);
  }
  return { pos, col };
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function buildOpening({ N, word, works, frameH, wordW, reducedMotion }) {
  const perm = shuffled(N);
  const noise = noiseTarget(N);
  const name = wordTarget(N, word, wordW);
  const imgs = await Promise.all(works.slice(0, 3).map((w) => loadImage(w.poster)));
  const films = imgs.map((img, i) => (img ? { ...frameTarget(N, img, perm, frameH), label: works[i].title } : null)).filter(Boolean);

  const geo = new BufferGeometry();
  const seeds = new Float32Array(N);
  for (let i = 0; i < N; i++) seeds[i] = Math.random();
  const start = reducedMotion ? name : noise;
  const attr = (arr) => new BufferAttribute(arr.slice(), 3);
  geo.setAttribute('position', attr(start.pos));
  geo.setAttribute('aFrom', attr(start.pos));
  geo.setAttribute('aTo', attr(start.pos));
  geo.setAttribute('aColFrom', attr(start.col));
  geo.setAttribute('aColTo', attr(start.col));
  geo.setAttribute('aSeed', new BufferAttribute(seeds, 1));

  const mat = new ShaderMaterial({
    vertexShader: particleVertex,
    fragmentShader: particleFragment,
    transparent: true, depthWrite: false, blending: AdditiveBlending,
    uniforms: {
      uMorph: { value: 1 }, uTime: { value: 0 }, uNoise: { value: reducedMotion ? 0 : 1 }, uScatter: { value: 0 },
      uMouse: { value: new Vector3(99, 99, 0) }, uMouseK: { value: 0 },
      uSize: { value: 3.2 }, uJitter: { value: 0.7 }, uPixelRatio: { value: 1 }, uGain: { value: reducedMotion ? 0.5 : 0.9 },
    },
  });
  const points = new Points(geo, mat);
  points.frustumCulled = false;

  // Sequence: noise → name → film 1 → film 2 → film 3 → name → film 1 …
  const steps = [
    { target: noise, hold: 0.9, label: 'noise', gain: 0.9, size: 3.2, jitter: 0.7, noise: 1 },
    { target: name, hold: 2.8, label: 'name', gain: 0.5, size: 2.6, jitter: 0.5, noise: 0 },
    ...films.map((f) => ({ target: f, hold: 3.6, label: f.label, gain: 1.5, size: 3.8, jitter: 0.12, noise: 0 })),
  ];
  const MORPH = 2.0;
  let step = 0, clock = 0, morphing = false;

  function go(next) {
    const a = geo.attributes;
    a.aFrom.array.set(a.aTo.array); a.aColFrom.array.set(a.aColTo.array);
    a.aTo.array.set(next.target.pos); a.aColTo.array.set(next.target.col);
    a.aFrom.needsUpdate = a.aTo.needsUpdate = a.aColFrom.needsUpdate = a.aColTo.needsUpdate = true;
    mat.uniforms.uMorph.value = 0;
    morphing = true;
  }

  return {
    points, mat,
    labelNow: () => steps[step].label,
    update(dt, onPhase) {
      if (reducedMotion || steps.length < 2) return;
      clock += dt;
      const s = steps[step];
      const u = mat.uniforms;
      u.uNoise.value += (s.noise - u.uNoise.value) * Math.min(1, dt * 1.5);
      u.uGain.value += (s.gain - u.uGain.value) * Math.min(1, dt * 2);
      u.uSize.value += (s.size - u.uSize.value) * Math.min(1, dt * 2);
      u.uJitter.value += (s.jitter - u.uJitter.value) * Math.min(1, dt * 2);
      if (morphing) {
        u.uMorph.value = Math.min(1, u.uMorph.value + dt / MORPH);
        if (u.uMorph.value >= 1) { morphing = false; clock = 0; }
        return;
      }
      if (clock > s.hold) {
        step = step + 1 < steps.length ? step + 1 : 1;     // loop back to the name, never to noise
        go(steps[step]);
        onPhase?.(steps[step].label);
      }
    },
  };
}

/* ── Studio props ─────────────────────────────────────────────────── */
function buildPrint(tex, w, h, glow) {
  const g = new Group();
  const frame = new Mesh(new BoxGeometry(w + 0.14, h + 0.14, 0.05), new MeshStandardMaterial({ color: '#15103a', roughness: 0.4, metalness: 0.5 }));
  const photo = new Mesh(new PlaneGeometry(w, h), new MeshBasicMaterial({ map: tex, toneMapped: false }));
  photo.position.z = 0.027;
  const edge = neonFrame(glow, w + 0.2, h + 0.2, 0.022, 3);
  edge.position.z = 0.03;
  g.add(frame, photo, edge);
  const wireMat = new MeshBasicMaterial({ color: '#4a4290' });
  for (const x of [-w / 2 + 0.1, w / 2 - 0.1]) {
    const wire = new Mesh(new CylinderGeometry(0.006, 0.006, 2.2, 4), wireMat);
    wire.position.set(x, h / 2 + 1.18, 0);
    g.add(wire);
  }
  return g;
}

function buildMonitor(posterTex, glow) {
  const g = new Group();
  const w = 1.6, h = 2.84;
  const dark = new MeshStandardMaterial({ color: '#100c2c', roughness: 0.3, metalness: 0.6 });
  const chrome = new MeshStandardMaterial({ color: '#b8b4e0', roughness: 0.2, metalness: 1 });
  const base = new Mesh(new CylinderGeometry(0.5, 0.56, 0.06, 48), dark); base.position.y = 0.03;
  const baseRing = new Mesh(new TorusGeometry(0.53, 0.012, 8, 64), neon(glow, 3));
  baseRing.rotation.x = Math.PI / 2; baseRing.position.y = 0.065;
  const pole = new Mesh(new CylinderGeometry(0.035, 0.035, 0.9, 16), chrome); pole.position.y = 0.48;
  const bezel = new Mesh(new BoxGeometry(w + 0.1, h + 0.1, 0.09), dark); bezel.position.y = 0.92 + h / 2;
  const screenMat = new MeshBasicMaterial({ map: posterTex, toneMapped: false });
  const screen = new Mesh(new PlaneGeometry(w, h), screenMat); screen.position.set(0, 0.92 + h / 2, 0.047);
  const under = new Mesh(new BoxGeometry(w + 0.1, 0.03, 0.03), neon(glow, 3.5));
  under.position.set(0, 0.86, 0.05);
  g.add(base, baseRing, pole, bezel, screen, under, glowPool(glow, 2.6, 2.6, 0.55));
  return { group: g, screenMat };
}

function buildSoftbox(face) {
  const g = new Group();
  const fabric = new MeshStandardMaterial({ color: '#14102f', roughness: 0.8, metalness: 0.1 });
  const body = new Mesh(new CylinderGeometry(0.78, 0.2, 0.75, 4, 1, true), fabric);
  body.rotation.set(Math.PI / 2, Math.PI / 4, 0);
  body.scale.set(1.25, 1, 0.82);
  body.position.z = -0.37;
  const ring = new Mesh(new TorusGeometry(0.16, 0.035, 8, 24), new MeshStandardMaterial({ color: '#b8b4e0', roughness: 0.25, metalness: 1 }));
  ring.position.z = -0.76;
  const diffuser = new Mesh(new PlaneGeometry(1.36, 0.88), neon(face, 2.4));
  const rim = new Mesh(new BoxGeometry(1.44, 0.96, 0.03), fabric);
  rim.position.z = -0.02;
  g.add(body, ring, rim, diffuser);
  return g;
}

function buildTrackAndMarks() {
  const g = new Group();
  const railMat = new MeshStandardMaterial({ color: '#c9c5f0', roughness: 0.15, metalness: 1 });
  const sleeperMat = new MeshStandardMaterial({ color: '#1b1644', roughness: 0.6, metalness: 0.3 });
  const L = 26;
  for (const x of [-0.34, 0.34]) {
    const rail = new Mesh(new CylinderGeometry(0.028, 0.028, L, 12), railMat);
    rail.rotation.x = Math.PI / 2;
    rail.position.set(x, 0.08, 0);
    g.add(rail);
  }
  for (let z = -L / 2 + 0.5; z < L / 2; z += 1.3) {
    const s = new Mesh(new BoxGeometry(0.9, 0.04, 0.1), sleeperMat);
    s.position.set(0, 0.03, z);
    g.add(s);
  }
  // Dolly: low platform with a camera; its tally light glows orange.
  const dolly = new Group();
  const deck = new Mesh(new BoxGeometry(1.1, 0.12, 1.4), new MeshStandardMaterial({ color: '#1d1848', roughness: 0.4, metalness: 0.5 }));
  deck.position.y = 0.22;
  const deckGlow = neonFrame(CYAN, 1.1, 1.4, 0.02, 2.6);
  deckGlow.rotation.x = -Math.PI / 2; deckGlow.position.y = 0.16;
  const column = new Mesh(new CylinderGeometry(0.07, 0.09, 0.9, 16), railMat); column.position.y = 0.72;
  const cam = new Mesh(new BoxGeometry(0.42, 0.34, 0.62), new MeshStandardMaterial({ color: '#0f0b28', roughness: 0.35, metalness: 0.6 }));
  cam.position.y = 1.32;
  const lens = new Mesh(new CylinderGeometry(0.12, 0.14, 0.34, 32), new MeshStandardMaterial({ color: '#1a1540', roughness: 0.3, metalness: 0.7 }));
  lens.rotation.x = Math.PI / 2; lens.position.set(0, 1.32, -0.46);
  const tally = new Mesh(new SphereGeometry(0.035, 12, 8), neon(ORANGE, 5));
  tally.position.set(0.16, 1.52, -0.2);
  dolly.add(deck, deckGlow, column, cam, lens, tally, glowPool(CYAN, 2.4, 2.8, 0.45));
  g.add(dolly);

  // Tape marks: a glowing T and its number per step, beside the track.
  TAPE.forEach((color, i) => {
    const m = new Group();
    const mat = neon(color, 3);
    const bar = new Mesh(new PlaneGeometry(0.62, 0.09), mat);
    const stem = new Mesh(new PlaneGeometry(0.09, 0.42), mat);
    stem.position.y = -0.25;
    const num = new Mesh(new PlaneGeometry(0.8, 1.0), new MeshBasicMaterial({
      map: canvasTexture(128, 160, (c, W, H) => { c.fillStyle = '#fff'; c.font = `900 150px ${DISPLAY}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(i + 1), W / 2, H / 2 + 8); }),
      color: new Color(color).multiplyScalar(2.6), transparent: true, depthWrite: false,
    }));
    num.position.set(0.75, -0.12, 0);
    m.add(bar, stem, num);
    m.rotation.x = -Math.PI / 2;
    m.scale.setScalar(1.5);
    m.position.set(1.45, 0.008, L / 2 - 8.0 - i * 3.3);   // step 1 nearest the camera
    g.add(m);
    const pool = glowPool(color, 2.2, 2.2, 0.35);
    pool.position.set(1.7, 0.005, m.position.z);
    g.add(pool);
  });
  return { group: g, dolly, trackLength: L };
}

function buildClapper({ name, maxAniso }) {
  const g = new Group();
  const W = 2.6, H = 1.9;
  const faceTex = canvasTexture(1040, 760, (c, w, h) => {
    c.fillStyle = '#100c2a'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#d8d4ff'; c.lineWidth = 5;
    const rows = [0, 210, 400, 580, h];
    rows.slice(1, -1).forEach((y) => { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); });
    [[400, 210, 400], [700, 210, 400], [520, 400, 580]].forEach(([x, y0, y1]) => { c.beginPath(); c.moveTo(x, y0); c.lineTo(x, y1); c.stroke(); });
    c.fillStyle = '#8f8ac0'; c.font = `600 30px ${BODY}`;
    c.fillText('PROD.', 24, 44); c.fillText('ROLL', 24, 254); c.fillText('SCENE', 424, 254); c.fillText('TAKE', 724, 254);
    c.fillText('DIRECTOR', 24, 444); c.fillText('CAMERA', 544, 444); c.fillText('DATE', 24, 624);
    c.fillStyle = ICE; c.font = `800 120px ${DISPLAY}`;
    c.fillText('YOUR BRAND', 24, 170);
    c.font = `800 110px ${DISPLAY}`; c.fillStyle = CYAN;
    c.fillText('A001', 24, 370); c.fillStyle = ICE; c.fillText('1', 424, 370); c.fillText('1', 724, 370);
    c.font = `800 92px ${DISPLAY}`;
    c.fillText(name.split(' ').slice(-1)[0].toUpperCase(), 24, 548); c.fillText('A CAM', 544, 548);
    c.font = `800 82px ${DISPLAY}`; c.fillStyle = ORANGE;
    c.fillText('TODAY', 24, 720);
  }, maxAniso);
  const edgeMat = new MeshStandardMaterial({ color: '#100c2a', roughness: 0.4, metalness: 0.3 });
  const board = new Mesh(new BoxGeometry(W, H, 0.08), [
    edgeMat, edgeMat, edgeMat, edgeMat,
    new MeshBasicMaterial({ map: faceTex, toneMapped: false }),
    edgeMat,
  ]);
  board.position.y = H / 2;
  const outline = neonFrame(ORANGE, W + 0.08, H + 0.08, 0.025, 3);
  outline.position.set(0, H / 2, 0.05);
  const stripes = canvasTexture(1024, 128, (c, w, h) => {
    c.fillStyle = ICE; c.fillRect(0, 0, w, h);
    c.fillStyle = '#100c2a';
    for (let x = -h; x < w + h; x += 160) { c.beginPath(); c.moveTo(x, h); c.lineTo(x + 80, h); c.lineTo(x + 80 + h, 0); c.lineTo(x + h, 0); c.fill(); }
  }, maxAniso);
  const stripeMat = new MeshBasicMaterial({ map: stripes, toneMapped: false });
  const stickMat = [edgeMat, edgeMat, edgeMat, edgeMat, stripeMat, stripeMat];
  const lower = new Mesh(new BoxGeometry(W, 0.3, 0.09), stickMat);
  lower.position.y = H + 0.15;
  const hinge = new Group();
  hinge.position.set(-W / 2, H + 0.3, 0);
  const upper = new Mesh(new BoxGeometry(W, 0.3, 0.09), stickMat);
  upper.position.set(W / 2, 0.15, 0);
  hinge.add(upper);
  g.add(board, outline, lower, hinge, glowPool(ORANGE, 4.2, 2.4, 0.5));
  return { group: g, hinge };
}

// Night sky dome: deep indigo above, a violet glow along the horizon.
function buildSky() {
  return new Mesh(new SphereGeometry(95, 32, 16), new ShaderMaterial({
    side: BackSide, depthWrite: false, fog: false,
    uniforms: { uTop: { value: new Color(SKY_TOP) }, uHorizon: { value: new Color(HORIZON) }, uGlow: { value: new Color(CYAN) } },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uGlow; varying vec3 vDir;
      void main(){ float h = vDir.y; vec3 c = mix(uHorizon, uTop, smoothstep(-0.02, 0.5, h));
      c += uGlow * 0.03 * smoothstep(0.0, 0.06, h) * exp(-h * 18.0);
      gl_FragColor = vec4(c, 1.0); }`,
  }));
}

/* ── Mount ────────────────────────────────────────────────────────── */
export async function mountStudio({ canvas, progress, works = [], photos = [], word = 'BATEN', name = 'Baten', reducedMotion = false, onReady, onLost, onPhase }) {
  // Lettering is painted into textures and particles, so wait (briefly) for the fonts.
  try {
    await Promise.race([
      Promise.all([document.fonts.load(`900 80px ${DISPLAY}`), document.fonts.load(`800 80px ${DISPLAY}`), document.fonts.load(`600 40px ${BODY}`)]),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  } catch { /* fonts API unavailable */ }
  const small = Math.min(window.innerWidth, window.innerHeight) < 720;
  let renderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  } catch (e) {
    console.warn('WebGL unavailable', e);
    return null;
  }
  const maxDpr = small ? 1.5 : 1.75;
  let dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
  renderer.setPixelRatio(dpr);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = SRGBColorSpace;
  const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const hq = !small;

  const scene = new Scene();
  scene.background = new Color(SKY_TOP);
  scene.fog = new Fog(FOG, 9, 32);
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.22;
  scene.add(new HemisphereLight('#6a58ff', '#0b0820', 0.7));
  const key = new DirectionalLight('#9fefff', 1.1);
  key.position.set(-6, 9, 6);
  const rim = new DirectionalLight('#ffa040', 0.9);
  rim.position.set(7, 5, -6);
  scene.add(key, rim);

  const camera = new PerspectiveCamera(36, 1, 0.05, 200);
  const sky = buildSky();
  scene.add(sky);

  // Glossy dark floor with a faint violet grid that fades into the fog.
  const floor = new Mesh(new PlaneGeometry(400, 400), new MeshStandardMaterial({ color: FLOOR, roughness: 0.28, metalness: 0.6 }));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  const grid = new GridHelper(240, 160, VIOLET, VIOLET);
  grid.material.transparent = true; grid.material.opacity = 0.14; grid.material.depthWrite = false;
  grid.position.y = 0.003;
  scene.add(grid);

  const loader = new TextureLoader();
  const loadTex = (src) => { const t = loader.load(src); t.colorSpace = SRGBColorSpace; t.anisotropy = maxAniso; return t; };

  /* Scene 0 — noise to film */
  const ORIGIN = new Vector3(0, 2.7, 0);
  const N = small ? 14000 : 30000;
  const opening = await buildOpening({ N, word, works, frameH: 5.2, wordW: 4.8, reducedMotion });
  opening.points.position.copy(ORIGIN);
  scene.add(opening.points);
  const openingPool = glowPool(CYAN, 9, 5, 0.25);
  openingPool.position.set(0, 0.006, 0.4);
  scene.add(openingPool);

  /* Scene 1 — portraits */
  const ABOUT = new Vector3(3.6, 2.3, -17);
  const prints = [];
  photos.slice(0, 2).forEach((p, i) => {
    const glow = i ? ORANGE : CYAN;
    const print = buildPrint(loadTex(p.src), 1.5, 2.25, glow);
    prints.push(print);
    print.position.set(ABOUT.x - 0.9 + i * 2.1, 2.3 + (i ? 0.3 : 0), ABOUT.z - i * 1.2);
    print.rotation.y = -0.32 - i * 0.14;
    scene.add(print);
    const pool = glowPool(glow, 2.2, 1.6, 0.4); pool.position.set(print.position.x, 0.006, print.position.z + 0.4);
    scene.add(pool);
  });

  /* Scene 2 — monitors */
  const WORK = new Vector3(4.0, 2.3, -34);
  const monitorGlow = [CYAN, ORANGE, LIME];
  const monitors = works.slice(0, 3).map((w, i) => {
    const m = buildMonitor(loadTex(w.poster), monitorGlow[i % 3]);
    const a = (i - 1) * 0.42;
    m.group.position.set(WORK.x + Math.sin(a) * 4.4, 0, WORK.z + 1.6 - Math.cos(a) * 1.6);
    m.group.rotation.y = -a * 0.85 - 0.18;
    scene.add(m.group);
    let video = null, tex = null, blocked = false;
    return {
      ...m,
      play() {
        if (!w.loop) return;
        if (!video) {
          video = document.createElement('video');
          Object.assign(video, { muted: true, loop: true, playsInline: true, preload: 'auto', src: w.loop });
          video.setAttribute('muted', '');
          video.setAttribute('playsinline', '');
          tex = new VideoTexture(video);
          tex.colorSpace = SRGBColorSpace;
          video.addEventListener('playing', () => { m.screenMat.map = tex; m.screenMat.needsUpdate = true; }, { once: true });
        }
        if (video.paused && !blocked) video.play().catch(() => { blocked = true; });
      },
      pause() { if (video && !video.paused) video.pause(); },
    };
  });

  /* Scene 3 — neon lighting rig over a product */
  const SERV = new Vector3(3.6, 2.2, -51);
  const rig = new Group();
  const pipeMat = new MeshStandardMaterial({ color: '#b8b4e0', roughness: 0.2, metalness: 1 });
  for (const z of [-1.2, 1.2]) {
    const pipe = new Mesh(new CylinderGeometry(0.04, 0.04, 9, 12), pipeMat);
    pipe.rotation.z = Math.PI / 2; pipe.position.set(0, 4.6, z);
    rig.add(pipe);
  }
  const faces = [ICE, CYAN, ORANGE, ICE, LIME, CYAN];
  const softboxes = faces.map((f, i) => {
    const sb = buildSoftbox(f);
    const col = i % 3, row = Math.floor(i / 3);
    sb.position.set(-2.4 + col * 2.4, 3.75 - row * 0.2, -1.2 + row * 2.4);
    const hanger = new Mesh(new CylinderGeometry(0.018, 0.018, 0.7, 6), pipeMat);
    hanger.position.set(sb.position.x, 4.3, sb.position.z);
    rig.add(sb, hanger);
    return sb;
  });
  rig.position.copy(SERV).setY(0);
  scene.add(rig);
  const PRODUCT = new Vector3(SERV.x, 1.25, SERV.z + 0.4);
  const pedestal = new Mesh(new CylinderGeometry(0.62, 0.66, 1.0, 64), new MeshStandardMaterial({ color: '#1a1544', roughness: 0.25, metalness: 0.6 }));
  pedestal.position.set(PRODUCT.x, 0.5, PRODUCT.z);
  const pedRing = new Mesh(new TorusGeometry(0.625, 0.016, 8, 96), neon(CYAN, 3.5));
  pedRing.rotation.x = Math.PI / 2; pedRing.position.set(PRODUCT.x, 1.0, PRODUCT.z);
  const sphere = new Mesh(new SphereGeometry(0.38, 64, 32), new MeshStandardMaterial({ color: '#ffffff', roughness: 0.04, metalness: 1, envMapIntensity: 3 }));
  sphere.position.set(PRODUCT.x - 0.2, 1.38, PRODUCT.z + 0.08);
  const cube = new Mesh(new BoxGeometry(0.46, 0.46, 0.46), new MeshPhysicalMaterial({
    color: ORANGE, emissive: ORANGE, emissiveIntensity: 0.55, roughness: 0.1, metalness: 0,
    transmission: hq ? 0.6 : 0, thickness: 0.4, ior: 1.45, clearcoat: 1,
  }));
  cube.position.set(PRODUCT.x + 0.3, 1.23, PRODUCT.z - 0.12);
  cube.rotation.set(0.2, 0.6, 0);
  const pedPool = glowPool(CYAN, 4.2, 4.2, 0.5);
  pedPool.position.set(PRODUCT.x, 0.006, PRODUCT.z);
  scene.add(pedestal, pedRing, sphere, cube, pedPool);
  rig.updateMatrixWorld(true);
  softboxes.forEach((sb) => { sb.scale.setScalar(0.78); sb.lookAt(PRODUCT); });

  /* Scene 4 — dolly track */
  const track = buildTrackAndMarks();
  const TRACK_Z = -72;
  track.group.position.set(2.4, 0, TRACK_Z);
  scene.add(track.group);
  const PROC = new Vector3(3.2, 0.3, TRACK_Z + 4);

  /* Scene 5 — clapperboard */
  const clap = buildClapper({ name, maxAniso });
  const CONTACT = new Vector3(5.0, 1.5, -96);
  clap.group.position.set(CONTACT.x, 0, CONTACT.z);
  clap.group.rotation.set(0, -0.42, 0);
  clap.group.children[0].rotation.x = -0.06;
  scene.add(clap.group);

  /* ── Glow (bloom) ──────────────────────────────────────────────── */
  const rt = new WebGLRenderTarget(1, 1, { type: HalfFloatType, samples: hq ? 4 : 2 });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new Vector2(256, 256), small ? 0.75 : 0.95, 0.55, 0.92);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  let useBloom = true;

  /* ── Camera path ───────────────────────────────────────────────── */
  const STOPS = [
    { pos: ORIGIN.clone().add(new Vector3(-0.3, 0.2, 9.4)), subject: ORIGIN.clone() },
    { pos: new Vector3(0.6, 1.9, -8.5), subject: ABOUT.clone() },
    { pos: new Vector3(0.6, 2.0, -22.0), subject: WORK.clone() },
    { pos: new Vector3(-2.0, 1.45, -41.0), subject: SERV.clone() },
    { pos: new Vector3(0.0, 2.6, TRACK_Z + 13.0), subject: PROC.clone() },
    { pos: new Vector3(1.2, 1.75, -87.5), subject: CONTACT.clone() },
  ];
  // Straight through the particle field, then on into the studio.
  const through = [
    ORIGIN.clone().add(new Vector3(0, 0, 4.0)),
    ORIGIN.clone().add(new Vector3(0.1, -0.2, -0.5)),
    ORIGIN.clone().add(new Vector3(0.4, -0.5, -5.0)),
  ];
  const basePos = STOPS.map((s) => s.pos.clone());
  const pathPts = [STOPS[0].pos, ...through, ...STOPS.slice(1).map((s) => s.pos)];
  const path = new CatmullRomCurve3(pathPts, false, 'centripetal', 0.5);
  const STOP_INDEX = [0, 4, 5, 6, 7, 8];
  const lastIdx = pathPts.length - 1;
  let portrait = false;
  // Phones: pull every stop back so the subject fits the narrow frame.
  const fitStops = () => STOPS.forEach((s, i) => {
    s.pos.copy(s.subject).addScaledVector(new Vector3().subVectors(basePos[i], s.subject), portrait ? 1.45 : 1);
  });

  const tmpRight = new Vector3(), tmpUp = new Vector3(), tmpDir = new Vector3();
  function framedLook(stop, out) {
    // Desktop: subject right of centre (text panel on the left). Phone: subject in the top half.
    tmpDir.subVectors(stop.subject, stop.pos);
    const dist = tmpDir.length();
    tmpDir.normalize();
    tmpRight.crossVectors(tmpDir, new Vector3(0, 1, 0)).normalize();
    tmpUp.crossVectors(tmpRight, tmpDir).normalize();
    out.copy(stop.subject);
    if (portrait) out.addScaledVector(tmpUp, -dist * 0.24);
    else out.addScaledVector(tmpRight, -dist * Math.tan(MathUtils.degToRad(camera.fov / 2)) * camera.aspect * 0.5);
    return out;
  }
  const looks = STOPS.map(() => new Vector3());
  const refreshLooks = () => STOPS.forEach((s, i) => framedLook(s, looks[i]));

  /* ── Sizing ────────────────────────────────────────────────────── */
  let lastW = 0, lastH = 0, dirty = true;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  function resize(force = false) {
    const w = window.innerWidth, h = window.innerHeight;
    // Phone address bars change the height while scrolling; resizing then causes jank.
    if (!force && coarse && w === lastW && Math.abs(h - lastH) < 150) return;
    lastW = w; lastH = h;
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    composer.setPixelRatio(dpr);
    composer.setSize(w, h);
    camera.aspect = w / h;
    portrait = camera.aspect < 0.85;
    camera.fov = portrait ? 52 : 36;
    camera.updateProjectionMatrix();
    opening.mat.uniforms.uPixelRatio.value = dpr * (h / 900);
    fitStops();
    refreshLooks();
    dirty = true;
  }
  window.addEventListener('resize', () => { resize(); kick(); });

  /* ── Pointer: camera parallax + pushing particles ──────────────── */
  let px = 0, py = 0, tx = 0, ty = 0, lastPointer = -10;
  const ndc = new Vector2(), ray = new Raycaster(), plane = new Plane(), hit = new Vector3(), camDir = new Vector3();
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse') {
      tx = e.clientX / window.innerWidth - 0.5;
      ty = e.clientY / window.innerHeight - 0.5;
    }
    ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    lastPointer = elapsed;
  }, { passive: true });
  window.addEventListener('pointerdown', (e) => {
    ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    lastPointer = elapsed;
  }, { passive: true });

  /* ── Frame loop ────────────────────────────────────────────────── */
  let shown = progress();
  let last = performance.now(), elapsed = 0, frames = 0, slowFrames = 0, readyFired = false;
  let clapState = 0, clapT = 0;
  const camPos = new Vector3(), camLook = new Vector3(), ahead = new Vector3(), lookA = new Vector3();

  function pose(p) {
    const i = Math.min(Math.floor(p), STOPS.length - 2);
    const t = MathUtils.clamp(p - i, 0, 1);
    const e = smoother(t);
    const a = STOP_INDEX[i], b = STOP_INDEX[i + 1];
    const idx = a + (b - a) * (i === 0 ? smoother(smooth(0, 1, t)) : e);
    path.getPoint(idx / lastIdx, camPos);
    lookA.lerpVectors(looks[i], looks[i + 1], e);
    path.getPoint(Math.min(idx + 0.6, lastIdx) / lastIdx, ahead);
    const travel = Math.sin(Math.PI * t);
    const w = i === 0 ? smooth(0.08, 0.3, t) * (1 - smooth(0.78, 0.98, t)) : travel * 0.55;
    camLook.lerpVectors(lookA, ahead, w);
  }

  function frame(now) {
    raf = 0;
    const dt = MathUtils.clamp((now - last) / 1000, 0, 0.25);
    last = now;
    elapsed += dt;

    const target = progress();
    shown = reducedMotion ? Math.round(target) : shown + (target - shown) * (1 - Math.exp(-dt * 4.5));
    pose(shown);
    if (!reducedMotion) {
      const k = 1 - Math.exp(-dt * 2.5);
      px += (tx - px) * k; py += (ty - py) * k;
      camPos.x += px * 0.35; camPos.y -= py * 0.22;
    }
    camera.position.copy(camPos);
    camera.lookAt(camLook);
    sky.position.copy(camera.position);

    // Opening particles
    const u = opening.mat.uniforms;
    const nearHero = shown < 1.05;
    opening.points.visible = nearHero;
    if (nearHero) {
      if (!reducedMotion) { u.uTime.value = elapsed; opening.update(dt, onPhase); }
      u.uScatter.value = reducedMotion ? (shown > 0.5 ? 1 : 0) : smooth(0.04, 0.75, shown);
      opening.points.rotation.y = reducedMotion ? -0.12 : -0.12 + Math.sin(elapsed * 0.25) * 0.12 + px * 0.25;
      // Pointer → a point on the particle plane, in the field's own coordinates.
      const active = !reducedMotion && elapsed - lastPointer < 1.4;
      u.uMouseK.value += ((active ? 1 : 0) - u.uMouseK.value) * Math.min(1, dt * 4);
      if (active) {
        camera.getWorldDirection(camDir);
        plane.setFromNormalAndCoplanarPoint(camDir.negate(), ORIGIN);
        ray.setFromCamera(ndc, camera);
        if (ray.ray.intersectPlane(plane, hit)) u.uMouse.value.copy(opening.points.worldToLocal(hit));
      }
    }
    openingPool.visible = nearHero;
    prints.forEach((pr) => { pr.visible = shown > 0.4; });

    const nearWork = Math.abs(shown - 2) < 1.1;
    monitors.forEach((m) => (nearWork && !reducedMotion ? m.play() : m.pause()));
    if (!reducedMotion) cube.rotation.y = 0.6 + elapsed * 0.3;

    const dz = MathUtils.clamp((shown - 3.4) / 1.4, 0, 1);
    track.dolly.position.z = track.trackLength / 2 - 3 - dz * (track.trackLength - 8);

    if (shown > 4.65 && clapState === 0 && !reducedMotion) { clapState = 1; clapT = 0; }
    if (shown < 4.2 && clapState === 2) clapState = 0;
    if (clapState === 1) {
      clapT += dt;
      const open = clapT < 0.45 ? 0.5 : clapT < 0.55 ? MathUtils.lerp(0.5, 0, (clapT - 0.45) / 0.1) : clapT < 1.1 ? 0 : MathUtils.lerp(0, 0.32, Math.min(1, (clapT - 1.1) / 0.6));
      clap.hinge.rotation.z = open;
      if (clapT > 1.8) clapState = 2;
    } else if (clapState === 0) {
      clap.hinge.rotation.z = reducedMotion ? 0.32 : 0.5;
    }

    if (useBloom) composer.render(dt); else renderer.render(scene, camera);
    dirty = false;
    if (!readyFired) { readyFired = true; onReady?.(); onPhase?.(opening.labelNow()); }

    // Adaptive quality: lower resolution first, then drop the glow pass, then halve the particles.
    frames++;
    if (dt > 0.028) slowFrames++;
    if (frames === 90) {
      if (slowFrames > 45) {
        if (dpr > 1) { dpr = Math.max(1, dpr - 0.35); resize(true); }
        else if (useBloom) useBloom = false;
        else opening.points.geometry.setDrawRange(0, (N / 2) | 0);
      }
      frames = 0; slowFrames = 0;
    }

    const settling = Math.abs(target - shown) > 0.0005;
    const pointerMoving = Math.abs(tx - px) + Math.abs(ty - py) > 0.002;
    const busy = settling || dirty || clapState === 1 || pointerMoving || ((nearWork || nearHero) && !reducedMotion);
    idle = busy ? 0 : idle + dt;
    if (!document.hidden && (reducedMotion ? busy : idle < 2)) raf = requestAnimationFrame(frame);
  }

  let raf = 0, idle = 0;
  const kick = () => { if (!raf && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } };
  window.addEventListener('scroll', kick, { passive: true });
  window.addEventListener('pointermove', kick, { passive: true });
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); cancelAnimationFrame(raf); raf = 0; onLost?.(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) monitors.forEach((m) => m.pause());
    else kick();
  });

  resize(true);
  kick();
  return { renderer, scene, camera };
}
