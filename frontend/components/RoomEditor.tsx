'use client';


import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

type WallId = 'back' | 'left' | 'right' | 'ceiling';
interface FurnitureItem { id: string; name: string; category: string; emoji: string; primary: number; secondary?: number; }
interface PlacedItem { uid: string; item: FurnitureItem; group: THREE.Group; }

const WALL_COLORS = [
  { name: 'Blanco puro',    hex: '#f7f4f0' },
  { name: 'Crema cálida',   hex: '#ede0cb' },
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
  { name: 'Nogal',         hex: '#6b3c18' },
  { name: 'Gris lavado',   hex: '#c0bdb6' },
  { name: 'Baldosa clara', hex: '#f0edea' },
  { name: 'Cemento',       hex: '#8a8c8e' },
];

const CATALOG: FurnitureItem[] = [
  { id: 'sofa3',    name: 'Sofá 3 plazas',  category: 'Sala',    emoji: '🛋️', primary: 0xe0dac8 },
  { id: 'sofa2',    name: 'Sofá 2 plazas',  category: 'Sala',    emoji: '🛋️', primary: 0x4e6070 },
  { id: 'armchair', name: 'Sillón',         category: 'Sala',    emoji: '🪑',  primary: 0xc0681c },
  { id: 'coffee',   name: 'Mesa de centro', category: 'Sala',    emoji: '🪵',  primary: 0xf0ebe0, secondary: 0xd4c080 },
  { id: 'sideboard',name: 'Aparador',       category: 'Sala',    emoji: '🪵',  primary: 0xc8a870, secondary: 0xc0a040 },
  { id: 'dining',   name: 'Mesa comedor',   category: 'Comedor', emoji: '🍽️', primary: 0x6b4828 },
  { id: 'chair',    name: 'Silla comedor',  category: 'Comedor', emoji: '🪑',  primary: 0x3a3a38 },
  { id: 'bed',      name: 'Cama doble',     category: 'Dormit.', emoji: '🛏️', primary: 0xa89070, secondary: 0xd8d0c8 },
  { id: 'wardrobe', name: 'Armario',        category: 'Dormit.', emoji: '🗄️', primary: 0xc0a882 },
  { id: 'arclamp',  name: 'Lámpara arco',   category: 'Decor',   emoji: '💡',  primary: 0xb8a050, secondary: 0xf0ece6 },
  { id: 'lamp',     name: 'Lámpara pie',    category: 'Decor',   emoji: '💡',  primary: 0xb89030, secondary: 0xe8e4d8 },
  { id: 'plant',    name: 'Planta grande',  category: 'Decor',   emoji: '🌿',  primary: 0x2e6a34 },
  { id: 'stool',    name: 'Taburete',       category: 'Decor',   emoji: '🪑',  primary: 0x151515 },
  { id: 'tv',       name: 'TV + mueble',    category: 'Electr.', emoji: '📺',  primary: 0x181818, secondary: 0x4a4030 },
  { id: 'shelf',    name: 'Estantería',     category: 'Electr.', emoji: '📚',  primary: 0x7a5a30 },
];

const CATEGORIES = ['Todos', 'Sala', 'Comedor', 'Dormit.', 'Electr.', 'Decor'];
const WALL_LABELS: Record<WallId, string> = { back: 'Fondo', left: 'Izquierda', right: 'Derecha', ceiling: 'Techo' };

// ── Textures ─────────────────────────────────────────────────────────────────

function makeWoodTex(): THREE.CanvasTexture {
  const S = 2048, cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const cx = cv.getContext('2d')!;
  const PW = S / 5, PH = S / 3;
  for (let row = 0; row < 6; row++) {
    for (let col = -1; col < 8; col++) {
      const shift = (row % 2) * (PW / 2);
      const x = col * PW + shift, y = row * PH;
      const li = 28 + Math.random() * 16, sa = 44 + Math.random() * 14;
      cx.fillStyle = `hsl(26,${sa}%,${li}%)`;
      cx.fillRect(x + 1, y + 1, PW - 2, PH - 2);
      cx.save(); cx.globalAlpha = 0.055; cx.strokeStyle = '#000'; cx.lineWidth = 0.8;
      for (let g = 0; g < 20; g++) {
        const gy = y + (g / 20) * PH;
        cx.beginPath();
        cx.moveTo(x, gy + (Math.random() - 0.5) * 5);
        cx.bezierCurveTo(x + PW * 0.3, gy + (Math.random() - 0.5) * 10, x + PW * 0.7, gy + (Math.random() - 0.5) * 10, x + PW, gy + (Math.random() - 0.5) * 5);
        cx.stroke();
      }
      cx.restore();
      if (Math.random() < 0.07) {
        const kx = x + PW * (0.2 + Math.random() * 0.6), ky = y + PH * (0.2 + Math.random() * 0.6);
        cx.save(); cx.globalAlpha = 0.12;
        for (let r = 18; r > 2; r -= 4) {
          cx.strokeStyle = `hsl(22,50%,${22 - r * 0.4}%)`;
          cx.lineWidth = 1.5;
          cx.beginPath(); cx.ellipse(kx, ky, r * 1.5, r * 0.8, 0.2, 0, Math.PI * 2); cx.stroke();
        }
        cx.restore();
      }
      cx.fillStyle = 'rgba(0,0,0,0.28)';
      cx.fillRect(x, y, 1.5, PH); cx.fillRect(x, y, PW, 1.5);
    }
  }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 1.5);
  t.colorSpace = THREE.SRGBColorSpace; return t;
}

function makePlasterNormal(): THREE.CanvasTexture {
  const S = 512, cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const cx = cv.getContext('2d')!; cx.fillStyle = '#8080ff'; cx.fillRect(0, 0, S, S);
  const id = cx.getImageData(0, 0, S, S);
  for (let i = 0; i < id.data.length; i += 4) {
    id.data[i]     = 128 + (Math.random() - 0.5) * 14;
    id.data[i + 1] = 128 + (Math.random() - 0.5) * 14;
    id.data[i + 2] = 255; id.data[i + 3] = 255;
  }
  cx.putImageData(id, 0, 0);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(5, 5); return t;
}

