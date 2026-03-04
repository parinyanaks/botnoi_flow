import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'
import crypto from 'crypto'

// Server-side Supabase client with anon key (reads session from Authorization header)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Admin client that bypasses RLS — used for insert operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

// Zoho SMTP transporter (env var names match .env.example)
const smtpUser = process.env.ZOHO_SMTP_USER || process.env.ZOHO_EMAIL_USER
const smtpPass = process.env.ZOHO_SMTP_PASS || process.env.ZOHO_EMAIL_PASSWORD

const transporter = nodemailer.createTransport({
    host: 'smtp.zoho.com',
    port: 465,
    secure: true, // SSL
    auth: {
        user: smtpUser,
        pass: smtpPass,
    },
})

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { name, email, role, projectIds } = body

        // Validate required fields
        if (!name || !email || !role) {
            return NextResponse.json({ error: 'Missing required fields: name, email, role' }, { status: 400 })
        }
        if (role !== 'member' && role !== 'guest') {
            return NextResponse.json({ error: 'Invalid role. Must be member or guest' }, { status: 400 })
        }
        if (role === 'guest' && (!projectIds || projectIds.length === 0)) {
            return NextResponse.json({ error: 'Guest role requires at least one project' }, { status: 400 })
        }

        // Verify the sender is a Botnoi employee via JWT from Authorization header
        const authHeader = req.headers.get('Authorization')
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        const token = authHeader.replace('Bearer ', '')

        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: `Bearer ${token}` } },
        })

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        console.log('[invite/send] Auth result:', { user: user?.email, authError: authError?.message })
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const senderEmail = user.email || ''
        console.log('[invite/send] Sender email:', senderEmail, 'Is Botnoi:', senderEmail.endsWith('@botnoigroup.com'))
        if (!senderEmail.endsWith('@botnoigroup.com')) {
            return NextResponse.json({ error: 'Only Botnoi employees can send invitations' }, { status: 403 })
        }

        // Create the invitation in Supabase (use admin client to bypass RLS)
        // Column names must match DB schema: recipient_name, recipient_email, inviter_name, inviter_email
        const senderName = user.user_metadata?.name || senderEmail
        const inviteToken = crypto.randomUUID()
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours

        const insertPayload: any = {
            token: inviteToken,
            recipient_name: name,
            recipient_email: email,
            role,
            inviter_name: senderName,
            inviter_email: senderEmail,
            expires_at: expiresAt,
            used: false,
        }
        if (role === 'guest' && projectIds?.length > 0) {
            insertPayload.project_ids = projectIds
        }
        console.log('[invite/send] Insert payload:', insertPayload)

        const { data: invitation, error: insertError } = await supabaseAdmin
            .from('invitations')
            .insert(insertPayload)
            .select('*')
            .maybeSingle()

        console.log('[invite/send] Insert result:', { invitation, insertError: insertError?.message, insertErrorDetails: insertError })

        if (insertError || !invitation) {
            console.error('Invitation insert error:', insertError)
            return NextResponse.json({ error: insertError?.message || 'Failed to create invitation' }, { status: 500 })
        }

        // Build invite link
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        const inviteLink = `${appUrl}/invite/accept?token=${invitation.token}`

        // Build email HTML
        const roleLabel = role === 'member' ? 'Member (แก้ไขการ์ดได้)' : 'Guest (ดูได้อย่างเดียว)'
        const expiresText = '24 ชั่วโมง'

        const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; margin: 0; padding: 40px 20px; }
    .card { background: white; border-radius: 12px; padding: 40px; max-width: 520px; margin: 0 auto; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
    .logo { color: #2563eb; font-size: 24px; font-weight: 700; margin-bottom: 24px; }
    h1 { font-size: 20px; color: #111827; margin: 0 0 12px; }
    p { color: #4b5563; line-height: 1.6; margin: 0 0 16px; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 600; background: ${role === 'member' ? '#dbeafe' : '#f3e8ff'}; color: ${role === 'member' ? '#1d4ed8' : '#7c3aed'}; }
    .btn { display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 24px 0; }
    .note { font-size: 13px; color: #9ca3af; border-top: 1px solid #f3f4f6; padding-top: 16px; margin-top: 8px; }
    .link-text { word-break: break-all; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">🔵 Botnoi Flow</div>
    <h1>สวัสดีคุณ ${name} 👋</h1>
    <p>คุณได้รับการเชิญให้เข้าร่วม <strong>Botnoi Flow</strong> โดย <strong>${senderEmail}</strong></p>
    <p>Role ของคุณ: <span class="badge">${roleLabel}</span></p>
    <center>
      <a href="${inviteLink}" class="btn">✉️ รับ Invitation & ตั้ง Password</a>
    </center>
    <p class="note">
      ⏰ Link นี้จะหมดอายุใน <strong>${expiresText}</strong><br>
      หากไม่ได้คลิก link สามารถแจ้งพี่เลี้ยงเพื่อขอ link ใหม่ได้
    </p>
    <p class="link-text">หากปุ่มด้านบนไม่ทำงาน ให้คัดลอก link นี้: ${inviteLink}</p>
  </div>
</body>
</html>`

        // Send email via Zoho SMTP
        await transporter.sendMail({
            from: `"Botnoi Flow" <${smtpUser}>`,
            to: email,
            subject: `คุณได้รับ Invitation เข้าร่วม Botnoi Flow ในฐานะ ${role === 'member' ? 'Member' : 'Guest'}`,
            html: htmlBody,
        })

        return NextResponse.json({ success: true, invitationId: invitation.id })
    } catch (err: any) {
        console.error('[invite/send] Unexpected error:', err)
        return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 })
    }
}
