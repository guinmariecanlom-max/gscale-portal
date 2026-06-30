'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'

type Client = {
  id: string
  business_name: string
  contact_name: string | null
  contact_email: string | null
  status: string
  services: string[]
  monthly_retainer: number
  notes: string | null
  created_at: string
  updated_at: string
}

type Assignment = {
  id: string
  client_id: string
  team_member_user_id: string
  role_on_account: string
  users?: { full_name: string; email: string }
}

type FileRecord = {
  id: string
  file_name: string
  file_path: string
  file_type: string | null
  file_size: number | null
  category: string
  created_at: string
  users?: { full_name: string }
}

type UserProfile = {
  id: string
  full_name: string
  email: string
  role: string
}

const statusStyles: Record<string, { bg: string; text: string }> = {
  lead: { bg: '#f1f5f9', text: '#64748b' },
  onboarding: { bg: '#eff6ff', text: '#3b82f6' },
  active: { bg: '#f0fdf4', text: '#16a34a' },
  paused: { bg: '#fef3c7', text: '#d97706' },
  offboarded: { bg: '#fef2f2', text: '#ef4444' },
}

const serviceOptions = ['Email Marketing', 'Meta Ads', 'Google Ads', 'Social Media', 'Strategy']
const initColors = ['#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#22c55e', '#ef4444', '#06b6d4', '#84cc16']
const ITEMS_PER_PAGE = 7

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [allUsers, setAllUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [userRole, setUserRole] = useState('')
  const [userId, setUserId] = useState('')
  const [stats, setStats] = useState({ totalClients: 0, activeProjects: 0, unpaidInvoices: 0, unpaidAmount: 0, totalRevenue: 0 })

  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [detailTab, setDetailTab] = useState<'overview' | 'team' | 'files'>('overview')
  const [clientFiles, setClientFiles] = useState<FileRecord[]>([])
  const [clientAssignments, setClientAssignments] = useState<Assignment[]>([])
  const [uploading, setUploading] = useState(false)
  const [assignUserId, setAssignUserId] = useState('')
  const [assignRole, setAssignRole] = useState('')
  const [showAddLink, setShowAddLink] = useState(false)
  const [linkName, setLinkName] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pasteAreaRef = useRef<HTMLDivElement>(null)

  const [form, setForm] = useState({
    business_name: '', contact_name: '', contact_email: '', status: 'lead',
    services: [] as string[], monthly_retainer: '', notes: '',
    assigned_users: [] as { user_id: string; role: string }[],
  })

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      setUserId(session.user.id)
      const { data: userData } = await supabase.from('users').select('role').eq('id', session.user.id).single()
      if (userData) setUserRole(userData.role)
    }
    const { data } = await supabase.from('clients').select('*').order('created_at', { ascending: false })
    const { data: assignData } = await supabase.from('team_assignments').select('*, users:team_member_user_id(full_name, email)')
    const { data: usersData } = await supabase.from('users').select('id, full_name, email, role')
    if (data) setClients(data)
    if (assignData) setAssignments(assignData)
    if (usersData) setAllUsers(usersData)

    const { count: projectCount } = await supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'active')
    const { data: invoicesData } = await supabase.from('invoices').select('amount, status')
    const { data: paidData } = await supabase.from('invoices').select('amount').eq('status', 'paid')
    const unpaid = invoicesData?.filter(i => i.status === 'sent' || i.status === 'overdue') || []
    setStats({
      totalClients: data?.length || 0, activeProjects: projectCount || 0,
      unpaidInvoices: unpaid.length, unpaidAmount: unpaid.reduce((s, i) => s + i.amount, 0),
      totalRevenue: paidData?.reduce((s, i) => s + i.amount, 0) || 0,
    })
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const loadClientDetails = async (client: Client) => {
    setSelectedClient(client)
    setDetailTab('overview')
    setShowAddLink(false)
    const { data: filesData } = await supabase.from('files').select('*, users:uploaded_by(full_name)').eq('client_id', client.id).order('created_at', { ascending: false })
    const { data: assignData } = await supabase.from('team_assignments').select('*, users:team_member_user_id(full_name, email)').eq('client_id', client.id)
    if (filesData) setClientFiles(filesData)
    if (assignData) setClientAssignments(assignData)
  }

  const handleServiceToggle = (service: string) => {
    setForm(prev => ({ ...prev, services: prev.services.includes(service) ? prev.services.filter(s => s !== service) : [...prev.services, service] }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const { data: newClient, error } = await supabase.from('clients').insert({
      business_name: form.business_name, contact_name: form.contact_name || null,
      contact_email: form.contact_email || null, status: form.status, services: form.services,
      monthly_retainer: form.monthly_retainer ? parseFloat(form.monthly_retainer) : 0, notes: form.notes || null,
    }).select().single()
    if (!error && newClient) {
      for (const assign of form.assigned_users) {
        await supabase.from('team_assignments').insert({ client_id: newClient.id, team_member_user_id: assign.user_id, role_on_account: assign.role })
      }
    }
    setForm({ business_name: '', contact_name: '', contact_email: '', status: 'lead', services: [], monthly_retainer: '', notes: '', assigned_users: [] })
    setShowForm(false)
    setSaving(false)
    loadData()
  }

  const addFormAssignment = () => {
    if (!assignUserId || !assignRole) return
    if (form.assigned_users.some(a => a.user_id === assignUserId)) return
    setForm(prev => ({ ...prev, assigned_users: [...prev.assigned_users, { user_id: assignUserId, role: assignRole }] }))
    setAssignUserId('')
    setAssignRole('')
  }

  const removeFormAssignment = (uid: string) => {
    setForm(prev => ({ ...prev, assigned_users: prev.assigned_users.filter(a => a.user_id !== uid) }))
  }

  const assignToClient = async () => {
    if (!selectedClient || !assignUserId || !assignRole) return
    await supabase.from('team_assignments').insert({ client_id: selectedClient.id, team_member_user_id: assignUserId, role_on_account: assignRole })
    setAssignUserId('')
    setAssignRole('')
    loadClientDetails(selectedClient)
    loadData()
  }

  const removeAssignment = async (id: string) => {
    await supabase.from('team_assignments').delete().eq('id', id)
    if (selectedClient) loadClientDetails(selectedClient)
    loadData()
  }

  const uploadFile = async (file: File, category: string = 'other') => {
    if (!selectedClient || !userId) return
    setUploading(true)
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const filePath = `${selectedClient.id}/${Date.now()}-${safeName}`
    const { error: uploadError } = await supabase.storage.from('files').upload(filePath, file)
    if (uploadError) { setUploading(false); return }
    await supabase.from('files').insert({
      client_id: selectedClient.id, uploaded_by: userId, file_name: file.name,
      file_path: filePath, file_type: file.type, file_size: file.size, category,
    })
    setUploading(false)
    loadClientDetails(selectedClient)
  }

  const addLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!linkUrl.trim() || !selectedClient || !userId) return
    let url = linkUrl.trim()
    if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url
    await supabase.from('files').insert({
      client_id: selectedClient.id, uploaded_by: userId,
      file_name: linkName.trim() || url, file_path: url, file_type: 'link', file_size: 0, category: 'other',
    })
    setLinkName('')
    setLinkUrl('')
    setShowAddLink(false)
    loadClientDetails(selectedClient)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) Array.from(files).forEach(f => uploadFile(f))
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) {
          const ext = file.type.split('/')[1] || 'png'
          const named = new File([file], `pasted-image-${Date.now()}.${ext}`, { type: file.type })
          uploadFile(named, 'asset')
        }
      }
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const files = e.dataTransfer?.files
    if (files) Array.from(files).forEach(f => uploadFile(f))
  }

  const deleteFile = async (id: string, filePath: string, fileType: string | null) => {
    if (fileType !== 'link') await supabase.storage.from('files').remove([filePath])
    await supabase.from('files').delete().eq('id', id)
    if (selectedClient) loadClientDetails(selectedClient)
  }

  const getDownloadUrl = (filePath: string) => {
    const { data } = supabase.storage.from('files').getPublicUrl(filePath)
    return data.publicUrl
  }

  const getInitials = (name: string) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  const getColor = (id: string) => { let h = 0; for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h); return initColors[Math.abs(h) % initColors.length] }
  const formatSize = (bytes: number | null) => { if (!bytes) return '-'; if (bytes < 1024) return bytes + ' B'; if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'; return (bytes / 1048576).toFixed(1) + ' MB' }
  const getTimeAgo = (d: string) => { const diff = Date.now() - new Date(d).getTime(); const m = Math.floor(diff / 60000); if (m < 60) return m + 'm ago'; const h = Math.floor(m / 60); if (h < 24) return h + 'h ago'; const days = Math.floor(h / 24); if (days < 7) return days + 'd ago'; return Math.floor(days / 7) + 'w ago' }
  const getLinkDomain = (url: string) => { try { return new URL(url).hostname.replace('www.', '') } catch { return url } }

  const isAdmin = userRole === 'admin'
  const teamUsers = allUsers.filter(u => u.role !== 'client')

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
    <div className="flex gap-0">
      <div className={`${selectedClient ? 'flex-1' : 'w-full'} transition-all`}>
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

        <div className="flex gap-6 mb-4">
          {[{ key: 'all', label: 'All Clients' }, { key: 'active', label: 'Active' }, { key: 'inactive', label: 'Inactive' }, { key: 'archived', label: 'Archived' }].map((tab) => (
            <button key={tab.key} onClick={() => { setFilter(tab.key); setPage(1) }} className="pb-2 text-sm font-medium" style={{
              color: filter === tab.key ? '#2A2520' : 'rgba(42,37,32,0.4)',
              borderBottom: filter === tab.key ? '2px solid #f59e0b' : '2px solid transparent',
            }}>{tab.label}</button>
          ))}
        </div>

        {paginatedClients.length === 0 ? (
          <div className="bg-white rounded-xl p-12 border border-cream text-center">
            <p className="text-sm" style={{ color: 'rgba(42,37,32,0.4)' }}>No clients found.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-cream overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-cream" style={{ backgroundColor: 'rgba(250,248,240,0.5)' }}>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(42,37,32,0.5)' }}>Client</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(42,37,32,0.5)' }}>Contact</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(42,37,32,0.5)' }}>Assigned</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(42,37,32,0.5)' }}>Status</th>
                  {isAdmin && <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(42,37,32,0.5)' }}>Revenue</th>}
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(42,37,32,0.5)' }}>Last Active</th>
                </tr>
              </thead>
              <tbody>
                {paginatedClients.map((client) => {
                  const ss = statusStyles[client.status] || statusStyles.lead
                  const colorIndex = clients.indexOf(client) % initColors.length
                  const clientAssigns = assignments.filter(a => a.client_id === client.id)
                  return (
                    <tr key={client.id} onClick={() => loadClientDetails(client)} className="border-b border-cream/50 hover:bg-cream-light/30 transition-colors cursor-pointer">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: initColors[colorIndex] }}>{getInitials(client.business_name)}</div>
                          <p className="text-sm font-semibold text-ink">{client.business_name}</p>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm font-medium" style={{ color: 'rgba(42,37,32,0.8)' }}>{client.contact_name || '-'}</p>
                        <p className="text-xs" style={{ color: 'rgba(42,37,32,0.4)' }}>{client.contact_email || ''}</p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex -space-x-2">
                          {clientAssigns.slice(0, 3).map((a) => (
                            <div key={a.id} className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 border-white" style={{ backgroundColor: getColor(a.team_member_user_id) }} title={a.users?.full_name || a.role_on_account}>{getInitials(a.users?.full_name || a.users?.email || '?')}</div>
                          ))}
                          {clientAssigns.length > 3 && <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium border-2 border-white" style={{ backgroundColor: '#EBE3D3', color: 'rgba(42,37,32,0.5)' }}>+{clientAssigns.length - 3}</div>}
                          {clientAssigns.length === 0 && <span className="text-xs" style={{ color: 'rgba(42,37,32,0.3)' }}>None</span>}
                        </div>
                      </td>
                      <td className="px-5 py-4"><span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium capitalize" style={{ backgroundColor: ss.bg, color: ss.text }}>{client.status}</span></td>
                      {isAdmin && (
                        <td className="px-5 py-4 text-right">
                          <p className="text-sm font-semibold text-ink">{client.monthly_retainer > 0 ? '$' + client.monthly_retainer.toLocaleString() : '$0'}</p>
                          <p className="text-xs" style={{ color: 'rgba(42,37,32,0.4)' }}>/month</p>
                        </td>
                      )}
                      <td className="px-5 py-4">
                        <p className="text-sm" style={{ color: 'rgba(42,37,32,0.6)' }}>{new Date(client.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                        <p className="text-xs" style={{ color: 'rgba(42,37,32,0.35)' }}>{getTimeAgo(client.updated_at)}</p>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div className="flex items-center justify-between px-5 py-3 border-t border-cream" style={{ backgroundColor: 'rgba(250,248,240,0.3)' }}>
              <p className="text-xs" style={{ color: 'rgba(42,37,32,0.4)' }}>Showing {((page - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(page * ITEMS_PER_PAGE, filteredClients.length)} of {filteredClients.length} clients</p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="w-8 h-8 rounded-lg border border-cream flex items-center justify-center text-sm disabled:opacity-30" style={{ color: 'rgba(42,37,32,0.5)' }}>&lt;</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button key={p} onClick={() => setPage(p)} className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium" style={{ backgroundColor: page === p ? '#2A2520' : 'transparent', color: page === p ? '#FFFFFF' : 'rgba(42,37,32,0.5)', border: page === p ? 'none' : '1px solid #EBE3D3' }}>{p}</button>
                ))}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || totalPages === 0} className="w-8 h-8 rounded-lg border border-cream flex items-center justify-center text-sm disabled:opacity-30" style={{ color: 'rgba(42,37,32,0.5)' }}>&gt;</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Client Detail Panel */}
      {selectedClient && (
        <div className="w-96 ml-6 bg-white rounded-xl border border-cream flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 130px)' }}>
          <div className="px-5 py-4 border-b border-cream flex items-center justify-between">
            <h3 className="text-base font-semibold text-ink">{selectedClient.business_name}</h3>
            <button onClick={() => setSelectedClient(null)} className="text-lg" style={{ color: 'rgba(42,37,32,0.3)' }}>x</button>
          </div>

          <div className="flex border-b border-cream">
            {(['overview', 'team', 'files'] as const).map(tab => (
              <button key={tab} onClick={() => { setDetailTab(tab); setShowAddLink(false) }} className="flex-1 py-3 text-xs font-medium capitalize" style={{
                color: detailTab === tab ? '#2A2520' : 'rgba(42,37,32,0.4)',
                borderBottom: detailTab === tab ? '2px solid #f59e0b' : '2px solid transparent',
              }}>{tab}</button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {detailTab === 'overview' && (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium mb-1" style={{ color: 'rgba(42,37,32,0.4)' }}>Status</p>
                  <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium capitalize" style={{ backgroundColor: (statusStyles[selectedClient.status] || statusStyles.lead).bg, color: (statusStyles[selectedClient.status] || statusStyles.lead).text }}>{selectedClient.status}</span>
                </div>
                <div>
                  <p className="text-xs font-medium mb-1" style={{ color: 'rgba(42,37,32,0.4)' }}>Contact</p>
                  <p className="text-sm text-ink">{selectedClient.contact_name || '-'}</p>
                  <p className="text-xs" style={{ color: 'rgba(42,37,32,0.5)' }}>{selectedClient.contact_email || ''}</p>
                </div>
                <div>
                  <p className="text-xs font-medium mb-1" style={{ color: 'rgba(42,37,32,0.4)' }}>Services</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedClient.services?.length > 0 ? selectedClient.services.map(s => (
                      <span key={s} className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: '#FFFDB4', color: '#2A2520' }}>{s}</span>
                    )) : <span className="text-xs" style={{ color: 'rgba(42,37,32,0.3)' }}>None</span>}
                  </div>
                </div>
                {isAdmin && (
                  <div>
                    <p className="text-xs font-medium mb-1" style={{ color: 'rgba(42,37,32,0.4)' }}>Monthly Retainer</p>
                    <p className="text-lg font-bold text-ink">${selectedClient.monthly_retainer.toLocaleString()}</p>
                  </div>
                )}
                {selectedClient.notes && (
                  <div>
                    <p className="text-xs font-medium mb-1" style={{ color: 'rgba(42,37,32,0.4)' }}>Notes</p>
                    <p className="text-sm" style={{ color: 'rgba(42,37,32,0.7)' }}>{selectedClient.notes}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium mb-1" style={{ color: 'rgba(42,37,32,0.4)' }}>Created</p>
                  <p className="text-sm" style={{ color: 'rgba(42,37,32,0.6)' }}>{new Date(selectedClient.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                </div>
              </div>
            )}

            {detailTab === 'team' && (
              <div>
                <div className="space-y-3 mb-6">
                  {clientAssignments.length === 0 && <p className="text-sm py-4 text-center" style={{ color: 'rgba(42,37,32,0.3)' }}>No team members assigned.</p>}
                  {clientAssignments.map(a => (
                    <div key={a.id} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: '#FAF8F0' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: getColor(a.team_member_user_id) }}>{getInitials(a.users?.full_name || a.users?.email || '?')}</div>
                        <div>
                          <p className="text-sm font-medium text-ink">{a.users?.full_name || a.users?.email}</p>
                          <p className="text-xs" style={{ color: 'rgba(42,37,32,0.4)' }}>{a.role_on_account}</p>
                        </div>
                      </div>
                      <button onClick={() => removeAssignment(a.id)} className="text-xs px-2 py-1 rounded hover:bg-red-50" style={{ color: '#ef4444' }}>Remove</button>
                    </div>
                  ))}
                </div>
                <div className="border-t border-cream pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'rgba(42,37,32,0.4)' }}>Assign Team Member</p>
                  <select value={assignUserId} onChange={(e) => setAssignUserId(e.target.value)} className="w-full px-3 py-2 border border-cream rounded-lg text-sm bg-white mb-2">
                    <option value="">Select member</option>
                    {teamUsers.filter(u => !clientAssignments.some(a => a.team_member_user_id === u.id)).map(u => (<option key={u.id} value={u.id}>{u.full_name || u.email}</option>))}
                  </select>
                  <input type="text" value={assignRole} onChange={(e) => setAssignRole(e.target.value)} placeholder="Role (e.g. Ads Manager)" className="w-full px-3 py-2 border border-cream rounded-lg text-sm mb-2" />
                  <button onClick={assignToClient} disabled={!assignUserId || !assignRole} className="w-full py-2 rounded-lg text-sm font-medium text-white disabled:opacity-30" style={{ backgroundColor: '#2A2520' }}>Assign</button>
                </div>
              </div>
            )}

            {detailTab === 'files' && (
              <div>
                {/* Upload Zone */}
                <div ref={pasteAreaRef} onPaste={handlePaste} onDrop={handleDrop} onDragOver={(e) => e.preventDefault()} onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed rounded-xl p-4 text-center cursor-pointer mb-4 transition-colors hover:border-amber-300"
                  style={{ borderColor: '#EBE3D3', backgroundColor: '#FFFDF0' }} tabIndex={0}>
                  <p className="text-sm font-medium mb-1" style={{ color: '#2A2520' }}>{uploading ? 'Uploading...' : 'Drop files, paste image, or click'}</p>
                  <p className="text-xs" style={{ color: 'rgba(42,37,32,0.4)' }}>Supports all file types</p>
                  <input ref={fileInputRef} type="file" multiple onChange={handleFileSelect} className="hidden" />
                </div>

                {/* Add Link */}
                <div className="mb-4">
                  {!showAddLink ? (
                    <button onClick={() => setShowAddLink(true)} className="w-full py-2.5 rounded-lg border border-dashed text-sm font-medium hover:bg-cream/30 transition-colors" style={{ borderColor: '#EBE3D3', color: 'rgba(42,37,32,0.5)' }}>
                      &#128279; Add Link (Drive, Figma, etc.)
                    </button>
                  ) : (
                    <form onSubmit={addLink} className="p-3 rounded-lg border border-cream" style={{ backgroundColor: '#FAF8F0' }}>
                      <input type="text" value={linkName} onChange={(e) => setLinkName(e.target.value)} placeholder="Link name (optional)" className="w-full px-3 py-2 border border-cream rounded-lg text-sm mb-2 focus:outline-none" />
                      <input type="text" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://drive.google.com/..." className="w-full px-3 py-2 border border-cream rounded-lg text-sm mb-2 focus:outline-none" required />
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setShowAddLink(false)} className="flex-1 py-1.5 text-xs rounded border border-cream" style={{ color: 'rgba(42,37,32,0.5)' }}>Cancel</button>
                        <button type="submit" className="flex-1 py-1.5 text-xs rounded text-white" style={{ backgroundColor: '#2A2520' }}>Add Link</button>
                      </div>
                    </form>
                  )}
                </div>

                {/* File/Link List */}
                <div className="space-y-2">
                  {clientFiles.length === 0 && <p className="text-sm py-4 text-center" style={{ color: 'rgba(42,37,32,0.3)' }}>No files or links yet.</p>}
                  {clientFiles.map(file => {
                    const isLink = file.file_type === 'link'
                    const isImage = !isLink && file.file_type?.startsWith('image/')
                    return (
                      <div key={file.id} className="flex items-center gap-3 p-3 rounded-lg border border-cream/50" style={{ backgroundColor: '#FAF8F0' }}>
                        {isLink ? (
                          <div className="w-10 h-10 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#3b82f6' }}>
                            <span className="text-white text-xs font-bold">&#128279;</span>
                          </div>
                        ) : isImage ? (
                          <img src={getDownloadUrl(file.file_path)} alt={file.file_name} className="w-10 h-10 rounded object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#EBE3D3' }}>
                            <span className="text-xs font-bold" style={{ color: 'rgba(42,37,32,0.4)' }}>{(file.file_name.split('.').pop() || '?').toUpperCase().slice(0, 3)}</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          {isLink ? (
                            <a href={file.file_path} target="_blank" rel="noopener noreferrer" className="text-sm font-medium truncate block hover:underline" style={{ color: '#3b82f6' }}>{file.file_name}</a>
                          ) : (
                            <p className="text-sm font-medium text-ink truncate">{file.file_name}</p>
                          )}
                          <p className="text-xs" style={{ color: 'rgba(42,37,32,0.4)' }}>
                            {isLink ? getLinkDomain(file.file_path) : formatSize(file.file_size)}
                            {file.users?.full_name ? ' · ' + file.users.full_name : ''}
                          </p>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          {isLink ? (
                            <a href={file.file_path} target="_blank" rel="noopener noreferrer" className="text-xs px-2 py-1 rounded border border-cream hover:bg-cream/50" style={{ color: '#3b82f6' }}>Open</a>
                          ) : (
                            <a href={getDownloadUrl(file.file_path)} target="_blank" rel="noopener noreferrer" className="text-xs px-2 py-1 rounded border border-cream hover:bg-cream/50" style={{ color: '#3b82f6' }}>&#8595;</a>
                          )}
                          <button onClick={() => deleteFile(file.id, file.file_path, file.file_type)} className="text-xs px-2 py-1 rounded border border-cream hover:bg-red-50" style={{ color: '#ef4444' }}>x</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
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
                <input type="text" value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} className="w-full px-4 py-2.5 border border-cream rounded-lg text-sm" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Contact Name</label>
                  <input type="text" value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} className="w-full px-4 py-2.5 border border-cream rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Contact Email</label>
                  <input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} className="w-full px-4 py-2.5 border border-cream rounded-lg text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full px-4 py-2.5 border border-cream rounded-lg text-sm bg-white">
                    <option value="lead">Lead</option><option value="onboarding">Onboarding</option><option value="active">Active</option><option value="paused">Paused</option><option value="offboarded">Offboarded</option>
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
                      backgroundColor: form.services.includes(service) ? '#2A2520' : '#FAF8F0', color: form.services.includes(service) ? '#FFFFFF' : 'rgba(42,37,32,0.6)',
                    }}>{service}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-2">Assign Team Members</label>
                {form.assigned_users.map(a => {
                  const u = allUsers.find(x => x.id === a.user_id)
                  return (
                    <div key={a.user_id} className="flex items-center justify-between p-2 rounded-lg mb-1" style={{ backgroundColor: '#FAF8F0' }}>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: getColor(a.user_id) }}>{getInitials(u?.full_name || u?.email || '?')}</div>
                        <span className="text-sm">{u?.full_name || u?.email} - {a.role}</span>
                      </div>
                      <button type="button" onClick={() => removeFormAssignment(a.user_id)} className="text-xs" style={{ color: '#ef4444' }}>x</button>
                    </div>
                  )
                })}
                <div className="flex gap-2">
                  <select value={assignUserId} onChange={(e) => setAssignUserId(e.target.value)} className="flex-1 px-3 py-2 border border-cream rounded-lg text-sm bg-white">
                    <option value="">Select member</option>
                    {teamUsers.filter(u => !form.assigned_users.some(a => a.user_id === u.id)).map(u => (<option key={u.id} value={u.id}>{u.full_name || u.email}</option>))}
                  </select>
                  <input type="text" value={assignRole} onChange={(e) => setAssignRole(e.target.value)} placeholder="Role" className="w-32 px-3 py-2 border border-cream rounded-lg text-sm" />
                  <button type="button" onClick={addFormAssignment} className="px-3 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#2A2520' }}>+</button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full px-4 py-2.5 border border-cream rounded-lg text-sm h-20 resize-none" placeholder="Any notes..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-cream rounded-lg text-sm font-medium" style={{ color: 'rgba(42,37,32,0.6)' }}>Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-ink text-white rounded-lg text-sm font-medium disabled:opacity-50">{saving ? 'Saving...' : 'Add Client'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
