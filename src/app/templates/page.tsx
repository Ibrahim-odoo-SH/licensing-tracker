import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppShell from '@/components/AppShell'
import TemplatesView from '@/components/views/TemplatesView'

export default async function TemplatesPage() {
  const supabase = await createClient()

  // Only admins can access this page
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: templates } = await supabase.from('email_templates').select('*')

  return (
    <AppShell>
      <TemplatesView initialTemplates={templates ?? []} />
    </AppShell>
  )
}
