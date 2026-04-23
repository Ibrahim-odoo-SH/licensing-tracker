'use client'
import { useState, useMemo } from 'react'
import type { LicRecord, Profile, Filters } from '@/lib/types'
import { useAuth } from '@/lib/auth-context'
import { BRAND_COLORS } from '@/lib/constants'
import { fmtDate } from '@/lib/utils'
import FilterBar from '@/components/records/FilterBar'
import RecordDrawer from '@/components/records/RecordDrawer'
import Avatar from '@/components/ui/Avatar'

interface Props { initialRecords: LicRecord[]; team: Profile[] }

const DEFAULT_FILTERS: Filters = { search: '', brand: '', property: '', stage: '', owner: '', priority: '', waitingOn: '', showArchived: false }

export default function ApprovedView({ initialRecords, team }: Props) {
  const { profile, can } = useAuth()
  const [records, setRecords] = useState(initialRecords)
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [selected, setSelected] = useState<LicRecord | null>(null)

  const owners = useMemo(() => [...new Set(records.map((r) => r.owner_name_snapshot).filter(Boolean))], [records])

  const filtered = useMemo(() => records.filter((r) => {
    if (r.is_archived) return false
    if (filters.search) {
      const q = filters.search.toLowerCase()
      if (![r.internal_ref, r.main_licensor_ref, r.product_name, r.brand, r.property, r.owner_name_snapshot].some((v) => v?.toLowerCase().includes(q))) return false
    }
    if (filters.brand && r.brand !== filters.brand) return false
    if (filters.property && r.property !== filters.property) return false
    if (filters.owner && r.owner_name_snapshot !== filters.owner) return false
    if (filters.priority && r.priority !== filters.priority) return false
    return true
  }), [records, filters])

  function exportCSV() {
    const headers = ['Internal Ref', 'Licensor Ref', 'Product Name', 'Type', 'Brand', 'Property', 'Owner', 'Approval Date']
    const rows = filtered.map((r) => [r.internal_ref, r.main_licensor_ref, r.product_name, r.product_type, r.brand, r.property, r.owner_name_snapshot, r.sample_approval_date ?? ''])
    const csv = [headers, ...rows].map((row) => row.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const a = document.createElement('a'); a.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`; a.download = 'approved-designs.csv'; a.click()
  }

  function handleUpdate(r: LicRecord) {
    setRecords((prev) => prev.map((x) => x.id === r.id ? r : x))
    setSelected(r)
  }

  const thStyle: React.CSSProperties = { padding: '9px 12px', fontSize: 11, fontWeight: 700, color: '#9C998F', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'left', borderBottom: '2px solid #E5E2DA' }
  const tdStyle: React.CSSProperties = { padding: '10px 12px', borderBottom: '1px solid #F0EDE8', verticalAlign: 'middle', fontSize: 13 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Green header */}
      <div style={{ background: '#1A7A3A', color: '#fff', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>🏆 Approved Designs</h2>
          <p style={{ fontSize: 13, opacity: 0.8, margin: '2px 0 0' }}>{filtered.length} fully approved · ready for launch</p>
        </div>
        {can('exportCSV') && (
          <button onClick={exportCSV} style={{ padding: '7px 14px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', borderRadius: 7, cursor: 'pointer', fontWeight: 500, fontSize: 13 }}>
            ↓ Export CSV
          </button>
        )}
      </div>

      <FilterBar filters={filters} onChange={setFilters} owners={owners} hideStage />

      <div style={{ flex: 1, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
          <thead style={{ position: 'sticky', top: 0, background: '#FAFAF8', zIndex: 1 }}>
            <tr>
              <th style={thStyle}>Ref</th>
              <th style={thStyle}>Licensor Ref</th>
              <th style={thStyle}>Product</th>
              <th style={thStyle}>Brand / Property</th>
              <th style={thStyle}>Owner</th>
              <th style={thStyle}>Samples</th>
              <th style={thStyle}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} onClick={() => setSelected(r)}
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#F9F8F5')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '')}>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 4, height: 28, background: BRAND_COLORS[r.brand] ?? '#ccc', borderRadius: 2 }} />
                    <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#2D4A6F', fontWeight: 600 }}>{r.internal_ref}</span>
                  </div>
                </td>
                <td style={tdStyle}><span style={{ fontFamily: 'monospace', fontSize: 11, color: '#9C998F' }}>{r.main_licensor_ref || '—'}</span></td>
                <td style={{ ...tdStyle, maxWidth: 200 }}>
                  <div style={{ fontWeight: 500 }}>{r.product_name}</div>
                  <div style={{ fontSize: 11, color: '#9C998F' }}>{r.product_type} · {r.gender}</div>
                </td>
                <td style={tdStyle}>
                  <div style={{ fontWeight: 500, fontSize: 12 }}>{r.brand}</div>
                  <div style={{ fontSize: 11, color: '#9C998F' }}>{r.property}</div>
                </td>
                <td style={tdStyle}>{r.owner_name_snapshot ? <Avatar name={r.owner_name_snapshot} showName size={22} /> : '—'}</td>
                <td style={tdStyle}>{r.samples_requested_qty > 0 ? <span style={{ background: '#EEFBF0', color: '#1A7A3A', borderRadius: 10, padding: '2px 8px', fontSize: 12, fontWeight: 600 }}>{r.samples_requested_qty} pcs</span> : '—'}</td>
                <td style={{ ...tdStyle, maxWidth: 180 }}><span style={{ fontSize: 12, color: '#5A5A6A', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', whiteSpace: 'nowrap' }}>{r.notes_summary || '—'}</span></td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#9C998F' }}>No approved designs yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && <RecordDrawer record={selected} team={team} onClose={() => setSelected(null)} onUpdate={handleUpdate} />}
    </div>
  )
}
