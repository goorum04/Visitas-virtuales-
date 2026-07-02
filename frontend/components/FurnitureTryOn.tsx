'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildSyntheticRoom, addSyntheticLights, ROOM } from './SyntheticRoom';

interface CatalogItem {
  slug: string;
  name: string;
  category: string;
  file?: string; // nombre de archivo dentro de /models/{slug}/; por defecto {slug}_1k.gltf
}

interface PlacedItem {
  uid: string;
  item: CatalogItem;
  object: THREE.Object3D;
  baseScale: number;
}

// Modelos reales CC0 (Poly Haven) + generados por IA, a escala real en metros
const CATALOG: CatalogItem[] = [
  { slug: 'sofa_ia_01',               name: 'Sofá terracota (IA)', category: 'Sala', file: 'sofa_ia_01.glb' },
  { slug: 'Sofa_01',                  name: 'Sofá 2 plazas',       category: 'Sala' },
  { slug: 'modern_arm_chair_01',      name: 'Sillón moderno',      category: 'Sala' },
  { slug: 'mid_century_lounge_chair', name: 'Butaca mid-century',  category: 'Sala' },
  { slug: 'CoffeeTable_01',           name: 'Mesa de centro',      category: 'Sala' },
  { slug: 'side_table_01',            name: 'Mesa auxiliar',       category: 'Sala' },
  { slug: 'round_wooden_table_01',    name: 'Mesa redonda',        category: 'Comedor' },
  { slug: 'dining_chair_02',          name: 'Silla de comedor',    category: 'Comedor' },
  { slug: 'Shelf_01',                 name: 'Estantería',          category: 'Almacenaje' },
  { slug: 'Television_01',            name: 'TV vintage',          category: 'Decor' },
  { slug: 'potted_plant_04',          name: 'Planta de interior',  category: 'Decor' },
];

const CATEGORIES = ['Todos', 'Sala', 'Comedor', 'Almacenaje', 'Decor'];

const WALL_H = 3;
const CAM_H = 1.35;
const FOV = 52;
// Orientación de cada foto (desde el mismo punto): frente, girada a la izquierda, girada a la derecha
const PHOTO_YAWS = [0, 0.62, -0.62];

// Estima la iluminación de la foto: lado de la luz, tinte, color de cielo/suelo y exposición
function analyzePhotoLight(img: HTMLImageElement | HTMLCanvasElement) {
  const W = 32, H = 18;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, W, H);
  const d = ctx.getImageData(0, 0, W, H).data;
  let lLum = 0, rLum = 0, ln = 0, rn = 0, sum = 0;
  const top = [0, 0, 0]; let tn = 0;
  const bot = [0, 0, 0]; let bn = 0;
  const bright = [0, 0, 0]; let bc = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const r = d[i], g = d[i + 1], b = d[i + 2];
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      sum += lum;
      if (x < W * 0.38) { lLum += lum; ln++; } else if (x > W * 0.62) { rLum += lum; rn++; }
      if (y < H * 0.4) { top[0] += r; top[1] += g; top[2] += b; tn++; }
      if (y > H * 0.65) { bot[0] += r; bot[1] += g; bot[2] += b; bn++; }
      if (lum > 210) { bright[0] += r; bright[1] += g; bright[2] += b; bc++; }
    }
  }
  const norm = (acc: number[], n: number) => new THREE.Color(acc[0] / n / 255, acc[1] / n / 255, acc[2] / n / 255);
  const sun = bc > 4 ? norm(bright, bc) : new THREE.Color('#fff2dd');
  // acercar el color del sol al blanco para no sobresaturar
  sun.lerp(new THREE.Color('#ffffff'), 0.35);
  return {
    lightFromLeft: lLum / Math.max(ln, 1) >= rLum / Math.max(rn, 1),
    skyColor: norm(top, tn).lerp(new THREE.Color('#ffffff'), 0.25),
    groundColor: norm(bot, bn),
    sunColor: sun,
    meanLum: sum / (W * H) / 255,
  };
}

// Sombra de contacto: degradado radial bajo cada mueble
let contactTexCache: THREE.Texture | null = null;
function contactShadowTexture(): THREE.Texture {
  if (contactTexCache) return contactTexCache;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 62);
  grad.addColorStop(0, 'rgba(0,0,0,0.5)');
  grad.addColorStop(0.55, 'rgba(0,0,0,0.28)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  contactTexCache = tex;
  return tex;
}

