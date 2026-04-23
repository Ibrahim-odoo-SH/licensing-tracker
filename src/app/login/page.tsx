'use client'
import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'

type Mode = 'signin' | 'signup'

export default function LoginPage() {
  const { signInWithPassword, signUp } = useAuth()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [signedUp, setSignedUp] = useState(false)

  function switchMode(next: Mode) {
    setMode(next)
    setError('')
    setPassword('')
    setConfirm('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (mode === 'signup') {
      if (password.length < 8) {
        setError('Password must be at least 8 characters.')
        return
      }
      if (password !== confirm) {
        setError('Passwords do not match.')
        return
      }
    }

    setLoading(true)
    const trimmedEmail = email.trim().toLowerCase()

    if (mode === 'signin') {
      const { error } = await signInWithPassword(trimmedEmail, password)
      setLoading(false)
      if (error) setError(error.message)
    } else {
      const { error } = await signUp(trimmedEmail, password)
      setLoading(false)
      if (error) setError(error.message)
      else setSignedUp(true)
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #E5E2DA',
    borderRadius: 8,
    background: '#FAFAF8',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box' as const,
    transition: 'border-color 0.15s',
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
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, background: '#2D4A6F',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px', fontSize: 24,
          }}>📋</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1A1A2E', marginBottom: 4 }}>
            Licensing Tracker
          </h1>
          <p style={{ fontSize: 13, color: '#9C998F' }}>Cotton Division — Internal</p>
        </div>

        {/* Mode tabs */}
        {!signedUp && (
          <div style={{
            display: 'flex', background: '#F4F3EF', borderRadius: 10,
            padding: 4, marginBottom: 24, gap: 4,
          }}>
            {(['signin', 'signup'] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                style={{
                  flex: 1, padding: '8px 0', borderRadius: 8, border: 'none',
                  fontWeight: 600, fontSize: 13, cursor: 'pointer',
                  background: mode === m ? '#fff' : 'transparent',
                  color: mode === m ? '#2D4A6F' : '#9C998F',
                  boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                {m === 'signin' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>
        )}

        {/* Sign-up success */}
        {signedUp ? (
          <div style={{
            background: '#EEFBF4', border: '1px solid #A8E6C3', borderRadius: 10,
            padding: 20, textAlign: 'center',
          }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>✉️</div>
            <p style={{ fontWeight: 600, color: '#2B8B57', marginBottom: 6 }}>Account created!</p>
            <p style={{ fontSize: 13, color: '#4A7A5A' }}>
              Check <strong>{email}</strong> for a confirmation link,<br />
              then come back here to sign in.
            </p>
            <button
              onClick={() => { setSignedUp(false); switchMode('signin') }}
              style={{
                marginTop: 14, fontSize: 12, color: '#9C998F',
                background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline',
              }}
            >
              Back to sign in
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#5A5A6A', display: 'block', marginBottom: 6 }}>
                Work Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@cottondivision.com"
                required
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = '#2D4A6F')}
                onBlur={(e) => (e.target.style.borderColor = '#E5E2DA')}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: mode === 'signup' ? 14 : 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#5A5A6A', display: 'block', marginBottom: 6 }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? 'Min. 8 characters' : '••••••••'}
                required
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = '#2D4A6F')}
                onBlur={(e) => (e.target.style.borderColor = '#E5E2DA')}
              />
            </div>

            {/* Confirm password (sign-up only) */}
            {mode === 'signup' && (
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
            )}

            {/* Error */}
            {error && (
              <div style={{
                background: '#FFF0F0', border: '1px solid #FFB8B8', borderRadius: 8,
                padding: '8px 12px', marginBottom: 14, fontSize: 13, color: '#C0392B',
              }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !email || !password}
              style={{
                width: '100%', padding: '11px',
                background: loading ? '#8BA5C4' : '#2D4A6F',
                color: '#fff', border: 'none', borderRadius: 8,
                fontWeight: 600, fontSize: 14,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s',
              }}
            >
              {loading
                ? (mode === 'signin' ? 'Signing in…' : 'Creating account…')
                : (mode === 'signin' ? 'Sign In' : 'Create Account')}
            </button>

            <p style={{ fontSize: 12, color: '#9C998F', textAlign: 'center', marginTop: 14 }}>
              Only @cottondivision.com emails accepted.
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
