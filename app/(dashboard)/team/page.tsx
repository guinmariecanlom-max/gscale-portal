'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

type TeamMember = {
  id: string
  email: string
  full_name: string
  role: string
  created_at: string
}

type Assignment = {
  id: string
  client_id: string
  team_member_user_id: string
  role_on_account: string
  clients?: { business_name: string }
}

type TaskCount = {
  assignee_user_id: string
  status: string
}

const roleColors: Record<string, { bg: string; text: string }> = {
  admin: { bg: '#FFFDB4', text: '#2A2520' },
  team: { bg: '#eff6ff', text: '#3b82f6' },
  client: { bg: '#f0fdf4', text: '#16a34a' },
}

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [taskCounts, setTaskCounts] = useState<TaskCount[]>([])
  const [clients, setClients] = useState<{ id: string; business_name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [showAssign, setShowAssign] = useState(false)
  const [saving, setSaving] = useState(false)
  const [inviteMsg, setInviteMsg] = useState('')

  const [inviteForm, setInviteForm] = useState({ email: '', full_name: '', password: '', role: 'team' })
  const [assignForm, setAssignForm] = useState({ team_member_user_id: '', client_id: '', role_on_account: '' })

  const loadData = async () => {
    const { data: membersData } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: true })

    const { data: assignData } = await supabase
      .from('team_assignments')
      .select('*, clients(business_name)')

    const { data: tasksData } = await supabase
      .from('tasks')
      .select('assignee_user_id, status')
      .not('assignee_user_id', 'is', null)

    const { data: clientsData } = await supabase
      .from('clients')
      .select('id, business_name')
      .order('business_name')

    if (membersData) setMembers(membersData)
    if (assignData) setAssignments(assignData)
    if (tasksData) setTaskCounts(tasksData)
    if (clientsData) setClients(clientsData)
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setInviteMsg('')

    const { data, error } = await supabase.auth.signUp({
      email: inviteForm.email,
      password: inviteForm.password,
      options: {
        data: { full_name: inviteForm.full_name },
      },
    })

    if (error) {
      setInviteMsg(error.message)
      setSaving(false)
      return
    }

    if (data.user) {
      await supabase
        .from('users')
        .update({ role: inviteForm.role })
        .eq('id', data.user.id)
    }

    setInviteForm({ email: '', full_name: '', password: '', role: 'team' })
    setShowInvite(false)
    setSaving(false)
    loadData()
  }

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    await supabase.from('team_assignments').insert({
      team_member_user_id: assignForm.team_member_user_id,
      client_id: assignForm.client_id,
      role_on_account: assignForm.role_on_account,
    })

    setAssignForm({ team_member_user_id: '', client_id: '', role_on_account: '' })
    setShowAssign(false)
    setSaving(false)
    loadData()
  }

  const removeAssignment = async (id: string) => {
    await supabase.from('team_assignments').delete().eq('id', id)
    loadData()
  }

  const getTaskStats = (userId: string) => {
    const userTasks = taskCounts.filter(t => t.assignee_user_id === userId)
    const open = userTasks.filter(t => t.status !== 'done').length
    const done = userTasks.filter(t => t.status === 'done').length
    return { open, done, total: userTasks.length }
  }

  if (loading) {
    return (<p style={{ color: 'rgba(42,37,32,0.5)' }}>Loading team...</p>)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-ink">Team</h2>
          <p className="text-sm mt-1" style={{ color: 'rgba(42,37,32,0.5)' }}>{members.length} members</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowAssign(true)} className="px-4 py-2.5 border border-cream rounded-lg text-sm font-medium hover:bg-cream/30 transition-colors" style={{ color: '#2A2520' }}>Assign to Client</button>
          <button onClick={() => setShowInvite(true)} className="px-4 py-2.5 bg-ink text-white rounded-lg text-sm font-medium hover:bg-ink/90 transition-colors">+ Add Member</button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-cream p-6 mb-6">
        <h3 className="text-sm font-semibold text-ink mb-4">Team Load</h3>
        <div className="space-y-3">
          {members.map((m) => {
            const stats = getTaskStats(m.id)
            const maxTasks = 15
            const barWidth = stats.total > 0 ? Math.min((stats.open / maxTasks) * 100, 100) : 0
            let barColor = '#22c55e'
            if (barWidth > 80) barColor = '#ef4444'
            else if (barWidth > 50) barColor = '#f59e0b'
            return (
              <div key={m.id} className="flex items-center gap-4">
                <div className="w-32 flex-shrink-0">
                  <p className="text-sm font-medium text-ink truncate">{m.full_name || m.email}</p>
                </div>
                <div className="flex-1 h-6 rounded-full overflow-hidden" style={{ backgroundColor: '#F1F5F9' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: barWidth + '%', backgroundColor: barColor }}></div>
                </div>
                <div className="w-24 text-right flex-shrink-0">
                  <span className="text-xs font-medium" style={{ color: 'rgba(42,37,32,0.5)' }}>{stats.open} open / {stats.done} done</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-cream overflow-hidden mb-6">
        <table className="w-full">
          <thead>
            <tr className="border-b border-cream" style={{ backgroundColor: 'rgba(250,248,240,0.5)' }}>
              <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(42,37,32,0.5)' }}>Name</th>
              <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(42,37,32,0.5)' }}>Email</th>
              <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(42,37,32,0.5)' }}>Role</th>
              <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(42,37,32,0.5)' }}>Assigned Clients</th>
              <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(42,37,32,0.5)' }}>Tasks</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const rc = roleColors[m.role] || roleColors.team
              const memberAssignments = assignments.filter(a => a.team_member_user_id === m.id)
              const stats = getTaskStats(m.id)
              return (
                <tr key={m.id} className="border-b border-cream/50 hover:bg-cream-light/30 transition-colors">
                  <td className="px-5 py-4">
                    <p className="text-sm font-medium text-ink">{m.full_name || '-'}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-sm" style={{ color: 'rgba(42,37,32,0.6)' }}>{m.email}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium capitalize" style={{ backgroundColor: rc.bg, color: rc.text }}>{m.role}</span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1">
                      {memberAssignments.length === 0 && (<span className="text-xs" style={{ color: 'rgba(42,37,32,0.3)' }}>None</span>)}
                      {memberAssignments.map((a) => (
                        <span key={a.id} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded" style={{ backgroundColor: '#FAF8F0', color: 'rgba(42,37,32,0.7)' }}>
                          {a.clients?.business_name}
                          <button onClick={() => removeAssignment(a.id)} className="hover:opacity-70" style={{ color: '#ef4444' }}>x</button>
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-sm" style={{ color: 'rgba(42,37,32,0.6)' }}>{stats.open} open, {stats.done} done</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showInvite && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-cream flex items-center justify-between">
              <h3 className="text-lg font-bold text-ink">Add Team Member</h3>
              <button onClick={() => setShowInvite(false)} className="text-xl" style={{ color: 'rgba(42,37,32,0.3)' }}>x</button>
            </div>
            <form onSubmit={handleInvite} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Full Name *</label>
                <input type="text" value={inviteForm.full_name} onChange={(e) => setInviteForm({ ...inviteForm, full_name: e.target.value })} className="w-full px-4 py-2.5 border border-cream rounded-lg text-sm" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Email *</label>
                <input type="email" value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} className="w-full px-4 py-2.5 border border-cream rounded-lg text-sm" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Temporary Password *</label>
                <input type="text" value={inviteForm.password} onChange={(e) => setInviteForm({ ...inviteForm, password: e.target.value })} className="w-full px-4 py-2.5 border border-cream rounded-lg text-sm" placeholder="Min 6 characters" minLength={6} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Role</label>
                <select value={inviteForm.role} onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })} className="w-full px-4 py-2.5 border border-cream rounded-lg text-sm bg-white">
                  <option value="team">Team Member</option>
                  <option value="client">Client</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {inviteMsg && (<p className="text-sm" style={{ color: '#ef4444' }}>{inviteMsg}</p>)}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowInvite(false)} className="flex-1 py-2.5 border border-cream rounded-lg text-sm font-medium" style={{ color: 'rgba(42,37,32,0.6)' }}>Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-ink text-white rounded-lg text-sm font-medium disabled:opacity-50">{saving ? 'Creating...' : 'Add Member'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAssign && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-cream flex items-center justify-between">
              <h3 className="text-lg font-bold text-ink">Assign to Client</h3>
              <button onClick={() => setShowAssign(false)} className="text-xl" style={{ color: 'rgba(42,37,32,0.3)' }}>x</button>
            </div>
            <form onSubmit={handleAssign} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Team Member *</label>
                <select value={assignForm.team_member_user_id} onChange={(e) => setAssignForm({ ...assignForm, team_member_user_id: e.target.value })} className="w-full px-4 py-2.5 border border-cream rounded-lg text-sm bg-white" required>
                  <option value="">Select member</option>
                  {members.filter(m => m.role !== 'client').map(m => (<option key={m.id} value={m.id}>{m.full_name || m.email}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Client *</label>
                <select value={assignForm.client_id} onChange={(e) => setAssignForm({ ...assignForm, client_id: e.target.value })} className="w-full px-4 py-2.5 border border-cream rounded-lg text-sm bg-white" required>
                  <option value="">Select client</option>
                  {clients.map(c => (<option key={c.id} value={c.id}>{c.business_name}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Role on Account *</label>
                <input type="text" value={assignForm.role_on_account} onChange={(e) => setAssignForm({ ...assignForm, role_on_account: e.target.value })} className="w-full px-4 py-2.5 border border-cream rounded-lg text-sm" placeholder="e.g. Ads Manager, Email Specialist" required />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAssign(false)} className="flex-1 py-2.5 border border-cream rounded-lg text-sm font-medium" style={{ color: 'rgba(42,37,32,0.6)' }}>Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-ink text-white rounded-lg text-sm font-medium disabled:opacity-50">{saving ? 'Assigning...' : 'Assign'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
