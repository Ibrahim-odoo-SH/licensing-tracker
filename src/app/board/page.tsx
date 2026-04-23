import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/AppShell'
import BoardView from '@/components/views/BoardView'

export default async function BoardPage() {
  const supabase = await createClient()

  const [{ data: records }, { data: team }] = await Promise.all([
    supabase.from('records').select('*').order('updated_at', { ascending: false }),
    supabase.from('profiles').select('*').eq('is_active', true).order('full_name'),
  ])

  return (
    <AppShell>
      <BoardView initialRecords={records ?? []} team={team ?? []} />
    </AppShell>
  )
}
