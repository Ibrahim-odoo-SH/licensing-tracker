'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth-context'
import type { LicRecord, Comment, ActivityLog, Attachment, Profile, PermKey } from '@/lib/types'
import { STAGE_META, BRAND_COLORS, PRIORITY_COLORS, STAGES, PRIORITIES } from '@/lib/constants'
import { fmtDate, fmtFileSize } from '@/lib/utils'
import StageBadge from '@/components/ui/StageBadge'
import Avatar from '@/components/ui/Avatar'
import PriorityDot from '@/components/ui/PriorityDot'
import RecordForm from './RecordForm'
import NotifyModal from '@/components/notifications/NotifyModal'

interface DrawerProps {
  record: LicRecord
  team: Profile[]
  onClose: () => void
  onUpdate: (r: LicRecord) => void
  onDelete?: (id: string) => void
}

const ACCEPTED = '.jpg,.jpeg,.png,.gif,.webp,.pdf,.svg,.ai,.psd,.eps'

export default function RecordDrawer({ record, team, onClose, onUpdate, onDelete }: DrawerProps) {
  const { profile, can } = useAuth()
  const supabase = createClient()
  const [tab, setTab] = useState<'details' | 'comments' | 'history'>('details')
  const [editing, setEditing] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [newComment, setNewComment] = useState('')
  const [postingComment, setPostingComment] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showNotify, setShowNotify] = useState(false)
  const [settingCover, setSettingCover] = useState<string | null>(null)

  useEffect(() => {
    loadComments()
    loadLogs()
    loadAttachments()
  }, [record.id])

  async function loadComments() {
    const { data } = await supabase.from('comments').select('*').eq('record_id', record.id).order('created_at', { ascending: false })
    setComments(data ?? [])
  }
  async function loadLogs() {
    const { data } = await supabase.from('activity_logs').select('*').eq('record_id', record.id).order('created_at', { ascending: false })
    setLogs(data ?? [])
  }
  async function loadAttachments() {
    const { data } = await supabase.from('record_attachments').select('*').eq('record_id', record.id).order('created_at', { ascending: false })
    setAttachments(data ?? [])
  }

  async function handleSave(data: Partial<LicRecord>, _pendingFiles?: File[]) {
    const { data: updated } = await supabase.from('records').update({ ...data, updated_by: profile?.id }).eq('id', record.id).select().single()
    if (updated) { onUpdate(updated); setEditing(false) }
  }

  async function handleStageChange(stage: string) {
    const { data: updated } = await supabase.from('records').update({ normalized_stage: stage, updated_by: profile?.id }).eq('id', record.id).select().single()
    if (updated) onUpdate(updated)
  }

  async function handlePriorityChange(priority: string) {
    const { data: updated } = await supabase.from('records').update({ priority, updated_by: profile?.id }).eq('id', record.id).select().single()
    if (updated) onUpdate(updated)
  }

  async function handleArchive() {
    const arch = !record.is_archived
    const { data: updated } = await supabase.from('records').update({ is_archived: arch, updated_by: profile?.id }).eq('id', record.id).select().single()
    if (updated) {
      await supabase.from('activity_logs').insert({ record_id: record.id, user_id: profile?.id, user_name: profile?.full_name, action_type: 'archive_toggled', new_value: arch ? 'archived' : 'restored' })
      onUpdate(updated)
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this record? This cannot be undone.')) return
    await supabase.from('records').delete().eq('id', record.id)
    onDelete?.(record.id)
    onClose()
  }

  async function postComment() {
    if (!newComment.trim()) return
    setPostingComment(true)
    await supabase.from('comments').insert({ record_id: record.id, author_id: profile?.id, author_name: profile?.full_name, comment_text: newComment.trim() })
    await supabase.from('activity_logs').insert({ record_id: record.id, user_id: profile?.id, user_name: profile?.full_name, action_type: 'comment', new_value: newComment.slice(0, 50) })
    setNewComment('')
    await loadComments()
    setPostingComment(false)
  }

  async function uploadFile(file: File) {
    setUploading(true)
    const fileName = `${Date.now()}-${file.name}`
    const filePath = `${record.id}/${fileName}`
    const { error: upErr } = await supabase.storage.from('record-attachments').upload(filePath, file, { contentType: file.type, upsert: false })
    if (!upErr) {
      const { data: { publicUrl } } = supabase.storage.from('record-attachments').getPublicUrl(filePath)
      // Auto-set as primary if it's the first image and no primary exists yet
      const hasPrimary = attachments.some((a) => a.is_primary && a.file_type?.startsWith('image/'))
      const isPrimary = file.type.startsWith('image/') && !hasPrimary
      await supabase.from('record_attachments').insert({
        record_id: record.id, file_name: file.name, file_path: filePath,
        file_type: file.type, file_size: file.size, public_url: publicUrl,
        uploaded_by: profile?.id, is_primary: isPrimary,
      })
      await loadAttachments()
    }
    setUploading(false)
  }

  async function setCoverImage(att: Attachment) {
    setSettingCover(att.id)
    // Unset all primaries for this record, then set the selected one
    await supabase.from('record_attachments').update({ is_primary: false }).eq('record_id', record.id)
    await supabase.from('record_attachments').update({ is_primary: true }).eq('id', att.id)
    await loadAttachments()
    setSettingCover(null)
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    await uploadFile(file)
    e.target.value = ''
  }

  async function deleteAttachment(att: Attachment) {
    await supabase.storage.from('record-attachments').remove([att.file_path])
    await supabase.from('record_attachments').delete().eq('id', att.id)
    setAttachments((prev) => prev.filter((a) => a.id !== att.id))
  }

  const brandColor = BRAND_COLORS[record.brand] ?? '#2D4A6F'
  const stageMeta = STAGE_META[record.normalized_stage]

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 200 }} onClick={onClose} />
      <div className="drawer-enter" style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 540,
        background: '#fff', zIndex: 201, display: 'flex', flexDirection: 'column',
        boxShadow: '-4px 0 30px rgba(0,0,0,0.12)',
      }}>
        {/* Brand color strip */}
        <div style={{ height: 5, background: brandColor }} />

        {/* Header */}
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #E5E2DA' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                <StageBadge stage={record.normalized_stage} />
                <PriorityDot priority={record.priority} showLabel />
                {record.is_archived && <span style={{ background: '#F5F5F5', color: '#757575', borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>📁 Archived</span>}
              </div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1A1A2E', margin: '4px 0 2px' }}>{record.product_name}</h2>
              <div style={{ fontSize: 12, color: '#9C998F', fontFamily: 'monospace' }}>{record.internal_ref}</div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginLeft: 10 }}>
              {can('editRecords') && !editing && (
                <button onClick={() => setEditing(true)} style={{ padding: '5px 10px', background: '#F4F3EF', border: '1px solid #E5E2DA', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>✏️ Edit</button>
              )}
              {can('sendEmail') && (
                <button onClick={() => setShowNotify(true)} style={{ padding: '5px 10px', background: '#F4F3EF', border: '1px solid #E5E2DA', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>✉ Notify</button>
              )}
              {can('archive') && (
                <button onClick={handleArchive} style={{ padding: '5px 10px', background: '#F4F3EF', border: '1px solid #E5E2DA', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
                  {record.is_archived ? '📤 Restore' : '📁 Archive'}
                </button>
              )}
              {can('deleteRecords') && (
                <button onClick={handleDelete} style={{ padding: '5px 10px', background: '#FFF0F0', border: '1px solid #FFB8B8', borderRadius: 6, cursor: 'pointer', fontSize: 12, color: '#C0392B' }}>🗑</button>
              )}
              <button onClick={onClose} style={{ padding: '5px 10px', background: 'none', border: 'none', fontSize: 18, color: '#9C998F', cursor: 'pointer' }}>×</button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        {!editing && (
          <div style={{ display: 'flex', borderBottom: '1px solid #E5E2DA', padding: '0 18px' }}>
            {(['details', 'comments', 'history'] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer',
                fontWeight: tab === t ? 600 : 400, fontSize: 13,
                color: tab === t ? '#2D4A6F' : '#9C998F',
                borderBottom: tab === t ? '2px solid #2D4A6F' : '2px solid transparent',
                marginBottom: -1,
              }}>
                {t === 'details' ? 'Details' : t === 'comments' ? `Comments (${comments.length})` : 'History'}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {editing ? (
            <RecordForm
              initial={record}
              team={team}
              onSave={handleSave}
              onCancel={() => setEditing(false)}
              attachments={attachments}
              onUploadAttachment={can('editRecords') ? uploadFile : undefined}
              onDeleteAttachment={can('editRecords') ? deleteAttachment : undefined}
              uploading={uploading}
            />
          ) : tab === 'details' ? (
            <DetailsTab record={record} attachments={attachments} onStageChange={handleStageChange} onPriorityChange={handlePriorityChange} onUpload={handleUpload} onDeleteAttachment={deleteAttachment} onSetCover={setCoverImage} settingCover={settingCover} uploading={uploading} can={can} />
          ) : tab === 'comments' ? (
            <CommentsTab comments={comments} newComment={newComment} setNewComment={setNewComment} onPost={postComment} posting={postingComment} can={can} />
          ) : (
            <HistoryTab logs={logs} />
          )}
        </div>
      </div>

      {showNotify && (
        <NotifyModal record={record} team={team} senderName={profile?.full_name ?? ''} senderEmail={profile?.email ?? ''} onClose={() => setShowNotify(false)} />
      )}
    </>
  )
}

interface DetailsTabProps {
  record: LicRecord
  attachments: Attachment[]
  onStageChange: (stage: string) => void
  onPriorityChange: (priority: string) => void
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onDeleteAttachment: (att: Attachment) => void
  onSetCover: (att: Attachment) => void
  settingCover: string | null
  uploading: boolean
  can: (key: PermKey) => boolean
}

function DetailsTab({ record, attachments, onStageChange, onPriorityChange, onUpload, onDeleteAttachment, onSetCover, settingCover, uploading, can }: DetailsTabProps) {
  const kv = (label: string, val: React.ReactNode) => val ? (
    <div style={{ display: 'flex', gap: 8, padding: '7px 0', borderBottom: '1px solid #F0EDE8' }}>
      <span style={{ minWidth: 140, fontSize: 12, color: '#9C998F', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: '#1A1A2E', wordBreak: 'break-word' }}>{val}</span>
    </div>
  ) : null

  return (
    <div style={{ padding: '16px 18px' }}>
      {/* Stage / Priority controls */}
      {can('changeStage') && (
        <div style={{ marginBottom: 14, display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#9C998F', marginBottom: 4 }}>MOVE STAGE</div>
            <select value={record.normalized_stage} onChange={(e) => onStageChange(e.target.value)}
              style={{ width: '100%', padding: '7px 10px', border: '1px solid #E5E2DA', borderRadius: 7, fontSize: 13, background: '#FAFAF8', cursor: 'pointer' }}>
              {STAGES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          {(can('editPriority') || can('editRecords')) && (
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#9C998F', marginBottom: 4 }}>PRIORITY</div>
              <select value={record.priority} onChange={(e) => onPriorityChange(e.target.value)}
                style={{ width: '100%', padding: '7px 10px', border: '1px solid #E5E2DA', borderRadius: 7, fontSize: 13, background: '#FAFAF8', cursor: 'pointer' }}>
                {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Waiting On / Next Action highlight box */}
      {(record.waiting_on !== 'None' || record.next_action) && (
        <div style={{ background: '#FFFBF0', border: '1px solid #FFE082', borderRadius: 8, padding: 12, marginBottom: 14 }}>
          {record.waiting_on !== 'None' && (
            <div style={{ fontSize: 12, marginBottom: 4 }}>
              <span style={{ color: '#9C998F' }}>Waiting on: </span>
              <span style={{ fontWeight: 600, color: '#B87A2B' }}>{record.waiting_on}</span>
            </div>
          )}
          {record.next_action && (
            <div style={{ fontSize: 13, color: '#2B8B57', fontWeight: 500 }}>→ {record.next_action}</div>
          )}
        </div>
      )}

      {/* Fields */}
      <div>
        {kv('Brand', record.brand)}
        {kv('Property', record.property)}
        {kv('Product Type', record.product_type)}
        {kv('Gender', record.gender)}
        {kv('Owner', record.owner_name_snapshot)}
        {kv('Contact', record.contact_name)}
        {kv('Licensor Ref', record.main_licensor_ref ? <span style={{ fontFamily: 'monospace', color: '#4B52B8' }}>{record.main_licensor_ref}</span> : null)}
        {kv('Samples', record.samples_requested_qty > 0 ? `${record.samples_requested_qty} pcs` : null)}
        {kv('Submission', fmtDate(record.submission_date))}
        {kv('Concept Approval', fmtDate(record.concept_approval_date))}
        {kv('PPS Photos', fmtDate(record.pps_photos_date))}
        {kv('PPS Approval', fmtDate(record.pps_approval_date))}
        {kv('Sample Sent', fmtDate(record.sample_sent_date))}
        {kv('Sample Approval', fmtDate(record.sample_approval_date))}
        {record.tech_pack_link && kv('Tech Pack', <a href={record.tech_pack_link} target="_blank" rel="noopener noreferrer" style={{ color: '#2D4A6F' }}>Open ↗</a>)}
        {record.additional_link && kv('Additional Link', <a href={record.additional_link} target="_blank" rel="noopener noreferrer" style={{ color: '#2D4A6F' }}>Open ↗</a>)}
      </div>

      {record.notes_summary && (
        <div style={{ marginTop: 14, background: '#F4F3EF', borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#9C998F', marginBottom: 6 }}>NOTES</div>
          <p style={{ fontSize: 13, color: '#3A3A4A', lineHeight: 1.6 }}>{record.notes_summary}</p>
        </div>
      )}

      {record.licensor_feedback && (
        <div style={{ marginTop: 10, background: '#FFF5EB', border: '1px solid #FFD9A8', borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#B87A2B', marginBottom: 6 }}>LICENSOR FEEDBACK</div>
          <p style={{ fontSize: 13, color: '#5A4020', lineHeight: 1.6 }}>{record.licensor_feedback}</p>
        </div>
      )}

      {/* Attachments */}
      <div style={{ marginTop: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#9C998F' }}>ATTACHMENTS ({attachments.length})</div>
          {can('editRecords') && (
            <label style={{ fontSize: 12, color: '#2D4A6F', cursor: 'pointer', fontWeight: 600 }}>
              {uploading ? 'Uploading…' : '+ Upload'}
              <input type="file" accept={ACCEPTED} onChange={onUpload} style={{ display: 'none' }} />
            </label>
          )}
        </div>
        {attachments.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {attachments.map((att) => (
              <div key={att.id} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {att.file_type?.startsWith('image/') ? (
                  <div style={{ position: 'relative' }}>
                    <a href={att.public_url} target="_blank" rel="noopener noreferrer">
                      <img
                        src={att.public_url}
                        alt={att.file_name}
                        style={{
                          width: 80, height: 80, objectFit: 'cover', borderRadius: 8, display: 'block',
                          border: att.is_primary ? '2px solid #AA9682' : '1px solid #E5E2DA',
                          boxShadow: att.is_primary ? '0 0 0 3px rgba(170,150,130,0.2)' : 'none',
                        }}
                      />
                    </a>
                    {att.is_primary && (
                      <span style={{ position: 'absolute', bottom: 4, left: 4, background: '#AA9682', color: '#fff', fontSize: 9, fontWeight: 700, borderRadius: 4, padding: '1px 5px', letterSpacing: '0.05em' }}>COVER</span>
                    )}
                  </div>
                ) : (
                  <a href={att.public_url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                    <div style={{ width: 80, height: 80, background: '#F4F3EF', border: '1px solid #E5E2DA', borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                      <span style={{ fontSize: 22 }}>📎</span>
                      <span style={{ fontSize: 9, color: '#9C998F', textAlign: 'center', padding: '0 4px' }}>{att.file_name.split('.').pop()?.toUpperCase()}</span>
                    </div>
                  </a>
                )}

                {/* Action buttons below each attachment */}
                {can('editRecords') && (
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                    {att.file_type?.startsWith('image/') && !att.is_primary && (
                      <button
                        onClick={() => onSetCover(att)}
                        disabled={settingCover === att.id}
                        title="Set as table thumbnail"
                        style={{ padding: '2px 6px', background: '#F5EFE9', border: '1px solid #D8C8B8', borderRadius: 4, fontSize: 9, fontWeight: 600, cursor: 'pointer', color: '#AA9682', whiteSpace: 'nowrap' }}
                      >
                        {settingCover === att.id ? '…' : '⭐ Cover'}
                      </button>
                    )}
                    <button
                      onClick={() => onDeleteAttachment(att)}
                      title="Delete"
                      style={{ padding: '2px 6px', background: '#FFF0F0', border: '1px solid #FFB8B8', borderRadius: 4, fontSize: 9, cursor: 'pointer', color: '#A35C5C' }}
                    >
                      🗑
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface CommentsTabProps {
  comments: Comment[]
  newComment: string
  setNewComment: (v: string) => void
  onPost: () => void
  posting: boolean
  can: (key: PermKey) => boolean
}

function CommentsTab({ comments, newComment, setNewComment, onPost, posting, can }: CommentsTabProps) {
  return (
    <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {can('addComments') && (
        <div style={{ display: 'flex', gap: 8 }}>
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment…"
            style={{ flex: 1, padding: '8px 10px', border: '1px solid #E5E2DA', borderRadius: 8, fontSize: 13, resize: 'none', minHeight: 72, outline: 'none' }}
          />
          <button onClick={onPost} disabled={posting || !newComment.trim()}
            style={{ padding: '8px 14px', background: '#2D4A6F', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13, alignSelf: 'flex-end' }}>
            Post
          </button>
        </div>
      )}
      {comments.length === 0 && <p style={{ color: '#9C998F', fontSize: 13, textAlign: 'center', padding: 20 }}>No comments yet.</p>}
      {comments.map((c: Comment) => (
        <div key={c.id} style={{ background: '#F4F3EF', borderRadius: 8, padding: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontWeight: 600, fontSize: 13 }}>{c.author_name}</span>
            <span style={{ fontSize: 11, color: '#9C998F' }}>{new Date(c.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <p style={{ fontSize: 13, color: '#3A3A4A', lineHeight: 1.5 }}>{c.comment_text}</p>
        </div>
      ))}
    </div>
  )
}

function HistoryTab({ logs }: { logs: ActivityLog[] }) {
  const icon: Record<string, string> = {
    record_created: '🆕', updated: '✏️', stage_changed: '➡️',
    priority_changed: '🎯', comment: '💬', archive_toggled: '📁',
  }
  return (
    <div style={{ padding: 18 }}>
      {logs.length === 0 && <p style={{ color: '#9C998F', fontSize: 13, textAlign: 'center', padding: 20 }}>No history yet.</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {logs.map((l) => (
          <div key={l.id} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid #F0EDE8' }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>{icon[l.action_type] ?? '📝'}</span>
            <div style={{ flex: 1 }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>{l.user_name || 'System'}</span>
              <span style={{ color: '#5A5A6A', fontSize: 13 }}> {l.action_type.replace(/_/g, ' ')}</span>
              {l.old_value && l.new_value && (
                <span style={{ fontSize: 12, color: '#9C998F' }}> · {l.old_value} → {l.new_value}</span>
              )}
              {!l.old_value && l.new_value && (
                <span style={{ fontSize: 12, color: '#9C998F' }}> · {l.new_value}</span>
              )}
              <div style={{ fontSize: 11, color: '#B8B5AD', marginTop: 2 }}>
                {new Date(l.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
