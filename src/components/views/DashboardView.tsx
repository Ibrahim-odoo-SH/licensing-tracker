'use client'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { LicRecord, ActivityLog } from '@/lib/types'
import { daysSince, fmtDate } from '@/lib/utils'
import { STAGE_META, PRIORITY_COLORS, BRAND_COLORS } from '@/lib/constants'

interface Props {
  records: LicRecord[]
  logs: ActivityLog[]
}

const ACT_ICONS: Record<string, string> = {
  record_created: '🆕', updated: '✏️', stage_changed: '➡️',
  priority_changed: '🎯', comment: '💬', archive_toggled: '📁',
}

const PIPELINE_STAGES = [
  'Design Sent', 'Modifications Requested', 'Concept Approved',
  'PreProduction Samples PPS', 'PPS Shipped', 'Proceed to Production',
  'Production Samples', 'Production Samples Shipped', 'Fully Approved',
]

function ReminderCard({ record, accent, bg, border, onDone, onNavigate }: {
  record: LicRecord
  accent: string
  bg: string
  border: string
  onDone: (id: string) => void
  onNavigate: () => void
}) {
  const sm = STAGE_META[record.normalized_stage]
  return (
    <div style={{
      background: bg, border: `1px solid ${border}`, borderRadius: 10,
      padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            onClick={onNavigate}
          >
            {record.product_name}
          </div>
          <div style={{ fontSize: 11, color: '#9C998F', marginTop: 2 }}>
            {record.internal_ref}{record.brand ? ` · ${record.brand}` : ''}
            {record.owner_name_snapshot ? ` · ${record.owner_name_snapshot}` : ''}
          </div>
        </div>
        <span style={{
          background: sm?.bg, color: sm?.color, border: `1px solid ${sm?.border}`,
          borderRadius: 20, padding: '2px 7px', fontSize: 10, fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap',
        }}>
          {sm?.icon} {record.normalized_stage}
        </span>
      </div>

      {record.reminder_note && (
        <div style={{ fontSize: 12, color: accent, fontWeight: 500 }}>
          💬 {record.reminder_note}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
        <span style={{ fontSize: 11, color: accent, fontWeight: 600 }}>
          📅 {new Date(record.reminder_date! + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
        <button
          onClick={() => onDone(record.id)}
          style={{
            fontSize: 11, fontWeight: 600, color: '#2B8B57',
            background: '#EEFBF4', border: '1px solid #A8E6C3',
            borderRadius: 6, padding: '3px 10px', cursor: 'pointer',
          }}
        >
          ✓ Mark Done
        </button>
      </div>
    </div>
  )
}

function card(bg: string, border: string, children: React.ReactNode, style?: React.CSSProperties) {
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: 18, ...style }}>
      {children}
    </div>
  )
}

function sectionTitle(title: string) {
  return <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1A1A2E', margin: '0 0 14px' }}>{title}</h3>
}

export default function DashboardView({ records: initialRecords, logs }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [records, setRecords] = useState<LicRecord[]>(initialRecords)

  const active   = records.filter((r) => !r.is_archived)
  const archived = records.filter((r) => r.is_archived)

  /* ── Reminders ── */
  const todayStr = new Date().toISOString().split('T')[0]
  const in7Str = (() => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().split('T')[0] })()

  const allReminders = useMemo(() =>
    active.filter((r) => r.reminder_date && !r.reminder_done)
      .sort((a, b) => (a.reminder_date! > b.reminder_date! ? 1 : -1))
  , [active])

  const remindersOverdue  = allReminders.filter((r) => r.reminder_date! < todayStr)
  const remindersToday    = allReminders.filter((r) => r.reminder_date === todayStr)
  const remindersUpcoming = allReminders.filter((r) => r.reminder_date! > todayStr && r.reminder_date! <= in7Str)

  async function markDone(id: string) {
    await supabase.from('records').update({ reminder_done: true }).eq('id', id)
    setRecords((prev) => prev.map((r) => r.id === id ? { ...r, reminder_done: true } : r))
  }

  /* ── KPI stats ── */
  const stats = useMemo(() => ({
    total:      active.length,
    urgentHigh: active.filter((r) => r.priority === 'Urgent' || r.priority === 'High').length,
    urgent:     active.filter((r) => r.priority === 'Urgent').length,
    stale7:     active.filter((r) => daysSince(r.updated_at) >= 7).length,
    approved:   active.filter((r) => r.normalized_stage === 'Fully Approved').length,
    withSamples:active.filter((r) => r.samples_requested_qty > 0).length,
  }), [active])

  /* ── Stage pipeline ── */
  const stageBreakdown = PIPELINE_STAGES.map((s) => ({
    stage: s,
    count: active.filter((r) => r.normalized_stage === s).length,
  }))

  /* ── By Brand ── */
  const byBrand = useMemo(() => {
    const map: Record<string, number> = {}
    active.forEach((r) => { if (r.brand) map[r.brand] = (map[r.brand] || 0) + 1 })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [active])
  const brandMax = Math.max(...byBrand.map(([, c]) => c), 1)

  /* ── By Owner ── */
  const byOwner = useMemo(() => {
    const map: Record<string, number> = {}
    active.forEach((r) => {
      const o = r.owner_name_snapshot?.trim() || 'Unassigned'
      map[o] = (map[o] || 0) + 1
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [active])
  const ownerMax = Math.max(...byOwner.map(([, c]) => c), 1)

  /* ── By Priority ── */
  const byPriority = useMemo(() =>
    (['Urgent', 'High', 'Medium', 'Low'] as const).map((p) => ({
      priority: p,
      count: active.filter((r) => r.priority === p).length,
    }))
  , [active])

  /* ── Waiting On ── */
  const byWaiting = useMemo(() => {
    const map: Record<string, number> = {}
    active.forEach((r) => {
      if (r.waiting_on && r.waiting_on !== 'None') map[r.waiting_on] = (map[r.waiting_on] || 0) + 1
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [active])

  /* ── Needs Attention (urgent + stale 7d+) ── */
  const needsAttention = useMemo(() =>
    active
      .filter((r) => r.priority === 'Urgent' || daysSince(r.updated_at) >= 7)
      .sort((a, b) => {
        if (a.priority === 'Urgent' && b.priority !== 'Urgent') return -1
        if (b.priority === 'Urgent' && a.priority !== 'Urgent') return 1
        return daysSince(b.updated_at) - daysSince(a.updated_at)
      })
      .slice(0, 6)
  , [active])

  const kpiCards = [
    {
      label: 'Active Records', value: stats.total,
      sub: `${archived.length} archived`,
      color: '#2D4A6F', bg: '#F0F4FA', nav: '/table',
    },
    {
      label: 'Urgent / High Priority', value: stats.urgentHigh,
      sub: stats.urgent > 0 ? `${stats.urgent} urgent` : 'No urgent items',
      color: '#D43C3C', bg: '#FFF0F0', nav: '/table',
    },
    {
      label: 'Reminders Due', value: remindersOverdue.length + remindersToday.length,
      sub: remindersUpcoming.length > 0 ? `${remindersUpcoming.length} upcoming this week` : 'No upcoming reminders',
      color: '#8D6E00', bg: '#FFF8E1', nav: '/dashboard',
    },
    {
      label: 'Fully Approved', value: stats.approved,
      sub: `${stats.withSamples} with samples`,
      color: '#1A7A3A', bg: '#EEFBF0', nav: '/approved',
    },
  ]

  return (
    <div style={{ padding: 24, maxWidth: 1360, margin: '0 auto' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1A1A2E', margin: 0 }}>Dashboard</h1>
          <p style={{ fontSize: 13, color: '#9C998F', marginTop: 4 }}>
            {active.length} active · {archived.length} archived · {stats.withSamples} with samples
          </p>
        </div>
        <span style={{ fontSize: 12, color: '#B8B5AD' }}>
          {new Date().toLocaleString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* ── KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        {kpiCards.map((c) => (
          <button
            key={c.label}
            onClick={() => router.push(c.nav)}
            style={{
              background: '#fff', border: '1px solid #E5E2DA', borderRadius: 12,
              padding: '18px 20px', textAlign: 'left', cursor: 'pointer',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)', transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = '' }}
          >
            <div style={{ fontSize: 36, fontWeight: 800, color: c.color, lineHeight: 1 }}>{c.value}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E', marginTop: 7 }}>{c.label}</div>
            <div style={{ fontSize: 11, color: '#9C998F', marginTop: 3 }}>{c.sub}</div>
          </button>
        ))}
      </div>

      {/* ── Pipeline ── */}
      <div style={{ background: '#fff', border: '1px solid #E5E2DA', borderRadius: 12, padding: 20, marginBottom: 20 }}>
        {sectionTitle('Pipeline by Stage')}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${PIPELINE_STAGES.length}, 1fr)`, gap: 6 }}>
          {stageBreakdown.map(({ stage, count }) => {
            const meta = STAGE_META[stage as keyof typeof STAGE_META]
            const shortLabel = stage
              .replace('PreProduction Samples ', '')
              .replace(' Samples Shipped', ' Shipped')
              .replace('Modifications Requested', 'Modifications')
              .replace('Concept Approved', 'Concept OK')
              .replace('Proceed to Production', 'To Production')
            return (
              <button
                key={stage}
                onClick={() => router.push(`/table?stage=${encodeURIComponent(stage)}`)}
                style={{
                  background: count > 0 ? meta?.bg : '#FAFAF8',
                  border: `1px solid ${count > 0 ? meta?.border : '#EBEBEB'}`,
                  borderRadius: 10, padding: '12px 6px', textAlign: 'center',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)' }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
              >
                <div style={{ fontSize: 18, marginBottom: 4 }}>{meta?.icon}</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: count > 0 ? meta?.color : '#D0CCC5' }}>{count}</div>
                <div style={{ fontSize: 10, color: '#9C998F', marginTop: 5, lineHeight: 1.3 }}>{shortLabel}</div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Analytics row: Brand + Owner + Priority & Waiting ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>

        {/* By Brand */}
        {card('#fff', '#E5E2DA', (
          <>
            {sectionTitle('Records by Brand')}
            {byBrand.length === 0
              ? <p style={{ color: '#9C998F', fontSize: 13 }}>No records yet.</p>
              : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {byBrand.map(([brand, count]) => (
                    <button
                      key={brand}
                      onClick={() => router.push(`/table?brand=${encodeURIComponent(brand)}`)}
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', width: '100%' }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.75')}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 12, color: '#1A1A2E', fontWeight: 500 }}>{brand}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: BRAND_COLORS[brand] || '#2D4A6F' }}>{count}</span>
                      </div>
                      <div style={{ height: 5, background: '#F0EDE8', borderRadius: 3 }}>
                        <div style={{ height: '100%', width: `${(count / brandMax) * 100}%`, background: BRAND_COLORS[brand] || '#2D4A6F', borderRadius: 3, transition: 'width 0.4s' }} />
                      </div>
                    </button>
                  ))}
                </div>
              )}
          </>
        ))}

        {/* By Owner */}
        {card('#fff', '#E5E2DA', (
          <>
            {sectionTitle('Workload by Owner')}
            {byOwner.length === 0
              ? <p style={{ color: '#9C998F', fontSize: 13 }}>No records assigned.</p>
              : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {byOwner.slice(0, 7).map(([owner, count]) => (
                    <button
                      key={owner}
                      onClick={() => router.push(`/table?owner=${encodeURIComponent(owner)}`)}
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', width: '100%' }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.75')}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 12, color: '#1A1A2E', fontWeight: 500 }}>{owner}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#2D4A6F' }}>{count}</span>
                      </div>
                      <div style={{ height: 5, background: '#F0EDE8', borderRadius: 3 }}>
                        <div style={{ height: '100%', width: `${(count / ownerMax) * 100}%`, background: '#2D4A6F', borderRadius: 3, transition: 'width 0.4s' }} />
                      </div>
                    </button>
                  ))}
                </div>
              )}
          </>
        ))}

        {/* Priority + Waiting On stacked */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {card('#fff', '#E5E2DA', (
            <>
              {sectionTitle('By Priority')}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {byPriority.map(({ priority, count }) => (
                  <button
                    key={priority}
                    onClick={() => count > 0 && router.push(`/table?priority=${encodeURIComponent(priority)}`)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: '#F4F3EF', borderRadius: 20, padding: '5px 11px',
                      opacity: count === 0 ? 0.45 : 1, border: 'none',
                      cursor: count > 0 ? 'pointer' : 'default', transition: 'filter 0.15s',
                    }}
                    onMouseEnter={(e) => { if (count > 0) e.currentTarget.style.filter = 'brightness(0.93)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.filter = '' }}
                  >
                    <div style={{ width: 9, height: 9, borderRadius: '50%', background: PRIORITY_COLORS[priority] || '#ccc', flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#1A1A2E' }}>{count}</span>
                    <span style={{ fontSize: 11, color: '#9C998F' }}>{priority}</span>
                  </button>
                ))}
              </div>
            </>
          ), { flex: 1 })}

          {card('#fff', '#E5E2DA', (
            <>
              {sectionTitle('Waiting On')}
              {byWaiting.length === 0
                ? <p style={{ color: '#9C998F', fontSize: 12, margin: 0 }}>Nothing blocked. ✅</p>
                : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {byWaiting.map(([who, count]) => (
                      <button
                        key={who}
                        onClick={() => router.push(`/table?waitingOn=${encodeURIComponent(who)}`)}
                        style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          fontSize: 12, background: 'none', border: 'none', padding: '2px 0',
                          cursor: 'pointer', width: '100%', textAlign: 'left', transition: 'opacity 0.15s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.7')}
                        onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                      >
                        <span style={{ color: '#5A5A6A' }}>{who}</span>
                        <span style={{ fontWeight: 700, color: '#B87A2B', background: '#FFF5EB', borderRadius: 20, padding: '1px 8px', fontSize: 11 }}>{count}</span>
                      </button>
                    ))}
                  </div>
                )}
            </>
          ), { flex: 1 })}
        </div>
      </div>

      {/* ── Reminders ── */}
      {allReminders.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #E5E2DA', borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1A1A2E', margin: 0 }}>🔔 Follow-up Reminders</h3>
            <span style={{ background: '#FFF8E1', color: '#8D6E00', border: '1px solid #FFE082', borderRadius: 20, padding: '1px 9px', fontSize: 11, fontWeight: 700 }}>
              {allReminders.length} pending
            </span>
            <button
              onClick={() => router.push('/table?reminders=1')}
              style={{ marginLeft: 'auto', fontSize: 12, color: '#2D4A6F', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontWeight: 500 }}
            >
              View all →
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Overdue */}
            {remindersOverdue.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#C0392B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                  🔴 Overdue — {remindersOverdue.length}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
                  {remindersOverdue.map((r) => (
                    <ReminderCard key={r.id} record={r} accent="#C0392B" bg="#FFF0F0" border="#FFB8B8" onDone={markDone} onNavigate={() => router.push('/table?reminders=1')} />
                  ))}
                </div>
              </div>
            )}

            {/* Due Today */}
            {remindersToday.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#B87A2B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                  🟡 Due Today — {remindersToday.length}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
                  {remindersToday.map((r) => (
                    <ReminderCard key={r.id} record={r} accent="#B87A2B" bg="#FFFBF0" border="#FFE082" onDone={markDone} onNavigate={() => router.push('/table?reminders=1')} />
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming */}
            {remindersUpcoming.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#2B6CB0', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                  🔵 Upcoming (next 7 days) — {remindersUpcoming.length}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
                  {remindersUpcoming.map((r) => (
                    <ReminderCard key={r.id} record={r} accent="#2B6CB0" bg="#EBF7FF" border="#A8D8FF" onDone={markDone} onNavigate={() => router.push('/table?reminders=1')} />
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ── Bottom row: Needs Attention + Recent Activity ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Needs Attention */}
        {card('#fff', '#E5E2DA', (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1A1A2E', margin: 0 }}>⚠️ Needs Attention</h3>
              {needsAttention.length > 0 && (
                <span style={{ background: '#FFF0F0', color: '#C0392B', border: '1px solid #FFB8B8', borderRadius: 20, padding: '1px 8px', fontSize: 11, fontWeight: 700 }}>
                  {needsAttention.length}
                </span>
              )}
            </div>
            {needsAttention.length === 0
              ? <p style={{ color: '#9C998F', fontSize: 13, margin: 0 }}>All records are up to date! ✅</p>
              : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {needsAttention.map((r) => {
                    const stale = daysSince(r.updated_at)
                    const isUrgent = r.priority === 'Urgent'
                    const isHigh = r.priority === 'High'
                    return (
                      <button
                        key={r.id}
                        onClick={() => router.push('/table')}
                        style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '9px 12px',
                          background: isUrgent ? '#FFF0F0' : isHigh ? '#FFF5EB' : '#FFFBF0',
                          border: `1px solid ${isUrgent ? '#FFB8B8' : isHigh ? '#FFD9A8' : '#FFE082'}`,
                          borderRadius: 8, cursor: 'pointer', textAlign: 'left', width: '100%',
                          transition: 'filter 0.15s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(0.97)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.filter = '' }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {r.product_name}
                          </div>
                          <div style={{ fontSize: 11, color: '#9C998F', marginTop: 2 }}>
                            {r.internal_ref}{r.brand ? ` · ${r.brand}` : ''}{r.owner_name_snapshot ? ` · ${r.owner_name_snapshot}` : ''}
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0, marginLeft: 10 }}>
                          {isUrgent && (
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#D43C3C', background: '#FFE5E5', borderRadius: 4, padding: '1px 6px' }}>URGENT</span>
                          )}
                          {isHigh && !isUrgent && (
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#B87A2B', background: '#FFF5EB', borderRadius: 4, padding: '1px 6px' }}>HIGH</span>
                          )}
                          {stale >= 7 && (
                            <span style={{ fontSize: 10, color: '#9C998F' }}>{stale}d stale</span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
          </>
        ))}

        {/* Recent Activity */}
        {card('#fff', '#E5E2DA', (
          <>
            {sectionTitle('Recent Activity')}
            {logs.length === 0
              ? <p style={{ color: '#9C998F', fontSize: 13, margin: 0 }}>No activity yet.</p>
              : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {logs.slice(0, 12).map((l) => (
                    <div key={l.id} style={{ display: 'flex', gap: 10, padding: '7px 0', borderBottom: '1px solid #F0EDE8' }}>
                      <span style={{ flexShrink: 0, fontSize: 16, marginTop: 1 }}>{ACT_ICONS[l.action_type] ?? '📝'}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12 }}>
                          <span style={{ fontWeight: 600, color: '#1A1A2E' }}>{l.user_name || 'System'}</span>
                          <span style={{ color: '#5A5A6A' }}> {l.action_type.replace(/_/g, ' ')}</span>
                          {l.new_value && (
                            <span style={{ color: '#9C998F' }}> — {l.new_value.slice(0, 32)}</span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: '#B8B5AD', marginTop: 2 }}>{fmtDate(l.created_at)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </>
        ))}
      </div>
    </div>
  )
}
