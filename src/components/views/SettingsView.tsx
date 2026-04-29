'use client'
import { useState, useEffect } from 'react'
import { useLanguage } from '@/lib/language-context'

export default function SettingsView() {
  const { t } = useLanguage()
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
        setValues({ reminder_emails_enabled: data['reminder_emails_enabled'] === true })
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
          {t.settings_title}
        </div>
        <div style={{ fontSize: 13, color: '#9C998F' }}>
          {t.settings_subtitle}
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
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1A2E' }}>{t.settings_emailAuto}</div>
        </div>

        {/* Rows */}
        <div style={{ padding: '8px 0' }}>
          {loading ? (
            <div style={{ padding: '24px 20px', color: '#9C998F', fontSize: 13 }}>{t.settings_loading}</div>
          ) : (
            (() => {
              const key = 'reminder_emails_enabled'
              const val = values[key] ?? false
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#1A1A2E', marginBottom: 3 }}>
                      {t.settings_reminderLabel}
                    </div>
                    <div style={{ fontSize: 12, color: '#9C998F', lineHeight: 1.6 }}>
                      {t.settings_reminderHint}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    color: val ? '#2D4A6F' : '#9C998F',
                    background: val ? '#EEF2FA' : '#F4F3EF',
                    borderRadius: 20, padding: '3px 10px', flexShrink: 0,
                  }}>
                    {val ? t.settings_on : t.settings_off}
                  </span>
                  <div
                    onClick={() => toggle(key)}
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
                      transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                    }} />
                  </div>
                </div>
              )
            })()
          )}
        </div>
      </div>

      {/* Info box */}
      <div style={{
        background: '#F5EFE9', border: '1px solid #E8D5C4',
        borderRadius: 10, padding: '14px 16px', marginBottom: 24,
        fontSize: 12, color: '#7A5A3A', lineHeight: 1.7,
      }}>
        <strong>{t.settings_howTitle}</strong> {t.settings_howText}
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
        {saving ? t.settings_saving : saved ? t.settings_saved : t.settings_save}
      </button>
    </div>
  )
}
