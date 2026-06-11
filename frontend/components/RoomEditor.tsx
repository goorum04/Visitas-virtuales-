'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

type WallId = 'back' | 'left' | 'right' | 'ceiling';

interface FurnitureItem {
  id: string; name: string; category: string; emoji: string;
  primary: number; secondary?: number;
}
interface PlacedItem { uid: string; item: FurnitureItem; group: THREE.Group; }

const WALL_COLORS = [
  { name: 'Blanco roto',    hex: '#f2ece3' },
  { name: 'Crema',          hex: '#ede0cb' },
  { name: 'Gris perla',     hex: '#d8d5d0' },
  { name: 'Azul suave',     hex: '#c4d4e6' },
  { name: 'Verde sage',     hex: '#c3d2be' },
  { name: 'Terracota',      hex: '#e4bfaa' },
  { name: 'Amarillo cálido',hex: '#eedea0' },
  { name: 'Lavanda',        hex: '#d4c7e6' },
  { name: 'Gris oscuro',    hex: '#686b70' },
  { name: 'Antracita',      hex: '#3a3d42' },
];

const FLOOR_TINTS = [
  { name: 'Natural',       hex: '#ffffff' },
  { name: 'Roble cálido',  hex: '#e8d4a0' },
  { name: 'Nogal',         hex: '#7a4f28' },
  { name: 'Gris lavado',   hex: '#c0bdb6' },
  { name: 'Baldosa clara', hex: '#f0edea' },
  { name: 'Cemento',       hex: '#8a8c8e' },
];

const CATALOG: FurnitureItem[] = [
  { id: 'sofa3',    name: 'Sofá 3 plazas',  category: 'Sala',    emoji: '🛋️', primary: 0x7a6245 },
  { id: 'sofa2',    name: 'Sofá 2 plazas',  category: 'Sala',    emoji: '🛋️', primary: 0x4e6070 },
  { id: 'armchair', name: 'Sillón',         category: 'Sala',    emoji: '🪑',  primary: 0x8b6e44 },
  { id: 'coffee',   name: 'Mesa de centro', category: 'Sala',    emoji: '🪵',  primary: 0x5a3820, secondary: 0x909090 },
  { id: 'dining',   name: 'Mesa comedor',   category: 'Comedor', emoji: '🍽️', primary: 0x6b4828 },
  { id: 'chair',    name: 'Silla comedor',  category: 'Comedor', emoji: '🪑',  primary: 0x3a3a38 },
  { id: 'bed',      name: 'Cama doble',     category: 'Dormit.', emoji: '🛏️', primary: 0xa89070, secondary: 0xd8d0c8 },
  { id: 'wardrobe', name: 'Armario',        category: 'Dormit.', emoji: '🗄️', primary: 0xc0a882 },
  { id: 'lamp',     name: 'Lámpara pie',    category: 'Decor',   emoji: '💡',  primary: 0xb89030, secondary: 0xe8e4d8 },
  { id: 'plant',    name: 'Planta grande',  category: 'Decor',   emoji: '🌿',  primary: 0x2e6a34, secondary: 0x5a3018 },
  { id: 'tv',       name: 'TV + mueble',    category: 'Electr.', emoji: '📺',  primary: 0x181818, secondary: 0x4a4030 },
  { id: 'shelf',    name: 'Estantería',     category: 'Electr.', emoji: '📚',  primary: 0x7a5a30 },
];

const CATEGORIES = ['Todos', 'Sala', 'Comedor', 'Dormit.', 'Electr.', 'Decor'];
const WALL_LABELS: Record<WallId, string> = { back: 'Fondo', left: 'Izquierda', right: 'Derecha', ceiling: 'Techo' };

// ── Textures ────────────────────────────────────────────────────────────────

function makeWoodTex(): THREE.CanvasTexture {
  const S = 1024;
  const cv = document.createElement('canvas'); cv.width = cv.height = S;
  const cx = cv.getContext('2d')!;
  const PW = S / 5, PH = S / 4;
  for (let row = 0; row < 5; row++) {
    for (let col = -1; col < 7; col++) {
      const shift = (row % 2) * (PW / 2);
      const x = col * PW + shift, y = row * PH;
      cx.fillStyle = `hsl(26,52%,${36 + Math.random() * 16}%)`;
      cx.fillRect(x + 1, y + 1, PW - 2, PH - 2);
      cx.save(); cx.globalAlpha = 0.06; cx.strokeStyle = '#000'; cx.lineWidth = 0.9;
      for (let g = 1; g < 10; g++) {
        const gy = y + (g / 10) * PH;
        cx.beginPath();
        cx.moveTo(x, gy + (Math.random() - 0.5) * 4);
        cx.bezierCurveTo(x + PW * 0.4, gy + (Math.random() - 0.5) * 6, x + PW * 0.7, gy + (Math.random() - 0.5) * 6, x + PW, gy + (Math.random() - 0.5) * 4);
        cx.stroke();
      }
      cx.restore();
      cx.fillStyle = 'rgba(0,0,0,0.22)';
      cx.fillRect(x, y, 1.5, PH); cx.fillRect(x, y, PW, 1.5);
    }
  }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2.5, 1.8);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makePlasterNormal(): THREE.CanvasTexture {
  const S = 256;
  const cv = document.createElement('canvas'); cv.width = cv.height = S;
  const cx = cv.getContext('2d')!; cx.fillStyle = '#8080ff'; cx.fillRect(0, 0, S, S);
  const id = cx.getImageData(0, 0, S, S);
  for (let i = 0; i < id.data.length; i += 4) {
    id.data[i]   = 128 + (Math.random() - 0.5) * 18;
    id.data[i+1] = 128 + (Math.random() - 0.5) * 18;
    id.data[i+2] = 255; id.data[i+3] = 255;
  }
  cx.putImageData(id, 0, 0);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 4);
  return t;
}

