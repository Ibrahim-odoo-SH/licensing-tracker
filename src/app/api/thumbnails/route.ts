import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  // Verify the caller is signed in
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use service role to bypass RLS — every authenticated user gets thumbnails
  const admin = createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data, error } = await admin
    .from('record_attachments')
    .select('record_id, public_url, file_type, is_primary')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Build a map: record_id → best thumbnail URL
  const map: Record<string, string> = {}
  for (const row of data ?? []) {
    if (!row.public_url) continue
    const isImage =
      row.file_type?.startsWith('image/') ||
      /\.(jpe?g|png|gif|webp|avif|svg)$/i.test(row.public_url)
    if (!isImage) continue
    if (!map[row.record_id]) map[row.record_id] = row.public_url
  }
  // Primary image wins
  for (const row of data ?? []) {
    if (row.is_primary && row.public_url) map[row.record_id] = row.public_url
  }

  return NextResponse.json({ thumbnails: map })
}
