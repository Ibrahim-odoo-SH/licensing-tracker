import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/AppShell'
import SamplesView from '@/components/views/SamplesView'

export default async function SamplesPage() {
  const supabase = await createClient()

  const [{ data: records }, { data: team }] = await Promise.all([
    supabase.from('records').select('*').gt('samples_requested_qty', 0).order('updated_at', { ascending: false }),
    supabase.from('profiles').select('*').eq('is_active', true).order('full_name'),
  ])

  return (
    <AppShell>
      <SamplesView initialRecords={records ?? []} team={team ?? []} />
    </AppShell>
  )
}
