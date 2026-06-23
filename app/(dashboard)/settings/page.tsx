'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

export default function SettingsPage() {
  const [user, setUser] = useState({ full_name: '', email: '', role: '' })
  const [password, setPassword] = useState({ current: '', new_pass: '', confirm: '' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data } = await supabase
        .from('users')
        .select('full_name, email, role')
        .eq('id', session.user.id)
        .single()

      if (data) setUser(data)
    }
    load()
  }, [])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaved(false)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    await supabase
      .from('users')
      .update({ full_name: user.full_name })
      .eq('id', session.user.id)

    await supabase.auth.updateUser({
      data: { full_name: user.full_name }
    })

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordMsg('')

    if (password.new_pass !== password.confirm) {
      setPasswordMsg('Passwords do not match')
      return
    }

    if (password.new_pass.length < 6) {
      setPasswordMsg('Password must be at least 6 characters')
      return
    }

    const { error } = await supabase.auth.updateUser({
      password: password.new_pass,
    })

    if (error) {
      setPasswordMsg(error.message)
    } else {
      setPasswordMsg('Password updated successfully')
      setPassword({ current: '', new_pass: '', confirm: '' })
    }
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold text-ink mb-6">Settings</h2>

      {/* Profile */}
      <div className="bg-white rounded-xl border border-cream p-6 mb-6">
        <h3 className="text-lg font-semibold text-ink mb-4">Profile</h3>
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Full Name</label>
            <input
              type="text"
              value={user.full_name}
              onChange={(e) => setUser({ ...user, full_name: e.target.value })}
              className="w-full px-4 py-2.5 border border-cream rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ink/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Email</label>
            <input
              type="email"
              value={user.email}
              disabled
              className="w-full px-4 py-2.5 border border-cream rounded-lg text-sm bg-cream-light/50"
              style={{ color: 'rgba(42,37,32,0.5)' }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Role</label>
            <input
              type="text"
              value={user.role}
              disabled
              className="w-full px-4 py-2.5 border border-cream rounded-lg text-sm capitalize bg-cream-light/50"
              style={{ color: 'rgba(42,37,32,0.5)' }}
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-ink text-white rounded-lg text-sm font-medium hover:bg-ink/90 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            {saved && <span className="text-sm" style={{ color: '#16a34a' }}>Saved!</span>}
          </div>
        </form>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-xl border border-cream p-6 mb-6">
        <h3 className="text-lg font-semibold text-ink mb-4">Change Password</h3>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1">New Password</label>
            <input
              type="password"
              value={password.new_pass}
              onChange={(e) => setPassword({ ...password, new_pass: e.target.value })}
              className="w-full px-4 py-2.5 border border-cream rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ink/20"
              placeholder="Min 6 characters"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Confirm New Password</label>
            <input
              type="password"
              value={password.confirm}
              onChange={(e) => setPassword({ ...password, confirm: e.target.value })}
              className="w-full px-4 py-2.5 border border-cream rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ink/20"
              placeholder="Type it again"
            />
          </div>
          {passwordMsg && (
            <p className="text-sm" style={{ color: passwordMsg.includes('success') ? '#16a34a' : '#ef4444' }}>{passwordMsg}</p>
          )}
          <button
            type="submit"
            className="px-5 py-2.5 bg-ink text-white rounded-lg text-sm font-medium hover:bg-ink/90 transition-colors"
          >
            Update Password
          </button>
        </form>
      </div>

      {/* Portal Info */}
      <div className="bg-white rounded-xl border border-cream p-6">
        <h3 className="text-lg font-semibold text-ink mb-4">Portal Info</h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm" style={{ color: 'rgba(42,37,32,0.5)' }}>Version</span>
            <span className="text-sm font-mono text-ink">1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm" style={{ color: 'rgba(42,37,32,0.5)' }}>Framework</span>
            <span className="text-sm font-mono text-ink">Next.js 14</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm" style={{ color: 'rgba(42,37,32,0.5)' }}>Database</span>
            <span className="text-sm font-mono text-ink">Supabase</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm" style={{ color: 'rgba(42,37,32,0.5)' }}>Built by</span>
            <span className="text-sm font-mono text-ink">GScale Marketing</span>
          </div>
        </div>
      </div>
    </div>
  )
}
