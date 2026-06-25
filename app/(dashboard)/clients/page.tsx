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
  created_by: string | null
  created_at: string
  clients?: { business_name: string }
}

type Client = {
  id: string
  business_name: string
}

type UserProfile = {
  id: string
  full_name: string
  email: string
}

type Comment = {
  id: string
  content: string
  created_at: string
  user_id: string
  users?: { full_name: string; email: string }
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

const initColors = ['#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#22c55e', '#ef4444', '#06b6d4', '#84cc16']

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [view, setView] = useState<'kanban' | 'list'>('kanban')
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  // Detail panel
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    title: '', description: '', status: '', priority: '', service_area: '', due_date: '', assignee_user_id: '', client_id: '',
  })

  const [form, setForm] = useState({
    title: '', description: '', client_id: '', status: 'todo', priority: 'medium', service_area: 'admin', due_date: '', assignee_user_id: '',
  })

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) setUserId(session.user.id)

    const { data: tasksData } = await supabase.from('tasks').select('*, clients(business_name)').order('created_at', { ascending: false })
    const { data: clientsData } = await supabase.from('clients').select('id, business_name').order('business_name')
    const { data: usersData } = await supabase.from('users').select('id, full_name, email')

    if (tasksData) setTasks(tasksData)
    if (clientsData) setClients(clientsData)
    if (usersData) setUsers(usersData)
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const loadComments = async (taskId: string) => {
    const { data } = await supabase.from('task_comments').select('*, users:user_id(full_name, email)').eq('task_id', taskId).order('created_at', { ascending: true })
    if (data) setComments(data)
  }

  const openTask = (task: Task) => {
    setSelectedTask(task)
    setEditing(false)
    setEditForm({
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
      service_area: task.service_area,
      due_date: task.due_date ? task.due_date.split('T')[0] : '',
      assignee_user_id: task.assignee_user_id || '',
      client_id: task.client_id,
    })
    loadComments(task.id)
  }

  const saveEdit = async () => {
    if (!selectedTask) return
    setSaving(true)
    await supabase.from('tasks').update({
      title: editForm.title,
      description: editForm.description || null,
      status: editForm.status,
      priority: editForm.priority,
      service_area: editForm.service_area,
      due_date: editForm.due_date || null,
      assignee_user_id: editForm.assignee_user_id || null,
      client_id: editForm.client_id,
    }).eq('id', selectedTask.id)
    setSaving(false)
    setEditing(false)
    loadData()
    const { data } = await supabase.from('tasks').select('*, clients(business_name)').eq('id', selectedTask.id).single()
    if (data) setSelectedTask(data)
  }

  const deleteTask = async () => {
    if (!selectedTask) return
    await supabase.from('task_comments').delete().eq('task_id', selectedTask.id)
    await supabase.from('tasks').delete().eq('id', selectedTask.id)
    setSelectedTask(null)
    loadData()
  }

  const addComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || !selectedTask || !userId) return
    await supabase.from('task_comments').insert({ task_id: selectedTask.id, user_id: userId, content: newComment.trim() })
    setNewComment('')
    loadComments(selectedTask.id)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await supabase.from('tasks').insert({
      title: form.title,
      description: form.description || null,
      client_id: form.client_id,
      status: form.status,
      priority: form.priority,
      service_area: form.service_area,
      due_date: form.due_date || null,
      assignee_user_id: form.assignee_user_id || null,
      created_by: userId,
    })
    setForm({ title: '', description: '', client_id: '', status: 'todo', priority: 'medium', service_area: 'admin', due_date: '', assignee_user_id: '' })
    setShowForm(false)
    setSaving(false)
    loadData()
  }

  const moveTask = async (taskId: string, newStatus: string) => {
    await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId)
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
    if (selectedTask?.id === taskId) setSelectedTask(prev => prev ? { ...prev, status: newStatus } : null)
  }

  const handleDragStart = (e: React.DragEvent, taskId: string) => { setDragId(taskId); (e.currentTarget as HTMLElement).style.opacity = '0.5'; e.dataTransfer.effectAllowed = 'move' }
  const handleDragEnd = (e: React.DragEvent) => { (e.currentTarget as HTMLElement).style.opacity = '1'; setDragId(null); setDropTarget(null) }
  const handleDragOver = (e: React.DragEvent, colKey: string) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDropTarget(colKey) }
  const handleDragLeave = () => setDropTarget(null)
  const handleDrop = (e: React.DragEvent, colKey: string) => { e.preventDefault(); if (dragId) moveTask(dragId, colKey); setDragId(null); setDropTarget(null) }

  const getInitials = (name: string) => { if (!name) return '?'; return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) }
  const getColor = (id: string) => { let h = 0; for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h); return initColors[Math.abs(h) % initColors.length] }
  const getUserName = (id: string | null) => { if (!id) return 'Unassigned'; const u = users.find(x => x.id === id); return u?.full_name || u?.email || 'Unknown' }
  const formatTime = (d: string) => new Date(d).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

  if (loading) return (<p style={{ color: 'rgba(42,37,32,0.5)' }}>Loading tasks...</p>)

  return (
    <div className="flex gap-0">
      <div className={`${selectedTask ? 'flex-1' : 'w-full'} transition-all`}>
        {/* Header */}
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

        {/* Kanban */}
        {view === 'kanban' ? (
          <div className={`grid ${selectedTask ? 'grid-cols-2' : 'grid-cols-4'} gap-4`}>
            {columns.map((col) => {
              const colTasks = tasks.filter(t => t.status === col.key)
              const isOver = dropTarget === col.key
              return (
                <div key={col.key} className="bg-white rounded-xl border-2 transition-colors" style={{ borderColor: isOver ? '#FFFDB4' : '#EBE3D3', backgroundColor: isOver ? '#FFFDF0' : '#FFFFFF' }} onDragOver={(e) => handleDragOver(e, col.key)} onDragLeave={handleDragLeave} onDrop={(e) => handleDrop(e, col.key)}>
                  <div className="px-4 py-3 border-b border-cream flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-ink">{col.label}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#EBE3D3', color: '#2A2520' }}>{colTasks.length}</span>
                  </div>
                  <div className="p-3 space-y-3 min-h-[200px]">
                    {colTasks.length === 0 && (
                      <p className="text-xs text-center py-8" style={{ color: 'rgba(42,37,32,0.25)' }}>{isOver ? 'Drop here' : 'No tasks'}</p>
                    )}
                    {colTasks.map((task) => {
                      const assignee = users.find(u => u.id === task.assignee_user_id)
                      return (
                        <div key={task.id} draggable onDragStart={(e) => handleDragStart(e, task.id)} onDragEnd={handleDragEnd} onClick={() => openTask(task)} className="rounded-lg p-3 border cursor-pointer hover:shadow-sm transition-all" style={{ backgroundColor: selectedTask?.id === task.id ? '#FFFDB4' : '#FAF8F0', borderColor: selectedTask?.id === task.id ? '#f59e0b' : 'rgba(235,227,211,0.5)' }}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: serviceColors[task.service_area] || '#6b7280' }}>
                              {serviceLabels[task.service_area] || task.service_area}
                            </span>
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: priorityColors[task.priority] || '#94a3b8' }} title={task.priority} />
                          </div>
                          <p className="text-sm font-medium text-ink mb-1">{task.title}</p>
                          <p className="text-xs" style={{ color: 'rgba(42,37,32,0.4)' }}>{task.clients?.business_name || 'No client'}</p>
                          <div className="flex items-center justify-between mt-2">
                            {task.due_date && (
                              <p className="text-xs" style={{ color: 'rgba(42,37,32,0.4)' }}>Due: {new Date(task.due_date).toLocaleDateString()}</p>
                            )}
                            {assignee && (
                              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ml-auto" style={{ backgroundColor: getColor(assignee.id) }} title={assignee.full_name}>
                                {getInitials(assignee.full_name || assignee.email)}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
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
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(42,37,32,0.5)' }}>Assignee</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(42,37,32,0.5)' }}>Priority</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(42,37,32,0.5)' }}>Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(42,37,32,0.5)' }}>Due</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id} onClick={() => openTask(task)} className="border-b border-cream/50 hover:bg-cream-light/30 transition-colors cursor-pointer" style={{ backgroundColor: selectedTask?.id === task.id ? '#FFFDF0' : 'transparent' }}>
                    <td className="px-5 py-4"><p className="text-sm font-medium text-ink">{task.title}</p></td>
                    <td className="px-5 py-4"><p className="text-sm" style={{ color: 'rgba(42,37,32,0.7)' }}>{task.clients?.business_name || '-'}</p></td>
                    <td className="px-5 py-4"><span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: serviceColors[task.service_area] || '#6b7280' }}>{serviceLabels[task.service_area]}</span></td>
                    <td className="px-5 py-4">
                      {task.assignee_user_id ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: getColor(task.assignee_user_id) }}>{getInitials(getUserName(task.assignee_user_id))}</div>
                          <span className="text-sm" style={{ color: 'rgba(42,37,32,0.7)' }}>{getUserName(task.assignee_user_id)}</span>
                        </div>
                      ) : <span className="text-xs" style={{ color: 'rgba(42,37,32,0.3)' }}>Unassigned</span>}
                    </td>
                    <td className="px-5 py-4"><span className="text-xs font-medium capitalize" style={{ color: priorityColors[task.priority] }}>{task.priority}</span></td>
                    <td className="px-5 py-4">
                      <select value={task.status} onClick={(e) => e.stopPropagation()} onChange={(e) => moveTask(task.id, e.target.value)} className="text-xs px-2 py-1 rounded border border-cream bg-white">
                        {columns.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                      </select>
                    </td>
                    <td className="px-5 py-4"><p className="text-sm" style={{ color: 'rgba(42,37,32,0.5)' }}>{task.due_date ? new Date(task.due_date).toLocaleDateString() : '-'}</p></td>
                  </tr>
                ))}
                {tasks.length === 0 && (
                  <tr><td colSpan={7} className="px-5 py-12 text-center text-sm" style={{ color: 'rgba(42,37,32,0.4)' }}>No tasks yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Task Detail Panel */}
      {selectedTask && (
        <div className="w-96 ml-6 bg-white rounded-xl border border-cream flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 130px)' }}>
          <div className="px-5 py-4 border-b border-cream flex items-center justify-between">
            <h3 className="text-base font-semibold text-ink truncate">{selectedTask.title}</h3>
            <div className="flex items-center gap-2">
              <button onClick={() => setEditing(!editing)} className="text-xs px-2.5 py-1 rounded border border-cream hover:bg-cream/50" style={{ color: 'rgba(42,37,32,0.5)' }}>{editing ? 'Cancel' : 'Edit'}</button>
              <button onClick={() => setSelectedTask(null)} className="text-lg" style={{ color: 'rgba(42,37,32,0.3)' }}>x</button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {editing ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'rgba(42,37,32,0.4)' }}>Title</label>
                  <input type="text" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} className="w-full px-3 py-2 border border-cream rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'rgba(42,37,32,0.4)' }}>Description</label>
                  <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="w-full px-3 py-2 border border-cream rounded-lg text-sm h-20 resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'rgba(42,37,32,0.4)' }}>Status</label>
                    <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} className="w-full px-3 py-2 border border-cream rounded-lg text-sm bg-white">
                      {columns.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'rgba(42,37,32,0.4)' }}>Priority</label>
                    <select value={editForm.priority} onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })} className="w-full px-3 py-2 border border-cream rounded-lg text-sm bg-white">
                      <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'rgba(42,37,32,0.4)' }}>Service</label>
                    <select value={editForm.service_area} onChange={(e) => setEditForm({ ...editForm, service_area: e.target.value })} className="w-full px-3 py-2 border border-cream rounded-lg text-sm bg-white">
                      <option value="email_marketing">Email</option><option value="meta_ads">Meta Ads</option><option value="google_ads">Google Ads</option><option value="social_media">Social</option><option value="strategy">Strategy</option><option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'rgba(42,37,32,0.4)' }}>Due Date</label>
                    <input type="date" value={editForm.due_date} onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })} className="w-full px-3 py-2 border border-cream rounded-lg text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'rgba(42,37,32,0.4)' }}>Client</label>
                  <select value={editForm.client_id} onChange={(e) => setEditForm({ ...editForm, client_id: e.target.value })} className="w-full px-3 py-2 border border-cream rounded-lg text-sm bg-white">
                    {clients.map(c => <option key={c.id} value={c.id}>{c.business_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'rgba(42,37,32,0.4)' }}>Assignee</label>
                  <select value={editForm.assignee_user_id} onChange={(e) => setEditForm({ ...editForm, assignee_user_id: e.target.value })} className="w-full px-3 py-2 border border-cream rounded-lg text-sm bg-white">
                    <option value="">Unassigned</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
                  </select>
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={saveEdit} disabled={saving} className="flex-1 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#2A2520' }}>{saving ? 'Saving...' : 'Save'}</button>
                  <button onClick={deleteTask} className="py-2 px-4 rounded-lg text-sm font-medium border" style={{ borderColor: '#fecaca', color: '#ef4444' }}>Delete</button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Status & Priority */}
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2.5 py-1 rounded-full text-white" style={{ backgroundColor: serviceColors[selectedTask.service_area] || '#6b7280' }}>{serviceLabels[selectedTask.service_area]}</span>
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium capitalize" style={{ color: priorityColors[selectedTask.priority], backgroundColor: priorityColors[selectedTask.priority] + '15' }}>{selectedTask.priority}</span>
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium capitalize" style={{ backgroundColor: '#f1f5f9', color: '#64748b' }}>{columns.find(c => c.key === selectedTask.status)?.label}</span>
                </div>

                {/* Description */}
                <div>
                  <p className="text-xs font-medium mb-1" style={{ color: 'rgba(42,37,32,0.4)' }}>Description</p>
                  <p className="text-sm" style={{ color: selectedTask.description ? 'rgba(42,37,32,0.8)' : 'rgba(42,37,32,0.3)' }}>{selectedTask.description || 'No description'}</p>
                </div>

                {/* Details Grid */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-cream/50">
                    <span className="text-xs font-medium" style={{ color: 'rgba(42,37,32,0.4)' }}>Client</span>
                    <span className="text-sm text-ink">{selectedTask.clients?.business_name || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-cream/50">
                    <span className="text-xs font-medium" style={{ color: 'rgba(42,37,32,0.4)' }}>Assignee</span>
                    <div className="flex items-center gap-2">
                      {selectedTask.assignee_user_id ? (
                        <>
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: getColor(selectedTask.assignee_user_id) }}>{getInitials(getUserName(selectedTask.assignee_user_id))}</div>
                          <span className="text-sm text-ink">{getUserName(selectedTask.assignee_user_id)}</span>
                        </>
                      ) : <span className="text-sm" style={{ color: 'rgba(42,37,32,0.3)' }}>Unassigned</span>}
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-cream/50">
                    <span className="text-xs font-medium" style={{ color: 'rgba(42,37,32,0.4)' }}>Due Date</span>
                    <span className="text-sm text-ink">{selectedTask.due_date ? new Date(selectedTask.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No due date'}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-cream/50">
                    <span className="text-xs font-medium" style={{ color: 'rgba(42,37,32,0.4)' }}>Created</span>
                    <span className="text-sm" style={{ color: 'rgba(42,37,32,0.6)' }}>{new Date(selectedTask.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                </div>

                {/* Comments */}
                <div className="pt-4 border-t border-cream">
                  <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'rgba(42,37,32,0.4)' }}>Comments</h4>
                  <div className="space-y-3 mb-4">
                    {comments.length === 0 && (
                      <p className="text-xs text-center py-3" style={{ color: 'rgba(42,37,32,0.3)' }}>No comments yet</p>
                    )}
                    {comments.map(c => (
                      <div key={c.id} className="flex gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: getColor(c.user_id) }}>
                          {getInitials(c.users?.full_name || c.users?.email || '?')}
                        </div>
                        <div>
                          <div className="flex items-baseline gap-2">
                            <span className="text-xs font-semibold" style={{ color: '#2A2520' }}>{c.users?.full_name || c.users?.email}</span>
                            <span className="text-xs" style={{ color: 'rgba(42,37,32,0.3)' }}>{formatTime(c.created_at)}</span>
                          </div>
                          <p className="text-sm mt-0.5" style={{ color: 'rgba(42,37,32,0.8)' }}>{c.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={addComment} className="flex gap-2">
                    <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Add a comment..." className="flex-1 px-3 py-2 border border-cream rounded-lg text-sm focus:outline-none" />
                    <button type="submit" disabled={!newComment.trim()} className="px-3 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-30" style={{ backgroundColor: '#2A2520' }}>Send</button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Task Modal */}
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
                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-4 py-2.5 border border-cream rounded-lg text-sm" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-4 py-2.5 border border-cream rounded-lg text-sm h-20 resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Client *</label>
                <select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} className="w-full px-4 py-2.5 border border-cream rounded-lg text-sm bg-white" required>
                  <option value="">Select a client</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.business_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Assign To</label>
                <select value={form.assignee_user_id} onChange={(e) => setForm({ ...form, assignee_user_id: e.target.value })} className="w-full px-4 py-2.5 border border-cream rounded-lg text-sm bg-white">
                  <option value="">Unassigned</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Priority</label>
                  <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full px-4 py-2.5 border border-cream rounded-lg text-sm bg-white">
                    <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Service</label>
                  <select value={form.service_area} onChange={(e) => setForm({ ...form, service_area: e.target.value })} className="w-full px-4 py-2.5 border border-cream rounded-lg text-sm bg-white">
                    <option value="email_marketing">Email</option><option value="meta_ads">Meta Ads</option><option value="google_ads">Google Ads</option><option value="social_media">Social</option><option value="strategy">Strategy</option><option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Due Date</label>
                  <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="w-full px-4 py-2.5 border border-cream rounded-lg text-sm" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-cream rounded-lg text-sm font-medium" style={{ color: 'rgba(42,37,32,0.6)' }}>Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-ink text-white rounded-lg text-sm font-medium disabled:opacity-50">{saving ? 'Saving...' : 'Add Task'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
