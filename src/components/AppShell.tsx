'use client'
import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth-context'
import { useLanguage } from '@/lib/language-context'
import { useIsMobile } from '@/lib/use-mobile'
import { mergeDynamicBrands, uploadRecordFiles } from '@/lib/record-utils'
import type { LicRecord, Profile } from '@/lib/types'
import Avatar from '@/components/ui/Avatar'
import RecordForm from '@/components/records/RecordForm'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { profile, can, signOut } = useAuth()
  const { lang, setLang, t } = useLanguage()
  const isMobile = useIsMobile()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // ── Global New Record modal ──
  const [createOpen, setCreateOpen] = useState(false)
  const [createTeam, setCreateTeam] = useState<Profile[]>([])
  const [extraBrands, setExtraBrands] = useState<string[]>([])
  const [extraPropsByBrand, setExtraPropsByBrand] = useState<Record<string, string[]>>({})
  const [createSuccess, setCreateSuccess] = useState('')

  async function openNewRecord() {
    if (isMobile) setSidebarOpen(false)
    setCreateOpen(true)
    // Fetch team + dynamic brands in parallel when modal opens
    const supabase = createClient()
    const [teamRes, brandsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('is_active', true).order('full_name'),
      supabase.from('records').select('brand, property'),
    ])
    if (teamRes.data) setCreateTeam(teamRes.data)
    if (brandsRes.data) {
      const { extraBrands: eb, extraPropsByBrand: ep } = mergeDynamicBrands(brandsRes.data)
      setExtraBrands(eb)
      setExtraPropsByBrand(ep)
    }
  }

  async function handleGlobalCreate(data: Partial<LicRecord>, pendingFiles?: File[]) {
    const supabase = createClient()
    const { data: created, error } = await supabase
      .from('records')
      .insert({ ...data, created_by: profile?.id, updated_by: profile?.id })
      .select()
      .single()

    if (error || !created) {
      alert(`Failed to save record: ${error?.message ?? 'Unknown error'}`)
      return // Keep modal open with data intact
    }

    void supabase.from('activity_logs').insert({
      record_id: created.id, user_id: profile?.id,
      user_name: profile?.full_name, action_type: 'record_created',
    })

    // Update local dynamic brands so they show on next open
    if (data.brand) {
      setExtraBrands((prev) => prev.includes(data.brand as string) ? prev : [...prev, data.brand as string])
      if (data.property) {
        setExtraPropsByBrand((prev) => {
          const b = data.brand as string; const p = data.property as string
          const existing = prev[b] ?? []
          return existing.includes(p) ? prev : { ...prev, [b]: [...existing, p] }
        })
      }
    }

    if (pendingFiles?.length) void uploadRecordFiles(supabase, created.id, pendingFiles, profile?.id ?? null)

    setCreateOpen(false)
    setCreateSuccess(`✓ ${created.internal_ref || 'Record'} created`)
    setTimeout(() => setCreateSuccess(''), 3000)
    router.refresh() // Re-fetch server data for the current page
  }

  async function handleSignOut() {
    await signOut()
    router.push('/login')
  }

  function navigate(href: string) {
    router.push(href)
    if (isMobile) setSidebarOpen(false)
  }

  const teamHref  = profile?.role === 'admin' ? '/team'      : '/profile'
  const teamLabel = profile?.role === 'admin' ? t.nav_team   : t.nav_profile
  const extraNav  = profile?.role === 'admin'
    ? [
        { href: '/templates', label: t.nav_templates },
        { href: '/settings',  label: t.nav_settings  },
      ]
    : []

  const NAV = [
    { href: '/dashboard', label: t.nav_dashboard },
    { href: '/board',     label: t.nav_board     },
    { href: '/table',     label: t.nav_table     },
    { href: '/approved',  label: t.nav_approved  },
    { href: '/samples',   label: t.nav_samples   },
  ]

  const allNav = [...NAV, { href: teamHref, label: teamLabel }, ...extraNav]

  // ── Sidebar content (shared between mobile overlay and desktop) ──
  const sidebarContent = (
    <>
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
        <div style={{ flex: 1 }}>
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
        {/* Close button on mobile */}
        {isMobile && (
          <button
            onClick={() => setSidebarOpen(false)}
            style={{
              background: 'rgba(255,255,255,0.07)',
              border: 'none',
              borderRadius: 8,
              color: 'rgba(255,255,255,0.5)',
              width: 32, height: 32,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              fontSize: 18,
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* New Record CTA */}
      {can('createRecords') && (
        <div style={{ padding: '14px 14px 6px' }}>
          <button
            onClick={openNewRecord}
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
            {t.nav_newRecord}
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
        {t.nav_navigate}
      </div>

      {/* Nav links */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '0 8px' }}>
        {allNav.map((item) => {
          const active = pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <button
              key={item.href}
              onClick={() => navigate(item.href)}
              style={{
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                padding: isMobile ? '12px 12px' : '9px 12px',
                marginBottom: 2,
                border: 'none',
                borderRadius: 8,
                background: active ? 'rgba(170,150,130,0.14)' : 'transparent',
                color: active ? '#AA9682' : 'rgba(255,255,255,0.45)',
                fontSize: isMobile ? 15 : 13,
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

      {/* Language toggle */}
      <div style={{
        padding: '8px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
      }}>
        {(['en', 'fr'] as const).map((l) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            style={{
              flex: 1,
              padding: '5px 0',
              fontSize: 11,
              fontWeight: lang === l ? 700 : 400,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              border: lang === l ? '1px solid rgba(170,150,130,0.5)' : '1px solid rgba(255,255,255,0.06)',
              borderRadius: 6,
              background: lang === l ? 'rgba(170,150,130,0.14)' : 'transparent',
              color: lang === l ? '#AA9682' : 'rgba(255,255,255,0.3)',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {l === 'en' ? '🇬🇧 EN' : '🇫🇷 FR'}
          </button>
        ))}
      </div>

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
            {t.nav_signOut}
          </button>
        </div>
      )}
    </>
  )

  // ── Global New Record modal (rendered in both layouts) ──
  const globalModal = (
    <>
      {/* Success toast */}
      {createSuccess && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          background: '#1A7A3A', color: '#fff', borderRadius: 10,
          padding: '10px 22px', fontSize: 13, fontWeight: 600,
          zIndex: 500, boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
          whiteSpace: 'nowrap', pointerEvents: 'none', letterSpacing: '0.02em',
        }}>
          {createSuccess}
        </div>
      )}

      {/* New Record modal */}
      {createOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 400, display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center' }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => e.preventDefault()}
        >
          <div style={{ background: '#fff', borderRadius: isMobile ? '14px 14px 0 0' : 14, width: isMobile ? '100%' : 620, maxHeight: isMobile ? '92vh' : '90vh', overflow: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E2DA', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: '#1A1A2E' }}>+ New Record</span>
              <button onClick={() => setCreateOpen(false)} style={{ background: 'none', border: 'none', fontSize: 22, color: '#9C998F', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            <RecordForm
              team={createTeam}
              onSave={handleGlobalCreate}
              onCancel={() => setCreateOpen(false)}
              extraBrands={extraBrands}
              extraPropsByBrand={extraPropsByBrand}
            />
          </div>
        </div>
      )}
    </>
  )

  // ── Mobile layout ──
  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

        {/* Mobile top bar */}
        <div style={{
          height: 56,
          background: '#1C2226',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          gap: 12,
          flexShrink: 0,
          zIndex: 30,
          position: 'relative',
        }}>
          {/* Hamburger */}
          <button
            onClick={() => setSidebarOpen(true)}
            style={{
              background: 'rgba(255,255,255,0.07)',
              border: 'none',
              borderRadius: 8,
              color: 'rgba(255,255,255,0.7)',
              width: 36, height: 36,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
              <rect width="18" height="2" rx="1" fill="currentColor"/>
              <rect y="6" width="14" height="2" rx="1" fill="currentColor"/>
              <rect y="12" width="18" height="2" rx="1" fill="currentColor"/>
            </svg>
          </button>

          {/* Logo centered */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden',
            }}>
              <img src="/logo.png" alt="Codiflow" style={{ width: 26, height: 26, objectFit: 'contain' }} />
            </div>
            <div style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 600,
              fontSize: 18,
              lineHeight: 1,
            }}>
              <span style={{ color: '#AA9682' }}>codi</span>
              <span style={{ color: '#fff' }}>flow</span>
            </div>
          </div>

          {/* Avatar */}
          {profile && <Avatar name={profile.full_name} size={30} />}
        </div>

        {/* Backdrop */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 40,
              background: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(2px)',
            }}
          />
        )}

        {/* Slide-in sidebar */}
        <aside style={{
          position: 'fixed',
          top: 0, left: 0, bottom: 0,
          width: 280,
          background: '#1C2226',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          overflowY: 'auto',
        }}>
          {sidebarContent}
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, overflow: 'auto', background: '#F7F6F4', display: 'flex', flexDirection: 'column' }}>
          {children}
        </main>

        {globalModal}
      </div>
    )
  }

  // ── Desktop layout ──
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

      {/* Sidebar */}
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
        {sidebarContent}
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'auto', background: '#F7F6F4', display: 'flex', flexDirection: 'column' }}>
        {children}
      </main>

      {globalModal}
    </div>
  )
}
