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
  const canvasRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [fps, setFps] = useState(0);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (!splatUrl && !glbUrl) {
      setError('No hay modelo disponible');
      setStatus('error');
      return;
    }

    let animFrameId: number;
    let viewer: any;

    async function init() {
      try {
        // Dynamic import to avoid SSR issues
        const THREE = await import('three');
        const GS = await import('@mkkellogg/gaussian-splats-3d');

        const container = canvasRef.current!;
        const w = container.clientWidth;
        const h = container.clientHeight;

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(w, h);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setClearColor(0x0a0a0a);
        container.appendChild(renderer.domElement);

        // Scene + camera
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 500);
        camera.position.set(0, 1, 3);

        // Gaussian splat viewer wrapper
        viewer = new GS.Viewer({
          renderer,
          scene,
          camera,
          selfDrivenMode: false,
          useBuiltInControls: true,
          controlsNode: container,
        });

        setStatus('loading');

        // Load SPZ splat
        const urlToLoad = splatUrl || glbUrl!;
        const format = splatUrl
          ? GS.SceneFormat.SPZ
          : GS.SceneFormat.GLB;

        await viewer.addSplatScene(urlToLoad, {
          format,
          showLoadingUI: false,
          onProgress: (pct: number) => {
            if (pct >= 1) setStatus('ready');
          },
        });

        setStatus('ready');
        viewerRef.current = viewer;

        // Resize handler
        const onResize = () => {
          const nw = container.clientWidth;
          const nh = container.clientHeight;
          camera.aspect = nw / nh;
          camera.updateProjectionMatrix();
          renderer.setSize(nw, nh);
        };
        window.addEventListener('resize', onResize);

        // Render loop
        let lastTime = performance.now();
        let frameCount = 0;
        function animate() {
          animFrameId = requestAnimationFrame(animate);
          viewer.update();
          renderer.render(scene, camera);

          frameCount++;
          const now = performance.now();
          if (now - lastTime >= 1000) {
            setFps(frameCount);
            frameCount = 0;
            lastTime = now;
          }
        }
        animate();

        return () => {
          window.removeEventListener('resize', onResize);
          cancelAnimationFrame(animFrameId);
          renderer.dispose();
          container.removeChild(renderer.domElement);
        };
      } catch (err) {
        console.error('Viewer init error:', err);
        setError((err as Error).message);
        setStatus('error');
      }
    }

    const cleanup = init();
    return () => {
      cancelAnimationFrame(animFrameId);
      cleanup.then((fn) => fn?.());
    };
  }, [splatUrl, glbUrl]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#0a0a0a' }}>
      {/* Three.js canvas container */}
      <div ref={canvasRef} style={{ width: '100%', height: '100%' }} />

      {/* Loading overlay */}
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

      {/* Error overlay */}
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

      {/* HUD — top left */}
      {status === 'ready' && projectName && (
        <div style={{
          position: 'absolute', top: 16, left: 16, background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(8px)', borderRadius: 10, padding: '10px 16px',
          border: '1px solid rgba(255,255,255,0.08)', zIndex: 5,
        }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', color: '#f1f5f9' }}>{projectName}</p>
          {vertical && (
            <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#64748b' }}>
              {VERTICAL_LABEL[vertical] || vertical}
            </p>
          )}
        </div>
      )}

      {/* FPS counter — bottom right */}
      {status === 'ready' && (
        <div style={{
          position: 'absolute', bottom: 16, right: 16,
          background: 'rgba(0,0,0,0.5)', borderRadius: 6,
          padding: '3px 8px', fontSize: '0.7rem', color: '#475569', zIndex: 5,
        }}>
          {fps} fps
        </div>
      )}

      {/* Controls hint */}
      {status === 'ready' && (
        <div style={{
          position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.5)', borderRadius: 8, padding: '6px 14px',
          fontSize: '0.75rem', color: '#475569', zIndex: 5, whiteSpace: 'nowrap',
        }}>
          🖱️ Arrastrar para rotar · Scroll para zoom · Click derecho para mover
        </div>
      )}
    </div>
  );
}
