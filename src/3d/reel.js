/**
 * THE REEL — scroll-driven 3D film strip
 * ------------------------------------------------------------------
 * An endless 35mm strip wound into a trefoil knot. Every frame on it is
 * a still pulled from Baten's own commercials (Coffee Commercials,
 * MC Burger, Zingora Crunch). The strip runs like film through a
 * projector; scrolling dollies the camera from a wide establishing shot
 * into the reel, and speeds the film up with your scroll velocity.
 *
 * Source file. The browser loads the esbuild bundle in
 * src/components/reel3d.bundle.js — rebuild with `npm run build:3d`.
 *
 * Everything is drawn by two small custom shaders (no scene lights),
 * so the tree-shaken three.js bundle stays small.
 */
import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, Points,
  BufferGeometry, BufferAttribute, PlaneGeometry, ShaderMaterial,
  TextureLoader, SRGBColorSpace, LinearMipmapLinearFilter, LinearFilter,
  DoubleSide, AdditiveBlending, Color, Vector3, MathUtils,
} from 'three';

// ---- Knot & strip parameters (shared by JS and GLSL) ---------------
const P = 2, Q = 3;            // trefoil
const R_MAJOR = 3.25;          // torus radius
const R_MINOR = 1.3;           // tube radius the strip wraps around
const ACROSS = 0.62;           // image width as a share of strip width
const ATLAS_COLS = 6, ATLAS_ROWS = 2, FRAME_COUNT = 12;
// Which film each atlas frame comes from (order the atlas was packed in).
const FRAME_FILM = ['Coffee Commercials', 'MC Burger', 'Zingora Crunch'];

const BG = new Color('#120f0b');

function knotPoint(t, out) {
  const cq = Math.cos(Q * t), sq = Math.sin(Q * t);
  const r = R_MAJOR + R_MINOR * cq;
  return out.set(r * Math.cos(P * t), r * Math.sin(P * t), R_MINOR * sq);
}

function knotLength(samples = 4000) {
  const a = new Vector3(), b = new Vector3();
  let len = 0;
  knotPoint(0, a);
  for (let i = 1; i <= samples; i++) {
    knotPoint((i / samples) * Math.PI * 2, b);
    len += a.distanceTo(b);
    a.copy(b);
  }
  return len;
}

// GLSL mirror of knotPoint + a frame (tangent / across / face normal).
const KNOT_GLSL = /* glsl */ `
  const float P = ${P.toFixed(1)};
  const float Q = ${Q.toFixed(1)};
  const float RM = ${R_MAJOR.toFixed(4)};
  const float RN = ${R_MINOR.toFixed(4)};
  const float TAU = 6.28318530718;

  vec3 knot(float t) {
    float cq = cos(Q * t), sq = sin(Q * t);
    float r = RM + RN * cq;
    return vec3(r * cos(P * t), r * sin(P * t), RN * sq);
  }
  vec3 knotD(float t) {
    float cq = cos(Q * t), sq = sin(Q * t);
    float r = RM + RN * cq;
    float dr = -RN * Q * sq;
    return vec3(dr * cos(P * t) - r * P * sin(P * t),
                dr * sin(P * t) + r * P * cos(P * t),
                RN * Q * cq);
  }
  // Outward normal of the torus the knot lies on: the strip lies flat on
  // that surface, so frames face outward and never flip or self-twist.
  vec3 tubeNormal(float t) {
    float cq = cos(Q * t), sq = sin(Q * t);
    return normalize(vec3(cq * cos(P * t), cq * sin(P * t), sq));
  }
`;

