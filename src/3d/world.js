/**
 * THE LIGHT STAGE — the 3D studio behind optiobyte.com
 * ------------------------------------------------------------------
 * A white infinity-cove studio. Scroll position (0…5, one unit per page
 * scene) drives a camera that starts in front of a cinema lens, flies
 * through its opening iris, and moves on to: framed portraits (About),
 * three monitors playing the commercials (Work), a lighting rig
 * (Services), a dolly track with four tape marks (Process) and a
 * clapperboard (Contact).
 *
 * Source file. The browser loads src/app/world.bundle.js — rebuild with
 * `npm run build:3d` after editing.
 */
import {
  WebGLRenderer, Scene, Color, Fog, PerspectiveCamera, ACESFilmicToneMapping, SRGBColorSpace, PMREMGenerator,
  HemisphereLight, DirectionalLight, Group, Mesh, PlaneGeometry, BoxGeometry, CylinderGeometry, TorusGeometry,
  SphereGeometry, LatheGeometry, RingGeometry, CircleGeometry, MeshStandardMaterial, MeshPhysicalMaterial,
  MeshBasicMaterial, CanvasTexture, TextureLoader, VideoTexture, Vector2, Vector3, CatmullRomCurve3, MathUtils,
  DoubleSide, RepeatWrapping,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const CYC = new Color('#edeff1');
const FLOOR = '#e4e7eb';
const INK = '#16181c';
const GEL = '#e5226f';
const TAPE = ['#e5226f', '#f2b705', '#1fa3dc', '#22b06b'];   // real gaffer-tape colours, one per process step

const smooth = (a, b, x) => { const t = MathUtils.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const smoother = (t) => t * t * t * (t * (t * 6 - 15) + 10);

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

// Soft contact shadow: a blurred dark ellipse on the floor.
let shadowTex;
function contactShadow(w, d, opacity = 0.32) {
  shadowTex ||= canvasTexture(128, 128, (g, W, H) => {
    const r = g.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W / 2);
    r.addColorStop(0, 'rgba(0,0,0,1)'); r.addColorStop(0.45, 'rgba(0,0,0,0.55)'); r.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = r; g.fillRect(0, 0, W, H);
  });
  const m = new Mesh(new PlaneGeometry(w, d), new MeshBasicMaterial({ color: 0x0b0d10, alphaMap: shadowTex, transparent: true, opacity, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.004;
  m.renderOrder = 1;
  return m;
}

const DISPLAY = '"Big Shoulders Display", "Arial Narrow", Impact, sans-serif';
const BODY = '"Schibsted Grotesk", Arial, sans-serif';

/* ── The lens ─────────────────────────────────────────────────────── */
function buildLens({ engraving, hq, maxAniso }) {
  const g = new Group();
  const anodized = new MeshStandardMaterial({ color: '#1a1c21', roughness: 0.38, metalness: 0.6 });
  const chrome = new MeshStandardMaterial({ color: '#dfe3e8', roughness: 0.16, metalness: 1 });

  // Barrel: one lathed profile (radius, axial y), closed so it reads as solid metal.
  const pts = [
    [0.80, -1.42], [0.88, -1.42], [0.88, -1.26], [0.99, -1.20], [0.99, -0.72], [1.03, -0.68],
    [1.03, 0.84], [1.10, 0.90], [1.17, 1.12], [1.17, 1.40], [1.08, 1.45],
    [1.00, 1.45], [0.93, 1.30], [0.93, -1.30], [0.80, -1.34],
  ].map(([x, y]) => new Vector2(x, y));
  g.add(new Mesh(new LatheGeometry(pts, 128), anodized));

  // Focus ring with a real focus scale (metres), grip ribs and the index line.
  const focusTex = canvasTexture(2048, 256, (c, W, H) => {
    c.fillStyle = '#1b1d22'; c.fillRect(0, 0, W, H);
    for (let x = 0; x < W; x += 10) { c.fillStyle = x % 20 ? '#15171b' : '#26292f'; c.fillRect(x, H * 0.62, 6, H * 0.38); }
    c.fillStyle = '#f2f3f5'; c.textAlign = 'center'; c.font = `600 54px ${BODY}`;
    const marks = ['∞', '10', '5', '3', '2', '1.5', '1.2', '1', '0.8', '0.6 m'];
    marks.forEach((m, i) => {
      const x = 120 + i * 110;
      c.fillText(m, x, 92);
      c.fillRect(x - 2, 112, 4, 26);
    });
    c.font = `500 40px ${BODY}`; c.fillStyle = '#9aa1ab';
    ['30', '15', '10', '7', '5', '4', '3', '2.5'].forEach((m, i) => c.fillText(m + "'", 1300 + i * 92, 92));
  }, maxAniso);
  focusTex.wrapS = RepeatWrapping;
  const focus = new Mesh(new CylinderGeometry(1.06, 1.06, 0.9, 128, 1, true), new MeshStandardMaterial({ map: focusTex, roughness: 0.55, metalness: 0.35 }));
  focus.position.y = 0.02;
  g.add(focus);

  // Front name ring: the engraving, repeated around the barrel.
  const nameTex = canvasTexture(2048, 128, (c, W, H) => {
    c.fillStyle = '#121418'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#eef0f3'; c.font = `800 74px ${DISPLAY}`; c.textBaseline = 'middle';
    const t = `${engraving}   ●   `;
    const tw = c.measureText(t).width;
    for (let x = 0; x < W + tw; x += tw) c.fillText(t, x, H / 2 + 2);
  }, maxAniso);
  nameTex.wrapS = RepeatWrapping;
  const nameRing = new Mesh(new CylinderGeometry(1.175, 1.175, 0.24, 128, 1, true), new MeshStandardMaterial({ map: nameTex, roughness: 0.45, metalness: 0.4 }));
  nameRing.position.y = 1.24;
  g.add(nameRing);

  // Gel-coloured band, like the colour rings on cine primes, and a chrome mount.
  const band = new Mesh(new TorusGeometry(1.035, 0.022, 12, 128), new MeshStandardMaterial({ color: GEL, roughness: 0.3, metalness: 0.25, emissive: GEL, emissiveIntensity: 0.25 }));
  band.rotation.x = Math.PI / 2; band.position.y = -0.62;
  g.add(band);
  const mount = new Mesh(new TorusGeometry(0.84, 0.05, 16, 96), chrome);
  mount.rotation.x = Math.PI / 2; mount.position.y = -1.42;
  g.add(mount);
  const lip = new Mesh(new TorusGeometry(1.125, 0.03, 12, 128), chrome);
  lip.rotation.x = Math.PI / 2; lip.position.y = 1.45;
  g.add(lip);

  // Iris: a 9-sided opening (nine blades) that opens as the camera arrives.
  const irisMat = new MeshStandardMaterial({ color: '#0c0d10', roughness: 0.6, metalness: 0.3, side: DoubleSide });
  const iris = new Mesh(new RingGeometry(0.3, 0.95, 9, 1), irisMat);
  iris.rotation.x = -Math.PI / 2; iris.position.y = 0.35;
  g.add(iris);
  let irisInner = 0.3;
  const setIris = (open) => {               // open: 0 (f/16) … 1 (wide open)
    const r = MathUtils.lerp(0.16, 0.9, open);
    if (Math.abs(r - irisInner) < 0.004) return;
    irisInner = r;
    iris.geometry.dispose();
    iris.geometry = new RingGeometry(r, 0.95, 9, 1);
    iris.rotation.z = open * 0.9;           // blades rotate as they open
  };

  // Front element: a convex glass dome with the magenta-green multicoating sheen.
  const theta = Math.asin(1.0 / 1.6);
  const glassMat = new MeshPhysicalMaterial({
    color: '#ffffff', metalness: 0, roughness: 0.03,
    transmission: hq ? 1 : 0, thickness: 0.5, ior: 1.52,
    transparent: !hq, opacity: hq ? 1 : 0.22,
    iridescence: 1, iridescenceIOR: 1.7, iridescenceThicknessRange: [180, 520],
    clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.6,
  });
  const glass = new Mesh(new SphereGeometry(1.6, 96, 32, 0, Math.PI * 2, 0, theta), glassMat);
  glass.position.y = 1.36 - 1.6 * Math.cos(theta);
  g.add(glass);
  const rear = new Mesh(new CircleGeometry(0.8, 64), new MeshPhysicalMaterial({ color: '#16181f', roughness: 0.08, metalness: 0.3, iridescence: 0.8, iridescenceIOR: 1.6, clearcoat: 1 }));
  rear.rotation.x = -Math.PI / 2; rear.position.y = -1.0;
  g.add(rear);

  return { group: g, setIris, glass };
}

/* ── Studio props ─────────────────────────────────────────────────── */
function buildPrint(tex, w, h) {
  const g = new Group();
  const frame = new Mesh(new BoxGeometry(w + 0.16, h + 0.16, 0.05), new MeshStandardMaterial({ color: '#fbfbfc', roughness: 0.6 }));
  const photo = new Mesh(new PlaneGeometry(w, h), new MeshBasicMaterial({ map: tex, toneMapped: false }));
  photo.position.z = 0.027;
  g.add(frame, photo);
  // two hanging wires up into the grid
  const wireMat = new MeshBasicMaterial({ color: '#8a929c' });
  for (const x of [-w / 2 + 0.1, w / 2 - 0.1]) {
    const wire = new Mesh(new CylinderGeometry(0.006, 0.006, 2.2, 4), wireMat);
    wire.position.set(x, h / 2 + 1.18, 0);
    g.add(wire);
  }
  return g;
}

function buildMonitor(posterTex) {
  const g = new Group();
  const w = 1.6, h = 2.84;
  const dark = new MeshStandardMaterial({ color: INK, roughness: 0.35, metalness: 0.5 });
  const chrome = new MeshStandardMaterial({ color: '#cfd4da', roughness: 0.2, metalness: 1 });
  const base = new Mesh(new CylinderGeometry(0.5, 0.56, 0.06, 48), dark); base.position.y = 0.03;
  const pole = new Mesh(new CylinderGeometry(0.035, 0.035, 0.9, 16), chrome); pole.position.y = 0.48;
  const bezel = new Mesh(new BoxGeometry(w + 0.1, h + 0.1, 0.09), dark); bezel.position.y = 0.92 + h / 2;
  const screenMat = new MeshBasicMaterial({ map: posterTex, toneMapped: false });
  const screen = new Mesh(new PlaneGeometry(w, h), screenMat); screen.position.set(0, 0.92 + h / 2, 0.047);
  g.add(base, pole, bezel, screen, contactShadow(1.7, 1.7, 0.3));
  return { group: g, screenMat };
}

function buildSoftbox(face) {
  // A real softbox: rectangular diffuser, fabric body tapering back to a speed ring.
  const g = new Group();
  const fabric = new MeshStandardMaterial({ color: '#1d2025', roughness: 0.85, metalness: 0.05 });
  const body = new Mesh(new CylinderGeometry(0.78, 0.2, 0.75, 4, 1, true), fabric);
  body.rotation.set(Math.PI / 2, Math.PI / 4, 0);
  body.scale.set(1.25, 1, 0.82);
  body.position.z = -0.37;
  const ring = new Mesh(new TorusGeometry(0.16, 0.035, 8, 24), new MeshStandardMaterial({ color: '#c3c9d0', roughness: 0.25, metalness: 1 }));
  ring.position.z = -0.76;
  const diffuser = new Mesh(new PlaneGeometry(1.36, 0.88), new MeshBasicMaterial({ color: face, toneMapped: false }));
  const rim = new Mesh(new BoxGeometry(1.44, 0.96, 0.03), fabric);
  rim.position.z = -0.02;
  g.add(body, ring, rim, diffuser);
  return g;
}

function buildTrackAndMarks() {
  const g = new Group();
  const railMat = new MeshStandardMaterial({ color: '#c9ced5', roughness: 0.22, metalness: 1 });
  const sleeperMat = new MeshStandardMaterial({ color: '#3a3f47', roughness: 0.7 });
  const L = 26;
  for (const x of [-0.34, 0.34]) {
    const rail = new Mesh(new BoxGeometry(0.05, 0.05, L), railMat);
    rail.position.set(x, 0.07, 0);
    g.add(rail);
  }
  for (let z = -L / 2 + 0.3; z < L / 2; z += 0.62) {
    const s = new Mesh(new BoxGeometry(0.98, 0.04, 0.12), sleeperMat);
    s.position.set(0, 0.025, z);
    g.add(s);
  }
  g.add(contactShadow(1.6, L + 1, 0.18));

  // The dolly: a low platform on the rails with a tripod head.
  const dolly = new Group();
  const deck = new Mesh(new BoxGeometry(1.1, 0.12, 1.4), new MeshStandardMaterial({ color: '#2a2e35', roughness: 0.5, metalness: 0.4 }));
  deck.position.y = 0.22;
  const column = new Mesh(new CylinderGeometry(0.07, 0.09, 0.9, 16), railMat); column.position.y = 0.72;
  const cam = new Mesh(new BoxGeometry(0.42, 0.34, 0.62), new MeshStandardMaterial({ color: INK, roughness: 0.4, metalness: 0.5 }));
  cam.position.y = 1.32;
  const lens = new Mesh(new CylinderGeometry(0.12, 0.14, 0.34, 32), new MeshStandardMaterial({ color: '#1a1c21', roughness: 0.4, metalness: 0.6 }));
  lens.rotation.x = Math.PI / 2; lens.position.set(0, 1.32, -0.46);
  const tally = new Mesh(new SphereGeometry(0.03, 12, 8), new MeshBasicMaterial({ color: GEL, toneMapped: false }));
  tally.position.set(0.16, 1.52, -0.2);
  dolly.add(deck, column, cam, lens, tally, contactShadow(1.5, 1.8, 0.35));
  g.add(dolly);

  // Tape marks: one T per step, with its number, beside the track.
  const marks = [];
  TAPE.forEach((color, i) => {
    const m = new Group();
    const tapeMat = new MeshBasicMaterial({ color });
    const bar = new Mesh(new PlaneGeometry(0.62, 0.09), tapeMat);
    const stem = new Mesh(new PlaneGeometry(0.09, 0.42), tapeMat);
    stem.position.y = -0.25;
    const num = new Mesh(new PlaneGeometry(0.8, 1.0), new MeshBasicMaterial({
      map: canvasTexture(128, 160, (c, W, H) => { c.fillStyle = color; c.font = `900 150px ${DISPLAY}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(i + 1), W / 2, H / 2 + 8); }),
      transparent: true, depthWrite: false,
    }));
    num.position.set(0.75, -0.12, 0);
    m.add(bar, stem, num);
    m.rotation.x = -Math.PI / 2;
    m.scale.setScalar(1.5);
    m.position.set(1.45, 0.006, L / 2 - 8.0 - i * 3.3);   // step 1 nearest the camera
    g.add(m);
    marks.push(m);
  });
  return { group: g, dolly, trackLength: L };
}

function buildClapper({ name, maxAniso }) {
  const g = new Group();
  const W = 2.6, H = 1.9;
  const faceTex = canvasTexture(1040, 760, (c, w, h) => {
    c.fillStyle = '#141619'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#e9ecef'; c.lineWidth = 5;
    const rows = [0, 210, 400, 580, h];
    rows.slice(1, -1).forEach((y) => { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); });
    [[400, 210, 400], [700, 210, 400], [520, 400, 580]].forEach(([x, y0, y1]) => { c.beginPath(); c.moveTo(x, y0); c.lineTo(x, y1); c.stroke(); });
    c.fillStyle = '#9aa1ab'; c.font = `600 30px ${BODY}`;
    c.fillText('PROD.', 24, 44); c.fillText('ROLL', 24, 254); c.fillText('SCENE', 424, 254); c.fillText('TAKE', 724, 254);
    c.fillText('DIRECTOR', 24, 444); c.fillText('CAMERA', 544, 444); c.fillText('DATE', 24, 624);
    c.fillStyle = '#f4f5f7'; c.font = `800 120px ${DISPLAY}`;
    c.fillText('YOUR BRAND', 24, 170);
    c.font = `800 110px ${DISPLAY}`;
    c.fillText('A001', 24, 370); c.fillText('1', 424, 370); c.fillText('1', 724, 370);
    c.font = `800 92px ${DISPLAY}`;
    c.fillText(name.split(' ').slice(-1)[0].toUpperCase(), 24, 548); c.fillText('A CAM', 544, 548);
    c.font = `800 82px ${DISPLAY}`; c.fillStyle = GEL;
    c.fillText('TODAY', 24, 720);
  }, maxAniso);
  const board = new Mesh(new BoxGeometry(W, H, 0.08), [
    ...Array(4).fill(new MeshStandardMaterial({ color: '#141619', roughness: 0.5 })),
    new MeshStandardMaterial({ map: faceTex, roughness: 0.45 }),
    new MeshStandardMaterial({ color: '#141619', roughness: 0.5 }),
  ]);
  board.position.y = H / 2;
  const stripes = canvasTexture(1024, 128, (c, w, h) => {
    c.fillStyle = '#f5f6f8'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#141619';
    for (let x = -h; x < w + h; x += 160) { c.beginPath(); c.moveTo(x, h); c.lineTo(x + 80, h); c.lineTo(x + 80 + h, 0); c.lineTo(x + h, 0); c.fill(); }
  }, maxAniso);
  const stickMat = [
    ...Array(4).fill(new MeshStandardMaterial({ color: '#141619', roughness: 0.4 })),
    new MeshStandardMaterial({ map: stripes, roughness: 0.4 }),
    new MeshStandardMaterial({ map: stripes, roughness: 0.4 }),
  ];
  const lower = new Mesh(new BoxGeometry(W, 0.3, 0.09), stickMat);
  lower.position.y = H + 0.15;
  const hinge = new Group();
  hinge.position.set(-W / 2, H + 0.3, 0);
  const upper = new Mesh(new BoxGeometry(W, 0.3, 0.09), stickMat);
  upper.position.set(W / 2, 0.15, 0);
  hinge.add(upper);
  g.add(board, lower, hinge, contactShadow(3.2, 1.2, 0.35));
  return { group: g, hinge };
}

/* ── Mount ────────────────────────────────────────────────────────── */
export async function mountStudio({ canvas, progress, works = [], photos = [], engraving = 'BATEN', name = 'Baten', reducedMotion = false, onReady, onLost }) {
  // Lettering on the lens, tape marks and slate is painted into textures, so wait
  // (briefly) for the display font; fall back to system fonts after 2.5s.
  try {
    await Promise.race([
      Promise.all([document.fonts.load(`800 80px ${DISPLAY}`), document.fonts.load(`600 40px ${BODY}`)]),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  } catch { /* fonts API unavailable */ }
  const small = Math.min(window.innerWidth, window.innerHeight) < 720;
  let renderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch (e) {
    console.warn('WebGL unavailable', e);
    return null;
  }
  const maxDpr = small ? 1.5 : 1.75;
  let dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
  renderer.setPixelRatio(dpr);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.outputColorSpace = SRGBColorSpace;
  const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const hq = !small;

  const scene = new Scene();
  scene.background = CYC;
  scene.fog = new Fog(CYC, 10, 30);
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.85;
  scene.add(new HemisphereLight('#ffffff', '#d9dee4', 0.9));
  const key = new DirectionalLight('#fff6ec', 1.6);
  key.position.set(-6, 10, 6);
  scene.add(key);

  const camera = new PerspectiveCamera(36, 1, 0.05, 120);

  // Floor: the sweep of the infinity cove. Fog matches the wall colour, so the
  // studio dissolves into white in every direction.
  const floor = new Mesh(new PlaneGeometry(400, 400), new MeshStandardMaterial({ color: FLOOR, roughness: 0.42, metalness: 0 }));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const loader = new TextureLoader();
  const loadTex = (src) => { const t = loader.load(src); t.colorSpace = SRGBColorSpace; t.anisotropy = maxAniso; return t; };

  /* Scene 0 — the lens */
  const LENS_POS = new Vector3(0, 2.0, 0);
  const lens = buildLens({ engraving, hq, maxAniso });
  lens.group.position.copy(LENS_POS);
  lens.group.rotation.set(Math.PI / 2, 0, 0);          // optical axis → +z, toward the camera
  const lensPivot = new Group();
  lensPivot.position.copy(LENS_POS);
  lens.group.position.set(0, 0, 0);
  lensPivot.add(lens.group);
  lensPivot.rotation.y = -0.62;                          // three-quarter view
  scene.add(lensPivot);
  const lensShadow = contactShadow(3.6, 3.6, 0.22);
  lensShadow.position.set(0, 0.004, 0);
  scene.add(lensShadow);
  const axis = new Vector3(0, 0, 1).applyAxisAngle(new Vector3(0, 1, 0), lensPivot.rotation.y);

  /* Scene 1 — portraits */
  const ABOUT = new Vector3(3.6, 2.3, -17);
  const prints = [];
  photos.slice(0, 2).forEach((p, i) => {
    const print = buildPrint(loadTex(p.src), 1.5, 2.25);
    prints.push(print);
    print.position.set(ABOUT.x - 0.9 + i * 2.1, 2.3 + (i ? 0.3 : 0), ABOUT.z - i * 1.2);
    print.rotation.y = -0.32 - i * 0.14;
    scene.add(print);
    const sh = contactShadow(1.4, 0.6, 0.12); sh.position.set(print.position.x, 0.004, print.position.z + 0.2);
    scene.add(sh);
  });

  /* Scene 2 — monitors */
  const WORK = new Vector3(4.0, 2.3, -34);
  const monitors = works.slice(0, 3).map((w, i) => {
    const m = buildMonitor(loadTex(w.poster));
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

  /* Scene 3 — the lighting rig */
  const SERV = new Vector3(3.6, 2.2, -51);
  const rig = new Group();
  const pipeMat = new MeshStandardMaterial({ color: '#b9bfc7', roughness: 0.25, metalness: 1 });
  for (const z of [-1.2, 1.2]) {
    const pipe = new Mesh(new CylinderGeometry(0.04, 0.04, 9, 12), pipeMat);
    pipe.rotation.z = Math.PI / 2; pipe.position.set(0, 4.6, z);
    rig.add(pipe);
  }
  const faces = ['#ffffff', '#fff3e4', GEL, '#ffffff', '#e8f1ff', '#fff3e4'];
  const softboxes = faces.map((f, i) => {
    const sb = buildSoftbox(f);
    const col = i % 3, row = Math.floor(i / 3);
    sb.position.set(-2.4 + col * 2.4, 3.75 - row * 0.2, -1.2 + row * 2.4);
    sb.rotation.x = 0.5 + row * 0.08;
    sb.rotation.y = -0.55 + (col - 1) * -0.12;   // turned toward the camera so the pyramid bodies read
    const hanger = new Mesh(new CylinderGeometry(0.018, 0.018, 0.7, 6), pipeMat);
    hanger.position.set(sb.position.x, 4.3, sb.position.z);
    rig.add(sb, hanger);
    return sb;
  });
  rig.position.copy(SERV).setY(0);
  scene.add(rig);

  // What the lights are for: a product on a pedestal, every softbox aimed at it.
  const PRODUCT = new Vector3(SERV.x, 1.25, SERV.z + 0.4);
  const pedestal = new Mesh(new CylinderGeometry(0.62, 0.66, 1.0, 64), new MeshStandardMaterial({ color: '#c9ced5', roughness: 0.5 }));
  pedestal.position.set(PRODUCT.x, 0.5, PRODUCT.z);
  const sphere = new Mesh(new SphereGeometry(0.38, 64, 32), new MeshStandardMaterial({ color: '#e6e9ed', roughness: 0.05, metalness: 1 }));
  sphere.position.set(PRODUCT.x - 0.2, 1.38, PRODUCT.z + 0.08);
  const cube = new Mesh(new BoxGeometry(0.46, 0.46, 0.46), new MeshPhysicalMaterial({
    color: GEL, roughness: 0.08, metalness: 0, transmission: hq ? 0.85 : 0, thickness: 0.4, ior: 1.45,
    transparent: !hq, opacity: hq ? 1 : 0.85, clearcoat: 1,
  }));
  cube.position.set(PRODUCT.x + 0.3, 1.23, PRODUCT.z - 0.12);
  cube.rotation.set(0.2, 0.6, 0);
  const pedShadow = contactShadow(2.6, 2.6, 0.45);
  pedShadow.position.set(PRODUCT.x, 0.004, PRODUCT.z);
  scene.add(pedestal, sphere, cube, pedShadow);
  rig.updateMatrixWorld(true);
  softboxes.forEach((sb) => { sb.scale.setScalar(0.78); sb.lookAt(PRODUCT); });
  const pool = new Mesh(new CircleGeometry(4.5, 64), new MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.6, depthWrite: false }));
  pool.rotation.x = -Math.PI / 2; pool.position.set(SERV.x, 0.003, SERV.z + 1);
  scene.add(pool);

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

  /* ── Camera path ──────────────────────────────────────────────────
     Stops: where the camera rests while each page scene is centred. */
  const STOPS = [
    { pos: LENS_POS.clone().add(new Vector3(-0.4, 0.5, 8.6)), subject: LENS_POS.clone() },
    { pos: new Vector3(0.6, 1.9, -8.5), subject: ABOUT.clone() },
    { pos: new Vector3(0.6, 2.0, -22.0), subject: WORK.clone() },
    { pos: new Vector3(-2.0, 1.45, -41.0), subject: SERV.clone() },
    { pos: new Vector3(0.0, 2.6, TRACK_Z + 13.0), subject: PROC.clone() },
    { pos: new Vector3(1.2, 1.75, -87.5), subject: CONTACT.clone() },
  ];
  // Through the lens: in front of the glass, the open iris, out the back.
  const through = [
    LENS_POS.clone().addScaledVector(axis, 3.4),
    LENS_POS.clone().addScaledVector(axis, 0.3),
    LENS_POS.clone().addScaledVector(axis, -3.2),
  ];
  const basePos = STOPS.map((s) => s.pos.clone());
  const pathPts = [STOPS[0].pos, ...through, ...STOPS.slice(1).map((s) => s.pos)];
  const path = new CatmullRomCurve3(pathPts, false, 'centripetal', 0.5);
  // Phones: pull every stop back along its line of sight so the subject fits the narrow frame.
  const fitStops = () => STOPS.forEach((s, i) => {
    s.pos.copy(s.subject).addScaledVector(new Vector3().subVectors(basePos[i], s.subject), portrait ? 1.45 : 1);
  });
  const STOP_INDEX = [0, 4, 5, 6, 7, 8];          // index of each stop in pathPts
  const lastIdx = pathPts.length - 1;

  let portrait = false;
  const tmpRight = new Vector3(), tmpUp = new Vector3(), tmpDir = new Vector3();
  function framedLook(stop, out) {
    // Desktop: subject sits right of centre (text panel is on the left).
    // Phone: subject sits in the top half (text panel rises from the bottom).
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

  /* ── Sizing & adaptive quality ─────────────────────────────────── */
  let lastW = 0, lastH = 0;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    // Phone address bars change the height while scrolling; resizing the canvas then causes jank.
    if (coarse && w === lastW && Math.abs(h - lastH) < 150) return;
    lastW = w; lastH = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    portrait = camera.aspect < 0.85;
    camera.fov = portrait ? 52 : 36;
    camera.updateProjectionMatrix();
    fitStops();
    refreshLooks();
    dirty = true;
  }
  let dirty = true;
  window.addEventListener('resize', () => { resize(); kick(); });

  /* ── Input ─────────────────────────────────────────────────────── */
  let px = 0, py = 0, tx = 0, ty = 0;
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    tx = e.clientX / window.innerWidth - 0.5;
    ty = e.clientY / window.innerHeight - 0.5;
  }, { passive: true });

  /* ── Frame ─────────────────────────────────────────────────────── */
  let shown = progress();
  let last = performance.now(), elapsed = 0, frames = 0, slowFrames = 0, readyFired = false;
  let clapState = 0;            // 0 waiting, 1 clapping, 2 done
  let clapT = 0;
  const camPos = new Vector3(), camLook = new Vector3(), ahead = new Vector3(), lookA = new Vector3();

  function pose(p) {
    const i = Math.min(Math.floor(p), STOPS.length - 2);
    const t = MathUtils.clamp(p - i, 0, 1);
    const e = smoother(t);
    const a = STOP_INDEX[i], b = STOP_INDEX[i + 1];
    const idx = a + (b - a) * (i === 0 ? smoother(smooth(0, 1, t)) : e);
    path.getPoint(idx / lastIdx, camPos);
    // Look: blend from this stop's framing to the next, looking down the path in between.
    lookA.lerpVectors(looks[i], looks[i + 1], e);
    path.getPoint(Math.min(idx + 0.6, lastIdx) / lastIdx, ahead);
    const travel = Math.sin(Math.PI * t);          // 0 at stops, 1 mid-move
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
      px += (tx - px) * k;
      py += (ty - py) * k;
      camPos.x += px * 0.35; camPos.y -= py * 0.22;
    }
    camera.position.copy(camPos);
    camera.lookAt(camLook);

    // Lens: slow float; iris opens as the camera approaches the glass.
    if (!reducedMotion) lensPivot.position.y = LENS_POS.y + Math.sin(elapsed * 0.8) * 0.06;
    lens.setIris(reducedMotion ? 0.85 : smooth(0.05, 0.42, shown) * 0.95 + 0.05);
    lensPivot.visible = shown < 1.2;
    prints.forEach((pr) => { pr.visible = shown > 0.4; });

    // Monitors play only when you're near the Work scene.
    const nearWork = Math.abs(shown - 2) < 1.1;
    monitors.forEach((m) => (nearWork && !reducedMotion ? m.play() : m.pause()));

    // Softboxes breathe a little, like lights warming up.
    if (!reducedMotion) cube.rotation.y = 0.6 + elapsed * 0.25;

    // Dolly rolls along the track with the process scene.
    const dz = MathUtils.clamp((shown - 3.4) / 1.4, 0, 1);
    track.dolly.position.z = track.trackLength / 2 - 3 - dz * (track.trackLength - 8);

    // Clapper: one clap when you arrive at Contact.
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

    renderer.render(scene, camera);
    dirty = false;

    if (!readyFired) { readyFired = true; onReady?.(); }

    // Adaptive quality: if frames are consistently slow, lower the resolution.
    frames++;
    if (dt > 0.028) slowFrames++;
    if (frames === 90) {
      if (slowFrames > 45 && dpr > 1) { dpr = Math.max(1, dpr - 0.35); renderer.setPixelRatio(dpr); resize(); }
      frames = 0; slowFrames = 0;
    }

    const settling = Math.abs(target - shown) > 0.0005;
    const pointerMoving = Math.abs(tx - px) + Math.abs(ty - py) > 0.002;
    const busy = settling || dirty || clapState === 1 || pointerMoving || (nearWork && !reducedMotion);
    idle = busy ? 0 : idle + dt;
    // Save battery: once everything has settled for 2s, stop drawing until something changes.
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

  resize();
  kick();
  return { renderer, scene, camera };
}
