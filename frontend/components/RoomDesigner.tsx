'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';

const CATALOG = [
  { id: 'sofa',    label: 'Sofá',       icon: '🛋️', color: 0x7c6b9a },
  { id: 'chair',   label: 'Sillón',     icon: '🪑', color: 0xa08060 },
  { id: 'table',   label: 'Mesa',       icon: '🪵', color: 0x9b7722 },
  { id: 'lamp',    label: 'Lámpara',    icon: '💡', color: 0xd4a843 },
  { id: 'shelf',   label: 'Estantería', icon: '📚', color: 0x6b5040 },
  { id: 'plant',   label: 'Planta',     icon: '🌿', color: 0x3a8a3a },
  { id: 'rug',     label: 'Alfombra',   icon: '▬',  color: 0xb03020 },
  { id: 'tv',      label: 'TV',         icon: '📺', color: 0x2c3e50 },
  { id: 'bed',     label: 'Cama',       icon: '🛏️', color: 0x7888a0 },
  { id: 'dresser', label: 'Cómoda',     icon: '🗄️', color: 0x806050 },
] as const;

const WALL_SWATCHES = [
  { name: 'Blanco puro',   hex: '#f8f8f6', num: 0xf8f8f6 },
  { name: 'Crema',         hex: '#f4e8d0', num: 0xf4e8d0 },
  { name: 'Cielo',         hex: '#cee0f0', num: 0xcee0f0 },
  { name: 'Salvia',        hex: '#b4ccba', num: 0xb4ccba },
  { name: 'Terracota',     hex: '#e8c0a0', num: 0xe8c0a0 },
  { name: 'Marino',        hex: '#8aaac8', num: 0x8aaac8 },
  { name: 'Musgo',         hex: '#8aab94', num: 0x8aab94 },
  { name: 'Rosa pálido',   hex: '#f0d0d4', num: 0xf0d0d4 },
  { name: 'Gris perla',    hex: '#d4d0ca', num: 0xd4d0ca },
  { name: 'Mostaza',       hex: '#e8d090', num: 0xe8d090 },
];

const FLOOR_SWATCHES = [
  { name: 'Roble claro',   hex: '#d4a458', num: 0xd4a458 },
  { name: 'Nogal',         hex: '#8a5a30', num: 0x8a5a30 },
  { name: 'Baldosa blanca',hex: '#e8e8e4', num: 0xe8e8e4 },
  { name: 'Gris oscuro',   hex: '#606060', num: 0x606060 },
  { name: 'Mármol beige',  hex: '#e0d8c4', num: 0xe0d8c4 },
  { name: 'Ébano',         hex: '#3a2010', num: 0x3a2010 },
  { name: 'Bambú',         hex: '#c8b870', num: 0xc8b870 },
  { name: 'Cemento',       hex: '#909090', num: 0x909090 },
];

const sm = (c: number, r = 0.82) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 0.03 });
const bx = (w: number, h: number, d: number, c: number) =>
  new THREE.Mesh(new THREE.BoxGeometry(w, h, d), sm(c));

