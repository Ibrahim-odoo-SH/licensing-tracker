'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { STAGES, STAGE_META } from '@/lib/constants'
import type { Stage } from '@/lib/types'

interface TeamMember {
  id: string
  full_name: string
  email: string
  role: string
}

interface EmailTemplate {
  stage: string
  subject_prefix: string
  intro_message: string
  auto_recipient_ids: string[]
  // Product Details
  show_licensor_ref: boolean
  show_product_type: boolean
  show_gender: boolean
  show_contact_name: boolean
  show_submission_date: boolean
  show_priority: boolean
  show_samples: boolean
  // Workflow
  show_waiting_on: boolean
  show_next_action: boolean
  // Notes & Feedback
  show_notes: boolean
  show_feedback: boolean
  // Links & Images
  show_tech_pack: boolean
  show_additional_link: boolean
  show_images: boolean
}

const DEFAULTS: Omit<EmailTemplate, 'stage'> = {
  subject_prefix: '',
  intro_message: '',
  auto_recipient_ids: [],
  show_licensor_ref: true,
  show_product_type: true,
  show_gender: false,
  show_contact_name: false,
  show_submission_date: false,
  show_priority: false,
  show_samples: true,
  show_waiting_on: true,
  show_next_action: true,
  show_notes: true,
  show_feedback: true,
  show_tech_pack: true,
  show_additional_link: true,
  show_images: true,
}

interface Props {
  initialTemplates: EmailTemplate[]
  team: TeamMember[]
}

