import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Sidebar } from '@/components/layout/sidebar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Goldbar Command Center',
  description: 'Client & VA Account Management Command Center',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-50 dark:bg-slate-900`}>
        <Sidebar />
        <main className="ml-64 min-h-screen">
          {children}
        </main>
      </body>
    </html>
  )
}
