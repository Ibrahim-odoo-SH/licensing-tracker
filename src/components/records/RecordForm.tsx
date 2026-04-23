'use client'
import { useState } from 'react'
import { BRANDS, PROPS, STAGES, PRIORITIES, WAITING_OPTS, GENDERS, PROD_TYPES } from '@/lib/constants'
import type { LicRecord, Profile, Attachment } from '@/lib/types'

interface RecordFormProps {
  initial?: Partial<LicRecord>
  team: Profile[]
  onSave: (data: Partial<LicRecord>, pendingFiles?: File[]) => Promise<void>
  onCancel: () => void
  attachments?: Attachment[]
  onUploadAttachment?: (file: File) => Promise<void>
  onDeleteAttachment?: (att: Attachment) => Promise<void>
  uploading?: boolean
}

const fieldStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', border: '1px solid #E5E2DA',
  borderRadius: 7, fontSize: 13, outline: 'none', background: '#FAFAF8',
}
const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: '#5A5A6A', display: 'block', marginBottom: 4,
}
const group = (label: string, input: React.ReactNode) => (
  <div style={{ marginBottom: 14 }}>
    <label style={labelStyle}>{label}</label>
    {input}
  </div>
)

const ALL_BRANDS = BRANDS as readonly string[]
const ACCEPTED = '.jpg,.jpeg,.png,.gif,.webp,.pdf,.svg,.ai,.psd,.eps'

