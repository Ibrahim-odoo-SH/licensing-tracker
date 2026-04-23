'use client'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import Avatar from '@/components/ui/Avatar'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/board',     label: 'Board',     icon: '🗂️' },
  { href: '/table',     label: 'Table',     icon: '📋' },
  { href: '/approved',  label: 'Approved',  icon: '🏆' },
  { href: '/samples',   label: 'Samples',   icon: '🧪' },
]

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { profile, can, signOut } = useAuth()

  const teamHref  = profile?.role === 'admin' ? '/team'      : '/profile'
  const teamLabel = profile?.role === 'admin' ? '👥 Team'    : '👤 Profile'
  const extraNav  = profile?.role === 'admin'
    ? [{ href: '/templates', label: '✉ Templates', icon: '' }]
    : []

  const allNav = [...NAV, { href: teamHref, label: teamLabel, icon: '' }, ...extraNav]

  return (
    <div style={{ minHeight: '100vh', background: '#F4F3EF', display: 'flex', flexDirection: 'column' }}>
      {/* Top nav */}
      <header style={{
        background: '#2D4A6F', color: '#fff', display: 'flex',
        alignItems: 'center', padding: '0 20px', height: 52, flexShrink: 0,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 24 }}>
          <span style={{ fontSize: 20 }}>📋</span>
          <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.3px' }}>Licensing Tracker</span>
          <span style={{ fontSize: 11, opacity: 0.5, marginLeft: 2 }}>Cotton Division</span>
        </div>

        {/* Nav links */}
        <nav style={{ display: 'flex', gap: 2, flex: 1 }}>
          {allNav.map((item) => {
            const active = pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href))
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                style={{
                  padding: '6px 13px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: active ? 'rgba(255,255,255,0.18)' : 'transparent',
                  color: active ? '#fff' : 'rgba(255,255,255,0.72)',
                  fontWeight: active ? 600 : 400, fontSize: 13,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => { if (!active) (e.currentTarget.style.background = 'rgba(255,255,255,0.1)') }}
                onMouseLeave={(e) => { if (!active) (e.currentTarget.style.background = 'transparent') }}
              >
                {item.label}
              </button>
            )
          })}
        </nav>

        {/* Right side */}
        {profile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Global New Record button */}
            {can('createRecords') && (
              <button
                onClick={() => router.push('/table?new=1')}
                style={{
                  background: '#3B82A0', border: '1px solid rgba(255,255,255,0.3)',
                  color: '#fff', borderRadius: 7, padding: '5px 14px',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  transition: 'background 0.15s', letterSpacing: '-0.2px',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#4A9AB8' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#3B82A0' }}
              >
                ＋ New Record
              </button>
            )}
            <Avatar name={profile.full_name} size={30} />
            <span style={{ fontSize: 13, opacity: 0.85 }}>{profile.full_name}</span>
            <button
              onClick={signOut}
              style={{
                background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer',
              }}
            >
              Sign out
            </button>
          </div>
        )}
      </header>

      <main style={{ flex: 1, overflow: 'auto' }}>
        {children}
      </main>
    </div>
  )
}