export default function TemplatesView({ initialTemplates, team: initialTeam }: Props) {
  const supabase = createClient()
  const [templates, setTemplates] = useState<Record<string, EmailTemplate>>(
    Object.fromEntries(initialTemplates.map((t) => [t.stage, t]))
  )
  const [selected, setSelected] = useState<string>(STAGES[0])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [team, setTeam] = useState<TeamMember[]>(initialTeam)

  // Fetch team client-side as well — guarantees fresh data regardless of server cache
  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .eq('is_active', true)
      .order('full_name')
      .then(({ data }) => { if (data && data.length > 0) setTeam(data) })
  }, [])

  const editableStages = STAGES.filter((s) => s !== 'Archived')
  const current: EmailTemplate = templates[selected] ?? { stage: selected, ...DEFAULTS }

  function update(field: keyof Omit<EmailTemplate, 'stage'>, value: any) {
    setTemplates((prev) => ({
      ...prev,
      [selected]: { ...current, [field]: value },
    }))
    setSaved(false)
  }

  function toggleRecipient(userId: string) {
    const ids = current.auto_recipient_ids ?? []
    const next = ids.includes(userId)
      ? ids.filter((id) => id !== userId)
      : [...ids, userId]
    update('auto_recipient_ids', next)
  }

  async function handleSave() {
    setSaving(true)
    const payload = { ...current, stage: selected, auto_recipient_ids: current.auto_recipient_ids ?? [] }
    const { error } = await supabase
      .from('email_templates')
      .upsert(payload, { onConflict: 'stage' })
    setSaving(false)
    if (!error) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } else {
      alert('Save failed: ' + error.message)
    }
  }

  async function handleReset() {
    if (!confirm('Reset this stage to default template?')) return
    setTemplates((prev) => {
      const next = { ...prev }
      delete next[selected]
      return next
    })
    await supabase.from('email_templates').delete().eq('stage', selected)
    setSaved(false)
  }

  const meta = STAGE_META[selected as Stage]
  const previewSubject = current.subject_prefix
    ? `${current.subject_prefix} — {Product Name}`
    : `[Licensing] ${selected} — {Product Name}`

  const fieldStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px', border: '1px solid #E5E2DA',
    borderRadius: 8, fontSize: 13, outline: 'none', background: '#FAFAF8',
    boxSizing: 'border-box',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 600, color: '#5A5A6A', display: 'block', marginBottom: 5,
  }
  const groupLabelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, color: '#9C998F', textTransform: 'uppercase',
    letterSpacing: '0.6px', marginBottom: 8, marginTop: 4,
  }

  function Toggle({
    field,
    label,
    hint,
  }: {
    field: keyof Omit<EmailTemplate, 'stage' | 'subject_prefix' | 'intro_message' | 'auto_recipient_ids'>
    label: string
    hint?: string
  }) {
    const val = current[field] as boolean
    return (
      <label style={{
        display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
        padding: '7px 0', borderBottom: '1px solid #F0EDE8',
      }}>
        <div
          onClick={() => update(field, !val)}
          style={{
            width: 36, height: 20, borderRadius: 10,
            background: val ? '#2D4A6F' : '#D0CDC5',
            position: 'relative', cursor: 'pointer',
            transition: 'background 0.2s', flexShrink: 0,
          }}
        >
          <div style={{
            position: 'absolute', top: 3, left: val ? 18 : 3,
            width: 14, height: 14, borderRadius: '50%', background: '#fff',
            transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }} />
        </div>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 13, color: '#1A1A2E' }}>{label}</span>
          {hint && <div style={{ fontSize: 11, color: '#9C998F', marginTop: 1 }}>{hint}</div>}
        </div>
        <span style={{
          fontSize: 11, color: val ? '#2D4A6F' : '#9C998F',
          background: val ? '#EEF2FA' : '#F4F3EF',
          borderRadius: 20, padding: '2px 8px', fontWeight: 600, flexShrink: 0,
        }}>
          {val ? 'On' : 'Off'}
        </span>
      </label>
    )
  }

  const selectedRecipientCount = (current.auto_recipient_ids ?? []).length

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 52px)', overflow: 'hidden' }}>

      {/* ── Left sidebar ── */}
      <div style={{
        width: 220, background: '#fff', borderRight: '1px solid #E5E2DA',
        display: 'flex', flexDirection: 'column', flexShrink: 0,
      }}>
        <div style={{ padding: '16px 16px 10px', borderBottom: '1px solid #E5E2DA' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1A2E' }}>✉ Email Templates</div>
          <div style={{ fontSize: 11, color: '#9C998F', marginTop: 2 }}>One template per stage</div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
          {editableStages.map((stage) => {
            const m = STAGE_META[stage as Stage]
            const hasCustom = !!templates[stage]
            const recipientCount = (templates[stage]?.auto_recipient_ids ?? []).length
            const isActive = selected === stage
            return (
              <button
                key={stage}
                onClick={() => { setSelected(stage); setSaved(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  padding: '8px 10px', borderRadius: 8, border: 'none', textAlign: 'left',
                  background: isActive ? '#EEF2FA' : 'transparent',
                  cursor: 'pointer', marginBottom: 2, transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = '#F4F3EF' }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
              >
                <span style={{ fontSize: 14 }}>{m?.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 12, fontWeight: isActive ? 600 : 400,
                    color: isActive ? '#2D4A6F' : '#1A1A2E',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {stage.replace('PreProduction Samples ', '').replace('Modifications Requested', 'Modifications')}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
                  {recipientCount > 0 && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: '#AA9682',
                      background: '#F5EFE9', borderRadius: 20, padding: '1px 6px',
                    }}>
                      {recipientCount} 👤
                    </span>
                  )}
                  {hasCustom && (
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#2D4A6F' }} />
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Right panel ── */}
      <div style={{ flex: 1, overflow: 'auto', background: '#F4F3EF', padding: 28 }}>
        <div style={{ maxWidth: 700 }}>

          {/* Stage header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
            <span style={{
              background: meta?.bg, color: meta?.color, border: `1px solid ${meta?.border}`,
              borderRadius: 20, padding: '4px 14px', fontSize: 13, fontWeight: 600,
            }}>
              {meta?.icon} {selected}
            </span>
            {templates[selected] && (
              <span style={{ fontSize: 11, color: '#2D4A6F', background: '#EEF2FA', borderRadius: 20, padding: '2px 8px', fontWeight: 600 }}>
                Custom template active
              </span>
            )}
          </div>

          {/* Subject line */}
          <div style={{ background: '#fff', border: '1px solid #E5E2DA', borderRadius: 12, padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A2E', marginBottom: 14 }}>Subject Line</div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>
                Custom Subject Prefix <span style={{ color: '#9C998F', fontWeight: 400 }}>(optional)</span>
              </label>
              <input
                style={fieldStyle}
                value={current.subject_prefix}
                onChange={(e) => update('subject_prefix', e.target.value)}
                placeholder={`Default: [Licensing] ${selected} — {Product Name}`}
              />
            </div>
            <div style={{ background: '#F4F3EF', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
              <span style={{ color: '#9C998F' }}>Preview: </span>
              <span style={{ color: '#1A1A2E', fontWeight: 500 }}>{previewSubject}</span>
            </div>
          </div>

          {/* Intro message */}
          <div style={{ background: '#fff', border: '1px solid #E5E2DA', borderRadius: 12, padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A2E', marginBottom: 14 }}>Intro Message</div>
            <label style={labelStyle}>
              Custom text <span style={{ color: '#9C998F', fontWeight: 400 }}>(appears at the top of the email)</span>
            </label>
            <textarea
              style={{ ...fieldStyle, minHeight: 90, resize: 'vertical', lineHeight: 1.6 }}
              value={current.intro_message}
              onChange={(e) => update('intro_message', e.target.value)}
              placeholder={`e.g. "Please find below the latest update for this product."`}
            />
          </div>

          {/* Auto-send Recipients */}
          <div style={{ background: '#fff', border: '1px solid #E5E2DA', borderRadius: 12, padding: 20, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A2E' }}>⚡ Auto-send Recipients</div>
              {selectedRecipientCount > 0 && (
                <span style={{
                  fontSize: 11, fontWeight: 700, color: '#AA9682',
                  background: '#F5EFE9', borderRadius: 20, padding: '3px 10px',
                }}>
                  {selectedRecipientCount} selected
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: '#9C998F', marginBottom: 16, lineHeight: 1.6 }}>
              Selected users automatically receive this email whenever a record moves to <strong style={{ color: '#5A5A6A' }}>{selected}</strong>. No manual action needed.
            </div>

            {team.length === 0 ? (
              <div style={{ fontSize: 13, color: '#9C998F', padding: '12px 0' }}>No active team members found.</div>
            ) : (
              <div>
                {team.map((member) => {
                  const isSelected = (current.auto_recipient_ids ?? []).includes(member.id)
                  return (
                    <div
                      key={member.id}
                      onClick={() => toggleRecipient(member.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                        marginBottom: 4,
                        background: isSelected ? '#F5EFE9' : '#FAFAF8',
                        border: `1px solid ${isSelected ? '#E8D5C4' : '#F0EDE8'}`,
                        transition: 'all 0.15s',
                      }}
                    >
                      {/* Custom checkbox */}
                      <div style={{
                        width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                        border: `2px solid ${isSelected ? '#AA9682' : '#D0CDC5'}`,
                        background: isSelected ? '#AA9682' : '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s',
                      }}>
                        {isSelected && (
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>

                      {/* Avatar */}
                      <div style={{
                        width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                        background: isSelected ? '#AA9682' : '#D0CDC5',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 700, color: '#fff',
                        transition: 'background 0.15s',
                      }}>
                        {member.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>

                      {/* Name + email */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#1A1A2E' }}>{member.full_name}</div>
                        <div style={{ fontSize: 11, color: '#9C998F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {member.email} · <span style={{ textTransform: 'capitalize' }}>{member.role}</span>
                        </div>
                      </div>

                      {isSelected && (
                        <span style={{ fontSize: 11, color: '#AA9682', fontWeight: 600, flexShrink: 0 }}>
                          Will receive ✓
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {selectedRecipientCount > 0 && (
              <div style={{
                marginTop: 14, padding: '10px 14px',
                background: '#F5EFE9', borderRadius: 8, border: '1px solid #E8D5C4',
                fontSize: 12, color: '#8A6A50', lineHeight: 1.5,
              }}>
                📧 <strong>{selectedRecipientCount} user{selectedRecipientCount > 1 ? 's' : ''}</strong> will automatically receive this email on every stage change to <strong>{selected}</strong>.
              </div>
            )}
          </div>

          {/* Content toggles */}
          <div style={{ background: '#fff', border: '1px solid #E5E2DA', borderRadius: 12, padding: 20, marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A2E', marginBottom: 4 }}>Email Content</div>
            <div style={{ fontSize: 12, color: '#9C998F', marginBottom: 18 }}>
              Choose which fields to include in the email for this stage.
            </div>

            {/* Product Details */}
            <div style={{ marginBottom: 18 }}>
              <div style={groupLabelStyle}>📋 Product Details</div>
              <Toggle field="show_licensor_ref"    label="Licensor Reference" hint="The licensor's own reference number" />
              <Toggle field="show_product_type"    label="Product Type" hint="e.g. Apparel, Accessories" />
              <Toggle field="show_gender"          label="Gender / Target" hint="e.g. Unisex, Kids Boys" />
              <Toggle field="show_contact_name"    label="Contact Name" />
              <Toggle field="show_submission_date" label="Submission Date" />
              <Toggle field="show_priority"        label="Priority Level" hint="Low / Medium / High / Urgent" />
              <Toggle field="show_samples"         label="Samples Quantity" />
            </div>

            {/* Workflow */}
            <div style={{ marginBottom: 18 }}>
              <div style={groupLabelStyle}>⚡ Workflow Status</div>
              <Toggle field="show_waiting_on"  label="Waiting On" hint="Who is currently blocking progress" />
              <Toggle field="show_next_action" label="Next Action" hint="What needs to happen next" />
            </div>

            {/* Notes & Feedback */}
            <div style={{ marginBottom: 18 }}>
              <div style={groupLabelStyle}>📝 Notes & Feedback</div>
              <Toggle field="show_notes"    label="Notes Summary" />
              <Toggle field="show_feedback" label="Licensor Feedback" />
            </div>

            {/* Links & Images */}
            <div>
              <div style={groupLabelStyle}>🔗 Links & Images</div>
              <Toggle field="show_tech_pack"       label="Tech Pack Link" hint="Button linking to tech pack URL" />
              <Toggle field="show_additional_link" label="Additional Link" hint="Any secondary link on the record" />
              <Toggle field="show_images"          label="Product Images" hint="Uploaded photos attached to the record" />
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                flex: 2, padding: '10px', background: saving ? '#8BA5C4' : '#2D4A6F',
                color: '#fff', border: 'none', borderRadius: 8,
                fontWeight: 600, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save Template'}
            </button>
            {templates[selected] && (
              <button
                onClick={handleReset}
                style={{
                  flex: 1, padding: '10px', background: '#fff', color: '#C0392B',
                  border: '1px solid #FFB8B8', borderRadius: 8,
                  fontWeight: 500, fontSize: 13, cursor: 'pointer',
                }}
              >
                Reset to Default
              </button>
            )}
          </div>

          {!templates[selected] && (
            <p style={{ fontSize: 12, color: '#9C998F', marginTop: 14, textAlign: 'center' }}>
              No custom template set — using defaults for this stage. Save to activate.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
