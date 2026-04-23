'use client'
import { useState, useMemo } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth-context'
import type { LicRecord, Profile, Filters, Stage } from '@/lib/types'
import { BOARD_STAGES, STAGE_META, BRAND_COLORS, PRIORITY_COLORS } from '@/lib/constants'
import { daysSince } from '@/lib/utils'
import FilterBar from '@/components/records/FilterBar'
import RecordDrawer from '@/components/records/RecordDrawer'
import Avatar from '@/components/ui/Avatar'
import NotifyModal from '@/components/notifications/NotifyModal'

interface Props { initialRecords: LicRecord[]; team: Profile[] }

const DEFAULT_FILTERS: Filters = { search: '', brand: '', property: '', stage: '', owner: '', priority: '', waitingOn: '', showArchived: false }

function applyFilters(records: LicRecord[], f: Filters) {
  return records.filter((r) => {
    if (r.is_archived) return false
    if (r.normalized_stage === 'Fully Approved') return false
    if (f.search) { const q = f.search.toLowerCase(); if (![r.internal_ref, r.product_name, r.brand, r.property, r.owner_name_snapshot].some((v) => v?.toLowerCase().includes(q))) return false }
    if (f.brand && r.brand !== f.brand) return false
    if (f.property && r.property !== f.property) return false
    if (f.owner && r.owner_name_snapshot !== f.owner) return false
    if (f.priority && r.priority !== f.priority) return false
    if (f.waitingOn && r.waiting_on !== f.waitingOn) return false
    return true
  })
}

