import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/AppShell'
import ApprovedView from '@/components/views/ApprovedView'

export default async function ApprovedPage() {
  const supabase = await createClient()

  const [{ data: records }, { data: team }] = await Promise.all([
    supabase.from('records').select('*').eq('normalized_stage', 'Fully Approved').order('updated_at', { ascending: false }),
    supabase.from('profiles').select('*').eq('is_active', true).order('full_name'),
  ])

  return (
    <AppShell>
      <ApprovedView initialRecords={records ?? []} team={team ?? []} />
    </AppShell>
  )
}
