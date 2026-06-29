'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'

type Agent = {
  id: string
  name: string
  role: string
  avatar_color: string
  system_prompt: string
  specialty: string[]
  status: string
  created_at: string
}

type Conversation = {
  id: string
  agent_id: string
  title: string
  created_at: string
}

type AgentMessage = {
  id: string
  conversation_id: string
  role: string
  content: string
  created_at: string
}

const agentColors = ['#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#22c55e', '#ef4444', '#06b6d4', '#84cc16']

const presetAgents = [
  { name: 'META', role: 'Meta Ads Strategist', color: '#3b82f6', prompt: 'You are a Meta Ads expert for a digital marketing agency called GScale Marketing. You specialize in Facebook and Instagram advertising, campaign structure, audience targeting, creative strategy, scaling strategies, and ROAS optimization. You help plan campaigns, write ad copy, suggest audiences, analyze performance data, and troubleshoot ad issues. Be direct, data-driven, and actionable. When giving recommendations, always explain the reasoning behind them.', specialties: ['Meta Ads', 'Facebook', 'Instagram', 'Ad Copy', 'Audiences'] },
  { name: 'GOOGLE', role: 'Google Ads Specialist', color: '#22c55e', prompt: 'You are a Google Ads expert for a digital marketing agency called GScale Marketing. You specialize in Search, Shopping, Performance Max, Display, and YouTube campaigns. You help with keyword research, bidding strategies, ad copy, landing page recommendations, and campaign optimization. Be precise with technical details and always provide actionable next steps.', specialties: ['Google Ads', 'PPC', 'Keywords', 'Shopping', 'PMax'] },
  { name: 'EMAIL', role: 'Email Marketing Specialist', color: '#8b5cf6', prompt: 'You are a Klaviyo email marketing expert for a digital marketing agency called GScale Marketing. You specialize in email flows, campaigns, segmentation, A/B testing, deliverability, and SMS marketing. You help design automation sequences, write email copy, optimize send times, and improve open/click rates. Focus on revenue-generating strategies and best practices for eCommerce brands.', specialties: ['Klaviyo', 'Email Flows', 'Campaigns', 'SMS', 'Segmentation'] },
  { name: 'SOCIAL', role: 'Social Media Manager', color: '#ec4899', prompt: 'You are a social media expert for a digital marketing agency called GScale Marketing. You specialize in content strategy, content calendars, caption writing, hashtag research, engagement tactics, and platform-specific best practices for Instagram, Facebook, TikTok, and LinkedIn. Help create compelling content plans and write scroll-stopping captions. Be creative and trend-aware.', specialties: ['Instagram', 'Facebook', 'TikTok', 'Content', 'Captions'] },
  { name: 'STRATEGIST', role: 'Marketing Strategist', color: '#f59e0b', prompt: 'You are the head marketing strategist for a digital marketing agency called GScale Marketing. You see the big picture across all channels (Meta Ads, Google Ads, Email, Social Media, CRO). You help create comprehensive marketing plans, allocate budgets across channels, identify growth opportunities, and provide strategic recommendations. Think like a CMO. Be analytical and strategic.', specialties: ['Strategy', 'Planning', 'Budget', 'Growth', 'Analytics'] },
  { name: 'CRO', role: 'Shopify CRO Specialist', color: '#ef4444', prompt: 'You are a Shopify conversion rate optimization expert for a digital marketing agency called GScale Marketing. You specialize in landing page optimization, product page design, checkout flow, A/B testing, site speed, UX improvements, and Shopify Liquid theme development. Help identify conversion bottlenecks and suggest data-backed improvements. Be specific with recommendations.', specialties: ['Shopify', 'CRO', 'Landing Pages', 'UX', 'A/B Testing'] },
]

