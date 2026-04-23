'use client'
import { STAGE_META } from '@/lib/constants'
import type { Stage } from '@/lib/types'

export default function StageBadge({ stage }: { stage: Stage }) {
  const m = STAGE_META[stage] ?? STAGE_META['Design Sent']
  return (
    <span style={{
      background: m.bg, color: m.color, border: `1px solid ${m.border}`,
      borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 600,
      whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 4,
    }}>
      {m.icon} {stage}
    </span>
  )
}
