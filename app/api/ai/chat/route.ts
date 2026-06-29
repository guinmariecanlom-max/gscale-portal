import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { messages, systemPrompt } = await req.json()

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: systemPrompt,
        messages: messages,
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      return NextResponse.json({ error: errorData }, { status: response.status })
    }

    const data = await response.json()
    const text = data.content?.map((c: { type: string; text?: string }) => c.type === 'text' ? c.text : '').join('') || ''

    return NextResponse.json({ content: text })
  } catch (err) {
    return NextResponse.json({ error: 'AI request failed' }, { status: 500 })
  }
}
