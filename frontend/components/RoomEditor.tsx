'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface FurnitureItem {
  id: string;
  name: string;
  category: string;
  emoji: string;
  color: string;
  size: [number, number, number];
}

interface PlacedItem {
  uid: string;
  item: FurnitureItem;
  mesh: THREE.Object3D;
}

const WALL_COLORS = [
  { name: 'Blanco', hex: '#f5f0eb' },
  { name: 'Crema', hex: '#f0e6d3' },
  { name: 'Gris claro', hex: '#d0d4d8' },
  { name: 'Azul suave', hex: '#c4d4e8' },
  { name: 'Verde sage', hex: '#c8d8c4' },
  { name: 'Terracota', hex: '#e8c4b0' },
  { name: 'Amarillo', hex: '#f0e4a0' },
  { name: 'Lavanda', hex: '#d4c8e8' },
  { name: 'Gris oscuro', hex: '#6b7280' },
  { name: 'Negro', hex: '#1e1e1e' },
];

const FURNITURE_CATALOG: FurnitureItem[] = [
  { id: 'sofa1',     name: 'Sofá 3 plazas',  category: 'Sala',    emoji: '🛋️',  color: '#8b7355', size: [2.2, 0.8, 0.9] },
  { id: 'sofa2',     name: 'Sofá esquina',   category: 'Sala',    emoji: '🛋️',  color: '#5a6a7a', size: [2.8, 0.8, 2.0] },
  { id: 'mesa1',     name: 'Mesa de centro', category: 'Sala',    emoji: '🪑',   color: '#6b4226', size: [1.2, 0.45, 0.7] },
  { id: 'mesa2',     name: 'Mesa comedor',   category: 'Comedor', emoji: '🍽️',  color: '#8b6914', size: [1.8, 0.75, 0.9] },
  { id: 'silla1',    name: 'Silla',          category: 'Comedor', emoji: '🪑',   color: '#4a4a4a', size: [0.5, 0.9, 0.5] },
  { id: 'cama1',     name: 'Cama doble',     category: 'Dormit.', emoji: '🛏️',  color: '#c8b89a', size: [2.0, 0.6, 1.8] },
  { id: 'armario1',  name: 'Armario',        category: 'Dormit.', emoji: '🗄️',  color: '#d4c5a9', size: [1.8, 2.2, 0.6] },
  { id: 'lampara1',  name: 'Lámpara pie',    category: 'Decor',   emoji: '💡',   color: '#d4af37', size: [0.3, 1.7, 0.3] },
  { id: 'planta1',   name: 'Planta grande',  category: 'Decor',   emoji: '🌿',   color: '#3a7d44', size: [0.6, 1.5, 0.6] },
  { id: 'tv1',       name: 'TV + mueble',    category: 'Electr.', emoji: '📺',   color: '#1a1a1a', size: [1.5, 1.2, 0.4] },
  { id: 'estante1',  name: 'Estantería',     category: 'Electr.', emoji: '📚',   color: '#8b6914', size: [1.2, 2.0, 0.3] },
  { id: 'alfombra1', name: 'Alfombra',       category: 'Decor',   emoji: '🪣',   color: '#c4a882', size: [2.0, 0.05, 1.5] },
];

const CATEGORIES = ['Todos', 'Sala', 'Comedor', 'Dormit.', 'Electr.', 'Decor'];

// Muebles iniciales para que la habitación no aparezca vacía
const STARTER_LAYOUT: { id: string; pos: [number, number]; rotY: number }[] = [
  { id: 'alfombra1', pos: [0, -0.4],    rotY: 0 },
  { id: 'sofa1',     pos: [0, -2.35],   rotY: 0 },
  { id: 'mesa1',     pos: [0, -0.6],    rotY: 0 },
  { id: 'lampara1',  pos: [1.6, -2.4],  rotY: 0 },
  { id: 'planta1',   pos: [-2.4, -2.4], rotY: 0 },
  { id: 'estante1',  pos: [2.7, -0.8],  rotY: -Math.PI / 2 },
  { id: 'tv1',       pos: [-2.68, 0.4], rotY: Math.PI / 2 },
];

