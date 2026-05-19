'use client';

import { useEffect, useRef, useState } from 'react';

export default function ViewerPage() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [glbUrl, setGlbUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const url = params.get('url');
    setProjectId(id);
    setGlbUrl(url);
    setLoading(false);
  }, []);

  function copyShareLink() {
    navigator.clipboard.writeText(window.location.href);
    alert('Link copiado!');
  }

  return (
    <main style={{ minHeight: '100vh', background: '#000', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <header style={{ padding: '12px 20px', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1f2937', position: 'sticky', top: 0, zIndex: 10 }}>
        <a href="/dashboard" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.875rem' }}>
          ← Dashboard
        </a>
        <span style={{ color: '#e2e8f0', fontWeight: 600 }}>Visor 3D</span>
        <button onClick={copyShareLink} style={{ padding: '6px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.875rem' }}>
          Compartir
        </button>
      </header>

      {/* 3D Viewer area */}
      <div ref={canvasRef} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>⏳</div>
            <p>Cargando tour 3D...</p>
          </div>
        ) : glbUrl ? (
          /* model-viewer web component for GLB rendering */
          <div style={{ width: '100%', height: 'calc(100vh - 56px)', position: 'relative' }}>
            {/* @ts-expect-error model-viewer custom element */}
            <model-viewer
              src={glbUrl}
              alt="Tour 3D"
              auto-rotate
              camera-controls
              style={{ width: '100%', height: '100%' }}
            />
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: '#64748b', padding: 40 }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>🏠</div>
            <p>No se encontró el modelo 3D.</p>
            <p style={{ fontSize: '0.875rem' }}>ID del proyecto: <code style={{ background: '#1e293b', padding: '2px 6px', borderRadius: 4 }}>{projectId || 'N/A'}</code></p>
          </div>
        )}
      </div>

      {/* model-viewer script */}
      <script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js" />
    </main>
  );
}
