import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { cookies } from 'next/headers'
import './globals.css'
import { Sidebar } from '@/components/layout/sidebar'
import { isValidSessionToken } from '@/lib/auth'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Goldbar Command Center',
  description: 'Client & VA Account Management Command Center',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies()
  const session = cookieStore.get('session')?.value
  const authenticated = isValidSessionToken(session ?? '')

  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-50 dark:bg-slate-900`}>
        {authenticated && <Sidebar />}
        <main className={authenticated ? 'ml-64 min-h-screen' : 'min-h-screen'}>
          {children}
        </main>
      </body>
    </html>
  )
}
