'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { createClient } from '@/lib/supabase/client'

type Mode = 'signin' | 'signup' | 'forgot'

export default function LoginPage() {
  const { signInWithPassword, signUp } = useAuth()
  const supabase = createClient()
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [signedUp, setSignedUp] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  function switchMode(next: Mode) {
    setMode(next)
    setError('')
    setPassword('')
    setConfirm('')
    setResetSent(false)
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
      else router.push('/dashboard')
    } else if (mode === 'signup') {
      const { error, session } = await signUp(trimmedEmail, password)
      setLoading(false)
      if (error) setError(error.message)
      else if (session) router.replace('/dashboard') // email confirmation is OFF → already signed in
      else setSignedUp(true) // email confirmation is ON → show "check email"
    } else {
      // forgot password
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
      })
      setLoading(false)
      if (error) setError(error.message)
      else setResetSent(true)
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #D8D4CE',
    borderRadius: 8,
    background: '#F7F6F4',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box' as const,
    transition: 'border-color 0.18s, background 0.18s',
    color: '#1C2226',
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#1C2226',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background decoration */}
      <div style={{
        position: 'absolute', top: '-20%', right: '-10%',
        width: 500, height: 500, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(170,150,130,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-20%', left: '-10%',
        width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(170,150,130,0.05) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        background: '#F7F6F4', border: '1px solid #D8D4CE', borderRadius: 20,
        padding: '40px 40px 36px', width: 400,
        boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
        position: 'relative', zIndex: 1,
        animation: 'fadeIn 0.3s ease-out',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img src="/logo.png" alt="Codiflow" style={{ width: 90, height: 90, objectFit: 'contain', margin: '0 auto 4px', display: 'block' }} />
          <p style={{ fontSize: 11, color: '#7A756E', marginTop: 4, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 500 }}>Cotton Division · Internal</p>
        </div>

        {/* Mode tabs */}
        {!signedUp && mode !== 'forgot' && (
          <div style={{
            display: 'flex', background: '#EFEDE9', borderRadius: 10,
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
                  color: mode === m ? '#1C2226' : '#7A756E',
                  boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                {m === 'signin' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>
        )}

        {/* Forgot password mode */}
        {mode === 'forgot' && (
          resetSent ? (
            <div style={{ background: '#EEFBF4', border: '1px solid #A8E6C3', borderRadius: 10, padding: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>✉️</div>
              <p style={{ fontWeight: 600, color: '#2B8B57', marginBottom: 6 }}>Reset link sent!</p>
              <p style={{ fontSize: 13, color: '#4A7A5A' }}>Check <strong>{email}</strong> for a password reset link.</p>
              <button onClick={() => switchMode('signin')} style={{ marginTop: 14, fontSize: 12, color: '#9C998F', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                Back to sign in
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <p style={{ fontSize: 13, color: '#5A5A6A', marginBottom: 18, lineHeight: 1.5 }}>
                Enter your email and we'll send you a link to reset your password.
              </p>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#5A5A6A', display: 'block', marginBottom: 6 }}>Work Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@cottondivision.com" required style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = '#2D4A6F')} onBlur={(e) => (e.target.style.borderColor = '#E5E2DA')} />
              </div>
              {error && (
                <div style={{ background: '#FFF0F0', border: '1px solid #FFB8B8', borderRadius: 8, padding: '8px 12px', marginBottom: 14, fontSize: 13, color: '#C0392B' }}>{error}</div>
              )}
              <button type="submit" disabled={loading || !email} style={{ width: '100%', padding: '11px', background: loading ? '#8BA5C4' : '#2D4A6F', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer' }}>
                {loading ? 'Sending…' : 'Send Reset Link'}
              </button>
              <button type="button" onClick={() => switchMode('signin')} style={{ width: '100%', marginTop: 10, fontSize: 12, color: '#9C998F', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                Back to sign in
              </button>
            </form>
          )
        )}

        {/* Sign-up / sign-in */}
        {mode !== 'forgot' && (
          signedUp ? (
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
            <form onSubmit={handleSubmit} autoComplete="on">
              {/* Email */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#7A756E', display: 'block', marginBottom: 6 }}>
                  Work Email
                </label>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@cottondivision.com"
                  required
                  style={inputStyle}
                  onFocus={(e) => { e.target.style.borderColor = '#1C2226'; e.target.style.background = '#fff' }}
                  onBlur={(e) => { e.target.style.borderColor = '#D8D4CE'; e.target.style.background = '#F7F6F4' }}
                />
              </div>

              {/* Password */}
              <div style={{ marginBottom: mode === 'signup' ? 14 : 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#7A756E', display: 'block', marginBottom: 6 }}>
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'signup' ? 'Min. 8 characters' : '••••••••'}
                  required
                  style={inputStyle}
                  onFocus={(e) => { e.target.style.borderColor = '#1C2226'; e.target.style.background = '#fff' }}
                  onBlur={(e) => { e.target.style.borderColor = '#D8D4CE'; e.target.style.background = '#F7F6F4' }}
                />
              </div>

              {/* Forgot password link (sign-in only) */}
              {mode === 'signin' && (
                <div style={{ textAlign: 'right', marginBottom: 16 }}>
                  <button type="button" onClick={() => switchMode('forgot')} style={{ fontSize: 12, color: '#AA9682', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                    Forgot password?
                  </button>
                </div>
              )}

              {/* Confirm password (sign-up only) */}
              {mode === 'signup' && (
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#7A756E', display: 'block', marginBottom: 6 }}>
                    Confirm Password
                  </label>
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
          )
        )}
      </div>
    </div>
  )
}
