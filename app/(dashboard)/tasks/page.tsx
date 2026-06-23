'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

type Task = {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  service_area: string
  due_date: string | null
  client_id: string
  assignee_user_id: string | null
  created_at: string
  clients?: { business_name: string }
}

type Client = {
  id: string
  business_name: string
}

const columns = [
  { key: 'todo', label: 'To Do' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'in_review', label: 'In Review' },
  { key: 'done', label: 'Done' },
]

const priorityColors: Record<string, string> = {
  low: '#94a3b8',
  medium: '#f59e0b',
  high: '#f97316',
  urgent: '#ef4444',
}

const serviceLabels: Record<string, string> = {
  email_marketing: 'Email',
  meta_ads: 'Meta Ads',
  google_ads: 'Google Ads',
  social_media: 'Social',
  strategy: 'Strategy',
  admin: 'Admin',
}

const serviceColors: Record<string, string> = {
  email_marketing: '#8b5cf6',
  meta_ads: '#3b82f6',
  google_ads: '#22c55e',
  social_media: '#ec4899',
  strategy: '#f59e0b',
  admin: '#6b7280',
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [view, setView] = useState<'kanban' | 'list'>('kanban')

  const [form, setForm] = useState({
    title: '',
    description: '',
    client_id: '',
    status: 'todo',
    priority: 'medium',
    service_area: 'admin',
    due_date: '',
  })

  const loadData = async () => {
    const { data: tasksData } = await supabase
      .from('tasks')
      .select('*, clients(business_name)')
      .order('created_at', { ascending: false })

    const { data: clientsData } = await supabase
      .from('clients')
      .select('id, business_name')
      .order('business_name')

    if (tasksData) setTasks(tasksData)
    if (clientsData) setClients(clientsData)
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const { data: { session } } = await supabase.auth.getSession()

    const { error } = await supabase.from('tasks').insert({
      title: form.title,
      description: form.description || null,
      client_id: form.client_id,
      status: form.status,
      priority: form.priority,
      service_area: form.service_area,
      due_date: form.due_date || null,
      created_by: session?.user?.id,
    })

    if (!error) {
      setForm({ title: '', description: '', client_id: '', status: 'todo', priority: 'medium', service_area: 'admin', due_date: '' })
      setShowForm(false)
      loadData()
    }
    setSaving(false)
  }

  const moveTask = async (taskId: string, newStatus: string) => {
    await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId)
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
  }

  if (loading) return <p className="text-ink/50">Loading tasks...</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-ink">Tasks</h2>
          <p className="text-sm mt-1" style={{ color: 'rgba(42,37,32,0.5)' }}>{tasks.length} total tasks</p>
        </div>
        <div className="flex gap-3">
          <div className="flex rounded-lg overflow-hidden border border-cream">
            <button onClick={() => setView('kanban')} className="px-3 py-2 text-xs font-medium" style={{ backgroundColor: view === 'kanban' ? '#2A2520' : '#FFFFFF', color: view === 'kanban' ? '#FFFFFF' : '#2A2520' }}>Kanban</button>
            <button onClick={() => setView('list')} className="px-3 py-2 text-xs font-medium" style={{ backgroundColor: view === 'list' ? '#2A2520' : '#FFFFFF', color: view === 'list' ? '#FFFFFF' : '#2A2520' }}>List</button>
          </div>
          <button onClick={() => setShowForm(true)} className="px-4 py-2.5 bg-ink text-white rounded-lg text-sm font-medium hover:bg-ink/90 transition-colors">+ Add Task</button>
        </div>
      </div>

      {view === 'kanban' ? (
        <div className="grid grid-cols-4 gap-4">
          {columns.map((col) => {
            const colTasks = tasks.filter(t => t.status === col.key)
            return (
              <div key={col.key} className="bg-white rounded-xl border border-cream">
                <div className="px-4 py-3 border-b border-cream flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-ink">{col.label}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#EBE3D3', color: '#2A2520' }}>{colTasks.length}</span>
                </div>
                <div className="p-3 space-y-3 min-h-[200px]">
                  {colTasks.map((task) => (
                    <div key={task.id} className="bg-cream-light rounded-lg p-3 border border-cream/50">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: serviceColors[task.service_area] || '#6b7280' }}>
                          {serviceLabels[task.service_area] || task.service_area}
                        </span>
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: priorityColors[task.priority] || '#94a3b8' }}></span>
                      </div>
                      <p className="text-sm font-medium text-ink mb-1">{task.title}</p>
                      <p className="text-xs mb-3" style={{ color: 'rgba(42,37,32,0.4)' }}>{task.clients?.business_name || 'No client'}</p>
                      {task.due_date && (
                        <p className="text-xs" style={{ color: 'rgba(42,37,32,0.4)' }}>Due: {new Date(task.due_date).toLocaleDateString()}</p>
                      )}
                      <div className="flex gap-1 mt-2">
                        {columns.filter(c => c.key !== task.status).map(c => (
                          <button key={c.key} onClick={() => moveTask(task.id, c.key)} className="text-xs px-2 py-1 rounded border border-cream hover:bg-cream/50 transition-colors" style={{ color: 'rgba(42,37,32,0.5)' }}>
                            {c.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-cream overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-cream" style={{ backgroundColor: 'rgba(250,248,240,0.5)' }}>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(42,37,32,0.5)' }}>Task</th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(42,37,32,0.5)' }}>Client</th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(42,37,32,0.5)' }}>Service</th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(42,37,32,0.5)' }}>Priority</th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(42,37,32,0.5)' }}>Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(42,37,32,0.5)' }}>Due</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id} className="border-b border-cream/50 hover:bg-cream-light/30 transition-colors">
                  <td className="px-5 py-4"><p className="text-sm font-medium text-ink">{task.title}</p></td>
                  <td className="px-5 py-4"><p className="text-sm" style={{ color: 'rgba(42,37,32,0.7)' }}>{task.clients?.business_name || '-'}</p></td>
                  <td className="px-5 py-4"><span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: serviceColors[task.service_area] || '#6b7280' }}>{serviceLabels[task.service_area]}</span></td>
                  <td className="px-5 py-4"><span className="text-xs font-medium capitalize" style={{ color: priorityColors[task.priority] }}>{task.priority}</span></td>
                  <td className="px-5 py-4">
                    <select value={task.status} onChange={(e) => moveTask(task.id, e.target.value)} className="text-xs px-2 py-1 rounded border border-cream bg-white">
                      {columns.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                    </select>
                  </td>
                  <td className="px-5 py-4"><p className="text-sm" style={{ color: 'rgba(42,37,32,0.5)' }}>{task.due_date ? new Date(task.due_date).toLocaleDateString() : '-'}</p></td>
                </tr>
              ))}
              {tasks.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-sm" style={{ color: 'rgba(42,37,32,0.4)' }}>No tasks yet. Click &quot;+ Add Task&quot; to get started.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-cream flex items-center justify-between">
              <h3 className="text-lg font-bold text-ink">Add New Task</h3>
              <button onClick={() => setShowForm(false)} className="text-xl" style={{ color: 'rgba(42,37,32,0.3)' }}>x</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Title *</label>
                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-4 py-2.5 border border-cream rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ink/20" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-4 py-2.5 border border-cream rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ink/20 h-20 resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Client *</label>
                <select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} className="w-full px-4 py-2.5 border border-cream rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ink/20 bg-white" required>
                  <option value="">Select a client</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.business_name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Priority</label>
                  <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full px-4 py-2.5 border border-cream rounded-lg text-sm bg-white">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Service</label>
                  <select value={form.service_area} onChange={(e) => setForm({ ...form, service_area: e.target.value })} className="w-full px-4 py-2.5 border border-cream rounded-lg text-sm bg-white">
                    <option value="email_marketing">Email</option>
                    <option value="meta_ads">Meta Ads</option>
                    <option value="google_ads">Google Ads</option>
                    <option value="social_media">Social</option>
                    <option value="strategy">Strategy</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Due Date</label>
                  <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="w-full px-4 py-2.5 border border-cream rounded-lg text-sm" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-cream rounded-lg text-sm font-medium hover:bg-cream/30 transition-colors" style={{ color: 'rgba(42,37,32,0.6)' }}>Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-ink text-white rounded-lg text-sm font-medium hover:bg-ink/90 transition-colors disabled:opacity-50">{saving ? 'Saving...' : 'Add Task'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
