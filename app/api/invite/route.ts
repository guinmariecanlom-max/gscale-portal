import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

const resend = new Resend(process.env.RESEND_API_KEY)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { email, channelName, channelId, inviterName, portalUrl } = await req.json()

    if (!email || !channelName) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const signupUrl = `${portalUrl || 'https://gscale-portal-5yyu.vercel.app'}/signup?channel=${channelId}`

    const { data, error } = await resend.emails.send({
      from: 'GScale Portal <onboarding@resend.dev>',
      to: email,
      subject: `${inviterName || 'GScale Team'} invited you to #${channelName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="color: #2A2520; font-size: 24px; margin-bottom: 8px;">You're invited!</h1>
          <p style="color: #666; font-size: 14px; margin-bottom: 24px;">
            ${inviterName || 'Someone'} invited you to join <strong>#${channelName}</strong> on the GScale Portal.
          </p>
          <a href="${signupUrl}" style="display: inline-block; background-color: #2A2520; color: #FFFFFF; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 14px; font-weight: 600;">
            Join Channel
          </a>
          <p style="color: #999; font-size: 12px; margin-top: 32px;">
            GScale Marketing Agency Portal
          </p>
        </div>
      `,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to send invite' }, { status: 500 })
  }
}
