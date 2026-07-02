'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

interface CatalogItem {
  slug: string;
  name: string;
  category: string;
}

interface PlacedItem {
  uid: string;
  item: CatalogItem;
  object: THREE.Object3D;
  baseScale: number;
}

// Modelos reales CC0 (Poly Haven), a escala real en metros, servidos desde /public/models
const CATALOG: CatalogItem[] = [
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

export default function FurnitureTryOn({ photoUrl }: { photoUrl: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const placedRef = useRef<PlacedItem[]>([]);
  const selectedRef = useRef<PlacedItem | null>(null);
  const ringRef = useRef<THREE.Mesh | null>(null);
  const animRef = useRef<number>(0);
  const photoAspectRef = useRef(16 / 9);
  const loaderRef = useRef(new GLTFLoader());
  const modelCacheRef = useRef<Map<string, THREE.Group>>(new Map());

  const [placed, setPlaced] = useState<PlacedItem[]>([]);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [isNarrow, setIsNarrow] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [tilt, setTilt] = useState(-0.22); // inclinación de cámara para casar con la foto
  const [itemScale, setItemScale] = useState(1);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const apply = () => setIsNarrow(mq.matches);
    apply();
    if (mq.matches) setPanelOpen(false);
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  // Escena
  useEffect(() => {
    const canvas = canvasRef.current;
    const frame = frameRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !frame || !wrap) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(52, 16 / 9, 0.05, 60);
    camera.position.set(0, 1.35, 3.6);
    camera.rotation.x = tilt;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    rendererRef.current = renderer;

    // Entorno neutro para reflejos PBR realistas (sin descargas externas)
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    // La foto del salón como fondo
    new THREE.TextureLoader().load(photoUrl, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      scene.background = tex;
      const img = tex.image as HTMLImageElement;
      if (img?.width) {
        photoAspectRef.current = img.width / img.height;
        fit();
      }
    });

    // Luz que imita luz de ventana + relleno
    const hemi = new THREE.HemisphereLight('#dfe8f5', '#7a6a58', 0.9);
    scene.add(hemi);
    const dir = new THREE.DirectionalLight('#fff2dd', 1.8);
    dir.position.set(-3, 4, 2.5);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    dir.shadow.bias = -0.0004;
    scene.add(dir);

    // Suelo invisible: recibe sombras y sirve para arrastrar
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.ShadowMaterial({ opacity: 0.32 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.name = 'ground';
    scene.add(ground);

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

    // El canvas se ajusta al hueco disponible manteniendo el aspecto de la foto
    const fit = () => {
      const aw = wrap.clientWidth, ah = wrap.clientHeight;
      if (!aw || !ah) return;
      const pa = photoAspectRef.current;
      let w = aw, h = aw / pa;
      if (h > ah) { h = ah; w = ah * pa; }
      frame.style.width = `${w}px`;
      frame.style.height = `${h}px`;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);
    window.addEventListener('resize', fit);
    fit();

    // Arrastre por raycast sobre el plano del suelo
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    let dragging: PlacedItem | null = null;

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
      const hit = pickPlaced();
      if (hit) {
        dragging = hit;
        selectedRef.current = hit;
        setSelectedUid(hit.uid);
        setItemScale(hit.object.scale.x / hit.baseScale);
        canvas.setPointerCapture(e.pointerId);
      } else {
        selectedRef.current = null;
        setSelectedUid(null);
      }
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      toNdc(e);
      ray.setFromCamera(ndc, camera);
      const pt = new THREE.Vector3();
      if (ray.ray.intersectPlane(plane, pt)) {
        dragging.object.position.set(pt.x, 0, Math.min(pt.z, camera.position.z - 0.5));
      }
    };
    const onUp = (e: PointerEvent) => {
      if (dragging) canvas.releasePointerCapture(e.pointerId);
      dragging = null;
    };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);

    const animate = () => {
      animRef.current = requestAnimationFrame(animate);
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
      pmrem.dispose();
      renderer.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoUrl]);

  // Inclinación de cámara (ajuste de perspectiva contra la foto)
  useEffect(() => {
    if (cameraRef.current) cameraRef.current.rotation.x = tilt;
  }, [tilt]);

  // Escala del elemento seleccionado
  useEffect(() => {
    const sel = placedRef.current.find((p) => p.uid === selectedUid);
    if (sel) sel.object.scale.setScalar(sel.baseScale * itemScale);
  }, [itemScale, selectedUid]);

  async function loadModel(item: CatalogItem): Promise<THREE.Group> {
    const cached = modelCacheRef.current.get(item.slug);
    if (cached) return cached.clone(true);
    const gltf = await loaderRef.current.loadAsync(`/models/${item.slug}/${item.slug}_1k.gltf`);
    const root = gltf.scene;
    root.traverse((n) => {
      if (n instanceof THREE.Mesh) {
        n.castShadow = true;
        n.receiveShadow = true;
      }
    });
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
      const slotX = [0, 1.5, -1.5, 2.3, -2.3, 0.8, -0.8];
      obj.position.y = -box.min.y;
      obj.position.x = slotX[n % slotX.length];
      obj.position.z = 0.15;
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

  return (
    <div style={{ display: 'flex', height: '100%', position: 'relative' }}>
      {/* Visor: la foto con los muebles encima */}
      <div ref={wrapRef} style={{ flex: 1, position: 'relative', overflow: 'hidden', minWidth: 0, background: '#05070d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div ref={frameRef} style={{ position: 'relative' }}>
          <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%', touchAction: 'none', cursor: 'grab' }} />
        </div>

        {!isNarrow && (
          <div style={{ position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.55)', borderRadius: 8, padding: '5px 14px', fontSize: '0.72rem', color: '#cbd5e1', pointerEvents: 'none', whiteSpace: 'nowrap' }}>
            Toca un mueble del catálogo para añadirlo · Arrástralo para moverlo por tu salón
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
            <label style={{ color: '#94a3b8', fontSize: '0.7rem', display: 'flex', flexDirection: 'column', gap: 3 }}>
              Tamaño
              <input type="range" min={0.6} max={1.6} step={0.02} value={itemScale} onChange={(e) => setItemScale(parseFloat(e.target.value))} />
            </label>
          </div>
        )}

        {/* Ajuste de perspectiva */}
        <div style={{ position: 'absolute', bottom: isNarrow ? 10 : 44, right: 14, background: 'rgba(0,0,0,0.65)', border: '1px solid #334155', borderRadius: 10, padding: '8px 12px', zIndex: 11 }}>
          <label style={{ color: '#94a3b8', fontSize: '0.7rem', display: 'flex', flexDirection: 'column', gap: 3 }}>
            Perspectiva
            <input type="range" min={-0.5} max={-0.05} step={0.01} value={tilt} onChange={(e) => setTilt(parseFloat(e.target.value))} style={{ width: 110 }} />
          </label>
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
                    <div style={{ fontSize: '0.66rem', color: '#475569' }}>{item.category} · CC0</div>
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
              La versión completa reconstruye tu habitación en 3D navegable
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
