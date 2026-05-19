'use client';

import { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const VERTICAL_LABELS: Record<string, { icon: string; color: string }> = {
  real_estate: { icon: '🏠', color: '#3b82f6' },
  museum: { icon: '🏛️', color: '#8b5cf6' },
  gamedev: { icon: '🎮', color: '#10b981' },
  events: { icon: '🎪', color: '#f59e0b' },
  retail: { icon: '🛍️', color: '#ef4444' },
  architecture: { icon: '🏗️', color: '#06b6d4' },
};

interface Project {
  id: string;
  name: string;
  vertical: string;
  status: string;
  createdAt: string;
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadVertical, setUploadVertical] = useState('real_estate');
  const [uploadName, setUploadName] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { window.location.href = '/login'; return; }
    fetchProjects(token);
  }, []);

  async function fetchProjects(token: string) {
    try {
      const res = await fetch(`${API}/api/projects`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setProjects(data.data || []);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setUploading(true);
    const token = localStorage.getItem('token')!;

    try {
      const res = await fetch(`${API}/api/projects/create/${uploadVertical}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ imagePath: 'input/sample.jpg', name: uploadName }),
      });
      const data = await res.json();
      if (data.success) {
        setShowUpload(false);
        setUploadName('');
        fetchProjects(token);
      }
    } finally {
      setUploading(false);
    }
  }

  const STATUS_COLORS: Record<string, string> = {
    completed: '#10b981',
    processing: '#f59e0b',
    failed: '#ef4444',
    pending: '#6b7280',
  };

  return (
    <main style={{ minHeight: '100vh', background: '#0a0a0a' }}>
      {/* Header */}
      <header style={{ padding: '16px 24px', borderBottom: '1px solid #1f2937', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ margin: 0, fontSize: '1.25rem' }}>Image-Blaster</h1>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => setShowUpload(true)} style={{ padding: '8px 20px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
            + Nuevo proyecto
          </button>
          <button onClick={() => { localStorage.removeItem('token'); window.location.href = '/login'; }}
            style={{ padding: '8px 16px', background: 'transparent', color: '#94a3b8', border: '1px solid #334155', borderRadius: 8, cursor: 'pointer' }}>
            Salir
          </button>
        </div>
      </header>

      <div style={{ padding: '32px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={{ marginTop: 0, marginBottom: 24, color: '#e2e8f0' }}>Mis proyectos</h2>

        {loading ? (
          <p style={{ color: '#94a3b8' }}>Cargando...</p>
        ) : projects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>📂</div>
            <p>No tienes proyectos aún.</p>
            <button onClick={() => setShowUpload(true)} style={{ padding: '10px 24px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
              Crear tu primer proyecto
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {projects.map((p) => {
              const v = VERTICAL_LABELS[p.vertical] || { icon: '📦', color: '#94a3b8' };
              return (
                <div key={p.id} style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 12, padding: 20, cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '1.75rem' }}>{v.icon}</span>
                    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem', background: STATUS_COLORS[p.status] + '22', color: STATUS_COLORS[p.status] }}>
                      {p.status}
                    </span>
                  </div>
                  <h3 style={{ margin: '12px 0 4px', fontSize: '1rem', color: '#e2e8f0' }}>{p.name}</h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: v.color }}>{p.vertical.replace('_', ' ')}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upload modal */}
      {showUpload && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 50 }}>
          <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 16, padding: 32, width: '100%', maxWidth: 440 }}>
            <h3 style={{ marginTop: 0 }}>Nuevo proyecto</h3>
            <form onSubmit={handleUpload}>
              <label style={{ display: 'block', marginBottom: 16 }}>
                <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Nombre</span>
                <input value={uploadName} onChange={(e) => setUploadName(e.target.value)} required
                  placeholder="Mi proyecto"
                  style={{ display: 'block', width: '100%', padding: '10px 12px', marginTop: 4, background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#fff', fontSize: '1rem', boxSizing: 'border-box' }} />
              </label>
              <label style={{ display: 'block', marginBottom: 24 }}>
                <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Vertical</span>
                <select value={uploadVertical} onChange={(e) => setUploadVertical(e.target.value)}
                  style={{ display: 'block', width: '100%', padding: '10px 12px', marginTop: 4, background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#fff', fontSize: '1rem', boxSizing: 'border-box' }}>
                  {Object.entries(VERTICAL_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v.icon} {k.replace('_', ' ')}</option>
                  ))}
                </select>
              </label>
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="submit" disabled={uploading} style={{ flex: 1, padding: '11px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
                  {uploading ? 'Procesando...' : 'Crear'}
                </button>
                <button type="button" onClick={() => setShowUpload(false)} style={{ flex: 1, padding: '11px', background: 'transparent', color: '#94a3b8', border: '1px solid #334155', borderRadius: 8, cursor: 'pointer' }}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