export default function RecordForm({
  initial = {}, team, onSave, onCancel,
  attachments = [], onUploadAttachment, onDeleteAttachment, uploading = false,
}: RecordFormProps) {
  const [data, setData] = useState<Partial<LicRecord>>(() => {
    const merged: Partial<LicRecord> = {
      internal_ref: '', product_name: '', main_licensor_ref: '',
      product_type: 'Apparel', gender: 'Unisex', brand: '', property: '',
      normalized_stage: 'Design Sent', priority: 'Medium', waiting_on: 'None',
      owner_name_snapshot: '', contact_name: '', next_action: '', notes_summary: '',
      licensor_feedback: '', tech_pack_link: '', additional_link: '',
      submission_date: '', samples_requested_qty: 0,
      reminder_date: null, reminder_note: '', reminder_done: false,
      ...initial,
    }
    // Normalize DB nulls → safe defaults so controlled inputs never receive null/undefined
    return {
      ...merged,
      brand: merged.brand ?? '',
      property: merged.property ?? '',
      samples_requested_qty: merged.samples_requested_qty ?? 0,
      submission_date: merged.submission_date ?? '',
      tech_pack_link: merged.tech_pack_link ?? '',
      additional_link: merged.additional_link ?? '',
      notes_summary: merged.notes_summary ?? '',
      licensor_feedback: merged.licensor_feedback ?? '',
      contact_name: merged.contact_name ?? '',
      next_action: merged.next_action ?? '',
      owner_name_snapshot: merged.owner_name_snapshot ?? '',
      main_licensor_ref: merged.main_licensor_ref ?? '',
      internal_ref: merged.internal_ref ?? '',
      product_name: merged.product_name ?? '',
      reminder_note: merged.reminder_note ?? '',
      reminder_done: merged.reminder_done ?? false,
    }
  })
  const [saving, setSaving] = useState(false)
  // Pending files for NEW record mode (uploaded after record is created)
  const isNewRecord = !initial?.id
  const [pendingFiles, setPendingFiles] = useState<File[]>([])

  // Custom brand / property inline-input mode
  const initBrand = (initial.brand ?? '') as string
  const initProperty = (initial.property ?? '') as string
  const [showCustomBrand, setShowCustomBrand] = useState(
    !!initBrand && !ALL_BRANDS.includes(initBrand)
  )
  const [showCustomProperty, setShowCustomProperty] = useState(
    !!initProperty && !(PROPS[initBrand] ?? []).includes(initProperty)
  )

  const set = (key: keyof LicRecord, val: any) => setData((prev) => ({ ...prev, [key]: val }))

  const brandProps = !showCustomBrand && data.brand ? PROPS[data.brand as string] ?? [] : []

  function handleBrandChange(e: React.ChangeEvent<HTMLSelectElement>) {
    if (e.target.value === '__add_new__') {
      setShowCustomBrand(true)
      setShowCustomProperty(false)
      set('brand', '')
      set('property', '')
    } else {
      setShowCustomBrand(false)
      setShowCustomProperty(false)
      set('brand', e.target.value)
      set('property', '')
    }
  }

  function handlePropertyChange(e: React.ChangeEvent<HTMLSelectElement>) {
    if (e.target.value === '__add_new__') {
      setShowCustomProperty(true)
      set('property', '')
    } else {
      setShowCustomProperty(false)
      set('property', e.target.value)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await onSave(data, isNewRecord ? pendingFiles : undefined)
    setSaving(false)
  }

  // Edit mode: upload immediately via parent handler
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (onUploadAttachment) {
      await onUploadAttachment(file)
    } else if (isNewRecord) {
      setPendingFiles((prev) => [...prev, file])
    }
    e.target.value = ''
  }

  function removePendingFile(index: number) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <form onSubmit={handleSubmit} style={{ padding: 20 }}>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
        {group('Internal Ref *', <input required style={fieldStyle} value={data.internal_ref} onChange={(e) => set('internal_ref', e.target.value)} placeholder="e.g. WB-TS-2451" />)}
        {group('Main Licensor Ref', <input style={fieldStyle} value={data.main_licensor_ref} onChange={(e) => set('main_licensor_ref', e.target.value)} />)}
      </div>

      {group('Product Name *', <input required style={fieldStyle} value={data.product_name} onChange={(e) => set('product_name', e.target.value)} />)}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
        {group('Product Type', (
          <select style={fieldStyle} value={data.product_type} onChange={(e) => set('product_type', e.target.value)}>
            {PROD_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        ))}
        {group('Gender', (
          <select style={fieldStyle} value={data.gender} onChange={(e) => set('gender', e.target.value)}>
            {GENDERS.map((g) => <option key={g}>{g}</option>)}
          </select>
        ))}
      </div>

      {/* Brand & Property with "Add new" */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Brand</label>
          {showCustomBrand ? (
            <div style={{ display: 'flex', gap: 4 }}>
              <input
                autoFocus
                style={{ ...fieldStyle, flex: 1 }}
                value={data.brand as string}
                onChange={(e) => set('brand', e.target.value)}
                placeholder="Type brand name…"
              />
              <button
                type="button"
                onClick={() => { setShowCustomBrand(false); setShowCustomProperty(false); set('brand', ''); set('property', '') }}
                style={{ padding: '0 9px', border: '1px solid #E5E2DA', borderRadius: 7, background: '#F4F3EF', cursor: 'pointer', fontSize: 15, color: '#9C998F' }}
                title="Cancel"
              >×</button>
            </div>
          ) : (
            <select style={fieldStyle} value={data.brand} onChange={handleBrandChange}>
              <option value="">— Select —</option>
              {ALL_BRANDS.map((b) => <option key={b}>{b}</option>)}
              <option value="__add_new__">＋ Add new brand…</option>
            </select>
          )}
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Property</label>
          {showCustomProperty || showCustomBrand ? (
            <div style={{ display: 'flex', gap: 4 }}>
              <input
                style={{ ...fieldStyle, flex: 1 }}
                value={data.property as string}
                onChange={(e) => set('property', e.target.value)}
                placeholder="Type property name…"
              />
              {!showCustomBrand && (
                <button
                  type="button"
                  onClick={() => { setShowCustomProperty(false); set('property', '') }}
                  style={{ padding: '0 9px', border: '1px solid #E5E2DA', borderRadius: 7, background: '#F4F3EF', cursor: 'pointer', fontSize: 15, color: '#9C998F' }}
                  title="Cancel"
                >×</button>
              )}
            </div>
          ) : (
            <select style={fieldStyle} value={data.property} onChange={handlePropertyChange} disabled={!data.brand}>
              <option value="">— Select —</option>
              {brandProps.map((p) => <option key={p}>{p}</option>)}
              {data.brand && <option value="__add_new__">＋ Add new property…</option>}
            </select>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
        {group('Stage', (
          <select style={fieldStyle} value={data.normalized_stage} onChange={(e) => set('normalized_stage', e.target.value as any)}>
            {STAGES.map((s) => <option key={s}>{s}</option>)}
          </select>
        ))}
        {group('Priority', (
          <select style={fieldStyle} value={data.priority} onChange={(e) => set('priority', e.target.value as any)}>
            {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
          </select>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
        {group('Owner', (
          <select style={fieldStyle} value={data.owner_name_snapshot} onChange={(e) => {
            const m = team.find((t) => t.full_name === e.target.value)
            set('owner_name_snapshot', e.target.value)
            set('owner_id', m?.id ?? null)
          }}>
            <option value="">— Unassigned —</option>
            {team.filter((m) => m.is_active).map((m) => <option key={m.id}>{m.full_name}</option>)}
          </select>
        ))}
        {group('Waiting On', (
          <select style={fieldStyle} value={data.waiting_on} onChange={(e) => set('waiting_on', e.target.value as any)}>
            {WAITING_OPTS.map((w) => <option key={w}>{w}</option>)}
          </select>
        ))}
      </div>

      {group('Contact', <input style={fieldStyle} value={data.contact_name} onChange={(e) => set('contact_name', e.target.value)} />)}
      {group('Next Action', <input style={fieldStyle} value={data.next_action} onChange={(e) => set('next_action', e.target.value)} />)}
      {group('Notes', <textarea style={{ ...fieldStyle, minHeight: 72, resize: 'vertical' }} value={data.notes_summary} onChange={(e) => set('notes_summary', e.target.value)} />)}
      {group('Licensor Feedback', <textarea style={{ ...fieldStyle, minHeight: 60, resize: 'vertical' }} value={data.licensor_feedback} onChange={(e) => set('licensor_feedback', e.target.value)} />)}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
        {group('Tech Pack Link', <input style={fieldStyle} value={data.tech_pack_link} onChange={(e) => set('tech_pack_link', e.target.value)} placeholder="https://…" />)}
        {group('Additional Link', <input style={fieldStyle} value={data.additional_link} onChange={(e) => set('additional_link', e.target.value)} placeholder="https://…" />)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
        {group('Submission Date', <input type="date" style={fieldStyle} value={data.submission_date ?? ''} onChange={(e) => set('submission_date', e.target.value)} />)}
        {group('Samples Qty', <input type="number" min={0} style={fieldStyle} value={data.samples_requested_qty ?? 0} onChange={(e) => set('samples_requested_qty', e.target.value === '' ? 0 : parseInt(e.target.value) || 0)} />)}
      </div>

      {/* Reminder section */}
      <div style={{ background: '#FFFBF0', border: '1px solid #FFE082', borderRadius: 10, padding: 16, marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A2E', marginBottom: 12 }}>🔔 Follow-up Reminder</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          {group('Reminder Date', (
            <input
              type="date"
              style={fieldStyle}
              value={data.reminder_date ?? ''}
              onChange={(e) => set('reminder_date', e.target.value || null)}
            />
          ))}
          {group('Note', (
            <input
              style={fieldStyle}
              value={data.reminder_note ?? ''}
              onChange={(e) => set('reminder_note', e.target.value)}
              placeholder="e.g. Follow up with licensor for approval"
            />
          ))}
        </div>
        {!isNewRecord && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={data.reminder_done ?? false}
              onChange={(e) => set('reminder_done', e.target.checked)}
            />
            <span style={{ fontSize: 13, color: '#5A5A6A' }}>Mark reminder as done</span>
          </label>
        )}
      </div>

      {/* Attachments section — new record: pending files; edit record: live upload */}
      {(isNewRecord || onUploadAttachment) && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>
              ATTACHMENTS {isNewRecord ? `(${pendingFiles.length} queued)` : `(${attachments.length})`}
            </label>
            <label style={{
              fontSize: 12, fontWeight: 600, color: '#2D4A6F',
              cursor: uploading ? 'not-allowed' : 'pointer',
              padding: '4px 10px', border: '1px solid #C7D4E8', borderRadius: 6, background: '#EEF3FA',
            }}>
              {uploading ? 'Uploading…' : '＋ Upload file'}
              <input type="file" accept={ACCEPTED} onChange={handleFileChange} disabled={uploading} style={{ display: 'none' }} />
            </label>
          </div>

          {/* NEW RECORD: local preview of queued files */}
          {isNewRecord && (
            pendingFiles.length === 0 ? (
              <label style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 6, border: '2px dashed #E5E2DA', borderRadius: 8, padding: '20px 0',
                color: '#9C998F', fontSize: 13, cursor: 'pointer', background: '#FAFAF8',
              }}>
                <span style={{ fontSize: 24 }}>🖼️</span>
                <span>Click to attach images or files</span>
                <span style={{ fontSize: 11, color: '#B8B5AD' }}>Will upload when record is saved</span>
                <input type="file" accept={ACCEPTED} onChange={handleFileChange} style={{ display: 'none' }} />
              </label>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {pendingFiles.map((file, i) => {
                  const isImage = file.type.startsWith('image/')
                  const previewUrl = isImage ? URL.createObjectURL(file) : null
                  return (
                    <div key={i} style={{ position: 'relative' }}>
                      {isImage && previewUrl ? (
                        <img src={previewUrl} alt={file.name} style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 6, border: '1px solid #E5E2DA' }} />
                      ) : (
                        <div style={{ width: 72, height: 72, background: '#F4F3EF', border: '1px solid #E5E2DA', borderRadius: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                          <span style={{ fontSize: 20 }}>📎</span>
                          <span style={{ fontSize: 9, color: '#9C998F', textAlign: 'center', padding: '0 4px' }}>{file.name.split('.').pop()?.toUpperCase()}</span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => removePendingFile(i)}
                        style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: '50%', background: '#C0392B', color: '#fff', border: 'none', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >×</button>
                    </div>
                  )
                })}
              </div>
            )
          )}

          {/* EDIT RECORD: show existing attachments */}
          {!isNewRecord && (
            attachments.length === 0 ? (
              <label style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 6, border: '2px dashed #E5E2DA', borderRadius: 8, padding: '20px 0',
                color: '#9C998F', fontSize: 13, cursor: 'pointer', background: '#FAFAF8',
              }}>
                <span style={{ fontSize: 24 }}>🖼️</span>
                <span>Click or drag to upload images / files</span>
                <span style={{ fontSize: 11 }}>{ACCEPTED.replaceAll(',', '  ')}</span>
                <input type="file" accept={ACCEPTED} onChange={handleFileChange} disabled={uploading} style={{ display: 'none' }} />
              </label>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {attachments.map((att) => (
                  <div key={att.id} style={{ position: 'relative' }}>
                    {att.file_type?.startsWith('image/') ? (
                      <a href={att.public_url} target="_blank" rel="noopener noreferrer">
                        <img src={att.public_url} alt={att.file_name} style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 6, border: '1px solid #E5E2DA' }} />
                      </a>
                    ) : (
                      <a href={att.public_url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                        <div style={{ width: 72, height: 72, background: '#F4F3EF', border: '1px solid #E5E2DA', borderRadius: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                          <span style={{ fontSize: 20 }}>📎</span>
                          <span style={{ fontSize: 9, color: '#9C998F', textAlign: 'center', padding: '0 4px' }}>{att.file_name.split('.').pop()?.toUpperCase()}</span>
                        </div>
                      </a>
                    )}
                    {onDeleteAttachment && (
                      <button
                        type="button"
                        onClick={() => onDeleteAttachment(att)}
                        style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: '50%', background: '#C0392B', color: '#fff', border: 'none', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >×</button>
                    )}
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 4, paddingTop: 16, borderTop: '1px solid #E5E2DA' }}>
        <button type="button" onClick={onCancel} style={{ flex: 1, padding: '9px', background: '#F4F3EF', border: '1px solid #E5E2DA', borderRadius: 8, cursor: 'pointer', fontWeight: 500 }}>
          Cancel
        </button>
        <button type="submit" disabled={saving} style={{ flex: 2, padding: '9px', background: saving ? '#8BA5C4' : '#2D4A6F', color: '#fff', border: 'none', borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 600 }}>
          {saving ? 'Saving…' : 'Save Record'}
        </button>
      </div>
    </form>
  )
}
