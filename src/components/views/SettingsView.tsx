'use client'
import { useState, useEffect } from 'react'

interface SettingRow {
  label: string
  hint: string
  key: string
}

const SETTINGS: SettingRow[] = [
  {
    key: 'reminder_emails_enabled',
    label: 'Daily Reminder Emails',
    hint: 'Send automatic email reminders to record owners at 9:00 AM every day for due or overdue reminders.',
  },
]

export default function SettingsView() {
  const [values, setValues]   = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [error, setError]     = useState<string | null>(null)

  // Load current settings
  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        const bools: Record<string, boolean> = {}
        for (const key of SETTINGS.map((s) => s.key)) {
          bools[key] = data[key] === true
        }
        setValues(bools)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  function toggle(key: string) {
    setValues((prev) => ({ ...prev, [key]: !prev[key] }))
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error((d as any).error ?? 'Save failed')
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ padding: 32, maxWidth: 640, margin: '0 auto' }}>

      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#1A1A2E', marginBottom: 4 }}>
          System Settings
        </div>
        <div style={{ fontSize: 13, color: '#9C998F' }}>
          Admin-only controls for automated features.
        </div>
      </div>

      {/* Settings card */}
      <div style={{
        background: '#fff', border: '1px solid #E5E2DA',
        borderRadius: 14, overflow: 'hidden', marginBottom: 20,
      }}>
        {/* Card header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid #F0EDE8',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 16 }}>📧</span>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1A2E' }}>Email Automation</div>
        </div>

        {/* Rows */}
        <div style={{ padding: '8px 0' }}>
          {loading ? (
            <div style={{ padding: '24px 20px', color: '#9C998F', fontSize: 13 }}>Loading…</div>
          ) : (
            SETTINGS.map((s, i) => {
              const val = values[s.key] ?? false
              return (
                <div
                  key={s.key}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 16,
                    padding: '16px 20px',
                    borderBottom: i < SETTINGS.length - 1 ? '1px solid #F0EDE8' : 'none',
                  }}
                >
                  {/* Text */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#1A1A2E', marginBottom: 3 }}>
                      {s.label}
                    </div>
                    <div style={{ fontSize: 12, color: '#9C998F', lineHeight: 1.6 }}>
                      {s.hint}
                    </div>
                  </div>

                  {/* Status label */}
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    color: val ? '#2D4A6F' : '#9C998F',
                    background: val ? '#EEF2FA' : '#F4F3EF',
                    borderRadius: 20, padding: '3px 10px', flexShrink: 0,
                  }}>
                    {val ? 'On' : 'Off'}
                  </span>

                  {/* Toggle */}
                  <div
                    onClick={() => toggle(s.key)}
                    style={{
                      width: 44, height: 24, borderRadius: 12, flexShrink: 0,
                      background: val ? '#2D4A6F' : '#D0CDC5',
                      position: 'relative', cursor: 'pointer',
                      transition: 'background 0.2s',
                    }}
                  >
                    <div style={{
                      position: 'absolute', top: 4, left: val ? 22 : 4,
                      width: 16, height: 16, borderRadius: '50%', background: '#fff',
                      transition: 'left 0.2s',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                    }} />
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Info box */}
      <div style={{
        background: '#F5EFE9', border: '1px solid #E8D5C4',
        borderRadius: 10, padding: '14px 16px', marginBottom: 24,
        fontSize: 12, color: '#7A5A3A', lineHeight: 1.7,
      }}>
        <strong>How it works:</strong> Every day at <strong>9:00 AM</strong>, CodiFlow checks for records
        with a reminder date that is today or overdue. Each record owner receives an individual
        email listing the reminder. Turn this off to stop all automated reminder emails.
      </div>

      {/* Error */}
      {error && (
        <div style={{
          background: '#FFF0F0', border: '1px solid #FFB8B8',
          borderRadius: 8, padding: '10px 14px', marginBottom: 16,
          fontSize: 13, color: '#C0392B',
        }}>
          {error}
        </div>
      )}

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving || loading}
        style={{
          padding: '11px 28px',
          background: saving ? '#8BA5C4' : saved ? '#4A8B6F' : '#2D4A6F',
          color: '#fff', border: 'none', borderRadius: 8,
          fontWeight: 600, fontSize: 14,
          cursor: saving || loading ? 'not-allowed' : 'pointer',
          transition: 'background 0.2s',
        }}
      >
        {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save Settings'}
      </button>
    </div>
  )
}