function makeSofa(c: number) {
  const g = new THREE.Group();
  const seat = bx(1.8, 0.3, 0.82, c); seat.position.set(0, 0.15, 0); g.add(seat);
  const back = bx(1.8, 0.62, 0.18, c); back.position.set(0, 0.56, -0.32); g.add(back);
  [-0.85, 0.85].forEach(x => { const a = bx(0.1, 0.48, 0.82, c); a.position.set(x, 0.24, 0); g.add(a); });
  [-0.5, 0.5].forEach(x => { const cu = bx(0.7, 0.1, 0.68, 0x9980b0); cu.position.set(x, 0.34, 0.04); g.add(cu); });
  return g;
}
function makeChair(c: number) {
  const g = new THREE.Group();
  const seat = bx(0.7, 0.1, 0.65, c); seat.position.set(0, 0.42, 0); g.add(seat);
  const back = bx(0.7, 0.7, 0.08, c); back.position.set(0, 0.82, -0.28); g.add(back);
  [[-0.27, -0.22], [0.27, -0.22], [-0.27, 0.22], [0.27, 0.22]].forEach(([x, z]) => {
    const leg = bx(0.06, 0.42, 0.06, 0x4a3020); leg.position.set(x, 0.21, z); g.add(leg);
  });
  return g;
}
function makeTable(c: number) {
  const g = new THREE.Group();
  const top = bx(1.4, 0.06, 0.7, c); top.position.set(0, 0.72, 0); g.add(top);
  [[-0.6, -0.28], [0.6, -0.28], [-0.6, 0.28], [0.6, 0.28]].forEach(([x, z]) => {
    const leg = bx(0.06, 0.7, 0.06, 0x7a5010); leg.position.set(x, 0.35, z); g.add(leg);
  });
  return g;
}
function makeLamp(c: number) {
  const g = new THREE.Group();
  const base = bx(0.28, 0.05, 0.28, 0x333333); base.position.set(0, 0.025, 0); g.add(base);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.5, 8), sm(0x888888));
  pole.position.set(0, 0.78, 0); g.add(pole);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.38, 16, 1, true),
    new THREE.MeshStandardMaterial({ color: c, side: THREE.DoubleSide, roughness: 0.9 }));
  shade.position.set(0, 1.54, 0); shade.rotation.y = Math.PI; g.add(shade);
  const light = new THREE.PointLight(0xfff4c2, 0.7, 3.5); light.position.set(0, 1.38, 0); g.add(light);
  return g;
}
function makeShelf(c: number) {
  const g = new THREE.Group();
  const back = bx(0.78, 1.8, 0.04, 0x4a3830); back.position.set(0, 0.9, -0.14); g.add(back);
  [0.04, 0.52, 1.0, 1.44, 1.78].forEach(y => { const s = bx(0.78, 0.04, 0.28, c); s.position.set(0, y, 0); g.add(s); });
  [-0.38, 0.38].forEach(x => { const side = bx(0.04, 1.8, 0.28, c); side.position.set(x, 0.9, 0); g.add(side); });
  ([[ -0.2, 0.28, 0x8b2020], [0.1, 0.76, 0x206020], [-0.1, 1.22, 0x202060]] as [number, number, number][]).forEach(([bxx, y, col]) => {
    const book = bx(0.08, 0.22, 0.2, col); book.position.set(bxx, y + 0.13, 0); g.add(book);
  });
  return g;
}
function makePlant(c: number) {
  const g = new THREE.Group();
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.12, 0.28, 10), sm(0xb05030));
  pot.position.set(0, 0.14, 0); g.add(pot);
  const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.04, 10), sm(0x3a2010));
  soil.position.set(0, 0.30, 0); g.add(soil);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.3, 6), sm(0x3a5020));
  stem.position.set(0, 0.44, 0); g.add(stem);
  const leaves = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 10), sm(c, 0.95));
  leaves.scale.set(1, 0.85, 1); leaves.position.set(0, 0.72, 0); g.add(leaves);
  return g;
}
function makeRug(c: number) {
  const g = new THREE.Group();
  const border = bx(2.44, 0.012, 1.64, 0x803020); border.position.set(0, 0.006, 0); g.add(border);
  const inner = bx(2.2, 0.016, 1.42, c); inner.position.set(0, 0.01, 0); g.add(inner);
  return g;
}
function makeTv(c: number) {
  const g = new THREE.Group();
  const body = bx(1.5, 0.45, 0.38, c); body.position.set(0, 0.225, 0); g.add(body);
  [-0.38, 0.38].forEach(x => {
    const door = bx(0.68, 0.38, 0.02, 0x9a7a60); door.position.set(x, 0.22, 0.2); g.add(door);
  });
  const bezel = bx(1.26, 0.72, 0.06, 0x1a1a1a); bezel.position.set(0, 0.82, 0); g.add(bezel);
  const screen = bx(1.18, 0.64, 0.03, 0x0a0a1a); screen.position.set(0, 0.82, 0.04); g.add(screen);
  const glow = bx(1.14, 0.60, 0.01, 0x1a3a6a); glow.position.set(0, 0.82, 0.06); g.add(glow);
  [-0.65, 0.65].forEach(x => { const leg = bx(0.08, 0.06, 0.32, 0x5a4a3a); leg.position.set(x, 0.03, 0); g.add(leg); });
  return g;
}
function makeBed(c: number) {
  const g = new THREE.Group();
  const frame = bx(1.62, 0.24, 2.1, 0x5a4030); frame.position.set(0, 0.12, 0); g.add(frame);
  const mattress = bx(1.5, 0.2, 1.92, 0xf0f0f0); mattress.position.set(0, 0.34, 0); g.add(mattress);
  const headboard = bx(1.62, 0.82, 0.1, c); headboard.position.set(0, 0.58, -0.96); g.add(headboard);
  [[-0.38, -0.7], [0.38, -0.7]].forEach(([x, z]) => {
    const p = bx(0.56, 0.12, 0.36, 0xf5f5ff); p.position.set(x, 0.50, z); g.add(p);
  });
  const duvet = bx(1.5, 0.1, 1.3, c); duvet.position.set(0, 0.50, 0.28); g.add(duvet);
  return g;
}
function makeDresser(c: number) {
  const g = new THREE.Group();
  const body = bx(1.0, 0.9, 0.46, c); body.position.set(0, 0.45, 0); g.add(body);
  [0.16, 0.48, 0.78].forEach(y => {
    const drawer = bx(0.88, 0.22, 0.04, 0xb09070); drawer.position.set(0, y, 0.24); g.add(drawer);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.16, 8), sm(0xc0a050, 0.3));
    handle.rotation.z = Math.PI / 2; handle.position.set(0, y, 0.27); g.add(handle);
  });
  const top = bx(1.0, 0.03, 0.46, 0xd0b08a); top.position.set(0, 0.915, 0); g.add(top);
  return g;
}

