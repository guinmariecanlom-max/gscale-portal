import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { messages, systemPrompt } = await req.json()

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    const body = {
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: systemPrompt || 'You are a helpful assistant.',
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Anthropic API error:', JSON.stringify(data))
      return NextResponse.json({ error: data.error?.message || 'API error', details: data }, { status: response.status })
    }

    const text = data.content?.map((c: { type: string; text?: string }) => c.type === 'text' ? c.text : '').join('') || ''
    return NextResponse.json({ content: text })
  } catch (err) {
    console.error('Chat route error:', err)
    return NextResponse.json({ error: 'Request failed' }, { status: 500 })
  }
}
