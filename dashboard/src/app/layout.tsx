import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Providers } from './providers'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'SIVAPRE — Dashboard de gestión',
  description:
    'Sistema Integrado de Vigilancia y Predicción en Salud — MINSA Perú',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={`${inter.variable} h-full`}>
      <body className="h-full antialiased font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