function makeArtTex(): THREE.CanvasTexture {
  const cv = document.createElement('canvas'); cv.width = 640; cv.height = 400;
  const cx = cv.getContext('2d')!;
  const sky = cx.createLinearGradient(0, 0, 0, 180);
  sky.addColorStop(0, '#ddd4be'); sky.addColorStop(0.6, '#c8b87a'); sky.addColorStop(1, '#b89f58');
  cx.fillStyle = sky; cx.fillRect(0, 0, 640, 180);
  const sunG = cx.createRadialGradient(480, 70, 0, 480, 70, 90);
  sunG.addColorStop(0, 'rgba(255,245,180,0.85)'); sunG.addColorStop(0.4, 'rgba(255,220,100,0.35)'); sunG.addColorStop(1, 'rgba(255,200,60,0)');
  cx.fillStyle = sunG; cx.fillRect(0, 0, 640, 200);
  cx.fillStyle = '#7a8c50'; cx.beginPath(); cx.moveTo(0, 145);
  for (let x = 0; x <= 640; x += 15) cx.lineTo(x, 140 + Math.sin(x * 0.022) * 22 + Math.random() * 9);
  cx.lineTo(640, 200); cx.lineTo(0, 200); cx.closePath(); cx.fill();
  const field = cx.createLinearGradient(0, 168, 0, 400);
  field.addColorStop(0, '#c8a040'); field.addColorStop(0.45, '#9a7028'); field.addColorStop(1, '#6a4018');
  cx.fillStyle = field; cx.fillRect(0, 168, 640, 232);
  for (let i = 0; i < 700; i++) {
    const gx = Math.random() * 640, gy = 168 + Math.random() * 200, r = 1 + Math.random() * 9;
    cx.fillStyle = `rgba(${200+Math.random()*55},${140+Math.random()*50},${30+Math.random()*40},${0.12+Math.random()*0.4})`;
    cx.beginPath(); cx.ellipse(gx, gy, r * 2.2, r * 0.7, Math.random() * Math.PI, 0, Math.PI * 2); cx.fill();
  }
  for (let i = 0; i < 10; i++) {
    const tx = 40 + Math.random() * 560, ty = 118 + Math.random() * 28, th = 22 + Math.random() * 35;
    cx.fillStyle = `rgba(${40+Math.random()*30},${60+Math.random()*30},${30+Math.random()*20},0.55)`;
    cx.beginPath(); cx.ellipse(tx, ty, 10 + Math.random() * 8, th * 0.55, 0, 0, Math.PI * 2); cx.fill();
  }
  for (let i = 0; i < 22; i++) {
    cx.fillStyle = `rgba(240,232,210,${0.08+Math.random()*0.18})`;
    cx.beginPath(); cx.ellipse(Math.random()*640, Math.random()*130, 70+Math.random()*90, 8+Math.random()*14, 0, 0, Math.PI*2); cx.fill();
  }
  const vig = cx.createRadialGradient(320, 200, 60, 320, 200, 380);
  vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(15,8,0,0.32)');
  cx.fillStyle = vig; cx.fillRect(0, 0, 640, 400);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function makeRugTex(): THREE.CanvasTexture {
  const W = 1280, H = 860, cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const cx = cv.getContext('2d')!;
  cx.fillStyle = '#5e1212'; cx.fillRect(0, 0, W, H);
  // outer gold border
  cx.strokeStyle = '#c8901a'; cx.lineWidth = 32; cx.strokeRect(16, 16, W - 32, H - 32);
  // cream line
  cx.strokeStyle = '#e8d8b0'; cx.lineWidth = 10; cx.strokeRect(56, 56, W - 112, H - 112);
  // inner red border
  cx.strokeStyle = '#8a1a1a'; cx.lineWidth = 16; cx.strokeRect(72, 72, W - 144, H - 144);
  // cream line 2
  cx.strokeStyle = '#e8d8b0'; cx.lineWidth = 8; cx.strokeRect(94, 94, W - 188, H - 188);
  const ox = W / 2, oy = H / 2;
  // central medallion rings
  const octagon = (r: number, stroke: string, lw: number) => {
    cx.strokeStyle = stroke; cx.lineWidth = lw; cx.beginPath();
    for (let i = 0; i <= 8; i++) { const a = (i / 8) * Math.PI * 2 - Math.PI / 8; i === 0 ? cx.moveTo(ox + Math.cos(a) * r, oy + Math.sin(a) * r) : cx.lineTo(ox + Math.cos(a) * r, oy + Math.sin(a) * r); }
    cx.closePath(); cx.stroke();
  };
  cx.fillStyle = '#8a1a1a';
  cx.beginPath(); for (let i = 0; i <= 8; i++) { const a = (i / 8) * Math.PI * 2 - Math.PI / 8; i === 0 ? cx.moveTo(ox + Math.cos(a) * 198, oy + Math.sin(a) * 198) : cx.lineTo(ox + Math.cos(a) * 198, oy + Math.sin(a) * 198); } cx.fill();
  octagon(198, '#c8901a', 16); octagon(168, '#e8d8b0', 9); octagon(142, '#c8901a', 7); octagon(118, '#e8d8b0', 5);
  // inner star fill
  cx.fillStyle = '#c8901a';
  cx.beginPath(); cx.arc(ox, oy, 62, 0, Math.PI * 2); cx.fill();
  cx.fillStyle = '#5e1212';
  cx.beginPath(); cx.arc(ox, oy, 42, 0, Math.PI * 2); cx.fill();
  cx.fillStyle = '#e8d8b0';
  cx.beginPath(); cx.arc(ox, oy, 22, 0, Math.PI * 2); cx.fill();
  cx.fillStyle = '#c8901a';
  cx.beginPath(); cx.arc(ox, oy, 10, 0, Math.PI * 2); cx.fill();
  // star rays
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    cx.fillStyle = 'rgba(200,144,26,0.55)';
    cx.save(); cx.translate(ox, oy); cx.rotate(a);
    cx.beginPath(); cx.moveTo(0, 0); cx.lineTo(-22, 115); cx.lineTo(0, 105); cx.lineTo(22, 115); cx.closePath(); cx.fill();
    cx.restore();
  }
  // corner medallions
  [[120, 120], [W - 120, 120], [120, H - 120], [W - 120, H - 120]].forEach(([cx2, cy2]) => {
    cx.fillStyle = '#c8901a'; cx.beginPath();
    for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + Math.PI / 4; i === 0 ? cx.moveTo(cx2 + Math.cos(a) * 50, cy2 + Math.sin(a) * 50) : cx.lineTo(cx2 + Math.cos(a) * 50, cy2 + Math.sin(a) * 50); } cx.fill();
    cx.fillStyle = '#5e1212'; cx.beginPath(); cx.arc(cx2, cy2, 22, 0, Math.PI * 2); cx.fill();
    cx.fillStyle = '#e8d8b0'; cx.beginPath(); cx.arc(cx2, cy2, 10, 0, Math.PI * 2); cx.fill();
  });
  // repeating diamond fill
  for (let y = 116; y < H - 116; y += 72) {
    for (let x = 116; x < W - 116; x += 72) {
      const d = Math.hypot(x - ox, (y - oy) * (W / H));
      if (d > 210) {
        cx.save(); cx.translate(x, y); cx.globalAlpha = 0.28;
        cx.fillStyle = '#c8901a'; cx.beginPath(); cx.moveTo(0, -20); cx.lineTo(20, 0); cx.lineTo(0, 20); cx.lineTo(-20, 0); cx.closePath(); cx.fill();
        cx.restore();
      }
    }
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ── Materials ─────────────────────────────────────────────────────────────────

function physMat(color: number | string, rough: number, metal = 0): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({ color, roughness: rough, metalness: metal, envMapIntensity: 0.7 });
}

function fabricMat(col: number): THREE.MeshPhysicalMaterial {
  const mat = new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.83, metalness: 0, envMapIntensity: 0.3 });
  mat.sheen = 0.55;
  mat.sheenRoughness = 0.58;
  mat.sheenColor.setHex(col);
  return mat;
}

function woodPhysMat(col: number, rough = 0.55): THREE.MeshPhysicalMaterial {
  const mat = new THREE.MeshPhysicalMaterial({ color: col, roughness: rough, metalness: 0, envMapIntensity: 0.7 });
  mat.clearcoat = 0.28;
  mat.clearcoatRoughness = 0.4;
  return mat;
}

function metalMat(col: number, rough = 0.18): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({ color: col, roughness: rough, metalness: 0.94, envMapIntensity: 1.6 });
}

// ── Furniture ─────────────────────────────────────────────────────────────────

function sofa(w: number, col: number): THREE.Group {
  const g = new THREE.Group();
  const fab = fabricMat(col);
  const legM = woodPhysMat(0x2a1a08, 0.35);
  const base = new THREE.Mesh(new THREE.BoxGeometry(w, 0.13, 0.86), physMat(0x1a1208, 0.75));
  base.position.y = 0.065; base.castShadow = true; base.receiveShadow = true; g.add(base);
  const n = w > 2.0 ? 3 : 2;
  const cw = (w - 0.24) / n - 0.025;
  for (let i = 0; i < n; i++) {
    const cx2 = -w / 2 + 0.12 + (i + 0.5) * ((w - 0.24) / n);
    const c = new THREE.Mesh(new RoundedBoxGeometry(cw, 0.22, 0.58, 3, 0.045), fab);
    c.position.set(cx2, 0.24, 0.04); c.castShadow = true; g.add(c);
  }
  const nb = w > 2.0 ? 3 : 2;
  const bw = (w - 0.26) / nb - 0.025;
  for (let i = 0; i < nb; i++) {
    const bx = -w / 2 + 0.13 + (i + 0.5) * ((w - 0.26) / nb);
    const bc = new THREE.Mesh(new RoundedBoxGeometry(bw, 0.50, 0.22, 3, 0.05), fab);
    bc.position.set(bx, 0.50, -0.32); bc.castShadow = true; g.add(bc);
  }
  [-w / 2 + 0.07, w / 2 - 0.07].forEach(ax => {
    const arm = new THREE.Mesh(new RoundedBoxGeometry(0.14, 0.14, 0.82, 3, 0.04), fab);
    arm.position.set(ax, 0.40, 0); arm.castShadow = true; g.add(arm);
  });
  [[-w / 2 + 0.13, 0.33], [-w / 2 + 0.13, -0.33], [w / 2 - 0.13, 0.33], [w / 2 - 0.13, -0.33]].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.020, 0.14, 10), legM);
    leg.position.set(lx, -0.035, lz); leg.castShadow = true; g.add(leg);
  });
  return g;
}

