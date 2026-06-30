'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'

const allNavItems = [
  { label: 'Dashboard', href: '/dashboard', adminOnly: false },
  { label: 'Clients', href: '/clients', adminOnly: false },
  { label: 'Tasks', href: '/tasks', adminOnly: false },
  { label: 'Messages', href: '/messages', adminOnly: false },
  { label: 'Files', href: '/files', adminOnly: false },
  { label: 'Invoices', href: '/invoices', adminOnly: true },
  { label: 'Bookings', href: '/bookings', adminOnly: true },
  { label: 'Team', href: '/team', adminOnly: true },
  { label: 'AI Team', href: '/ai-team', adminOnly: false },
  { label: 'Settings', href: '/settings', adminOnly: false },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [userRole, setUserRole] = useState('')

  useEffect(() => {
    const getRole = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const { data } = await supabase.from('users').select('role').eq('id', session.user.id).single()
        if (data) setUserRole(data.role)
      }
    }
    getRole()
  }, [])

  const navItems = allNavItems.filter(item => !item.adminOnly || userRole === 'admin')

  return (
    <aside className="w-56 min-h-screen flex flex-col" style={{ backgroundColor: '#2A2520' }}>
      <div className="px-5 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <h1 className="text-lg font-bold tracking-tight" style={{ color: '#FFFFFF' }}>GScale Portal</h1>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: isActive ? '#FFFDB4' : 'transparent',
                color: isActive ? '#2A2520' : 'rgba(255,255,255,0.7)',
              }}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="px-3 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <p className="text-xs px-3" style={{ color: 'rgba(255,255,255,0.3)' }}>GScale Marketing</p>
      </div>
    </aside>
  )
}
