import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  // Verify the caller is authenticated and is an admin
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: caller } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (caller?.role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can invite team members' }, { status: 403 })
  }

  const { email, full_name, role } = await request.json()

  if (!email || !full_name || !role) {
    return NextResponse.json({ error: 'email, full_name, and role are required' }, { status: 400 })
  }
  if (!email.endsWith('@cottondivision.com')) {
    return NextResponse.json({ error: 'Only @cottondivision.com emails are allowed' }, { status: 400 })
  }

  // Use service role for admin operations (bypass RLS)
  const admin = createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Invite the user — creates an auth.users entry and sends the invitation email
  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    email.trim().toLowerCase(),
    { data: { full_name: full_name.trim() } }
  )

  if (inviteError) {
    return NextResponse.json({ error: inviteError.message }, { status: 400 })
  }

  const userId = inviteData.user.id

  // Upsert the profile row using service role (bypasses the FK constraint issue)
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .upsert({
      id: userId,
      email: email.trim().toLowerCase(),
      full_name: full_name.trim(),
      role,
      is_active: true,
    }, { onConflict: 'id' })
    .select()
    .single()

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 })
  }

  return NextResponse.json({ profile })
}
