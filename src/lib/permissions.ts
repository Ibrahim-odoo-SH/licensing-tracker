import type { Profile, PermKey } from './types'
import { ROLE_DEFAULTS } from './constants'

export function hasPerm(profile: Profile | null, key: PermKey): boolean {
  if (!profile) return false
  if (profile.custom_perms) {
    return profile.custom_perms[key] ?? false
  }
  return ROLE_DEFAULTS[profile.role]?.[key] ?? false
}

export function getEffectivePerms(profile: Profile | null): Record<PermKey, boolean> {
  if (!profile) return ROLE_DEFAULTS.viewer
  if (profile.custom_perms) return profile.custom_perms as Record<PermKey, boolean>
  return ROLE_DEFAULTS[profile.role] ?? ROLE_DEFAULTS.viewer
}
