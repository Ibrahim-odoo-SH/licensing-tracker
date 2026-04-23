'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const supabase = createClient()
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  // After the callback route exchanged the code, a session exists in the cookie.
  // We just need to wait for the client-side auth state to pick it up.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setSessionReady(true)
      else router.replace('/login')
    })
  }, [])

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #E5E2DA',
    borderRadius: 8,
    background: '#FAFAF8',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box' as const,
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      setError(error.message)
    } else {
      setDone(true)
      setTimeout(() => router.replace('/dashboard'), 2500)
    }
  }

  if (!sessionReady) {
    return (
      <div style={{ minHeight: '100vh', background: '#F4F3EF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#9C998F', fontSize: 14 }}>Verifying link…</p>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#F4F3EF',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#fff', border: '1px solid #E5E2DA', borderRadius: 16,
        padding: 40, width: 380, boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img src="/logo.png" alt="Codiflow" style={{ width: 80, height: 80, objectFit: 'contain', margin: '0 auto 6px', display: 'block' }} />
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1C2226', marginBottom: 4 }}>Set New Password</h1>
          <p style={{ fontSize: 13, color: '#7A756E' }}>Choose a strong password for your account</p>
        </div>

        {done ? (
          <div style={{
            background: '#EEFBF4', border: '1px solid #A8E6C3', borderRadius: 10,
            padding: 20, textAlign: 'center',
          }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>✅</div>
            <p style={{ fontWeight: 600, color: '#2B8B57', marginBottom: 6 }}>Password updated!</p>
            <p style={{ fontSize: 13, color: '#4A7A5A' }}>Redirecting you to the dashboard…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#5A5A6A', display: 'block', marginBottom: 6 }}>
                New Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                required
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = '#2D4A6F')}
                onBlur={(e) => (e.target.style.borderColor = '#E5E2DA')}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#5A5A6A', display: 'block', marginBottom: 6 }}>
                Confirm Password
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                required
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = '#2D4A6F')}
                onBlur={(e) => (e.target.style.borderColor = '#E5E2DA')}
              />
            </div>

            {error && (
              <div style={{
                background: '#FFF0F0', border: '1px solid #FFB8B8', borderRadius: 8,
                padding: '8px 12px', marginBottom: 14, fontSize: 13, color: '#C0392B',
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password || !confirm}
              style={{
                width: '100%', padding: '11px',
                background: loading ? '#8BA5C4' : '#2D4A6F',
                color: '#fff', border: 'none', borderRadius: 8,
                fontWeight: 600, fontSize: 14,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
