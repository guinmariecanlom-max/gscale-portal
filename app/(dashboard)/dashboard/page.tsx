'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

export default function DashboardPage() {
  const [stats, setStats] = useState({
    clients: 0,
    tasks: 0,
    invoices: 0,
    messages: 0,
  })
  const [userName, setUserName] = useState('')

  useEffect(() => {
    const loadData = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setUserName(session.user.user_metadata?.full_name || 'there')
      }

      const { count: clientCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })

      const { count: taskCount } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .neq('status', 'done')

      const { count: invoiceCount } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .in('status', ['sent', 'overdue'])

      setStats({
        clients: clientCount || 0,
        tasks: taskCount || 0,
        invoices: invoiceCount || 0,
        messages: 0,
      })
    }
    loadData()
  }, [])

  return (
    <div>
      <h2 className="text-2xl font-bold text-ink mb-6">
        Welcome, {userName}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Active Clients', value: stats.clients },
          { label: 'Open Tasks', value: stats.tasks },
          { label: 'Pending Invoices', value: stats.invoices },
          { label: 'Unread Messages', value: stats.messages },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl p-5 border border-cream">
            <p className="text-sm text-ink/50">{stat.label}</p>
            <p className="text-3xl font-bold text-ink mt-1">{stat.value}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 border border-cream">
          <h3 className="text-lg font-bold text-ink mb-3">Today&apos;s Priorities</h3>
          <p className="text-ink/40 text-sm">No tasks yet. Add clients and tasks to see priorities here.</p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-cream">
          <h3 className="text-lg font-bold text-ink mb-3">Recent Activity</h3>
          <p className="text-ink/40 text-sm">No activity yet. This will populate as you use the portal.</p>
        </div>
      </div>
    </div>
  )
}
