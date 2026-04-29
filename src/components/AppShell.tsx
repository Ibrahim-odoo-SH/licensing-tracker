'use client'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import Avatar from '@/components/ui/Avatar'

const NAV = [
  { href: '/dashboard', label: 'Dashboard',  abbr: 'DB' },
  { href: '/board',     label: 'Board',      abbr: 'BO' },
  { href: '/table',     label: 'Table',      abbr: 'TB' },
  { href: '/approved',  label: 'Approved',   abbr: 'AP' },
  { href: '/samples',   label: 'Samples',    abbr: 'SP' },
]

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { profile, can, signOut } = useAuth()

  async function handleSignOut() {
    await signOut()
    router.push('/login')
  }

  const teamHref  = profile?.role === 'admin' ? '/team'      : '/profile'
  const teamLabel = profile?.role === 'admin' ? 'Team'       : 'Profile'
  const extraNav  = profile?.role === 'admin'
    ? [
        { href: '/templates', label: 'Templates', abbr: 'TM' },
        { href: '/settings',  label: 'Settings',  abbr: 'ST' },
      ]
    : []

  const allNav = [...NAV, { href: teamHref, label: teamLabel, abbr: '⌂' }, ...extraNav]

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: 216,
        flexShrink: 0,
        background: '#1C2226',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'relative',
        zIndex: 10,
      }}>

        {/* Logo */}
        <div style={{
          padding: '22px 20px 18px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', flexShrink: 0,
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          }}>
            <img src="/logo.png" alt="Codiflow" style={{ width: 34, height: 34, objectFit: 'contain' }} />
          </div>
          <div>
            <div style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 600,
              fontSize: 19,
              lineHeight: 1,
              letterSpacing: '0.01em',
            }}>
              <span style={{ color: '#AA9682' }}>codi</span>
              <span style={{ color: '#fff' }}>flow</span>
            </div>
            <div style={{
              fontSize: 9,
              color: 'rgba(255,255,255,0.28)',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              marginTop: 3,
              fontWeight: 400,
            }}>
              Cotton Division
            </div>
          </div>
        </div>

        {/* New Record CTA */}
        {can('createRecords') && (
          <div style={{ padding: '14px 14px 6px' }}>
            <button
              onClick={() => router.push('/table?new=1')}
              style={{
                width: '100%',
                padding: '9px 0',
                background: '#AA9682',
                border: 'none',
                borderRadius: 8,
                color: '#fff',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                letterSpacing: '0.04em',
                transition: 'background 0.18s, transform 0.12s',
                textTransform: 'uppercase',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#C8B3A0'
                e.currentTarget.style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#AA9682'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              + New Record
            </button>
          </div>
        )}

        {/* Divider label */}
        <div style={{
          padding: '16px 20px 6px',
          fontSize: 9,
          color: 'rgba(255,255,255,0.2)',
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          fontWeight: 500,
        }}>
          Navigate
        </div>

        {/* Nav links */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '0 8px' }}>
          {allNav.map((item) => {
            const active = pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href))
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  padding: '9px 12px',
                  marginBottom: 2,
                  border: 'none',
                  borderRadius: 8,
                  background: active ? 'rgba(170,150,130,0.14)' : 'transparent',
                  color: active ? '#AA9682' : 'rgba(255,255,255,0.45)',
                  fontSize: 13,
                  fontWeight: active ? 500 : 400,
                  letterSpacing: '0.01em',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.14s',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.color = 'rgba(255,255,255,0.8)'
                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.color = 'rgba(255,255,255,0.45)'
                    e.currentTarget.style.background = 'transparent'
                  }
                }}
              >
                {active && (
                  <span style={{
                    position: 'absolute',
                    left: 0, top: '50%',
                    transform: 'translateY(-50%)',
                    width: 3, height: 16,
                    background: '#AA9682',
                    borderRadius: '0 2px 2px 0',
                  }} />
                )}
                <span style={{ marginLeft: active ? 6 : 0, transition: 'margin 0.14s' }}>
                  {item.label}
                </span>
              </button>
            )
          })}
        </nav>

        {/* User section */}
        {profile && (
          <div style={{
            borderTop: '1px solid rgba(255,255,255,0.05)',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <Avatar name={profile.full_name} size={30} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.85)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {profile.full_name}
              </div>
              <div style={{
                fontSize: 10, color: 'rgba(255,255,255,0.3)',
                textTransform: 'capitalize', letterSpacing: '0.04em',
              }}>
                {profile.role}
              </div>
            </div>
            <button
              onClick={handleSignOut}
              title="Sign out"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.35)',
                borderRadius: 6,
                padding: '5px 9px',
                fontSize: 10,
                cursor: 'pointer',
                letterSpacing: '0.06em',
                flexShrink: 0,
                transition: 'all 0.14s',
                textTransform: 'uppercase',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#A35C5C'
                e.currentTarget.style.borderColor = 'rgba(163,92,92,0.3)'
                e.currentTarget.style.background = 'rgba(163,92,92,0.08)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'rgba(255,255,255,0.35)'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
              }}
            >
              Out
            </button>
          </div>
        )}
      </aside>

      {/* ── Main content ── */}
      <main style={{ flex: 1, overflow: 'auto', background: '#F7F6F4', display: 'flex', flexDirection: 'column' }}>
        {children}
      </main>

    </div>
  )
}
