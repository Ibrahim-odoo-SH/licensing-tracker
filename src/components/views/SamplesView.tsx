'use client'
import { useState } from 'react'
import type { LicRecord, Profile } from '@/lib/types'
import { STAGE_META, BRAND_COLORS } from '@/lib/constants'
import RecordDrawer from '@/components/records/RecordDrawer'
import Avatar from '@/components/ui/Avatar'

interface Props { initialRecords: LicRecord[]; team: Profile[] }

export default function SamplesView({ initialRecords, team }: Props) {
  const [records, setRecords] = useState(initialRecords)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<LicRecord | null>(null)

  const filtered = records
    .filter((r) => !r.is_archived && r.samples_requested_qty > 0)
    .filter((r) => !search || [r.product_name, r.internal_ref, r.brand, r.property].some((v) => v?.toLowerCase().includes(search.toLowerCase())))

  function handleUpdate(r: LicRecord) {
    setRecords((prev) => prev.map((x) => x.id === r.id ? r : x))
    setSelected(r)
  }

  const thStyle: React.CSSProperties = { padding: '9px 12px', fontSize: 11, fontWeight: 700, color: '#9C998F', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'left', borderBottom: '2px solid #E5E2DA' }
  const tdStyle: React.CSSProperties = { padding: '10px 12px', borderBottom: '1px solid #F0EDE8', verticalAlign: 'middle', fontSize: 13 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '10px 20px', background: '#FAFAF8', borderBottom: '1px solid #E5E2DA', display: 'flex', alignItems: 'center', gap: 12 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1A1A2E' }}>🧪 Sample Requests</h2>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search…"
          style={{ padding: '5px 10px', border: '1px solid #E5E2DA', borderRadius: 6, fontSize: 13, outline: 'none', width: 200 }}
        />
        <span style={{ fontSize: 12, color: '#9C998F' }}>{filtered.length} records with samples</span>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
          <thead style={{ position: 'sticky', top: 0, background: '#FAFAF8', zIndex: 1 }}>
            <tr>
              <th style={thStyle}>Product</th>
              <th style={thStyle}>Ref</th>
              <th style={thStyle}>Brand / Property</th>
              <th style={thStyle}>Stage</th>
              <th style={thStyle}>Owner</th>
              <th style={thStyle}>Next Action</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Sample Qty</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const sm = STAGE_META[r.normalized_stage]
              return (
                <tr key={r.id} onClick={() => setSelected(r)} style={{ cursor: 'pointer' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#F9F8F5')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '')}>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 4, height: 28, background: BRAND_COLORS[r.brand] ?? '#ccc', borderRadius: 2 }} />
                      <div>
                        <div style={{ fontWeight: 500 }}>{r.product_name}</div>
                        <div style={{ fontSize: 11, color: '#9C998F' }}>{r.product_type}</div>
                      </div>
                    </div>
                  </td>
                  <td style={tdStyle}><span style={{ fontFamily: 'monospace', fontSize: 12, color: '#2D4A6F', fontWeight: 600 }}>{r.internal_ref}</span></td>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 500, fontSize: 12 }}>{r.brand}</div>
                    <div style={{ fontSize: 11, color: '#9C998F' }}>{r.property}</div>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ background: sm.bg, color: sm.color, border: `1px solid ${sm.border}`, borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
                      {sm.icon} {r.normalized_stage}
                    </span>
                  </td>
                  <td style={tdStyle}>{r.owner_name_snapshot ? <Avatar name={r.owner_name_snapshot} showName size={22} /> : '—'}</td>
                  <td style={{ ...tdStyle, maxWidth: 180 }}><span style={{ fontSize: 12, color: '#5A5A6A' }}>{r.next_action || '—'}</span></td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <span style={{ background: '#EEF0FF', color: '#4B52B8', borderRadius: 20, padding: '3px 12px', fontSize: 13, fontWeight: 700 }}>
                      {r.samples_requested_qty} pcs
                    </span>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#9C998F' }}>No records with samples.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && <RecordDrawer record={selected} team={team} onClose={() => setSelected(null)} onUpdate={handleUpdate} />}
    </div>
  )
}
