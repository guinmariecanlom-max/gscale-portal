'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'

type Channel = {
  id: string
  name: string
  type: string
  client_id: string | null
  created_at: string
}

type Message = {
  id: string
  content: string
  sender_user_id: string
  channel_id: string
  created_at: string
  users?: { full_name: string; email: string }
}

type UserProfile = {
  id: string
  full_name: string
  email: string
}

const initColors = ['#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#22c55e', '#ef4444', '#06b6d4', '#84cc16']

export default function MessagesPage() {
  const [channels, setChannels] = useState<Channel[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [newChannelName, setNewChannelName] = useState('')
  const [showNewChannel, setShowNewChannel] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  const loadChannels = async () => {
    const { data } = await supabase.from('channels').select('*').order('created_at', { ascending: true })
    if (data) setChannels(data)
    return data
  }

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) setUserId(session.user.id)

      const channelsData = await loadChannels()
      const { data: usersData } = await supabase.from('users').select('id, full_name, email')

      if (channelsData && channelsData.length > 0) setActiveChannel(channelsData[0])
      if (usersData) setUsers(usersData)
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
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `channel_id=eq.${activeChannel.id}` }, async (payload) => {
        const newMsg = payload.new as Message
        const { data: userData } = await supabase.from('users').select('full_name, email').eq('id', newMsg.sender_user_id).single()
        newMsg.users = userData || undefined
        setMessages(prev => [...prev, newMsg])
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
      })
      .subscribe()

    return () => { supabase.removeChannel(subscription) }
  }, [activeChannel])

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !activeChannel || !userId) return
    await supabase.from('messages').insert({ channel_id: activeChannel.id, sender_user_id: userId, content: newMessage.trim() })
    setNewMessage('')
  }

  const createChannel = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newChannelName.trim()) return
    const { data, error } = await supabase.from('channels').insert({ name: newChannelName.trim(), type: 'general' }).select().single()
    if (!error && data) {
      setChannels(prev => [...prev, data])
      setActiveChannel(data)
      setNewChannelName('')
      setShowNewChannel(false)
    }
  }

  const openDM = async (otherUser: UserProfile) => {
    if (!userId) return
    const myName = users.find(u => u.id === userId)?.full_name || 'Me'
    const dmName = `dm-${[userId, otherUser.id].sort().join('-')}`

    const existing = channels.find(c => c.type === 'dm' && c.name === dmName)
    if (existing) {
      setActiveChannel(existing)
      return
    }

    const { data, error } = await supabase
      .from('channels')
      .insert({ name: dmName, type: 'dm' })
      .select()
      .single()

    if (!error && data) {
      setChannels(prev => [...prev, data])
      setActiveChannel(data)
    }
  }

  const deleteChannel = async () => {
    if (!activeChannel) return
    await supabase.from('messages').delete().eq('channel_id', activeChannel.id)
    await supabase.from('channel_members').delete().eq('channel_id', activeChannel.id)
    await supabase.from('channels').delete().eq('id', activeChannel.id)
    setChannels(prev => prev.filter(c => c.id !== activeChannel.id))
    setActiveChannel(channels.filter(c => c.id !== activeChannel.id)[0] || null)
    setShowDeleteConfirm(false)
    setShowDetails(false)
  }

  const getDMDisplayName = (channelName: string) => {
    if (!userId) return channelName
    const parts = channelName.replace('dm-', '').split('-')
    const otherParts: string[] = []
    let temp = ''
    for (const p of parts) {
      temp = temp ? temp + '-' + p : p
      if (temp.length >= 36) {
        otherParts.push(temp)
        temp = ''
      }
    }
    const otherId = otherParts.find(id => id !== userId) || ''
    const otherUser = users.find(u => u.id === otherId)
    return otherUser?.full_name || otherUser?.email || 'Direct Message'
  }

  const getInitials = (name: string) => {
    if (!name) return '?'
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  }

  const getColor = (id: string) => {
    let hash = 0
    for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash)
    return initColors[Math.abs(hash) % initColors.length]
  }

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date()
    yesterday.setDate(today.getDate() - 1)
    if (d.toDateString() === today.toDateString()) return 'Today'
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  const groupMessagesByDate = (msgs: Message[]) => {
    const groups: { date: string; messages: Message[] }[] = []
    msgs.forEach((msg) => {
      const dateKey = new Date(msg.created_at).toDateString()
      const existing = groups.find(g => g.date === dateKey)
      if (existing) existing.messages.push(msg)
      else groups.push({ date: dateKey, messages: [msg] })
    })
    return groups
  }

  if (loading) return (<p style={{ color: 'rgba(42,37,32,0.5)' }}>Loading messages...</p>)

  const messageGroups = groupMessagesByDate(messages)
  const channelDisplayName = activeChannel?.type === 'dm' ? getDMDisplayName(activeChannel.name) : activeChannel?.name || ''

  return (
    <div className="flex rounded-xl border border-cream overflow-hidden bg-white" style={{ height: 'calc(100vh - 130px)' }}>
      {/* Channel Sidebar */}
      <div className="w-64 border-r border-cream flex flex-col" style={{ backgroundColor: '#FAF8F0' }}>
        <div className="px-4 py-4 border-b border-cream flex items-center justify-between">
          <span className="text-sm font-semibold" style={{ color: '#2A2520' }}>GScale Agency</span>
          <button onClick={() => setShowNewChannel(true)} className="w-7 h-7 rounded flex items-center justify-center hover:bg-cream/50" style={{ color: 'rgba(42,37,32,0.4)' }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Channels */}
          <div className="px-3 pt-4 pb-2">
            <div className="flex items-center justify-between px-2 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(42,37,32,0.4)' }}>Channels</span>
              <button onClick={() => setShowNewChannel(true)} className="text-xs" style={{ color: 'rgba(42,37,32,0.3)' }}>+</button>
            </div>
            {channels.filter(c => c.type !== 'dm').map((ch) => (
              <button key={ch.id} onClick={() => { setActiveChannel(ch); setShowDetails(false) }} className="w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors mb-0.5" style={{
                backgroundColor: activeChannel?.id === ch.id ? '#FFFDB4' : 'transparent',
                color: activeChannel?.id === ch.id ? '#2A2520' : 'rgba(42,37,32,0.6)',
                fontWeight: activeChannel?.id === ch.id ? 600 : 400,
              }}>
                <span style={{ color: 'rgba(42,37,32,0.35)' }}>#</span>
                {ch.name}
              </button>
            ))}
          </div>

          {/* Direct Messages */}
          <div className="px-3 pt-2 pb-4">
            <div className="flex items-center justify-between px-2 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(42,37,32,0.4)' }}>Direct Messages</span>
            </div>

            {/* Existing DM channels */}
            {channels.filter(c => c.type === 'dm').map((ch) => (
              <button key={ch.id} onClick={() => { setActiveChannel(ch); setShowDetails(false) }} className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors mb-0.5" style={{
                backgroundColor: activeChannel?.id === ch.id ? '#FFFDB4' : 'transparent',
                color: activeChannel?.id === ch.id ? '#2A2520' : 'rgba(42,37,32,0.7)',
                fontWeight: activeChannel?.id === ch.id ? 600 : 400,
              }}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: getColor(ch.id) }}>
                  {getInitials(getDMDisplayName(ch.name))}
                </div>
                {getDMDisplayName(ch.name)}
              </button>
            ))}

            {/* Users to start new DM */}
            {users.filter(u => u.id !== userId).filter(u => {
              const dmName = `dm-${[userId, u.id].sort().join('-')}`
              return !channels.some(c => c.type === 'dm' && c.name === dmName)
            }).map((u) => (
              <button key={u.id} onClick={() => openDM(u)} className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm cursor-pointer hover:bg-cream/50 transition-colors mb-0.5">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: getColor(u.id) }}>
                  {getInitials(u.full_name || u.email)}
                </div>
                <span style={{ color: 'rgba(42,37,32,0.7)' }}>{u.full_name || u.email}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Quick Tip */}
        <div className="px-3 py-3 border-t border-cream">
          <div className="rounded-lg p-3" style={{ backgroundColor: '#FFFDF0' }}>
            <p className="text-xs font-medium mb-1" style={{ color: '#2A2520' }}>&#10024; Quick Tip</p>
            <p className="text-xs" style={{ color: 'rgba(42,37,32,0.5)' }}>Click a name to start a direct message.</p>
          </div>
        </div>

        {/* New Channel Form */}
        {showNewChannel && (
          <div className="px-3 py-3 border-t border-cream">
            <form onSubmit={createChannel}>
              <input type="text" value={newChannelName} onChange={(e) => setNewChannelName(e.target.value)} placeholder="Channel name" className="w-full px-3 py-2 text-sm border border-cream rounded-lg focus:outline-none" autoFocus />
              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => setShowNewChannel(false)} className="flex-1 py-1.5 text-xs rounded border border-cream" style={{ color: 'rgba(42,37,32,0.5)' }}>Cancel</button>
                <button type="submit" className="flex-1 py-1.5 text-xs rounded text-white" style={{ backgroundColor: '#2A2520' }}>Create</button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Main Messages Area */}
      <div className="flex-1 flex flex-col">
        {activeChannel ? (
          <>
            {/* Channel Header */}
            <div className="px-6 py-3 border-b border-cream flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold" style={{ color: '#2A2520' }}>
                    {activeChannel.type === 'dm' ? channelDisplayName : '# ' + channelDisplayName}
                  </h3>
                </div>
                <p className="text-xs" style={{ color: 'rgba(42,37,32,0.4)' }}>
                  {activeChannel.type === 'dm' ? 'Direct message' : 'Channel conversation'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {activeChannel.type !== 'dm' && (
                  <div className="flex -space-x-2">
                    {users.slice(0, 4).map((u) => (
                      <div key={u.id} className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 border-white" style={{ backgroundColor: getColor(u.id) }}>
                        {getInitials(u.full_name || u.email)}
                      </div>
                    ))}
                    {users.length > 4 && (
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium border-2 border-white" style={{ backgroundColor: '#EBE3D3', color: 'rgba(42,37,32,0.5)' }}>+{users.length - 4}</div>
                    )}
                  </div>
                )}
                <button onClick={() => setShowDetails(!showDetails)} className="w-8 h-8 rounded-lg border border-cream flex items-center justify-center hover:bg-cream/50" style={{ color: 'rgba(42,37,32,0.4)' }}>
                  &#9776;
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {messages.length === 0 && (
                <div className="text-center py-16">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#FAF8F0' }}>
                    <span className="text-2xl">{activeChannel.type === 'dm' ? '&#128172;' : '#'}</span>
                  </div>
                  <h3 className="text-lg font-semibold mb-1" style={{ color: '#2A2520' }}>
                    {activeChannel.type === 'dm' ? 'Start a conversation with ' + channelDisplayName : 'Welcome to #' + channelDisplayName}
                  </h3>
                  <p className="text-sm" style={{ color: 'rgba(42,37,32,0.4)' }}>Send a message to get things going.</p>
                </div>
              )}

              {messageGroups.map((group) => (
                <div key={group.date}>
                  <div className="flex items-center gap-4 my-6">
                    <div className="flex-1 h-px" style={{ backgroundColor: '#EBE3D3' }} />
                    <span className="text-xs font-medium px-3 py-1 rounded-full border border-cream" style={{ color: 'rgba(42,37,32,0.5)', backgroundColor: '#FFFFFF' }}>
                      {formatDate(group.messages[0].created_at)}
                    </span>
                    <div className="flex-1 h-px" style={{ backgroundColor: '#EBE3D3' }} />
                  </div>

                  {group.messages.map((msg, idx) => {
                    const senderName = msg.users?.full_name || msg.users?.email || 'Unknown'
                    const prevMsg = idx > 0 ? group.messages[idx - 1] : null
                    const sameAuthor = prevMsg && prevMsg.sender_user_id === msg.sender_user_id
                    const timeDiff = prevMsg ? (new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime()) / 60000 : 999
                    const showHeader = !sameAuthor || timeDiff > 5

                    return (
                      <div key={msg.id} className={`group flex gap-3 px-2 py-1 rounded-lg hover:bg-cream-light/50 transition-colors ${showHeader ? 'mt-4' : 'mt-0.5'}`}>
                        {showHeader ? (
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5" style={{ backgroundColor: getColor(msg.sender_user_id) }}>
                            {getInitials(senderName)}
                          </div>
                        ) : (
                          <div className="w-9 flex-shrink-0 flex items-center justify-center">
                            <span className="text-xs opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'rgba(42,37,32,0.3)' }}>
                              {formatTime(msg.created_at)}
                            </span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          {showHeader && (
                            <div className="flex items-baseline gap-2 mb-0.5">
                              <span className="text-sm font-semibold" style={{ color: '#2A2520' }}>{senderName}</span>
                              <span className="text-xs" style={{ color: 'rgba(42,37,32,0.35)' }}>{formatTime(msg.created_at)}</span>
                            </div>
                          )}
                          <p className="text-sm leading-relaxed" style={{ color: 'rgba(42,37,32,0.85)' }}>{msg.content}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Message Input */}
            <div className="px-6 py-4 border-t border-cream">
              <form onSubmit={sendMessage}>
                <div className="border border-cream rounded-xl overflow-hidden bg-white">
                  <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder={activeChannel.type === 'dm' ? `Message ${channelDisplayName}` : `Message #${channelDisplayName}`} className="w-full px-4 py-3 text-sm focus:outline-none" style={{ color: '#2A2520' }} />
                  <div className="flex items-center justify-between px-3 py-2 border-t border-cream/50">
                    <div className="flex items-center gap-1">
                      <button type="button" className="w-8 h-8 rounded flex items-center justify-center hover:bg-cream/50" style={{ color: 'rgba(42,37,32,0.35)' }}><span className="text-lg">+</span></button>
                      <button type="button" className="w-8 h-8 rounded flex items-center justify-center hover:bg-cream/50" style={{ color: 'rgba(42,37,32,0.35)' }}><span className="text-sm font-bold">Aa</span></button>
                      <button type="button" className="w-8 h-8 rounded flex items-center justify-center hover:bg-cream/50" style={{ color: 'rgba(42,37,32,0.35)' }}>&#128522;</button>
                      <button type="button" className="w-8 h-8 rounded flex items-center justify-center hover:bg-cream/50" style={{ color: 'rgba(42,37,32,0.35)' }}>@</button>
                    </div>
                    <button type="submit" disabled={!newMessage.trim()} className="w-9 h-9 rounded-lg flex items-center justify-center text-white disabled:opacity-30 transition-opacity" style={{ backgroundColor: '#2A2520' }}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M14 2L7 9M14 2l-5 12-2-5-5-2 12-5z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#FAF8F0' }}>
                <span className="text-2xl">&#128172;</span>
              </div>
              <h3 className="text-lg font-semibold mb-1" style={{ color: '#2A2520' }}>Start a conversation</h3>
              <p className="text-sm mb-4" style={{ color: 'rgba(42,37,32,0.4)' }}>Create a channel or click a name to send a DM.</p>
              <button onClick={() => setShowNewChannel(true)} className="px-4 py-2.5 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#2A2520' }}>Create Channel</button>
            </div>
          </div>
        )}
      </div>

      {/* Details Sidebar */}
      {showDetails && activeChannel && (
        <div className="w-72 border-l border-cream flex flex-col overflow-y-auto bg-white">
          <div className="px-5 py-4 border-b border-cream flex items-center justify-between">
            <h3 className="text-sm font-semibold" style={{ color: '#2A2520' }}>{activeChannel.type === 'dm' ? 'Conversation Details' : 'Channel Details'}</h3>
            <button onClick={() => setShowDetails(false)} className="text-lg" style={{ color: 'rgba(42,37,32,0.3)' }}>x</button>
          </div>

          <div className="px-5 py-5 border-b border-cream text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: '#FAF8F0' }}>
              <span className="text-xl font-bold" style={{ color: 'rgba(42,37,32,0.4)' }}>{activeChannel.type === 'dm' ? '&#128172;' : '#'}</span>
            </div>
            <h4 className="text-base font-semibold" style={{ color: '#2A2520' }}>
              {activeChannel.type === 'dm' ? channelDisplayName : '# ' + channelDisplayName}
            </h4>
            <p className="text-xs mt-1" style={{ color: 'rgba(42,37,32,0.4)' }}>Created on {new Date(activeChannel.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </div>

          <div className="px-5 py-4 border-b border-cream">
            <h5 className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'rgba(42,37,32,0.4)' }}>About</h5>
            <p className="text-sm" style={{ color: 'rgba(42,37,32,0.6)' }}>
              {activeChannel.type === 'dm' ? 'Private conversation with ' + channelDisplayName : 'All discussions related to ' + channelDisplayName + '.'}
            </p>
          </div>

          {activeChannel.type !== 'dm' && (
            <div className="px-5 py-4 border-b border-cream">
              <div className="flex items-center justify-between mb-3">
                <h5 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(42,37,32,0.4)' }}>Members</h5>
                <span className="text-xs font-medium" style={{ color: 'rgba(42,37,32,0.4)' }}>{users.length}</span>
              </div>
              <div className="flex -space-x-2">
                {users.slice(0, 6).map((u) => (
                  <div key={u.id} className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 border-white" style={{ backgroundColor: getColor(u.id) }}>
                    {getInitials(u.full_name || u.email)}
                  </div>
                ))}
                {users.length > 6 && (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium border-2 border-white" style={{ backgroundColor: '#EBE3D3', color: 'rgba(42,37,32,0.5)' }}>+{users.length - 6}</div>
                )}
              </div>
            </div>
          )}

          <div className="px-5 py-4 border-b border-cream">
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: 'rgba(42,37,32,0.6)' }}>Notifications</span>
              <div className="w-10 h-6 rounded-full relative cursor-pointer" style={{ backgroundColor: '#f59e0b' }}>
                <div className="w-4 h-4 bg-white rounded-full absolute top-1 right-1" />
              </div>
            </div>
          </div>

          {/* Delete Channel */}
          <div className="px-5 py-4">
            {!showDeleteConfirm ? (
              <button onClick={() => setShowDeleteConfirm(true)} className="w-full py-2.5 rounded-lg border text-sm font-medium transition-colors hover:bg-red-50" style={{ borderColor: '#fecaca', color: '#ef4444' }}>
                Delete {activeChannel.type === 'dm' ? 'Conversation' : 'Channel'}
              </button>
            ) : (
              <div>
                <p className="text-sm mb-3" style={{ color: '#ef4444' }}>Delete this {activeChannel.type === 'dm' ? 'conversation' : 'channel'} and all messages? This cannot be undone.</p>
                <div className="flex gap-2">
                  <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2 rounded-lg border border-cream text-sm" style={{ color: 'rgba(42,37,32,0.5)' }}>Cancel</button>
                  <button onClick={deleteChannel} className="flex-1 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#ef4444' }}>Delete</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
