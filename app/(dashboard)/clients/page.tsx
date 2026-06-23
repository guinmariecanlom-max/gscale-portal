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
}

const statusColors: Record<string, string> = {
  lead: 'bg-gray-100 text-gray-600',
  onboarding: 'bg-blue-50 text-blue-600',
  active: 'bg-green-50 text-green-700',
  paused: 'bg-yellow-50 text-yellow-700',
  offboarded: 'bg-red-50 text-red-600',
}

const serviceOptions = [
  'Email Marketing',
  'Meta Ads',
  'Google Ads',
  'Social Media',
  'Strategy',
]

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('all')

  const [form, setForm] = useState({
    business_name: '',
    contact_name: '',
    contact_email: '',
    status: 'lead',
    services: [] as string[],
    monthly_retainer: '',
    notes: '',
  })

  const loadClients = async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error && data) {
      setClients(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadClients()
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
    const { error } = await supabase.from('clients').insert({
      business_name: form.business_name,
      contact_name: form.contact_name || null,
      contact_email: form.contact_email || null,
      status: form.status,
      services: form.services,
      monthly_retainer: form.monthly_retainer ? parseFloat(form.monthly_retainer) : 0,
      notes: form.notes || null,
    })
    if (!error) {
      setForm({ business_name: '', contact_name: '', contact_email: '', status: 'lead', services: [], monthly_retainer: '', notes: '' })
      setShowForm(false)
      loadClients()
    }
    setSaving(false)
  }

  const filteredClients = filter === 'all' ? clients : clients.filter((c) => c.status === filter)

  if (loading) return <p className="text-ink/50">Loading clients...</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-ink">Clients</h2>
          <p className="text-sm text-ink/50 mt-1">{clients.length} total clients</p>
        </div>
        <button onClick={() => setShowForm(true)} className="px-4 py-2.5 bg-ink text-white rounded-lg text-sm font-medium hover:bg-ink/90 transition-colors">+ Add Client</button>
      </div>

      <div className="flex gap-2 mb-6">
        {['all', 'lead', 'onboarding', 'active', 'paused', 'offboarded'].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${filter === f ? 'bg-ink text-white' : 'bg-white text-ink/60 border border-cream hover:bg-cream/50'}`}>
            {f === 'all' ? `All (${clients.length})` : `${f} (${clients.filter(c => c.status === f).length})`}
          </button>
        ))}
      </div>

      {filteredClients.length === 0 ? (
        <div className="bg-white rounded-xl p-12 border border-cream text-center">
          <p className="text-ink/40 text-sm">No clients yet. Click &quot;+ Add Client&quot; to get started.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-cream overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-cream bg-cream-light/50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-ink/50 uppercase tracking-wider">Business</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-ink/50 uppercase tracking-wider">Contact</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-ink/50 uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-ink/50 uppercase tracking-wider">Services</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-ink/50 uppercase tracking-wider">Retainer</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((client) => (
                <tr key={client.id} className="border-b border-cream/50 hover:bg-cream-light/30 transition-colors cursor-pointer">
                  <td className="px-5 py-4"><p className="font-medium text-ink text-sm">{client.business_name}</p></td>
                  <td className="px-5 py-4"><p className="text-sm text-ink/70">{client.contact_name || '-'}</p><p className="text-xs text-ink/40">{client.contact_email || ''}</p></td>
                  <td className="px-5 py-4"><span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium capitalize ${statusColors[client.status] || 'bg-gray-100 text-gray-600'}`}>{client.status}</span></td>
                  <td className="px-5 py-4"><div className="flex flex-wrap gap-1">{client.services?.map((s) => (<span key={s} className="bg-butter/50 text-ink/70 px-2 py-0.5 rounded text-xs">{s}</span>))}</div></td>
                  <td className="px-5 py-4 text-right"><p className="text-sm font-medium text-ink">{client.monthly_retainer > 0 ? `$${client.monthly_retainer.toLocaleString()}` : '-'}</p></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-cream flex items-center justify-between">
              <h3 className="text-lg font-bold text-ink">Add New Client</h3>
              <button onClick={() => setShowForm(false)} className="text-ink/30 hover:text-ink text-xl">x</button>
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
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full px-4 py-2.5 border border-cream rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ink/20 bg-white">
                    <option value="lead">Lead</option>
                    <option value="onboarding">Onboarding</option>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="offboarded">Offboarded</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Monthly Retainer ($)</label>
                  <input type="number" value={form.monthly_retainer} onChange={(e) => setForm({ ...form, monthly_retainer: e.target.value })} className="w-full px-4 py-2.5 border border-cream rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ink/20" placeholder="0" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-2">Services</label>
                <div className="flex flex-wrap gap-2">
                  {serviceOptions.map((service) => (
                    <button key={service} type="button" onClick={() => handleServiceToggle(service)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${form.services.includes(service) ? 'bg-ink text-white' : 'bg-cream/50 text-ink/60 hover:bg-cream'}`}>{service}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full px-4 py-2.5 border border-cream rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ink/20 h-20 resize-none" placeholder="Any notes about this client..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-cream rounded-lg text-sm font-medium text-ink/60 hover:bg-cream/30 transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-ink text-white rounded-lg text-sm font-medium hover:bg-ink/90 transition-colors disabled:opacity-50">{saving ? 'Saving...' : 'Add Client'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
