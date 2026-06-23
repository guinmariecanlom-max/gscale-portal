'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

type Booking = {
  id: string
  type: string
  prospect_name: string
  prospect_email: string
  business_name: string | null
  website: string | null
  scheduled_time: string
  duration_minutes: number
  status: string
  notes: string | null
  created_at: string
}

const statusColors: Record<string, { bg: string; text: string }> = {
  scheduled: { bg: '#eff6ff', text: '#3b82f6' },
  completed: { bg: '#f0fdf4', text: '#16a34a' },
  cancelled: { bg: '#fef2f2', text: '#ef4444' },
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  const loadBookings = async () => {
    const { data } = await supabase
      .from('bookings')
      .select('*')
      .order('scheduled_time', { ascending: false })
    if (data) setBookings(data)
    setLoading(false)
  }

  useEffect(() => {
    loadBookings()
  }, [])

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('bookings').update({ status }).eq('id', id)
    loadBookings()
  }

  const upcoming = bookings.filter(b => b.status === 'scheduled' && new Date(b.scheduled_time) >= new Date())
  const filteredBookings = filter === 'all' ? bookings : bookings.filter(b => b.status === filter)

  if (loading) {
    return (<p style={{ color: 'rgba(42,37,32,0.5)' }}>Loading bookings...</p>)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-ink">Bookings</h2>
          <p className="text-sm mt-1" style={{ color: 'rgba(42,37,32,0.5)' }}>{bookings.length} total bookings</p>
        </div>
        <a href="/book" target="_blank" className="px-4 py-2.5 border border-cream rounded-lg text-sm font-medium hover:bg-cream/30 transition-colors" style={{ color: '#2A2520' }}>View Public Page</a>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-5 border border-cream">
          <p className="text-xs font-medium" style={{ color: 'rgba(42,37,32,0.5)' }}>Upcoming</p>
          <p className="text-2xl font-bold text-ink mt-1">{upcoming.length}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-cream">
          <p className="text-xs font-medium" style={{ color: 'rgba(42,37,32,0.5)' }}>Discovery Calls</p>
          <p className="text-2xl font-bold text-ink mt-1">{bookings.filter(b => b.type === 'discovery').length}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-cream">
          <p className="text-xs font-medium" style={{ color: 'rgba(42,37,32,0.5)' }}>Strategy Calls ($100)</p>
          <p className="text-2xl font-bold mt-1" style={{ color: '#16a34a' }}>{bookings.filter(b => b.type === 'strategy_call').length}</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {['all', 'scheduled', 'completed', 'cancelled'].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className="px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors" style={{ backgroundColor: filter === f ? '#2A2520' : '#FFFFFF', color: filter === f ? '#FFFFFF' : 'rgba(42,37,32,0.6)', border: filter === f ? 'none' : '1px solid #EBE3D3' }}>
            {f === 'all' ? 'All (' + bookings.length + ')' : f + ' (' + bookings.filter(b => b.status === f).length + ')'}
          </button>
        ))}
      </div>

      {filteredBookings.length === 0 ? (
        <div className="bg-white rounded-xl p-12 border border-cream text-center">
          <p className="text-sm" style={{ color: 'rgba(42,37,32,0.4)' }}>No bookings yet. Share your booking link: /book</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBookings.map((booking) => {
            const sc = statusColors[booking.status] || statusColors.scheduled
            const date = new Date(booking.scheduled_time)
            return (
              <div key={booking.id} className="bg-white rounded-xl border border-cream p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-semibold" style={{ color: '#2A2520' }}>{booking.prospect_name}</span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full font-medium capitalize" style={{ backgroundColor: sc.bg, color: sc.text }}>{booking.status}</span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: booking.type === 'discovery' ? '#f0fdf4' : '#FFFDB4', color: '#2A2520' }}>
                        {booking.type === 'discovery' ? 'Discovery (Free)' : 'Strategy ($100)'}
                      </span>
                    </div>
                    <div className="flex gap-4 text-xs" style={{ color: 'rgba(42,37,32,0.5)' }}>
                      <span>{booking.prospect_email}</span>
                      {booking.business_name && (<span>{booking.business_name}</span>)}
                      {booking.website && (<a href={booking.website} target="_blank" rel="noopener noreferrer" className="underline">{booking.website}</a>)}
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-sm font-medium" style={{ color: '#2A2520' }}>
                        {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </span>
                      <span className="text-sm" style={{ color: 'rgba(42,37,32,0.5)' }}>
                        {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="text-xs" style={{ color: 'rgba(42,37,32,0.4)' }}>
                        ({booking.duration_minutes} min)
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {booking.status === 'scheduled' && (
                      <div className="flex gap-2">
                        <button onClick={() => updateStatus(booking.id, 'completed')} className="text-xs px-3 py-1.5 rounded border border-cream hover:bg-cream/50" style={{ color: '#16a34a' }}>Complete</button>
                        <button onClick={() => updateStatus(booking.id, 'cancelled')} className="text-xs px-3 py-1.5 rounded border border-cream hover:bg-cream/50" style={{ color: '#ef4444' }}>Cancel</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