function armchair(col: number): THREE.Group {
  const g = new THREE.Group();
  const fab = fabricMat(col);
  const legM = woodPhysMat(0x2a1a08, 0.35);
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.12, 0.84), physMat(0x1a1208, 0.75));
  base.position.y = 0.06; base.castShadow = true; base.receiveShadow = true; g.add(base);
  const seat = new THREE.Mesh(new RoundedBoxGeometry(0.74, 0.22, 0.62, 3, 0.05), fab);
  seat.position.set(0, 0.23, 0.03); seat.castShadow = true; g.add(seat);
  const back = new THREE.Mesh(new RoundedBoxGeometry(0.74, 0.58, 0.22, 3, 0.06), fab);
  back.position.set(0, 0.56, -0.31); back.castShadow = true; g.add(back);
  [-0.48, 0.48].forEach(ax => {
    const arm = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.13, 0.84, 3, 0.04), fab);
    arm.position.set(ax, 0.40, 0); arm.castShadow = true; g.add(arm);
  });
  [[-0.32, 0.30], [-0.32, -0.30], [0.32, 0.30], [0.32, -0.30]].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.018, 0.12, 10), legM);
    leg.position.set(lx, -0.0, lz); leg.castShadow = true; g.add(leg);
  });
  return g;
}

function coffeeTable(col: number, legCol: number): THREE.Group {
  const g = new THREE.Group();
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.055, 0.60), woodPhysMat(col, 0.30));
  top.position.y = 0.44; top.castShadow = true; top.receiveShadow = true; g.add(top);
  const bot = new THREE.Mesh(new THREE.BoxGeometry(0.90, 0.040, 0.44), woodPhysMat(col, 0.40));
  bot.position.y = 0.14; bot.receiveShadow = true; g.add(bot);
  const legM = metalMat(legCol, 0.22);
  [[-0.48, 0.26], [-0.48, -0.24], [0.48, 0.26], [0.48, -0.24]].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.016, 0.44, 10), legM);
    leg.position.set(lx, 0.22, lz); leg.castShadow = true; g.add(leg);
  });
  return g;
}

function sideboard(col: number, handleCol: number): THREE.Group {
  const g = new THREE.Group();
  const wood = woodPhysMat(col, 0.60);
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.52, 0.42), wood);
  body.position.y = 0.56; body.castShadow = true; body.receiveShadow = true; g.add(body);
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.69, 0.04, 0.46), woodPhysMat(col, 0.50));
  top.position.y = 0.84; top.castShadow = true; g.add(top);
  const legM = woodPhysMat(Math.round(col * 0.85), 0.55);
  [[-0.75, 0.18], [-0.75, -0.18], [0.75, 0.18], [0.75, -0.18]].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.27, 0.04), legM);
    leg.position.set(lx, 0.135, lz); g.add(leg);
  });
  const hM = metalMat(handleCol, 0.20);
  [-0.54, 0, 0.54].forEach(dx => {
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.012, 0.012), hM);
    handle.position.set(dx, 0.56, 0.225); g.add(handle);
  });
  const divM = woodPhysMat(Math.round(col * 0.88), 0.7);
  [-0.55, 0.55].forEach(dx => {
    const div = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.50, 0.01), divM);
    div.position.set(dx, 0.56, 0.218); g.add(div);
  });
  return g;
}

function stool(col: number): THREE.Group {
  const g = new THREE.Group(), m = metalMat(col, 0.30);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.055, 18), m);
  top.position.y = 0.43; top.castShadow = true; g.add(top);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.012, 0.43, 7), m);
    leg.position.set(Math.cos(a) * 0.14, 0.215, Math.sin(a) * 0.14);
    leg.rotation.z = -Math.cos(a) * 0.17; leg.rotation.x = -Math.sin(a) * 0.17;
    leg.castShadow = true; g.add(leg);
  }
  return g;
}

function arcLamp(col: number, shadeCol: number): THREE.Group {
  const g = new THREE.Group(), metal = metalMat(col, 0.18);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.27, 0.065, 18), metal);
  base.position.y = 0.033; g.add(base);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.65, 10), metal);
  pole.position.set(0, 0.86, 0); pole.castShadow = true; g.add(pole);
  const arc = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 1.0, 8), metal);
  arc.position.set(0.38, 1.80, 0); arc.rotation.z = -0.44; arc.castShadow = true; g.add(arc);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.22, 22, 1, true), physMat(shadeCol, 0.88));
  shade.position.set(0.82, 2.26, 0); shade.rotation.x = Math.PI; g.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0xfffde8, emissive: 0xfffde8, emissiveIntensity: 3.2, roughness: 0.04 }));
  bulb.position.set(0.82, 2.17, 0); g.add(bulb);
  return g;
}

function floorLamp(col: number, shadeCol: number): THREE.Group {
  const g = new THREE.Group(), metal = metalMat(col, 0.28);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.06, 18), metal);
  base.position.y = 0.03; g.add(base);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 1.55, 10), metal);
  pole.position.y = 0.82; pole.castShadow = true; g.add(pole);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.38, 18, 1, true), physMat(shadeCol, 0.86));
  shade.position.y = 1.72; shade.rotation.x = Math.PI; g.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0xfffde8, emissive: 0xfffde8, emissiveIntensity: 2.8, roughness: 0.05 }));
  bulb.position.y = 1.62; g.add(bulb);
  return g;
}

function plant(leafCol: number): THREE.Group {
  const g = new THREE.Group();
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.17, 0.36, 16), woodPhysMat(0x9a6042, 0.80));
  pot.position.y = 0.18; pot.castShadow = true; pot.receiveShadow = true; g.add(pot);
  const soil = new THREE.Mesh(new THREE.CircleGeometry(0.21, 16), physMat(0x3a2010, 0.96));
  soil.rotation.x = -Math.PI / 2; soil.position.y = 0.37; g.add(soil);
  const leafM = physMat(leafCol, 0.88);
  [{ r: 0.40, h: 0.52, y: 0.70 }, { r: 0.32, h: 0.48, y: 1.06 }, { r: 0.23, h: 0.42, y: 1.40 }, { r: 0.14, h: 0.34, y: 1.68 }].forEach(({ r, h, y }) => {
    const c = new THREE.Mesh(new THREE.ConeGeometry(r, h, 13), leafM);
    c.position.y = y; c.castShadow = true; g.add(c);
  });
  return g;
}

function diningTable(col: number): THREE.Group {
  const g = new THREE.Group();
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.06, 0.90), woodPhysMat(col, 0.52));
  top.position.y = 0.75; top.castShadow = true; top.receiveShadow = true; g.add(top);
  const wM = woodPhysMat(col, 0.60);
  [[-0.82, 0.38], [-0.82, -0.38], [0.82, 0.38], [0.82, -0.38]].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.028, 0.75, 10), wM);
    leg.position.set(lx, 0.375, lz); leg.castShadow = true; g.add(leg);
  });
  return g;
}

function diningChair(col: number): THREE.Group {
  const g = new THREE.Group();
  const m = fabricMat(col);
  const legM = woodPhysMat(0x2a1a08, 0.38);
  const seat = new THREE.Mesh(new RoundedBoxGeometry(0.46, 0.06, 0.44, 2, 0.03), m);
  seat.position.y = 0.46; seat.castShadow = true; g.add(seat);
  const back = new THREE.Mesh(new RoundedBoxGeometry(0.44, 0.50, 0.06, 2, 0.03), m);
  back.position.set(0, 0.72, -0.19); back.castShadow = true; g.add(back);
  [[-0.18, 0.18], [-0.18, -0.18], [0.18, 0.18], [0.18, -0.18]].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.014, 0.46, 8), legM);
    leg.position.set(lx, 0.23, lz); g.add(leg);
  });
  return g;
}

function bed(col: number, pilCol: number): THREE.Group {
  const g = new THREE.Group();
  const frame = woodPhysMat(col, 0.65);
  const base = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.26, 1.9), frame);
  base.position.y = 0.13; base.castShadow = true; base.receiveShadow = true; g.add(base);
  const mattress = new THREE.Mesh(new RoundedBoxGeometry(1.88, 0.20, 1.78, 2, 0.04), physMat(0xf0ece6, 0.92));
  mattress.position.y = 0.36; mattress.castShadow = true; g.add(mattress);
  const duvet = new THREE.Mesh(new RoundedBoxGeometry(1.86, 0.10, 1.38, 2, 0.04), physMat(0xffffff, 0.95));
  duvet.position.set(0, 0.41, 0.18); duvet.castShadow = true; g.add(duvet);
  const headboard = new THREE.Mesh(new RoundedBoxGeometry(2.0, 0.70, 0.12, 2, 0.05), frame);
  headboard.position.set(0, 0.61, -0.95); headboard.castShadow = true; g.add(headboard);
  const pM = fabricMat(pilCol);
  [-0.46, 0.46].forEach(px => {
    const p = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.14, 0.42, 2, 0.04), pM);
    p.position.set(px, 0.50, -0.62); p.rotation.x = 0.07; p.castShadow = true; g.add(p);
  });
  return g;
}

