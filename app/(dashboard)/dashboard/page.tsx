'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-ink/50">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream-light">
      {/* Top Bar */}
      <header className="bg-white border-b border-cream px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink">GScale Portal</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-ink/60">{user?.email}</span>
          <button
            onClick={handleLogout}
            className="text-sm text-ink/50 hover:text-ink transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-bold text-ink mb-6">
          Welcome, {user?.full_name}
        </h2>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Active Clients', value: '0' },
            { label: 'Open Tasks', value: '0' },
            { label: 'Pending Invoices', value: '0' },
            { label: 'Unread Messages', value: '0' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-xl p-5 border border-cream"
            >
              <p className="text-sm text-ink/50">{stat.label}</p>
              <p className="text-3xl font-bold text-ink mt-1">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Placeholder Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-6 border border-cream">
            <h3 className="text-lg font-bold text-ink mb-3">Today&apos;s Priorities</h3>
            <p className="text-ink/40 text-sm">No tasks yet. Phase 3 will add task management.</p>
          </div>
          <div className="bg-white rounded-xl p-6 border border-cream">
            <h3 className="text-lg font-bold text-ink mb-3">Recent Activity</h3>
            <p className="text-ink/40 text-sm">No activity yet. This will populate as you use the portal.</p>
          </div>
        </div>
      </main>
    </div>
  )
}
