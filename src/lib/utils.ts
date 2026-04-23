import { AVATAR_COLORS } from './constants'

export function initials(name: string): string {
  return (name || '?').split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}

export function avatarColor(name: string): string {
  let h = 0
  for (let i = 0; i < (name || '').length; i++) {
    h = name.charCodeAt(i) + ((h << 5) - h)
  }
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

export function daysSince(dateStr: string | null): number {
  if (!dateStr) return 999
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

export function fmtDate(d: string | null): string {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return d
  }
}

export function fmtFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
