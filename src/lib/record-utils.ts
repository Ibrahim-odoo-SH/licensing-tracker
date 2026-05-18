'use client'
import { BRANDS, PROPS } from '@/lib/constants'

/**
 * Given rows from the records table, returns the brands and properties
 * that exist in the DB but are NOT in the static constants — so user-created
 * brands/properties persist across sessions without a schema change.
 */
export function mergeDynamicBrands(
  rows: Array<{ brand?: string | null; property?: string | null }>
) {
  const extraBrands: string[] = []
  const extraPropsByBrand: Record<string, string[]> = {}

  rows.forEach((r) => {
    const b = (r.brand ?? '').trim()
    const p = (r.property ?? '').trim()
    if (!b) return

    if (!(BRANDS as readonly string[]).includes(b) && !extraBrands.includes(b)) {
      extraBrands.push(b)
    }
    if (p) {
      const staticProps = (PROPS as Record<string, string[]>)[b] ?? []
      if (!extraPropsByBrand[b]) extraPropsByBrand[b] = []
      if (!staticProps.includes(p) && !extraPropsByBrand[b].includes(p)) {
        extraPropsByBrand[b].push(p)
      }
    }
  })

  return { extraBrands, extraPropsByBrand }
}

/**
 * Fire-and-forget file uploader — attach files to a record after it is created.
 */
export async function uploadRecordFiles(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  recordId: string,
  files: File[],
  uploadedBy: string | null
) {
  for (const file of files) {
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const filePath = `${recordId}/${Date.now()}-${safeName}`
      const mimeType = file.type || 'application/octet-stream'
      const { error: upErr } = await supabase.storage
        .from('record-attachments')
        .upload(filePath, file, { contentType: mimeType, upsert: false })
      if (upErr) { console.error('Upload error:', upErr.message); continue }
      const { data: { publicUrl } } = supabase.storage
        .from('record-attachments')
        .getPublicUrl(filePath)
      await supabase.from('record_attachments').insert({
        record_id: recordId, file_name: file.name, file_path: filePath,
        file_type: mimeType, file_size: file.size,
        public_url: publicUrl, uploaded_by: uploadedBy,
      })
    } catch (e) {
      console.error('File upload failed:', e)
    }
  }
}
