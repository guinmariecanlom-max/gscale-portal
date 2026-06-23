'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'

type Channel = {
  id: string
  name: string
  type: string
  client_id: string | null
}

type Message = {
  id: string
  content: string
  sender_user_id: string
  created_at: string
  users?: { full_name: string; email: string }
}

export default function MessagesPage() {
  const [channels, setChannels] = useState<Channel[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [newChannelName, setNewChannelName] = useState('')
  const [showNewChannel, setShowNewChannel] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) setUserId(session.user.id)

      const { data } = await supabase
        .from('channels')
        .select('*')
        .order('created_at', { ascending: true })

      if (data && data.length > 0) {
        setChannels(data)
        setActiveChannel(data[0])
      } else {
        setChannels([])
      }
      setLoading(false)
    }
    init()
  }, [])

  useEffect(() => {
    if (!activeChannel) return

    const loadMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*, users(full_name, email)')
        .eq('channel_id', activeChannel.id)
        .order('created_at', { ascending: true })

      if (data) setMessages(data)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }
    loadMessages()

    const subscription = supabase
      .channel(`messages-${activeChannel.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `channel_id=eq.${activeChannel.id}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message])
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [activeChannel])

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !activeChannel || !userId) return

    await supabase.from('messages').insert({
      channel_id: activeChannel.id,
      sender_user_id: userId,
      content: newMessage.trim(),
    })

    setNewMessage('')
  }

  const createChannel = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newChannelName.trim()) return

    const { data, error } = await supabase
      .from('channels')
      .insert({ name: newChannelName.trim(), type: 'general' })
      .select()
      .single()

    if (!error && data) {
      setChannels(prev => [...prev, data])
      setActiveChannel(data)
      setNewChannelName('')
      setShowNewChannel(false)
    }
  }

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr)
    const today = new Date()
    const isToday = d.toDateString() === today.toDateString()
    if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  if (loading) return <p style={{ color: 'rgba(42,37,32,0.5)' }}>Loading messages...</p>

  return (
    <div className="flex rounded-xl border border-cream overflow-hidden bg-white" style={{ height: 'calc(100vh - 130px)' }}>
      {/* Channel List */}
      <div className="w-56 border-r border-cream flex flex-col" style={{ backgroundColor: '#FAF8F0' }}>
        <div className="px-4 py-3 border-b border-cream flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink">Channels</h3>
          <button onClick={() => setShowNewChannel(true)} className="text-lg leading-none" style={{ color: 'rgba(42,37,32,0.4)' }}>+</button>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {channels.map((ch) => (
            <button
              key={ch.id}
              onClick={() => setActiveChannel(ch)}
              className="w-full text-left px-4 py-2.5 text-sm transition-colors"
              style={{
                backgroundColor: activeChannel?.id === ch.id ? '#FFFDB4' : 'transparent',
                color: activeChannel?.id === ch.id ? '#2A2520' : 'rgba(42,37,32,0.6)',
                fontWeight: activeChannel?.id === ch.id ? 600 : 400,
              }}
            >
              # {ch.name}
            </button>
          ))}
          {channels.length === 0 && (
            <p className="px-4 py-4 text-xs" style={{ color: 'rgba(42,37,32,0.3)' }}>No channels yet. Create one to start.</p>
          )}
        </div>

        {showNewChannel && (
          <div className="px-3 py-3 border-t border-cream">
            <form onSubmit={createChannel}>
              <input
                type="text"
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                placeholder="Channel name"
                className="w-full px-3 py-2 text-sm border border-cream rounded-lg focus:outline-none"
                autoFocus
              />
              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => setShowNewChannel(false)} className="flex-1 py-1.5 text-xs rounded border border-cream" style={{ color: 'rgba(42,37,32,0.5)' }}>Cancel</button>
                <button type="submit" className="flex-1 py-1.5 text-xs rounded text-white" style={{ backgroundColor: '#2A2520' }}>Create</button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 flex flex-col">
        {activeChannel ? (
          <>
            <div className="px-6 py-3 border-b border-cream">
              <h3 className="text-sm font-semibold text-ink"># {activeChannel.name}</h3>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {messages.length === 0 && (
                <p className="text-center py-12 text-sm" style={{ color: 'rgba(42,37,32,0.3)' }}>No messages yet. Start the conversation.</p>
              )}
              {messages.map((msg) => {
                const isMe = msg.sender_user_id === userId
                return (
                  <div key={msg.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: isMe ? '#2A2520' : '#EBE3D3', color: isMe ? '#FFFFFF' : '#2A2520' }}>
                      {(msg.users?.full_name || msg.users?.email || '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-semibold text-ink">{msg.users?.full_name || msg.users?.email || 'Unknown'}</span>
                        <span className="text-xs" style={{ color: 'rgba(42,37,32,0.35)' }}>{formatTime(msg.created_at)}</span>
                      </div>
                      <p className="text-sm mt-0.5" style={{ color: 'rgba(42,37,32,0.8)' }}>{msg.content}</p>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>

            <form onSubmit={sendMessage} className="px-6 py-3 border-t border-cream">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={`Message #${activeChannel.name}`}
                  className="flex-1 px-4 py-2.5 border border-cream rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ink/10"
                />
                <button type="submit" className="px-5 py-2.5 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#2A2520' }}>Send</button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm" style={{ color: 'rgba(42,37,32,0.3)' }}>Create a channel to start messaging</p>
          </div>
        )}
      </div>
    </div>
  )
}
