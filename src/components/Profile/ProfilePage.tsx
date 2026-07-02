import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useStore } from '../../store'
import { useAuth } from '../../hooks/useAuth'
import type { SavedPattern } from '../../types'

interface CloudPattern {
  id: string
  title: string
  bpm: number
  created_at: string
  pattern_json: string
  profiles?: { username: string }
}

export default function ProfilePage() {
  const { user, profile } = useStore()
  const { signOut } = useAuth()
  const [patterns, setPatterns] = useState<CloudPattern[]>([])
  const [feed, setFeed] = useState<CloudPattern[]>([])
  const [loading, setLoading] = useState(true)
  const [saveTitle, setSaveTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [bio, setBio] = useState(profile?.bio ?? '')
  const [editingBio, setEditingBio] = useState(false)
  const { tracks, notes, bpm, pads, setBpm, loadTracks, loadNotes, loadPads } = useStore()

  useEffect(() => { if (user) loadAll() }, [user])
  useEffect(() => { setBio(profile?.bio ?? '') }, [profile])

  async function loadAll() {
    setLoading(true)
    const [mine, everyone] = await Promise.all([
      supabase.from('patterns').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }),
      supabase.from('patterns').select('*').order('created_at', { ascending: false }).limit(30),
    ])
    if (mine.error) { setSaveError('Load error: ' + mine.error.message); setLoading(false); return }
    console.log('my patterns raw:', mine.data, 'user_id:', user!.id)
    // Fetch usernames separately to avoid FK join issues
    const allPatterns = [...(mine.data ?? []), ...(everyone.data ?? [])]
    const userIds = [...new Set(allPatterns.map((p) => p.user_id))]
    const { data: profileRows } = userIds.length > 0
      ? await supabase.from('profiles').select('id, username').in('id', userIds)
      : { data: [] }
    const usernameMap = Object.fromEntries((profileRows ?? []).map((p) => [p.id, p.username]))

    const withUser = (rows: typeof allPatterns) =>
      rows.map((p) => ({ ...p, profiles: { username: usernameMap[p.user_id] ?? 'Unknown' } }))

    setPatterns(withUser(mine.data ?? []))
    setFeed(withUser(everyone.data ?? []))
    setLoading(false)
  }

  async function saveToCloud() {
    if (!saveTitle.trim() || !user) return
    setSaving(true)
    setSaveError('')
    const pattern: SavedPattern = { bpm, tracks, notes, pads }
    const { error } = await supabase.from('patterns').insert({
      user_id: user.id,
      title: saveTitle.trim(),
      bpm,
      pattern_json: JSON.stringify(pattern),
    })
    if (error) {
      setSaveError(error.message)
      setSaving(false)
      return
    }
    setSaveTitle('')
    await loadAll()
    setSaving(false)
  }

  async function loadFromCloud(p: CloudPattern) {
    const data: SavedPattern = JSON.parse(p.pattern_json)
    if (data.bpm) setBpm(data.bpm)
    if (data.tracks) loadTracks(data.tracks)
    if (data.notes) loadNotes(data.notes)
    if (data.pads) loadPads(data.pads)
  }

  async function deletePattern(id: string) {
    await supabase.from('patterns').delete().eq('id', id)
    setPatterns((p) => p.filter((x) => x.id !== id))
  }

  async function saveBio() {
    if (!user) return
    await supabase.from('profiles').update({ bio }).eq('id', user.id)
    setEditingBio(false)
  }

  if (!user) return (
    <div className="profile-page">
      <div className="profile-empty">
        <p>Sign in to save your patterns to the cloud and share with others.</p>
      </div>
    </div>
  )

  const initial = profile?.username?.[0]?.toUpperCase() ?? '?'

  return (
    <div className="profile-page">
      {/* Profile header */}
      <div className="profile-header-card">
        <div className="profile-avatar">{initial}</div>
        <div className="profile-info">
          <h2>{profile?.username ?? user.email}</h2>
          <p className="profile-email">{user.email}</p>
          {editingBio ? (
            <div className="bio-edit">
              <input value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell the world what you make…" className="bio-input" />
              <button className="btn-primary" onClick={saveBio}>Save</button>
              <button className="btn-secondary" onClick={() => setEditingBio(false)}>Cancel</button>
            </div>
          ) : (
            <p className="profile-bio" onClick={() => setEditingBio(true)}>
              {bio || <span className="bio-placeholder">Click to add a bio…</span>}
            </p>
          )}
        </div>
        <button className="btn-secondary sign-out-btn" onClick={signOut}>Sign Out</button>
      </div>

      {/* Save current pattern */}
      <div className="profile-section">
        <h3>Save Current Pattern</h3>
        <div className="save-pattern-row">
          <input
            className="save-title-input"
            placeholder="Name this pattern…"
            value={saveTitle}
            onChange={(e) => setSaveTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && saveToCloud()}
          />
          <button className="btn-primary" onClick={saveToCloud} disabled={saving || !saveTitle.trim()}>
            {saving ? 'Saving…' : '☁ Save to Cloud'}
          </button>
        </div>
        {saveError && <p style={{ color: '#e74c3c', fontSize: 12, marginTop: 6 }}>Error: {saveError}</p>}
      </div>

      {/* My patterns */}
      <div className="profile-section">
        <h3>My Patterns</h3>
        {loading ? <p className="loading-text">Loading…</p> : patterns.length === 0 ? (
          <p className="empty-text">No saved patterns yet.</p>
        ) : (
          <div className="pattern-list">
            {patterns.map((p) => (
              <div key={p.id} className="pattern-card">
                <div className="pattern-card-info">
                  <span className="pattern-card-title">{p.title}</span>
                  <span className="pattern-card-meta">{p.bpm} BPM · {new Date(p.created_at).toLocaleDateString()}</span>
                </div>
                <div className="pattern-card-actions">
                  <button className="btn-primary" onClick={() => loadFromCloud(p)}>Load</button>
                  <button className="btn-danger-sm" onClick={() => deletePattern(p.id)}>✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Community feed */}
      <div className="profile-section">
        <h3>Community Patterns</h3>
        {loading ? <p className="loading-text">Loading…</p> : feed.length === 0 ? (
          <p className="empty-text">No community patterns yet. Be the first!</p>
        ) : (
          <div className="pattern-list">
            {feed.map((p) => (
              <div key={p.id} className="pattern-card">
                <div className="pattern-card-info">
                  <span className="pattern-card-title">{p.title}</span>
                  <span className="pattern-card-meta">
                    by <strong>{(p.profiles as { username: string } | undefined)?.username ?? 'Unknown'}</strong> · {p.bpm} BPM · {new Date(p.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="pattern-card-actions">
                  <button className="btn-primary" onClick={() => loadFromCloud(p)}>Load</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
