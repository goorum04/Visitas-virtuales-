import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Image-Blaster — 3D Reconstruction for Every Space',
  description: 'Convert photos into interactive 3D experiences for real estate, museums, game dev, events, retail, and architecture.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#0a0a0a', color: '#fff' }}>
        {children}
      </body>
    </html>
  );
}
