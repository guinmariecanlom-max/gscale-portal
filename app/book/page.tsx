'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'

const callTypes = [
  {
    key: 'discovery',
    title: 'Discovery Call',
    duration: '30 minutes',
    price: 'Free',
    description: 'Let us learn about your brand and see if we are a good fit.',
  },
  {
    key: 'strategy_call',
    title: 'Strategy Call',
    duration: '60 minutes',
    price: '$100',
    description: 'A deep-dive session where we map out a custom growth plan for your brand.',
  },
]

const timeSlots = [
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM', '01:00 PM', '01:30 PM',
  '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM',
  '04:00 PM', '04:30 PM',
]

export default function BookingPage() {
  const [step, setStep] = useState(1)
  const [selectedType, setSelectedType] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  const [form, setForm] = useState({
    prospect_name: '',
    prospect_email: '',
    business_name: '',
    website: '',
  })

  const getMinDate = () => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0]
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const [hours, minutesPart] = selectedTime.split(':')
    const minutes = minutesPart.slice(0, 2)
    const ampm = minutesPart.slice(3)
    let h = parseInt(hours)
    if (ampm === 'PM' && h !== 12) h += 12
    if (ampm === 'AM' && h === 12) h = 0

    const scheduledTime = new Date(`${selectedDate}T${String(h).padStart(2, '0')}:${minutes}:00`)

    const { error } = await supabase.from('bookings').insert({
      type: selectedType,
      prospect_name: form.prospect_name,
      prospect_email: form.prospect_email,
      business_name: form.business_name || null,
      website: form.website || null,
      scheduled_time: scheduledTime.toISOString(),
      duration_minutes: selectedType === 'discovery' ? 30 : 60,
      status: 'scheduled',
    })

    setSaving(false)
    if (!error) setDone(true)
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FAF8F0' }}>
        <div className="max-w-md text-center p-8">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: '#FFFDB4' }}>
            <span className="text-2xl">✓</span>
          </div>
          <h1 className="text-2xl font-bold mb-3" style={{ color: '#2A2520' }}>You&apos;re booked!</h1>
          <p className="text-sm mb-2" style={{ color: 'rgba(42,37,32,0.6)' }}>
            Your {selectedType === 'discovery' ? 'Discovery Call' : 'Strategy Call'} is confirmed for
          </p>
          <p className="text-lg font-semibold mb-6" style={{ color: '#2A2520' }}>
            {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at {selectedTime}
          </p>
          <p className="text-sm" style={{ color: 'rgba(42,37,32,0.5)' }}>
            We&apos;ll send a confirmation to <strong>{form.prospect_email}</strong>
          </p>
          {selectedType === 'strategy_call' && (
            <div className="mt-6 p-4 rounded-xl" style={{ backgroundColor: '#FFFDB4' }}>
              <p className="text-sm font-medium" style={{ color: '#2A2520' }}>Payment: $100 via PayPal</p>
              <p className="text-xs mt-1" style={{ color: 'rgba(42,37,32,0.6)' }}>Our team will send you a PayPal invoice shortly.</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAF8F0' }}>
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold" style={{ color: '#2A2520' }}>Book a Call</h1>
          <p className="text-sm mt-2" style={{ color: 'rgba(42,37,32,0.5)' }}>GScale Marketing</p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{
                backgroundColor: step >= s ? '#2A2520' : '#EBE3D3',
                color: step >= s ? '#FFFFFF' : 'rgba(42,37,32,0.4)',
              }}>{s}</div>
              {s < 3 && <div className="w-12 h-0.5" style={{ backgroundColor: step > s ? '#2A2520' : '#EBE3D3' }} />}
            </div>
          ))}
        </div>

        {/* Step 1: Choose call type */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-center mb-6" style={{ color: '#2A2520' }}>Choose your call type</h2>
            {callTypes.map((ct) => (
              <button
                key={ct.key}
                onClick={() => { setSelectedType(ct.key); setStep(2) }}
                className="w-full text-left p-6 rounded-xl border-2 transition-colors"
                style={{
                  backgroundColor: '#FFFFFF',
                  borderColor: selectedType === ct.key ? '#2A2520' : '#EBE3D3',
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold" style={{ color: '#2A2520' }}>{ct.title}</h3>
                  <span className="text-sm font-bold" style={{ color: ct.key === 'discovery' ? '#16a34a' : '#2A2520' }}>{ct.price}</span>
                </div>
                <p className="text-sm mb-2" style={{ color: 'rgba(42,37,32,0.6)' }}>{ct.description}</p>
                <p className="text-xs" style={{ color: 'rgba(42,37,32,0.4)' }}>{ct.duration}</p>
              </button>
            ))}
          </div>
        )}

        {/* Step 2: Pick date and time */}
        {step === 2 && (
          <div>
            <h2 className="text-lg font-semibold text-center mb-6" style={{ color: '#2A2520' }}>Pick a date and time</h2>
            <div className="bg-white rounded-xl border border-cream p-6 mb-6">
              <label className="block text-sm font-medium mb-2" style={{ color: '#2A2520' }}>Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={getMinDate()}
                className="w-full px-4 py-2.5 border border-cream rounded-lg text-sm"
              />
            </div>

            {selectedDate && (
              <div className="bg-white rounded-xl border border-cream p-6">
                <label className="block text-sm font-medium mb-3" style={{ color: '#2A2520' }}>Available Times (PHT)</label>
                <div className="grid grid-cols-4 gap-2">
                  {timeSlots.map((time) => (
                    <button
                      key={time}
                      onClick={() => setSelectedTime(time)}
                      className="px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
                      style={{
                        backgroundColor: selectedTime === time ? '#2A2520' : '#FAF8F0',
                        color: selectedTime === time ? '#FFFFFF' : 'rgba(42,37,32,0.7)',
                        border: selectedTime === time ? 'none' : '1px solid #EBE3D3',
                      }}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button onClick={() => setStep(1)} className="flex-1 py-3 border border-cream rounded-lg text-sm font-medium" style={{ color: 'rgba(42,37,32,0.6)' }}>Back</button>
              <button
                onClick={() => selectedDate && selectedTime && setStep(3)}
                disabled={!selectedDate || !selectedTime}
                className="flex-1 py-3 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                style={{ backgroundColor: '#2A2520' }}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Your details */}
        {step === 3 && (
          <form onSubmit={handleSubmit}>
            <h2 className="text-lg font-semibold text-center mb-6" style={{ color: '#2A2520' }}>Your details</h2>
            <div className="bg-white rounded-xl border border-cream p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#2A2520' }}>Your Name *</label>
                <input type="text" value={form.prospect_name} onChange={(e) => setForm({ ...form, prospect_name: e.target.value })} className="w-full px-4 py-2.5 border border-cream rounded-lg text-sm" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#2A2520' }}>Email *</label>
                <input type="email" value={form.prospect_email} onChange={(e) => setForm({ ...form, prospect_email: e.target.value })} className="w-full px-4 py-2.5 border border-cream rounded-lg text-sm" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#2A2520' }}>Business Name</label>
                <input type="text" value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} className="w-full px-4 py-2.5 border border-cream rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#2A2520' }}>Website</label>
                <input type="url" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} className="w-full px-4 py-2.5 border border-cream rounded-lg text-sm" placeholder="https://" />
              </div>
            </div>

            {/* Summary */}
            <div className="rounded-xl p-4 mt-4" style={{ backgroundColor: '#FFFDB4' }}>
              <p className="text-sm font-medium" style={{ color: '#2A2520' }}>
                {selectedType === 'discovery' ? 'Discovery Call (Free)' : 'Strategy Call ($100)'}
              </p>
              <p className="text-xs mt-1" style={{ color: 'rgba(42,37,32,0.6)' }}>
                {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at {selectedTime}
              </p>
            </div>

            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => setStep(2)} className="flex-1 py-3 border border-cream rounded-lg text-sm font-medium" style={{ color: 'rgba(42,37,32,0.6)' }}>Back</button>
              <button type="submit" disabled={saving} className="flex-1 py-3 rounded-lg text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: '#2A2520' }}>
                {saving ? 'Booking...' : selectedType === 'strategy_call' ? 'Book & Pay $100' : 'Book Call'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
