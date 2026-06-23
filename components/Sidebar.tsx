'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: '◻' },
  { label: 'Clients', href: '/clients', icon: '◻' },
  { label: 'Tasks', href: '/tasks', icon: '◻' },
  { label: 'Messages', href: '/messages', icon: '◻' },
  { label: 'Files', href: '/files', icon: '◻' },
  { label: 'Invoices', href: '/invoices', icon: '◻' },
  { label: 'Settings', href: '/settings', icon: '◻' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 bg-ink min-h-screen flex flex-col">
      <div className="px-5 py-5 border-b border-white/10">
        <h1 className="text-white text-lg font-bold tracking-tight">GScale Portal</h1>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-butter text-ink'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="px-3 py-4 border-t border-white/10">
        <p className="text-white/30 text-xs px-3">GScale Marketing</p>
      </div>
    </aside>
  )
}
