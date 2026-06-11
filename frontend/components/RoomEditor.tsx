'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

interface FurnitureItem {
  id: string;
  name: string;
  category: string;
  emoji: string;
  primary: number;
  secondary?: number;
}

interface PlacedItem {
  uid: string;
  item: FurnitureItem;
  group: THREE.Group;
}

const WALL_COLORS = [
  { name: 'Blanco roto', hex: '#f2ece3' },
  { name: 'Crema', hex: '#ede0cb' },
  { name: 'Gris perla', hex: '#d8d5d0' },
  { name: 'Azul suave', hex: '#c4d4e6' },
  { name: 'Verde sage', hex: '#c3d2be' },
  { name: 'Terracota', hex: '#e4bfaa' },
  { name: 'Amarillo cálido', hex: '#eedea0' },
  { name: 'Lavanda', hex: '#d4c7e6' },
  { name: 'Gris oscuro', hex: '#686b70' },
  { name: 'Antracita', hex: '#3a3d42' },
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

// ── Texture generators ─────────────────────────────────────────────────────

function makeWoodTex(): THREE.CanvasTexture {
  const S = 1024;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
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
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2.5, 1.8);
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
  const g = new THREE.Group();
  const f = stdMat(col, 0.9);
  const addBox = (gx: number, gy: number, gz: number, sx: number, sy: number, sz: number, m = f) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m);
    mesh.position.set(gx, gy, gz); mesh.castShadow = true; mesh.receiveShadow = true;
    g.add(mesh);
  };
  addBox(0, 0.21, 0,        w,    0.42, 0.80); // seat
  addBox(0, 0.60, -0.31,    w,    0.56, 0.18); // back
  addBox(-(w/2+0.09), 0.27, 0, 0.18, 0.52, 0.80); // arm L
  addBox( (w/2+0.09), 0.27, 0, 0.18, 0.52, 0.80); // arm R
  const legM = stdMat(0x1e1008, 0.4, 0.1);
  [[-w/2+0.12, 0.35],[-w/2+0.12,-0.34],[w/2-0.12, 0.35],[w/2-0.12,-0.34]].forEach(([lx,lz]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.1, 7), legM);
    leg.position.set(lx, -0.04, lz); g.add(leg);
  });
  return g;
}

function armchair(col: number): THREE.Group {
  const g = new THREE.Group();
  const f = stdMat(col, 0.9);
  const addBox = (gx: number, gy: number, gz: number, sx: number, sy: number, sz: number) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), f);
    mesh.position.set(gx, gy, gz); mesh.castShadow = true; g.add(mesh);
  };
  addBox(0, 0.22, 0, 0.84, 0.42, 0.80);
  addBox(0, 0.62, -0.31, 0.84, 0.58, 0.18);
  addBox(-0.51, 0.26, 0, 0.18, 0.48, 0.80);
  addBox( 0.51, 0.26, 0, 0.18, 0.48, 0.80);
  return g;
}

function coffeeTable(col: number, metalCol: number): THREE.Group {
  const g = new THREE.Group();
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.055, 0.58), stdMat(col, 0.6));
  top.position.y = 0.44; top.castShadow = true; top.receiveShadow = true; g.add(top);
  const legM = stdMat(metalCol, 0.25, 0.75, 0.85);
  [[-0.46, 0.25],[-0.46,-0.23],[0.46, 0.25],[0.46,-0.23]].forEach(([lx,lz]) => {
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
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06,0.75,0.06), wM);
    leg.position.set(lx, 0.375, lz); leg.castShadow = true; g.add(leg);
  });
  return g;
}

function diningChair(col: number): THREE.Group {
  const g = new THREE.Group();
  const m = stdMat(col, 0.7);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.46,0.04,0.44), m);
  seat.position.y = 0.46; seat.castShadow = true; g.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.46,0.52,0.04), m);
  back.position.set(0, 0.72, -0.2); back.castShadow = true; g.add(back);
  [[-0.2,0.2],[-0.2,-0.2],[0.2,0.2],[0.2,-0.2]].forEach(([lx,lz]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.017,0.014,0.46,6), m);
    leg.position.set(lx, 0.23, lz); g.add(leg);
  });
  return g;
}

