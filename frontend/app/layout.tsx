import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Image-Blaster — 3D Reconstruction for Every Space',
  description: 'Convert photos into interactive 3D experiences for real estate, museums, game dev, events, retail, and architecture.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
