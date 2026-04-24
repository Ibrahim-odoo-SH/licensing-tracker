import AppShell from '@/components/AppShell'
import TeamView from '@/components/views/TeamView'

// No server-side data fetch — TeamView loads its own data client-side
export default function TeamPage() {
  return (
    <AppShell>
      <TeamView />
    </AppShell>
  )
}
