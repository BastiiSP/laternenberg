// Türchen 17 · Die Schneekugel
// Eine kleine 3D-Schneekugel: drehen, schütteln, Hüttenlicht schalten – und unter dem Sockel
// wartet eine Gravur.
import './d17.css';
import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, Points,
  SphereGeometry, CylinderGeometry, ConeGeometry, BoxGeometry, CircleGeometry, TorusGeometry,
  CapsuleGeometry, PlaneGeometry, RingGeometry, ExtrudeGeometry, Shape, BufferGeometry, BufferAttribute,
  MeshStandardMaterial, MeshBasicMaterial, ShaderMaterial,
  HemisphereLight, DirectionalLight, PointLight,
  CanvasTexture, PMREMGenerator, EquirectangularReflectionMapping, SRGBColorSpace,
  Raycaster, Vector2, Vector3, Quaternion,
  AdditiveBlending, BackSide, FrontSide, ACESFilmicToneMapping,
} from 'three';

const TAU = Math.PI * 2;
const GROUND_Y = -0.38;
const R_IN = 0.955; // Innenradius für Schnee

/** Höhe des verschneiten Bodens (lokale Koordinaten der Kugel). */
function groundY(x, z) {
  return GROUND_Y
    + 0.30 * Math.exp(-((x + 0.28) ** 2 + (z + 0.36) ** 2) / 0.15)
    + 0.13 * Math.exp(-((x - 0.5) ** 2 + (z + 0.22) ** 2) / 0.07)
    + 0.025 * Math.sin(x * 5.1) * Math.cos(z * 4.3) * (1 - Math.min(1, (x * x + z * z) / 0.85));
}

// ------------------------------------------------------------------ Texturen
function envCanvas() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const g = c.getContext('2d');
  const sky = g.createLinearGradient(0, 0, 0, 256);
  sky.addColorStop(0, '#0a1030');
  sky.addColorStop(0.55, '#141a3a');
  sky.addColorStop(0.75, '#2a1a26');
  sky.addColorStop(1, '#3a2014');
  g.fillStyle = sky;
  g.fillRect(0, 0, 512, 256);
  // Kerzenschein (links vorn, etwas unterhalb)
  const blob = (x, y, r, col) => {
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, col);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  };
  blob(436, 140, 70, 'rgba(255,190,110,0.9)');
  blob(436, 140, 16, 'rgba(255,240,200,1)');
  blob(470, 150, 50, 'rgba(255,150,70,0.5)');
  blob(150, 150, 60, 'rgba(255,170,90,0.35)');
  // Fenster (rechts oben): kühle Scheiben mit Sprossen
  blob(306, 84, 46, 'rgba(160,180,255,0.35)');
  blob(60, 60, 50, 'rgba(255,200,140,0.18)');
  // warmer Tisch unten
  const fl = g.createLinearGradient(0, 200, 0, 256);
  fl.addColorStop(0, 'rgba(120,60,30,0)');
  fl.addColorStop(1, 'rgba(160,90,40,0.6)');
  g.fillStyle = fl;
  g.fillRect(0, 200, 512, 56);
  return c;
}

function woodCanvas() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#5b3119';
  g.fillRect(0, 0, 512, 128);
  for (let i = 0; i < 90; i++) {
    const x = Math.random() * 512;
    const w = 1 + Math.random() * 5;
    g.fillStyle = Math.random() < 0.5 ? `rgba(30,12,4,${0.15 + Math.random() * 0.25})` : `rgba(150,90,50,${0.08 + Math.random() * 0.15})`;
    g.beginPath();
    g.moveTo(x, 0);
    g.bezierCurveTo(x + 6, 40, x - 6, 90, x + 3, 128);
    g.lineWidth = w;
    g.strokeStyle = g.fillStyle;
    g.stroke();
  }
  return c;
}

function blobCanvas() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(20,22,50,0.55)');
  gr.addColorStop(1, 'rgba(20,22,50,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  return c;
}