// ── Material helper ─────────────────────────────────────────────────────────

function stdMat(color: number, rough: number, metal = 0, envI = 0.5) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, envMapIntensity: envI });
}

// ── Furniture builders ──────────────────────────────────────────────────────

function sofa(w: number, col: number): THREE.Group {
  const g = new THREE.Group(); const f = stdMat(col, 0.9);
  const box = (gx: number, gy: number, gz: number, sx: number, sy: number, sz: number, m = f) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m);
    mesh.position.set(gx, gy, gz); mesh.castShadow = true; mesh.receiveShadow = true; g.add(mesh);
  };
  box(0, 0.21, 0, w, 0.42, 0.80);
  box(0, 0.60, -0.31, w, 0.56, 0.18);
  box(-(w/2+0.09), 0.27, 0, 0.18, 0.52, 0.80);
  box( (w/2+0.09), 0.27, 0, 0.18, 0.52, 0.80);
  const legM = stdMat(0x1e1008, 0.4, 0.1);
  [[-w/2+0.12,0.35],[-w/2+0.12,-0.34],[w/2-0.12,0.35],[w/2-0.12,-0.34]].forEach(([lx,lz]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.1, 7), legM);
    leg.position.set(lx, -0.04, lz); g.add(leg);
  });
  return g;
}

function armchair(col: number): THREE.Group {
  const g = new THREE.Group(); const f = stdMat(col, 0.9);
  const box = (gx: number, gy: number, gz: number, sx: number, sy: number, sz: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), f);
    m.position.set(gx, gy, gz); m.castShadow = true; g.add(m);
  };
  box(0, 0.22, 0, 0.84, 0.42, 0.80); box(0, 0.62, -0.31, 0.84, 0.58, 0.18);
  box(-0.51, 0.26, 0, 0.18, 0.48, 0.80); box(0.51, 0.26, 0, 0.18, 0.48, 0.80);
  return g;
}

function coffeeTable(col: number, metalCol: number): THREE.Group {
  const g = new THREE.Group();
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.055, 0.58), stdMat(col, 0.6));
  top.position.y = 0.44; top.castShadow = true; top.receiveShadow = true; g.add(top);
  const legM = stdMat(metalCol, 0.25, 0.75, 0.85);
  [[-0.46,0.25],[-0.46,-0.23],[0.46,0.25],[0.46,-0.23]].forEach(([lx,lz]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.018, 0.44, 8), legM);
    leg.position.set(lx, 0.22, lz); g.add(leg);
  });
  return g;
}

function diningTable(col: number): THREE.Group {
  const g = new THREE.Group();
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.06, 0.90), stdMat(col, 0.6));
  top.position.y = 0.75; top.castShadow = true; top.receiveShadow = true; g.add(top);
  const wM = stdMat(col, 0.65);
  [[-0.82,0.38],[-0.82,-0.38],[0.82,0.38],[0.82,-0.38]].forEach(([lx,lz]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.75, 0.06), wM);
    leg.position.set(lx, 0.375, lz); leg.castShadow = true; g.add(leg);
  });
  return g;
}

function diningChair(col: number): THREE.Group {
  const g = new THREE.Group(); const m = stdMat(col, 0.7);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.04, 0.44), m);
  seat.position.y = 0.46; seat.castShadow = true; g.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.52, 0.04), m);
  back.position.set(0, 0.72, -0.2); back.castShadow = true; g.add(back);
  [[-0.2,0.2],[-0.2,-0.2],[0.2,0.2],[0.2,-0.2]].forEach(([lx,lz]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.014, 0.46, 6), m);
    leg.position.set(lx, 0.23, lz); g.add(leg);
  });
  return g;
}

function bed(col: number, pilCol: number): THREE.Group {
  const g = new THREE.Group(); const frame = stdMat(col, 0.7);
  const base = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.26, 1.9), frame);
  base.position.y = 0.13; base.castShadow = true; base.receiveShadow = true; g.add(base);
  const mattress = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.2, 1.78), stdMat(0xf0ece6, 0.92));
  mattress.position.y = 0.36; mattress.castShadow = true; g.add(mattress);
  const duvet = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.1, 1.40), stdMat(0xffffff, 0.95));
  duvet.position.set(0, 0.41, 0.18); duvet.castShadow = true; g.add(duvet);
  const headboard = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.7, 0.1), frame);
  headboard.position.set(0, 0.61, -0.95); headboard.castShadow = true; g.add(headboard);
  const pM = stdMat(pilCol, 0.92);
  [-0.46, 0.46].forEach(px => {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.14, 0.42), pM);
    p.position.set(px, 0.5, -0.62); p.rotation.x = 0.07; p.castShadow = true; g.add(p);
  });
  return g;
}

