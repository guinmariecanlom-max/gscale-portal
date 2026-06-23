'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<{ email?: string; full_name?: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }
      setUser({
        email: session.user.email,
        full_name: session.user.user_metadata?.full_name || 'Team Member',
      })
      setLoading(false)
    }
    getUser()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-light">
        <p className="text-ink/50">Loading...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-cream-light">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b border-cream px-6 py-3 flex items-center justify-end gap-4">
          <span className="text-sm text-ink/60">{user?.full_name}</span>
          <span className="text-sm text-ink/30">|</span>
          <span className="text-sm text-ink/40">{user?.email}</span>
          <button
            onClick={handleLogout}
            className="text-sm text-ink/40 hover:text-ink transition-colors ml-2"
          >
            Sign out
          </button>
        </header>
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
