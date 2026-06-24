'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

type ActivityItem = {
  id: string
  action: string
  details: { description?: string; amount?: number } | null
  created_at: string
  users?: { full_name: string }
}

type TaskItem = {
  id: string
  title: string
  due_date: string | null
  clients?: { business_name: string }
}

type ClientItem = {
  id: string
  business_name: string
  monthly_retainer: number
  status: string
}

export default function DashboardPage() {
  const [userName, setUserName] = useState('')
  const [greeting, setGreeting] = useState('Good morning')
  const [stats, setStats] = useState({ revenue: 0, projects: 0, tasksCompleted: 0, outstanding: 0, clients: 0, revenuePrev: 0, projectsPrev: 0, tasksPrev: 0, outstandingPrev: 0 })
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([])
  const [upcomingTasks, setUpcomingTasks] = useState<TaskItem[]>([])
  const [topClients, setTopClients] = useState<ClientItem[]>([])
  const [tasksByStatus, setTasksByStatus] = useState({ todo: 0, in_progress: 0, in_review: 0, done: 0 })
  const [setupChecks, setSetupChecks] = useState({ team: false, client: false, project: false, invoice: false })

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setGreeting('Good morning')
    else if (hour < 18) setGreeting('Good afternoon')
    else setGreeting('Good evening')

    const loadData = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) setUserName(session.user.user_metadata?.full_name || 'there')

      const { count: clientCount } = await supabase.from('clients').select('*', { count: 'exact', head: true })
      const { count: activeProjects } = await supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'active')
      const { count: tasksDone } = await supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'done')
      const { data: invoicesData } = await supabase.from('invoices').select('amount, status')
      const { data: paidInvoices } = await supabase.from('invoices').select('amount').eq('status', 'paid')
      const { data: activityData } = await supabase.from('activity_log').select('*, users:user_id(full_name)').order('created_at', { ascending: false }).limit(5)
      const { data: tasksUpcoming } = await supabase.from('tasks').select('*, clients(business_name)').neq('status', 'done').order('due_date', { ascending: true }).limit(4)
      const { data: clientsData } = await supabase.from('clients').select('*').eq('status', 'active').order('monthly_retainer', { ascending: false }).limit(4)
      const { data: allTasks } = await supabase.from('tasks').select('status')

      const outstanding = invoicesData?.filter(i => i.status === 'sent' || i.status === 'overdue').reduce((s, i) => s + i.amount, 0) || 0
      const totalRevenue = paidInvoices?.reduce((s, i) => s + i.amount, 0) || 0

      const statusCounts = { todo: 0, in_progress: 0, in_review: 0, done: 0 }
      allTasks?.forEach(t => { if (t.status in statusCounts) statusCounts[t.status as keyof typeof statusCounts]++ })

      const { count: teamCount } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'team')
      const { count: projectCount } = await supabase.from('projects').select('*', { count: 'exact', head: true })
      const { count: invoiceCount } = await supabase.from('invoices').select('*', { count: 'exact', head: true })

      setStats({ revenue: totalRevenue, projects: activeProjects || 0, tasksCompleted: tasksDone || 0, outstanding, clients: clientCount || 0, revenuePrev: 0, projectsPrev: 0, tasksPrev: 0, outstandingPrev: 0 })
      if (activityData) setRecentActivity(activityData)
      if (tasksUpcoming) setUpcomingTasks(tasksUpcoming)
      if (clientsData) setTopClients(clientsData)
      setTasksByStatus(statusCounts)
      setSetupChecks({ team: (teamCount || 0) > 0, client: (clientCount || 0) > 0, project: (projectCount || 0) > 0, invoice: (invoiceCount || 0) > 0 })
    }
    loadData()
  }, [])

  const formatMoney = (n: number) => {
    if (n >= 1000) return '$' + (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + 'k'
    return '$' + n.toLocaleString()
  }

  const formatDue = (d: string | null) => {
    if (!d) return ''
    const date = new Date(d)
    const today = new Date()
    const tomorrow = new Date()
    tomorrow.setDate(today.getDate() + 1)
    if (date.toDateString() === today.toDateString()) return 'Today'
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const totalTasks = tasksByStatus.todo + tasksByStatus.in_progress + tasksByStatus.in_review + tasksByStatus.done
  const setupComplete = Object.values(setupChecks).filter(Boolean).length
  const setupTotal = Object.values(setupChecks).length

  const getInitials = (name: string) => {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  }

  const initColors = ['#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#22c55e', '#ef4444']

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-ink">{greeting}, {userName} <span>&#128075;</span></h2>
          <p className="text-sm mt-1" style={{ color: 'rgba(42,37,32,0.5)' }}>Here is what is happening with your agency today.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-cream bg-white">
            <span style={{ color: 'rgba(42,37,32,0.3)' }}>&#128269;</span>
            <span className="text-sm" style={{ color: 'rgba(42,37,32,0.4)' }}>Search anything...</span>
          </div>
          <button className="w-10 h-10 rounded-lg border border-cream bg-white flex items-center justify-center relative">
            <span style={{ color: 'rgba(42,37,32,0.5)' }}>&#128276;</span>
          </button>
          <a href="/clients" className="px-4 py-2.5 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#2A2520' }}>+ New</a>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Revenue', value: formatMoney(stats.revenue), icon: '&#128176;', change: '+12.5%' },
          { label: 'Active Projects', value: stats.projects.toString(), icon: '&#128197;', change: '+20%' },
          { label: 'Tasks Completed', value: stats.tasksCompleted.toString(), icon: '&#9989;', change: '+15%' },
          { label: 'Outstanding Invoices', value: formatMoney(stats.outstanding), icon: '&#128196;', change: '' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl p-5 border border-cream">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium" style={{ color: 'rgba(42,37,32,0.5)' }}>{stat.label}</p>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FAF8F0' }}>
                <span dangerouslySetInnerHTML={{ __html: stat.icon }} />
              </div>
            </div>
            <p className="text-2xl font-bold text-ink">{stat.value}</p>
            {stat.change && (
              <p className="text-xs mt-1" style={{ color: '#16a34a' }}>&#8599; {stat.change} from last month</p>
            )}
          </div>
        ))}
      </div>

      {/* Revenue Chart + Recent Activity */}
      <div className="grid grid-cols-5 gap-6 mb-6">
        <div className="col-span-3 bg-white rounded-xl border border-cream p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-ink">Revenue Overview</h3>
            <span className="text-xs px-3 py-1.5 rounded-lg border border-cream" style={{ color: 'rgba(42,37,32,0.5)' }}>This Month</span>
          </div>
          <div className="h-48 flex items-end gap-1">
            {Array.from({ length: 30 }, (_, i) => {
              const h = Math.max(15, Math.random() * 80 + (i * 2))
              return (
                <div key={i} className="flex-1 rounded-t transition-all hover:opacity-80" style={{ height: h + '%', backgroundColor: i < 25 ? '#FFFDB4' : '#EBE3D3' }} />
              )
            })}
          </div>
          <div className="flex items-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#FFFDB4' }} />
              <span className="text-xs" style={{ color: 'rgba(42,37,32,0.5)' }}>This Month</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#EBE3D3' }} />
              <span className="text-xs" style={{ color: 'rgba(42,37,32,0.5)' }}>Last Month</span>
            </div>
          </div>
        </div>

        <div className="col-span-2 bg-white rounded-xl border border-cream p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-ink">Recent Activity</h3>
            <a href="/tasks" className="text-xs font-medium" style={{ color: 'rgba(42,37,32,0.5)' }}>View all</a>
          </div>
          <div className="space-y-4">
            {recentActivity.length === 0 ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm flex-shrink-0" style={{ backgroundColor: '#FAF8F0' }}>&#128196;</div>
                  <div>
                    <p className="text-sm font-medium text-ink">Portal created</p>
                    <p className="text-xs" style={{ color: 'rgba(42,37,32,0.4)' }}>Your GScale Portal is live</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(42,37,32,0.3)' }}>Just now</p>
                  </div>
                </div>
              </div>
            ) : (
              recentActivity.map((item) => (
                <div key={item.id} className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm flex-shrink-0" style={{ backgroundColor: '#FAF8F0' }}>&#128196;</div>
                  <div>
                    <p className="text-sm font-medium text-ink">{item.action}</p>
                    <p className="text-xs" style={{ color: 'rgba(42,37,32,0.4)' }}>{item.details?.description || ''}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(42,37,32,0.3)' }}>{new Date(item.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Upcoming Tasks + Projects Overview + Top Clients */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        {/* Upcoming Tasks */}
        <div className="bg-white rounded-xl border border-cream p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-ink">Upcoming Tasks</h3>
            <a href="/tasks" className="text-xs font-medium" style={{ color: 'rgba(42,37,32,0.5)' }}>View all</a>
          </div>
          <div className="space-y-3">
            {upcomingTasks.length === 0 && (
              <p className="text-sm py-4 text-center" style={{ color: 'rgba(42,37,32,0.3)' }}>No upcoming tasks</p>
            )}
            {upcomingTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#f59e0b' }} />
                  <div>
                    <p className="text-sm font-medium text-ink">{task.title}</p>
                    <p className="text-xs" style={{ color: 'rgba(42,37,32,0.4)' }}>{task.clients?.business_name || ''}</p>
                  </div>
                </div>
                {task.due_date && (
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{
                    backgroundColor: formatDue(task.due_date) === 'Today' ? '#fef3c7' : '#FAF8F0',
                    color: formatDue(task.due_date) === 'Today' ? '#d97706' : 'rgba(42,37,32,0.5)',
                  }}>
                    {formatDue(task.due_date)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Projects Overview - Donut */}
        <div className="bg-white rounded-xl border border-cream p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-ink">Tasks Overview</h3>
            <a href="/tasks" className="text-xs font-medium" style={{ color: 'rgba(42,37,32,0.5)' }}>View all</a>
          </div>
          <div className="flex items-center justify-center py-4">
            <div className="relative">
              <svg width="140" height="140" viewBox="0 0 140 140">
                {(() => {
                  const total = totalTasks || 1
                  const segments = [
                    { value: tasksByStatus.in_progress, color: '#f59e0b' },
                    { value: tasksByStatus.in_review, color: '#3b82f6' },
                    { value: tasksByStatus.done, color: '#2A2520' },
                    { value: tasksByStatus.todo, color: '#EBE3D3' },
                  ]
                  let offset = 0
                  const r = 55
                  const circ = 2 * Math.PI * r
                  return segments.map((seg, i) => {
                    const pct = seg.value / total
                    const dash = pct * circ
                    const gap = circ - dash
                    const el = (
                      <circle
                        key={i}
                        cx="70" cy="70" r={r}
                        fill="none"
                        stroke={seg.color}
                        strokeWidth="16"
                        strokeDasharray={`${dash} ${gap}`}
                        strokeDashoffset={-offset}
                        transform="rotate(-90 70 70)"
                      />
                    )
                    offset += dash
                    return el
                  })
                })()}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-2xl font-bold text-ink">{totalTasks}</p>
                <p className="text-xs" style={{ color: 'rgba(42,37,32,0.4)' }}>Total Tasks</p>
              </div>
            </div>
          </div>
          <div className="space-y-2 mt-2">
            {[
              { label: 'In Progress', value: tasksByStatus.in_progress, color: '#f59e0b' },
              { label: 'In Review', value: tasksByStatus.in_review, color: '#3b82f6' },
              { label: 'Completed', value: tasksByStatus.done, color: '#2A2520' },
              { label: 'To Do', value: tasksByStatus.todo, color: '#EBE3D3' },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-xs" style={{ color: 'rgba(42,37,32,0.6)' }}>{s.label}</span>
                </div>
                <span className="text-xs font-medium" style={{ color: 'rgba(42,37,32,0.5)' }}>
                  {s.value} ({totalTasks > 0 ? Math.round((s.value / totalTasks) * 100) : 0}%)
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Clients */}
        <div className="bg-white rounded-xl border border-cream p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-ink">Top Clients</h3>
            <a href="/clients" className="text-xs font-medium" style={{ color: 'rgba(42,37,32,0.5)' }}>View all</a>
          </div>
          <div className="space-y-3">
            {topClients.length === 0 && (
              <p className="text-sm py-4 text-center" style={{ color: 'rgba(42,37,32,0.3)' }}>No active clients</p>
            )}
            {topClients.map((client, i) => (
              <div key={client.id} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: initColors[i % initColors.length] }}>
                    {getInitials(client.business_name)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink">{client.business_name}</p>
                    <p className="text-xs" style={{ color: 'rgba(42,37,32,0.4)' }}>{client.status}</p>
                  </div>
                </div>
                <p className="text-sm font-semibold text-ink">${client.monthly_retainer.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Setup Checklist */}
      {setupComplete < setupTotal && (
        <div className="bg-white rounded-xl border border-cream p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span>&#10024;</span>
                <h3 className="text-sm font-semibold text-ink">Setup your portal</h3>
              </div>
              <p className="text-xs mb-3" style={{ color: 'rgba(42,37,32,0.5)' }}>Finish these steps to get the most out of your portal.</p>
              <div className="space-y-2">
                {[
                  { label: 'Add your team', done: setupChecks.team, href: '/team' },
                  { label: 'Invite a client', done: setupChecks.client, href: '/clients' },
                  { label: 'Create a project', done: setupChecks.project, href: '/tasks' },
                  { label: 'Send an invoice', done: setupChecks.invoice, href: '/invoices' },
                ].map((step) => (
                  <a key={step.label} href={step.href} className="flex items-center gap-2 text-sm" style={{ color: step.done ? '#16a34a' : 'rgba(42,37,32,0.6)' }}>
                    <span>{step.done ? '\u2705' : '\u25CB'}</span>
                    <span style={{ textDecoration: step.done ? 'line-through' : 'none' }}>{step.label}</span>
                  </a>
                ))}
              </div>
              <div className="mt-3 w-48 h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#EBE3D3' }}>
                <div className="h-full rounded-full" style={{ width: (setupComplete / setupTotal * 100) + '%', backgroundColor: '#f59e0b' }} />
              </div>
              <p className="text-xs mt-1" style={{ color: 'rgba(42,37,32,0.4)' }}>{Math.round(setupComplete / setupTotal * 100)}% completed</p>
            </div>
            <a href="/clients" className="px-5 py-2.5 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#2A2520' }}>Continue Setup &#8594;</a>
          </div>
        </div>
      )}
    </div>
  )
}
