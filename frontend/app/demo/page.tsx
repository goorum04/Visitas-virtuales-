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
      <span style={{ fontSize: '0.9rem' }}>Cargando el visor…</span>
    </div>
  ),
});

const EXAMPLE_PHOTO = '/demo-room.png';

export default function DemoPage() {
  const [step, setStep] = useState<'upload' | 'tryon'>('upload');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    if (!file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    setPhotoUrl(url);
    setProcessing(true);
    setProgress(0);
    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 30 + 12;
      if (p >= 100) {
        p = 100;
        clearInterval(interval);
        setTimeout(() => { setProcessing(false); setStep('tryon'); }, 300);
      }
      setProgress(Math.min(p, 100));
    }, 180);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  if (processing) {
    return (
      <main style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 24, padding: 20 }}>
        <div style={{ textAlign: 'center', maxWidth: 440 }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>📐</div>
          <h2 style={{ color: '#e2e8f0', margin: '0 0 8px' }}>Preparando tu salón…</h2>
          <p style={{ color: '#64748b', margin: '0 0 32px', fontSize: '0.9rem' }}>Calibrando perspectiva y cargando el catálogo 3D</p>
          <div style={{ background: '#1e293b', borderRadius: 8, height: 8, overflow: 'hidden', marginBottom: 12 }}>
            <div style={{ height: '100%', background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', borderRadius: 8, width: `${progress}%`, transition: 'width 0.3s ease' }} />
          </div>
          <p style={{ color: '#475569', fontSize: '0.8rem' }}>{Math.round(progress)}% completado</p>
        </div>
        {photoUrl && (
          <img src={photoUrl} alt="Tu habitación" style={{ maxWidth: 300, maxHeight: 200, borderRadius: 12, objectFit: 'cover', border: '1px solid #1f2937', opacity: 0.6 }} />
        )}
      </main>
    );
  }

  if (step === 'tryon' && photoUrl) {
    return (
      <main style={{ height: '100vh', background: '#0a0a0a', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <header style={{ padding: '10px 20px', borderBottom: '1px solid #1f2937', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0a0a0a', flexShrink: 0, zIndex: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <button onClick={() => { setStep('upload'); setPhotoUrl(null); setProgress(0); }}
              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.875rem', padding: 0, whiteSpace: 'nowrap' }}>
              ← Volver
            </button>
            <span style={{ color: '#1f2937' }}>|</span>
            <span style={{ fontWeight: 700, color: '#e2e8f0', fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Muebles reales en tu salón</span>
            <span style={{ background: '#3b82f622', color: '#3b82f6', fontSize: '0.7rem', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>DEMO</span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <a href="/login" style={{ padding: '7px 16px', background: '#3b82f6', color: '#fff', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>
              Guardar proyecto →
            </a>
          </div>
        </header>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <FurnitureTryOn photoUrl={photoUrl} />
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: '16px 24px', borderBottom: '1px solid #1f2937', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="/" style={{ fontWeight: 700, color: '#e2e8f0', fontSize: '1.1rem', textDecoration: 'none' }}>Image-Blaster</a>
        <a href="/login" style={{ padding: '8px 18px', background: '#3b82f6', color: '#fff', borderRadius: 8, fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
          Crear cuenta gratis
        </a>
      </header>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: 40, maxWidth: 600 }}>
          <h1 style={{ fontSize: 'clamp(1.75rem, 5vw, 2.75rem)', fontWeight: 800, margin: '0 0 12px', background: 'linear-gradient(135deg, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Prueba muebles reales en tu salón
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '1rem', margin: 0 }}>
            Sube una foto de tu habitación y coloca sobre ella muebles 3D fotorrealistas a escala real.
            Muévelos, gíralos y decide antes de comprar.
          </p>
        </div>

        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          style={{
            width: '100%', maxWidth: 520, border: '2px dashed #334155', borderRadius: 16, padding: '48px 32px',
            textAlign: 'center', cursor: 'pointer', background: '#0f172a', transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.background = '#0f1a2e'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.background = '#0f172a'; }}
        >
          <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>📸</div>
          <p style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '1.1rem', margin: '0 0 8px' }}>
            Arrastra la foto de tu salón aquí
          </p>
          <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0 0 24px' }}>
            JPG, PNG o WebP — hasta 20 MB
          </p>
          <span style={{ padding: '10px 28px', background: '#3b82f6', color: '#fff', borderRadius: 8, fontWeight: 600, fontSize: '0.95rem' }}>
            Seleccionar imagen
          </span>
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        </div>

        <button
          onClick={() => { setPhotoUrl(EXAMPLE_PHOTO); setStep('tryon'); }}
          style={{ marginTop: 20, background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.875rem', textDecoration: 'underline' }}
        >
          O prueba con el salón de ejemplo →
        </button>

        <div style={{ display: 'flex', gap: 32, marginTop: 48, flexWrap: 'wrap', justifyContent: 'center' }}>
          {[
            { icon: '🛋️', label: 'Muebles 3D reales' },
            { icon: '📏', label: 'A escala real' },
            { icon: '🖐️', label: 'Arrastra y gira' },
            { icon: '🏠', label: 'Sobre tu propia foto' },
          ].map((f) => (
            <div key={f.label} style={{ textAlign: 'center', color: '#64748b', fontSize: '0.8rem' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>{f.icon}</div>
              {f.label}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
