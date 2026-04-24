import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/AppShell'
import TeamView from '@/components/views/TeamView'

export const dynamic = 'force-dynamic'

export default async function TeamPage() {
  try {
    const supabase = await createClient()
    const { data: team, error } = await supabase.from('profiles').select('*').order('full_name')
    if (error) console.error('TeamPage fetch error:', error.message)

    return (
      <AppShell>
        <TeamView team={team ?? []} />
      </AppShell>
    )
  } catch (err) {
    console.error('TeamPage crashed:', err)
    return (
      <AppShell>
        <div style={{ padding: 40, textAlign: 'center', color: '#9C998F' }}>
          <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Unable to load team</p>
          <p style={{ fontSize: 13 }}>Please refresh the page or try again shortly.</p>
        </div>
      </AppShell>
    )
  }
}