function wardrobe(col: number): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.2, 0.58), stdMat(col, 0.7));
  body.position.y = 1.1; body.castShadow = true; body.receiveShadow = true; g.add(body);
  const hM = stdMat(0x909090, 0.25, 0.8, 1.0);
  [-0.46, 0.46].forEach(dx => {
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.12, 8), hM);
    handle.rotation.x = Math.PI / 2;
    handle.position.set(dx > 0 ? dx - 0.08 : dx + 0.08, 1.1, 0.305); g.add(handle);
  });
  return g;
}

function floorLamp(col: number, shadeCol: number): THREE.Group {
  const g = new THREE.Group(); const metal = stdMat(col, 0.3, 0.65, 0.9);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.06, 16), metal);
  base.position.y = 0.03; g.add(base);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 1.55, 8), metal);
  pole.position.y = 0.82; pole.castShadow = true; g.add(pole);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.38, 16, 1, true), stdMat(shadeCol, 0.85));
  shade.position.y = 1.72; shade.rotation.x = Math.PI; g.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xfffde8, emissive: 0xfffde8, emissiveIntensity: 2.5, roughness: 0.05 }));
  bulb.position.y = 1.62; g.add(bulb);
  return g;
}

function plant(leafCol: number): THREE.Group {
  const g = new THREE.Group();
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.17, 0.36, 14), stdMat(0x9a6042, 0.82));
  pot.position.y = 0.18; pot.castShadow = true; pot.receiveShadow = true; g.add(pot);
  const soil = new THREE.Mesh(new THREE.CircleGeometry(0.21, 14), stdMat(0x3a2010, 0.95));
  soil.rotation.x = -Math.PI / 2; soil.position.y = 0.37; g.add(soil);
  const leafM = stdMat(leafCol, 0.9);
  [{ r:0.40,h:0.52,y:0.70 },{ r:0.32,h:0.48,y:1.06 },{ r:0.23,h:0.42,y:1.40 },{ r:0.14,h:0.34,y:1.68 }].forEach(({ r,h,y }) => {
    const c = new THREE.Mesh(new THREE.ConeGeometry(r, h, 11), leafM);
    c.position.y = y; c.castShadow = true; g.add(c);
  });
  return g;
}

function tvUnit(screenCol: number, cabinetCol: number): THREE.Group {
  const g = new THREE.Group();
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.48, 0.40), stdMat(cabinetCol, 0.68));
  cab.position.y = 0.24; cab.castShadow = true; cab.receiveShadow = true; g.add(cab);
  const legM = stdMat(0x202020, 0.3, 0.6);
  [[-0.7,0.16],[0.7,0.16],[-0.7,-0.16],[0.7,-0.16]].forEach(([lx,lz]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.08, 6), legM);
    leg.position.set(lx, 0.04, lz); g.add(leg);
  });
  const screen = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.80, 0.055), stdMat(screenCol, 0.28, 0.55));
  screen.position.y = 1.01; screen.castShadow = true; g.add(screen);
  const display = new THREE.Mesh(new THREE.PlaneGeometry(1.26, 0.70),
    new THREE.MeshStandardMaterial({ color: 0x060c14, emissive: 0x060c14, emissiveIntensity: 0.5, roughness: 0.02, metalness: 0.1 }));
  display.position.set(0, 1.01, 0.032); g.add(display);
  return g;
}

function bookshelf(col: number): THREE.Group {
  const g = new THREE.Group(); const wood = stdMat(col, 0.66);
  [-0.58, 0.58].forEach(x => {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.1, 0.32), wood);
    s.position.set(x, 1.05, 0); s.castShadow = true; g.add(s);
  });
  [0.14, 0.60, 1.06, 1.52, 2.0].forEach(y => {
    const s = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.04, 0.32), wood);
    s.position.y = y; s.castShadow = true; s.receiveShadow = true; g.add(s);
  });
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.16, 2.06, 0.02), stdMat(Math.round(col * 0.85), 0.75));
  back.position.set(0, 1.05, -0.15); g.add(back);
  return g;
}

