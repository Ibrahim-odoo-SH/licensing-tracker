'use client'
import { useState } from 'react'
import type { LicRecord, Profile } from '@/lib/types'
import { fmtDate } from '@/lib/utils'
import { STAGE_META } from '@/lib/constants'

interface NotifyModalProps {
  record: LicRecord
  team: Profile[]
  senderName: string
  senderEmail: string
  onClose: () => void
}

export default function NotifyModal({ record, team, senderName, senderEmail, onClose }: NotifyModalProps) {
  const [selected, setSelected] = useState<string[]>([])
  const [extra, setExtra] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const activeMembers = team.filter((m) => m.is_active && m.email)
  const stage = STAGE_META[record.normalized_stage] ?? STAGE_META['Design Sent']

  function toggleMember(email: string) {
    setSelected((prev) => prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email])
  }

  async function handleSend() {
    const extraEmails = extra.split(',').map((e) => e.trim()).filter(Boolean)
    const recipients = [...selected, ...extraEmails]
    if (!recipients.length) { setError('Select at least one recipient.'); return }
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ record, recipients, senderName, senderEmail }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || `Server error ${res.status}`)
      setSent(true)
    } catch (e: any) {
      setError(e.message)
    }
    setSending(false)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: 14, width: 480, maxHeight: '85vh',
        overflow: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,0.15)',
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #E5E2DA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>✉ Send Notification</div>
            <div style={{ fontSize: 12, color: '#9C998F', marginTop: 2 }}>{record.product_name}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: '#9C998F', cursor: 'pointer' }}>×</button>
        </div>

        {sent ? (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>✅</div>
            <div style={{ fontWeight: 600, color: '#2B8B57' }}>Notification sent!</div>
            <button onClick={onClose} style={{ marginTop: 16, padding: '8px 20px', background: '#2D4A6F', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
              Close
            </button>
          </div>
        ) : (
          <div style={{ padding: 20 }}>
            {/* Record preview */}
            <div style={{ background: '#F4F3EF', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 13 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ background: stage.bg, color: stage.color, border: `1px solid ${stage.border}`, borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
                  {stage.icon} {record.normalized_stage}
                </span>
              </div>
              <div style={{ fontWeight: 600 }}>{record.product_name}</div>
              <div style={{ color: '#9C998F', marginTop: 2 }}>{record.internal_ref} · {record.brand} · {record.property}</div>
              {record.next_action && <div style={{ marginTop: 6, color: '#2B8B57' }}>→ {record.next_action}</div>}
            </div>

            {/* Team recipients */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#5A5A6A', marginBottom: 8 }}>Team Members</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 160, overflow: 'auto' }}>
                {activeMembers.map((m) => (
                  <label key={m.email} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', borderRadius: 6, cursor: 'pointer', background: selected.includes(m.email) ? '#EEF0FF' : 'transparent' }}>
                    <input type="checkbox" checked={selected.includes(m.email)} onChange={() => toggleMember(m.email)} />
                    <span style={{ fontWeight: 500 }}>{m.full_name}</span>
                    <span style={{ color: '#9C998F', fontSize: 12 }}>{m.email}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Extra emails */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#5A5A6A', marginBottom: 6 }}>External Recipients (comma-separated)</div>
              <input
                value={extra}
                onChange={(e) => setExtra(e.target.value)}
                placeholder="external@example.com, another@example.com"
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E2DA', borderRadius: 6, fontSize: 13, outline: 'none' }}
              />
            </div>

            {error && <div style={{ color: '#C0392B', fontSize: 13, marginBottom: 10 }}>{error}</div>}

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={onClose} style={{ flex: 1, padding: '9px', background: '#F4F3EF', border: '1px solid #E5E2DA', borderRadius: 8, cursor: 'pointer', fontWeight: 500 }}>
                Cancel
              </button>
              <button
                onClick={handleSend} disabled={sending}
                style={{ flex: 2, padding: '9px', background: sending ? '#8BA5C4' : '#2D4A6F', color: '#fff', border: 'none', borderRadius: 8, cursor: sending ? 'not-allowed' : 'pointer', fontWeight: 600 }}
              >
                {sending ? 'Sending…' : `Send to ${selected.length + extra.split(',').filter((e) => e.trim()).length} recipient(s)`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
