'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

type Invoice = {
  id: string
  invoice_number: string
  amount: number
  currency: string
  status: string
  due_date: string
  payment_method: string | null
  payment_link: string | null
  paid_at: string | null
  client_id: string
  created_at: string
  clients?: { business_name: string }
}

type Client = {
  id: string
  business_name: string
}

const statusColors: Record<string, { bg: string; text: string }> = {
  draft: { bg: '#f1f5f9', text: '#64748b' },
  sent: { bg: '#eff6ff', text: '#3b82f6' },
  paid: { bg: '#f0fdf4', text: '#16a34a' },
  overdue: { bg: '#fef2f2', text: '#ef4444' },
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('all')

  const [form, setForm] = useState({
    client_id: '',
    amount: '',
    currency: 'USD',
    due_date: '',
    payment_method: 'paypal',
    payment_link: '',
  })

  const loadData = async () => {
    const { data: invoicesData } = await supabase
      .from('invoices')
      .select('*, clients(business_name)')
      .order('created_at', { ascending: false })

    const { data: clientsData } = await supabase
      .from('clients')
      .select('id, business_name')
      .order('business_name')

    if (invoicesData) setInvoices(invoicesData)
    if (clientsData) setClients(clientsData)
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const generateInvoiceNumber = () => {
    const now = new Date()
    const y = now.getFullYear().toString().slice(-2)
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const r = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    return `GS-${y}${m}-${r}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const { error } = await supabase.from('invoices').insert({
      invoice_number: generateInvoiceNumber(),
      client_id: form.client_id,
      amount: parseFloat(form.amount),
      currency: form.currency,
      status: 'draft',
      due_date: form.due_date,
      payment_method: form.payment_method,
      payment_link: form.payment_link || null,
    })

    if (!error) {
      setForm({ client_id: '', amount: '', currency: 'USD', due_date: '', payment_method: 'paypal', payment_link: '' })
      setShowForm(false)
      loadData()
    }
    setSaving(false)
  }

  const updateStatus = async (id: string, newStatus: string) => {
    const updates: Record<string, unknown> = { status: newStatus }
    if (newStatus === 'paid') {
      updates.paid_at = new Date().toISOString()
    }
    await supabase.from('invoices').update(updates).eq('id', id)
    loadData()
  }

  const totalOutstanding = invoices
    .filter(i => i.status === 'sent' || i.status === 'overdue')
    .reduce((sum, i) => sum + i.amount, 0)

  const totalPaid = invoices
    .filter(i => i.status === 'paid')
    .reduce((sum, i) => sum + i.amount, 0)

  const filteredInvoices = filter === 'all' ? invoices : invoices.filter(i => i.status === filter)

  if (loading) return <p style={{ color: 'rgba(42,37,32,0.5)' }}>Loading invoices...</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-ink">Invoices</h2>
          <p className="text-sm mt-1" style={{ color: 'rgba(42,37,32,0.5)' }}>{invoices.length} total invoices</p>
        </div>
        <button onClick={() => setShowForm(true)} className="px-4 py-2.5 bg-ink text-white rounded-lg text-sm font-medium hover:bg-ink/90 transition-colors">+ New Invoice</button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-5 border border-cream">
          <p className="text-xs font-medium" style={{ color: 'rgba(42,37,32,0.5)' }}>Outstanding</p>
          <p className="text-2xl font-bold text-ink mt-1">${totalOutstanding.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-cream">
          <p className="text-xs font-medium" style={{ color: 'rgba(42,37,32,0.5)' }}>Collected</p>
          <p className="text-2xl font-bold mt-1" style={{ color: '#16a34a' }}>${totalPaid.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-cream">
          <p className="text-xs font-medium" style={{ color: 'rgba(42,37,32,0.5)' }}>Overdue</p>
          <p className="text-2xl font-bold mt-1" style={{ color: '#ef4444' }}>${invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.amount, 0).toLocaleString()}</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {['all', 'draft', 'sent', 'paid', 'overdue'].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className="px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors" style={{ backgroundColor: filter === f ? '#2A2520' : '#FFFFFF', color: filter === f ? '#FFFFFF' : 'rgba(42,37,32,0.6)', border: filter === f ? 'none' : '1px solid #EBE3D3' }}>
            {f === 'all' ? `All (${invoices.length})` : `${f} (${invoices.filter(i => i.status === f).length})`}
          </button>
        ))}
      </div>

      {filteredInvoices.length === 0 ? (
        <div className="bg-white rounded-xl p-12 border border-cream text-center">
          <p className="text-sm" style={{ color: 'rgba(42,37,32,0.4)' }}>No invoices yet. Click &quot;+ New Invoice&quot; to create one.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-cream overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-cream" style={{ backgroundColor: 'rgba(250,248,240,0.5)' }}>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(42,37,32,0.5)' }}>Invoice</th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(42,37,32,0.5)' }}>Client</th>
                <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(42,37,32,0.5)' }}>Amount</th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(42,37,32,0.5)' }}>Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(42,37,32,0.5)' }}>Due</th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(42,37,32,0.5)' }}>Payment</th>
                <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(42,37,32,0.5)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((inv) => {
                const sc = statusColors[inv.status] || statusColors.draft
                return (
                  <tr key={inv.id} className="border-b border-cream/50 hover:bg-cream-light/30 transition-colors">
                    <td className="px-5 py-4">
                      <p className="text-sm font-mono font-medium text-ink">{inv.invoice_number}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm" style={{ color: 'rgba(42,37,32,0.7)' }}>{inv.clients?.business_name || '-'}</p>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <p className="text-sm font-semibold text-ink">${inv.amount.toLocaleString()}</p>
                      <p className="text-xs" style={{ color: 'rgba(42,37,32,0.4)' }}>{inv.currency}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium capitalize" style={{ backgroundColor: sc.bg, color: sc.text }}>{inv.status}</span>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm" style={{ color: 'rgba(42,37,32,0.6)' }}>{new Date(inv.due_date).toLocaleDateString()}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-xs font-medium capitalize" style={{ color: 'rgba(42,37,32,0.5)' }}>{inv.payment_method || '-'}</p>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex gap-1 justify-end">
                        {inv.status === 'draft' && (
                          <button onClick={() => updateStatus(inv.id, 'sent')} className="text-xs px-2.5 py-1 rounded border border-cream hover:bg-cream/50" style={{ color: '#3b82f6' }}>Mark Sent</button>
                        )}
                        {(inv.status === 'sent' || inv.status === 'overdue') && (
                          <button onClick={() => updateStatus(inv.id, 'paid')} className="text-xs px-2.5 py-1 rounded border border-cream hover:bg-cream/50" style={{ color: '#16a34a' }}>Mark Paid</button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-cream flex items-center justify-between">
              <h3 className="text-lg font-bold text-ink">New Invoice</h3>
              <button onClick={() => setShowForm(false)} className="text-xl" style={{ color: 'rgba(42,37,32,0.3)' }}>x</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Client *</label>
                <select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} className="w-full px-4 py-2.5 border border-cream rounded-lg text-sm bg-white" required>
                  <option value="">Select a client</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.business_name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Amount *</label>
                  <input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="w-full px-4 py-2.5 border border-cream rounded-lg text-sm" placeholder="0.00" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Currency</label>
                  <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="w-full px-4 py-2.5 border border-cream rounded-lg text-sm bg-white">
                    <option value="USD">USD</option>
                    <option value="GBP">GBP</option>
                    <option value="AUD">AUD</option>
                    <option value="CAD">CAD</option>
                    <option value="PHP">PHP</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Due Date *</label>
                  <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="w-full px-4 py-2.5 border border-cream rounded-lg text-sm" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Payment Method</label>
                  <select value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} className="w-full px-4 py-2.5 border border-cream rounded-lg text-sm bg-white">
                    <option value="paypal">PayPal</option>
                    <option value="wise">Wise</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Payment Link</label>
                <input type="url" value={form.payment_link} onChange={(e) => setForm({ ...form, payment_link: e.target.value })} className="w-full px-4 py-2.5 border border-cream rounded-lg text-sm" placeholder="https://paypal.me/..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-cream rounded-lg text-sm font-medium hover:bg-cream/30 transition-colors" style={{ color: 'rgba(42,37,32,0.6)' }}>Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-ink text-white rounded-lg text-sm font-medium hover:bg-ink/90 transition-colors disabled:opacity-50">{saving ? 'Creating...' : 'Create Invoice'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
