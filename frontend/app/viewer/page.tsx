'use client';

import { useEffect, useState } from 'react';
import nextDynamic from 'next/dynamic';

export const dynamic = 'force-dynamic';
import { api } from '../../lib/api';
import type { Project, Output } from '../../lib/api';

const GaussianSplatViewer = nextDynamic(() => import('../../components/GaussianSplatViewer'), {
  ssr: false,
  loading: () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
      Iniciando visor 3D...
    </div>
  ),
});

export default function ViewerPage() {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [useIframe, setUseIframe] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id) { setError('Falta el parámetro ?id='); setLoading(false); return; }
    api.projects.get(id)
      .then((p) => { setProject(p); setLoading(false); })
      .catch((err: Error) => { setError(err.message); setLoading(false); });
  }, []);

  const splatOut  = project?.outputs?.find((o: Output) => o.format === 'spz');
  const glbOut    = project?.outputs?.find((o: Output) => o.format === 'glb');
  const iframeOut = project?.outputs?.find((o: Output) => o.format === 'url');

  const canView = project?.status === 'completed' && (splatOut || glbOut || iframeOut);

  return (
    <main style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0a0a0a', overflow: 'hidden' }}>
      <header style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1f2937', background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(10px)', flexShrink: 0, zIndex: 20 }}>
        <a href="/dashboard" style={{ color: '#64748b', fontSize: '0.875rem', textDecoration: 'none' }}>← Dashboard</a>
        <span style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '0.95rem' }}>{project?.name || 'Visor 3D'}</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {canView && (splatOut || glbOut) && (
            <button
              onClick={() => setUseIframe(v => !v)}
              style={{ padding: '6px 14px', background: 'transparent', color: '#94a3b8', border: '1px solid #334155', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem' }}
            >
              {useIframe ? '🖥️ Visor 3D' : '🌐 Visor web'}
            </button>
          )}
          <button onClick={() => { navigator.clipboard.writeText(window.location.href); alert('Link copiado'); }} style={{ padding: '6px 14px', background: 'transparent', color: '#94a3b8', border: '1px solid #334155', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem' }}>
            Compartir
          </button>
          {glbOut && (
            <a href={glbOut.url} download style={{ padding: '6px 14px', background: '#3b82f6', color: '#fff', borderRadius: 6, fontSize: '0.8rem', textDecoration: 'none' }}>
              ↓ GLB
            </a>
          )}
        </div>
      </header>

      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>
            Cargando...
          </div>
        )}
        {error && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
            <p style={{ color: '#ef4444' }}>{error}</p>
            <a href="/dashboard" style={{ color: '#3b82f6' }}>← Volver</a>
          </div>
        )}
        {project?.status === 'processing' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16, color: '#94a3b8' }}>
            <div style={{ width: 56, height: 56, border: '3px solid #1f2937', borderTopColor: '#f59e0b', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <p style={{ fontSize: '1.1rem', margin: 0 }}>Generando tu tour 3D...</p>
            <p style={{ fontSize: '0.85rem', color: '#475569', margin: 0 }}>Tiempo estimado: ~5 minutos</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        )}
        {canView && (
          useIframe && iframeOut ? (
            <iframe
              src={iframeOut.url}
              style={{ width: '100%', height: '100%', border: 'none' }}
              allow="xr-spatial-tracking; fullscreen"
            />
          ) : (splatOut || glbOut) ? (
            <GaussianSplatViewer
              splatUrl={splatOut?.url}
              glbUrl={glbOut?.url}
              projectName={project.name}
              vertical={project.vertical}
            />
          ) : iframeOut ? (
            <iframe
              src={iframeOut.url}
              style={{ width: '100%', height: '100%', border: 'none' }}
              allow="xr-spatial-tracking; fullscreen"
            />
          ) : null
        )}
        {project?.status === 'failed' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
            <p style={{ color: '#ef4444' }}>Error en la generación</p>
            <p style={{ color: '#64748b', fontSize: '0.875rem' }}>{project.error}</p>
            <a href="/dashboard" style={{ color: '#3b82f6' }}>← Volver</a>
          </div>
        )}
      </div>
    </main>
  );
}
