'use client'

import Sidebar from '@/components/Sidebar'
import { SessionProvider } from 'next-auth/react'

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SessionProvider>
      <Sidebar />
      <main className="main-content">
        {children}
      </main>
    </SessionProvider>
  )
}
