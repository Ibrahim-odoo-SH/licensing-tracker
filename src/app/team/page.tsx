'use client'
import dynamic from 'next/dynamic'
import AppShell from '@/components/AppShell'

// TeamView uses browser-only APIs (Supabase client, auth state, localStorage).
// ssr: false ensures it NEVER runs on the server — only in the browser.
// This eliminates the server crash that caused "This page couldn't load".
const TeamView = dynamic(
  () => import('@/components/views/TeamView'),
  {
    ssr: false,
    loading: () => (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '60vh', flexDirection: 'column', gap: 12,
      }}>
        <div style={{
          width: 28, height: 28,
          border: '3px solid #D8D4CE',
          borderTopColor: '#AA9682',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ color: '#7A756E', fontSize: 13 }}>Loading team…</p>
      </div>
    ),
  }
)

export default function TeamPage() {
  return (
    <AppShell>
      <TeamView />
    </AppShell>
  )
}
