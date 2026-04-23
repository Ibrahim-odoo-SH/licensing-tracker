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
    if (!addEmail.endsWith('@cottondivision.com')) { setAddError('Must be @cottondivision.com'); return }
    if (!addName.trim()) { setAddError('Name is required'); return }
    setAdding(true)
    const { data, error } = await supabase.from('profiles').insert({ id: crypto.randomUUID(), full_name: addName.trim(), email: addEmail.trim().toLowerCase(), role: addRole }).select().single()
    if (error) { setAddError(error.message); setAdding(false); return }
    if (data) setTeam((prev) => [...prev, data])
    setAddEmail(''); setAddName(''); setAdding(false)
  }

  const categories = [...new Set(ALL_PERMS.map((p) => p.cat))]

  if (!isAdmin) {
    return <ProfileView profile={me!} team={team} />
  }

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1A1A2E' }}>👥 Team & Access</h1>
        <p style={{ fontSize: 13, color: '#9C998F', marginTop: 2 }}>{team.filter((m) => m.is_active).length} active members</p>
      </div>

      {/* Add member */}
      <div style={{ background: '#fff', border: '1px solid #E5E2DA', borderRadius: 12, padding: 18, marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: '#1A1A2E' }}>Add Team Member</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#9C998F', display: 'block', marginBottom: 4 }}>Full Name</label>
            <input value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="Sara Benali"
              style={{ padding: '7px 10px', border: '1px solid #E5E2DA', borderRadius: 7, fontSize: 13, outline: 'none', width: 180 }} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#9C998F', display: 'block', marginBottom: 4 }}>Email</label>
            <input value={addEmail} onChange={(e) => setAddEmail(e.target.value)} placeholder="sara@cottondivision.com"
              style={{ padding: '7px 10px', border: '1px solid #E5E2DA', borderRadius: 7, fontSize: 13, outline: 'none', width: 230 }} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#9C998F', display: 'block', marginBottom: 4 }}>Role</label>
            <select value={addRole} onChange={(e) => setAddRole(e.target.value as any)}
              style={{ padding: '7px 10px', border: '1px solid #E5E2DA', borderRadius: 7, fontSize: 13, outline: 'none' }}>
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
              <option value="commenter">Commenter</option>
            </select>
          </div>
          <button onClick={addMember} disabled={adding}
            style={{ padding: '8px 16px', background: '#2D4A6F', color: '#fff', border: 'none', borderRadius: 7, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            {adding ? 'Adding…' : '+ Add Member'}
          </button>
          {addError && <span style={{ fontSize: 12, color: '#C0392B' }}>{addError}</span>}
        </div>
      </div>

      {/* Team table */}
      <div style={{ background: '#fff', border: '1px solid #E5E2DA', borderRadius: 12, overflow: 'hidden' }}>
        {team.map((member, i) => {
          const perms = getEffectivePerms(member)
          const isExpanded = expandedPerms === member.id
          const isCustom = member.role === 'custom' || member.custom_perms !== null

          return (
            <div key={member.id} style={{ borderBottom: i < team.length - 1 ? '1px solid #F0EDE8' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px' }}>
                <Avatar name={member.full_name} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{member.full_name}</div>
                  <div style={{ fontSize: 12, color: '#9C998F' }}>{member.email}</div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {/* Role badge */}
                  <span style={{ background: isCustom ? '#FFF5EB' : '#EEF0FF', color: isCustom ? '#B87A2B' : '#4B52B8', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>
                    {isCustom ? 'Custom' : member.role}
                  </span>

                  {/* Role select */}
                  {member.id !== me?.id && (
                    <select value={member.role} onChange={(e) => updateRole(member.id, e.target.value)}
                      style={{ padding: '4px 8px', border: '1px solid #E5E2DA', borderRadius: 6, fontSize: 12, background: '#FAFAF8', cursor: 'pointer' }}>
                      {ROLES.map((r) => <option key={r}>{r}</option>)}
                    </select>
                  )}

                  {/* Perms toggle */}
                  <button onClick={() => setExpandedPerms(isExpanded ? null : member.id)}
                    style={{ padding: '4px 10px', background: isExpanded ? '#EEF0FF' : '#F4F3EF', border: '1px solid #E5E2DA', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
                    ⚙️ Permissions
                  </button>

                  {/* Active toggle */}
                  {member.id !== me?.id && (
                    <button onClick={() => toggleActive(member.id, member.is_active)}
                      style={{ padding: '4px 10px', background: member.is_active ? '#EEFBF4' : '#FFF0F0', border: `1px solid ${member.is_active ? '#A8E6C3' : '#FFB8B8'}`, color: member.is_active ? '#2B8B57' : '#C0392B', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
                      {member.is_active ? 'Active' : 'Disabled'}
                    </button>
                  )}

                  {/* Remove */}
                  {member.id !== me?.id && (
                    <button onClick={() => removeMember(member.id)}
                      style={{ padding: '4px 8px', background: 'none', border: 'none', color: '#C0392B', cursor: 'pointer', fontSize: 13 }}>🗑</button>
                  )}

                  <span style={{ fontSize: 11, color: '#B8B5AD' }}>Joined {fmtDate(member.created_at)}</span>
                </div>
              </div>

              {/* Permissions editor */}
              {isExpanded && (
                <div style={{ background: '#FAFAF8', borderTop: '1px solid #F0EDE8', padding: '14px 18px' }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#5A5A6A', alignSelf: 'center' }}>Quick set:</span>
                    {ROLES.map((r) => (
                      <button key={r} onClick={() => snapToRole(member.id, r)}
                        style={{ padding: '4px 10px', background: '#fff', border: '1px solid #E5E2DA', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontWeight: 500 }}>
                        {r}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px 20px' }}>
                    {categories.map((cat) => (
                      <div key={cat}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#9C998F', textTransform: 'uppercase', marginBottom: 6 }}>{cat}</div>
                        {ALL_PERMS.filter((p) => p.cat === cat).map((p) => (
                          <label key={p.key} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, cursor: 'pointer', fontSize: 12 }}>
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
      </div>
    </div>
  )
}

function ProfileView({ profile, team }: { profile: Profile; team: Profile[] }) {
  const perms = getEffectivePerms(profile)
  const categories = [...new Set(ALL_PERMS.map((p) => p.cat))]

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1A1A2E', marginBottom: 20 }}>👤 My Profile</h1>

      <div style={{ background: '#fff', border: '1px solid #E5E2DA', borderRadius: 12, padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <Avatar name={profile.full_name} size={56} />
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{profile.full_name}</div>
            <div style={{ fontSize: 13, color: '#9C998F' }}>{profile.email}</div>
            <span style={{ background: '#EEF0FF', color: '#4B52B8', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 600, display: 'inline-block', marginTop: 4 }}>{profile.role}</span>
          </div>
        </div>

        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>My Permissions</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px 20px' }}>
          {categories.map((cat) => (
            <div key={cat}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#9C998F', textTransform: 'uppercase', marginBottom: 6 }}>{cat}</div>
              {ALL_PERMS.filter((p) => p.cat === cat).map((p) => (
                <div key={p.key} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, fontSize: 12 }}>
                  <span>{perms[p.key] ? '✅' : '❌'}</span>
                  <span style={{ color: perms[p.key] ? '#1A1A2E' : '#9C998F' }}>{p.label}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #E5E2DA', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '12px 18px', borderBottom: '1px solid #F0EDE8', fontSize: 13, fontWeight: 700 }}>Team Directory</div>
        {team.filter((m) => m.is_active).map((m, i) => (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px', borderBottom: i < team.length - 1 ? '1px solid #F0EDE8' : 'none' }}>
            <Avatar name={m.full_name} size={30} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500, fontSize: 13 }}>{m.full_name}</div>
              <div style={{ fontSize: 12, color: '#9C998F' }}>{m.email}</div>
            </div>
            <span style={{ background: '#EEF0FF', color: '#4B52B8', borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>{m.role}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