function bed(col: number, pilCol: number): THREE.Group {
  const g = new THREE.Group();
  const frame = stdMat(col, 0.7);
  const base = new THREE.Mesh(new THREE.BoxGeometry(2.0,0.26,1.9), frame);
  base.position.y = 0.13; base.castShadow = true; base.receiveShadow = true; g.add(base);
  const mattress = new THREE.Mesh(new THREE.BoxGeometry(1.88,0.2,1.78), stdMat(0xf0ece6, 0.92));
  mattress.position.y = 0.36; mattress.castShadow = true; g.add(mattress);
  const duvet = new THREE.Mesh(new THREE.BoxGeometry(1.88,0.1,1.40), stdMat(0xffffff, 0.95));
  duvet.position.set(0, 0.41, 0.18); duvet.castShadow = true; g.add(duvet);
  const headboard = new THREE.Mesh(new THREE.BoxGeometry(2.0,0.7,0.1), frame);
  headboard.position.set(0, 0.61, -0.95); headboard.castShadow = true; g.add(headboard);
  const pM = stdMat(pilCol, 0.92);
  [-0.46, 0.46].forEach(px => {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.62,0.14,0.42), pM);
    p.position.set(px, 0.5, -0.62); p.rotation.x = 0.07; p.castShadow = true; g.add(p);
  });
  return g;
}

function wardrobe(col: number): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.8,2.2,0.58), stdMat(col, 0.7));
  body.position.y = 1.1; body.castShadow = true; body.receiveShadow = true; g.add(body);
  const divider = new THREE.Mesh(new THREE.BoxGeometry(0.02,2.1,0.01), stdMat(col, 0.8));
  divider.position.set(0, 1.1, 0.295); g.add(divider);
  const hM = stdMat(0x909090, 0.25, 0.8, 1.0);
  [-0.46, 0.46].forEach(dx => {
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.012,0.012,0.12,8), hM);
    handle.rotation.x = Math.PI/2;
    handle.position.set(dx > 0 ? dx-0.08 : dx+0.08, 1.1, 0.305); g.add(handle);
  });
  return g;
}

function floorLamp(col: number, shadeCol: number): THREE.Group {
  const g = new THREE.Group();
  const metal = stdMat(col, 0.3, 0.65, 0.9);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.18,0.22,0.06,16), metal);
  base.position.y = 0.03; g.add(base);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.016,0.016,1.55,8), metal);
  pole.position.y = 0.82; pole.castShadow = true; g.add(pole);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.26,0.38,16,1,true), stdMat(shadeCol, 0.85));
  shade.position.y = 1.72; shade.rotation.x = Math.PI; g.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06,10,8), new THREE.MeshStandardMaterial({ color: 0xfffde8, emissive: 0xfffde8, emissiveIntensity: 2.5, roughness: 0.05 }));
  bulb.position.y = 1.62; g.add(bulb);
  return g;
}

function plant(leafCol: number): THREE.Group {
  const g = new THREE.Group();
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.17,0.36,14), stdMat(0x9a6042, 0.82));
  pot.position.y = 0.18; pot.castShadow = true; pot.receiveShadow = true; g.add(pot);
  const soil = new THREE.Mesh(new THREE.CircleGeometry(0.21,14), stdMat(0x3a2010, 0.95));
  soil.rotation.x = -Math.PI/2; soil.position.y = 0.37; g.add(soil);
  const leafM = stdMat(leafCol, 0.9);
  [{ r:0.40,h:0.52,y:0.70 },{ r:0.32,h:0.48,y:1.06 },{ r:0.23,h:0.42,y:1.40 },{ r:0.14,h:0.34,y:1.68 }]
    .forEach(({ r,h,y }) => {
      const c = new THREE.Mesh(new THREE.ConeGeometry(r,h,11), leafM);
      c.position.y = y; c.castShadow = true; g.add(c);
    });
  return g;
}

function tvUnit(screenCol: number, cabinetCol: number): THREE.Group {
  const g = new THREE.Group();
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.6,0.48,0.40), stdMat(cabinetCol, 0.68));
  cab.position.y = 0.24; cab.castShadow = true; cab.receiveShadow = true; g.add(cab);
  const legM = stdMat(0x202020, 0.3, 0.6);
  [[-0.7,0.16],[0.7,0.16],[-0.7,-0.16],[0.7,-0.16]].forEach(([lx,lz]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.018,0.018,0.08,6), legM);
    leg.position.set(lx, 0.04, lz); g.add(leg);
  });
  const screen = new THREE.Mesh(new THREE.BoxGeometry(1.38,0.80,0.055), stdMat(screenCol, 0.28, 0.55));
  screen.position.y = 1.01; screen.castShadow = true; g.add(screen);
  const display = new THREE.Mesh(new THREE.PlaneGeometry(1.26,0.70), new THREE.MeshStandardMaterial({ color: 0x060c14, emissive: 0x060c14, emissiveIntensity: 0.5, roughness: 0.02, metalness: 0.1 }));
  display.position.set(0, 1.01, 0.032); g.add(display);
  return g;
}

