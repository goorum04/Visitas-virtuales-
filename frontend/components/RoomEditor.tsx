'use client';


import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';

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
  const S = 1024, cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const cx = cv.getContext('2d')!; cx.fillStyle = '#8080ff'; cx.fillRect(0, 0, S, S);
  const id = cx.getImageData(0, 0, S, S);
  for (let i = 0; i < id.data.length; i += 4) {
    // Multi-frequency noise for realistic stucco texture
    const x = (i / 4) % S, y = Math.floor(i / 4 / S);
    const n1 = (Math.sin(x * 0.18) + Math.sin(y * 0.22)) * 3.5;
    const n2 = (Math.random() - 0.5) * 18;
    id.data[i]     = 128 + n1 + n2 * 0.6;
    id.data[i + 1] = 128 + n1 * 0.8 + n2 * 0.6;
    id.data[i + 2] = 255; id.data[i + 3] = 255;
  }
  cx.putImageData(id, 0, 0);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 6); return t;
}

function makeFabricNormal(): THREE.CanvasTexture {
  const S = 512, cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const cx = cv.getContext('2d')!; cx.fillStyle = '#8080ff'; cx.fillRect(0, 0, S, S);
  const id = cx.getImageData(0, 0, S, S);
  for (let i = 0; i < id.data.length; i += 4) {
    const x = (i / 4) % S, y = Math.floor(i / 4 / S);
    // Woven fabric pattern: interleaving horizontal and vertical micro-ridges
    const wx = Math.sin(x * 0.628) * 8;  // ~2px period horizontal thread
    const wy = Math.sin(y * 0.628) * 8;  // ~2px period vertical thread
    const mask = (Math.floor(x / 4) + Math.floor(y / 4)) % 2; // weave alternation
    const n = mask === 0 ? wx : wy;
    id.data[i]     = 128 + n * 0.7;
    id.data[i + 1] = 128 + n * 0.7;
    id.data[i + 2] = 255; id.data[i + 3] = 255;
  }
  cx.putImageData(id, 0, 0);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(12, 12); return t;
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

// Shared fabric normal map — created once, referenced by all fabric materials
let _fabricNormal: THREE.CanvasTexture | null = null;
function getFabricNormal(): THREE.CanvasTexture {
  if (!_fabricNormal) _fabricNormal = makeFabricNormal();
  return _fabricNormal;
}

function fabricMat(col: number): THREE.MeshPhysicalMaterial {
  const mat = new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.78, metalness: 0, envMapIntensity: 0.35 });
  mat.sheen = 0.65;
  mat.sheenRoughness = 0.52;
  mat.sheenColor.setHex(col);
  mat.normalMap = getFabricNormal();
  mat.normalScale.set(0.35, 0.35);
  return mat;
}

function woodPhysMat(col: number, rough = 0.55): THREE.MeshPhysicalMaterial {
  const mat = new THREE.MeshPhysicalMaterial({ color: col, roughness: rough, metalness: 0, envMapIntensity: 0.85 });
  mat.clearcoat = 0.42;
  mat.clearcoatRoughness = 0.30;
  return mat;
}