const stripVertex = /* glsl */ `
  ${KNOT_GLSL}
  uniform float uFlow;       // 0..1 loop offset: the film running
  uniform float uHalfWidth;
  uniform float uLift;       // small offset off the torus surface
  attribute float aS;        // position along the whole loop, 0..1
  attribute float aV;        // across the strip, -1..1
  attribute float aCell;     // which frame cell this vertex belongs to
  attribute float aLocal;    // position inside its cell, 0..1
  varying vec2 vCellUv;
  varying float vV;
  varying float vCell;
  varying vec3 vNormal;
  varying vec3 vViewPos;

  void main() {
    float t = fract(aS + uFlow) * TAU;
    vec3 c = knot(t);
    vec3 T = normalize(knotD(t));
    vec3 N = tubeNormal(t);
    vec3 A = normalize(cross(N, T));               // across the strip
    // A gentle breathing curl across the strip, like real film stock.
    vec3 pos = c + N * (uLift + 0.035 * aV * aV) + A * aV * uHalfWidth;

    vCellUv = vec2(aLocal, aV);
    vV = aV;
    vCell = aCell;
    vNormal = normalize(normalMatrix * N);
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    vViewPos = mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;

const stripFragment = /* glsl */ `
  uniform sampler2D uAtlas;
  uniform vec3 uBg;
  uniform float uAcross;
  uniform float uFogNear;
  uniform float uFogFar;
  uniform float uTime;
  varying vec2 vCellUv;
  varying float vV;
  varying float vCell;
  varying vec3 vNormal;
  varying vec3 vViewPos;

  const float COLS = ${ATLAS_COLS.toFixed(1)};
  const float ROWS = ${ATLAS_ROWS.toFixed(1)};
  const float FRAMES = ${FRAME_COUNT.toFixed(1)};

  float sdRoundBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }

  void main() {
    vec3 n = normalize(vNormal);
    bool back = !gl_FrontFacing;
    if (back) n = -n;
    vec3 viewDir = normalize(-vViewPos);

    // Key light from upper-left-front, warm; cool fill from below.
    vec3 L = normalize(vec3(-0.45, 0.65, 0.6));
    float diff = max(dot(n, L), 0.0);
    float fill = max(dot(n, normalize(vec3(0.3, -0.8, 0.5))), 0.0);
    vec3 H = normalize(L + viewDir);
    float spec = pow(max(dot(n, H), 0.0), 60.0);
    float rim = pow(1.0 - max(dot(n, viewDir), 0.0), 3.0);

    float av = abs(vV);
    float u = vCellUv.x;                       // 0..1 along the cell
    vec3 base = vec3(0.035, 0.03, 0.026);      // film base (black acetate)
    vec3 col;

    if (av > uAcross) {
      // --- Sprocket bands: 4 perforations per frame, punched through. ---
      float band = (av - uAcross) / (1.0 - uAcross);     // 0 inner .. 1 edge
      vec2 hp = vec2(fract(u * 4.0) - 0.5, band - 0.5);
      float hole = sdRoundBox(hp, vec2(0.2, 0.2), 0.08);
      if (hole < 0.0) discard;
      float edgeGlint = smoothstep(0.03, 0.0, abs(hole)) * 0.35;
      col = base + vec3(0.9, 0.75, 0.5) * edgeGlint;
      col += base * diff * 2.0;
    } else {
      // --- Picture area: a still from the films. ---
      float gap = 0.06;
      float lu = (u - gap) / (1.0 - 2.0 * gap);
      vec2 fp = vec2(lu, (vV / uAcross) * 0.5 + 0.5);    // 0..1 inside picture
      float inside = step(0.0, lu) * step(lu, 1.0);
      float idx = mod(vCell, FRAMES);
      float col_i = mod(idx, COLS);
      float row_i = floor(idx / COLS);
      // Frames are portrait: across the strip = image x, along = image y.
      vec2 img = vec2(fp.y, 1.0 - fp.x);
      if (back) img.x = 1.0 - img.x;                     // seen through the base
      vec2 atlasUv = vec2((col_i + img.x) / COLS, 1.0 - (row_i + 1.0 - img.y) / ROWS);
      vec3 pic = texture2D(uAtlas, atlasUv).rgb;
      // Rounded frame corners, like a real film gate.
      float d = sdRoundBox(fp - 0.5, vec2(0.5), 0.06);
      float mask = inside * smoothstep(0.004, -0.004, d);
      // Projector light: pictures glow, lit a little by the key light.
      vec3 lit = pic * (0.78 + 0.32 * diff + 0.12 * fill);
      if (back) lit *= 0.42;                             // emulsion side darker
      col = mix(base, lit, mask);
    }

    col += vec3(1.0, 0.86, 0.62) * spec * 0.55;          // glossy acetate
    col += vec3(0.45, 0.55, 1.0) * rim * 0.18;           // cool rim light

    // Depth fog into the dark stage.
    float depth = -vViewPos.z;
    float fog = smoothstep(uFogNear, uFogFar, depth);
    col = mix(col, uBg, fog);
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

const dustVertex = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  attribute float aSeed;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    p.y += mod(uTime * (0.06 + aSeed * 0.08) + aSeed * 20.0, 14.0) - 7.0;
    p.x += sin(uTime * 0.3 + aSeed * 12.0) * 0.25;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = (2.0 + aSeed * 4.0) * uPixelRatio * (8.0 / -mv.z);
    vAlpha = 0.25 + 0.55 * fract(aSeed * 7.31);
  }
