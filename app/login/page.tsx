'use client';

import { useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const VERTICALS = [
  { key: 'real_estate', label: '🏠 Inmobiliarias' },
  { key: 'museum', label: '🏛️ Museos' },
  { key: 'gamedev', label: '🎮 Game Dev' },
  { key: 'events', label: '🎪 Eventos' },
  { key: 'retail', label: '🛍️ Retail' },
  { key: 'architecture', label: '🏗️ Arquitectura' },
];

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [vertical, setVertical] = useState('real_estate');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const endpoint = mode === 'login' ? '/auth/login' : '/auth/signup';
    const body = mode === 'signup' ? { email, password, vertical } : { email, password };

    try {
      const res = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Error');
      localStorage.setItem('token', data.data.token);
      window.location.href = '/dashboard';
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 400, background: '#111827', border: '1px solid #1f2937', borderRadius: 16, padding: 32 }}>
        <h1 style={{ textAlign: 'center', marginTop: 0, marginBottom: 8, fontSize: '1.5rem' }}>Image-Blaster</h1>
        <p style={{ textAlign: 'center', color: '#94a3b8', marginTop: 0, marginBottom: 28 }}>
          {mode === 'login' ? 'Inicia sesión' : 'Crea tu cuenta'}
        </p>

        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', marginBottom: 16 }}>
            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ display: 'block', width: '100%', padding: '10px 12px', marginTop: 4, background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#fff', fontSize: '1rem', boxSizing: 'border-box' }}
            />
          </label>

          <label style={{ display: 'block', marginBottom: mode === 'signup' ? 16 : 20 }}>
            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Contraseña</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ display: 'block', width: '100%', padding: '10px 12px', marginTop: 4, background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#fff', fontSize: '1rem', boxSizing: 'border-box' }}
            />
          </label>

          {mode === 'signup' && (
            <label style={{ display: 'block', marginBottom: 20 }}>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Tu industria</span>
              <select
                value={vertical}
                onChange={(e) => setVertical(e.target.value)}
                style={{ display: 'block', width: '100%', padding: '10px 12px', marginTop: 4, background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#fff', fontSize: '1rem', boxSizing: 'border-box' }}>
                {VERTICALS.map((v) => (
                  <option key={v.key} value={v.key}>{v.label}</option>
                ))}
              </select>
            </label>
          )}

          {error && <p style={{ color: '#ef4444', fontSize: '0.875rem', marginBottom: 12 }}>{error}</p>}

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '12px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, fontSize: '1rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Cargando...' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </form>

        <p style={{ textAlign: 'center', color: '#64748b', marginTop: 20, marginBottom: 0, fontSize: '0.875rem' }}>
          {mode === 'login' ? '¿Sin cuenta? ' : '¿Ya tienes cuenta? '}
          <button
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '0.875rem', padding: 0 }}>
            {mode === 'login' ? 'Regístrate' : 'Inicia sesión'}
          </button>
        </p>
      </div>
    </main>
  );
}