/** Gravur unter dem Sockel. Gibt [Farbtextur, Leuchtmaske] zurück. */
function engravingCanvases(fontFamily) {
  const S = 1024;
  const base = document.createElement('canvas');
  const glow = document.createElement('canvas');
  base.width = base.height = glow.width = glow.height = S;
  const g = base.getContext('2d');
  const m = glow.getContext('2d');
  m.fillStyle = '#000';
  m.fillRect(0, 0, S, S);
  // Holz, dunkel, rund
  const wood = g.createRadialGradient(S / 2, S / 2, 40, S / 2, S / 2, S / 2);
  wood.addColorStop(0, '#5a321a');
  wood.addColorStop(0.8, '#3e200f');
  wood.addColorStop(1, '#2a1408');
  g.fillStyle = wood;
  g.fillRect(0, 0, S, S);
  for (let i = 0; i < 40; i++) {
    g.strokeStyle = `rgba(20,8,2,${0.06 + Math.random() * 0.1})`;
    g.lineWidth = 2 + Math.random() * 6;
    g.beginPath();
    g.arc(S / 2 + (Math.random() - 0.5) * 30, S / 2 + (Math.random() - 0.5) * 30, 60 + Math.random() * 440, 0, TAU);
    g.stroke();
  }
  const both = (fn) => {
    fn(g, '#e9c06a');
    fn(m, '#ffffff');
  };
  // Zierringe
  both((c, col) => {
    c.strokeStyle = col;
    c.lineWidth = 6;
    c.beginPath();
    c.arc(S / 2, S / 2, 440, 0, TAU);
    c.stroke();
    c.lineWidth = 2.5;
    c.beginPath();
    c.arc(S / 2, S / 2, 418, 0, TAU);
    c.stroke();
    // kleine Sterne im Ring
    c.fillStyle = col;
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * TAU;
      const x = S / 2 + Math.cos(a) * 470;
      const y = S / 2 + Math.sin(a) * 470;
      c.beginPath();
      c.arc(x, y, i % 6 === 0 ? 7 : 3.5, 0, TAU);
      c.fill();
    }
  });
  // Laterne als kleines Zeichen
  both((c, col) => {
    c.save();
    c.translate(S / 2, 268);
    c.strokeStyle = col;
    c.fillStyle = col;
    c.lineWidth = 6;
    c.beginPath();
    c.arc(0, -62, 12, Math.PI, 0);
    c.stroke();
    c.beginPath();
    c.moveTo(-34, -40);
    c.lineTo(34, -40);
    c.lineTo(22, -54);
    c.lineTo(-22, -54);
    c.closePath();
    c.fill();
    c.strokeRect(-26, -38, 52, 64);
    c.beginPath();
    c.ellipse(0, -6, 9, 15, 0, 0, TAU);
    c.fill();
    c.fillRect(-32, 26, 64, 8);
    c.restore();
  });
  // Text mit Gravur-Anmutung: dunkle Vertiefung, darüber Gold
  const text = (str, y, size, style = '') => {
    g.font = `${style} ${size}px ${fontFamily}`;
    m.font = g.font;
    g.textAlign = m.textAlign = 'center';
    g.textBaseline = m.textBaseline = 'middle';
    g.fillStyle = 'rgba(15,6,0,0.85)';
    g.fillText(str, S / 2 + 3, y + 4);
    g.fillStyle = '#efc874';
    g.fillText(str, S / 2, y);
    m.fillStyle = '#fff';
    m.fillText(str, S / 2, y);
  };
  // BASTI-STIMME (Widmung von Basti als Gravur)
  text('Für Melli', 468, 150, 'italic 600');
  both((c, col) => {
    c.fillStyle = col;
    c.strokeStyle = col;
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(S / 2 - 150, 584);
    c.lineTo(S / 2 - 30, 584);
    c.moveTo(S / 2 + 30, 584);
    c.lineTo(S / 2 + 150, 584);
    c.stroke();
    c.beginPath();
    c.arc(S / 2, 584, 9, 0, TAU);
    c.fill();
  });
  // BASTI-STIMME
  text('Dezember 2026', 680, 88, '500');
  return [base, glow];
}