export default function BoardView({ initialRecords, team }: Props) {
  const { profile, can } = useAuth()
  const supabase = createClient()
  const [records, setRecords] = useState<LicRecord[]>(initialRecords)
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [selected, setSelected] = useState<LicRecord | null>(null)
  const [notifying, setNotifying] = useState<LicRecord | null>(null)

  const owners = useMemo(() => [...new Set(records.map((r) => r.owner_name_snapshot).filter(Boolean))], [records])
  const filtered = useMemo(() => applyFilters(records, filters), [records, filters])

  const byStage = useMemo(() => {
    const map: Record<string, LicRecord[]> = {}
    BOARD_STAGES.forEach((s) => { map[s] = [] })
    filtered.forEach((r) => { if (map[r.normalized_stage]) map[r.normalized_stage].push(r) })
    return map
  }, [filtered])

  async function onDragEnd(result: DropResult) {
    if (!can('dragStage')) return
    const { destination, source, draggableId } = result
    if (!destination || destination.droppableId === source.droppableId) return
    const newStage = destination.droppableId as Stage
    setRecords((prev) => prev.map((r) => r.id === draggableId ? { ...r, normalized_stage: newStage } : r))
    await supabase.from('records').update({ normalized_stage: newStage, updated_by: profile?.id }).eq('id', draggableId)
  }

  function handleUpdate(r: LicRecord) {
    setRecords((prev) => prev.map((x) => x.id === r.id ? r : x))
    setSelected(r)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <FilterBar filters={filters} onChange={setFilters} owners={owners} hideStage />

      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        <DragDropContext onDragEnd={onDragEnd}>
          <div style={{ display: 'flex', gap: 12, minWidth: 'max-content', alignItems: 'flex-start' }}>
            {BOARD_STAGES.map((stage) => {
              const sm = STAGE_META[stage]
              const cols = byStage[stage] ?? []
              return (
                <div key={stage} style={{ width: 240, flexShrink: 0 }}>
                  <div style={{ background: sm.bg, border: `1px solid ${sm.border}`, borderRadius: '10px 10px 0 0', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: sm.color }}>{sm.icon} {stage}</span>
                    <span style={{ background: sm.color, color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>{cols.length}</span>
                  </div>
                  <Droppable droppableId={stage}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        style={{
                          minHeight: 80, background: snapshot.isDraggingOver ? '#F0EDE8' : '#F4F3EF',
                          border: `1px solid ${sm.border}`, borderTop: 'none', borderRadius: '0 0 10px 10px',
                          padding: 8, display: 'flex', flexDirection: 'column', gap: 8, transition: 'background 0.15s',
                        }}
                      >
                        {cols.map((r, index) => (
                          <Draggable key={r.id} draggableId={r.id} index={index} isDragDisabled={!can('dragStage')}>
                            {(prov, snap) => (
                              <div
                                ref={prov.innerRef}
                                {...prov.draggableProps}
                                {...prov.dragHandleProps}
                                onClick={() => setSelected(r)}
                                style={{
                                  background: '#fff', border: '1px solid #E5E2DA', borderRadius: 8,
                                  overflow: 'hidden', cursor: can('dragStage') ? 'grab' : 'pointer',
                                  boxShadow: snap.isDragging ? '0 6px 20px rgba(0,0,0,0.12)' : '0 1px 3px rgba(0,0,0,0.06)',
                                  ...prov.draggableProps.style,
                                }}
                              >
                                <div style={{ height: 4, background: BRAND_COLORS[r.brand] ?? '#ccc' }} />
                                <div style={{ padding: '8px 10px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                                    <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#2D4A6F', fontWeight: 600 }}>{r.internal_ref}</span>
                                    <div style={{ display: 'flex', gap: 4 }}>
                                      {daysSince(r.updated_at) >= 7 && <span style={{ background: '#FFF0F0', color: '#C0392B', borderRadius: 8, padding: '1px 5px', fontSize: 9 }}>{daysSince(r.updated_at)}d</span>}
                                      {daysSince(r.updated_at) >= 3 && daysSince(r.updated_at) < 7 && <span style={{ background: '#FFF8E1', color: '#8D6E00', borderRadius: 8, padding: '1px 5px', fontSize: 9 }}>{daysSince(r.updated_at)}d</span>}
                                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: PRIORITY_COLORS[r.priority] ?? '#ccc', marginTop: 3 }} />
                                    </div>
                                  </div>

                                  <div style={{ fontSize: 12, fontWeight: 600, color: '#1A1A2E', lineHeight: 1.3, marginBottom: 4 }}>{r.product_name}</div>

                                  {r.main_licensor_ref && (
                                    <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#7B3FC4', marginBottom: 4 }}>{r.main_licensor_ref}</div>
                                  )}

                                  <div style={{ display: 'flex', gap: 4, marginBottom: 6, flexWrap: 'wrap' }}>
                                    <span style={{ background: '#EEF0FF', color: '#4B52B8', borderRadius: 4, padding: '1px 5px', fontSize: 10 }}>{r.brand}</span>
                                    {r.property && <span style={{ background: '#F5EEFF', color: '#7B3FC4', borderRadius: 4, padding: '1px 5px', fontSize: 10 }}>{r.property}</span>}
                                  </div>

                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    {r.owner_name_snapshot ? <Avatar name={r.owner_name_snapshot} size={20} /> : <span />}
                                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                      {r.samples_requested_qty > 0 && <span style={{ fontSize: 9, background: '#F0EDE8', borderRadius: 8, padding: '1px 5px' }}>{r.samples_requested_qty} samp</span>}
                                      {r.tech_pack_link && <span style={{ fontSize: 10 }}>📎</span>}
                                      {can('sendEmail') && (
                                        <button onClick={(e) => { e.stopPropagation(); setNotifying(r) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, padding: 0 }}>✉</button>
                                      )}
                                    </div>
                                  </div>

                                  {r.waiting_on !== 'None' && (
                                    <div style={{ marginTop: 5, fontSize: 10, color: '#B87A2B', background: '#FFF5EB', borderRadius: 4, padding: '2px 5px' }}>⏳ {r.waiting_on}</div>
                                  )}
                                  {r.next_action && (
                                    <div style={{ marginTop: 3, fontSize: 10, color: '#5A5A6A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>→ {r.next_action.slice(0, 40)}</div>
                                  )}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {cols.length === 0 && !snapshot.isDraggingOver && (
                          <div style={{ fontSize: 11, color: '#B8B5AD', textAlign: 'center', padding: '12px 0' }}>Empty</div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              )
            })}
          </div>
        </DragDropContext>
      </div>

      {selected && <RecordDrawer record={selected} team={team} onClose={() => setSelected(null)} onUpdate={handleUpdate} />}
      {notifying && <NotifyModal record={notifying} team={team} senderName={profile?.full_name ?? ''} senderEmail={profile?.email ?? ''} onClose={() => setNotifying(null)} />}
    </div>
  )
}
