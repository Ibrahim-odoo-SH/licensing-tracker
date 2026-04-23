import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/AppShell'
import TeamView from '@/components/views/TeamView'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: team } = await supabase.from('profiles').select('*').order('full_name')

  return (
    <AppShell>
      <TeamView team={team ?? []} />
    </AppShell>
  )
}