// ------------------------------------------------------------------ Shader
const GLASS_VERT = /* glsl */ `
varying vec3 vWN;
varying vec3 vWP;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWP = wp.xyz;
  vWN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
const GLASS_FRAG = /* glsl */ `
uniform sampler2D envMap;
uniform float strength;
uniform float shine;
varying vec3 vWN;
varying vec3 vWP;
vec2 eq(vec3 d) {
  return vec2(atan(d.z, d.x) * 0.15915494 + 0.5, asin(clamp(d.y, -1.0, 1.0)) * 0.31830989 + 0.5);
}
void main() {
  vec3 N = normalize(vWN);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(cameraPosition - vWP);
  float ndv = clamp(dot(N, V), 0.0, 1.0);
  float fres = pow(1.0 - ndv, 3.0);
  vec3 R = reflect(-V, N);
  vec3 env = texture2D(envMap, eq(R)).rgb;
  vec3 L1 = normalize(vec3(-0.55, 0.62, 0.75));
  vec3 L2 = normalize(vec3(0.75, 0.35, 0.45));
  float s1 = pow(max(dot(R, L1), 0.0), 220.0) * 2.4 + pow(max(dot(R, L1), 0.0), 18.0) * 0.12;
  float s2 = pow(max(dot(R, L2), 0.0), 90.0) * 0.6;
  vec3 col = env * (0.06 + 1.25 * fres) + vec3(1.0, 0.92, 0.8) * s1 * shine + vec3(0.75, 0.85, 1.0) * s2 * shine;
  col += vec3(0.6, 0.7, 1.0) * fres * 0.16 + vec3(0.5, 0.55, 0.8) * 0.018;
  gl_FragColor = vec4(col * strength, 1.0);
}`;

const SNOW_VERT = /* glsl */ `
attribute float size;
uniform float scale;
varying float vA;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = size * scale / -mv.z;
  vA = clamp(size * 0.7, 0.45, 1.0);
  gl_Position = projectionMatrix * mv;
}`;
const SNOW_FRAG = /* glsl */ `
varying float vA;
void main() {
  vec2 p = gl_PointCoord - 0.5;
  float d = length(p);
  float a = 1.0 - smoothstep(0.12, 0.5, d);
  gl_FragColor = vec4(vec3(0.96, 0.98, 1.0), a * vA);
}`;

export default {
  mount(root, ctx) {
    const { h, button } = ctx.ui;
    const { clamp, rand } = ctx.fx;
    const reduced = ctx.reducedMotion;

    const stage = h('div', { class: 'd17-stage no-select' });
    const glowBg = h('div', { class: 'd17-candle', 'aria-hidden': 'true' });
    const holder = h('div', { class: 'd17-canvas' });
    const line = h('p', { class: 'd17-line' }, 'Mit dem Finger drehen. Schnell hin und her wischen schüttelt die Kugel.');
    const shakeBtn = button('Schütteln', () => shake(1), { variant: '', sound: null });
    const uprightBtn = button('Aufrichten', () => startUpright(), { variant: 'small ghost' });
    uprightBtn.classList.add('d17-upright');
    const bottom = h('div', { class: 'd17-bottom' }, line, h('div', { class: 'd17-btns' }, uprightBtn, shakeBtn));
    stage.append(glowBg, holder, bottom);
    root.append(stage);

    // ---------------------------------------------------------- WebGL
    let renderer;
    try {
      const test = document.createElement('canvas');
      const gl = test.getContext('webgl2') || test.getContext('webgl');
      if (!gl) throw new Error('kein WebGL');
      renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch (err) {
      return fallback();
    }

    function fallback(reason) {
      holder.remove();
      bottom.remove();
      const box = h('div', { class: 'd17-fallback panel' },
        h('p', { class: 'display d17-fb-title' }, 'Die Schneekugel ist beschlagen.'),
        h('p', {}, 'Dein Browser mag gerade kein 3D zeichnen. Aber wir verraten dir das Geheimnis trotzdem: Wer die Kugel umdreht, findet unter dem Sockel eine Gravur.'),
        // BASTI-STIMME
        h('p', { class: 'd17-fb-engr hand' }, 'Für Melli · Dezember 2026'));
      stage.append(box);
      ctx.complete();
      return () => {};
    }

    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    holder.append(renderer.domElement);
    renderer.domElement.setAttribute('aria-label', 'Schneekugel – mit dem Finger drehen');

    const disposables = [];
    const keep = (x) => {
      disposables.push(x);
      return x;
    };

    const scene = new Scene();
    const camera = new PerspectiveCamera(30, 1, 0.1, 50);

    // Umgebung (für Glanz auf Gold, Holz und Glas)
    const envTex = keep(new CanvasTexture(envCanvas()));
    envTex.colorSpace = SRGBColorSpace;
    envTex.mapping = EquirectangularReflectionMapping;
    const pmrem = new PMREMGenerator(renderer);
    const envRT = pmrem.fromEquirectangular(envTex);
    pmrem.dispose();
    keep(envRT);
    scene.environment = envRT.texture;
    scene.environmentIntensity = 0.55;

    // Licht
    scene.add(new HemisphereLight(0x6a78b8, 0x3a2418, 0.75));
    const warm = new DirectionalLight(0xffc68a, 1.9);
    warm.position.set(-3, 2.6, 3.2);
    scene.add(warm);
    const cool = new DirectionalLight(0x8eaaff, 0.8);
    cool.position.set(3.2, 3, -2.4);
    scene.add(cool);

    // Aufbau: rig (Drehung durch Finger) → wob (Schütteln) → content
    const rig = new Group();
    const wob = new Group();
    const content = new Group();
    content.position.y = -0.06;
    rig.add(wob);
    wob.add(content);
    scene.add(rig);

    // Materialien
    const M = {
      snow: keep(new MeshStandardMaterial({ color: 0xf1f5ff, roughness: 0.92 })),
      snowFlat: keep(new MeshStandardMaterial({ color: 0xf4f7ff, roughness: 0.9, flatShading: true })),
      pine: keep(new MeshStandardMaterial({ color: 0x1f4c40, roughness: 0.85, flatShading: true })),
      pine2: keep(new MeshStandardMaterial({ color: 0x2a5a48, roughness: 0.85, flatShading: true })),
      trunk: keep(new MeshStandardMaterial({ color: 0x4a2c1a, roughness: 0.9 })),
      wall: keep(new MeshStandardMaterial({ color: 0x8a5432, roughness: 0.85 })),
      wallDark: keep(new MeshStandardMaterial({ color: 0x5a3220, roughness: 0.9 })),
      roof: keep(new MeshStandardMaterial({ color: 0x5a2c24, roughness: 0.8 })),
      stone: keep(new MeshStandardMaterial({ color: 0x6b6672, roughness: 0.9, flatShading: true })),
      win: keep(new MeshStandardMaterial({ color: 0x2a1406, emissive: 0xffa844, emissiveIntensity: 2.4, roughness: 0.4 })),
      gold: keep(new MeshStandardMaterial({ color: 0xe0b060, metalness: 1, roughness: 0.28 })),
      iron: keep(new MeshStandardMaterial({ color: 0x23222c, metalness: 0.6, roughness: 0.5 })),
      lamp: keep(new MeshStandardMaterial({ color: 0x3a2008, emissive: 0xffc070, emissiveIntensity: 3 })),
      lorelai: keep(new MeshStandardMaterial({ color: 0x2a2733, roughness: 0.55 })),
      logan: keep(new MeshStandardMaterial({ color: 0xc6cad6, roughness: 0.7 })),
      white: keep(new MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 })),
      eye: keep(new MeshStandardMaterial({ color: 0x0a0a10, roughness: 0.2 })),
      pink: keep(new MeshStandardMaterial({ color: 0xe8a0ac, roughness: 0.6 })),
      lorelaiTail: keep(new MeshStandardMaterial({ color: 0x34303e, roughness: 0.6 })),
    };
    const woodTex = keep(new CanvasTexture(woodCanvas()));
    woodTex.colorSpace = SRGBColorSpace;
    M.wood = keep(new MeshStandardMaterial({ map: woodTex, color: 0xd8b49a, roughness: 0.5, metalness: 0.0 }));
    const blobTex = keep(new CanvasTexture(blobCanvas()));
    M.blob = keep(new MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false }));

    const geos = [];
    const G = (geo) => {
      geos.push(geo);
      return geo;
    };
    const mesh = (geo, mat, parent = content) => {
      const m = new Mesh(G(geo), mat);
      parent.add(m);
      return m;
    };
    const blobShadow = (x, z, r, parent = content) => {
      const m = mesh(new PlaneGeometry(r * 2, r * 2), M.blob, parent);
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, groundY(x, z) + 0.004, z);
      return m;
    };

    // Boden
    {
      const geo = new RingGeometry(0.0005, 0.94, 72, 26);
      geo.rotateX(-Math.PI / 2);
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) p.setY(i, groundY(p.getX(i), p.getZ(i)));
      geo.computeVertexNormals();
      mesh(geo, M.snow);
    }

    // Sockel
    const base = new Group();
    content.add(base);
    {
      const body = mesh(new CylinderGeometry(0.97, 1.1, 0.44, 72, 1, true), M.wood, base);
      body.position.y = -0.62;
      const top = mesh(new TorusGeometry(0.955, 0.035, 12, 72), M.gold, base);
      top.rotation.x = Math.PI / 2;
      top.position.y = -0.4;
      const lip = mesh(new CylinderGeometry(0.985, 0.985, 0.04, 72), M.wood, base);
      lip.position.y = -0.42;
      const mid = mesh(new TorusGeometry(1.03, 0.012, 8, 72), M.gold, base);
      mid.rotation.x = Math.PI / 2;
      mid.position.y = -0.62;
      const bot = mesh(new TorusGeometry(1.1, 0.03, 12, 72), M.gold, base);
      bot.rotation.x = Math.PI / 2;
      bot.position.y = -0.84;
      const foot = mesh(new CylinderGeometry(1.1, 1.08, 0.04, 72), M.wood, base);
      foot.position.y = -0.86;
    }
    // Gravur unter dem Sockel
    const engrMat = keep(new MeshStandardMaterial({ roughness: 0.55, emissive: 0xffc060, emissiveIntensity: 0.12 }));
    const engr = mesh(new CircleGeometry(1.075, 72), engrMat, base);
    engr.rotation.x = Math.PI / 2;
    engr.position.y = -0.881;
    const paintEngraving = () => {
      const fam = '"Fraunces Variable", "Fraunces", Georgia, serif';
      const [c1, c2] = engravingCanvases(fam);
      const t1 = keep(new CanvasTexture(c1));
      t1.colorSpace = SRGBColorSpace;
      t1.anisotropy = 4;
      const t2 = keep(new CanvasTexture(c2));
      engrMat.map?.dispose();
      engrMat.emissiveMap?.dispose();
      engrMat.map = t1;
      engrMat.emissiveMap = t2;
      engrMat.needsUpdate = true;
    };
    paintEngraving();
    document.fonts?.load('italic 600 150px "Fraunces Variable"').then(() => {
      if (!dead) paintEngraving();
    }).catch(() => {});

    // Hütte
    const hut = new Group();
    const HX = 0.1;
    const HZ = -0.02;
    hut.position.set(HX, groundY(HX, HZ) - 0.01, HZ);
    hut.rotation.y = -0.32;
    hut.scale.setScalar(1.2);
    content.add(hut);
    {
      const W = 0.3;
      const HH = 0.2;
      const D = 0.26;
      const body = mesh(new BoxGeometry(W, HH, D), M.wall, hut);
      body.position.y = HH / 2;
      // Giebel als Prisma
      const sh = new Shape();
      sh.moveTo(-W / 2, 0);
      sh.lineTo(W / 2, 0);
      sh.lineTo(0, 0.15);
      sh.closePath();
      const gable = mesh(new ExtrudeGeometry(sh, { depth: D, bevelEnabled: false }), M.wall, hut);
      gable.position.set(0, HH, -D / 2);
      // Dachflächen mit Schnee
      const slope = Math.atan2(0.15, W / 2);
      const len = Math.hypot(W / 2, 0.15) + 0.05;
      for (const s of [-1, 1]) {
        const roof = mesh(new BoxGeometry(len, 0.025, D + 0.07), M.roof, hut);
        roof.position.set(s * (W / 4 + 0.008), HH + 0.075 + 0.012, 0);
        roof.rotation.z = -s * slope;
        const snow = mesh(new BoxGeometry(len + 0.01, 0.03, D + 0.08), M.snowFlat, hut);
        snow.position.set(s * (W / 4 + 0.003), HH + 0.075 + 0.04, 0);
        snow.rotation.z = -s * slope;
      }
      const chim = mesh(new BoxGeometry(0.045, 0.1, 0.045), M.stone, hut);
      chim.position.set(0.085, HH + 0.13, -0.05);
      const chimSnow = mesh(new BoxGeometry(0.055, 0.02, 0.055), M.snowFlat, hut);
      chimSnow.position.set(0.085, HH + 0.185, -0.05);
      // Tür, Fenster
      const door = mesh(new BoxGeometry(0.07, 0.12, 0.01), M.wallDark, hut);
      door.position.set(-0.075, 0.06, D / 2 + 0.003);
      const winGeo = new BoxGeometry(0.075, 0.065, 0.008);
      const w1 = mesh(winGeo, M.win, hut);
      w1.position.set(0.065, 0.11, D / 2 + 0.003);
      const w2 = mesh(new BoxGeometry(0.008, 0.06, 0.07), M.win, hut);
      w2.position.set(W / 2 + 0.003, 0.11, 0.01);
      const round = mesh(new CylinderGeometry(0.025, 0.025, 0.008, 18), M.win, hut);
      round.rotation.x = Math.PI / 2;
      round.position.set(0, HH + 0.05, D / 2 + 0.003);
      // Sprossen
      const barM = M.wallDark;
      const b1 = mesh(new BoxGeometry(0.006, 0.07, 0.012), barM, hut);
      b1.position.set(0.065, 0.11, D / 2 + 0.006);
      const b2 = mesh(new BoxGeometry(0.08, 0.006, 0.012), barM, hut);
      b2.position.set(0.065, 0.11, D / 2 + 0.006);
      const sill = mesh(new BoxGeometry(0.09, 0.012, 0.02), M.snowFlat, hut);
      sill.position.set(0.065, 0.074, D / 2 + 0.008);
    }
    const hutLight = new PointLight(0xffa040, 0.35, 0.9, 2);
    hutLight.position.set(0.06, 0.12, 0.2);
    hut.add(hutLight);
    blobShadow(HX, HZ + 0.02, 0.33);

    // Tannen
    const trees = [
      [-0.58, 0.06, 1.35], [-0.34, -0.46, 1.55], [0.56, -0.32, 1.3], [0.66, 0.2, 1.0], [-0.06, -0.66, 1.15],
    ];
    for (const [x, z, s] of trees) {
      const t = new Group();
      t.position.set(x, groundY(x, z) - 0.01, z);
      t.scale.setScalar(s);
      t.rotation.y = rand(TAU);
      content.add(t);
      const trunk = mesh(new CylinderGeometry(0.018, 0.024, 0.07, 6), M.trunk, t);
      trunk.position.y = 0.035;
      const tiers = [[0.13, 0.15, 0.06], [0.1, 0.13, 0.15], [0.07, 0.11, 0.23]];
      tiers.forEach(([r, hh, y], i) => {
        const c = mesh(new ConeGeometry(r, hh, 7), i % 2 ? M.pine2 : M.pine, t);
        c.position.y = y + hh / 2;
        const cap = mesh(new ConeGeometry(r * 0.62, hh * 0.46, 7), M.snowFlat, t);
        cap.position.y = y + hh - hh * 0.23 + 0.002;
      });
      blobShadow(x, z, 0.15 * s);
    }

    // Kaninchen
    function makeBunny(mat, tailMat, light) {
      const b = new Group();
      const body = mesh(new SphereGeometry(1, 18, 14), mat, b);
      body.scale.set(0.058, 0.052, 0.072);
      body.position.y = 0.05;
      const head = mesh(new SphereGeometry(0.042, 18, 14), mat, b);
      head.position.set(0, 0.098, 0.05);
      const earGeo = new CapsuleGeometry(0.011, 0.05, 4, 8);
      for (const s of [-1, 1]) {
        const ear = mesh(earGeo.clone(), mat, b);
        ear.position.set(s * 0.017, 0.155, 0.04);
        ear.rotation.set(-0.25, 0, s * 0.18);
        const inner = mesh(new CapsuleGeometry(0.005, 0.034, 3, 6), M.pink, b);
        inner.position.set(s * 0.017, 0.157, 0.048);
        inner.rotation.set(-0.25, 0, s * 0.18);
        const eye = mesh(new SphereGeometry(0.0075, 8, 6), M.eye, b);
        eye.position.set(s * 0.026, 0.107, 0.081);
      }
      earGeo.dispose();
      const nose = mesh(new SphereGeometry(0.006, 8, 6), M.pink, b);
      nose.position.set(0, 0.096, 0.092);
      const tail = mesh(new SphereGeometry(0.02, 10, 8), tailMat, b);
      tail.position.set(0, 0.045, -0.072);
      for (const s of [-1, 1]) {
        const paw = mesh(new SphereGeometry(0.014, 8, 6), light ? M.white : mat, b);
        paw.scale.set(1, 0.6, 1.6);
        paw.position.set(s * 0.024, 0.008, 0.055);
      }
      return b;
    }
    const lorelai = makeBunny(M.lorelai, M.lorelaiTail, false);
    const logan = makeBunny(M.logan, M.white, true);
    const place = (obj, x, z, ry) => {
      obj.position.set(x, groundY(x, z), z);
      obj.rotation.y = ry;
      obj.scale.setScalar(1.45);
      content.add(obj);
      blobShadow(x, z, 0.11);
      obj.userData.baseY = obj.position.y;
    };
    place(lorelai, -0.24, 0.45, 0.75);
    place(logan, 0.06, 0.52, -0.55);
    lorelai.userData.name = 'lorelai';
    logan.userData.name = 'logan';

    // Laterne
    const lantern = new Group();
    {
      const LX = 0.38;
      const LZ = 0.4;
      lantern.position.set(LX, groundY(LX, LZ), LZ);
      lantern.scale.setScalar(1.3);
      content.add(lantern);
      const post = mesh(new CylinderGeometry(0.007, 0.009, 0.2, 6), M.iron, lantern);
      post.position.y = 0.1;
      const lamp = mesh(new BoxGeometry(0.038, 0.05, 0.038), M.lamp, lantern);
      lamp.position.y = 0.228;
      const frameTop = mesh(new ConeGeometry(0.036, 0.03, 4), M.iron, lantern);
      frameTop.position.y = 0.268;
      frameTop.rotation.y = Math.PI / 4;
      const cap = mesh(new ConeGeometry(0.024, 0.014, 4), M.snowFlat, lantern);
      cap.position.y = 0.282;
      cap.rotation.y = Math.PI / 4;
      const foot = mesh(new BoxGeometry(0.044, 0.008, 0.044), M.iron, lantern);
      foot.position.y = 0.2;
      blobShadow(LX, LZ, 0.06);
    }
    const lanternLight = new PointLight(0xffb060, 0.5, 1.3, 2);
    lanternLight.position.set(0, 0.23, 0);
    lantern.add(lanternLight);

    // Glas
    const glassGeo = G(new SphereGeometry(1, 56, 40));
    const glassBackMat = keep(new ShaderMaterial({
      uniforms: { envMap: { value: envTex }, strength: { value: 0.45 }, shine: { value: 0.5 } },
      vertexShader: GLASS_VERT, fragmentShader: GLASS_FRAG,
      transparent: true, depthWrite: false, blending: AdditiveBlending, side: BackSide,
    }));
    const glassFrontMat = keep(new ShaderMaterial({
      uniforms: { envMap: { value: envTex }, strength: { value: 1.0 }, shine: { value: 1.0 } },
      vertexShader: GLASS_VERT, fragmentShader: GLASS_FRAG,
      transparent: true, depthWrite: false, blending: AdditiveBlending, side: FrontSide,
    }));
    const glassBack = new Mesh(glassGeo, glassBackMat);
    glassBack.renderOrder = 1;
    const glassFront = new Mesh(glassGeo, glassFrontMat);
    glassFront.renderOrder = 3;
    content.add(glassBack, glassFront);

    // ---------------------------------------------------------- Schnee
    const N = reduced ? 260 : 520;
    const P = new Float32Array(N * 3);
    const Vv = new Float32Array(N * 3);
    const settled = new Uint8Array(N); // 0 schwebt, 1 Boden, 2 Glas
    const sizes = new Float32Array(N);
    function randomInside(i, high) {
      for (;;) {
        const x = rand(-0.9, 0.9);
        const y = high ? rand(0.0, 0.9) : rand(-0.35, 0.85);
        const z = rand(-0.9, 0.9);
        if (x * x + y * y + z * z < R_IN * R_IN * 0.92 && y > groundY(x, z) + 0.03) {
          P[i * 3] = x;
          P[i * 3 + 1] = y;
          P[i * 3 + 2] = z;
          return;
        }
      }
    }
    for (let i = 0; i < N; i++) {
      sizes[i] = rand(0.55, 1.3) * (Math.random() < 0.1 ? 1.5 : 1);
      if (i < N * 0.5) {
        // liegt schon am Boden
        let x;
        let z;
        do {
          x = rand(-0.92, 0.92);
          z = rand(-0.92, 0.92);
        } while (x * x + z * z > 0.85);
        P[i * 3] = x;
        P[i * 3 + 1] = groundY(x, z) + 0.006;
        P[i * 3 + 2] = z;
        settled[i] = 1;
      } else randomInside(i, true);
    }
    const snowGeo = G(new BufferGeometry());
    const posAttr = new BufferAttribute(P, 3);
    snowGeo.setAttribute('position', posAttr);
    snowGeo.setAttribute('size', new BufferAttribute(sizes, 1));
    const snowMat = keep(new ShaderMaterial({
      uniforms: { scale: { value: 100 } },
      vertexShader: SNOW_VERT, fragmentShader: SNOW_FRAG,
      transparent: true, depthWrite: false,
    }));
    const snow = new Points(snowGeo, snowMat);
    snow.renderOrder = 2;
    snow.frustumCulled = false;
    content.add(snow);

    const gLocal = new Vector3();
    const qTmp = new Quaternion();
    let shakeE = 0;
    let swirlAxis = new Vector3(0, 1, 0);
    function stepSnow(dt) {
      content.getWorldQuaternion(qTmp).invert();
      gLocal.set(0, -1, 0).applyQuaternion(qTmp);
      const gx = gLocal.x;
      const gy = gLocal.y;
      const gz = gLocal.z;
      const fall = 0.16;
      const drag = Math.exp(-dt * 2.2);
      const kick = shakeE;
      for (let i = 0; i < N; i++) {
        const k = i * 3;
        let x = P[k];
        let y = P[k + 1];
        let z = P[k + 2];
        if (settled[i]) {
          // wieder aufwirbeln: beim Schütteln oder wenn die Kugel gekippt ist
          let lift = false;
          if (kick > 0.05 && Math.random() < kick * dt * 9) lift = true;
          else if (settled[i] === 1 && gy > -0.35 && Math.random() < dt * (gy + 0.6) * 1.5) lift = true;
          else if (settled[i] === 2) {
            const r = Math.hypot(x, y, z) || 1;
            if ((x * gx + y * gy + z * gz) / r < 0.15 && Math.random() < dt * 1.5) lift = true;
          }
          if (!lift) continue;
          settled[i] = 0;
          Vv[k] = rand(-1, 1) * kick * 0.9;
          Vv[k + 1] = rand(0.2, 1.2) * kick * 0.9 - gy * 0.05;
          Vv[k + 2] = rand(-1, 1) * kick * 0.9;
        }
        let vx = Vv[k];
        let vy = Vv[k + 1];
        let vz = Vv[k + 2];
        // sinken (Flüssigkeit: Zielgeschwindigkeit) + Wirbel
        const s = 0.75 + (i % 7) * 0.06;
        vx += (gx * fall * s - vx) * dt * 0.9;
        vy += (gy * fall * s - vy) * dt * 0.9;
        vz += (gz * fall * s - vz) * dt * 0.9;
        if (kick > 0.02) {
          // Strudel um die Achse
          const ax = swirlAxis.x;
          const ay = swirlAxis.y;
          const az = swirlAxis.z;
          vx += (ay * z - az * y) * kick * dt * 2.2 + rand(-1, 1) * kick * dt * 2;
          vy += (az * x - ax * z) * kick * dt * 2.2 + rand(-1, 1) * kick * dt * 2;
          vz += (ax * y - ay * x) * kick * dt * 2.2 + rand(-1, 1) * kick * dt * 2;
        }
        vx *= drag + (1 - drag) * 0.7;
        vy *= drag + (1 - drag) * 0.7;
        vz *= drag + (1 - drag) * 0.7;
        // leichtes Taumeln
        x += (vx + Math.sin(i * 1.3 + tNow * 1.7) * 0.012) * dt;
        y += vy * dt;
        z += (vz + Math.cos(i * 0.7 + tNow * 1.3) * 0.012) * dt;
        // Boden
        const gyH = groundY(x, z);
        if (y < gyH + 0.006 && x * x + z * z < 0.88) {
          y = gyH + 0.006;
          if (gy < -0.35 && Math.hypot(vx, vy, vz) < 0.45 + kick) {
            settled[i] = 1;
            vx = vy = vz = 0;
          } else if (vy < 0) vy = -vy * 0.2;
        }
        // Glas
        const r2 = x * x + y * y + z * z;
        if (r2 > R_IN * R_IN) {
          const r = Math.sqrt(r2);
          const nx = x / r;
          const ny = y / r;
          const nz = z / r;
          x = nx * R_IN;
          y = ny * R_IN;
          z = nz * R_IN;
          const vn = vx * nx + vy * ny + vz * nz;
          if (vn > 0) {
            vx -= vn * nx * 1.3;
            vy -= vn * ny * 1.3;
            vz -= vn * nz * 1.3;
          }
          if (nx * gx + ny * gy + nz * gz > 0.45 && kick < 0.1 && y > GROUND_Y + 0.02) {
            settled[i] = 2;
            vx = vy = vz = 0;
          }
          if (y < GROUND_Y + 0.006) y = GROUND_Y + 0.006;
        }
        P[k] = x;
        P[k + 1] = y;
        P[k + 2] = z;
        Vv[k] = vx;
        Vv[k + 1] = vy;
        Vv[k + 2] = vz;
      }
      posAttr.needsUpdate = true;
    }

    // ---------------------------------------------------------- Ansicht & Größe
    let W = 1;
    let H = 1;
    function resize() {
      const r = holder.getBoundingClientRect();
      W = Math.max(1, Math.round(r.width));
      H = Math.max(1, Math.round(r.height));
      renderer.setSize(W, H, false);
      camera.aspect = W / H;
      // so weit weg, dass die Kugel (mit Sockel) in jeder Lage in die Breite passt
      const vt = Math.tan((camera.fov * Math.PI) / 360);
      const ht = vt * camera.aspect;
      const dist = Math.max(1.24 / ht, 1.55 / vt);
      camera.position.set(0, dist * 0.09, dist);
      camera.lookAt(0, -0.12, 0);
      camera.updateProjectionMatrix();
      snowMat.uniforms.scale.value = H * renderer.getPixelRatio() * 0.012 * (1 / vt) * 1.0;
    }
    const ro = new ResizeObserver(resize);
    ro.observe(holder);
    resize();

    // ---------------------------------------------------------- Bedienung
    const q = new Quaternion();
    const qStep = new Quaternion();
    const AX_X = new Vector3(1, 0, 0);
    const AX_Y = new Vector3(0, 1, 0);
    let velX = 0; // rad/s um Y (horizontal wischen)
    let velY = 0; // rad/s um X
    let touched = false;
    let drag = null;
    const SENS = 0.0085;
    let shakeTimes = [];
    let lastSign = 0;
    let shakes = 0;

    function rotateBy(ax, ay) {
      qStep.setFromAxisAngle(AX_Y, ax);
      q.premultiply(qStep);
      qStep.setFromAxisAngle(AX_X, ay);
      q.premultiply(qStep);
      q.normalize();
    }

    const el = renderer.domElement;
    el.style.touchAction = 'none';
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      el.setPointerCapture?.(e.pointerId);
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t0: performance.now(), t: performance.now(), moved: 0 };
      touched = true;
      upright = null;
      velX = velY = 0;
    });
    el.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const now = performance.now();
      const dt = Math.max(0.008, (now - drag.t) / 1000);
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      drag.x = e.clientX;
      drag.y = e.clientY;
      drag.t = now;
      drag.moved += Math.abs(dx) + Math.abs(dy);
      rotateBy(dx * SENS, dy * SENS);
      velX = velX * 0.5 + ((dx * SENS) / dt) * 0.5;
      velY = velY * 0.5 + ((dy * SENS) / dt) * 0.5;
      // Wirbel durch schnelle Bewegung
      const speed = Math.hypot(dx, dy) / dt;
      if (speed > 700) {
        shakeE = Math.min(1.2, shakeE + (speed - 700) * 0.00004);
        swirlAxis.set(-dy, dx, 0).normalize().applyQuaternion(qTmp.copy(q).invert());
      }
      // Schütteln erkennen: schnelle Richtungswechsel
      const vx = dx / dt;
      if (Math.abs(vx) > 650) {
        const sign = Math.sign(vx);
        if (lastSign && sign !== lastSign) {
          shakeTimes.push(now);
          shakeTimes = shakeTimes.filter((t) => now - t < 900);
          if (shakeTimes.length >= 2) {
            shakeTimes = [];
            shake(0.9);
          }
        }
        lastSign = sign;
      }
    });
    const release = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const tap = drag.moved < 10 && performance.now() - drag.t0 < 400;
      if (performance.now() - drag.t > 80) velX = velY = 0;
      const d = drag;
      drag = null;
      if (tap) onTap(d.x0, d.y0);
    };
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);

    // Antippen: Hütte, Kaninchen, Laterne
    const ray = new Raycaster();
    const ndc = new Vector2();
    let hutOn = true;
    let hutToggles = 0;
    let lanternBoost = 0;
    const hops = new Map();
    function onTap(cx, cy) {
      const r = el.getBoundingClientRect();
      ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hits = ray.intersectObjects([hut, lorelai, logan, lantern], true);
      if (!hits.length) return;
      let o = hits[0].object;
      while (o && o.parent !== content) o = o.parent;
      if (o === hut) {
        hutOn = !hutOn;
        stage.dataset.licht = hutOn ? 'an' : 'aus';
        hutToggles++;
        ctx.sfx.play('tick');
        ctx.tone(hutOn ? 880 : 520, { dur: 0.12, vol: 0.06, type: 'triangle' });
        if (hutToggles === 1) ctx.ui.toast(hutOn ? 'Licht an.' : 'Psst. Logan macht ein Nickerchen.');
        else if (hutToggles === 2) ctx.ui.toast('Und wieder an – Lorelai liest noch.');
      } else if (o === lorelai || o === logan) {
        hops.set(o, 0);
        ctx.sfx.play('hop');
        if (!o.userData.said) {
          o.userData.said = true;
          ctx.ui.toast(o === lorelai ? 'Lorelai: „Ich war zuerst hier. Rein zufällig.“' : 'Logan: „Gibt es hier drin eigentlich Möhren?“');
        }
      } else if (o === lantern) {
        lanternBoost = 1;
        ctx.sfx.play('chime');
      }
    }

    function shake(power) {
      shakes++;
      shakeE = Math.max(shakeE, power);
      swirlAxis.set(rand(-0.4, 0.4), 1, rand(-0.4, 0.4)).normalize();
      wobT = 0;
      ctx.sfx.bell(ctx.NOTES.G5, { vol: 0.05, dur: 2.2 });
      ctx.sfx.bell(ctx.NOTES.E6, { vol: 0.035, dur: 1.8, at: 0.12 });
      ctx.sfx.hiss({ dur: 0.6, vol: 0.035, from: 2500, to: 6000 });
      ctx.ui.haptic(18);
      if (!firstShakeAt) firstShakeAt = tNow;
    }

    // Aufrichten
    let upright = null;
    let tilted = 0;
    function startUpright() {
      upright = { from: q.clone(), t: 0 };
      velX = velY = 0;
    }

    // ---------------------------------------------------------- Ablauf, Fund
    let tNow = 0;
    let t0 = null;
    let wobT = 9;
    let firstShakeAt = 0;
    let found = false;
    let finished = ctx.isDone;
    let hinted = false;
    let lookDown = 0;
    let glowPulse = 0;
    const camDir = new Vector3();
    const bottomN = new Vector3();
    const wq = new Quaternion();
    const pivot = new Vector3();

    function onFound() {
      found = true;
      glowPulse = 1;
      ctx.sfx.play('success');
      setTimeout(() => !dead && ctx.sfx.play('sparkle'), 450);
      const r = el.getBoundingClientRect();
      ctx.fx.burst(r.left + r.width / 2, r.top + r.height * 0.45, { kind: 'star', count: 34, power: 260, colors: ['#ffe7a8', '#ffc56e', '#fff3c4'] });
      line.classList.remove('hint');
      line.textContent = 'Gefunden! Die schönsten Gravuren stehen da, wo sonst keiner hinschaut.';
      line.classList.add('found');
      finish();
    }
    function finish() {
      if (finished && ctx.isDone) return;
      finished = true;
      ctx.complete();
    }

    // ---------------------------------------------------------- Schleife
    let dead = false;
    let lost = false;
    el.addEventListener('webglcontextlost', onLost);
    function onLost(e) {
      e.preventDefault();
      lost = true;
      line.textContent = 'Die Schneekugel ist kurz beschlagen. Schließ das Türchen und öffne es noch einmal.';
    }
    const stop = ctx.fx.loop((dt, t) => {
      if (document.hidden || lost) return;
      if (t0 === null) t0 = t;
      tNow = t - t0;

      // Drehung mit Trägheit
      if (!drag) {
        if (upright) {
          upright.t = Math.min(1, upright.t + dt * 1.6);
          const k = 1 - (1 - upright.t) ** 3;
          q.slerpQuaternions(upright.from, new Quaternion(), k);
          if (upright.t >= 1) upright = null;
        } else if (!touched && !reduced) {
          rotateBy(dt * 0.18, 0);
        } else if (Math.abs(velX) + Math.abs(velY) > 0.001) {
          rotateBy(velX * dt, velY * dt);
          const d = Math.exp(-dt * 2.6);
          velX *= d;
          velY *= d;
        }
      }
      rig.quaternion.copy(q);

      // Wackeln beim Schütteln
      wobT += dt;
      if (wobT < 1.3 && !reduced) {
        const a = Math.exp(-wobT * 3.2) * Math.sin(wobT * 26);
        wob.rotation.z = a * 0.12;
        wob.position.x = a * 0.06;
      } else {
        wob.rotation.z = 0;
        wob.position.x = 0;
      }
      shakeE *= Math.exp(-dt * 1.1);
      if (shakeE < 0.01) shakeE = 0;

      stepSnow(dt);

      // Hüttenlicht, Laterne
      const flick = 0.85 + 0.15 * Math.sin(t * 13) * Math.sin(t * 7.3);
      M.win.emissiveIntensity += ((hutOn ? 2.4 * flick : 0.02) - M.win.emissiveIntensity) * Math.min(1, dt * 10);
      hutLight.intensity = hutOn ? 0.35 * flick : 0;
      lanternBoost *= Math.exp(-dt * 1.5);
      lanternLight.intensity = (0.45 + lanternBoost * 0.9) * (0.9 + 0.1 * Math.sin(t * 17));
      M.lamp.emissiveIntensity = 2.6 + lanternBoost * 3;

      // Kaninchen hüpfen
      for (const [b, ht] of hops) {
        const nt = ht + dt;
        const y = nt < 0.45 ? Math.sin((nt / 0.45) * Math.PI) * 0.07 : 0;
        b.position.y = b.userData.baseY + y;
        if (nt >= 0.45) hops.delete(b);
        else hops.set(b, nt);
      }

      // Unterseite sichtbar?
      content.getWorldQuaternion(wq);
      bottomN.set(0, -1, 0).applyQuaternion(wq);
      content.getWorldPosition(pivot);
      camDir.copy(camera.position).sub(pivot).normalize();
      const facing = bottomN.dot(camDir);
      if (!found && facing > 0.8) {
        lookDown += dt;
        if (lookDown > 0.5) onFound();
      } else lookDown = 0;
      glowPulse *= Math.exp(-dt * 0.5);
      engrMat.emissiveIntensity = 0.14 + glowPulse * 1.3 + (found ? 0.25 : 0);

      // Aufrichten anbieten, wenn die Kugel lange schief liegt
      const upY = new Vector3(0, 1, 0).applyQuaternion(q).y;
      tilted = upY < 0.5 && !drag && !upright ? tilted + dt : 0;
      uprightBtn.classList.toggle('show', tilted > 1.5);

      // Hinweis und Ausweg
      if (!found && !hinted && tNow > 22) {
        hinted = true;
        line.textContent = 'Manche Dinge liest man nur von unten.';
        line.classList.add('hint');
      }
      if (!found && !finished && firstShakeAt && tNow > 30 && tNow - firstShakeAt > 6) finish();

      renderer.render(scene, camera);
    });

    return () => {
      dead = true;
      stop();
      ro.disconnect();
      el.removeEventListener('webglcontextlost', onLost);
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
      });
      for (const g of geos) g.dispose();
      for (const d of disposables) d.dispose?.();
      scene.environment = null;
      renderer.dispose();
      renderer.forceContextLoss?.();
      el.remove();
    };
  },
};
