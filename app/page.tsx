'use client';

const VERTICALS = [
  { key: 'real_estate', icon: '🏠', title: 'Inmobiliarias', tagline: 'Virtual tours that sell homes', color: '#3b82f6' },
  { key: 'museum', icon: '🏛️', title: 'Museos', tagline: 'Digitize your exhibits in minutes', color: '#8b5cf6' },
  { key: 'gamedev', icon: '🎮', title: 'Game Dev', tagline: 'Game-ready assets from photos', color: '#10b981' },
  { key: 'events', icon: '🎪', title: 'Eventos', tagline: 'Capture & share your event in 3D', color: '#f59e0b' },
  { key: 'retail', icon: '🛍️', title: 'Retail / F&B', tagline: '360° product showcase online', color: '#ef4444' },
  { key: 'architecture', icon: '🏗️', title: 'Arquitectura', tagline: 'From sketch to render to reality', color: '#06b6d4' },
];

export default function HomePage() {
  return (
    <main style={{ minHeight: '100vh', padding: '0' }}>
      {/* Hero */}
      <section style={{ textAlign: 'center', padding: '80px 20px 60px', background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)' }}>
        <h1 style={{ fontSize: 'clamp(2rem, 6vw, 4rem)', fontWeight: 800, margin: '0 0 16px', background: 'linear-gradient(135deg, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Image-Blaster
        </h1>
        <p style={{ fontSize: '1.25rem', color: '#94a3b8', margin: '0 0 12px', maxWidth: 600, marginLeft: 'auto', marginRight: 'auto' }}>
          3D Reconstruction for Every Space
        </p>
        <p style={{ fontSize: '1rem', color: '#64748b', margin: '0 0 40px' }}>
          Convierte fotos en tours 3D interactivos — para 6 industrias
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="/login" style={{ padding: '14px 32px', background: '#3b82f6', color: '#fff', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: '1rem' }}>
            Empezar gratis
          </a>
          <a href="/dashboard" style={{ padding: '14px 32px', background: 'transparent', color: '#94a3b8', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: '1rem', border: '1px solid #334155' }}>
            Ver demo
          </a>
        </div>
      </section>

      {/* Verticals */}
      <section style={{ padding: '60px 20px', maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', color: '#e2e8f0', marginBottom: 40, fontSize: '1.75rem' }}>
          6 mercados. Una plataforma.
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          {VERTICALS.map((v) => (
            <div key={v.key} style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 12, padding: 24, transition: 'border-color 0.2s', cursor: 'pointer' }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = v.color)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#1f2937')}>
              <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>{v.icon}</div>
              <h3 style={{ color: v.color, margin: '0 0 8px', fontSize: '1.1rem' }}>{v.title}</h3>
              <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.9rem' }}>{v.tagline}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section style={{ padding: '60px 20px', background: '#0f172a' }}>
        <h2 style={{ textAlign: 'center', color: '#e2e8f0', marginBottom: 40, fontSize: '1.75rem' }}>Precios</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, maxWidth: 900, margin: '0 auto' }}>
          {[
            { plan: 'FREE', price: '€0', tours: '2 tours/mes', highlight: false },
            { plan: 'STARTER', price: '€49/mes', tours: '5 tours/mes', highlight: false },
            { plan: 'PRO', price: '€199/mes', tours: 'Tours ilimitados', highlight: true },
            { plan: 'ENTERPRISE', price: '€999/mes', tours: 'Todo ilimitado', highlight: false },
          ].map((p) => (
            <div key={p.plan} style={{ background: p.highlight ? '#1d4ed8' : '#1e293b', border: `1px solid ${p.highlight ? '#3b82f6' : '#334155'}`, borderRadius: 12, padding: 24, textAlign: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#94a3b8', marginBottom: 8 }}>{p.plan}</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', marginBottom: 8 }}>{p.price}</div>
              <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>{p.tours}</div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
