import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/AppShell'
import DashboardView from '@/components/views/DashboardView'

export default async function DashboardPage() {
  const supabase = await createClient()

  const [{ data: records }, { data: logs }] = await Promise.all([
    supabase.from('records').select('*').order('updated_at', { ascending: false }),
    supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(50),
  ])

  return (
    <AppShell>
      <DashboardView records={records ?? []} logs={logs ?? []} />
    </AppShell>
  )
}