function buildFurniture(id: string, color: number): THREE.Group {
  const map: Record<string, (c: number) => THREE.Group> = {
    sofa: makeSofa, chair: makeChair, table: makeTable, lamp: makeLamp,
    shelf: makeShelf, plant: makePlant, rug: makeRug, tv: makeTv, bed: makeBed, dresser: makeDresser,
  };
  return (map[id] ?? (() => new THREE.Group()))(color);
}

type Tab = 'furniture' | 'walls' | 'floors';

export default function RoomDesigner() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<Tab>('furniture');
  const [hasSelected, setHasSelected] = useState(false);

  const threeRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    wallMats: THREE.MeshStandardMaterial[];
    floorMat: THREE.MeshStandardMaterial;
    furniture: THREE.Group[];
    floorHit: THREE.Mesh;
    selected: THREE.Group | null;
  } | null>(null);

  const orb = useRef({ phi: 1.1, theta: 0.55, r: 11 });
  const drag = useRef<{ what: 'orbit' | 'move' | null; x: number; y: number; obj: THREE.Group | null }>({
    what: null, x: 0, y: 0, obj: null,
  });

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setSize(el.clientWidth, el.clientHeight);
    el.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(52, el.clientWidth / el.clientHeight, 0.1, 80);
    const { phi, theta, r } = orb.current;
    camera.position.set(r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.cos(theta));
    camera.lookAt(0, 1, 0);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111827);

    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const sun = new THREE.DirectionalLight(0xfff8e8, 1.6);
    sun.position.set(4, 8, 5); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -8; sun.shadow.camera.right = 8;
    sun.shadow.camera.top = 8; sun.shadow.camera.bottom = -8;
    sun.shadow.bias = -0.001; scene.add(sun);
    const fill = new THREE.DirectionalLight(0xc8d8ff, 0.4); fill.position.set(-4, 5, -4); scene.add(fill);
    const roomLight = new THREE.PointLight(0xfff4d0, 0.7, 10); roomLight.position.set(0, 2.6, 0); scene.add(roomLight);

    const W = 9, H = 3, D = 7;

    const floorMat = new THREE.MeshStandardMaterial({ color: 0xc4933f, roughness: 0.88 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), floorMat);
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
    for (let i = -4; i <= 4; i++) {
      const plank = new THREE.Mesh(new THREE.PlaneGeometry(0.02, D),
        new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.07 }));
      plank.rotation.x = -Math.PI / 2; plank.position.set(i, 0.001, 0); scene.add(plank);
    }

    const wallMats: THREE.MeshStandardMaterial[] = [];
    function addWall(w: number, h: number, pos: [number, number, number], ry: number) {
      const m = new THREE.MeshStandardMaterial({ color: 0xf5f5f0, roughness: 0.9 });
      wallMats.push(m);
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
      mesh.position.set(...pos); mesh.rotation.y = ry; mesh.receiveShadow = true; scene.add(mesh);
    }
    addWall(W, H, [0, H / 2, -D / 2], 0);
    addWall(W, H, [0, H / 2,  D / 2], Math.PI);
    addWall(D, H, [-W / 2, H / 2, 0],  Math.PI / 2);
    addWall(D, H, [ W / 2, H / 2, 0], -Math.PI / 2);

    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D),
      new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 1 }));
    ceil.rotation.x = Math.PI / 2; ceil.position.y = H; scene.add(ceil);

    // Window
    const wg = new THREE.Group(); wg.position.set(-1.5, 1.6, -D / 2 + 0.04);
    wg.add(Object.assign(new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.3),
      new THREE.MeshStandardMaterial({ color: 0x87ceeb, transparent: true, opacity: 0.55, roughness: 0, metalness: 0.1 }))));
    const wfm = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
    [[-0.82, 0, 0.08, 1.34], [0.82, 0, 0.08, 1.34], [0, 0.67, 1.68, 0.08], [0, -0.67, 1.68, 0.08]]
      .forEach(([x, y, w, h]) => {
        const f = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.04), wfm);
        f.position.set(x, y, 0.02); wg.add(f);
      });
    scene.add(wg);

    // Skirting
    const skM = new THREE.MeshStandardMaterial({ color: 0xf0ece0, roughness: 0.85 });
    ([[ W, 0, -D/2+0.01, 0], [W, 0, D/2-0.01, Math.PI],
      [D, -W/2+0.01, 0, Math.PI/2], [D, W/2-0.01, 0, -Math.PI/2]] as [number,number,number,number][])
      .forEach(([len, px, pz, ry]) => {
        const sk = new THREE.Mesh(new THREE.BoxGeometry(len, 0.09, 0.025), skM);
        sk.position.set(px, 0.045, pz); sk.rotation.y = ry; scene.add(sk);
      });

    const floorHit = new THREE.Mesh(new THREE.PlaneGeometry(W, D),
      new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide }));
    floorHit.rotation.x = -Math.PI / 2; scene.add(floorHit);

    threeRef.current = { renderer, scene, camera, wallMats, floorMat, furniture: [], floorHit, selected: null };

    let raf: number;
    const animate = () => { raf = requestAnimationFrame(animate); renderer.render(scene, camera); };
    animate();

    const onResize = () => {
      renderer.setSize(el.clientWidth, el.clientHeight);
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    function syncCam() {
      const t = threeRef.current; if (!t) return;
      const { phi, theta, r } = orb.current;
      t.camera.position.set(
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.cos(theta)
      );
      t.camera.lookAt(0, 1, 0);
    }

    function hitFurniture(cx: number, cy: number) {
      const t = threeRef.current; if (!t) return null;
      const rect = el.getBoundingClientRect();
      const m = new THREE.Vector2(((cx - rect.left) / rect.width) * 2 - 1, -((cy - rect.top) / rect.height) * 2 + 1);
      const rc = new THREE.Raycaster(); rc.setFromCamera(m, t.camera);
      for (const f of t.furniture) { if (rc.intersectObjects(f.children, true).length > 0) return f; }
      return null;
    }

    function hitFloor(cx: number, cy: number) {
      const t = threeRef.current; if (!t) return null;
      const rect = el.getBoundingClientRect();
      const m = new THREE.Vector2(((cx - rect.left) / rect.width) * 2 - 1, -((cy - rect.top) / rect.height) * 2 + 1);
      const rc = new THREE.Raycaster(); rc.setFromCamera(m, t.camera);
      return rc.intersectObject(t.floorHit)[0]?.point ?? null;
    }

    function onDown(e: PointerEvent) {
      if (e.button === 2 || e.button === 1) {
        drag.current = { what: 'orbit', x: e.clientX, y: e.clientY, obj: null };
        el.setPointerCapture(e.pointerId); return;
      }
      if (e.button === 0) {
        const f = hitFurniture(e.clientX, e.clientY);
        if (f) {
          drag.current = { what: 'move', x: e.clientX, y: e.clientY, obj: f };
          el.setPointerCapture(e.pointerId);
          if (threeRef.current) threeRef.current.selected = f;
          setHasSelected(true);
        } else {
          drag.current = { what: null, x: 0, y: 0, obj: null };
          if (threeRef.current) threeRef.current.selected = null;
          setHasSelected(false);
        }
      }
    }

    function onMove(e: PointerEvent) {
      const d = drag.current; if (!d.what) return;
      if (d.what === 'orbit') {
        const dx = e.clientX - d.x, dy = e.clientY - d.y;
        d.x = e.clientX; d.y = e.clientY;
        orb.current.theta -= dx * 0.007;
        orb.current.phi = Math.max(0.25, Math.min(1.4, orb.current.phi + dy * 0.007));
        syncCam();
      } else if (d.what === 'move' && d.obj) {
        const pt = hitFloor(e.clientX, e.clientY);
        if (pt) {
          d.obj.position.x = Math.max(-3.8, Math.min(3.8, pt.x));
          d.obj.position.z = Math.max(-2.8, Math.min(2.8, pt.z));
        }
      }
    }

    const onUp = () => { drag.current = { what: null, x: 0, y: 0, obj: null }; };

    function onWheel(e: WheelEvent) {
      e.preventDefault();
      orb.current.r = Math.max(4, Math.min(18, orb.current.r + e.deltaY * 0.012));
      syncCam();
    }

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('contextmenu', e => e.preventDefault());
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('wheel', onWheel);
    };
  }, []);

  const addFurniture = useCallback((item: typeof CATALOG[number]) => {
    const t = threeRef.current; if (!t) return;
    const g = buildFurniture(item.id, item.color);
    g.userData = { id: item.id, label: item.label };
    g.traverse(c => { if (c instanceof THREE.Mesh) { c.castShadow = true; c.receiveShadow = true; } });
    g.position.set((Math.random() - 0.5) * 4, 0, (Math.random() - 0.5) * 3);
    t.scene.add(g); t.furniture.push(g);
  }, []);

  const removeSelected = useCallback(() => {
    const t = threeRef.current; if (!t?.selected) return;
    t.scene.remove(t.selected);
    const idx = t.furniture.indexOf(t.selected);
    if (idx >= 0) t.furniture.splice(idx, 1);
    t.selected = null; setHasSelected(false);
  }, []);

  const S: React.CSSProperties = { display: 'flex', height: '100%', overflow: 'hidden' };

  return (
    <div style={S}>
      <div ref={mountRef} style={{ flex: 1, position: 'relative', cursor: 'crosshair' }}>
        <div style={{
          position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(6px)',
          borderRadius: 8, padding: '5px 14px', fontSize: '0.72rem', color: '#64748b',
          pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 5,
        }}>
          Click derecho + arrastra · Scroll = zoom · Arrastra muebles para moverlos
        </div>
      </div>

      <aside style={{ width: 252, flexShrink: 0, background: '#111827', borderLeft: '1px solid #1f2937', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid #1f2937' }}>
          {(['furniture', 'walls', 'floors'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '11px 4px', background: 'none', border: 'none',
              color: tab === t ? '#00d4ff' : '#64748b',
              borderBottom: `2px solid ${tab === t ? '#00d4ff' : 'transparent'}`,
              fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer',
            }}>
              {t === 'furniture' ? '🛋️ Muebles' : t === 'walls' ? '🎨 Paredes' : '🪵 Suelo'}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 10 }}>
          {tab === 'furniture' && (
            <>
              {hasSelected && (
                <button onClick={removeSelected} style={{
                  width: '100%', padding: 8, marginBottom: 10,
                  background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)',
                  borderRadius: 8, color: '#ef4444', cursor: 'pointer', fontSize: '0.78rem',
                }}>🗑️ Quitar seleccionado</button>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
                {CATALOG.map(item => (
                  <button key={item.id} onClick={() => addFurniture(item)} style={{
                    padding: '12px 6px', background: '#1e293b', border: '1px solid #334155',
                    borderRadius: 9, color: '#e2e8f0', cursor: 'pointer',
                    textAlign: 'center', fontSize: '0.72rem', transition: 'all .15s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#00d4ff'; (e.currentTarget as HTMLButtonElement).style.background = '#1a3044'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#334155'; (e.currentTarget as HTMLButtonElement).style.background = '#1e293b'; }}>
                    <div style={{ fontSize: '1.7rem', lineHeight: 1, marginBottom: 5 }}>{item.icon}</div>
                    {item.label}
                  </button>
                ))}
              </div>
            </>
          )}
          {tab === 'walls' && (
            <div>
              <p style={{ color: '#64748b', fontSize: '0.72rem', margin: '0 0 12px' }}>Toca un color para aplicarlo a las paredes</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
                {WALL_SWATCHES.map(s => (
                  <button key={s.hex} title={s.name}
                    onClick={() => threeRef.current?.wallMats.forEach(m => m.color.set(s.num))}
                    style={{ aspectRatio: '1', borderRadius: 8, background: s.hex, border: '2px solid transparent', cursor: 'pointer', padding: 0 }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = '#00d4ff')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'transparent')} />
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, marginTop: 10 }}>
                {WALL_SWATCHES.map(s => <span key={s.name} style={{ fontSize: '0.62rem', color: '#475569' }}>· {s.name}</span>)}
              </div>
            </div>
          )}
          {tab === 'floors' && (
            <div>
              <p style={{ color: '#64748b', fontSize: '0.72rem', margin: '0 0 12px' }}>Elige el revestimiento del suelo</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
                {FLOOR_SWATCHES.map(s => (
                  <button key={s.hex} title={s.name}
                    onClick={() => { if (threeRef.current) threeRef.current.floorMat.color.set(s.num); }}
                    style={{ aspectRatio: '1', borderRadius: 8, background: s.hex, border: '2px solid transparent', cursor: 'pointer', padding: 0 }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = '#00d4ff')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'transparent')} />
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, marginTop: 10 }}>
                {FLOOR_SWATCHES.map(s => <span key={s.name} style={{ fontSize: '0.62rem', color: '#475569' }}>· {s.name}</span>)}
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: '14px 12px', borderTop: '1px solid #1f2937' }}>
          <p style={{ margin: '0 0 10px', color: '#94a3b8', fontSize: '0.72rem', textAlign: 'center', lineHeight: 1.5 }}>
            ¿Quieres importar tu<br />habitación real en 3D?
          </p>
          <a href="/login" style={{
            display: 'block', textAlign: 'center', padding: 10,
            background: 'linear-gradient(135deg,#3b82f6,#7c3aed)',
            color: '#fff', borderRadius: 8, textDecoration: 'none',
            fontWeight: 700, fontSize: '0.82rem',
          }}>Empezar gratis →</a>
        </div>
      </aside>
    </div>
  );
}
