import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/AppShell'
import TableView from '@/components/views/TableView'
import type { Filters } from '@/lib/types'

export default async function TablePage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const supabase = await createClient()
  const params = await searchParams

  const [{ data: records }, { data: team }, { data: imageAttachments }] = await Promise.all([
    supabase.from('records').select('*').order('updated_at', { ascending: false }),
    supabase.from('profiles').select('*').eq('is_active', true).order('full_name'),
    supabase.from('record_attachments').select('record_id, public_url, file_type, is_primary').filter('file_type', 'ilike', 'image/%'),
  ])

  // Build thumbnail map: prefer is_primary=true, fallback to first image per record
  const thumbnails: Record<string, string> = {}
  for (const row of imageAttachments ?? []) {
    if (!thumbnails[row.record_id]) thumbnails[row.record_id] = row.public_url
  }
  for (const row of imageAttachments ?? []) {
    if (row.is_primary) thumbnails[row.record_id] = row.public_url
  }

  const initialFilters: Partial<Filters> = {}
  if (params.stage)     initialFilters.stage     = params.stage
  if (params.brand)     initialFilters.brand     = params.brand
  if (params.owner)     initialFilters.owner     = params.owner
  if (params.priority)  initialFilters.priority  = params.priority
  if (params.waitingOn) initialFilters.waitingOn = params.waitingOn
  if (params.reminders === '1') initialFilters.showReminders = true

  return (
    <AppShell>
      <TableView initialRecords={records ?? []} team={team ?? []} initialFilters={initialFilters} thumbnails={thumbnails} />
    </AppShell>
  )
}