export default function AITeamPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<AgentMessage[]>([])
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [activeConvo, setActiveConvo] = useState<Conversation | null>(null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [thinking, setThinking] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [showPresets, setShowPresets] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const [createForm, setCreateForm] = useState({
    name: '', role: '', system_prompt: '', specialty: '',
    avatar_color: agentColors[0],
  })

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) setUserId(session.user.id)
      const { data } = await supabase.from('agents').select('*').order('created_at')
      if (data) setAgents(data)
      setLoading(false)
    }
    init()
  }, [])

  const selectAgent = async (agent: Agent) => {
    setSelectedAgent(agent)
    setActiveConvo(null)
    setMessages([])
    const { data } = await supabase.from('agent_conversations').select('*').eq('agent_id', agent.id).order('created_at', { ascending: false })
    if (data) setConversations(data)
  }

  const loadConversation = async (convo: Conversation) => {
    setActiveConvo(convo)
    const { data } = await supabase.from('agent_messages').select('*').eq('conversation_id', convo.id).order('created_at')
    if (data) setMessages(data)
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  const startNewConversation = async () => {
    if (!selectedAgent || !userId) return
    const { data, error } = await supabase.from('agent_conversations').insert({
      agent_id: selectedAgent.id, user_id: userId, title: 'New conversation',
    }).select().single()
    if (!error && data) {
      setConversations(prev => [data, ...prev])
      setActiveConvo(data)
      setMessages([])
    }
  }

  const sendToAgent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !activeConvo || !selectedAgent) return
    const userContent = input.trim()
    setInput('')
    setThinking(true)

    const userMsg: AgentMessage = { id: 'temp-u-' + Date.now(), conversation_id: activeConvo.id, role: 'user', content: userContent, created_at: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)

    await supabase.from('agent_messages').insert({ conversation_id: activeConvo.id, role: 'user', content: userContent })

    if (messages.length === 0) {
      const title = userContent.substring(0, 50) + (userContent.length > 50 ? '...' : '')
      await supabase.from('agent_conversations').update({ title }).eq('id', activeConvo.id)
      setConversations(prev => prev.map(c => c.id === activeConvo.id ? { ...c, title } : c))
    }

    const history = [...messages.filter(m => !m.id.startsWith('temp-')), { role: 'user', content: userContent }]
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, systemPrompt: selectedAgent.system_prompt }),
      })
      const data = await res.json()

      if (data.content) {
        const assistantMsg: AgentMessage = { id: 'temp-a-' + Date.now(), conversation_id: activeConvo.id, role: 'assistant', content: data.content, created_at: new Date().toISOString() }
        setMessages(prev => [...prev.filter(m => !m.id.startsWith('temp-u-')), userMsg, assistantMsg])
        await supabase.from('agent_messages').insert({ conversation_id: activeConvo.id, role: 'assistant', content: data.content })
      } else {
        const errMsg: AgentMessage = { id: 'temp-e-' + Date.now(), conversation_id: activeConvo.id, role: 'assistant', content: 'Sorry, I encountered an error. Please try again.', created_at: new Date().toISOString() }
        setMessages(prev => [...prev, errMsg])
      }
    } catch {
      const errMsg: AgentMessage = { id: 'temp-e-' + Date.now(), conversation_id: activeConvo.id, role: 'assistant', content: 'Connection error. Please try again.', created_at: new Date().toISOString() }
      setMessages(prev => [...prev, errMsg])
    }

    setThinking(false)
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  const createAgent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return
    const { data, error } = await supabase.from('agents').insert({
      name: createForm.name, role: createForm.role, system_prompt: createForm.system_prompt,
      avatar_color: createForm.avatar_color, specialty: createForm.specialty.split(',').map(s => s.trim()).filter(Boolean),
      created_by: userId,
    }).select().single()
    if (!error && data) {
      setAgents(prev => [...prev, data])
      setCreateForm({ name: '', role: '', system_prompt: '', specialty: '', avatar_color: agentColors[0] })
      setShowCreate(false)
    }
  }

  const addPresetAgent = async (preset: typeof presetAgents[0]) => {
    if (!userId) return
    const { data, error } = await supabase.from('agents').insert({
      name: preset.name, role: preset.role, system_prompt: preset.prompt,
      avatar_color: preset.color, specialty: preset.specialties, created_by: userId,
    }).select().single()
    if (!error && data) setAgents(prev => [...prev, data])
  }

  const deleteAgent = async (id: string) => {
    await supabase.from('agent_messages').delete().filter('conversation_id', 'in', `(select id from agent_conversations where agent_id='${id}')`)
    await supabase.from('agent_conversations').delete().eq('agent_id', id)
    await supabase.from('agents').delete().eq('id', id)
    setAgents(prev => prev.filter(a => a.id !== id))
    if (selectedAgent?.id === id) { setSelectedAgent(null); setActiveConvo(null); setMessages([]) }
  }

  const deleteConversation = async (id: string) => {
    await supabase.from('agent_messages').delete().eq('conversation_id', id)
    await supabase.from('agent_conversations').delete().eq('id', id)
    setConversations(prev => prev.filter(c => c.id !== id))
    if (activeConvo?.id === id) { setActiveConvo(null); setMessages([]) }
  }

  const getInitials = (name: string) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  const renderMarkdown = (text: string) => {
    const lines = text.split('\n')
    return lines.map((line, i) => {
      if (line.startsWith('### ')) return <h3 key={i} className="text-sm font-bold text-ink mt-3 mb-1">{line.replace('### ', '')}</h3>
      if (line.startsWith('## ')) return <h2 key={i} className="text-base font-bold text-ink mt-4 mb-1">{line.replace('## ', '')}</h2>
      if (line.startsWith('# ')) return <h1 key={i} className="text-lg font-bold text-ink mt-4 mb-2">{line.replace('# ', '')}</h1>
      if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="text-sm ml-4 list-disc" style={{ color: 'rgba(42,37,32,0.85)' }}>{line.replace(/^[-*] /, '')}</li>
      if (line.match(/^\d+\. /)) return <li key={i} className="text-sm ml-4 list-decimal" style={{ color: 'rgba(42,37,32,0.85)' }}>{line.replace(/^\d+\. /, '')}</li>
      if (line.startsWith('```')) return <div key={i} className="bg-ink/5 rounded px-3 py-1 my-1"><code className="text-xs font-mono">{line.replace(/```\w*/, '')}</code></div>
      if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="text-sm font-bold text-ink">{line.replace(/\*\*/g, '')}</p>
      if (line.trim() === '') return <br key={i} />
      return <p key={i} className="text-sm leading-relaxed" style={{ color: 'rgba(42,37,32,0.85)' }}>{line}</p>
    })
  }

  if (loading) return (<p style={{ color: 'rgba(42,37,32,0.5)' }}>Loading AI Team...</p>)

  return (
    <div className="flex gap-0" style={{ height: 'calc(100vh - 130px)' }}>
      {/* Agent Sidebar */}
      <div className="w-72 border-r border-cream flex flex-col bg-white rounded-l-xl overflow-hidden">
        <div className="px-4 py-4 border-b border-cream">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-ink">AI Team</h2>
            <button onClick={() => setShowCreate(true)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-cream/50" style={{ color: 'rgba(42,37,32,0.4)' }}>+</button>
          </div>
          {agents.length === 0 && (
            <button onClick={() => setShowPresets(true)} className="w-full py-2.5 rounded-lg border border-dashed text-sm font-medium hover:bg-cream/30" style={{ borderColor: '#EBE3D3', color: 'rgba(42,37,32,0.5)' }}>
              Add preset agents
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Agent List */}
          <div className="p-3 space-y-1">
            {agents.map(agent => (
              <button key={agent.id} onClick={() => selectAgent(agent)} className="w-full text-left p-3 rounded-xl transition-colors" style={{
                backgroundColor: selectedAgent?.id === agent.id ? '#FFFDB4' : 'transparent',
              }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: agent.avatar_color }}>
                    {getInitials(agent.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink truncate">{agent.name}</p>
                    <p className="text-xs truncate" style={{ color: 'rgba(42,37,32,0.4)' }}>{agent.role}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {agent.specialty?.slice(0, 3).map((s, i) => (
                    <span key={i} className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: agent.avatar_color + '20', color: agent.avatar_color }}>{s}</span>
                  ))}
                </div>
              </button>
            ))}
          </div>

          {/* Conversations */}
          {selectedAgent && (
            <div className="px-3 pb-3 border-t border-cream mt-2 pt-3">
              <div className="flex items-center justify-between px-2 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(42,37,32,0.4)' }}>Conversations</span>
                <button onClick={startNewConversation} className="text-xs font-medium" style={{ color: '#3b82f6' }}>+ New</button>
              </div>
              {conversations.map(convo => (
                <div key={convo.id} className="flex items-center justify-between group">
                  <button onClick={() => loadConversation(convo)} className="flex-1 text-left px-3 py-2 rounded-lg text-sm truncate transition-colors" style={{
                    backgroundColor: activeConvo?.id === convo.id ? '#FAF8F0' : 'transparent',
                    color: activeConvo?.id === convo.id ? '#2A2520' : 'rgba(42,37,32,0.6)',
                    fontWeight: activeConvo?.id === convo.id ? 500 : 400,
                  }}>{convo.title}</button>
                  <button onClick={() => deleteConversation(convo.id)} className="text-xs px-1 opacity-0 group-hover:opacity-100" style={{ color: '#ef4444' }}>x</button>
                </div>
              ))}
              {conversations.length === 0 && (
                <p className="text-xs text-center py-3" style={{ color: 'rgba(42,37,32,0.3)' }}>No conversations yet</p>
              )}
            </div>
          )}
        </div>

        {/* Agent Actions */}
        {selectedAgent && (
          <div className="px-3 py-3 border-t border-cream">
            <button onClick={() => deleteAgent(selectedAgent.id)} className="w-full py-2 rounded-lg border text-xs font-medium hover:bg-red-50" style={{ borderColor: '#fecaca', color: '#ef4444' }}>Delete Agent</button>
          </div>
        )}
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white rounded-r-xl overflow-hidden border border-cream border-l-0">
        {selectedAgent && activeConvo ? (
          <>
            {/* Header */}
            <div className="px-6 py-3 border-b border-cream flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: selectedAgent.avatar_color }}>
                {getInitials(selectedAgent.name)}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-ink">{selectedAgent.name}</h3>
                <p className="text-xs" style={{ color: 'rgba(42,37,32,0.4)' }}>{selectedAgent.role}</p>
              </div>
              {thinking && (
                <div className="ml-auto flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: selectedAgent.avatar_color }} />
                  <span className="text-xs" style={{ color: 'rgba(42,37,32,0.4)' }}>Thinking...</span>
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {messages.length === 0 && (
                <div className="text-center py-16">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: selectedAgent.avatar_color + '15' }}>
                    <span className="text-2xl font-bold" style={{ color: selectedAgent.avatar_color }}>{getInitials(selectedAgent.name)}</span>
                  </div>
                  <h3 className="text-lg font-semibold mb-1" style={{ color: '#2A2520' }}>Chat with {selectedAgent.name}</h3>
                  <p className="text-sm mb-6" style={{ color: 'rgba(42,37,32,0.4)' }}>{selectedAgent.role}</p>
                  <div className="flex flex-wrap gap-2 justify-center max-w-md mx-auto">
                    {selectedAgent.specialty?.map((s, i) => (
                      <span key={i} className="text-xs px-3 py-1.5 rounded-full" style={{ backgroundColor: selectedAgent.avatar_color + '15', color: selectedAgent.avatar_color }}>{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-3 mb-4 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-1" style={{ backgroundColor: selectedAgent.avatar_color }}>
                      {getInitials(selectedAgent.name)}
                    </div>
                  )}
                  <div className={`max-w-[70%] rounded-2xl px-4 py-3 ${msg.role === 'user' ? '' : ''}`} style={{
                    backgroundColor: msg.role === 'user' ? '#2A2520' : '#FAF8F0',
                    color: msg.role === 'user' ? '#FFFFFF' : undefined,
                  }}>
                    {msg.role === 'user' ? (
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                    ) : (
                      <div>{renderMarkdown(msg.content)}</div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-6 py-4 border-t border-cream">
              <form onSubmit={sendToAgent}>
                <div className="flex gap-3">
                  <input type="text" value={input} onChange={(e) => setInput(e.target.value)} disabled={thinking} placeholder={`Ask ${selectedAgent.name} anything...`} className="flex-1 px-4 py-3 border border-cream rounded-xl text-sm focus:outline-none disabled:opacity-50" style={{ color: '#2A2520' }} />
                  <button type="submit" disabled={!input.trim() || thinking} className="px-5 py-3 rounded-xl text-sm font-medium text-white disabled:opacity-30" style={{ backgroundColor: selectedAgent.avatar_color }}>{thinking ? '...' : 'Send'}</button>
                </div>
              </form>
            </div>
          </>
        ) : selectedAgent ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: selectedAgent.avatar_color + '15' }}>
                <span className="text-2xl font-bold" style={{ color: selectedAgent.avatar_color }}>{getInitials(selectedAgent.name)}</span>
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: '#2A2520' }}>{selectedAgent.name}</h3>
              <p className="text-sm mb-4" style={{ color: 'rgba(42,37,32,0.4)' }}>{selectedAgent.role}</p>
              <button onClick={startNewConversation} className="px-5 py-2.5 rounded-xl text-sm font-medium text-white" style={{ backgroundColor: selectedAgent.avatar_color }}>Start Conversation</button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: '#FAF8F0' }}>
                <span className="text-3xl">🤖</span>
              </div>
              <h3 className="text-xl font-bold mb-2" style={{ color: '#2A2520' }}>Your AI Team</h3>
              <p className="text-sm mb-6" style={{ color: 'rgba(42,37,32,0.5)' }}>Build a team of AI specialists. Each agent has its own expertise, personality, and memory. Select an agent or create a new one to get started.</p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => setShowPresets(true)} className="px-5 py-2.5 rounded-xl text-sm font-medium text-white" style={{ backgroundColor: '#2A2520' }}>Add Preset Agents</button>
                <button onClick={() => setShowCreate(true)} className="px-5 py-2.5 rounded-xl text-sm font-medium border border-cream hover:bg-cream/30" style={{ color: '#2A2520' }}>Create Custom</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Preset Agents Modal */}
      {showPresets && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-cream flex items-center justify-between">
              <h3 className="text-lg font-bold text-ink">Preset AI Agents</h3>
              <button onClick={() => setShowPresets(false)} className="text-xl" style={{ color: 'rgba(42,37,32,0.3)' }}>x</button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              {presetAgents.map((preset, i) => {
                const alreadyAdded = agents.some(a => a.name === preset.name)
                return (
                  <div key={i} className="rounded-xl border border-cream p-4" style={{ opacity: alreadyAdded ? 0.5 : 1 }}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: preset.color }}>
                        {getInitials(preset.name)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-ink">{preset.name}</p>
                        <p className="text-xs" style={{ color: 'rgba(42,37,32,0.4)' }}>{preset.role}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {preset.specialties.map((s, j) => (
                        <span key={j} className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: preset.color + '15', color: preset.color }}>{s}</span>
                      ))}
                    </div>
                    <button onClick={() => addPresetAgent(preset)} disabled={alreadyAdded} className="w-full py-2 rounded-lg text-xs font-medium text-white disabled:opacity-50" style={{ backgroundColor: preset.color }}>
                      {alreadyAdded ? 'Already Added' : 'Add Agent'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Create Agent Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-cream flex items-center justify-between">
              <h3 className="text-lg font-bold text-ink">Create AI Agent</h3>
              <button onClick={() => setShowCreate(false)} className="text-xl" style={{ color: 'rgba(42,37,32,0.3)' }}>x</button>
            </div>
            <form onSubmit={createAgent} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Agent Name *</label>
                  <input type="text" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} className="w-full px-4 py-2.5 border border-cream rounded-lg text-sm" placeholder="e.g. ATLAS" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Role *</label>
                  <input type="text" value={createForm.role} onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })} className="w-full px-4 py-2.5 border border-cream rounded-lg text-sm" placeholder="e.g. SEO Specialist" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Color</label>
                <div className="flex gap-2">
                  {agentColors.map(c => (
                    <button key={c} type="button" onClick={() => setCreateForm({ ...createForm, avatar_color: c })} className="w-8 h-8 rounded-lg" style={{ backgroundColor: c, border: createForm.avatar_color === c ? '3px solid #2A2520' : '3px solid transparent' }} />
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Specialties (comma separated)</label>
                <input type="text" value={createForm.specialty} onChange={(e) => setCreateForm({ ...createForm, specialty: e.target.value })} className="w-full px-4 py-2.5 border border-cream rounded-lg text-sm" placeholder="SEO, Keywords, Backlinks" />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">System Prompt *</label>
                <textarea value={createForm.system_prompt} onChange={(e) => setCreateForm({ ...createForm, system_prompt: e.target.value })} className="w-full px-4 py-2.5 border border-cream rounded-lg text-sm h-32 resize-none" placeholder="You are a..." required />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 py-2.5 border border-cream rounded-lg text-sm font-medium" style={{ color: 'rgba(42,37,32,0.6)' }}>Cancel</button>
                <button type="submit" className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#2A2520' }}>Create Agent</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