function darken(hex: string, f: number): string {
  const c = new THREE.Color(hex);
  c.multiplyScalar(f);
  return `#${c.getHexString()}`;
}

// Construye una silueta reconocible por tipo de mueble (grupo con origen en el suelo)
function buildFurnitureMesh(item: FurnitureItem): THREE.Group {
  const g = new THREE.Group();
  const std = (color: string, roughness = 0.8) => new THREE.MeshStandardMaterial({ color, roughness });
  const box = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    g.add(mesh);
    return mesh;
  };
  const cyl = (rt: number, rb: number, h: number, m: THREE.Material, x: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 20), m);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    g.add(mesh);
    return mesh;
  };
  const [W, H, D] = item.size;
  const main = std(item.color);
  const dark = std(darken(item.color, 0.7));

  switch (item.id) {
    case 'sofa1':
    case 'sofa2': {
      const armW = 0.16, baseH = H * 0.5;
      box(W, baseH, D, main, 0, 0.08 + baseH / 2, 0);                       // asiento
      box(W, H * 0.85, 0.18, dark, 0, 0.08 + H * 0.85 / 2, -D / 2 + 0.09);  // respaldo
      box(armW, H * 0.75, D, dark, -W / 2 + armW / 2, 0.08 + H * 0.75 / 2, 0);
      box(armW, H * 0.75, D, dark, W / 2 - armW / 2, 0.08 + H * 0.75 / 2, 0);
      const cushW = (W - armW * 2) / 3 - 0.03;
      for (let i = 0; i < 3; i++) {
        box(cushW, 0.12, D - 0.3, std(darken(item.color, 1.15)), -W / 2 + armW + cushW / 2 + i * (cushW + 0.045), 0.08 + baseH + 0.05, 0.04);
      }
      break;
    }
    case 'mesa1':
    case 'mesa2': {
      const legT = 0.06, topT = 0.06;
      box(W, topT, D, main, 0, H - topT / 2, 0);
      const lx = W / 2 - legT, lz = D / 2 - legT;
      [[-lx, -lz], [lx, -lz], [-lx, lz], [lx, lz]].forEach(([x, z]) =>
        box(legT, H - topT, legT, dark, x, (H - topT) / 2, z));
      break;
    }
    case 'silla1': {
      const legT = 0.045, seatH = H * 0.5;
      box(W, 0.06, D, main, 0, seatH, 0);
      box(W, H - seatH, 0.06, main, 0, seatH + (H - seatH) / 2, -D / 2 + 0.03);
      const lx = W / 2 - legT, lz = D / 2 - legT;
      [[-lx, -lz], [lx, -lz], [-lx, lz], [lx, lz]].forEach(([x, z]) =>
        box(legT, seatH, legT, dark, x, seatH / 2, z));
      break;
    }
    case 'cama1': {
      box(W, 0.22, D, dark, 0, 0.15, 0);                                  // base
      box(W - 0.1, 0.22, D - 0.1, std('#f0ece2', 0.9), 0, 0.37, 0);       // colchón
      box(W, H * 1.4, 0.09, main, 0, H * 0.7, -D / 2 + 0.045);            // cabecero
      box(W * 0.38, 0.1, 0.5, std('#dcd6c8'), -W * 0.24, 0.5, -D / 2 + 0.45); // almohadas
      box(W * 0.38, 0.1, 0.5, std('#dcd6c8'), W * 0.24, 0.5, -D / 2 + 0.45);
      break;
    }
    case 'armario1': {
      box(W, H, D, main, 0, H / 2, 0);
      box(0.02, H - 0.2, 0.02, dark, 0, H / 2, D / 2 + 0.005);            // junta puertas
      box(0.04, 0.3, 0.05, dark, -0.09, H / 2, D / 2 + 0.02);             // tiradores
      box(0.04, 0.3, 0.05, dark, 0.09, H / 2, D / 2 + 0.02);
      break;
    }
    case 'lampara1': {
      cyl(0.16, 0.18, 0.04, dark, 0, 0.02, 0);
      cyl(0.02, 0.02, H - 0.4, dark, 0, (H - 0.4) / 2, 0);
      const shade = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.17, 0.3, 20, 1, true),
        new THREE.MeshStandardMaterial({ color: '#f5e6c4', emissive: '#c9a86a', emissiveIntensity: 0.35, side: THREE.DoubleSide })
      );
      shade.position.y = H - 0.28;
      g.add(shade);
      const bulb = new THREE.PointLight('#ffd9a0', 2.5, 4, 2);
      bulb.position.set(0, H - 0.3, 0);
      g.add(bulb);
      break;
    }
    case 'planta1': {
      cyl(0.16, 0.12, 0.3, std('#a8552f'), 0, 0.15, 0);
      const leaf = std('#3a7d44', 0.95);
      [[0, H * 0.62, 0, 0.26], [0.13, H * 0.48, 0.1, 0.18], [-0.14, H * 0.52, -0.06, 0.19], [0.02, H * 0.8, -0.04, 0.17]].forEach(([x, y, z, r]) => {
        const s = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 12), leaf);
        s.position.set(x, y, z);
        s.castShadow = true;
        g.add(s);
      });
      break;
    }
    case 'tv1': {
      box(W, 0.42, D, std('#5a4632'), 0, 0.21, 0);                        // mueble
      const screen = box(W * 0.8, W * 0.45, 0.05, std('#101418', 0.35), 0, 0.42 + 0.12 + W * 0.225, 0);
      (screen.material as THREE.MeshStandardMaterial).emissive = new THREE.Color('#1a2c40');
      (screen.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.5;
      break;
    }
    case 'estante1': {
      const sideT = 0.04;
      box(sideT, H, D, main, -W / 2 + sideT / 2, H / 2, 0);
      box(sideT, H, D, main, W / 2 - sideT / 2, H / 2, 0);
      for (let i = 0; i <= 4; i++) box(W - sideT * 2, 0.035, D, main, 0, 0.02 + (H - 0.04) * (i / 4), 0);
      const bookMats = ['#b5533c', '#3f6b8e', '#c9a227', '#4a7a52'].map((c) => std(c, 0.9));
      for (let s = 0; s < 4; s++) {
        for (let b = 0; b < 5; b++) {
          box(0.09, 0.26, D * 0.7, bookMats[(s + b) % 4], -W / 2 + 0.16 + b * 0.13, 0.02 + (H - 0.04) * (s / 4) + 0.15, 0);
        }
      }
      break;
    }
    case 'alfombra1': {
      const rug = box(W, 0.03, D, std(item.color, 1), 0, 0.015, 0);
      rug.castShadow = false;
      box(W - 0.24, 0.032, D - 0.24, std(darken(item.color, 0.85), 1), 0, 0.016, 0).castShadow = false;
      break;
    }
    default:
      box(W, H, D, main, 0, H / 2, 0);
  }
  return g;
}

