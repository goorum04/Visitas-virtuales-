'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import { api } from '../../lib/api';
import type { Project } from '../../lib/api';

const VERTICAL_META: Record<string, { icon: string; color: string; label: string }> = {
  real_estate:  { icon: '🏠', color: '#3b82f6', label: 'Inmobiliarias' },
  museum:       { icon: '🏛️', color: '#8b5cf6', label: 'Museo' },
  gamedev:      { icon: '🎮', color: '#10b981', label: 'Game Dev' },
  events:       { icon: '🎪', color: '#f59e0b', label: 'Eventos' },
  retail:       { icon: '🛍️', color: '#ef4444', label: 'Retail' },
  architecture: { icon: '🏗️', color: '#06b6d4', label: 'Arquitectura' },
};

const STATUS_COLOR: Record<string, string> = {
  completed:  '#10b981',
  processing: '#f59e0b',
  failed:     '#ef4444',
  pending:    '#6b7280',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span style={{
      padding: '2px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 600,
      background: `${STATUS_COLOR[status] || '#6b7280'}22`,
      color: STATUS_COLOR[status] || '#6b7280',
    }}>
      {status === 'processing' ? '⏳ procesando' : status}
    </span>
  );
}

function ProjectCard({ project, onClick }: { project: Project; onClick: () => void }) {
  const v = VERTICAL_META[project.vertical] || { icon: '📦', color: '#94a3b8', label: project.vertical };
  return (
    <div onClick={onClick} style={{
      background: '#111827', border: '1px solid #1f2937', borderRadius: 12, padding: 20,
      cursor: 'pointer', transition: 'border-color 0.15s',
    }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = v.color)}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#1f2937')}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <span style={{ fontSize: '2rem' }}>{v.icon}</span>
        <StatusBadge status={project.status} />
      </div>
      <h3 style={{ margin: '0 0 4px', fontSize: '1rem', color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {project.name}
      </h3>
      <p style={{ margin: '0 0 12px', fontSize: '0.8rem', color: v.color }}>{v.label}</p>
      <p style={{ margin: 0, fontSize: '0.72rem', color: '#475569' }}>
        {new Date(project.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
      </p>
    </div>
  );
}

function UploadModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [vertical, setVertical] = useState('real_estate');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { setError('Selecciona una imagen'); return; }
    setLoading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('image', file);
      fd.append('name', name);
      await api.projects.create(vertical, fd);
      onCreated();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 50 }}>
      <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 16, padding: 32, width: '100%', maxWidth: 440 }}>
        <h3 style={{ marginTop: 0, marginBottom: 24 }}>Nuevo proyecto 3D</h3>
        <form onSubmit={handleSubmit}>
          <Field label="Nombre del proyecto">
            <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Ej: Casa Calle Mayor 12" style={inputStyle} />
          </Field>
          <Field label="Vertical">
            <select value={vertical} onChange={(e) => setVertical(e.target.value)} style={inputStyle}>
              {Object.entries(VERTICAL_META).map(([k, v]) => (
                <option key={k} value={k}>{v.icon} {v.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Imagen (JPG/PNG/WebP, máx 20 MB)">
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] || null)} required style={{ ...inputStyle, padding: '8px 12px' }} />
          </Field>
          {error && <p style={{ color: '#ef4444', fontSize: '0.875rem', margin: '0 0 12px' }}>{error}</p>}
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button type="submit" disabled={loading} style={{ flex: 1, padding: 12, background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Enviando...' : 'Generar 3D'}
            </button>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: 12, background: 'transparent', color: '#94a3b8', border: '1px solid #334155', borderRadius: 8, cursor: 'pointer' }}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', marginBottom: 16 }}>
      <span style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: 6 }}>{label}</span>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  display: 'block', width: '100%', padding: '10px 12px', background: '#1e293b',
  border: '1px solid #334155', borderRadius: 8, color: '#fff', fontSize: '1rem', boxSizing: 'border-box',
};

