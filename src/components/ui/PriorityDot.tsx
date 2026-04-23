'use client'
import { PRIORITY_COLORS } from '@/lib/constants'
import type { Priority } from '@/lib/types'

export default function PriorityDot({ priority, showLabel = false }: { priority: Priority; showLabel?: boolean }) {
  const color = PRIORITY_COLORS[priority] ?? '#999'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
      {showLabel && <span style={{ fontSize: 12, color: '#5A5A6A' }}>{priority}</span>}
    </span>
  )
}
