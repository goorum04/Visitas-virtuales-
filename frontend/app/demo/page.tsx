'use client';

export const dynamic = 'force-dynamic';

import { useState, useRef } from 'react';
import nextDynamic from 'next/dynamic';

const FurnitureTryOn = nextDynamic(() => import('../../components/FurnitureTryOn'), {
  ssr: false,
  loading: () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', flexDirection: 'column', gap: 12 }}>
      <div style={{ width: 40, height: 40, border: '3px solid #1f2937', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <span style={{ fontSize: '0.9rem' }}>Cargando el salón…</span>
    </div>
  ),
});

// Salón predeterminado: tres vistas desde el mismo punto (frente, izquierda, derecha)
const EXAMPLE_PHOTOS = ['/demo-room.png', '/demo-room-left.png', '/demo-room-right.png'];

export default function DemoPage() {
  const [photos, setPhotos] = useState<string[]>(EXAMPLE_PHOTOS);
  const [isExample, setIsExample] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    const urls = Array.from(files)
      .filter((f) => f.type.startsWith('image/'))
      .slice(0, 3)
      .map((f) => URL.createObjectURL(f));
    if (!urls.length) return;
    setPhotos(urls);
    setIsExample(false);
  }

  return (
    <main style={{ height: '100vh', background: '#0a0a0a', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <header style={{ padding: '10px 20px', borderBottom: '1px solid #1f2937', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0a0a0a', flexShrink: 0, zIndex: 20, gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <span style={{ fontWeight: 700, color: '#e2e8f0', fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Muebles reales en tu salón</span>
          <span style={{ background: '#3b82f622', color: '#3b82f6', fontSize: '0.7rem', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>DEMO</span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
          {!isExample && (
            <button onClick={() => { setPhotos(EXAMPLE_PHOTOS); setIsExample(true); }}
              style={{ padding: '7px 12px', background: 'none', border: '1px solid #334155', color: '#94a3b8', borderRadius: 8, fontSize: '0.8rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              ↺ Salón de ejemplo
            </button>
          )}
          <button onClick={() => fileInputRef.current?.click()}
            title="Sube 1-3 fotos hechas desde el mismo sitio: de frente, girado a la izquierda y girado a la derecha"
            style={{ padding: '7px 14px', background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            📷 Probar con tus fotos
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
            onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }} />
          <a href="/login" style={{ padding: '7px 16px', background: '#3b82f6', color: '#fff', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>
            Guardar proyecto →
          </a>
        </div>
      </header>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <FurnitureTryOn key={photos.join('|')} photoUrls={photos} />
      </div>
    </main>
  );
}
