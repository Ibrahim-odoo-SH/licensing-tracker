'use client'
import { useState, useMemo, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth-context'
import type { LicRecord, Profile, Filters } from '@/lib/types'
import { STAGE_META, BRAND_COLORS, PRIORITY_COLORS } from '@/lib/constants'
import { daysSince } from '@/lib/utils'
import FilterBar from '@/components/records/FilterBar'
import RecordDrawer from '@/components/records/RecordDrawer'
import RecordForm from '@/components/records/RecordForm'
import NotifyModal from '@/components/notifications/NotifyModal'
import PriorityDot from '@/components/ui/PriorityDot'
import Avatar from '@/components/ui/Avatar'

interface Props {
  initialRecords: LicRecord[]
  team: Profile[]
  initialFilters?: Partial<Filters>
  thumbnails?: Record<string, string>
}

const DEFAULT_FILTERS: Filters = { search: '', brand: '', property: '', stage: '', owner: '', priority: '', waitingOn: '', showArchived: false, showReminders: false }

function applyFilters(records: LicRecord[], f: Filters): LicRecord[] {
  // Reminders mode: only pending reminders, sorted by due date
  if (f.showReminders === true) {
    return records
      .filter((r) => !r.is_archived && r.reminder_date && !r.reminder_done)
      .sort((a, b) => (a.reminder_date! > b.reminder_date! ? 1 : -1))
  }
  return records.filter((r) => {
    if (!f.showArchived && r.is_archived) return false
    if (f.showArchived && !r.is_archived) return false
    if (f.search) {
      const q = f.search.toLowerCase()
      if (![r.internal_ref, r.main_licensor_ref, r.product_name, r.brand, r.property, r.owner_name_snapshot, r.notes_summary].some((v) => v?.toLowerCase().includes(q))) return false
    }
    if (f.brand && r.brand !== f.brand) return false
    if (f.property && r.property !== f.property) return false
    if (f.stage && r.normalized_stage !== f.stage) return false
    if (f.owner && r.owner_name_snapshot !== f.owner) return false
    if (f.priority && r.priority !== f.priority) return false
    if (f.waitingOn && r.waiting_on !== f.waitingOn) return false
    return true
  })
}

export default function TableView({ initialRecords, team, initialFilters, thumbnails = {} }: Props) {
  const { profile, can } = useAuth()
  const supabase = createClient()
  const [records, setRecords] = useState<LicRecord[]>(initialRecords)
  const [filters, setFilters] = useState<Filters>({ ...DEFAULT_FILTERS, ...initialFilters })
  const [selected, setSelected] = useState<LicRecord | null>(null)
  const [creating, setCreating] = useState(false)
  const [notifying, setNotifying] = useState<LicRecord | null>(null)

  const owners = useMemo(() => [...new Set(records.map((r) => r.owner_name_snapshot).filter(Boolean))], [records])

  // Auto-open create modal when navigated here with ?new=1
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('new') === '1' && can('createRecords')) {
        setCreating(true)
        window.history.replaceState({}, '', '/table')
      }
    }
  }, [])
  const filtered = useMemo(() => applyFilters(records, filters), [records, filters])

  // Truly fire-and-forget — called without await so the form never waits on it
  function uploadPendingFiles(recordId: string, files: File[]) {
    void (async () => {
      for (const file of files) {
        try {
          const mimeType = file.type || 'application/octet-stream'
          const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
          const filePath = `${recordId}/${Date.now()}-${safeName}`
          const { error: upErr } = await supabase.storage
            .from('record-attachments')
            .upload(filePath, file, { contentType: mimeType, upsert: false })
          if (upErr) { console.error('Storage upload error:', upErr.message); continue }
          const { data: { publicUrl } } = supabase.storage
            .from('record-attachments')
            .getPublicUrl(filePath)
          const { error: dbErr } = await supabase.from('record_attachments').insert({
            record_id: recordId, file_name: file.name, file_path: filePath,
            file_type: mimeType, file_size: file.size,
            public_url: publicUrl, uploaded_by: profile?.id ?? null,
          })
          if (dbErr) console.error('record_attachments insert error:', dbErr.message)
        } catch (e) {
          console.error('Attachment upload failed:', e)
        }
      }
    })()
  }

  async function handleCreate(data: Partial<LicRecord>, pendingFiles?: File[]) {
    try {
      const { data: created, error } = await supabase
        .from('records')
        .insert({ ...data, created_by: profile?.id, updated_by: profile?.id })
        .select()
        .single()

      if (error || !created) {
        console.error('Record insert error:', error?.message)
        alert(`Failed to save record: ${error?.message ?? 'Unknown error'}`)
        return
      }

      void supabase.from('activity_logs').insert({
        record_id: created.id, user_id: profile?.id,
        user_name: profile?.full_name, action_type: 'record_created',
      })

      setRecords((prev) => [created, ...prev])

      // Fire-and-forget uploads before closing — form is already unblocked
      if (pendingFiles?.length) uploadPendingFiles(created.id, pendingFiles)

    } catch (e: any) {
      console.error('handleCreate exception:', e)
      alert(`Unexpected error: ${e?.message ?? e}`)
    } finally {
      // ALWAYS close the modal, even if something failed
      setCreating(false)
    }
  }

  function handleUpdate(r: LicRecord) {
    setRecords((prev) => prev.map((x) => x.id === r.id ? r : x))
    setSelected(r)
  }

  function handleDelete(id: string) {
    setRecords((prev) => prev.filter((x) => x.id !== id))
    setSelected(null)
  }

  function exportCSV() {
    const headers = ['ID', 'Internal Ref', 'Licensor Ref', 'Product Name', 'Type', 'Brand', 'Property', 'Stage', 'Owner', 'Priority', 'Waiting On', 'Next Action', 'Submission Date', 'Samples']
    const rows = filtered.map((r) => [r.id, r.internal_ref, r.main_licensor_ref, r.product_name, r.product_type, r.brand, r.property, r.normalized_stage, r.owner_name_snapshot, r.priority, r.waiting_on, r.next_action, r.submission_date ?? '', r.samples_requested_qty])
    const csv = [headers, ...rows].map((row) => row.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const a = document.createElement('a'); a.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`; a.download = 'licensing-export.csv'; a.click()
  }

  const thStyle: React.CSSProperties = { padding: '9px 12px', fontSize: 11, fontWeight: 700, color: '#9C998F', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'left', borderBottom: '2px solid #E5E2DA', whiteSpace: 'nowrap' }
  const tdStyle: React.CSSProperties = { padding: '9px 12px', borderBottom: '1px solid #F0EDE8', verticalAlign: 'middle', fontSize: 13 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <FilterBar
        filters={filters}
        onChange={setFilters}
        owners={owners}
        extraActions={
          can('exportCSV') ? (
            <button onClick={exportCSV} style={{ padding: '6px 12px', background: '#F4F3EF', border: '1px solid #E5E2DA', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>
              ↓ Export CSV
            </button>
          ) : undefined
        }
      />

      <div style={{ padding: '8px 20px', fontSize: 12, color: '#9C998F', borderBottom: '1px solid #F0EDE8' }}>
        {filtered.length} record{filtered.length !== 1 ? 's' : ''}
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
          <thead style={{ position: 'sticky', top: 0, background: '#FAFAF8', zIndex: 1 }}>
            <tr>
              <th style={{ ...thStyle, width: 52 }}>IMG</th>
              <th style={thStyle}>Ref</th>
              <th style={thStyle}>Licensor Ref</th>
              <th style={thStyle}>Product</th>
              <th style={thStyle}>Brand</th>
              <th style={thStyle}>Stage</th>
              <th style={thStyle}>Owner</th>
              <th style={thStyle}>Priority</th>
              <th style={thStyle}>Waiting On</th>
              <th style={thStyle}>Next Action</th>
              <th style={thStyle}>Samples</th>
              <th style={thStyle}>🔔 Reminder</th>
              {can('sendEmail') && <th style={thStyle}>Notify</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const sm = STAGE_META[r.normalized_stage]
              const stale = daysSince(r.updated_at)
              return (
                <tr key={r.id} onClick={() => setSelected(r)}
                  style={{ cursor: 'pointer', transition: 'background 0.1s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#F9F8F5')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '')}>
                  <td style={{ ...tdStyle, padding: '6px 8px' }} onClick={(e) => e.stopPropagation()}>
                    {thumbnails[r.id] ? (
                      <img
                        src={thumbnails[r.id]}
                        alt={r.product_name}
                        style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6, border: '1px solid #E5E2DA', display: 'block', cursor: 'pointer' }}
                        onClick={() => setSelected(r)}
                      />
                    ) : (
                      <div style={{ width: 40, height: 40, borderRadius: 6, background: '#F0EDE8', border: '1px solid #E5E2DA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#C8C3BB' }}>
                        🖼
                      </div>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 4, height: 28, background: BRAND_COLORS[r.brand] ?? '#ccc', borderRadius: 2, flexShrink: 0 }} />
                      <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#2D4A6F', fontWeight: 600 }}>{r.internal_ref}</span>
                    </div>
                  </td>
                  <td style={tdStyle}><span style={{ fontFamily: 'monospace', fontSize: 11, color: '#9C998F' }}>{r.main_licensor_ref || '—'}</span></td>
                  <td style={{ ...tdStyle, maxWidth: 200 }}>
                    <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.product_name}</div>
                    <div style={{ fontSize: 11, color: '#9C998F' }}>{r.product_type} · {r.gender}</div>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 500, fontSize: 12 }}>{r.brand}</div>
                    <div style={{ fontSize: 11, color: '#9C998F' }}>{r.property}</div>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ background: sm.bg, color: sm.color, border: `1px solid ${sm.border}`, borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {sm.icon} {r.normalized_stage}
                    </span>
                    {stale >= 7 && <span style={{ marginLeft: 4, background: '#FFF0F0', color: '#C0392B', borderRadius: 10, padding: '1px 5px', fontSize: 10 }}>{stale}d</span>}
                    {stale >= 3 && stale < 7 && <span style={{ marginLeft: 4, background: '#FFF8E1', color: '#8D6E00', borderRadius: 10, padding: '1px 5px', fontSize: 10 }}>{stale}d</span>}
                  </td>
                  <td style={tdStyle}>{r.owner_name_snapshot ? <Avatar name={r.owner_name_snapshot} showName size={22} /> : <span style={{ color: '#9C998F' }}>—</span>}</td>
                  <td style={tdStyle} onClick={(e) => { if (can('editPriority') || can('editRecords')) e.stopPropagation() }}>
                    {(can('editPriority') || can('editRecords')) ? (
                      <select value={r.priority}
                        onChange={async (e) => {
                          e.stopPropagation()
                          const { data: upd } = await supabase.from('records').update({ priority: e.target.value, updated_by: profile?.id }).eq('id', r.id).select().single()
                          if (upd) setRecords((prev) => prev.map((x) => x.id === r.id ? upd : x))
                        }}
                        style={{
                          padding: '3px 10px',
                          border: 'none',
                          borderRadius: 20,
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                          outline: 'none',
                          background: PRIORITY_COLORS[r.priority] ?? '#ccc',
                          color: '#fff',
                          appearance: 'none' as const,
                          WebkitAppearance: 'none' as const,
                        }}>
                        {['Low', 'Medium', 'High', 'Urgent'].map((p) => <option key={p} style={{ background: '#fff', color: '#1C2226' }}>{p}</option>)}
                      </select>
                    ) : <PriorityDot priority={r.priority} showLabel />}
                  </td>
                  <td style={tdStyle}><span style={{ fontSize: 12, color: r.waiting_on !== 'None' ? '#B87A2B' : '#9C998F' }}>{r.waiting_on}</span></td>
                  <td style={{ ...tdStyle, maxWidth: 160 }}><span style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{r.next_action || '—'}</span></td>
                  <td style={tdStyle}>{r.samples_requested_qty > 0 ? <span style={{ background: '#F0EDE8', borderRadius: 10, padding: '2px 7px', fontSize: 12 }}>{r.samples_requested_qty}</span> : '—'}</td>
                  <td style={tdStyle} onClick={(e) => e.stopPropagation()}>
                    {r.reminder_date && !r.reminder_done ? (() => {
                      const today = new Date().toISOString().split('T')[0]
                      const isOverdue = r.reminder_date < today
                      const isToday   = r.reminder_date === today
                      const color  = isOverdue ? '#C0392B' : isToday ? '#B87A2B' : '#2B6CB0'
                      const bg     = isOverdue ? '#FFF0F0' : isToday ? '#FFFBF0' : '#EBF7FF'
                      const border = isOverdue ? '#FFB8B8' : isToday ? '#FFE082' : '#A8D8FF'
                      const label  = isOverdue ? 'Overdue' : isToday ? 'Today' : new Date(r.reminder_date + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{ background: bg, color, border: `1px solid ${border}`, borderRadius: 6, padding: '2px 7px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
                            🔔 {label}
                          </span>
                          {r.reminder_note && <span style={{ fontSize: 10, color: '#9C998F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>{r.reminder_note}</span>}
                        </div>
                      )
                    })() : <span style={{ color: '#D0CDC5', fontSize: 12 }}>—</span>}
                  </td>
                  {can('sendEmail') && (
                    <td style={tdStyle} onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => setNotifying(r)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15 }}>✉</button>
                    </td>
                  )}
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={13} style={{ padding: 40, textAlign: 'center', color: '#9C998F' }}>No records match your filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {creating && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 14, width: 600, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,0.15)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E2DA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>New Record</span>
              <button onClick={() => setCreating(false)} style={{ background: 'none', border: 'none', fontSize: 20, color: '#9C998F', cursor: 'pointer' }}>×</button>
            </div>
            <RecordForm team={team} onSave={handleCreate} onCancel={() => setCreating(false)} />
          </div>
        </div>
      )}

      {selected && <RecordDrawer record={selected} team={team} onClose={() => setSelected(null)} onUpdate={handleUpdate} onDelete={handleDelete} />}
      {notifying && <NotifyModal record={notifying} team={team} senderName={profile?.full_name ?? ''} senderEmail={profile?.email ?? ''} onClose={() => setNotifying(null)} />}
    </div>
  )
}