function wardrobe(col: number): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.2, 0.58), woodPhysMat(col, 0.65));
  body.position.y = 1.1; body.castShadow = true; body.receiveShadow = true; g.add(body);
  const hM = metalMat(0x909090, 0.22);
  [-0.46, 0.46].forEach(dx => {
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.12, 10), hM);
    handle.rotation.x = Math.PI / 2;
    handle.position.set(dx > 0 ? dx - 0.08 : dx + 0.08, 1.1, 0.305); g.add(handle);
  });
  return g;
}

function tvUnit(screenCol: number, cabinetCol: number): THREE.Group {
  const g = new THREE.Group();
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.48, 0.40), woodPhysMat(cabinetCol, 0.62));
  cab.position.y = 0.24; cab.castShadow = true; cab.receiveShadow = true; g.add(cab);
  [[-0.7, 0.16], [0.7, 0.16], [-0.7, -0.16], [0.7, -0.16]].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.08, 8), metalMat(0x202020, 0.28));
    leg.position.set(lx, 0.04, lz); g.add(leg);
  });
  const screen = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.80, 0.055), physMat(screenCol, 0.22, 0.55));
  screen.position.y = 1.01; screen.castShadow = true; g.add(screen);
  const display = new THREE.Mesh(new THREE.PlaneGeometry(1.26, 0.70),
    new THREE.MeshStandardMaterial({ color: 0x060c14, emissive: 0x060c14, emissiveIntensity: 0.5, roughness: 0.02 }));
  display.position.set(0, 1.01, 0.032); g.add(display);
  return g;
}

function bookshelf(col: number): THREE.Group {
  const g = new THREE.Group(), wood = woodPhysMat(col, 0.60);
  [-0.58, 0.58].forEach(x => {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.1, 0.32), wood);
    s.position.set(x, 1.05, 0); s.castShadow = true; g.add(s);
  });
  [0.14, 0.60, 1.06, 1.52, 2.0].forEach(y => {
    const s = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.04, 0.32), wood);
    s.position.y = y; s.castShadow = true; s.receiveShadow = true; g.add(s);
  });
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.16, 2.06, 0.02), woodPhysMat(Math.round(col * 0.85), 0.75));
  back.position.set(0, 1.05, -0.15); g.add(back);
  return g;
}

// LatheGeometry ceramic vase
function vase(col: number, h = 0.38): THREE.Group {
  const g = new THREE.Group();
  const scale = h / 0.38;
  const pts = [
    new THREE.Vector2(0.00, 0.000),
    new THREE.Vector2(0.08, 0.008 * scale),
    new THREE.Vector2(0.11, 0.060 * scale),
    new THREE.Vector2(0.13, 0.130 * scale),
    new THREE.Vector2(0.10, 0.220 * scale),
    new THREE.Vector2(0.07, 0.290 * scale),
    new THREE.Vector2(0.09, 0.340 * scale),
    new THREE.Vector2(0.075, h),
  ];
  const mat = new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.12, metalness: 0, envMapIntensity: 1.2 });
  mat.clearcoat = 0.95;
  mat.clearcoatRoughness = 0.06;
  const mesh = new THREE.Mesh(new THREE.LatheGeometry(pts, 28), mat);
  mesh.castShadow = true; mesh.receiveShadow = true;
  g.add(mesh);
  return g;
}

// Stack of books
function bookStack(): THREE.Group {
  const g = new THREE.Group();
  const cols = [0x8a4828, 0x2a4868, 0x486828, 0x684838, 0x5a3858];
  let yOff = 0;
  cols.forEach((col, i) => {
    const bh = 0.038 + Math.random() * 0.010;
    const bw = 0.19 + Math.random() * 0.04;
    const bd = 0.13 + Math.random() * 0.03;
    const slight = (Math.random() - 0.5) * 0.03;
    const book = new THREE.Mesh(
      new THREE.BoxGeometry(bw, bh, bd),
      new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.82, metalness: 0, envMapIntensity: 0.4 })
    );
    book.position.set(slight, yOff + bh / 2, (Math.random() - 0.5) * 0.01);
    book.rotation.y = slight * 0.6;
    book.castShadow = true; book.receiveShadow = i === 0;
    g.add(book);
    yOff += bh;
    if (i < cols.length - 1) {
      const page = new THREE.Mesh(
        new THREE.BoxGeometry(bw - 0.006, 0.002, bd - 0.006),
        new THREE.MeshPhysicalMaterial({ color: 0xf0ebe0, roughness: 0.95, metalness: 0 })
      );
      page.position.set(slight, yOff, 0);
      g.add(page);
    }
  });
  return g;
}

// Neoclassical chandelier with 6 arms, candle stubs, glowing bulbs, pendant drop
function chandelier(col: number): THREE.Group {
  const g = new THREE.Group();
  const gold = metalMat(col, 0.12);
  const ivory = new THREE.MeshPhysicalMaterial({ color: 0xf5f0e6, roughness: 0.88, metalness: 0 } as THREE.MeshPhysicalMaterialParameters);
  const bulbM = new THREE.MeshStandardMaterial({ color: 0xfffde8, emissive: 0xfffde8, emissiveIntensity: 3.8, roughness: 0.04 });

  // Ceiling canopy
  const canopy = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.17, 0.055, 20), gold);
  canopy.position.y = 0; g.add(canopy);

  // Vertical drop rod
  const dropRod = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.24, 8), gold);
  dropRod.position.y = -0.15; g.add(dropRod);

  // Central body tapered
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.132, 0.28, 20), gold);
  body.position.y = -0.40; g.add(body);

  // Bobeche ring at base
  const bobeche = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.018, 24), gold);
  bobeche.position.y = -0.555; g.add(bobeche);

  // 6 arms
  const N = 6, tilt = 0.13, armLen = 0.40;
  for (let i = 0; i < N; i++) {
    const az = (i / N) * Math.PI * 2;
    const aG = new THREE.Group();
    aG.rotation.y = az;

    // rotation.z = -(PI/2 + tilt) → arm points in +X slightly downward
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, armLen, 8), gold);
    arm.rotation.z = -(Math.PI / 2 + tilt);
    const cx2 = 0.17 + (armLen / 2) * Math.cos(tilt);
    const cy2 = -0.555 - (armLen / 2) * Math.sin(tilt);
    arm.position.set(cx2, cy2, 0);
    aG.add(arm);

    const ex = 0.17 + armLen * Math.cos(tilt);
    const ey = -0.555 - armLen * Math.sin(tilt);

    // Vertical drop hanging from arm end
    const hangDrop = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.10, 8), gold);
    hangDrop.position.set(ex, ey - 0.05, 0);
    aG.add(hangDrop);

    // Cup at bottom of drop
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.014, 0.036, 14), gold);
    cup.position.set(ex, ey - 0.118, 0);
    aG.add(cup);

    // Candle stub
    const candleStub = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.068, 10), ivory);
    candleStub.position.set(ex, ey - 0.066, 0);
    aG.add(candleStub);

    // Glowing bulb at candle top
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.020, 10, 8), bulbM);
    bulb.scale.y = 1.45;
    bulb.position.set(ex, ey - 0.012, 0);
    aG.add(bulb);

    g.add(aG);
  }

  // Central pendant drop below body
  const pStem = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.12, 8), gold);
  pStem.position.y = -0.62; g.add(pStem);
  const pendant = new THREE.Mesh(new THREE.SphereGeometry(0.052, 14, 12), gold);
  pendant.scale.y = 1.65;
  pendant.position.y = -0.73; g.add(pendant);

  return g;
}

