'use client';

import { useEffect, useRef, useState } from 'react';

interface ViewerProps {
  splatUrl?: string;
  glbUrl?: string;
  projectName?: string;
  vertical?: string;
}

const VERTICAL_LABEL: Record<string, string> = {
  real_estate: '🏠 Inmobiliaria',
  museum: '🏛️ Museo',
  events: '🎪 Evento',
  gamedev: '🎮 Game Dev',
  retail: '🛍️ Retail',
  architecture: '🏗️ Arquitectura',
};

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        src?: string;
        alt?: string;
        'auto-rotate'?: boolean | '';
        'camera-controls'?: boolean | '';
        'shadow-intensity'?: string;
        exposure?: string;
        style?: React.CSSProperties;
        loading?: string;
        reveal?: string;
        poster?: string;
        ar?: boolean | '';
        'ar-modes'?: string;
        onLoad?: () => void;
        onError?: (e: Event) => void;
      }, HTMLElement>;
    }
  }
}

export default function GaussianSplatViewer({ splatUrl, glbUrl, projectName, vertical }: ViewerProps) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const modelViewerRef = useRef<HTMLElement | null>(null);

  // Load model-viewer script
  useEffect(() => {
    if (document.querySelector('script[data-model-viewer]')) {
      setScriptLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js';
    script.dataset.modelViewer = 'true';
    script.onload = () => setScriptLoaded(true);
    script.onerror = () => {
      const s2 = document.createElement('script');
      s2.type = 'module';
      s2.src = 'https://unpkg.com/@google/model-viewer@3.5.0/dist/model-viewer.min.js';
      s2.onload = () => setScriptLoaded(true);
      s2.onerror = () => { setError('No se pudo cargar el visor 3D'); setStatus('error'); };
      document.head.appendChild(s2);
    };
    document.head.appendChild(script);
  }, []);

  // Attach load/error events via ref once model-viewer is rendered
  useEffect(() => {
    const el = modelViewerRef.current;
    if (!el || !scriptLoaded) return;
    const onLoad = () => setStatus('ready');
    const onError = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      console.error('model-viewer error', detail);
      setError(detail?.sourceError?.message || 'Error al cargar el modelo 3D');
      setStatus('error');
    };
    el.addEventListener('load', onLoad);
    el.addEventListener('error', onError);
    return () => {
      el.removeEventListener('load', onLoad);
      el.removeEventListener('error', onError);
    };
  }, [scriptLoaded]);

  const modelUrl = glbUrl || splatUrl;

  if (!modelUrl) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#0a0a0a' }}>
        <p style={{ color: '#94a3b8' }}>No hay modelo 3D disponible</p>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#0a0a0a' }}>
      {scriptLoaded && (
        <model-viewer
          ref={(el: HTMLElement | null) => { modelViewerRef.current = el; }}
          src={modelUrl}
          alt={projectName || 'Modelo 3D'}
          auto-rotate=""
          camera-controls=""
          shadow-intensity="1"
          exposure="0.85"
          loading="eager"
          reveal="auto"
          style={{ width: '100%', height: '100%', background: '#0a0a0a', '--poster-color': '#0a0a0a' } as React.CSSProperties}
        />
      )}

      {status === 'loading' && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', zIndex: 10,
          pointerEvents: 'none',
        }}>
          <div style={{ width: 48, height: 48, border: '3px solid #1f2937', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: 20 }} />
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Cargando modelo 3D...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      )}

      {status === 'error' && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', zIndex: 10,
        }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>⚠️</div>
          <p style={{ color: '#ef4444', marginBottom: 8 }}>Error cargando el visor</p>
          <p style={{ color: '#64748b', fontSize: '0.8rem', maxWidth: 300, textAlign: 'center' }}>{error}</p>
          {glbUrl && (
            <a href={glbUrl} download style={{ marginTop: 16, padding: '8px 16px', background: '#3b82f6', color: '#fff', borderRadius: 6, fontSize: '0.85rem', textDecoration: 'none' }}>
              ↓ Descargar GLB
            </a>
          )}
        </div>
      )}

      {status === 'ready' && projectName && (
        <div style={{
          position: 'absolute', top: 16, left: 16, background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(8px)', borderRadius: 10, padding: '10px 16px',
          border: '1px solid rgba(255,255,255,0.08)', zIndex: 5, pointerEvents: 'none',
        }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', color: '#f1f5f9' }}>{projectName}</p>
          {vertical && (
            <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#64748b' }}>
              {VERTICAL_LABEL[vertical] || vertical}
            </p>
          )}
        </div>
      )}

      {status === 'ready' && (
        <div style={{
          position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.5)', borderRadius: 8, padding: '6px 14px',
          fontSize: '0.75rem', color: '#475569', zIndex: 5, whiteSpace: 'nowrap', pointerEvents: 'none',
        }}>
          🖱️ Arrastrar para rotar · Scroll para zoom · Click derecho para mover
        </div>
      )}
    </div>
  );
}
