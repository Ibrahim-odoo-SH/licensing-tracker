import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { LicRecord } from '@/lib/types'
import { STAGE_META } from '@/lib/constants'

interface EmailTemplate {
  stage: string
  subject_prefix: string
  intro_message: string
  show_licensor_ref: boolean
  show_product_type: boolean
  show_gender: boolean
  show_contact_name: boolean
  show_submission_date: boolean
  show_priority: boolean
  show_samples: boolean
  show_waiting_on: boolean
  show_next_action: boolean
  show_notes: boolean
  show_feedback: boolean
  show_tech_pack: boolean
  show_additional_link: boolean
  show_images: boolean
}

interface Attachment {
  public_url: string
  file_name: string
  file_type: string
}

const TEMPLATE_DEFAULTS: Omit<EmailTemplate, 'stage'> = {
  subject_prefix: '',
  intro_message: '',
  show_licensor_ref: true,
  show_product_type: true,
  show_gender: false,
  show_contact_name: false,
  show_submission_date: false,
  show_priority: false,
  show_samples: true,
  show_waiting_on: true,
  show_next_action: true,
  show_notes: true,
  show_feedback: true,
  show_tech_pack: true,
  show_additional_link: true,
  show_images: true,
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
}

export async function POST(req: Request) {
  try {
    const { record, recipients, senderName, senderEmail }: {
      record: LicRecord; recipients: string[]; senderName: string; senderEmail: string
    } = await req.json()

    const sm = STAGE_META[record.normalized_stage] ?? STAGE_META['Design Sent']
    const now = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    // Fetch custom template for this stage
    let template: EmailTemplate | null = null
    try {
      if (url && anonKey) {
        const supabase = createSupabaseClient(url, anonKey)
        const { data } = await supabase
          .from('email_templates')
          .select('*')
          .eq('stage', record.normalized_stage)
          .maybeSingle()
        template = data
      }
    } catch { /* fall back to defaults */ }

    // Merge with defaults so missing columns still have values
    const t: Omit<EmailTemplate, 'stage'> = { ...TEMPLATE_DEFAULTS, ...(template ?? {}) }

    // Fetch attachments if images are enabled
    let attachments: Attachment[] = []
    if (t.show_images && url && serviceKey) {
      try {
        const sb = createSupabaseClient(url, serviceKey)
        const { data } = await sb
          .from('record_attachments')
          .select('public_url, file_name, file_type')
          .eq('record_id', record.id)
          .order('created_at', { ascending: true })
        attachments = (data ?? []).filter((a) => a.file_type?.startsWith('image/'))
      } catch { /* no images */ }
    }

    const subject = t.subject_prefix
      ? `${t.subject_prefix} — ${record.product_name}`
      : `[Licensing] ${record.normalized_stage} — ${record.product_name}`

    const PRIORITY_COLOR: Record<string, string> = {
      Low: '#6BAF92', Medium: '#E8A838', High: '#E06B3A', Urgent: '#D43C3C',
    }

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; background: #F4F3EF; }
  .container { max-width: 580px; margin: 30px auto; background: #fff; border-radius: 12px; overflow: hidden; border: 1px solid #E5E2DA; }
  .header { background: #2D4A6F; color: #fff; padding: 24px; }
  .header h1 { margin: 0; font-size: 20px; }
  .header p { margin: 4px 0 0; opacity: 0.7; font-size: 13px; }
  .body { padding: 24px; }
  .stage-badge { display: inline-block; background: ${sm.bg}; color: ${sm.color}; border: 1px solid ${sm.border}; border-radius: 20px; padding: 4px 14px; font-size: 13px; font-weight: 600; margin-bottom: 16px; }
  .intro { background: #F4F3EF; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; font-size: 14px; color: #3A3A4A; line-height: 1.6; }
  .fields { margin-bottom: 16px; }
  .field { display: flex; gap: 12px; margin-bottom: 8px; font-size: 14px; }
  .field-label { width: 140px; color: #9C998F; flex-shrink: 0; font-size: 13px; }
  .field-value { color: #1A1A2E; font-weight: 500; font-size: 13px; }
  .divider { border: none; border-top: 1px solid #F0EDE8; margin: 16px 0; }
  .waiting-block { background: #FFF5EB; border: 1px solid #FFD9A8; border-radius: 8px; padding: 12px 16px; margin: 14px 0; }
  .waiting-label { font-size: 11px; color: #B87A2B; font-weight: 700; margin-bottom: 4px; letter-spacing: 0.5px; }
  .waiting-value { font-size: 14px; color: #7A4A1A; font-weight: 500; }
  .next-action { background: #EEFBF4; border: 1px solid #A8E6C3; border-radius: 8px; padding: 12px 16px; margin: 8px 0; color: #2B8B57; font-weight: 500; font-size: 14px; }
  .notes-block { background: #F4F3EF; border-radius: 8px; padding: 12px 16px; margin-top: 12px; font-size: 13px; color: #5A5A6A; line-height: 1.6; }
  .feedback-block { background: #FFF5EB; border: 1px solid #FFD9A8; border-radius: 8px; padding: 12px 16px; margin-top: 10px; font-size: 13px; color: #5A4020; line-height: 1.6; }
  .btn { display: inline-block; background: #2D4A6F; color: #fff !important; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; margin-top: 4px; }
  .btn-secondary { display: inline-block; background: #F4F3EF; color: #2D4A6F !important; border: 1px solid #C7D4E8; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; margin-top: 4px; margin-left: 8px; }
  .images-grid { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 14px; }
  .img-wrap { border-radius: 8px; overflow: hidden; border: 1px solid #E5E2DA; }
  .footer { padding: 16px 24px; background: #F4F3EF; font-size: 12px; color: #9C998F; border-top: 1px solid #E5E2DA; }
</style></head>
<body>
<div class="container">

  <div class="header">
    <h1>📋 Licensing Tracker</h1>
    <p>Notification from ${senderName} · Cotton Division</p>
  </div>

  <div class="body">
    <div class="stage-badge">${sm.icon} ${record.normalized_stage}</div>
    <h2 style="margin: 0 0 4px; font-size: 20px; color: #1A1A2E;">${record.product_name}</h2>
    <div style="font-family: monospace; font-size: 12px; color: #9C998F; margin-bottom: 18px;">${record.internal_ref}</div>

    ${t.intro_message ? `<div class="intro">${t.intro_message.replace(/\n/g, '<br>')}</div>` : ''}

    <div class="fields">
      <div class="field"><span class="field-label">Brand</span><span class="field-value">${record.brand || '—'}</span></div>
      <div class="field"><span class="field-label">Property</span><span class="field-value">${record.property || '—'}</span></div>
      ${t.show_licensor_ref && record.main_licensor_ref ? `<div class="field"><span class="field-label">Licensor Ref</span><span class="field-value" style="font-family:monospace;color:#4B52B8;">${record.main_licensor_ref}</span></div>` : ''}
      ${t.show_product_type && record.product_type ? `<div class="field"><span class="field-label">Product Type</span><span class="field-value">${record.product_type}${t.show_gender && record.gender ? ` · ${record.gender}` : ''}</span></div>` : ''}
      ${!t.show_product_type && t.show_gender && record.gender ? `<div class="field"><span class="field-label">Gender</span><span class="field-value">${record.gender}</span></div>` : ''}
      ${t.show_contact_name && record.contact_name ? `<div class="field"><span class="field-label">Contact</span><span class="field-value">${record.contact_name}</span></div>` : ''}
      <div class="field"><span class="field-label">Owner</span><span class="field-value">${record.owner_name_snapshot || '—'}</span></div>
      ${t.show_submission_date && record.submission_date ? `<div class="field"><span class="field-label">Submitted</span><span class="field-value">${fmtDate(record.submission_date)}</span></div>` : ''}
      ${t.show_priority ? `<div class="field"><span class="field-label">Priority</span><span class="field-value" style="color:${PRIORITY_COLOR[record.priority] ?? '#1A1A2E'};font-weight:600;">${record.priority}</span></div>` : ''}
      ${t.show_samples && record.samples_requested_qty > 0 ? `<div class="field"><span class="field-label">Samples</span><span class="field-value">${record.samples_requested_qty} pcs</span></div>` : ''}
    </div>

    ${t.show_waiting_on && record.waiting_on !== 'None' ? `
    <div class="waiting-block">
      <div class="waiting-label">⏳ WAITING ON</div>
      <div class="waiting-value">${record.waiting_on}</div>
    </div>` : ''}

    ${t.show_next_action && record.next_action ? `<div class="next-action">→ ${record.next_action}</div>` : ''}

    ${t.show_notes && record.notes_summary ? `
    <div class="notes-block">
      <strong style="display:block;margin-bottom:4px;">📝 Notes</strong>
      ${record.notes_summary.replace(/\n/g, '<br>')}
    </div>` : ''}

    ${t.show_feedback && record.licensor_feedback ? `
    <div class="feedback-block">
      <strong style="display:block;margin-bottom:4px;">💬 Licensor Feedback</strong>
      ${record.licensor_feedback.replace(/\n/g, '<br>')}
    </div>` : ''}

    ${(t.show_tech_pack && record.tech_pack_link) || (t.show_additional_link && record.additional_link) ? `
    <div style="margin-top: 16px;">
      ${t.show_tech_pack && record.tech_pack_link ? `<a href="${record.tech_pack_link}" class="btn">📎 View Tech Pack ↗</a>` : ''}
      ${t.show_additional_link && record.additional_link ? `<a href="${record.additional_link}" class="btn-secondary">🔗 Additional Link ↗</a>` : ''}
    </div>` : ''}

    ${t.show_images && attachments.length > 0 ? `
    <hr class="divider">
    <div style="font-size:12px;font-weight:700;color:#9C998F;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;">🖼 Product Images</div>
    <div class="images-grid">
      ${attachments.map((a) => `
        <a href="${a.public_url}" style="display:block;">
          <div class="img-wrap">
            <img src="${a.public_url}" alt="${a.file_name}" width="170" height="170" style="display:block;width:170px;height:170px;object-fit:cover;" />
          </div>
        </a>
      `).join('')}
    </div>` : ''}

  </div>

  <div class="footer">Sent by ${senderName} · ${now} · Cotton Division Licensing Tracker</div>
</div>
</body></html>`

    const errors: string[] = []

    for (const to of recipients) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${senderName} · Cotton Division <${senderEmail}>`,
          to,
          subject,
          html,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        errors.push(`${to}: ${(err as any).message ?? res.statusText}`)
      }
    }

    if (errors.length) return NextResponse.json({ error: errors.join('; ') }, { status: 500 })
    return NextResponse.json({ ok: true })

  } catch (e: any) {
    console.error('notify route error:', e)
    return NextResponse.json({ error: e?.message ?? 'Internal server error' }, { status: 500 })
  }
}
