'use client'
import { initials, avatarColor } from '@/lib/utils'

interface AvatarProps {
  name: string
  size?: number
  showName?: boolean
}

export default function Avatar({ name, size = 28, showName = false }: AvatarProps) {
  const bg = avatarColor(name)
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{
        width: size, height: size, borderRadius: '50%', background: bg,
        color: '#fff', fontSize: size * 0.38, fontWeight: 700,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {initials(name)}
      </span>
      {showName && <span style={{ fontSize: 13, color: '#3A3A4A' }}>{name}</span>}
    </span>
  )
}
