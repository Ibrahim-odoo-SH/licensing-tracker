'use client'
import { useState, useEffect, useRef } from 'react'
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
  const [status, setStatus] = useState('Verifying link…')
  const ready = useRef(false)

  useEffect(() => {
    // Sign out any existing session first so recovery token takes over cleanly
    supabase.auth.signOut().then(() => {
      // Now listen for PASSWORD_RECOVERY event from the auth state change
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY' && session && !ready.current) {
          ready.current = true
          setSessionReady(true)
        }
      })

      // Also check if there's already a recovery session (page was refreshed)
      supabase.auth.getSession().then(({ data }) => {
        if (data.session && !ready.current) {
          ready.current = true
          setSessionReady(true)
        } else if (!data.session) {
          // Wait up to 5 seconds for the auth event, then give up
          setTimeout(() => {
            if (!ready.current) {
              setStatus('Link expired or already used.')
            }
          }, 5000)
        }
      })

      return () => subscription.unsubscribe()
    })
  }, [])

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #D8D4CE',
    borderRadius: 8,
    background: '#F7F6F4',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
    color: '#1C2226',
    transition: 'border-color 0.18s, background 0.18s',
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        setError(error.message)
      } else {
        setDone(true)
        setTimeout(() => router.replace('/login'), 2500)
      }
    } catch (err: any) {
      setError(err?.message ?? 'Something went wrong. Try requesting a new reset link.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#1C2226',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: '-20%', right: '-10%',
        width: 500, height: 500, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(170,150,130,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        background: '#F7F6F4', border: '1px solid #D8D4CE', borderRadius: 20,
        padding: '40px 40px 36px', width: 400,
        boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
        position: 'relative', zIndex: 1,
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img src="/logo.png" alt="Codiflow" style={{ width: 80, height: 80, objectFit: 'contain', margin: '0 auto 6px', display: 'block' }} />
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1C2226', marginBottom: 4 }}>Set New Password</h1>
          <p style={{ fontSize: 13, color: '#7A756E' }}>Choose a strong password for your account</p>
        </div>

        {done ? (
          <div style={{ background: '#EBF5EE', border: '1px solid #B8D4C0', borderRadius: 10, padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>✅</div>
            <p style={{ fontWeight: 600, color: '#5F7D6A', marginBottom: 6 }}>Password updated!</p>
            <p style={{ fontSize: 13, color: '#5F7D6A' }}>Redirecting to login…</p>
          </div>
        ) : !sessionReady ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            {status === 'Verifying link…' ? (
              <>
                <div style={{ fontSize: 24, marginBottom: 12 }}>⏳</div>
                <p style={{ fontSize: 13, color: '#7A756E' }}>{status}</p>
              </>
            ) : (
              <>
                <div style={{ fontSize: 24, marginBottom: 12 }}>⚠️</div>
                <p style={{ fontSize: 13, color: '#A35C5C', marginBottom: 16 }}>{status}</p>
                <button
                  onClick={() => router.replace('/login')}
                  style={{ fontSize: 13, color: '#AA9682', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Request a new reset link
                </button>
              </>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#7A756E', display: 'block', marginBottom: 6 }}>New Password</label>
              <input
                type="password"
                name="new-password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                required
                style={inputStyle}
                onFocus={(e) => { e.target.style.borderColor = '#1C2226'; e.target.style.background = '#fff' }}
                onBlur={(e) => { e.target.style.borderColor = '#D8D4CE'; e.target.style.background = '#F7F6F4' }}
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#7A756E', display: 'block', marginBottom: 6 }}>Confirm Password</label>
              <input
                type="password"
                name="confirm-password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                required
                style={inputStyle}
                onFocus={(e) => { e.target.style.borderColor = '#1C2226'; e.target.style.background = '#fff' }}
                onBlur={(e) => { e.target.style.borderColor = '#D8D4CE'; e.target.style.background = '#F7F6F4' }}
              />
            </div>

            {error && (
              <div style={{ background: '#FBF0F0', border: '1px solid #E8C4C4', borderRadius: 8, padding: '8px 12px', marginBottom: 14, fontSize: 13, color: '#A35C5C' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password || !confirm}
              style={{
                width: '100%', padding: '11px',
                background: loading ? '#887568' : '#1C2226',
                color: '#fff', border: 'none', borderRadius: 8,
                fontWeight: 600, fontSize: 14,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.18s',
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
