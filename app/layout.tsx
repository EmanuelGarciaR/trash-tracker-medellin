import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'TrashTracker · Medellín',
  description: 'Sistema de monitoreo inteligente de contenedores de basura en Medellín',
  icons: {
    icon: '/trashTrackerIcon.png',
    apple: '/trashTrackerIcon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