function disposeObject(obj: THREE.Object3D) {
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      const m = child.material;
      Array.isArray(m) ? m.forEach((x) => x.dispose()) : m.dispose();
    }
  });
}

export default function RoomEditor({ uploadedImageUrl }: { uploadedImageUrl: string | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const wallMatsRef = useRef<THREE.MeshStandardMaterial[]>([]);
  const placedRef = useRef<PlacedItem[]>([]);
  const animFrameRef = useRef<number>(0);

  const [wallColor, setWallColor] = useState('#f5f0eb');
  const [activeTab, setActiveTab] = useState<'furniture' | 'colors'>('furniture');
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [placed, setPlaced] = useState<PlacedItem[]>([]);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [isNarrow, setIsNarrow] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);

  // En pantallas estrechas (móvil o iframe pequeño) el panel pasa a hoja inferior y arranca cerrado
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const apply = () => setIsNarrow(mq.matches);
    apply();
    if (mq.matches) setPanelOpen(false);
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#151a28');
    sceneRef.current = scene;

    const W = canvas.parentElement?.clientWidth || 800;
    const H = canvas.parentElement?.clientHeight || 600;
    const camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 100);
    camera.position.set(3.2, 2.6, 5.6);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(W, H, false);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 2;
    controls.maxDistance = 12;
    controls.maxPolarAngle = Math.PI / 2 + 0.1;
    controls.target.set(0, 0.9, -0.4);
    controlsRef.current = controls;

    // Lights
    const hemi = new THREE.HemisphereLight('#cfe0f5', '#8a6f52', 0.55);
    scene.add(hemi);
    const ambient = new THREE.AmbientLight('#ffffff', 0.25);
    scene.add(ambient);
    const dirLight = new THREE.DirectionalLight('#fff4dd', 1.6);
    dirLight.position.set(3, 6, 4);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(2048, 2048);
    dirLight.shadow.bias = -0.0004;
    scene.add(dirLight);
    const fillLight = new THREE.DirectionalLight('#c8d8f0', 0.4);
    fillLight.position.set(-4, 3, -2);
    scene.add(fillLight);

    // Room geometry
    const ROOM_W = 6, ROOM_H = 3, ROOM_D = 6;
    const wallMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(wallColor), roughness: 0.85, metalness: 0.0 });
    const floorMat = new THREE.MeshStandardMaterial({ color: '#a5834f', roughness: 0.75, metalness: 0.0 });
    const ceilMat  = new THREE.MeshStandardMaterial({ color: '#faf7f2', roughness: 0.9 });

    wallMatsRef.current = [wallMat];

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_D), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Lamas del suelo (detalle sutil)
    const plankMat = new THREE.MeshStandardMaterial({ color: '#96733f', roughness: 0.8 });
    for (let i = 1; i < 8; i++) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.002, ROOM_D), plankMat);
      line.position.set(-ROOM_W / 2 + (ROOM_W / 8) * i, 0.002, 0);
      scene.add(line);
    }

    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_D), ceilMat);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = ROOM_H;
    scene.add(ceil);

    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_H), wallMat);
    backWall.position.set(0, ROOM_H / 2, -ROOM_D / 2);
    backWall.receiveShadow = true;
    scene.add(backWall);

    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_D, ROOM_H), wallMat);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-ROOM_W / 2, ROOM_H / 2, 0);
    leftWall.receiveShadow = true;
    scene.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_D, ROOM_H), wallMat);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.set(ROOM_W / 2, ROOM_H / 2, 0);
    rightWall.receiveShadow = true;
    scene.add(rightWall);

    // Window on back wall
    const windowFrame = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 1.6, 0.08),
      new THREE.MeshStandardMaterial({ color: '#d4c5a9', roughness: 0.5 })
    );
    windowFrame.position.set(0, 1.8, -ROOM_D / 2 + 0.05);
    scene.add(windowFrame);
    const windowGlass = new THREE.Mesh(
      new THREE.PlaneGeometry(1.3, 1.3),
      new THREE.MeshStandardMaterial({ color: '#bfe0f7', emissive: '#9cc8ea', emissiveIntensity: 0.6, transparent: true, opacity: 0.85 })
    );
    windowGlass.position.set(0, 1.8, -ROOM_D / 2 + 0.1);
    scene.add(windowGlass);

    // Baseboard
    const baseboardMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8 });
    const makeBaseboard = (w: number, pos: [number, number, number], ry: number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, 0.04), baseboardMat);
      m.position.set(...pos);
      m.rotation.y = ry;
      scene.add(m);
    };
    makeBaseboard(ROOM_W, [0, 0.06, -ROOM_D / 2 + 0.02], 0);
    makeBaseboard(ROOM_D, [-ROOM_W / 2 + 0.02, 0.06, 0], Math.PI / 2);
    makeBaseboard(ROOM_D, [ROOM_W / 2 - 0.02, 0.06, 0], Math.PI / 2);

    // Habitación amueblada de inicio
    const starter: PlacedItem[] = [];
    STARTER_LAYOUT.forEach((slot, i) => {
      const item = FURNITURE_CATALOG.find((f) => f.id === slot.id);
      if (!item) return;
      const mesh = buildFurnitureMesh(item);
      mesh.position.set(slot.pos[0], 0, slot.pos[1]);
      mesh.rotation.y = slot.rotY;
      scene.add(mesh);
      starter.push({ uid: `${item.id}-init-${i}`, item, mesh });
    });
    placedRef.current = starter;
    setPlaced(starter);

    // El contenedor cambia de tamaño sin que haya "resize" de ventana
    // (apertura del modal con animación, toggle del panel, iframe) — observarlo directamente
    const resize = () => {
      const w = canvas.parentElement?.clientWidth || 800;
      const h = canvas.parentElement?.clientHeight || 600;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);
    window.addEventListener('resize', resize);

    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      ro.disconnect();
      cancelAnimationFrame(animFrameRef.current);
      placedRef.current.forEach((p) => disposeObject(p.mesh));
      renderer.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update wall color
  useEffect(() => {
    wallMatsRef.current.forEach((m) => m.color.set(wallColor));
  }, [wallColor]);

  function addFurniture(item: FurnitureItem) {
    const scene = sceneRef.current;
    if (!scene) return;

    const mesh = buildFurnitureMesh(item);

    const angle = Math.random() * Math.PI * 2;
    const radius = 0.6 + Math.random() * 1.2;
    const maxX = 3 - item.size[0] / 2 - 0.1;
    const maxZ = 3 - item.size[2] / 2 - 0.1;
    mesh.position.set(
      Math.max(-maxX, Math.min(maxX, Math.cos(angle) * radius)),
      0,
      Math.max(-maxZ, Math.min(maxZ, Math.sin(angle) * radius))
    );
    mesh.rotation.y = Math.random() * Math.PI * 0.5 - Math.PI * 0.25;
    scene.add(mesh);

    const uid = `${item.id}-${Date.now()}`;
    const newItem: PlacedItem = { uid, item, mesh };
    placedRef.current = [...placedRef.current, newItem];
    setPlaced([...placedRef.current]);
    setSelectedUid(uid);
    if (isNarrow) setPanelOpen(false);
  }

  function removeItem(uid: string) {
    const scene = sceneRef.current;
    if (!scene) return;
    const found = placedRef.current.find((p) => p.uid === uid);
    if (found) {
      scene.remove(found.mesh);
      disposeObject(found.mesh);
    }
    placedRef.current = placedRef.current.filter((p) => p.uid !== uid);
    setPlaced([...placedRef.current]);
    if (selectedUid === uid) setSelectedUid(null);
  }

  const filteredFurniture = activeCategory === 'Todos'
    ? FURNITURE_CATALOG
    : FURNITURE_CATALOG.filter((f) => f.category === activeCategory);

  const panelStyle: React.CSSProperties = isNarrow
    ? { position: 'absolute', left: 0, right: 0, bottom: 0, height: '62%', background: '#0f172af5', borderTop: '1px solid #1f2937', borderRadius: '16px 16px 0 0', display: 'flex', flexDirection: 'column', overflow: 'hidden', zIndex: 10, boxShadow: '0 -10px 30px rgba(0,0,0,.5)' }
    : { width: 280, background: '#0f172a', borderLeft: '1px solid #1f2937', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 };

  return (
    <div style={{ display: 'flex', height: '100%', position: 'relative' }}>
      {/* 3D Canvas */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', minWidth: 0 }}>
        <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
        {!isNarrow && (
          <div style={{ position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.5)', borderRadius: 8, padding: '5px 14px', fontSize: '0.72rem', color: '#94a3b8', pointerEvents: 'none', whiteSpace: 'nowrap' }}>
            🖱️ Arrastrar para rotar · Scroll para zoom · Click derecho para mover
          </div>
        )}
        <button
          onClick={() => setPanelOpen((o) => !o)}
          style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(0,0,0,0.6)', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0', cursor: 'pointer', padding: '7px 13px', fontSize: '0.8rem', zIndex: 11 }}>
          {panelOpen ? (isNarrow ? '✕ Cerrar' : '▶ Ocultar panel') : '🛋️ Muebles y colores'}
        </button>
      </div>

      {/* Side panel (hoja inferior en pantallas estrechas) */}
      {panelOpen && (
        <div style={panelStyle}>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #1f2937', flexShrink: 0 }}>
            {(['furniture', 'colors'] as const).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                style={{ flex: 1, padding: '12px 8px', background: activeTab === tab ? '#1e293b' : 'transparent', border: 'none', color: activeTab === tab ? '#e2e8f0' : '#64748b', cursor: 'pointer', fontSize: '0.8rem', fontWeight: activeTab === tab ? 600 : 400, borderBottom: activeTab === tab ? '2px solid #3b82f6' : '2px solid transparent' }}>
                {tab === 'furniture' ? '🛋️ Muebles' : '🎨 Colores'}
              </button>
            ))}
          </div>

          {activeTab === 'furniture' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
              {/* Categories */}
              <div style={{ display: 'flex', gap: 4, padding: '8px 10px', overflowX: 'auto', flexShrink: 0, scrollbarWidth: 'none' }}>
                {CATEGORIES.map((cat) => (
                  <button key={cat} onClick={() => setActiveCategory(cat)}
                    style={{ padding: '4px 10px', borderRadius: 16, border: 'none', background: activeCategory === cat ? '#3b82f6' : '#1e293b', color: activeCategory === cat ? '#fff' : '#94a3b8', cursor: 'pointer', fontSize: '0.72rem', whiteSpace: 'nowrap', fontWeight: activeCategory === cat ? 600 : 400 }}>
                    {cat}
                  </button>
                ))}
              </div>
              {/* Catalog */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '4px 10px', minHeight: 110 }}>
                {filteredFurniture.map((item) => (
                  <button key={item.id} onClick={() => addFurniture(item)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0', cursor: 'pointer', marginBottom: 6, textAlign: 'left', transition: 'border-color 0.15s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#3b82f6')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#334155')}>
                    <span style={{ fontSize: '1.4rem' }}>{item.emoji}</span>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{item.name}</div>
                      <div style={{ fontSize: '0.7rem', color: '#475569' }}>{item.size[0]}m × {item.size[2]}m</div>
                    </div>
                    <span style={{ marginLeft: 'auto', color: '#3b82f6', fontSize: '1.1rem' }}>+</span>
                  </button>
                ))}
              </div>
              {/* Placed items */}
              {placed.length > 0 && (
                <div style={{ borderTop: '1px solid #1f2937', padding: '10px', flexShrink: 0 }}>
                  <p style={{ margin: '0 0 8px', fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>En la habitación ({placed.length})</p>
                  <div style={{ maxHeight: isNarrow ? 76 : 120, overflowY: 'auto' }}>
                    {placed.map((p) => (
                      <div key={p.uid} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 8px', borderRadius: 6, background: selectedUid === p.uid ? '#1e3a5f' : 'transparent', marginBottom: 2 }}>
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{p.item.emoji} {p.item.name}</span>
                        <button onClick={() => removeItem(p.uid)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1rem', padding: '0 4px', lineHeight: 1 }}>
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'colors' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 12px', minHeight: 0 }}>
              <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '0 0 14px' }}>Color de paredes</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {WALL_COLORS.map((c) => (
                  <button key={c.hex} onClick={() => setWallColor(c.hex)}
                    style={{ padding: '10px 8px', borderRadius: 8, border: `2px solid ${wallColor === c.hex ? '#3b82f6' : 'transparent'}`, background: '#1e293b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 22, height: 22, borderRadius: 4, background: c.hex, border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0, display: 'block' }} />
                    <span style={{ fontSize: '0.75rem', color: wallColor === c.hex ? '#e2e8f0' : '#94a3b8', fontWeight: wallColor === c.hex ? 600 : 400 }}>{c.name}</span>
                  </button>
                ))}
              </div>
              <div style={{ marginTop: 16 }}>
                <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '0 0 8px' }}>Color personalizado</p>
                <input
                  type="color"
                  value={wallColor}
                  onChange={(e) => setWallColor(e.target.value)}
                  style={{ width: '100%', height: 40, borderRadius: 8, border: '1px solid #334155', background: 'transparent', cursor: 'pointer', padding: 2 }}
                />
              </div>
            </div>
          )}

          {/* CTA */}
          <div style={{ padding: '14px 12px', borderTop: '1px solid #1f2937', flexShrink: 0 }}>
            <a href="/login" style={{ display: 'block', padding: '11px', background: '#3b82f6', color: '#fff', borderRadius: 8, textAlign: 'center', fontWeight: 600, fontSize: '0.9rem', textDecoration: 'none', marginBottom: 8 }}>
              Guardar y crear cuenta →
            </a>
            <p style={{ color: '#475569', fontSize: '0.72rem', textAlign: 'center', margin: 0 }}>
              Gratis · Sin tarjeta · 2 tours incluidos
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
