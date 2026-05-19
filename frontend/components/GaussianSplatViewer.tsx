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

export default function GaussianSplatViewer({ splatUrl, glbUrl, projectName, vertical }: ViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!containerRef.current) return;
    if (!splatUrl && !glbUrl) {
      setError('No hay modelo disponible');
      setStatus('error');
      return;
    }

    let viewer: any;

    async function init() {
      try {
        const GS = await import('@mkkellogg/gaussian-splats-3d');

        const container = containerRef.current!;

        viewer = new GS.Viewer({
          selfDrivenMode: true,
          useBuiltInControls: true,
          rootElement: container,
          ignoreDevicePixelRatio: false,
          gpuAcceleratedSort: true,
          sharedMemoryForWorkers: false,
          integerBasedSort: false,
          halfPrecisionCovariancesOnGPU: true,
          dynamicScene: false,
          webXRMode: GS.WebXRMode.None,
          renderMode: GS.RenderMode.OnChange,
          sceneRevealMode: GS.SceneRevealMode.Gradual,
          logLevel: GS.LogLevel.None,
          camera: undefined,
          renderer: undefined,
        });

        const urlToLoad = splatUrl || glbUrl!;
        const format = splatUrl ? GS.SceneFormat.SPZ : GS.SceneFormat.GLB;

        await viewer.addSplatScene(urlToLoad, {
          format,
          showLoadingUI: false,
          position: [0, 0, 0],
          rotation: [0, 0, 0, 1],
          scale: [1, 1, 1],
          onProgress: (pct: number) => {
            if (pct >= 1) setStatus('ready');
          },
        });

        setStatus('ready');
        viewerRef.current = viewer;
        viewer.start();

        return () => {
          viewer.stop();
          viewer.dispose?.();
        };
      } catch (err) {
        console.error('Viewer error:', err);
        setError((err as Error).message);
        setStatus('error');
      }
    }

    const cleanup = init();
    return () => {
      cleanup.then((fn) => fn?.());
    };
  }, [splatUrl, glbUrl]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#0a0a0a' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {status === 'loading' && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', zIndex: 10,
        }}>
          <div style={{ width: 48, height: 48, border: '3px solid #1f2937', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: 20 }} />
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Cargando escena 3D...</p>
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
