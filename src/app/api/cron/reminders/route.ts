import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

export async function GET(req: Request) {
  // ── Verify Vercel cron secret ──────────────────────────────────────────────
  const auth = req.headers.get('authorization')
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const sb = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // ── Check kill switch ──────────────────────────────────────────────────────
  const { data: setting } = await sb
    .from('app_settings')
    .select('value')
    .eq('key', 'reminder_emails_enabled')
    .single()

  if (!setting || setting.value !== true) {
    return NextResponse.json({ ok: true, skipped: 'disabled' })
  }

  // ── Query due/overdue reminders ────────────────────────────────────────────
  const today = new Date().toISOString().split('T')[0]

  const { data: records, error: recErr } = await sb
    .from('records')
    .select('id, internal_ref, product_name, brand, property, normalized_stage, reminder_date, reminder_note, owner_id, owner_name_snapshot')
    .lte('reminder_date', today)
    .eq('reminder_done', false)
    .eq('is_archived', false)

  if (recErr) {
    console.error('[cron/reminders] DB error:', recErr)
    return NextResponse.json({ error: recErr.message }, { status: 500 })
  }
  if (!records || records.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, message: 'No reminders due' })
  }

  // ── Fetch owner profiles ───────────────────────────────────────────────────
  const ownerIds = [...new Set(records.map((r) => r.owner_id).filter(Boolean))] as string[]

  const { data: profiles } = await sb
    .from('profiles')
    .select('id, email, full_name')
    .in('id', ownerIds)
    .eq('is_active', true)

  const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]))

  // ── Send one email per record ──────────────────────────────────────────────
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'noreply@cottondivision.com'
  const appUrl    = process.env.NEXT_PUBLIC_APP_URL ?? 'https://codiflow.cottondivision.com'

  let sent = 0
  const errors: string[] = []

  for (const record of records) {
    const owner = record.owner_id ? profileMap[record.owner_id] : null
    const toEmail = owner?.email
    if (!toEmail) continue

    const isOverdue    = record.reminder_date < today
    const statusLabel  = isOverdue ? 'Overdue' : 'Due Today'
    const statusColor  = isOverdue ? '#C0392B' : '#B87A2B'
    const statusBg     = isOverdue ? '#FFF0F0' : '#FFFBF0'
    const statusBorder = isOverdue ? '#FFB8B8' : '#FFE082'

    const subject = isOverdue
      ? `🔴 Overdue Reminder: ${record.product_name}`
      : `🟡 Reminder Due Today: ${record.product_name}`

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; background: #F4F3EF; }
  .wrap { max-width: 540px; margin: 30px auto; background: #fff; border-radius: 12px; overflow: hidden; border: 1px solid #E5E2DA; }
  .header { background: #1C2226; color: #fff; padding: 22px 24px; display: flex; align-items: center; gap: 12; }
  .header-title { font-size: 18px; font-weight: 600; color: #fff; margin: 0; }
  .header-sub { font-size: 12px; color: rgba(255,255,255,0.4); margin: 3px 0 0; }
  .body { padding: 26px 24px; }
  .status-pill { display: inline-block; background: ${statusBg}; color: ${statusColor}; border: 1px solid ${statusBorder}; border-radius: 20px; padding: 5px 14px; font-size: 13px; font-weight: 700; margin-bottom: 18px; }
  .product-name { font-size: 22px; font-weight: 700; color: #1A1A2E; margin: 0 0 4px; }
  .product-ref  { font-family: monospace; font-size: 12px; color: #9C998F; margin-bottom: 20px; }
  .field-row { display: flex; gap: 12px; margin-bottom: 8px; }
  .field-label { width: 130px; font-size: 12px; color: #9C998F; flex-shrink: 0; }
  .field-value { font-size: 13px; color: #1A1A2E; font-weight: 500; }
  .reminder-box { background: ${statusBg}; border: 1px solid ${statusBorder}; border-radius: 10px; padding: 14px 16px; margin: 20px 0; }
  .reminder-label { font-size: 10px; font-weight: 700; color: ${statusColor}; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 6px; }
  .reminder-date  { font-size: 15px; font-weight: 700; color: ${statusColor}; margin-bottom: 6px; }
  .reminder-note  { font-size: 13px; color: #5A4020; line-height: 1.6; }
  .cta { display: inline-block; background: #1C2226; color: #fff !important; text-decoration: none; padding: 11px 22px; border-radius: 8px; font-weight: 600; font-size: 14px; margin-top: 8px; }
  .footer { padding: 14px 24px; background: #F4F3EF; font-size: 11px; color: #9C998F; border-top: 1px solid #E5E2DA; }
</style></head>
<body>
<div class="wrap">
  <div class="header">
    <div>
      <p class="header-title">🔔 CodiFlow Reminder</p>
      <p class="header-sub">Cotton Division · Licensing Tracker</p>
    </div>
  </div>
  <div class="body">
    <div class="status-pill">⏰ ${statusLabel}</div>
    <div class="product-name">${record.product_name}</div>
    <div class="product-ref">${record.internal_ref}</div>

    <div class="field-row"><span class="field-label">Brand</span><span class="field-value">${record.brand || '—'}</span></div>
    <div class="field-row"><span class="field-label">Property</span><span class="field-value">${record.property || '—'}</span></div>
    <div class="field-row"><span class="field-label">Stage</span><span class="field-value">${record.normalized_stage}</span></div>
    <div class="field-row"><span class="field-label">Owner</span><span class="field-value">${record.owner_name_snapshot || owner?.full_name || '—'}</span></div>

    <div class="reminder-box">
      <div class="reminder-label">📅 Reminder</div>
      <div class="reminder-date">${fmtDate(record.reminder_date)}</div>
      ${record.reminder_note ? `<div class="reminder-note">${record.reminder_note.replace(/\n/g, '<br>')}</div>` : ''}
    </div>

    <a href="${appUrl}/table?reminders=1" class="cta">Open in CodiFlow →</a>
  </div>
  <div class="footer">Sent automatically by CodiFlow · Cotton Division · noreply@cottondivision.com</div>
</div>
</body></html>`

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: `CodiFlow · Cotton Division <${fromEmail}>`, to: toEmail, subject, html }),
    })

    if (res.ok) {
      sent++
    } else {
      const err = await res.json().catch(() => ({}))
      errors.push(`${toEmail}: ${(err as any).message ?? res.statusText}`)
    }
  }

  return NextResponse.json({ ok: true, sent, total: records.length, errors: errors.length ? errors : undefined })
}