// ===== Main page =====

export default function DashboardPage() {
  const [showUpload, setShowUpload] = useState(false);
  const [selected, setSelected] = useState<Project | null>(null);

  const { data: projects, error, mutate } = useSWR<Project[]>(
    '/api/projects',
    () => api.projects.list(),
    { refreshInterval: 8000 }
  );

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('token')) {
      window.location.href = '/login';
    }
  }, []);

  const handleCreated = useCallback(() => { mutate(); }, [mutate]);

  const processing = projects?.filter((p) => p.status === 'processing' || p.status === 'pending').length || 0;

  return (
    <main style={{ minHeight: '100vh', background: '#0a0a0a' }}>
      <header style={{ padding: '14px 24px', borderBottom: '1px solid #1f2937', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#0a0a0a', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>Image-Blaster</span>
          {processing > 0 && (
            <span style={{ fontSize: '0.75rem', background: '#f59e0b22', color: '#f59e0b', padding: '2px 10px', borderRadius: 20 }}>
              {processing} procesando
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setShowUpload(true)} style={{ padding: '8px 18px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
            + Nuevo
          </button>
          <button onClick={() => { localStorage.removeItem('token'); window.location.href = '/login'; }}
            style={{ padding: '8px 14px', background: 'transparent', color: '#64748b', border: '1px solid #1f2937', borderRadius: 8, cursor: 'pointer', fontSize: '0.875rem' }}>
            Salir
          </button>
        </div>
      </header>

      <div style={{ padding: '32px 24px', maxWidth: 1100, margin: '0 auto' }}>
        {error && <p style={{ color: '#ef4444' }}>Error cargando proyectos: {error.message}</p>}

        {!projects ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ background: '#111827', borderRadius: 12, height: 140, animation: 'pulse 1.5s infinite' }} />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: '#64748b' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>📂</div>
            <p style={{ fontSize: '1.1rem', marginBottom: 20 }}>Aún no tienes proyectos</p>
            <button onClick={() => setShowUpload(true)} style={{ padding: '12px 28px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: '1rem' }}>
              Crear tu primer tour 3D
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, color: '#e2e8f0', fontSize: '1.25rem' }}>
                Mis proyectos <span style={{ color: '#475569', fontWeight: 400, fontSize: '1rem' }}>({projects.length})</span>
              </h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {projects.map((p) => (
                <ProjectCard key={p.id} project={p} onClick={() => setSelected(p)} />
              ))}
            </div>
          </>
        )}
      </div>

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onCreated={handleCreated} />}

      {/* Project detail drawer */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40 }} onClick={() => setSelected(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 380, background: '#111827', borderLeft: '1px solid #1f2937', padding: 28, overflowY: 'auto' }}>
            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.25rem', marginBottom: 20, padding: 0 }}>×</button>
            <h3 style={{ marginTop: 0 }}>{selected.name}</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
              {VERTICAL_META[selected.vertical]?.icon} {VERTICAL_META[selected.vertical]?.label}
            </p>
            <StatusBadge status={selected.status} />
            {selected.status === 'completed' && (
              <div style={{ marginTop: 20 }}>
                <a href={`/viewer?id=${selected.id}`} style={{ display: 'block', padding: '11px', background: '#3b82f6', color: '#fff', borderRadius: 8, textAlign: 'center', fontWeight: 600, marginBottom: 10 }}>
                  Ver tour 3D
                </a>
                <button style={{ display: 'block', width: '100%', padding: '11px', background: 'transparent', color: '#94a3b8', border: '1px solid #334155', borderRadius: 8, cursor: 'pointer' }}
                  onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/viewer?id=${selected.id}`); }}>
                  Copiar link
                </button>
              </div>
            )}
            {selected.status === 'failed' && selected.error && (
              <div style={{ marginTop: 16, padding: 12, background: '#ef444422', borderRadius: 8, color: '#ef4444', fontSize: '0.8rem' }}>
                {selected.error}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