`;
const dustFragment = /* glsl */ `
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d) * vAlpha;
    gl_FragColor = vec4(1.0, 0.85, 0.6, a);
  }
`;

const beamVertex = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const beamFragment = /* glsl */ `
  uniform float uTime;
  uniform float uIntensity;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv - 0.5;
    float glow = exp(-dot(p, p) * 7.0);
    float flicker = 0.92 + 0.08 * sin(uTime * 23.0) * sin(uTime * 7.3);
    vec3 c = vec3(1.0, 0.72, 0.38) * glow * uIntensity * flicker;
    gl_FragColor = vec4(c, glow * uIntensity);
  }
`;

// ---- Helpers --------------------------------------------------------
const smooth = (a, b, x) => { const t = MathUtils.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp = MathUtils.lerp;

// Camera path keyed by scroll progress (0 = section enters, 1 = leaves).
const SHOTS = [
  { at: 0.0, pos: [0, -2.2, 17.5], look: [0, 0, 0], roll: 0.0 },
  { at: 0.35, pos: [3.6, -0.6, 10.5], look: [0.4, 0.2, 0], roll: -0.12 },
  { at: 0.7, pos: [1.2, 1.4, 6.2], look: [2.2, 0.6, 0], roll: 0.18 },
  { at: 1.0, pos: [-1.0, 0.5, 4.0], look: [2.6, -0.4, 0.2], roll: 0.05 },
];

function shotAt(p, outPos, outLook) {
  let i = 0;
  while (i < SHOTS.length - 2 && p > SHOTS[i + 1].at) i++;
  const a = SHOTS[i], b = SHOTS[i + 1];
  const k = smooth(a.at, b.at, p);
  outPos.set(lerp(a.pos[0], b.pos[0], k), lerp(a.pos[1], b.pos[1], k), lerp(a.pos[2], b.pos[2], k));
  outLook.set(lerp(a.look[0], b.look[0], k), lerp(a.look[1], b.look[1], k), lerp(a.look[2], b.look[2], k));
  return lerp(a.roll, b.roll, k);
}

/**
 * Mount the reel into `stage` (the sticky element) and drive it from
 * `section` (the tall scroll container).
 * @returns {{ destroy(): void } | null} null when WebGL is unavailable.
 */
export function mountReel({ section, stage, canvasHost, hud = {}, reducedMotion = false, atlasUrl }) {
  let renderer;
  try {
    renderer = new WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  } catch (e) {
    return null;
  }
  if (!renderer.getContext()) return null;

  const isSmall = window.matchMedia('(max-width: 767px)').matches;
  const maxDpr = isSmall ? 1.5 : 1.75;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
  renderer.setClearColor(BG, 1);
  renderer.outputColorSpace = SRGBColorSpace;
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  canvas.className = 'reel-canvas';
  canvasHost.appendChild(canvas);

  const scene = new Scene();
  const camera = new PerspectiveCamera(isSmall ? 52 : 40, 1, 0.1, 80);
  const knotGroup = new Group();
  scene.add(knotGroup);

  // ---- Strip geometry: N cells, each subdivided along its length ----
  const length = knotLength();
  const STRIP_WIDTH = 1.12;
  const cells = Math.round(length / (STRIP_WIDTH * 1.04));
  const SEG = isSmall ? 6 : 10;                // segments per cell
  const ACROSS_STEPS = 6;                       // across the strip (for the curl)
  const cols = ACROSS_STEPS + 1;
  // Each cell gets its own vertex block (duplicated at cell boundaries)
  // so every frame owns clean 0..1 UVs.
  const perCellRows = SEG + 1;
  const vPerCell = perCellRows * cols;
  const totalV = cells * vPerCell;
  const S = new Float32Array(totalV), V = new Float32Array(totalV);
  const C = new Float32Array(totalV), Lc = new Float32Array(totalV);
  const idx = [];
  for (let c = 0; c < cells; c++) {
    for (let r = 0; r < perCellRows; r++) {
      const local = r / SEG;
      for (let k = 0; k < cols; k++) {
        const v = c * vPerCell + r * cols + k;
        S[v] = (c + local) / cells;
        V[v] = (k / ACROSS_STEPS) * 2 - 1;
        C[v] = c;
        Lc[v] = local;
      }
    }
    for (let r = 0; r < SEG; r++) {
      for (let k = 0; k < ACROSS_STEPS; k++) {
        const a = c * vPerCell + r * cols + k;
        const b = a + cols;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }
  const stripGeo = new BufferGeometry();
  stripGeo.setAttribute('position', new BufferAttribute(new Float32Array(totalV * 3), 3));
  stripGeo.setAttribute('aS', new BufferAttribute(S, 1));
  stripGeo.setAttribute('aV', new BufferAttribute(V, 1));
  stripGeo.setAttribute('aCell', new BufferAttribute(C, 1));
  stripGeo.setAttribute('aLocal', new BufferAttribute(Lc, 1));
  stripGeo.setIndex(idx);
  // Positions are computed in the vertex shader (the buffer is all zeros),
  // so the mesh opts out of frustum culling below.

  const loader = new TextureLoader();
  const atlas = loader.load(atlasUrl, () => { needsRender = true; });
  atlas.colorSpace = SRGBColorSpace;
  atlas.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  atlas.minFilter = LinearMipmapLinearFilter;
  atlas.magFilter = LinearFilter;

  const stripMat = new ShaderMaterial({
    vertexShader: stripVertex,
    fragmentShader: stripFragment,
    side: DoubleSide,
    uniforms: {
      uAtlas: { value: atlas },
      uFlow: { value: 0 },
      uHalfWidth: { value: STRIP_WIDTH / 2 },
      uLift: { value: 0.0 },
      uAcross: { value: ACROSS },
      uBg: { value: BG.clone().convertSRGBToLinear() },
      uFogNear: { value: 6.0 },
      uFogFar: { value: 26.0 },
      uTime: { value: 0 },
    },
  });
  const strip = new Mesh(stripGeo, stripMat);
  strip.frustumCulled = false;
  knotGroup.add(strip);

  // ---- Projector glow behind the knot ----
  const beamMat = new ShaderMaterial({
    vertexShader: beamVertex, fragmentShader: beamFragment,
    transparent: true, depthWrite: false, blending: AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uIntensity: { value: 0.55 } },
  });
  const beam = new Mesh(new PlaneGeometry(30, 30), beamMat);
  beam.position.set(2, 3, -9);
  scene.add(beam);

  // ---- Dust floating in the projector light ----
  const DUST = isSmall ? 220 : 520;
  const dPos = new Float32Array(DUST * 3), dSeed = new Float32Array(DUST);
  for (let i = 0; i < DUST; i++) {
    dPos[i * 3] = (Math.random() - 0.5) * 22;
    dPos[i * 3 + 1] = (Math.random() - 0.5) * 14;
    dPos[i * 3 + 2] = (Math.random() - 0.5) * 16 - 2;
    dSeed[i] = Math.random();
  }
  const dustGeo = new BufferGeometry();
  dustGeo.setAttribute('position', new BufferAttribute(dPos, 3));
  dustGeo.setAttribute('aSeed', new BufferAttribute(dSeed, 1));
  const dustMat = new ShaderMaterial({
    vertexShader: dustVertex, fragmentShader: dustFragment,
    transparent: true, depthWrite: false, blending: AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPixelRatio: { value: renderer.getPixelRatio() } },
  });
  const dust = new Points(dustGeo, dustMat);
  dust.frustumCulled = false;
  scene.add(dust);

  // ---- State ----
  let progress = 0, smoothProgress = 0;
  let lastScrollY = window.scrollY, scrollVel = 0;
  let flow = 0, flowSpeed = 0.006;            // loop fraction per second
  let pointerX = 0, pointerY = 0, px = 0, py = 0;
  let dragging = false, dragX = 0, spin = 0, spinVel = 0;
  let visible = false, rafId = 0, last = performance.now(), elapsed = 0;
  let needsRender = true;
  const camPos = new Vector3(), camLook = new Vector3(), tmp = new Vector3();

  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Keep the whole knot in frame on tall phone screens.
    camera.fov = camera.aspect < 0.8 ? 58 : (isSmall ? 52 : 40);
    camera.updateProjectionMatrix();
    needsRender = true;
  }

  function readScroll() {
    const rect = section.getBoundingClientRect();
    const travel = rect.height - window.innerHeight;
    progress = travel > 0 ? MathUtils.clamp(-rect.top / travel, 0, 1) : 0;
    const y = window.scrollY;
    scrollVel = y - lastScrollY;
    lastScrollY = y;
  }

  function onScroll() { readScroll(); needsRender = true; }

  function onPointerMove(e) {
    const r = stage.getBoundingClientRect();
    pointerX = ((e.clientX - r.left) / r.width) * 2 - 1;
    pointerY = ((e.clientY - r.top) / r.height) * 2 - 1;
    if (dragging) {
      const dx = e.clientX - dragX;
      dragX = e.clientX;
      spinVel = dx * 0.004;
      spin += spinVel;
      if (reducedMotion) kick();   // no render loop in this mode: draw on demand
    }
  }
  function onPointerDown(e) {
    if (e.pointerType !== 'mouse') return;   // touch keeps scrolling the page
    dragging = true; dragX = e.clientX; stage.classList.add('is-dragging');
  }
  function onPointerUp() { dragging = false; stage.classList.remove('is-dragging'); }

  // Which film is closest to the lens right now (for the HUD).
  const cellCenter = new Vector3();
  function nearestFilm() {
    let best = -1, bestScore = -Infinity;
    knotGroup.updateMatrixWorld();
    for (let c = 0; c < cells; c++) {
      const s = ((c + 0.5) / cells + flow) % 1;
      knotPoint(s * Math.PI * 2, cellCenter).applyMatrix4(knotGroup.matrixWorld);
      tmp.copy(cellCenter).project(camera);
      if (tmp.z > 1 || Math.abs(tmp.x) > 0.75 || Math.abs(tmp.y) > 0.75) continue;
      const dist = cellCenter.distanceTo(camera.position);
      const score = -dist - (Math.abs(tmp.x) + Math.abs(tmp.y)) * 2;
      if (score > bestScore) { bestScore = score; best = c; }
    }
    return best < 0 ? null : FRAME_FILM[best % FRAME_COUNT % FRAME_FILM.length];
  }

  let hudTick = 0, lastFilm = '';
  function updateHud() {
    if (hud.timecode) {
      const totalFrames = Math.floor(elapsed * 24 + progress * 24 * 90);
      const ff = String(totalFrames % 24).padStart(2, '0');
      const ss = String(Math.floor(totalFrames / 24) % 60).padStart(2, '0');
      const mm = String(Math.floor(totalFrames / (24 * 60)) % 60).padStart(2, '0');
      hud.timecode.textContent = `00:${mm}:${ss}:${ff}`;
    }
    if (hud.progress) hud.progress.style.transform = `scaleX(${smoothProgress.toFixed(4)})`;
    if (hud.film && (hudTick++ % 8 === 0)) {
      const film = nearestFilm();
      if (film && film !== lastFilm) {
        lastFilm = film;
        hud.film.textContent = film;
      }
    }
  }

  function frame(now) {
    rafId = 0;
    // rAF timestamps can precede the performance.now() taken in kick(); never step backwards.
    const dt = MathUtils.clamp((now - last) / 1000, 0, 0.05);
    last = now;
    elapsed += dt;

    smoothProgress += (progress - smoothProgress) * (reducedMotion ? 1 : Math.min(1, dt * 6));
    // Film runs faster while you scroll, then settles back.
    const target = 0.006 + Math.min(Math.abs(scrollVel) * 0.00045, 0.05);
    flowSpeed += (target - flowSpeed) * Math.min(1, dt * 3);
    scrollVel *= 0.85;
    if (!reducedMotion) flow = (flow + flowSpeed * dt * (scrollVel < 0 ? -1 : 1)) % 1;
    if (flow < 0) flow += 1;

    px += (pointerX - px) * Math.min(1, dt * 3);
    py += (pointerY - py) * Math.min(1, dt * 3);
    if (!dragging) { spinVel *= 0.94; spin += spinVel; }

    const roll = shotAt(smoothProgress, camPos, camLook);
    camPos.x += px * 0.9;
    camPos.y += -py * 0.6;
    camera.position.copy(camPos);
    camera.up.set(Math.sin(roll), Math.cos(roll), 0);
    camera.lookAt(camLook);
    // Fog follows the camera so the knot stays vivid in every shot and only
    // the strands on the far side sink into the dark.
    const focus = camera.position.length();
    stripMat.uniforms.uFogNear.value = Math.max(2, focus - 2.5);
    stripMat.uniforms.uFogFar.value = focus + 9;

    knotGroup.rotation.set(
      -0.55 + smoothProgress * 0.5,
      0.25 - smoothProgress * 0.35,
      (reducedMotion ? 0 : elapsed * 0.035) + smoothProgress * 1.4 + spin,
    );

    stripMat.uniforms.uFlow.value = flow;
    stripMat.uniforms.uTime.value = elapsed;
    dustMat.uniforms.uTime.value = elapsed;
    beamMat.uniforms.uTime.value = elapsed;
    beamMat.uniforms.uIntensity.value = 0.45 + 0.25 * (1 - smoothProgress);

    renderer.render(scene, camera);
    updateHud();
    needsRender = false;

    if (visible && !reducedMotion) rafId = requestAnimationFrame(frame);
  }

  function kick() {
    if (!rafId) { last = performance.now(); rafId = requestAnimationFrame(frame); }
  }

  // Reduced motion: no continuous loop; redraw only on scroll/resize.
  function onScrollReduced() { onScroll(); kick(); }

  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) { readScroll(); kick(); }
  }, { rootMargin: '200px 0px' });
  io.observe(section);

  const ro = new ResizeObserver(() => { resize(); kick(); });
  ro.observe(stage);

  const onVis = () => { if (!document.hidden && visible) kick(); };
  document.addEventListener('visibilitychange', onVis);
  window.addEventListener('scroll', reducedMotion ? onScrollReduced : onScroll, { passive: true });
  stage.addEventListener('pointermove', onPointerMove);
  stage.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointerup', onPointerUp);

  resize();
  readScroll();
  smoothProgress = progress;
  kick();
  // In reduced-motion mode, redraw once the texture has arrived.
  const texWait = setInterval(() => { if (needsRender) kick(); }, 300);

  return {
    destroy() {
      clearInterval(texWait);
      cancelAnimationFrame(rafId);
      io.disconnect(); ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('scroll', reducedMotion ? onScrollReduced : onScroll);
      stage.removeEventListener('pointermove', onPointerMove);
      stage.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      stripGeo.dispose(); stripMat.dispose(); atlas.dispose();
      dustGeo.dispose(); dustMat.dispose(); beam.geometry.dispose(); beamMat.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}