// Proyección multi-foto: cada zona de la habitación usa la foto que mejor la ve,
// con fundido entre fotos y a oscuro donde ninguna llega (sin píxeles estirados)
const projVert = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorld = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;
const projFrag = /* glsl */ `
  uniform sampler2D uMap0; uniform mat4 uVP0; uniform vec3 uFwd0;
  uniform sampler2D uMap1; uniform mat4 uVP1; uniform vec3 uFwd1;
  uniform sampler2D uMap2; uniform mat4 uVP2; uniform vec3 uFwd2;
  uniform int uCount;
  uniform vec3 uBase;
  uniform vec3 uViewDir;
  varying vec3 vWorld;

  // Ponderación por dirección de cámara (view-dependent): mirando hacia donde se
  // tomó una foto, esa foto manda en toda la escena; al girar, funde a la siguiente.
  float wgt(vec4 p, vec3 fwd) {
    if (p.w <= 0.0) return 0.0;
    vec2 uv = p.xy / p.w * 0.5 + 0.5;
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return 0.0;
    vec2 f = min(uv, 1.0 - uv);
    float edge = smoothstep(0.0, 0.03, f.x) * smoothstep(0.0, 0.03, f.y);
    float align = pow(max(dot(uViewDir, fwd), 0.0), 12.0);
    // base pequeña: rellena zonas que la foto dominante no cubre, sin fantasmas visibles
    return edge * (0.015 + align);
  }
  vec3 smp(sampler2D m, vec4 p) {
    vec2 uv = clamp(p.xy / max(p.w, 0.0001) * 0.5 + 0.5, 0.0, 1.0);
    return texture2D(m, uv).rgb;
  }
  void main() {
    vec4 p0 = uVP0 * vec4(vWorld, 1.0);
    float w0 = wgt(p0, uFwd0);
    vec3 acc = smp(uMap0, p0) * w0;
    float W = w0;
    if (uCount > 1) { vec4 p1 = uVP1 * vec4(vWorld, 1.0); float w1 = wgt(p1, uFwd1); acc += smp(uMap1, p1) * w1; W += w1; }
    if (uCount > 2) { vec4 p2 = uVP2 * vec4(vWorld, 1.0); float w2 = wgt(p2, uFwd2); acc += smp(uMap2, p2) * w2; W += w2; }
    float k = smoothstep(0.0, 0.02, W);
    vec3 col = W > 0.0005 ? acc / W : uBase;
    gl_FragColor = vec4(mix(uBase, col, k), 1.0);
    #include <colorspace_fragment>
  }
`;