function metalMat(col: number, rough = 0.18): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({ color: col, roughness: rough, metalness: 0.96, envMapIntensity: 2.0 });
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
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.22;
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

    // Post-processing — photorealistic pipeline
    const composer = new EffectComposer(renderer);
    composerRef.current = composer;
    composer.addPass(new RenderPass(scene, camera));
    // Ground-Truth Ambient Occlusion — far more accurate than SSAO
    const gtao = new GTAOPass(scene, camera, W, H);
    gtao.output = GTAOPass.OUTPUT.Default;
    composer.addPass(gtao);
    // Bloom for bulb glow
    const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.15, 0.45, 0.86);
    composer.addPass(bloom);
    // Depth of field — the single biggest "looks like a real photo" effect
    const bokeh = new BokehPass(scene, camera, { focus: 5.8, aperture: 0.000035, maxblur: 0.008 });
    composer.addPass(bokeh);
    composer.addPass(new OutputPass());

    // Photorealistic lighting — low ambient, strong directional, soft area fills
    RectAreaLightUniformsLib.init();
    scene.add(new THREE.AmbientLight(0xfff0d8, 0.14));

    // Main sunlight through right-wall window — sharp shadows, warm
    const winLight = new THREE.SpotLight(0xfff4e0, 18, 22, Math.PI / 6.5, 0.28, 1.2);
    winLight.position.set(6.8, 4.8, 1.0); winLight.target.position.set(-0.5, 0, 0.5);
    winLight.castShadow = true; winLight.shadow.mapSize.set(4096, 4096);
    winLight.shadow.camera.near = 1; winLight.shadow.camera.far = 24;
    winLight.shadow.bias = -0.0008; winLight.shadow.normalBias = 0.018;
    scene.add(winLight); scene.add(winLight.target);

    // Soft cool fill from opposite side (sky bounce)
    const skyFill = new THREE.DirectionalLight(0xc8dcf0, 0.55);
    skyFill.position.set(-5, 4, 3); scene.add(skyFill);

    // Warm RectAreaLight — simulates light bouncing off back wall
    const wallBounce = new THREE.RectAreaLight(0xffe8c8, 1.8, 5.5, 2.2);
    wallBounce.position.set(0, 1.5, -2.8); wallBounce.lookAt(0, 1.5, 2);
    scene.add(wallBounce);

    // Soft warm fill from left — simulates reflected light from floor/furniture
    const leftFill = new THREE.RectAreaLight(0xfff0d8, 0.9, 3.0, 2.5);
    leftFill.position.set(-3.2, 1.2, 0.5); leftFill.lookAt(0, 0.8, 0.5);
    scene.add(leftFill);

    // Chandelier PointLight — warm, medium radius
    const ceilLight = new THREE.PointLight(0xfff0c8, 2.2, 10);
    ceilLight.position.set(0, 2.38, 0.4);
    ceilLight.castShadow = true; ceilLight.shadow.mapSize.set(1024, 1024); ceilLight.shadow.bias = -0.003;
    scene.add(ceilLight);

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
    const floorMat = new THREE.MeshPhysicalMaterial({ map: woodTex, color: new THREE.Color('#6b3c18'), roughness: 0.32, metalness: 0, envMapIntensity: 0.9 } as THREE.MeshPhysicalMaterialParameters);
    (floorMat as THREE.MeshPhysicalMaterial).clearcoat = 0.48;
    (floorMat as THREE.MeshPhysicalMaterial).clearcoatRoughness = 0.22;
    floorMatRef.current = floorMat as unknown as THREE.MeshStandardMaterial;
    const floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(RW, RD), floorMat);
    floorMesh.rotation.x = -Math.PI / 2; floorMesh.receiveShadow = true; scene.add(floorMesh);

    // Async PBR texture upgrade — replaces procedural floor texture with real photo-based PBR
    const PH = 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k';
    const tl = new THREE.TextureLoader();
    const setTex = (url: string, cb: (t: THREE.Texture) => void) =>
      tl.load(url, (t) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; cb(t); }, undefined, () => {/* silent fallback */});
    setTex(`${PH}/wood_floor_parquet_01/wood_floor_parquet_01_diff_2k.jpg`, t => {
      t.repeat.set(3, 2.2); t.colorSpace = THREE.SRGBColorSpace;
      floorMat.map = t; floorMat.color.set(0xffffff); floorMat.needsUpdate = true;
    });
    setTex(`${PH}/wood_floor_parquet_01/wood_floor_parquet_01_nor_gl_2k.jpg`, t => {
      t.repeat.set(3, 2.2);
      floorMat.normalMap = t; floorMat.normalScale.set(1.2, 1.2); floorMat.needsUpdate = true;
    });
    setTex(`${PH}/wood_floor_parquet_01/wood_floor_parquet_01_rough_2k.jpg`, t => {
      t.repeat.set(3, 2.2);
      floorMat.roughnessMap = t; floorMat.roughness = 1.0; floorMat.needsUpdate = true;
    });

    // Async PBR wall upgrade — real plaster texture
    setTex(`${PH}/plaster_wall_01/plaster_wall_01_nor_gl_2k.jpg`, t => {
      t.repeat.set(3, 1.8);
      [backMat, leftMat, rightMat].forEach(m => {
        m.normalMap = t; m.normalScale.set(0.45, 0.45); m.needsUpdate = true;
      });
    });

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