function buildFurniture(item: FurnitureItem): THREE.Group {
  const { id, primary: p, secondary: s = 0x888880 } = item;
  switch (id) {
    case 'sofa3':    return sofa(2.5, p);
    case 'sofa2':    return sofa(1.6, p);
    case 'armchair': return armchair(p);
    case 'coffee':   return coffeeTable(p, s);
    case 'sideboard':return sideboard(p, s);
    case 'dining':   return diningTable(p);
    case 'chair':    return diningChair(p);
    case 'bed':      return bed(p, s);
    case 'wardrobe': return wardrobe(p);
    case 'arclamp':  return arcLamp(p, s);
    case 'lamp':     return floorLamp(p, s);
    case 'plant':    return plant(p);
    case 'stool':    return stool(p);
    case 'tv':       return tvUnit(p, s);
    case 'shelf':    return bookshelf(p);
    default: {
      const gr = new THREE.Group();
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), physMat(p, 0.7));
      m.position.y = 0.4; m.castShadow = true; gr.add(m); return gr;
    }
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function RoomEditor({ uploadedImageUrl }: { uploadedImageUrl: string | null }) {
  const canvasRef      = useRef<HTMLCanvasElement>(null);
  const sceneRef       = useRef<THREE.Scene | null>(null);
  const rendererRef    = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef    = useRef<OrbitControls | null>(null);
  const cameraRef      = useRef<THREE.PerspectiveCamera | null>(null);
  const composerRef    = useRef<EffectComposer | null>(null);
  const placedRef      = useRef<PlacedItem[]>([]);
  const rafRef         = useRef<number>(0);
  const wallMatRefs    = useRef<Record<WallId, THREE.MeshStandardMaterial | null>>({ back: null, left: null, right: null, ceiling: null });
  const floorMatRef    = useRef<THREE.MeshStandardMaterial | null>(null);
  const selectedGrpRef = useRef<THREE.Group | null>(null);
  const boxHelperRef   = useRef<THREE.BoxHelper | null>(null);
  const wallMeshToId   = useRef<Map<THREE.Mesh, WallId>>(new Map());

  const [wallColors, setWallColors] = useState<Record<WallId, string>>({
    back: '#f7f4f0', left: '#f7f4f0', right: '#f7f4f0', ceiling: '#fafaf8',
  });
  const [selectedWall,   setSelectedWall]   = useState<WallId>('back');
  const [activeTab,      setActiveTab]      = useState<'furniture' | 'walls' | 'floor'>('furniture');
  const [floorTint,      setFloorTint]      = useState('#6b3c18');
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [placed,         setPlaced]         = useState<PlacedItem[]>([]);
  const [selectedUid,    setSelectedUid]    = useState<string | null>(null);
  const [panelOpen,      setPanelOpen]      = useState(true);

  useEffect(() => {
    const r = wallMatRefs.current;
    if (r.back)    r.back.color.set(wallColors.back);
    if (r.left)    r.left.color.set(wallColors.left);
    if (r.right)   r.right.color.set(wallColors.right);
    if (r.ceiling) r.ceiling.color.set(wallColors.ceiling);
  }, [wallColors]);

  useEffect(() => { if (floorMatRef.current) floorMatRef.current.color.set(floorTint); }, [floorTint]);

  useEffect(() => {
    if (!selectedUid) { selectedGrpRef.current = null; if (boxHelperRef.current) boxHelperRef.current.visible = false; }
  }, [selectedUid]);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const W = canvas.parentElement?.clientWidth || 800, H = canvas.parentElement?.clientHeight || 600;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0d0d12');
    sceneRef.current = scene;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(W, H); renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    rendererRef.current = renderer;

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    // Try to load warm HDRI for better reflections, fall back to RoomEnvironment
    const rgbeLoader = new RGBELoader();
    rgbeLoader.load(
      'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_03_1k.hdr',
      (hdri) => {
        hdri.mapping = THREE.EquirectangularReflectionMapping;
        const envMap = pmrem.fromEquirectangular(hdri).texture;
        scene.environment = envMap;
        hdri.dispose();
        pmrem.dispose();
      },
      undefined,
      () => pmrem.dispose()
    );

    const camera = new THREE.PerspectiveCamera(52, W / H, 0.1, 60);
    camera.position.set(0, 2.4, 6.0); cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.06;
    controls.minDistance = 1.5; controls.maxDistance = 12;
    controls.maxPolarAngle = Math.PI / 2 + 0.1; controls.target.set(0, 0.8, 0);
    controlsRef.current = controls;

    // Post-processing
    const composer = new EffectComposer(renderer);
    composerRef.current = composer;
    composer.addPass(new RenderPass(scene, camera));
    const ssao = new SSAOPass(scene, camera, W, H);
    ssao.kernelRadius = 0.6;
    ssao.minDistance = 0.002;
    ssao.maxDistance = 0.08;
    composer.addPass(ssao);
    const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.18, 0.5, 0.82);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());

    // Lighting
    scene.add(new THREE.AmbientLight(0xfff4e0, 0.50));
    const winLight = new THREE.DirectionalLight(0xfff8ee, 4.5);
    winLight.position.set(7, 5, 1); winLight.target.position.set(0, 0, 0);
    winLight.castShadow = true; winLight.shadow.mapSize.set(2048, 2048);
    winLight.shadow.camera.near = 2; winLight.shadow.camera.far = 22;
    winLight.shadow.camera.left = -6; winLight.shadow.camera.right = 6;
    winLight.shadow.camera.top = 5; winLight.shadow.camera.bottom = -5;
    winLight.shadow.bias = -0.001; winLight.shadow.normalBias = 0.02;
    scene.add(winLight); scene.add(winLight.target);
    const ceilLight = new THREE.PointLight(0xfff4d8, 2.4, 11);
    ceilLight.position.set(0, 2.38, 0.4);
    ceilLight.castShadow = true; ceilLight.shadow.mapSize.set(512, 512); ceilLight.shadow.bias = -0.003;
    scene.add(ceilLight);
    const fill = new THREE.DirectionalLight(0xd8e8ff, 0.35);
    fill.position.set(-3, 3, 5); scene.add(fill);

    const RW = 7, RH = 3, RD = 6.5;
    const plasterN = makePlasterNormal();
    const mkWallMat = (hex: string) => new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(hex), roughness: 0.90, metalness: 0,
      normalMap: plasterN, normalScale: new THREE.Vector2(0.22, 0.22), envMapIntensity: 0.12,
    } as THREE.MeshPhysicalMaterialParameters);

    const backMat  = mkWallMat('#f7f4f0');
    const leftMat  = mkWallMat('#f7f4f0');
    const rightMat = mkWallMat('#f7f4f0');
    const ceilMat  = new THREE.MeshPhysicalMaterial({ color: new THREE.Color('#fafaf8'), roughness: 0.88, envMapIntensity: 0.10 } as THREE.MeshPhysicalMaterialParameters);
    wallMatRefs.current = { back: backMat as unknown as THREE.MeshStandardMaterial, left: leftMat as unknown as THREE.MeshStandardMaterial, right: rightMat as unknown as THREE.MeshStandardMaterial, ceiling: ceilMat as unknown as THREE.MeshStandardMaterial };

    const woodTex  = makeWoodTex();
    const floorMat = new THREE.MeshPhysicalMaterial({ map: woodTex, color: new THREE.Color('#6b3c18'), roughness: 0.38, metalness: 0, envMapIntensity: 0.65 } as THREE.MeshPhysicalMaterialParameters);
    (floorMat as THREE.MeshPhysicalMaterial).clearcoat = 0.35;
    (floorMat as THREE.MeshPhysicalMaterial).clearcoatRoughness = 0.28;
    floorMatRef.current = floorMat as unknown as THREE.MeshStandardMaterial;
    const floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(RW, RD), floorMat);
    floorMesh.rotation.x = -Math.PI / 2; floorMesh.receiveShadow = true; scene.add(floorMesh);

    // Persian rug
    const rugTex = makeRugTex();
    const rugMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(3.4, 2.2),
      new THREE.MeshStandardMaterial({ map: rugTex, roughness: 0.98, metalness: 0 })
    );
    rugMesh.rotation.x = -Math.PI / 2;
    rugMesh.position.set(0.3, 0.003, 0.75);
    rugMesh.receiveShadow = true;
    scene.add(rugMesh);

    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(RW, RD), ceilMat);
    ceil.rotation.x = Math.PI / 2; ceil.position.y = RH; scene.add(ceil);

    // Neoclassical chandelier
    const chand = chandelier(0xc8a028);
    chand.position.set(0, RH - 0.028, 0.4);
    chand.traverse(c => { if (c instanceof THREE.Mesh) { c.castShadow = true; c.receiveShadow = false; } });
    scene.add(chand);

    // Ceiling rosette (concentric plaster rings around chandelier)
    const rosetteM = new THREE.MeshPhysicalMaterial({ color: 0xfafaf8, roughness: 0.52, envMapIntensity: 0.22 } as THREE.MeshPhysicalMaterialParameters);
    [0.30, 0.48, 0.68].forEach((r, i) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.014 - i * 0.003, 8, 36), rosetteM);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(0, RH - 0.001, 0.4);
      scene.add(ring);
    });

    const addWall = (w: number, h: number, mat: THREE.MeshPhysicalMaterial, pos: [number, number, number], ry: number, id: WallId) => {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
      mesh.position.set(...pos); mesh.rotation.y = ry; mesh.receiveShadow = true;
      scene.add(mesh); wallMeshToId.current.set(mesh, id);
    };
    addWall(RW, RH, backMat,  [0, RH / 2, -RD / 2], 0,           'back');
    addWall(RD, RH, leftMat,  [-RW / 2, RH / 2, 0], Math.PI / 2,  'left');
    addWall(RD, RH, rightMat, [RW / 2,  RH / 2, 0], -Math.PI / 2, 'right');

    // Decorative mirror on left wall
    const goldM = metalMat(0xc8a020, 0.14);
    const mirrorFrameOuter = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.75, 1.28), goldM);
    mirrorFrameOuter.rotation.y = Math.PI / 2;
    mirrorFrameOuter.position.set(-RW / 2 + 0.06, 1.85, -0.55);
    scene.add(mirrorFrameOuter);
    const mirrorGlass = new THREE.Mesh(
      new THREE.PlaneGeometry(1.08, 1.56),
      new THREE.MeshPhysicalMaterial({ color: 0xe8f0f8, metalness: 0.98, roughness: 0.02, envMapIntensity: 2.5 } as THREE.MeshPhysicalMaterialParameters)
    );
    mirrorGlass.rotation.y = Math.PI / 2;
    mirrorGlass.position.set(-RW / 2 + 0.085, 1.85, -0.55);
    scene.add(mirrorGlass);
    // Mirror top arc detail
    const arcTop = new THREE.Mesh(new THREE.CylinderGeometry(0.64, 0.64, 0.10, 18, 1, false, 0, Math.PI), goldM);
    arcTop.rotation.z = Math.PI / 2;
    arcTop.position.set(-RW / 2 + 0.06, 1.85 + 0.78 + 0.05, -0.55);
    scene.add(arcTop);

    // Panel moldings on back wall
    const moldM = new THREE.MeshPhysicalMaterial({ color: 0xfaf8f4, roughness: 0.44, envMapIntensity: 0.65 } as THREE.MeshPhysicalMaterialParameters);
    const addPanelFrame = (cx: number, cy: number, pw: number, ph: number) => {
      const z = -RD / 2 + 0.026, th = 0.03, d = 0.016;
      const bar = (bx: number, by: number, bw: number, bh: number) => {
        const b = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, d), moldM);
        b.position.set(bx, by, z); scene.add(b);
      };
      bar(cx, cy + ph / 2 + th / 2, pw + th * 2, th);
      bar(cx, cy - ph / 2 - th / 2, pw + th * 2, th);
      bar(cx - pw / 2 - th / 2, cy, th, ph);
      bar(cx + pw / 2 + th / 2, cy, th, ph);
    };
    addPanelFrame(-2.3, 1.28, 1.90, 1.95);
    addPanelFrame( 0.0, 1.28, 1.90, 1.95);
    addPanelFrame( 2.3, 1.28, 1.90, 1.95);

    // Landscape painting
    const artTex = makeArtTex();
    const artFrameM = new THREE.MeshPhysicalMaterial({ color: 0xf6f2ec, roughness: 0.44, envMapIntensity: 0.5 } as THREE.MeshPhysicalMaterialParameters);
    const artFrame = new THREE.Mesh(new THREE.BoxGeometry(1.96, 1.24, 0.04), artFrameM);
    artFrame.position.set(0, 2.06, -RD / 2 + 0.055); scene.add(artFrame);
    const artMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.76, 1.04),
      new THREE.MeshStandardMaterial({ map: artTex, roughness: 0.88 }));
    artMesh.position.set(0, 2.06, -RD / 2 + 0.08); scene.add(artMesh);

    // Right wall window
    const rWinGlass = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 2.1),
      new THREE.MeshStandardMaterial({ color: 0xc4dcf4, emissive: 0x98c4e0, emissiveIntensity: 2.5, transparent: true, opacity: 0.46, roughness: 0, metalness: 0.02 }));
    rWinGlass.rotation.y = -Math.PI / 2;
    rWinGlass.position.set(RW / 2 - 0.07, 1.72, 0.8); scene.add(rWinGlass);
    const rWinFrameM = new THREE.MeshPhysicalMaterial({ color: 0xf0ece5, roughness: 0.38, metalness: 0.06 } as THREE.MeshPhysicalMaterialParameters);
    const rWinFrame = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.18, 2.88), rWinFrameM);
    rWinFrame.position.set(RW / 2 - 0.04, 1.72, 0.8); scene.add(rWinFrame);
    [0, 1].forEach(i => {
      const b = new THREE.Mesh(i === 0 ? new THREE.BoxGeometry(0.04, 2.10, 0.04) : new THREE.BoxGeometry(0.04, 0.04, 2.80), rWinFrameM);
      b.position.set(RW / 2 - 0.05, 1.72, 0.8); scene.add(b);
    });

    // Curtain rod + wavy curtains
    const rodM = metalMat(0x1e1e1e, 0.16);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 4.5, 10), rodM);
    rod.rotation.x = Math.PI / 2; rod.position.set(RW / 2 - 0.1, RH - 0.16, 0.8); scene.add(rod);
    const curtM = new THREE.MeshPhysicalMaterial({ color: 0xb89870, roughness: 0.94, side: THREE.DoubleSide } as THREE.MeshPhysicalMaterialParameters);
    [[2.3, 1], [-0.75, -1]].forEach(([cz, dir]) => {
      const geo = new THREE.PlaneGeometry(1.4, RH - 0.12, 8, 1);
      const pos = geo.attributes.position;
      for (let vi = 0; vi < pos.count; vi++) {
        const localX = pos.getX(vi);
        pos.setZ(vi, Math.sin(localX * Math.PI * 2.5 / 1.4) * 0.055 * dir);
      }
      geo.computeVertexNormals();
      const c = new THREE.Mesh(geo, curtM);
      c.rotation.y = Math.PI / 2;
      c.position.set(RW / 2 - 0.18, (RH - 0.12) / 2 + 0.06, cz);
      c.castShadow = true; c.receiveShadow = true; scene.add(c);
    });

    // Skirting boards
    const skirtM = new THREE.MeshPhysicalMaterial({ color: 0xf5f2ee, roughness: 0.48, envMapIntensity: 0.40 } as THREE.MeshPhysicalMaterialParameters);
    const skirt = (w: number, p: [number, number, number], ry: number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, 0.025), skirtM);
      m.position.set(...p); m.rotation.y = ry; m.receiveShadow = true; scene.add(m);
    };
    skirt(RW, [0, 0.05, -RD / 2 + 0.013], 0);
    skirt(RD, [-RW / 2 + 0.013, 0.05, 0], Math.PI / 2);
    skirt(RD, [RW / 2 - 0.013, 0.05, 0], Math.PI / 2);

    // Crown molding
    const crownM = new THREE.MeshPhysicalMaterial({ color: 0xfafaf8, roughness: 0.58 } as THREE.MeshPhysicalMaterialParameters);
    const crown = (w: number, p: [number, number, number], ry: number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.058, 0.058), crownM);
      m.position.set(...p); m.rotation.y = ry; scene.add(m);
    };
    crown(RW, [0, RH - 0.03, -RD / 2 + 0.03], 0);
    crown(RD, [-RW / 2 + 0.03, RH - 0.03, 0], Math.PI / 2);
    crown(RD, [RW / 2 - 0.03, RH - 0.03, 0], Math.PI / 2);

    // BoxHelper for selection
    const placeholder = new THREE.Mesh(new THREE.BoxGeometry(0.001, 0.001, 0.001));
    const boxHelper = new THREE.BoxHelper(placeholder, 0x00d4ff);
    boxHelper.visible = false; scene.add(boxHelper); boxHelperRef.current = boxHelper;

    // Pre-loaded neoclassical scene
    const refScene: Array<{ build: () => THREE.Group; id: string; x: number; z: number; ry: number }> = [
      { build: () => sofa(2.5, 0xe0dac8),            id: 'sofa3',     x:  1.3,  z:  1.6,  ry: Math.PI },
      { build: () => armchair(0xc0681c),              id: 'armchair',  x: -0.85, z:  0.38, ry: Math.PI * 0.58 },
      { build: () => armchair(0xc0681c),              id: 'armchair',  x:  0.5,  z:  0.22, ry: Math.PI * 0.82 },
      { build: () => coffeeTable(0xf0ebe0, 0xd4c080), id: 'coffee',    x:  0.4,  z:  1.14, ry: 0 },
      { build: () => sideboard(0xc8a870, 0xc0a040),   id: 'sideboard', x: -3.05, z: -1.2,  ry: Math.PI / 2 },
      { build: () => arcLamp(0xb8a050, 0xf0ece6),     id: 'arclamp',   x:  2.9,  z:  0.5,  ry: -Math.PI / 4 },
      { build: () => plant(0x2e5a28),                 id: 'plant',     x: -2.6,  z:  1.4,  ry: 0 },
      { build: () => stool(0x151515),                 id: 'stool',     x: -0.25, z:  2.35, ry: 0 },
      { build: () => stool(0x151515),                 id: 'stool',     x:  0.6,  z:  2.55, ry: 0.8 },
    ];
    const initPlaced: PlacedItem[] = [];
    refScene.forEach(({ build, id, x, z, ry }, i) => {
      const item = CATALOG.find(f => f.id === id)!;
      const group = build();
      group.traverse(c => { if (c instanceof THREE.Mesh) { c.castShadow = true; c.receiveShadow = true; } });
      group.position.set(x, 0, z); group.rotation.y = ry;
      scene.add(group);
      initPlaced.push({ uid: `${id}-init-${i}`, item, group });
    });
    placedRef.current = initPlaced; setPlaced([...initPlaced]);

    // Static decorative objects (not draggable)
    // Vases on sideboard top — sideboard at (-3.05,0,-1.2) ry=PI/2
    // After rotation: sideboard length along world Z, handles face toward x=-2.84
    const v1 = vase(0xc8a87a, 0.44);
    v1.traverse(c => { if (c instanceof THREE.Mesh) { c.castShadow = true; c.receiveShadow = true; } });
    v1.position.set(-2.86, 0.86, -1.72); scene.add(v1);

    const v2 = vase(0x4a6898, 0.30);
    v2.traverse(c => { if (c instanceof THREE.Mesh) { c.castShadow = true; c.receiveShadow = true; } });
    v2.position.set(-2.86, 0.86, -0.74); scene.add(v2);

    const bs = bookStack();
    bs.traverse(c => { if (c instanceof THREE.Mesh) { c.castShadow = true; c.receiveShadow = true; } });
    bs.position.set(-2.90, 0.86, -1.22);
    bs.rotation.y = 0.3;
    scene.add(bs);

    // Throw pillows on sofa (sofa at x=1.3,z=1.6,ry=PI → back cushions at world z≈1.92)
    const pilM1 = fabricMat(0x8a4418);
    const pilM2 = fabricMat(0x2c4462);
    const pG1 = new RoundedBoxGeometry(0.30, 0.22, 0.24, 3, 0.055);
    const pG2 = new RoundedBoxGeometry(0.26, 0.20, 0.22, 3, 0.048);
    const pil1 = new THREE.Mesh(pG1, pilM1);
    pil1.position.set(0.78, 0.52, 1.76); pil1.rotation.y = Math.PI + 0.18; pil1.castShadow = true; scene.add(pil1);
    const pil2 = new THREE.Mesh(pG2, pilM2);
    pil2.position.set(1.88, 0.52, 1.78); pil2.rotation.y = Math.PI - 0.16; pil2.castShadow = true; scene.add(pil2);
    // Third small square pillow in center, slightly tilted
    const pG3 = new RoundedBoxGeometry(0.24, 0.20, 0.22, 3, 0.048);
    const pil3 = new THREE.Mesh(pG3, fabricMat(0xc8a868));
    pil3.position.set(1.33, 0.52, 1.77); pil3.rotation.y = Math.PI + 0.08; pil3.rotation.z = 0.06; pil3.castShadow = true; scene.add(pil3);

    // Decorative candle on coffee table (table at x=0.4,z=1.14,top y=0.44)
    const candleWax = new THREE.Mesh(
      new THREE.CylinderGeometry(0.028, 0.028, 0.11, 12),
      new THREE.MeshPhysicalMaterial({ color: 0xf2e6cc, roughness: 0.92, metalness: 0 } as THREE.MeshPhysicalMaterialParameters)
    );
    candleWax.position.set(0.42, 0.495, 1.44); candleWax.castShadow = true; scene.add(candleWax);
    const candleFlame = new THREE.Mesh(
      new THREE.SphereGeometry(0.011, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0xffcc44, emissive: 0xffaa00, emissiveIntensity: 5.0, roughness: 0.02 })
    );
    candleFlame.scale.y = 1.65;
    candleFlame.position.set(0.42, 0.563, 1.44); scene.add(candleFlame);
    const candleLight = new THREE.PointLight(0xff8822, 0.70, 1.6);
    candleLight.position.set(0.42, 0.58, 1.44); scene.add(candleLight);

    // Pointer events
    const raycaster = new THREE.Raycaster();
    const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    let potDrag: { uid: string; group: THREE.Group } | null = null;
    let isDrag = false, downX = 0, downY = 0;
    const dragOffset = new THREE.Vector3();

    const toNDC = (cx: number, cy: number) => {
      const r = canvas.getBoundingClientRect();
      return new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    };

    const onPD = (e: PointerEvent) => {
      downX = e.clientX; downY = e.clientY; isDrag = false;
      raycaster.setFromCamera(toNDC(e.clientX, e.clientY), camera);
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
            controls.enabled = false; canvas.setPointerCapture(e.pointerId);
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
      raycaster.setFromCamera(toNDC(e.clientX, e.clientY), camera);
      const pt = new THREE.Vector3(); raycaster.ray.intersectPlane(floorPlane, pt);
      potDrag.group.position.x = Math.max(-RW / 2 + 0.5, Math.min(RW / 2 - 0.5, pt.x + dragOffset.x));
      potDrag.group.position.z = Math.max(-RD / 2 + 0.5, Math.min(RD / 2 - 0.5, pt.z + dragOffset.z));
      if (boxHelperRef.current?.visible) boxHelperRef.current.setFromObject(potDrag.group);
    };

    const onPU = (e: PointerEvent) => {
      controls.enabled = true;
      if (potDrag) {
        if (!isDrag) {
          setSelectedUid(potDrag.uid); selectedGrpRef.current = potDrag.group;
          if (boxHelperRef.current) { boxHelperRef.current.setFromObject(potDrag.group); boxHelperRef.current.visible = true; }
        }
        canvas.releasePointerCapture(e.pointerId); potDrag = null; isDrag = false;
      } else if (Math.hypot(e.clientX - downX, e.clientY - downY) < 6) {
        raycaster.setFromCamera(toNDC(e.clientX, e.clientY), camera);
        const wallMeshes = Array.from(wallMeshToId.current.keys());
        const hits = raycaster.intersectObjects(wallMeshes);
        if (hits.length) {
          const wId = wallMeshToId.current.get(hits[0].object as THREE.Mesh);
          if (wId) { setSelectedWall(wId); setActiveTab('walls'); }
        } else {
          setSelectedUid(null); selectedGrpRef.current = null;
          if (boxHelperRef.current) boxHelperRef.current.visible = false;
        }
      }
    };

    canvas.addEventListener('pointerdown', onPD);
    canvas.addEventListener('pointermove', onPM);
    canvas.addEventListener('pointerup', onPU);

    const onResize = () => {
      const w = canvas.parentElement?.clientWidth || 800, h = canvas.parentElement?.clientHeight || 600;
      camera.aspect = w / h; camera.updateProjectionMatrix();
      renderer.setSize(w, h); composer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    const animate = () => { rafRef.current = requestAnimationFrame(animate); controls.update(); composer.render(); };
    animate();

    return () => {
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('pointerdown', onPD);
      canvas.removeEventListener('pointermove', onPM);
      canvas.removeEventListener('pointerup', onPU);
      cancelAnimationFrame(rafRef.current);
      composer.dispose(); renderer.dispose();
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
    if (selectedUid === uid) { setSelectedUid(null); selectedGrpRef.current = null; if (boxHelperRef.current) boxHelperRef.current.visible = false; }
  }

  function rotateSelected(dir: 1 | -1) { if (selectedGrpRef.current) selectedGrpRef.current.rotation.y += dir * Math.PI / 4; }
  function setWallColor(id: WallId, hex: string) { setWallColors(prev => ({ ...prev, [id]: hex })); }

  const filtered = activeCategory === 'Todos' ? CATALOG : CATALOG.filter(f => f.category === activeCategory);

  return (
    <div style={{ display: 'flex', height: '100%', position: 'relative' }}>
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
        <div style={{ position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.52)', borderRadius: 8, padding: '5px 14px', fontSize: '0.72rem', color: '#64748b', pointerEvents: 'none', whiteSpace: 'nowrap' }}>
          Arrastra muebles · Órbita con ratón · Clic en pared para pintarla
        </div>
        <button onClick={() => setPanelOpen(o => !o)} style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#94a3b8', cursor: 'pointer', padding: '6px 12px', fontSize: '0.8rem' }}>
          {panelOpen ? '▶ Ocultar' : '◀ Panel'}
        </button>
        {selectedUid && (
          <div style={{ position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6, background: 'rgba(0,0,0,0.75)', border: '1px solid rgba(0,212,255,0.35)', borderRadius: 10, padding: '6px 10px', backdropFilter: 'blur(6px)' }}>
            <button onClick={() => rotateSelected(-1)} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 6, color: '#94a3b8', cursor: 'pointer', padding: '5px 10px', fontSize: '1rem' }}>↺</button>
            <button onClick={() => rotateSelected(1)} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 6, color: '#94a3b8', cursor: 'pointer', padding: '5px 10px', fontSize: '1rem' }}>↻</button>
            <button onClick={() => removeItem(selectedUid)} style={{ background: '#2d1c1c', border: '1px solid #7f1d1d', borderRadius: 6, color: '#f87171', cursor: 'pointer', padding: '5px 10px', fontSize: '1rem' }}>🗑</button>
            <button onClick={() => { setSelectedUid(null); selectedGrpRef.current = null; if (boxHelperRef.current) boxHelperRef.current.visible = false; }} style={{ background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer', padding: '5px 8px', fontSize: '1rem' }}>✕</button>
          </div>
        )}
      </div>

      {panelOpen && (
        <div style={{ width: 282, background: '#0f172a', borderLeft: '1px solid #1f2937', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #1f2937' }}>
            {(['furniture', 'walls', 'floor'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{ flex: 1, padding: '11px 4px', background: activeTab === tab ? '#1e293b' : 'transparent', border: 'none', color: activeTab === tab ? '#e2e8f0' : '#64748b', cursor: 'pointer', fontSize: '0.72rem', fontWeight: activeTab === tab ? 600 : 400, borderBottom: activeTab === tab ? '2px solid #3b82f6' : '2px solid transparent' }}>
                {tab === 'furniture' ? '🛋️ Muebles' : tab === 'walls' ? '🎨 Paredes' : '🪵 Suelo'}
              </button>
            ))}
          </div>

          {activeTab === 'furniture' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ display: 'flex', gap: 4, padding: '8px 10px', overflowX: 'auto', flexShrink: 0, scrollbarWidth: 'none' }}>
                {CATEGORIES.map(cat => (
                  <button key={cat} onClick={() => setActiveCategory(cat)} style={{ padding: '4px 10px', borderRadius: 16, border: 'none', background: activeCategory === cat ? '#3b82f6' : '#1e293b', color: activeCategory === cat ? '#fff' : '#94a3b8', cursor: 'pointer', fontSize: '0.72rem', whiteSpace: 'nowrap', fontWeight: activeCategory === cat ? 600 : 400 }}>{cat}</button>
                ))}
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '4px 10px' }}>
                {filtered.map(item => (
                  <button key={item.id} onClick={() => addFurniture(item)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0', cursor: 'pointer', marginBottom: 6, textAlign: 'left' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = '#3b82f6')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = '#334155')}>
                    <span style={{ fontSize: '1.4rem' }}>{item.emoji}</span>
                    <div><div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{item.name}</div><div style={{ fontSize: '0.7rem', color: '#475569' }}>{item.category}</div></div>
                    <span style={{ marginLeft: 'auto', color: '#3b82f6', fontSize: '1.1rem' }}>+</span>
                  </button>
                ))}
              </div>
              {placed.length > 0 && (
                <div style={{ borderTop: '1px solid #1f2937', padding: '10px', flexShrink: 0 }}>
                  <p style={{ margin: '0 0 8px', fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>En la habitación ({placed.length})</p>
                  <div style={{ maxHeight: 110, overflowY: 'auto' }}>
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

          {activeTab === 'walls' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 12px' }}>
              <p style={{ color: '#64748b', fontSize: '0.75rem', margin: '0 0 10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Selecciona pared</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 16 }}>
                {(['back', 'left', 'right', 'ceiling'] as WallId[]).map(id => (
                  <button key={id} onClick={() => setSelectedWall(id)} style={{ padding: '8px 6px', borderRadius: 8, border: `2px solid ${selectedWall === id ? '#3b82f6' : '#334155'}`, background: selectedWall === id ? '#1e3a5f' : '#1e293b', color: selectedWall === id ? '#e2e8f0' : '#94a3b8', cursor: 'pointer', fontSize: '0.78rem', fontWeight: selectedWall === id ? 600 : 400, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 14, height: 14, borderRadius: 3, background: wallColors[id], border: '1px solid rgba(255,255,255,0.2)', flexShrink: 0, display: 'inline-block' }} />
                    {WALL_LABELS[id]}
                  </button>
                ))}
              </div>
              <p style={{ color: '#64748b', fontSize: '0.75rem', margin: '0 0 10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Color</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 7, marginBottom: 14 }}>
                {WALL_COLORS.map(c => (
                  <button key={c.hex} onClick={() => setWallColor(selectedWall, c.hex)} style={{ padding: '9px 8px', borderRadius: 8, border: `2px solid ${wallColors[selectedWall] === c.hex ? '#3b82f6' : 'transparent'}`, background: '#1e293b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 20, height: 20, borderRadius: 4, background: c.hex, border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0, display: 'block' }} />
                    <span style={{ fontSize: '0.73rem', color: wallColors[selectedWall] === c.hex ? '#e2e8f0' : '#94a3b8', fontWeight: wallColors[selectedWall] === c.hex ? 600 : 400 }}>{c.name}</span>
                  </button>
                ))}
              </div>
              <p style={{ color: '#64748b', fontSize: '0.75rem', margin: '0 0 8px' }}>Personalizado</p>
              <input type="color" value={wallColors[selectedWall]} onChange={e => setWallColor(selectedWall, e.target.value)} style={{ width: '100%', height: 38, borderRadius: 8, border: '1px solid #334155', background: 'transparent', cursor: 'pointer', padding: 2, marginBottom: 12 }} />
              <button onClick={() => setWallColors({ back: wallColors[selectedWall], left: wallColors[selectedWall], right: wallColors[selectedWall], ceiling: wallColors[selectedWall] })} style={{ width: '100%', padding: '9px', background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#94a3b8', cursor: 'pointer', fontSize: '0.8rem' }}>
                Aplicar a todas las paredes
              </button>
            </div>
          )}

          {activeTab === 'floor' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 12px' }}>
              <p style={{ color: '#64748b', fontSize: '0.75rem', margin: '0 0 12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tono de suelo</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 7 }}>
                {FLOOR_TINTS.map(t => (
                  <button key={t.hex} onClick={() => setFloorTint(t.hex)} style={{ padding: '10px 8px', borderRadius: 8, border: `2px solid ${floorTint === t.hex ? '#3b82f6' : 'transparent'}`, background: '#1e293b', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 44, height: 28, borderRadius: 6, background: t.hex === '#ffffff' ? 'linear-gradient(135deg,#e8d5a0 0%,#c9a97a 50%,#a07840 100%)' : t.hex, border: '1px solid rgba(255,255,255,0.12)', display: 'block' }} />
                    <span style={{ fontSize: '0.72rem', color: floorTint === t.hex ? '#e2e8f0' : '#94a3b8', fontWeight: floorTint === t.hex ? 600 : 400 }}>{t.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

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