function bookshelf(col: number): THREE.Group {
  const g = new THREE.Group();
  const wood = stdMat(col, 0.66);
  [-0.58, 0.58].forEach(x => {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.04,2.1,0.32), wood);
    s.position.set(x,1.05,0); s.castShadow = true; g.add(s);
  });
  [0.14,0.60,1.06,1.52,2.0].forEach(y => {
    const s = new THREE.Mesh(new THREE.BoxGeometry(1.2,0.04,0.32), wood);
    s.position.y = y; s.castShadow = true; s.receiveShadow = true; g.add(s);
  });
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.16,2.06,0.02), stdMat(Math.round(col * 0.85), 0.75));
  back.position.set(0,1.05,-0.15); g.add(back);
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
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.8,0.8,0.8), stdMat(p, 0.7));
      m.position.y = 0.4; m.castShadow = true; g.add(m); return g;
    }
  }
}

// ── Component ───────────────────────────────────────────────────────────────

export default function RoomEditor({ uploadedImageUrl }: { uploadedImageUrl: string | null }) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const sceneRef     = useRef<THREE.Scene | null>(null);
  const rendererRef  = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef  = useRef<OrbitControls | null>(null);
  const wallMatsRef  = useRef<THREE.MeshStandardMaterial[]>([]);
  const placedRef    = useRef<PlacedItem[]>([]);
  const rafRef       = useRef<number>(0);

  const [wallColor,      setWallColor]      = useState('#f2ece3');
  const [activeTab,      setActiveTab]      = useState<'furniture'|'colors'>('furniture');
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [placed,         setPlaced]         = useState<PlacedItem[]>([]);
  const [selectedUid,    setSelectedUid]    = useState<string|null>(null);
  const [panelOpen,      setPanelOpen]      = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const W = canvas.parentElement?.clientWidth || 800;
    const H = canvas.parentElement?.clientHeight || 600;

    // ── Scene ──────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0d0d12');
    sceneRef.current = scene;

    // ── Renderer (photorealistic settings) ────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
    renderer.toneMapping          = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure  = 0.82;
    renderer.outputColorSpace     = THREE.SRGBColorSpace;
    rendererRef.current = renderer;

    // ── IBL (Image-Based Lighting via RoomEnvironment) ────────────────────
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // ── Camera ────────────────────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(52, W / H, 0.1, 60);
    camera.position.set(0, 2.4, 6.0);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping  = true;
    controls.dampingFactor  = 0.06;
    controls.minDistance    = 1.5;
    controls.maxDistance    = 12;
    controls.maxPolarAngle  = Math.PI / 2 + 0.1;
    controls.target.set(0, 0.8, 0);
    controlsRef.current = controls;

    // ── Lights ────────────────────────────────────────────────────────────
    // Warm ambient bounce
    scene.add(new THREE.AmbientLight(0xfff0d8, 0.30));

    // Main window light (directional, warm daylight)
    const winLight = new THREE.DirectionalLight(0xfff3ce, 3.0);
    winLight.position.set(1.5, 5, -7);
    winLight.target.position.set(0, 0, 1.5);
    winLight.castShadow = true;
    winLight.shadow.mapSize.set(2048, 2048);
    winLight.shadow.camera.near   = 2;
    winLight.shadow.camera.far    = 20;
    winLight.shadow.camera.left   = -5;
    winLight.shadow.camera.right  = 5;
    winLight.shadow.camera.top    = 5;
    winLight.shadow.camera.bottom = -5;
    winLight.shadow.bias          = -0.001;
    winLight.shadow.normalBias    = 0.025;
    scene.add(winLight);
    scene.add(winLight.target);

    // Ceiling warm point light
    const ceilLight = new THREE.PointLight(0xfff8e8, 2.2, 10);
    ceilLight.position.set(0, 2.88, 0.4);
    ceilLight.castShadow = true;
    ceilLight.shadow.mapSize.set(512, 512);
    ceilLight.shadow.bias = -0.003;
    scene.add(ceilLight);

    // Soft fill (camera-side bounce)
    const fillLight = new THREE.DirectionalLight(0xd0e4ff, 0.45);
    fillLight.position.set(0, 2, 7);
    scene.add(fillLight);

    // ── Room ──────────────────────────────────────────────────────────────
    const RW = 7, RH = 3, RD = 6.5;

    const plasterN = makePlasterNormal();
    const wallMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(wallColor),
      roughness: 0.92, metalness: 0,
      normalMap: plasterN, normalScale: new THREE.Vector2(0.35, 0.35),
      envMapIntensity: 0.12,
    });
    wallMatsRef.current = [wallMat];

    const ceilMat = new THREE.MeshStandardMaterial({ color: 0xfaf7f2, roughness: 0.88, envMapIntensity: 0.1 });

    // Floor — wood texture
    const woodTex = makeWoodTex();
    const floorMat = new THREE.MeshStandardMaterial({
      map: woodTex, roughness: 0.62, metalness: 0, envMapIntensity: 0.38,
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(RW, RD), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Ceiling
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(RW, RD), ceilMat);
    ceil.rotation.x = Math.PI / 2; ceil.position.y = RH;
    scene.add(ceil);

    // Walls
    const backWall  = new THREE.Mesh(new THREE.PlaneGeometry(RW, RH), wallMat);
    backWall.position.set(0, RH/2, -RD/2); backWall.receiveShadow = true;
    scene.add(backWall);

    const leftWall  = new THREE.Mesh(new THREE.PlaneGeometry(RD, RH), wallMat);
    leftWall.rotation.y = Math.PI/2; leftWall.position.set(-RW/2, RH/2, 0); leftWall.receiveShadow = true;
    scene.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(RD, RH), wallMat);
    rightWall.rotation.y = -Math.PI/2; rightWall.position.set(RW/2, RH/2, 0); rightWall.receiveShadow = true;
    scene.add(rightWall);

    // Window — bright exterior glow
    const winFrameM = new THREE.MeshStandardMaterial({ color: 0xe8dfd2, roughness: 0.45, metalness: 0.08 });
    const winFrame  = new THREE.Mesh(new THREE.BoxGeometry(1.85, 1.85, 0.1), winFrameM);
    winFrame.position.set(0, 2.05, -RD/2 + 0.07); scene.add(winFrame);

    const winGlass  = new THREE.Mesh(
      new THREE.PlaneGeometry(1.60, 1.60),
      new THREE.MeshStandardMaterial({ color: 0xb0d4f4, emissive: 0x70b0e0, emissiveIntensity: 1.4, transparent: true, opacity: 0.6, roughness: 0, metalness: 0.05 })
    );
    winGlass.position.set(0, 2.05, -RD/2 + 0.12); scene.add(winGlass);

    // Window cross bars
    const barM = new THREE.MeshStandardMaterial({ color: 0xddd5c8, roughness: 0.45 });
    [0, 1].forEach(i => {
      const hb = new THREE.Mesh(i === 0 ? new THREE.BoxGeometry(1.60,0.045,0.04) : new THREE.BoxGeometry(0.045,1.60,0.04), barM);
      hb.position.set(0, 2.05, -RD/2 + 0.14); scene.add(hb);
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

    // ── Resize ────────────────────────────────────────────────────────────
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
      cancelAnimationFrame(rafRef.current);
      renderer.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live wall colour change
  useEffect(() => {
    wallMatsRef.current.forEach(m => m.color.set(wallColor));
  }, [wallColor]);

  function addFurniture(item: FurnitureItem) {
    const scene = sceneRef.current;
    if (!scene) return;
    const group = buildFurniture(item);
    group.traverse(child => {
      if (child instanceof THREE.Mesh) { child.castShadow = true; child.receiveShadow = true; }
    });
    const a = Math.random() * Math.PI * 2, r = 0.5 + Math.random() * 1.6;
    group.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    group.rotation.y = (Math.random() - 0.5) * Math.PI * 0.5;
    scene.add(group);
    const uid = `${item.id}-${Date.now()}`;
    placedRef.current = [...placedRef.current, { uid, item, group }];
    setPlaced([...placedRef.current]);
    setSelectedUid(uid);
  }

  function removeItem(uid: string) {
    const scene = sceneRef.current;
    if (!scene) return;
    const found = placedRef.current.find(p => p.uid === uid);
    if (found) {
      scene.remove(found.group);
      found.group.traverse(child => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach((m: THREE.Material) => m.dispose());
        }
      });
    }
    placedRef.current = placedRef.current.filter(p => p.uid !== uid);
    setPlaced([...placedRef.current]);
    if (selectedUid === uid) setSelectedUid(null);
  }

  const filtered = activeCategory === 'Todos' ? CATALOG : CATALOG.filter(f => f.category === activeCategory);

  // ── UI ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', height: '100%', position: 'relative' }}>

      {/* 3-D canvas */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
        <div style={{ position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.55)', borderRadius: 8, padding: '5px 14px', fontSize: '0.72rem', color: '#64748b', pointerEvents: 'none', whiteSpace: 'nowrap' }}>
          Arrastra para orbitar · Scroll para zoom
        </div>
        <button onClick={() => setPanelOpen(o => !o)}
          style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#94a3b8', cursor: 'pointer', padding: '6px 12px', fontSize: '0.8rem' }}>
          {panelOpen ? '▶ Ocultar' : '◀ Panel'}
        </button>
      </div>

      {/* Side panel */}
      {panelOpen && (
        <div style={{ width: 278, background: '#0f172a', borderLeft: '1px solid #1f2937', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #1f2937' }}>
            {(['furniture','colors'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                style={{ flex: 1, padding: '12px 8px', background: activeTab === tab ? '#1e293b' : 'transparent', border: 'none', color: activeTab === tab ? '#e2e8f0' : '#64748b', cursor: 'pointer', fontSize: '0.8rem', fontWeight: activeTab === tab ? 600 : 400, borderBottom: activeTab === tab ? '2px solid #3b82f6' : '2px solid transparent' }}>
                {tab === 'furniture' ? '🛋️ Muebles' : '🎨 Paredes'}
              </button>
            ))}
          </div>

          {activeTab === 'furniture' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Category filter */}
              <div style={{ display: 'flex', gap: 4, padding: '8px 10px', overflowX: 'auto', flexShrink: 0, scrollbarWidth: 'none' }}>
                {CATEGORIES.map(cat => (
                  <button key={cat} onClick={() => setActiveCategory(cat)}
                    style={{ padding: '4px 10px', borderRadius: 16, border: 'none', background: activeCategory === cat ? '#3b82f6' : '#1e293b', color: activeCategory === cat ? '#fff' : '#94a3b8', cursor: 'pointer', fontSize: '0.72rem', whiteSpace: 'nowrap', fontWeight: activeCategory === cat ? 600 : 400 }}>
                    {cat}
                  </button>
                ))}
              </div>
              {/* Catalog list */}
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
              {/* Placed items */}
              {placed.length > 0 && (
                <div style={{ borderTop: '1px solid #1f2937', padding: '10px', flexShrink: 0 }}>
                  <p style={{ margin: '0 0 8px', fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>En la habitación ({placed.length})</p>
                  <div style={{ maxHeight: 120, overflowY: 'auto' }}>
                    {placed.map(p => (
                      <div key={p.uid} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 8px', borderRadius: 6, background: selectedUid === p.uid ? '#1e3a5f' : 'transparent', marginBottom: 2 }}>
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{p.item.emoji} {p.item.name}</span>
                        <button onClick={() => removeItem(p.uid)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1rem', padding: '0 4px' }}>×</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'colors' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 12px' }}>
              <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '0 0 14px' }}>Color de paredes</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
                {WALL_COLORS.map(c => (
                  <button key={c.hex} onClick={() => setWallColor(c.hex)}
                    style={{ padding: '10px 8px', borderRadius: 8, border: `2px solid ${wallColor === c.hex ? '#3b82f6' : 'transparent'}`, background: '#1e293b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 22, height: 22, borderRadius: 4, background: c.hex, border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0, display: 'block' }} />
                    <span style={{ fontSize: '0.75rem', color: wallColor === c.hex ? '#e2e8f0' : '#94a3b8', fontWeight: wallColor === c.hex ? 600 : 400 }}>{c.name}</span>
                  </button>
                ))}
              </div>
              <div style={{ marginTop: 16 }}>
                <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '0 0 8px' }}>Color personalizado</p>
                <input type="color" value={wallColor} onChange={e => setWallColor(e.target.value)}
                  style={{ width: '100%', height: 40, borderRadius: 8, border: '1px solid #334155', background: 'transparent', cursor: 'pointer', padding: 2 }} />
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
