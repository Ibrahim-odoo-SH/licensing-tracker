'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth-context'
import type { Profile, PermKey } from '@/lib/types'
import { ALL_PERMS, ROLE_DEFAULTS } from '@/lib/constants'
import { getEffectivePerms } from '@/lib/permissions'
import Avatar from '@/components/ui/Avatar'
import { fmtDate } from '@/lib/utils'

interface Props { team: Profile[] }

const ROLES = ['admin', 'editor', 'viewer', 'commenter'] as const

// Brand palette colors
const ROLE_BADGE: Record<string, { bg: string; color: string }> = {
  admin:     { bg: '#F0EDE8', color: '#1C2226' },
  editor:    { bg: '#EBF5EE', color: '#5F7D6A' },
  viewer:    { bg: '#F5EFE9', color: '#AA9682' },
  commenter: { bg: '#F5F4F2', color: '#7A756E' },
  custom:    { bg: '#FAF4EC', color: '#C2A46F' },
}

export default function TeamView({ team: initialTeam }: Props) {
  const { profile: me, can, refreshProfile } = useAuth()
  const supabase = createClient()
  const [team, setTeam] = useState<Profile[]>(initialTeam)
  const [expandedPerms, setExpandedPerms] = useState<string | null>(null)
  const [addEmail, setAddEmail] = useState('')
  const [addName, setAddName] = useState('')
  const [addRole, setAddRole] = useState<'editor' | 'viewer' | 'commenter'>('editor')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')
  const [addSuccess, setAddSuccess] = useState('')

  const isAdmin = can('manageTeam')

  async function updateRole(id: string, role: string) {
    await supabase.from('profiles').update({ role, custom_perms: null }).eq('id', id)
    setTeam((prev) => prev.map((m) => m.id === id ? { ...m, role: role as any, custom_perms: null } : m))
  }

  async function toggleActive(id: string, current: boolean) {
    await supabase.from('profiles').update({ is_active: !current }).eq('id', id)
    setTeam((prev) => prev.map((m) => m.id === id ? { ...m, is_active: !current } : m))
  }

  async function removeMember(id: string) {
    if (!confirm('Remove this team member? They will lose access immediately.')) return
    await supabase.from('profiles').delete().eq('id', id)
    setTeam((prev) => prev.filter((m) => m.id !== id))
  }

  async function setCustomPerm(id: string, key: PermKey, val: boolean) {
    const member = team.find((m) => m.id === id)!
    const current = getEffectivePerms(member)
    const updated = { ...current, [key]: val }
    await supabase.from('profiles').update({ custom_perms: updated, role: 'custom' }).eq('id', id)
    setTeam((prev) => prev.map((m) => m.id === id ? { ...m, custom_perms: updated, role: 'custom' } : m))
  }

  async function snapToRole(id: string, role: string) {
    await supabase.from('profiles').update({ role, custom_perms: null }).eq('id', id)
    setTeam((prev) => prev.map((m) => m.id === id ? { ...m, role: role as any, custom_perms: null } : m))
  }

  async function addMember() {
    setAddError('')
    setAddSuccess('')
    if (!addEmail.endsWith('@cottondivision.com')) { setAddError('Must be @cottondivision.com'); return }
    if (!addName.trim()) { setAddError('Name is required'); return }
    setAdding(true)

    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: addEmail.trim().toLowerCase(), full_name: addName.trim(), role: addRole }),
      })
      const json = await res.json()

      if (!res.ok) {
        setAddError(json.error ?? 'Failed to send invite')
      } else {
        if (json.profile) setTeam((prev) => [...prev, json.profile])
        setAddSuccess(`Invitation sent to ${addEmail}. They'll receive an email to set their password.`)
        setAddEmail('')
        setAddName('')
      }
    } catch (e: any) {
      setAddError(e?.message ?? 'Network error')
    } finally {
      setAdding(false)
    }
  }

  const categories = [...new Set(ALL_PERMS.map((p) => p.cat))]

  if (!isAdmin) {
    return <ProfileView profile={me!} team={team} />
  }

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1C2226' }}>Team & Access</h1>
        <p style={{ fontSize: 13, color: '#7A756E', marginTop: 2 }}>{team.filter((m) => m.is_active).length} active members</p>
      </div>

      {/* Invite member */}
      <div style={{ background: '#fff', border: '1px solid #D8D4CE', borderRadius: 12, padding: 18, marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4, color: '#1C2226' }}>Invite Team Member</div>
        <p style={{ fontSize: 12, color: '#7A756E', marginBottom: 14 }}>They'll receive an email invitation to set their password and join Codiflow.</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#7A756E', display: 'block', marginBottom: 4 }}>Full Name</label>
            <input value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="Sara Benali"
              style={{ padding: '7px 10px', border: '1px solid #D8D4CE', borderRadius: 7, fontSize: 13, outline: 'none', width: 180, background: '#F7F6F4', color: '#1C2226' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#7A756E', display: 'block', marginBottom: 4 }}>Work Email</label>
            <input value={addEmail} onChange={(e) => setAddEmail(e.target.value)} placeholder="sara@cottondivision.com"
              style={{ padding: '7px 10px', border: '1px solid #D8D4CE', borderRadius: 7, fontSize: 13, outline: 'none', width: 240, background: '#F7F6F4', color: '#1C2226' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#7A756E', display: 'block', marginBottom: 4 }}>Role</label>
            <select value={addRole} onChange={(e) => setAddRole(e.target.value as any)}
              style={{ padding: '7px 10px', border: '1px solid #D8D4CE', borderRadius: 7, fontSize: 13, outline: 'none', background: '#F7F6F4', color: '#1C2226', cursor: 'pointer' }}>
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
              <option value="commenter">Commenter</option>
            </select>
          </div>
          <button onClick={addMember} disabled={adding}
            style={{ padding: '8px 18px', background: adding ? '#8BA5C4' : '#1C2226', color: '#fff', border: 'none', borderRadius: 7, fontWeight: 600, fontSize: 13, cursor: adding ? 'not-allowed' : 'pointer', transition: 'background 0.15s' }}>
            {adding ? 'Sending…' : '✉ Send Invite'}
          </button>
        </div>
        {addError && (
          <div style={{ marginTop: 10, padding: '8px 12px', background: '#FFF0F0', border: '1px solid #FFB8B8', borderRadius: 8, fontSize: 12, color: '#A35C5C' }}>{addError}</div>
        )}
        {addSuccess && (
          <div style={{ marginTop: 10, padding: '8px 12px', background: '#EBF5EE', border: '1px solid #B8D4C0', borderRadius: 8, fontSize: 12, color: '#5F7D6A' }}>{addSuccess}</div>
        )}
      </div>

      {/* Team table */}
      <div style={{ background: '#fff', border: '1px solid #D8D4CE', borderRadius: 12, overflow: 'hidden' }}>
        {team.map((member, i) => {
          const perms = getEffectivePerms(member)
          const isExpanded = expandedPerms === member.id
          const isCustom = member.role === 'custom' || member.custom_perms !== null
          const badge = ROLE_BADGE[isCustom ? 'custom' : member.role] ?? ROLE_BADGE.viewer

          return (
            <div key={member.id} style={{ borderBottom: i < team.length - 1 ? '1px solid #EFEDE9' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px' }}>
                <Avatar name={member.full_name} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#1C2226' }}>{member.full_name}</div>
                  <div style={{ fontSize: 12, color: '#7A756E' }}>{member.email}</div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  {/* Role badge */}
                  <span style={{ background: badge.bg, color: badge.color, borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>
                    {isCustom ? 'Custom' : member.role}
                  </span>

                  {/* Role select */}
                  {member.id !== me?.id && (
                    <select value={member.role} onChange={(e) => updateRole(member.id, e.target.value)}
                      style={{ padding: '4px 8px', border: '1px solid #D8D4CE', borderRadius: 6, fontSize: 12, background: '#F7F6F4', cursor: 'pointer', color: '#1C2226', outline: 'none' }}>
                      {ROLES.map((r) => <option key={r}>{r}</option>)}
                    </select>
                  )}

                  {/* Perms toggle */}
                  <button onClick={() => setExpandedPerms(isExpanded ? null : member.id)}
                    style={{ padding: '4px 10px', background: isExpanded ? '#F0EDE8' : '#F7F6F4', border: '1px solid #D8D4CE', borderRadius: 6, fontSize: 12, cursor: 'pointer', color: '#4A5A63', outline: 'none' }}>
                    ⚙ Permissions
                  </button>

                  {/* Active toggle */}
                  {member.id !== me?.id && (
                    <button onClick={() => toggleActive(member.id, member.is_active)}
                      style={{ padding: '4px 10px', background: member.is_active ? '#EBF5EE' : '#FFF0F0', border: `1px solid ${member.is_active ? '#B8D4C0' : '#FFB8B8'}`, color: member.is_active ? '#5F7D6A' : '#A35C5C', borderRadius: 6, fontSize: 12, cursor: 'pointer', outline: 'none' }}>
                      {member.is_active ? 'Active' : 'Disabled'}
                    </button>
                  )}

                  {/* Remove */}
                  {member.id !== me?.id && (
                    <button onClick={() => removeMember(member.id)}
                      style={{ padding: '4px 8px', background: 'none', border: 'none', color: '#A35C5C', cursor: 'pointer', fontSize: 13 }}>🗑</button>
                  )}

                  <span style={{ fontSize: 11, color: '#B8B5AD' }}>Joined {fmtDate(member.created_at)}</span>
                </div>
              </div>

              {/* Permissions editor */}
              {isExpanded && (
                <div style={{ background: '#F7F6F4', borderTop: '1px solid #EFEDE9', padding: '14px 18px' }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#7A756E', alignSelf: 'center' }}>Quick set:</span>
                    {ROLES.map((r) => (
                      <button key={r} onClick={() => snapToRole(member.id, r)}
                        style={{ padding: '4px 10px', background: '#fff', border: '1px solid #D8D4CE', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontWeight: 500, color: '#4A5A63', outline: 'none' }}>
                        {r}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px 20px' }}>
                    {categories.map((cat) => (
                      <div key={cat}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#7A756E', textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.08em' }}>{cat}</div>
                        {ALL_PERMS.filter((p) => p.cat === cat).map((p) => (
                          <label key={p.key} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, cursor: 'pointer', fontSize: 12, color: '#1C2226' }}>
                            <input type="checkbox" checked={perms[p.key] ?? false} onChange={(e) => setCustomPerm(member.id, p.key, e.target.checked)} />
                            {p.label}
                          </label>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
        {team.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: '#7A756E', fontSize: 13 }}>No team members yet. Invite someone above.</div>
        )}
      </div>
    </div>
  )
}

function ProfileView({ profile, team }: { profile: Profile; team: Profile[] }) {
  const perms = getEffectivePerms(profile)
  const categories = [...new Set(ALL_PERMS.map((p) => p.cat))]
  const badge = { bg: '#F0EDE8', color: '#1C2226' }

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1C2226', marginBottom: 20 }}>My Profile</h1>

      <div style={{ background: '#fff', border: '1px solid #D8D4CE', borderRadius: 12, padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <Avatar name={profile.full_name} size={56} />
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#1C2226' }}>{profile.full_name}</div>
            <div style={{ fontSize: 13, color: '#7A756E' }}>{profile.email}</div>
            <span style={{ background: badge.bg, color: badge.color, borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 600, display: 'inline-block', marginTop: 4 }}>{profile.role}</span>
          </div>
        </div>

        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: '#1C2226' }}>My Permissions</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px 20px' }}>
          {categories.map((cat) => (
            <div key={cat}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#7A756E', textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.08em' }}>{cat}</div>
              {ALL_PERMS.filter((p) => p.cat === cat).map((p) => (
                <div key={p.key} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, fontSize: 12 }}>
                  <span style={{ color: perms[p.key] ? '#5F7D6A' : '#D8D4CE', fontSize: 14 }}>{perms[p.key] ? '✓' : '✗'}</span>
                  <span style={{ color: perms[p.key] ? '#1C2226' : '#7A756E' }}>{p.label}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #D8D4CE', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '12px 18px', borderBottom: '1px solid #EFEDE9', fontSize: 13, fontWeight: 700, color: '#1C2226' }}>Team Directory</div>
        {team.filter((m) => m.is_active).map((m, i) => (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px', borderBottom: i < team.filter(x => x.is_active).length - 1 ? '1px solid #EFEDE9' : 'none' }}>
            <Avatar name={m.full_name} size={30} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500, fontSize: 13, color: '#1C2226' }}>{m.full_name}</div>
              <div style={{ fontSize: 12, color: '#7A756E' }}>{m.email}</div>
            </div>
            <span style={{ background: '#F0EDE8', color: '#4A5A63', borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>{m.role}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
