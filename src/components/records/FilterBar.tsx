'use client'
import { BRANDS, PROPS, STAGES, PRIORITIES, WAITING_OPTS } from '@/lib/constants'
import type { Filters } from '@/lib/types'

interface FilterBarProps {
  filters: Filters
  onChange: (f: Filters) => void
  owners: string[]
  hideStage?: boolean
  extraActions?: React.ReactNode
}

const sel: React.CSSProperties = {
  padding: '5px 8px', border: '1px solid #E5E2DA', borderRadius: 6,
  background: '#fff', fontSize: 13, color: '#3A3A4A', cursor: 'pointer', outline: 'none',
}
const inp: React.CSSProperties = {
  padding: '5px 10px', border: '1px solid #E5E2DA', borderRadius: 6,
  background: '#fff', fontSize: 13, outline: 'none', width: 200,
}

export default function FilterBar({ filters, onChange, owners, hideStage, extraActions }: FilterBarProps) {
  const set = (key: keyof Filters, val: any) => onChange({ ...filters, [key]: val })

  const hasActive = filters.search || filters.brand || filters.property || filters.stage ||
    filters.owner || filters.priority || filters.waitingOn || filters.showArchived || filters.showReminders

  const props = filters.brand ? PROPS[filters.brand] ?? [] : []

  function clearAll() {
    onChange({ search: '', brand: '', property: '', stage: '', owner: '', priority: '', waitingOn: '', showArchived: false, showReminders: false })
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '10px 20px', background: '#FAFAF8', borderBottom: '1px solid #E5E2DA' }}>
      <input
        style={inp} placeholder="Search records…"
        value={filters.search}
        onChange={(e) => set('search', e.target.value)}
      />

      <select style={sel} value={filters.brand} onChange={(e) => { set('brand', e.target.value); set('property', '') }}>
        <option value="">All Brands</option>
        {BRANDS.map((b) => <option key={b}>{b}</option>)}
      </select>

      {filters.brand && (
        <select style={sel} value={filters.property} onChange={(e) => set('property', e.target.value)}>
          <option value="">All Properties</option>
          {props.map((p) => <option key={p}>{p}</option>)}
        </select>
      )}

      {!hideStage && (
        <select style={sel} value={filters.stage} onChange={(e) => set('stage', e.target.value)}>
          <option value="">All Stages</option>
          {STAGES.map((s) => <option key={s}>{s}</option>)}
        </select>
      )}

      <select style={sel} value={filters.owner} onChange={(e) => set('owner', e.target.value)}>
        <option value="">All Owners</option>
        {owners.map((o) => <option key={o}>{o}</option>)}
      </select>

      <select style={sel} value={filters.priority} onChange={(e) => set('priority', e.target.value)}>
        <option value="">All Priorities</option>
        {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
      </select>

      <select style={sel} value={filters.waitingOn} onChange={(e) => set('waitingOn', e.target.value)}>
        <option value="">All Waiting On</option>
        {WAITING_OPTS.map((w) => <option key={w}>{w}</option>)}
      </select>

      <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#5A5A6A', cursor: 'pointer' }}>
        <input type="checkbox" checked={filters.showArchived} onChange={(e) => set('showArchived', e.target.checked)} />
        Archived
      </label>

      {/* Reminders toggle */}
      <button
        onClick={() => set('showReminders', !filters.showReminders)}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '5px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
          cursor: 'pointer', border: '1px solid',
          background: filters.showReminders ? '#FFF8E1' : '#fff',
          color: filters.showReminders ? '#8D6E00' : '#9C998F',
          borderColor: filters.showReminders ? '#FFE082' : '#E5E2DA',
          transition: 'all 0.15s',
        }}
      >
        🔔 Reminders {filters.showReminders ? '✕' : ''}
      </button>

      {hasActive && (
        <button
          onClick={clearAll}
          style={{ fontSize: 12, color: '#E06B3A', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
        >
          Clear all
        </button>
      )}

      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
        {extraActions}
      </div>
    </div>
  )
}
