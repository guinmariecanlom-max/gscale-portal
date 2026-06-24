'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

type Client = {
  id: string
  business_name: string
  contact_name: string | null
  contact_email: string | null
  status: string
  services: string[]
  monthly_retainer: number
  created_at: string
  updated_at: string
}

const statusStyles: Record<string, { bg: string; text: string }> = {
  lead: { bg: '#f1f5f9', text: '#64748b' },
  onboarding: { bg: '#eff6ff', text: '#3b82f6' },
  active: { bg: '#f0fdf4', text: '#16a34a' },
  paused: { bg: '#fef3c7', text: '#d97706' },
  offboarded: { bg: '#fef2f2', text: '#ef4444' },
}

const serviceOptions = [
  'Email Marketing',
  'Meta Ads',
  'Google Ads',
  'Social Media',
  'Strategy',
]

const initColors = ['#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#22c55e', '#ef4444', '#06b6d4', '#84cc16']

const ITEMS_PER_PAGE = 7

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [userRole, setUserRole] = useState('')
  const [stats, setStats] = useState({ totalClients: 0, activeProjects: 0, unpaidInvoices: 0, unpaidAmount: 0, totalRevenue: 0 })

  const [form, setForm] = useState({
    business_name: '',
    contact_name: '',
    contact_email: '',
    status: 'lead',
    services: [] as string[],
    monthly_retainer: '',
    notes: '',
  })

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      const { data: userData } = await supabase.from('users').select('role').eq('id', session.user.id).single()
      if (userData) setUserRole(userData.role)
    }

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) setClients(data)

    const { count: projectCount } = await supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'active')
    const { data: invoicesData } = await supabase.from('invoices').select('amount, status')
    const { data: paidData } = await supabase.from('invoices').select('amount').eq('status', 'paid')

    const unpaid = invoicesData?.filter(i => i.status === 'sent' || i.status === 'overdue') || []
    const totalPaid = paidData?.reduce((s, i) => s + i.amount, 0) || 0

    setStats({
      totalClients: data?.length || 0,
      activeProjects: projectCount || 0,
      unpaidInvoices: unpaid.length,
      unpaidAmount: unpaid.reduce((s, i) => s + i.amount, 0),
      totalRevenue: totalPaid,
    })

    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleServiceToggle = (service: string) => {
    setForm((prev) => ({
      ...prev,
      services: prev.services.includes(service)
        ? prev.services.filter((s) => s !== service)
        : [...prev.services, service],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await supabase.from('clients').insert({
      business_name: form.business_name,
      contact_name: form.contact_name || null,
      contact_email: form.contact_email || null,
      status: form.status,
      services: form.services,
      monthly_retainer: form.monthly_retainer ? parseFloat(form.monthly_retainer) : 0,
      notes: form.notes || null,
    })
    setForm({ business_name: '', contact_name: '', contact_email: '', status: 'lead', services: [], monthly_retainer: '', notes: '' })
    setShowForm(false)
    setSaving(false)
    loadData()
  }

  const getInitials = (name: string) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return mins + 'm ago'
    const hours = Math.floor(mins / 60)
    if (hours < 24) return hours + 'h ago'
    const days = Math.floor(hours / 24)
    if (days < 7) return days + 'd ago'
    const weeks = Math.floor(days / 7)
    return weeks + 'w ago'
  }

  const isAdmin = userRole === 'admin'

  const filteredClients = clients
    .filter(c => {
      if (filter === 'all') return true
      if (filter === 'active') return c.status === 'active'
      if (filter === 'inactive') return c.status === 'paused' || c.status === 'offboarded'
      if (filter === 'archived') return c.status === 'offboarded'
      return true
    })
    .filter(c => {
      if (!search) return true
      const q = search.toLowerCase()
      return c.business_name.toLowerCase().includes(q) || (c.contact_name || '').toLowerCase().includes(q) || (c.contact_email || '').toLowerCase().includes(q)
    })

  const totalPages = Math.ceil(filteredClients.length / ITEMS_PER_PAGE)
  const paginatedClients = filteredClients.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  if (loading) return (<p style={{ color: 'rgba(42,37,32,0.5)' }}>Loading clients...</p>)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-ink">Clients</h2>
          <p className="text-sm mt-1" style={{ color: 'rgba(42,37,32,0.5)' }}>Manage your clients and view their project activity.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-cream bg-white">
            <span style={{ color: 'rgba(42,37,32,0.3)' }}>&#128269;</span>
            <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} placeholder="Search clients..." className="text-sm bg-transparent outline-none w-36" style={{ color: '#2A2520' }} />
          </div>
          <button onClick={() => setShowForm(true)} className="px-4 py-2.5 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#2A2520' }}>+ Add Client</button>
        </div>
      </div>

      {/* Stats Row */}
      <div className={`grid ${isAdmin ? 'grid-cols-4' : 'grid-cols-2'} gap-4 mb-6`}>
        <div className="bg-white rounded-xl p-5 border border-cream">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium" style={{ color: 'rgba(42,37,32,0.5)' }}>Total Clients</p>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FAF8F0' }}>&#128101;</div>
          </div>
          <p className="text-2xl font-bold text-ink">{stats.totalClients}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-cream">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium" style={{ color: 'rgba(42,37,32,0.5)' }}>Active Projects</p>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FAF8F0' }}>&#128197;</div>
          </div>
          <p className="text-2xl font-bold text-ink">{stats.activeProjects}</p>
        </div>
        {isAdmin && (
          <div className="bg-white rounded-xl p-5 border border-cream">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium" style={{ color: 'rgba(42,37,32,0.5)' }}>Unpaid Invoices</p>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FAF8F0' }}>&#128196;</div>
            </div>
            <p className="text-2xl font-bold text-ink">{stats.unpaidInvoices}</p>
            <p className="text-xs mt-1" style={{ color: 'rgba(42,37,32,0.4)' }}>${stats.unpaidAmount.toLocaleString()} outstanding</p>
          </div>
        )}
        {isAdmin && (
          <div className="bg-white rounded-xl p-5 border border-cream">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium" style={{ color: 'rgba(42,37,32,0.5)' }}>Total Revenue</p>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FAF8F0' }}>&#128176;</div>
            </div>
            <p className="text-2xl font-bold text-ink">${stats.totalRevenue.toLocaleString()}</p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-6">
          {[
            { key: 'all', label: 'All Clients' },
            { key: 'active', label: 'Active' },
            { key: 'inactive', label: 'Inactive' },
            { key: 'archived', label: 'Archived' },
          ].map((tab) => (
            <button key={tab.key} onClick={() => { setFilter(tab.key); setPage(1) }} className="pb-2 text-sm font-medium transition-colors" style={{
              color: filter === tab.key ? '#2A2520' : 'rgba(42,37,32,0.4)',
              borderBottom: filter === tab.key ? '2px solid #f59e0b' : '2px solid transparent',
            }}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {paginatedClients.length === 0 ? (
        <div className="bg-white rounded-xl p-12 border border-cream text-center">
          <p className="text-sm" style={{ color: 'rgba(42,37,32,0.4)' }}>No clients found. Click &quot;+ Add Client&quot; to get started.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-cream overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-cream" style={{ backgroundColor: 'rgba(250,248,240,0.5)' }}>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(42,37,32,0.5)' }}>Client</th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(42,37,32,0.5)' }}>Contact</th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(42,37,32,0.5)' }}>Services</th>
                {isAdmin && <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(42,37,32,0.5)' }}>Revenue</th>}
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(42,37,32,0.5)' }}>Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(42,37,32,0.5)' }}>Last Active</th>
                <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(42,37,32,0.5)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedClients.map((client, i) => {
                const ss = statusStyles[client.status] || statusStyles.lead
                const colorIndex = clients.indexOf(client) % initColors.length
                return (
                  <tr key={client.id} className="border-b border-cream/50 hover:bg-cream-light/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: initColors[colorIndex] }}>
                          {getInitials(client.business_name)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-ink">{client.business_name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium" style={{ color: 'rgba(42,37,32,0.8)' }}>{client.contact_name || '-'}</p>
                      <p className="text-xs" style={{ color: 'rgba(42,37,32,0.4)' }}>{client.contact_email || ''}</p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1">
                        {client.services?.length > 0 ? client.services.map((s) => (
                          <span key={s} className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: '#FFFDB4', color: '#2A2520' }}>{s}</span>
                        )) : (
                          <span className="text-xs" style={{ color: 'rgba(42,37,32,0.3)' }}>-</span>
                        )}
                      </div>
                    </td>
                    {isAdmin && (
                      <td className="px-5 py-4 text-right">
                        <p className="text-sm font-semibold text-ink">{client.monthly_retainer > 0 ? '$' + client.monthly_retainer.toLocaleString() : '$0'}</p>
                        <p className="text-xs" style={{ color: 'rgba(42,37,32,0.4)' }}>/month</p>
                      </td>
                    )}
                    <td className="px-5 py-4">
                      <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium capitalize" style={{ backgroundColor: ss.bg, color: ss.text }}>{client.status}</span>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm" style={{ color: 'rgba(42,37,32,0.6)' }}>{new Date(client.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      <p className="text-xs" style={{ color: 'rgba(42,37,32,0.35)' }}>{getTimeAgo(client.updated_at)}</p>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button className="w-8 h-8 rounded-lg border border-cream flex items-center justify-center hover:bg-cream/50 transition-colors" style={{ color: 'rgba(42,37,32,0.4)' }}>&#8942;</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-cream" style={{ backgroundColor: 'rgba(250,248,240,0.3)' }}>
            <p className="text-xs" style={{ color: 'rgba(42,37,32,0.4)' }}>
              Showing {((page - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(page * ITEMS_PER_PAGE, filteredClients.length)} of {filteredClients.length} clients
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="w-8 h-8 rounded-lg border border-cream flex items-center justify-center text-sm disabled:opacity-30" style={{ color: 'rgba(42,37,32,0.5)' }}>&lt;</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => setPage(p)} className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium" style={{
                  backgroundColor: page === p ? '#2A2520' : 'transparent',
                  color: page === p ? '#FFFFFF' : 'rgba(42,37,32,0.5)',
                  border: page === p ? 'none' : '1px solid #EBE3D3',
                }}>{p}</button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || totalPages === 0} className="w-8 h-8 rounded-lg border border-cream flex items-center justify-center text-sm disabled:opacity-30" style={{ color: 'rgba(42,37,32,0.5)' }}>&gt;</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Client Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-cream flex items-center justify-between">
              <h3 className="text-lg font-bold text-ink">Add New Client</h3>
              <button onClick={() => setShowForm(false)} className="text-xl" style={{ color: 'rgba(42,37,32,0.3)' }}>x</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Business Name *</label>
                <input type="text" value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} className="w-full px-4 py-2.5 border border-cream rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ink/20" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Contact Name</label>
                  <input type="text" value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} className="w-full px-4 py-2.5 border border-cream rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ink/20" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Contact Email</label>
                  <input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} className="w-full px-4 py-2.5 border border-cream rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ink/20" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full px-4 py-2.5 border border-cream rounded-lg text-sm bg-white">
                    <option value="lead">Lead</option>
                    <option value="onboarding">Onboarding</option>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="offboarded">Offboarded</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Monthly Retainer ($)</label>
                  <input type="number" value={form.monthly_retainer} onChange={(e) => setForm({ ...form, monthly_retainer: e.target.value })} className="w-full px-4 py-2.5 border border-cream rounded-lg text-sm" placeholder="0" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-2">Services</label>
                <div className="flex flex-wrap gap-2">
                  {serviceOptions.map((service) => (
                    <button key={service} type="button" onClick={() => handleServiceToggle(service)} className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors" style={{
                      backgroundColor: form.services.includes(service) ? '#2A2520' : '#FAF8F0',
                      color: form.services.includes(service) ? '#FFFFFF' : 'rgba(42,37,32,0.6)',
                    }}>{service}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full px-4 py-2.5 border border-cream rounded-lg text-sm h-20 resize-none" placeholder="Any notes about this client..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-cream rounded-lg text-sm font-medium hover:bg-cream/30 transition-colors" style={{ color: 'rgba(42,37,32,0.6)' }}>Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-ink text-white rounded-lg text-sm font-medium hover:bg-ink/90 transition-colors disabled:opacity-50">{saving ? 'Saving...' : 'Add Client'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
