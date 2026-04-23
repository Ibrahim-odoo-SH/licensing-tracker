import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/AppShell'
import TableView from '@/components/views/TableView'
import type { Filters } from '@/lib/types'

export default async function TablePage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const supabase = await createClient()
  const params = await searchParams

  const [{ data: records }, { data: team }] = await Promise.all([
    supabase.from('records').select('*').order('updated_at', { ascending: false }),
    supabase.from('profiles').select('*').eq('is_active', true).order('full_name'),
  ])

  const initialFilters: Partial<Filters> = {}
  if (params.stage)     initialFilters.stage     = params.stage
  if (params.brand)     initialFilters.brand     = params.brand
  if (params.owner)     initialFilters.owner     = params.owner
  if (params.priority)  initialFilters.priority  = params.priority
  if (params.waitingOn) initialFilters.waitingOn = params.waitingOn
  if (params.reminders === '1') initialFilters.showReminders = true

  return (
    <AppShell>
      <TableView initialRecords={records ?? []} team={team ?? []} initialFilters={initialFilters} />
    </AppShell>
  )
}