export default function FurnitureTryOn({ photoUrls }: { photoUrls: string[] | null }) {
  // Sin fotos: salón de demostración construido en 3D real (giro libre, sin deformaciones)
  const synthetic = !photoUrls || photoUrls.length === 0;
  const wrapRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const projMatRef = useRef<THREE.ShaderMaterial | null>(null);
  const photoAspectsRef = useRef<number[]>([16 / 9, 16 / 9, 16 / 9]);
  const roomGroupRef = useRef<THREE.Group | null>(null);
  const placedRef = useRef<PlacedItem[]>([]);
  const selectedRef = useRef<PlacedItem | null>(null);
  const ringRef = useRef<THREE.Mesh | null>(null);
  const animRef = useRef<number>(0);
  const loaderRef = useRef(new GLTFLoader());
  const modelCacheRef = useRef<Map<string, THREE.Group>>(new Map());
  const dirRef = useRef<THREE.DirectionalLight | null>(null);
  const hemiRef = useRef<THREE.HemisphereLight | null>(null);
  const baseLightRef = useRef({ dir: 1.8, hemi: 0.9 });

  const nPhotos = Math.min(photoUrls?.length ?? 0, 3);
  const photosKey = (photoUrls ?? []).join('|');

  const [placed, setPlaced] = useState<PlacedItem[]>([]);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [isNarrow, setIsNarrow] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [tilt, setTilt] = useState(-0.2);   // inclinación de la cámara original (casar horizonte)
  const [roomW, setRoomW] = useState(4.6);  // ancho de la habitación (m)
  const [roomD, setRoomD] = useState(5.4);  // profundidad hasta la pared del fondo (m)
  const [itemScale, setItemScale] = useState(1);
  const [lightMul, setLightMul] = useState(1); // ajuste manual fino de la luz de los muebles

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const apply = () => setIsNarrow(mq.matches);
    apply();
    if (mq.matches) setPanelOpen(false);
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  // Matrices de proyección de cada foto (posición común, orientaciones distintas)
  function updateProjectors(tiltVal: number) {
    const projMat = projMatRef.current;
    if (!projMat) return;
    for (let i = 0; i < 3; i++) {
      const cam = new THREE.PerspectiveCamera(FOV, photoAspectsRef.current[i] || 16 / 9, 0.1, 60);
      cam.position.set(0, CAM_H, 0);
      cam.rotation.order = 'YXZ';
      cam.rotation.y = PHOTO_YAWS[i];
      cam.rotation.x = tiltVal;
      cam.updateMatrixWorld(true);
      cam.updateProjectionMatrix();
      (projMat.uniforms[`uVP${i}`].value as THREE.Matrix4)
        .multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
      const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
      fwd.y = 0;
      fwd.normalize();
      (projMat.uniforms[`uFwd${i}`].value as THREE.Vector3).copy(fwd);
    }
  }

  // Escena
  useEffect(() => {
    const canvas = canvasRef.current;
    const frame = frameRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !frame || !wrap) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#05070d');
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(FOV, 16 / 9, 0.05, 60);
    camera.position.set(0, CAM_H, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.VSMShadowMap; // sombras suaves de área, no bordes duros
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.5;

    if (synthetic) {
      scene.background = new THREE.Color('#0a0c12');
      buildSyntheticRoom(scene, new THREE.TextureLoader());
      const lights = addSyntheticLights(scene);
      dirRef.current = lights.dir;
      hemiRef.current = lights.hemi;
      baseLightRef.current = { dir: lights.dir.intensity, hemi: lights.hemi.intensity };
      scene.environmentIntensity = 0.45;
      renderer.toneMappingExposure = 1.05;
    }

    const dummyTex = new THREE.Texture();
    const projMat = new THREE.ShaderMaterial({
      uniforms: {
        uMap0: { value: dummyTex }, uVP0: { value: new THREE.Matrix4() }, uFwd0: { value: new THREE.Vector3(0, 0, -1) },
        uMap1: { value: dummyTex }, uVP1: { value: new THREE.Matrix4() }, uFwd1: { value: new THREE.Vector3(0, 0, -1) },
        uMap2: { value: dummyTex }, uVP2: { value: new THREE.Matrix4() }, uFwd2: { value: new THREE.Vector3(0, 0, -1) },
        uCount: { value: nPhotos },
        uBase: { value: new THREE.Color('#141210') },
        uViewDir: { value: new THREE.Vector3(0, 0, -1) },
      },
      vertexShader: projVert,
      fragmentShader: projFrag,
      side: THREE.DoubleSide,
    });
    projMat.toneMapped = false;
    projMatRef.current = projMat;

    if (!synthetic) {
    // Luz para los muebles: se calibra automáticamente con la foto frontal en cuanto carga
    const hemi = new THREE.HemisphereLight('#dfe8f5', '#7a6a58', 0.9);
    scene.add(hemi);
    hemiRef.current = hemi;
    const dir = new THREE.DirectionalLight('#fff2dd', 1.8);
    dir.position.set(-3, 4, 2.5);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    dir.shadow.bias = -0.0002;
    dir.shadow.radius = 7;
    dir.shadow.blurSamples = 16;
    scene.add(dir);
    dirRef.current = dir;

    const texLoader = new THREE.TextureLoader();
    (photoUrls ?? []).slice(0, 3).forEach((url, i) => {
      texLoader.load(url, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        projMat.uniforms[`uMap${i}`].value = tex;
        const img = tex.image as HTMLImageElement;
        if (img?.width) photoAspectsRef.current[i] = img.width / img.height;
        updateProjectors(-0.2);
        if (i === 0) {
          fit();
          // Reflejos ambientales desde la propia foto: los muebles se tiñen del ambiente real
          const envTex = tex.clone();
          envTex.mapping = THREE.EquirectangularReflectionMapping;
          scene.environment = pmrem.fromEquirectangular(envTex).texture;
          scene.environmentIntensity = 0.75;
          envTex.dispose();
          // Dirección, color y exposición de la luz estimadas de la foto
          const a = analyzePhotoLight(img);
          if (a) {
            // zonas fuera de cobertura: penumbra del tono medio de la foto, no negro
            const baseC = a.groundColor.clone().lerp(a.skyColor, 0.4).multiplyScalar(0.35);
            (projMat.uniforms.uBase.value as THREE.Color).copy(baseC);
            dir.position.set(a.lightFromLeft ? -3 : 3, 4, 2.5);
            dir.color.copy(a.sunColor);
            hemi.color.copy(a.skyColor);
            hemi.groundColor.copy(a.groundColor);
            const dirI = 1.3 + a.meanLum * 1.1;
            const hemiI = 0.55 + a.meanLum * 0.7;
            baseLightRef.current = { dir: dirI, hemi: hemiI };
            dir.intensity = dirI;
            hemi.intensity = hemiI;
            renderer.toneMappingExposure = Math.min(1.15, Math.max(0.85, 0.8 + a.meanLum * 0.45));
          }
        }
      });
    });
    } // fin modo fotos

    // Sombra de contacto sobre el suelo fotográfico
    const shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.ShadowMaterial({ opacity: 0.3 })
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = 0.008;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

    // Anillo de selección
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.5, 0.56, 48),
      new THREE.MeshBasicMaterial({ color: '#3b82f6', transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.012;
    ring.visible = false;
    scene.add(ring);
    ringRef.current = ring;

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.enablePan = false;
    if (synthetic) {
      // habitación 3D real: giro amplio y libre, nada se deforma
      // (distancia acotada para que la cámara no atraviese paredes ni cortinas)
      controls.minDistance = 1.3;
      controls.maxDistance = 2.6;
      controls.minAzimuthAngle = -1.05;
      controls.maxAzimuthAngle = 1.05;
      controls.minPolarAngle = Math.PI / 2 - 0.55;
      controls.maxPolarAngle = Math.PI / 2 + 0.22;
      controls.target.set(-0.15, 1.0, -0.8);
      // en pantallas verticales la cámara arranca más cerca (el FOV ancho ya da contexto)
      if (wrap.clientWidth < wrap.clientHeight) camera.position.set(0.38, 1.37, 1.72);
      else camera.position.set(0.55, 1.48, 2.45);
    } else {
      // Órbita: con más fotos, más ángulo útil sin zonas oscuras
      const maxAz = nPhotos >= 3 ? 0.95 : nPhotos === 2 ? 0.7 : 0.32;
      controls.minDistance = 1.2;
      controls.maxDistance = 4.5;
      controls.minAzimuthAngle = -maxAz;
      controls.maxAzimuthAngle = maxAz;
      controls.minPolarAngle = Math.PI / 2 - 0.45;
      controls.maxPolarAngle = Math.PI / 2 + 0.25;
      // el objetivo debe estar exactamente en la línea de mira del proyector frontal:
      // así la vista inicial coincide píxel a píxel con la foto (sin dobles imágenes)
      controls.target.set(0, CAM_H + 2.4 * Math.tan(-0.2), -2.4);
      camera.position.set(0, CAM_H, 0);
    }
    controls.update();
    controlsRef.current = controls;

    const fit = () => {
      const aw = wrap.clientWidth, ah = wrap.clientHeight;
      if (!aw || !ah) return;
      let w = aw, h = ah;
      if (!synthetic) {
        // en modo fotos el lienzo respeta el aspecto de la foto frontal
        const pa = photoAspectsRef.current[0];
        w = aw; h = aw / pa;
        if (h > ah) { h = ah; w = ah * pa; }
      }
      frame.style.width = `${w}px`;
      frame.style.height = `${h}px`;
      camera.aspect = w / h;
      if (synthetic) {
        // en pantallas verticales, mantener el ángulo HORIZONTAL (si no, todo sale enorme)
        const a = w / h;
        camera.fov = a >= 1.15
          ? FOV
          : Math.min(88, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(60) / 2) / a)));
      }
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);
    window.addEventListener('resize', fit);
    fit();

    // Arrastre de muebles por raycast; si no tocas un mueble, la órbita gira la habitación
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    let dragging: PlacedItem | null = null;
    let downPos: { x: number; y: number } | null = null;

    const toNdc = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    };

    const pickPlaced = (): PlacedItem | null => {
      ray.setFromCamera(ndc, camera);
      const objs = placedRef.current.map((p) => p.object);
      const hits = ray.intersectObjects(objs, true);
      if (!hits.length) return null;
      let node: THREE.Object3D | null = hits[0].object;
      while (node) {
        const found = placedRef.current.find((p) => p.object === node);
        if (found) return found;
        node = node.parent;
      }
      return null;
    };

    const onDown = (e: PointerEvent) => {
      toNdc(e);
      downPos = { x: e.clientX, y: e.clientY };
      const hit = pickPlaced();
      if (hit) {
        dragging = hit;
        controls.enabled = false;
        selectedRef.current = hit;
        setSelectedUid(hit.uid);
        setItemScale(hit.object.scale.x / hit.baseScale);
        canvas.setPointerCapture(e.pointerId);
      }
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      toNdc(e);
      ray.setFromCamera(ndc, camera);
      const pt = new THREE.Vector3();
      if (ray.ray.intersectPlane(plane, pt)) {
        dragging.object.position.set(pt.x, 0, pt.z);
      }
    };
    const onUp = (e: PointerEvent) => {
      if (dragging) {
        canvas.releasePointerCapture(e.pointerId);
        dragging = null;
        controls.enabled = true;
      } else if (downPos && Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y) < 6) {
        // click sin arrastre sobre el fondo → deseleccionar
        selectedRef.current = null;
        setSelectedUid(null);
      }
      downPos = null;
    };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);

    const viewDir = new THREE.Vector3();
    const animate = () => {
      animRef.current = requestAnimationFrame(animate);
      controls.update();
      camera.getWorldDirection(viewDir);
      viewDir.y = 0;
      viewDir.normalize();
      (projMat.uniforms.uViewDir.value as THREE.Vector3).copy(viewDir);
      const sel = selectedRef.current;
      const ringM = ringRef.current;
      if (ringM) {
        if (sel) {
          const b = new THREE.Box3().setFromObject(sel.object);
          const size = b.getSize(new THREE.Vector3());
          const r = Math.max(size.x, size.z) * 0.62;
          ringM.scale.setScalar(Math.max(r, 0.25) / 0.53);
          ringM.position.set(sel.object.position.x, 0.012, sel.object.position.z);
          ringM.visible = true;
        } else {
          ringM.visible = false;
        }
      }
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.removeEventListener('resize', fit);
      ro.disconnect();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      cancelAnimationFrame(animRef.current);
      controls.dispose();
      pmrem.dispose();
      renderer.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photosKey]);

  // Geometría de la habitación en modo fotos (se reconstruye al ajustar ancho/profundidad)
  useEffect(() => {
    if (synthetic) return;
    const scene = sceneRef.current;
    const projMat = projMatRef.current;
    if (!scene || !projMat) return;

    if (roomGroupRef.current) {
      scene.remove(roomGroupRef.current);
      roomGroupRef.current.traverse((n) => { if (n instanceof THREE.Mesh) n.geometry.dispose(); });
    }

    const g = new THREE.Group();
    const zFront = 1.2;           // la habitación llega un poco por detrás de la cámara
    const depth = roomD + zFront; // largo total del suelo
    const zMid = zFront - depth / 2;

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(roomW, depth), projMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, zMid);
    g.add(floor);

    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(roomW, depth), projMat);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(0, WALL_H, zMid);
    g.add(ceil);

    const back = new THREE.Mesh(new THREE.PlaneGeometry(roomW, WALL_H), projMat);
    back.position.set(0, WALL_H / 2, -roomD);
    g.add(back);

    const left = new THREE.Mesh(new THREE.PlaneGeometry(depth, WALL_H), projMat);
    left.rotation.y = Math.PI / 2;
    left.position.set(-roomW / 2, WALL_H / 2, zMid);
    g.add(left);

    const right = new THREE.Mesh(new THREE.PlaneGeometry(depth, WALL_H), projMat);
    right.rotation.y = -Math.PI / 2;
    right.position.set(roomW / 2, WALL_H / 2, zMid);
    g.add(right);

    scene.add(g);
    roomGroupRef.current = g;

    // La órbita gira alrededor del centro de la habitación, sobre la línea de mira del proyector
    const controls = controlsRef.current;
    if (controls) {
      const tz = roomD * 0.45;
      controls.target.set(0, CAM_H + tz * Math.tan(tilt), -tz);
      controls.update();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomW, roomD, photosKey]);

  // Recalcular proyectores al cambiar la inclinación (y realinear la vista)
  useEffect(() => {
    if (synthetic) return;
    updateProjectors(tilt);
    resetView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tilt, photosKey]);

  function resetView() {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;
    if (synthetic) {
      const wrap = wrapRef.current;
      if (wrap && wrap.clientWidth < wrap.clientHeight) camera.position.set(0.38, 1.37, 1.72);
      else camera.position.set(0.55, 1.48, 2.45);
      controls.target.set(-0.15, 1.0, -0.8);
    } else {
      camera.position.set(0, CAM_H, 0);
      const tz = roomD * 0.45;
      controls.target.set(0, CAM_H + tz * Math.tan(tilt), -tz);
    }
    controls.update();
  }

  // Escala del elemento seleccionado
  useEffect(() => {
    const sel = placedRef.current.find((p) => p.uid === selectedUid);
    if (sel) sel.object.scale.setScalar(sel.baseScale * itemScale);
  }, [itemScale, selectedUid]);

  // Ajuste manual fino sobre la luz calibrada automáticamente
  useEffect(() => {
    if (dirRef.current) dirRef.current.intensity = baseLightRef.current.dir * lightMul;
    if (hemiRef.current) hemiRef.current.intensity = baseLightRef.current.hemi * lightMul;
  }, [lightMul]);

  async function loadModel(item: CatalogItem): Promise<THREE.Group> {
    const cached = modelCacheRef.current.get(item.slug);
    if (cached) return cached.clone(true);
    const gltf = await loaderRef.current.loadAsync(`/models/${item.slug}/${item.file ?? `${item.slug}_1k.gltf`}`);
    const root = gltf.scene;
    root.traverse((n) => {
      if (n instanceof THREE.Mesh) {
        n.castShadow = true;
        n.receiveShadow = true;
        const m = n.material as THREE.MeshStandardMaterial;
        if (m?.isMaterial && 'envMapIntensity' in m) m.envMapIntensity = 1.0;
      }
    });
    // Sombra de contacto pegada a la base: ancla el mueble al suelo de la foto
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const blob = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: contactShadowTexture(), transparent: true, opacity: 0.55, depthWrite: false })
    );
    blob.rotation.x = -Math.PI / 2;
    blob.scale.set(size.x * 1.18, size.z * 1.18, 1);
    blob.position.set(center.x, box.min.y + 0.004, center.z);
    blob.renderOrder = 1;
    root.add(blob);
    modelCacheRef.current.set(item.slug, root);
    return root.clone(true);
  }

  async function addItem(item: CatalogItem) {
    if (loadingSlug) return;
    const scene = sceneRef.current;
    if (!scene) return;
    setLoadingSlug(item.slug);
    try {
      const obj = await loadModel(item);
      // Apoya el modelo en el suelo y repártelo en huecos distintos para que no se solapen
      const box = new THREE.Box3().setFromObject(obj);
      const n = placedRef.current.length;
      const maxX = (synthetic ? ROOM.W / 2 : roomW / 2) - 0.6;
      const slotX = [0, 1.5, -1.5, 2.3, -2.3, 0.8, -0.8].map((x) => Math.max(-maxX, Math.min(maxX, x)));
      obj.position.y = -box.min.y;
      obj.position.x = slotX[n % slotX.length];
      obj.position.z = synthetic ? -1.1 : -Math.min(roomD * 0.62, roomD - 0.8);
      obj.rotation.y = (Math.random() - 0.5) * 0.3;
      scene.add(obj);
      const entry: PlacedItem = { uid: `${item.slug}-${Date.now()}`, item, object: obj, baseScale: obj.scale.x };
      placedRef.current = [...placedRef.current, entry];
      setPlaced([...placedRef.current]);
      selectedRef.current = entry;
      setSelectedUid(entry.uid);
      setItemScale(1);
      if (isNarrow) setPanelOpen(false);
    } catch (e) {
      console.error('Error cargando modelo', item.slug, e);
    } finally {
      setLoadingSlug(null);
    }
  }

  function rotateSelected(delta: number) {
    const sel = placedRef.current.find((p) => p.uid === selectedUid);
    if (sel) sel.object.rotation.y += delta;
  }

  function removeItem(uid: string) {
    const scene = sceneRef.current;
    if (!scene) return;
    const found = placedRef.current.find((p) => p.uid === uid);
    if (found) scene.remove(found.object);
    placedRef.current = placedRef.current.filter((p) => p.uid !== uid);
    setPlaced([...placedRef.current]);
    if (selectedUid === uid) {
      selectedRef.current = null;
      setSelectedUid(null);
    }
  }

  const filtered = activeCategory === 'Todos' ? CATALOG : CATALOG.filter((c) => c.category === activeCategory);
  const selected = placed.find((p) => p.uid === selectedUid) || null;

  const panelStyle: React.CSSProperties = isNarrow
    ? { position: 'absolute', left: 0, right: 0, bottom: 0, height: '58%', background: '#0f172af5', borderTop: '1px solid #1f2937', borderRadius: '16px 16px 0 0', display: 'flex', flexDirection: 'column', overflow: 'hidden', zIndex: 10, boxShadow: '0 -10px 30px rgba(0,0,0,.5)' }
    : { width: 300, background: '#0f172a', borderLeft: '1px solid #1f2937', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 };

  const sliderRow: React.CSSProperties = { color: '#94a3b8', fontSize: '0.7rem', display: 'flex', flexDirection: 'column', gap: 3 };

  return (
    <div style={{ display: 'flex', height: '100%', position: 'relative' }}>
      {/* Visor: la habitación 3D reconstruida desde las fotos */}
      <div ref={wrapRef} style={{ flex: 1, position: 'relative', overflow: 'hidden', minWidth: 0, background: '#05070d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div ref={frameRef} style={{ position: 'relative' }}>
          <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%', touchAction: 'none', cursor: 'grab' }} />
          {/* grano sutil que unifica foto y render */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.05, mixBlendMode: 'overlay', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)'/%3E%3C/svg%3E")` }} />
        </div>

        {!isNarrow && (
          <div style={{ position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.55)', borderRadius: 8, padding: '5px 14px', fontSize: '0.72rem', color: '#cbd5e1', pointerEvents: 'none', whiteSpace: 'nowrap' }}>
            Arrastra el fondo para girar la habitación · Arrastra un mueble para moverlo · Rueda para acercarte
          </div>
        )}

        <button
          onClick={() => setPanelOpen((o) => !o)}
          style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(0,0,0,0.65)', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0', cursor: 'pointer', padding: '7px 13px', fontSize: '0.8rem', zIndex: 11 }}>
          {panelOpen ? (isNarrow ? '✕ Cerrar' : '▶ Ocultar catálogo') : '🛋️ Catálogo'}
        </button>

        {/* Controles del mueble seleccionado */}
        {selected && (
          <div style={{ position: 'absolute', top: 14, left: 14, background: 'rgba(0,0,0,0.72)', border: '1px solid #334155', borderRadius: 10, padding: '10px 12px', zIndex: 11, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 230 }}>
            <span style={{ color: '#e2e8f0', fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selected.item.name}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => rotateSelected(Math.PI / 12)} style={{ flex: 1, background: '#1e293b', border: '1px solid #334155', borderRadius: 6, color: '#e2e8f0', cursor: 'pointer', padding: '6px 0', fontSize: '0.85rem' }}>⟲ Girar</button>
              <button onClick={() => rotateSelected(-Math.PI / 12)} style={{ flex: 1, background: '#1e293b', border: '1px solid #334155', borderRadius: 6, color: '#e2e8f0', cursor: 'pointer', padding: '6px 0', fontSize: '0.85rem' }}>Girar ⟳</button>
              <button onClick={() => removeItem(selected.uid)} style={{ background: '#7f1d1d', border: '1px solid #b91c1c', borderRadius: 6, color: '#fecaca', cursor: 'pointer', padding: '6px 10px', fontSize: '0.85rem' }}>🗑</button>
            </div>
            <label style={sliderRow}>
              Tamaño
              <input type="range" min={0.6} max={1.6} step={0.02} value={itemScale} onChange={(e) => setItemScale(parseFloat(e.target.value))} />
            </label>
          </div>
        )}

        {/* Ajuste de la habitación */}
        <div style={{ position: 'absolute', bottom: isNarrow ? 10 : 44, right: 14, background: 'rgba(0,0,0,0.7)', border: '1px solid #334155', borderRadius: 10, padding: '8px 12px', zIndex: 11, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button onClick={() => setAdjustOpen((o) => !o)}
            style={{ background: 'none', border: 'none', color: '#e2e8f0', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, padding: 0, textAlign: 'left' }}>
            📐 Ajustar habitación {adjustOpen ? '▾' : '▸'}
          </button>
          {adjustOpen && (
            <>
              {!synthetic && (
                <>
                  <label style={sliderRow}>
                    Ancho ({roomW.toFixed(1)} m)
                    <input type="range" min={2.6} max={8} step={0.1} value={roomW} onChange={(e) => setRoomW(parseFloat(e.target.value))} style={{ width: 130 }} />
                  </label>
                  <label style={sliderRow}>
                    Fondo ({roomD.toFixed(1)} m)
                    <input type="range" min={2.6} max={9} step={0.1} value={roomD} onChange={(e) => setRoomD(parseFloat(e.target.value))} style={{ width: 130 }} />
                  </label>
                  <label style={sliderRow}>
                    Horizonte
                    <input type="range" min={-0.5} max={-0.02} step={0.01} value={tilt} onChange={(e) => setTilt(parseFloat(e.target.value))} style={{ width: 130 }} />
                  </label>
                </>
              )}
              <label style={sliderRow}>
                Luz de los muebles
                <input type="range" min={0.5} max={1.7} step={0.05} value={lightMul} onChange={(e) => setLightMul(parseFloat(e.target.value))} style={{ width: 130 }} />
              </label>
              <button onClick={resetView}
                style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 6, color: '#e2e8f0', cursor: 'pointer', padding: '5px 0', fontSize: '0.72rem' }}>
                ↺ Vista original
              </button>
            </>
          )}
        </div>
      </div>

      {/* Catálogo (hoja inferior en pantallas estrechas) */}
      {panelOpen && (
        <div style={panelStyle}>
          <div style={{ padding: '12px 14px 8px', borderBottom: '1px solid #1f2937', flexShrink: 0 }}>
            <p style={{ margin: 0, color: '#e2e8f0', fontWeight: 700, fontSize: '0.9rem' }}>🛋️ Catálogo real</p>
            <p style={{ margin: '3px 0 0', color: '#64748b', fontSize: '0.72rem' }}>Modelos 3D fotorrealistas a escala real (1 unidad = 1 m)</p>
          </div>

          <div style={{ display: 'flex', gap: 4, padding: '8px 10px', overflowX: 'auto', flexShrink: 0, scrollbarWidth: 'none' }}>
            {CATEGORIES.map((cat) => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                style={{ padding: '4px 10px', borderRadius: 16, border: 'none', background: activeCategory === cat ? '#3b82f6' : '#1e293b', color: activeCategory === cat ? '#fff' : '#94a3b8', cursor: 'pointer', fontSize: '0.72rem', whiteSpace: 'nowrap', fontWeight: activeCategory === cat ? 600 : 400 }}>
                {cat}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 10px', minHeight: 110 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {filtered.map((item) => (
                <button key={item.slug} onClick={() => addItem(item)} disabled={loadingSlug !== null}
                  style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, cursor: loadingSlug ? 'wait' : 'pointer', padding: 0, overflow: 'hidden', textAlign: 'left', opacity: loadingSlug && loadingSlug !== item.slug ? 0.5 : 1 }}>
                  <div style={{ position: 'relative', aspectRatio: '1', background: '#141c2e' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/models/${item.slug}/thumb.png`} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    {loadingSlug === item.slug && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e2e8f0', fontSize: '0.7rem' }}>
                        Cargando…
                      </div>
                    )}
                  </div>
                  <div style={{ padding: '7px 9px' }}>
                    <div style={{ fontSize: '0.76rem', fontWeight: 600, color: '#e2e8f0' }}>{item.name}</div>
                    <div style={{ fontSize: '0.66rem', color: '#475569' }}>{item.category}{item.file ? '' : ' · CC0'}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {placed.length > 0 && (
            <div style={{ borderTop: '1px solid #1f2937', padding: '10px', flexShrink: 0 }}>
              <p style={{ margin: '0 0 8px', fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>En tu salón ({placed.length})</p>
              <div style={{ maxHeight: isNarrow ? 70 : 110, overflowY: 'auto' }}>
                {placed.map((p) => (
                  <div key={p.uid} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 8px', borderRadius: 6, background: selectedUid === p.uid ? '#1e3a5f' : 'transparent', marginBottom: 2, cursor: 'pointer' }}
                    onClick={() => { const f = placedRef.current.find((x) => x.uid === p.uid) || null; selectedRef.current = f; setSelectedUid(p.uid); if (f) setItemScale(f.object.scale.x / f.baseScale); }}>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{p.item.name}</span>
                    <button onClick={(e) => { e.stopPropagation(); removeItem(p.uid); }}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1rem', padding: '0 4px', lineHeight: 1 }}>
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ padding: '14px 12px', borderTop: '1px solid #1f2937', flexShrink: 0 }}>
            <a href="/login" style={{ display: 'block', padding: '11px', background: '#3b82f6', color: '#fff', borderRadius: 8, textAlign: 'center', fontWeight: 600, fontSize: '0.9rem', textDecoration: 'none', marginBottom: 8 }}>
              Recrear mi salón en 3D real →
            </a>
            <p style={{ color: '#475569', fontSize: '0.72rem', textAlign: 'center', margin: 0 }}>
              La versión completa reconstruye tu habitación con volumen real
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
