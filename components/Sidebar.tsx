'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

const navItems = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Clients', href: '/clients' },
  { label: 'Tasks', href: '/tasks' },
  { label: 'Messages', href: '/messages' },
  { label: 'Files', href: '/files' },
  { label: 'Invoices', href: '/invoices' },
  { label: 'Bookings', href: '/bookings' },
  { label: 'Settings', href: '/settings' },
]

export default function Sidebar() {
  const pathname = usePathname()

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