function buildFurniture(item: FurnitureItem): THREE.Group {
  const { id, primary: p, secondary: s = 0x888880 } = item;
  switch (id) {
    case 'sofa3':    return sofa(2.2, p);
    case 'sofa2':    return sofa(1.6, p);
    case 'armchair': return armchair(p);
    case 'coffee':   return coffeeTable(p, s);
    case 'dining':   return diningTable(p);
    case 'chair':    return diningChair(p);
    case 'bed':      return bed(p, s);
    case 'wardrobe': return wardrobe(p);
    case 'lamp':     return floorLamp(p, s);
    case 'plant':    return plant(p);
    case 'tv':       return tvUnit(p, s);
    case 'shelf':    return bookshelf(p);
    default: {
      const g = new THREE.Group();
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), stdMat(p, 0.7));
      m.position.y = 0.4; m.castShadow = true; g.add(m); return g;
    }
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export default function RoomEditor({ uploadedImageUrl }: { uploadedImageUrl: string | null }) {
  const canvasRef       = useRef<HTMLCanvasElement>(null);
  const sceneRef        = useRef<THREE.Scene | null>(null);
  const rendererRef     = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef     = useRef<OrbitControls | null>(null);
  const cameraRef       = useRef<THREE.PerspectiveCamera | null>(null);
  const placedRef       = useRef<PlacedItem[]>([]);
  const rafRef          = useRef<number>(0);
  const wallMatRefs     = useRef<Record<WallId, THREE.MeshStandardMaterial | null>>({ back: null, left: null, right: null, ceiling: null });
  const floorMatRef     = useRef<THREE.MeshStandardMaterial | null>(null);
  const selectedGrpRef  = useRef<THREE.Group | null>(null);
  const boxHelperRef    = useRef<THREE.BoxHelper | null>(null);
  const wallMeshToId    = useRef<Map<THREE.Mesh, WallId>>(new Map());

  const [wallColors, setWallColors] = useState<Record<WallId, string>>({
    back: '#f2ece3', left: '#f2ece3', right: '#f2ece3', ceiling: '#faf7f2',
  });
  const [selectedWall,    setSelectedWall]    = useState<WallId>('back');
  const [activeTab,       setActiveTab]       = useState<'furniture' | 'walls' | 'floor'>('furniture');
  const [floorTint,       setFloorTint]       = useState('#ffffff');
  const [activeCategory,  setActiveCategory]  = useState('Todos');
  const [placed,          setPlaced]          = useState<PlacedItem[]>([]);
  const [selectedUid,     setSelectedUid]     = useState<string | null>(null);
  const [panelOpen,       setPanelOpen]       = useState(true);

  // Live material updates
  useEffect(() => {
    const r = wallMatRefs.current;
    if (r.back)    r.back.color.set(wallColors.back);
    if (r.left)    r.left.color.set(wallColors.left);
    if (r.right)   r.right.color.set(wallColors.right);
    if (r.ceiling) r.ceiling.color.set(wallColors.ceiling);
  }, [wallColors]);

  useEffect(() => {
    if (floorMatRef.current) floorMatRef.current.color.set(floorTint);
  }, [floorTint]);

  useEffect(() => {
    if (!selectedUid) {
      selectedGrpRef.current = null;
      if (boxHelperRef.current) boxHelperRef.current.visible = false;
    }
  }, [selectedUid]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.parentElement?.clientWidth || 800;
    const H = canvas.parentElement?.clientHeight || 600;

    // Scene + renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0d0d12');
    sceneRef.current = scene;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type   = THREE.PCFSoftShadowMap;
    renderer.toneMapping         = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.82;
    renderer.outputColorSpace    = THREE.SRGBColorSpace;
    rendererRef.current = renderer;

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(52, W / H, 0.1, 60);
    camera.position.set(0, 2.4, 6.0);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.06;
    controls.minDistance = 1.5; controls.maxDistance = 12;
    controls.maxPolarAngle = Math.PI / 2 + 0.1;
    controls.target.set(0, 0.8, 0);
    controlsRef.current = controls;

    // Lights
    scene.add(new THREE.AmbientLight(0xfff0d8, 0.30));
    const winLight = new THREE.DirectionalLight(0xfff3ce, 3.0);
    winLight.position.set(1.5, 5, -7); winLight.target.position.set(0, 0, 1.5);
    winLight.castShadow = true; winLight.shadow.mapSize.set(2048, 2048);
    winLight.shadow.camera.near = 2; winLight.shadow.camera.far = 20;
    winLight.shadow.camera.left = -5; winLight.shadow.camera.right = 5;
    winLight.shadow.camera.top = 5; winLight.shadow.camera.bottom = -5;
    winLight.shadow.bias = -0.001; winLight.shadow.normalBias = 0.025;
    scene.add(winLight); scene.add(winLight.target);
    const ceilLight = new THREE.PointLight(0xfff8e8, 2.2, 10);
    ceilLight.position.set(0, 2.88, 0.4);
    ceilLight.castShadow = true; ceilLight.shadow.mapSize.set(512, 512); ceilLight.shadow.bias = -0.003;
    scene.add(ceilLight);
    const fill = new THREE.DirectionalLight(0xd0e4ff, 0.45);
    fill.position.set(0, 2, 7); scene.add(fill);

    // Room geometry
    const RW = 7, RH = 3, RD = 6.5;
    const plasterN = makePlasterNormal();
    const mkWallMat = (hex: string) => new THREE.MeshStandardMaterial({
      color: new THREE.Color(hex), roughness: 0.92, metalness: 0,
      normalMap: plasterN, normalScale: new THREE.Vector2(0.35, 0.35), envMapIntensity: 0.12,
    });

    const backMat  = mkWallMat('#f2ece3');
    const leftMat  = mkWallMat('#f2ece3');
    const rightMat = mkWallMat('#f2ece3');
    const ceilMat  = new THREE.MeshStandardMaterial({ color: new THREE.Color('#faf7f2'), roughness: 0.88, envMapIntensity: 0.1 });
    wallMatRefs.current = { back: backMat, left: leftMat, right: rightMat, ceiling: ceilMat };

    const woodTex  = makeWoodTex();
    const floorMat = new THREE.MeshStandardMaterial({ map: woodTex, color: new THREE.Color('#ffffff'), roughness: 0.62, metalness: 0, envMapIntensity: 0.38 });
    floorMatRef.current = floorMat;
    const floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(RW, RD), floorMat);
    floorMesh.rotation.x = -Math.PI / 2; floorMesh.receiveShadow = true; scene.add(floorMesh);

    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(RW, RD), ceilMat);
    ceil.rotation.x = Math.PI / 2; ceil.position.y = RH; scene.add(ceil);

    // Ceiling fixture
    const fixtM = new THREE.MeshStandardMaterial({ color: 0xe8e0d0, roughness: 0.5, metalness: 0.3 });
    const fixture = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.06, 16), fixtM);
    fixture.position.set(0, RH - 0.03, 0.4); scene.add(fixture);
    const bulbGeo = new THREE.SphereGeometry(0.09, 10, 8);
    const bulbMat = new THREE.MeshStandardMaterial({ color: 0xfffde8, emissive: 0xfffde8, emissiveIntensity: 3.0, roughness: 0.05 });
    const bulbMesh = new THREE.Mesh(bulbGeo, bulbMat);
    bulbMesh.position.set(0, RH - 0.1, 0.4); scene.add(bulbMesh);

    // Per-wall meshes registered for click detection
    const addWall = (w: number, h: number, mat: THREE.MeshStandardMaterial, pos: [number,number,number], ry: number, id: WallId) => {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
      mesh.position.set(...pos); mesh.rotation.y = ry; mesh.receiveShadow = true;
      scene.add(mesh); wallMeshToId.current.set(mesh, id);
    };
    addWall(RW, RH, backMat,  [0, RH/2, -RD/2], 0,           'back');
    addWall(RD, RH, leftMat,  [-RW/2, RH/2, 0], Math.PI/2,   'left');
    addWall(RD, RH, rightMat, [RW/2,  RH/2, 0], -Math.PI/2,  'right');

    // Window
    const winFrameM = new THREE.MeshStandardMaterial({ color: 0xe8dfd2, roughness: 0.45, metalness: 0.08 });
    const winFrame  = new THREE.Mesh(new THREE.BoxGeometry(1.85, 1.85, 0.1), winFrameM);
    winFrame.position.set(0, 2.05, -RD/2 + 0.07); scene.add(winFrame);
    const winGlass  = new THREE.Mesh(new THREE.PlaneGeometry(1.60, 1.60),
      new THREE.MeshStandardMaterial({ color: 0xb0d4f4, emissive: 0x70b0e0, emissiveIntensity: 1.4, transparent: true, opacity: 0.6, roughness: 0, metalness: 0.05 }));
    winGlass.position.set(0, 2.05, -RD/2 + 0.12); scene.add(winGlass);
    const barM = new THREE.MeshStandardMaterial({ color: 0xddd5c8, roughness: 0.45 });
    [0, 1].forEach(i => {
      const b = new THREE.Mesh(i === 0 ? new THREE.BoxGeometry(1.60, 0.045, 0.04) : new THREE.BoxGeometry(0.045, 1.60, 0.04), barM);
      b.position.set(0, 2.05, -RD/2 + 0.14); scene.add(b);
    });

    // Skirting boards
    const skirtM = new THREE.MeshStandardMaterial({ color: 0xf0ece4, roughness: 0.55, envMapIntensity: 0.3 });
    const skirt = (w: number, p: [number,number,number], ry: number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, 0.025), skirtM);
      m.position.set(...p); m.rotation.y = ry; m.receiveShadow = true; scene.add(m);
    };
    skirt(RW, [0, 0.05, -RD/2+0.013], 0);
    skirt(RD, [-RW/2+0.013, 0.05, 0], Math.PI/2);
    skirt(RD, [ RW/2-0.013, 0.05, 0], Math.PI/2);

    // Crown molding
    const crownM = new THREE.MeshStandardMaterial({ color: 0xfafaf8, roughness: 0.65 });
    const crown = (w: number, p: [number,number,number], ry: number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.055, 0.055), crownM);
      m.position.set(...p); m.rotation.y = ry; scene.add(m);
    };
    crown(RW, [0, RH-0.028, -RD/2+0.028], 0);
    crown(RD, [-RW/2+0.028, RH-0.028, 0], Math.PI/2);
    crown(RD, [ RW/2-0.028, RH-0.028, 0], Math.PI/2);

    // BoxHelper
    const placeholder = new THREE.Mesh(new THREE.BoxGeometry(0.001, 0.001, 0.001));
    const boxHelper = new THREE.BoxHelper(placeholder, 0x00d4ff);
    boxHelper.visible = false; scene.add(boxHelper);
    boxHelperRef.current = boxHelper;

    // Pre-load example scene
    const examples = [
      { id: 'sofa3',  x: 0,    z: 1.8,  ry: 0             },
      { id: 'coffee', x: 0,    z: 0.42, ry: 0             },
      { id: 'tv',     x: 0,    z: -2.1, ry: Math.PI       },
      { id: 'plant',  x: 2.6,  z: -1.9, ry: 0             },
      { id: 'lamp',   x: -2.4, z: 1.2,  ry: 0             },
      { id: 'shelf',  x: -3.0, z: -0.5, ry: Math.PI / 2   },
    ];
    const initPlaced: PlacedItem[] = [];
    examples.forEach(({ id, x, z, ry }, i) => {
      const item = CATALOG.find(f => f.id === id)!;
      const group = buildFurniture(item);
      group.traverse(c => { if (c instanceof THREE.Mesh) { c.castShadow = true; c.receiveShadow = true; } });
      group.position.set(x, 0, z); group.rotation.y = ry;
      scene.add(group);
      initPlaced.push({ uid: `${id}-init-${i}`, item, group });
    });
    placedRef.current = initPlaced;
    setPlaced([...initPlaced]);

    // Pointer events for furniture drag + wall click
    const raycaster  = new THREE.Raycaster();
    const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    let potDrag: { uid: string; group: THREE.Group } | null = null;
    let isDrag = false;
    let downX = 0, downY = 0;
    const dragOffset = new THREE.Vector3();

    const toNDC = (cx: number, cy: number) => {
      const r = canvas.getBoundingClientRect();
      return new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    };

    const onPD = (e: PointerEvent) => {
      downX = e.clientX; downY = e.clientY; isDrag = false;
      const ndc = toNDC(e.clientX, e.clientY);
      raycaster.setFromCamera(ndc, camera);
      const meshes: THREE.Object3D[] = [];
      placedRef.current.forEach(p => p.group.traverse(c => { if (c instanceof THREE.Mesh) meshes.push(c); }));
      if (meshes.length) {
        const hits = raycaster.intersectObjects(meshes);
        if (hits.length) {
          let obj: THREE.Object3D = hits[0].object;
          while (obj.parent && !(obj.parent instanceof THREE.Scene)) obj = obj.parent;
          const found = placedRef.current.find(p => p.group === obj);
          if (found) {
            potDrag = { uid: found.uid, group: found.group };
            controls.enabled = false;
            canvas.setPointerCapture(e.pointerId);
            const pt = new THREE.Vector3();
            raycaster.ray.intersectPlane(floorPlane, pt);
            dragOffset.set(found.group.position.x - pt.x, 0, found.group.position.z - pt.z);
            return;
          }
        }
      }
    };

    const onPM = (e: PointerEvent) => {
      if (!potDrag) return;
      if (!isDrag && Math.hypot(e.clientX - downX, e.clientY - downY) < 6) return;
      isDrag = true;
      const ndc = toNDC(e.clientX, e.clientY);
      raycaster.setFromCamera(ndc, camera);
      const pt = new THREE.Vector3();
      raycaster.ray.intersectPlane(floorPlane, pt);
      potDrag.group.position.x = Math.max(-RW/2 + 0.5, Math.min(RW/2 - 0.5, pt.x + dragOffset.x));
      potDrag.group.position.z = Math.max(-RD/2 + 0.5, Math.min(RD/2 - 0.5, pt.z + dragOffset.z));
      if (boxHelperRef.current && boxHelperRef.current.visible) {
        boxHelperRef.current.setFromObject(potDrag.group);
      }
    };

    const onPU = (e: PointerEvent) => {
      controls.enabled = true;
      if (potDrag) {
        if (!isDrag) {
          setSelectedUid(potDrag.uid);
          selectedGrpRef.current = potDrag.group;
          if (boxHelperRef.current) {
            boxHelperRef.current.setFromObject(potDrag.group);
            boxHelperRef.current.visible = true;
          }
        }
        canvas.releasePointerCapture(e.pointerId);
        potDrag = null; isDrag = false;
      } else {
        if (Math.hypot(e.clientX - downX, e.clientY - downY) < 6) {
          const ndc = toNDC(e.clientX, e.clientY);
          raycaster.setFromCamera(ndc, camera);
          const wallMeshes = [...wallMeshToId.current.keys()];
          const hits = raycaster.intersectObjects(wallMeshes);
          if (hits.length) {
            const wId = wallMeshToId.current.get(hits[0].object as THREE.Mesh);
            if (wId) { setSelectedWall(wId); setActiveTab('walls'); }
          } else {
            setSelectedUid(null);
            selectedGrpRef.current = null;
            if (boxHelperRef.current) boxHelperRef.current.visible = false;
          }
        }
      }
    };

    canvas.addEventListener('pointerdown', onPD);
    canvas.addEventListener('pointermove', onPM);
    canvas.addEventListener('pointerup', onPU);

    const onResize = () => {
      const w = canvas.parentElement?.clientWidth || 800;
      const h = canvas.parentElement?.clientHeight || 600;
      camera.aspect = w / h; camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('pointerdown', onPD);
      canvas.removeEventListener('pointermove', onPM);
      canvas.removeEventListener('pointerup', onPU);
      cancelAnimationFrame(rafRef.current);
      renderer.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addFurniture(item: FurnitureItem) {
    const scene = sceneRef.current; if (!scene) return;
    const group = buildFurniture(item);
    group.traverse(c => { if (c instanceof THREE.Mesh) { c.castShadow = true; c.receiveShadow = true; } });
    const a = Math.random() * Math.PI * 2, r = 0.5 + Math.random() * 1.6;
    group.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    group.rotation.y = (Math.random() - 0.5) * Math.PI * 0.5;
    scene.add(group);
    const uid = `${item.id}-${Date.now()}`;
    placedRef.current = [...placedRef.current, { uid, item, group }];
    setPlaced([...placedRef.current]);
    setSelectedUid(uid); selectedGrpRef.current = group;
    if (boxHelperRef.current) { boxHelperRef.current.setFromObject(group); boxHelperRef.current.visible = true; }
  }

  function removeItem(uid: string) {
    const scene = sceneRef.current; if (!scene) return;
    const found = placedRef.current.find(p => p.uid === uid);
    if (found) {
      scene.remove(found.group);
      found.group.traverse(c => {
        if (c instanceof THREE.Mesh) {
          c.geometry.dispose();
          (Array.isArray(c.material) ? c.material : [c.material]).forEach((m: THREE.Material) => m.dispose());
        }
      });
    }
    placedRef.current = placedRef.current.filter(p => p.uid !== uid);
    setPlaced([...placedRef.current]);
    if (selectedUid === uid) {
      setSelectedUid(null); selectedGrpRef.current = null;
      if (boxHelperRef.current) boxHelperRef.current.visible = false;
    }
  }

  function rotateSelected(dir: 1 | -1) {
    if (selectedGrpRef.current) selectedGrpRef.current.rotation.y += dir * Math.PI / 4;
  }

  function setWallColor(id: WallId, hex: string) {
    setWallColors(prev => ({ ...prev, [id]: hex }));
  }

  const filtered = activeCategory === 'Todos' ? CATALOG : CATALOG.filter(f => f.category === activeCategory);

  // ── UI ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', height: '100%', position: 'relative' }}>

      {/* Canvas area */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />

        {/* Hint */}
        <div style={{ position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.55)', borderRadius: 8, padding: '5px 14px', fontSize: '0.72rem', color: '#64748b', pointerEvents: 'none', whiteSpace: 'nowrap' }}>
          Arrastra muebles · Órbita con ratón · Clic en pared para pintarla
        </div>

        {/* Panel toggle */}
        <button onClick={() => setPanelOpen(o => !o)}
          style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#94a3b8', cursor: 'pointer', padding: '6px 12px', fontSize: '0.8rem' }}>
          {panelOpen ? '▶ Ocultar' : '◀ Panel'}
        </button>

        {/* Floating selection toolbar */}
        {selectedUid && (
          <div style={{ position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6, background: 'rgba(0,0,0,0.75)', border: '1px solid rgba(0,212,255,0.35)', borderRadius: 10, padding: '6px 10px', backdropFilter: 'blur(6px)' }}>
            <button onClick={() => rotateSelected(-1)}
              style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 6, color: '#94a3b8', cursor: 'pointer', padding: '5px 10px', fontSize: '1rem' }} title="Rotar izquierda">↺</button>
            <button onClick={() => rotateSelected(1)}
              style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 6, color: '#94a3b8', cursor: 'pointer', padding: '5px 10px', fontSize: '1rem' }} title="Rotar derecha">↻</button>
            <button onClick={() => removeItem(selectedUid)}
              style={{ background: '#2d1c1c', border: '1px solid #7f1d1d', borderRadius: 6, color: '#f87171', cursor: 'pointer', padding: '5px 10px', fontSize: '1rem' }} title="Eliminar">🗑</button>
            <button onClick={() => { setSelectedUid(null); selectedGrpRef.current = null; if (boxHelperRef.current) boxHelperRef.current.visible = false; }}
              style={{ background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer', padding: '5px 8px', fontSize: '1rem' }}>✕</button>
          </div>
        )}
      </div>

      {/* Side panel */}
      {panelOpen && (
        <div style={{ width: 282, background: '#0f172a', borderLeft: '1px solid #1f2937', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #1f2937' }}>
            {(['furniture', 'walls', 'floor'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                style={{ flex: 1, padding: '11px 4px', background: activeTab === tab ? '#1e293b' : 'transparent', border: 'none', color: activeTab === tab ? '#e2e8f0' : '#64748b', cursor: 'pointer', fontSize: '0.72rem', fontWeight: activeTab === tab ? 600 : 400, borderBottom: activeTab === tab ? '2px solid #3b82f6' : '2px solid transparent' }}>
                {tab === 'furniture' ? '🛋️ Muebles' : tab === 'walls' ? '🎨 Paredes' : '🪵 Suelo'}
              </button>
            ))}
          </div>

          {/* ── Muebles tab ── */}
          {activeTab === 'furniture' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ display: 'flex', gap: 4, padding: '8px 10px', overflowX: 'auto', flexShrink: 0, scrollbarWidth: 'none' }}>
                {CATEGORIES.map(cat => (
                  <button key={cat} onClick={() => setActiveCategory(cat)}
                    style={{ padding: '4px 10px', borderRadius: 16, border: 'none', background: activeCategory === cat ? '#3b82f6' : '#1e293b', color: activeCategory === cat ? '#fff' : '#94a3b8', cursor: 'pointer', fontSize: '0.72rem', whiteSpace: 'nowrap', fontWeight: activeCategory === cat ? 600 : 400 }}>
                    {cat}
                  </button>
                ))}
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '4px 10px' }}>
                {filtered.map(item => (
                  <button key={item.id} onClick={() => addFurniture(item)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0', cursor: 'pointer', marginBottom: 6, textAlign: 'left' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = '#3b82f6')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = '#334155')}>
                    <span style={{ fontSize: '1.4rem' }}>{item.emoji}</span>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{item.name}</div>
                      <div style={{ fontSize: '0.7rem', color: '#475569' }}>{item.category}</div>
                    </div>
                    <span style={{ marginLeft: 'auto', color: '#3b82f6', fontSize: '1.1rem' }}>+</span>
                  </button>
                ))}
              </div>
              {placed.length > 0 && (
                <div style={{ borderTop: '1px solid #1f2937', padding: '10px', flexShrink: 0 }}>
                  <p style={{ margin: '0 0 8px', fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>En la habitación ({placed.length})</p>
                  <div style={{ maxHeight: 120, overflowY: 'auto' }}>
                    {placed.map(p => (
                      <div key={p.uid} onClick={() => { setSelectedUid(p.uid); selectedGrpRef.current = p.group; if (boxHelperRef.current) { boxHelperRef.current.setFromObject(p.group); boxHelperRef.current.visible = true; } }}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 8px', borderRadius: 6, background: selectedUid === p.uid ? '#1e3a5f' : 'transparent', marginBottom: 2, cursor: 'pointer' }}>
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{p.item.emoji} {p.item.name}</span>
                        <button onClick={ev => { ev.stopPropagation(); removeItem(p.uid); }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1rem', padding: '0 4px' }}>×</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Paredes tab ── */}
          {activeTab === 'walls' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 12px' }}>
              {/* Wall selector */}
              <p style={{ color: '#64748b', fontSize: '0.75rem', margin: '0 0 10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Selecciona pared</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 16 }}>
                {(['back', 'left', 'right', 'ceiling'] as WallId[]).map(id => (
                  <button key={id} onClick={() => setSelectedWall(id)}
                    style={{ padding: '8px 6px', borderRadius: 8, border: `2px solid ${selectedWall === id ? '#3b82f6' : '#334155'}`, background: selectedWall === id ? '#1e3a5f' : '#1e293b', color: selectedWall === id ? '#e2e8f0' : '#94a3b8', cursor: 'pointer', fontSize: '0.78rem', fontWeight: selectedWall === id ? 600 : 400, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 14, height: 14, borderRadius: 3, background: wallColors[id], border: '1px solid rgba(255,255,255,0.2)', flexShrink: 0, display: 'inline-block' }} />
                    {WALL_LABELS[id]}
                  </button>
                ))}
              </div>
              {/* Color swatches */}
              <p style={{ color: '#64748b', fontSize: '0.75rem', margin: '0 0 10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Color</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 7, marginBottom: 14 }}>
                {WALL_COLORS.map(c => (
                  <button key={c.hex} onClick={() => setWallColor(selectedWall, c.hex)}
                    style={{ padding: '9px 8px', borderRadius: 8, border: `2px solid ${wallColors[selectedWall] === c.hex ? '#3b82f6' : 'transparent'}`, background: '#1e293b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 20, height: 20, borderRadius: 4, background: c.hex, border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0, display: 'block' }} />
                    <span style={{ fontSize: '0.73rem', color: wallColors[selectedWall] === c.hex ? '#e2e8f0' : '#94a3b8', fontWeight: wallColors[selectedWall] === c.hex ? 600 : 400 }}>{c.name}</span>
                  </button>
                ))}
              </div>
              {/* Custom picker */}
              <p style={{ color: '#64748b', fontSize: '0.75rem', margin: '0 0 8px' }}>Personalizado</p>
              <input type="color" value={wallColors[selectedWall]} onChange={e => setWallColor(selectedWall, e.target.value)}
                style={{ width: '100%', height: 38, borderRadius: 8, border: '1px solid #334155', background: 'transparent', cursor: 'pointer', padding: 2, marginBottom: 12 }} />
              {/* Apply to all */}
              <button onClick={() => setWallColors({ back: wallColors[selectedWall], left: wallColors[selectedWall], right: wallColors[selectedWall], ceiling: wallColors[selectedWall] })}
                style={{ width: '100%', padding: '9px', background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#94a3b8', cursor: 'pointer', fontSize: '0.8rem' }}>
                Aplicar a todas las paredes
              </button>
            </div>
          )}

          {/* ── Suelo tab ── */}
          {activeTab === 'floor' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 12px' }}>
              <p style={{ color: '#64748b', fontSize: '0.75rem', margin: '0 0 12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tono de suelo</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 7 }}>
                {FLOOR_TINTS.map(t => (
                  <button key={t.hex} onClick={() => setFloorTint(t.hex)}
                    style={{ padding: '10px 8px', borderRadius: 8, border: `2px solid ${floorTint === t.hex ? '#3b82f6' : 'transparent'}`, background: '#1e293b', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 44, height: 28, borderRadius: 6, background: t.hex === '#ffffff' ? 'linear-gradient(135deg,#e8d5a0 0%,#c9a97a 50%,#a07840 100%)' : t.hex, border: '1px solid rgba(255,255,255,0.12)', display: 'block' }} />
                    <span style={{ fontSize: '0.72rem', color: floorTint === t.hex ? '#e2e8f0' : '#94a3b8', fontWeight: floorTint === t.hex ? 600 : 400 }}>{t.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <div style={{ padding: '14px 12px', borderTop: '1px solid #1f2937', flexShrink: 0 }}>
            <a href="/login" style={{ display: 'block', padding: '11px', background: 'linear-gradient(135deg,#3b82f6,#7c3aed)', color: '#fff', borderRadius: 8, textAlign: 'center', fontWeight: 600, fontSize: '0.9rem', textDecoration: 'none', marginBottom: 8 }}>
              Guardar y crear cuenta →
            </a>
            <p style={{ color: '#475569', fontSize: '0.72rem', textAlign: 'center', margin: 0 }}>Gratis · Sin tarjeta · 2 tours incluidos</p>
          </div>
        </div>
      )}
    </div>
  );
}
