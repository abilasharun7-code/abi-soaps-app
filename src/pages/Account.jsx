import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Account({ user, onLogout, onUpdateUser }) {
  const [editing, setEditing]   = useState(null)
  const [editVal, setEditVal]   = useState('')
  const [saved, setSaved]       = useState(false)
  const [saving, setSaving]     = useState(false)
  const [dbMsg, setDbMsg]       = useState('')
  const [changingPass, setChangingPass] = useState(false)
  const [newPass, setNewPass]   = useState('')
  const [passMsg, setPassMsg]   = useState('')

  function startEdit(field, val) {
    setEditing(field)
    setEditVal(val || '')
    setDbMsg('')
  }

  async function saveEdit() {
    setSaving(true)
    setDbMsg('')

    console.log('Updating username:', user.username, 'field:', editing, 'value:', editVal)

    const { data, error } = await supabase
      .from('app_users')
      .update({ [editing]: editVal })
      .eq('username', user.username)
      .select()

    console.log('Supabase response - data:', data, 'error:', error)

    if (error) {
      setDbMsg('DB Error: ' + error.message + ' (Code: ' + error.code + ')')
      setSaving(false)
      return
    }

    if (!data || data.length === 0) {
      setDbMsg('Warning: No rows were updated. Username might not match.')
      setSaving(false)
      return
    }

    const updated = { ...user, [editing]: editVal }
    localStorage.setItem('abi_user', JSON.stringify(updated))
    onUpdateUser(updated)
    setEditing(null)
    setSaving(false)
    setSaved(true)
    setDbMsg('Saved!')
    setTimeout(() => { setSaved(false); setDbMsg('') }, 3000)
  }

  async function changePassword() {
    if (!newPass || newPass.length < 3) return setPassMsg('Password must be at least 3 characters')
    setSaving(true)

    const { data, error } = await supabase
      .from('app_users')
      .update({ password: newPass })
      .eq('username', user.username)
      .select()

    if (error) {
      setPassMsg('Error: ' + error.message)
      setSaving(false)
      return
    }

    const updated = { ...user, password: newPass }
    localStorage.setItem('abi_user', JSON.stringify(updated))
    onUpdateUser(updated)
    setNewPass('')
    setChangingPass(false)
    setSaving(false)
    setPassMsg('')
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const fields = [
    { key: 'name',     label: 'Full Name',     icon: '👤' },
    { key: 'email',    label: 'Email Address', icon: '✉️' },
    { key: 'phone',    label: 'Phone Number',  icon: '📞' },
    { key: 'location', label: 'Location',      icon: '📍' },
  ]

  const perms = user.permissions || {}
  const permLabels = {
    dashboard: 'Dashboard', inventory: 'Raw Materials', batches: 'Production',
    products: 'Products', clients: 'Clients', sales: 'Sales',
    expenses: 'Expenses', status: 'Settings', account: 'Account'
  }

  return (
    <div>
      {saved && (
        <div style={{ background:'var(--green-dim)', border:'1px solid rgba(0,200,100,.3)', borderRadius:'var(--rl)', padding:'12px 18px', fontSize:13, color:'var(--green)', marginBottom:18, fontWeight:700 }}>
          Saved to database successfully!
        </div>
      )}
      {dbMsg && !saved && (
        <div style={{ background:'var(--red-dim)', border:'1px solid rgba(220,60,80,.3)', borderRadius:'var(--rl)', padding:'12px 18px', fontSize:13, color:'var(--red)', marginBottom:18, fontWeight:700 }}>
          {dbMsg}
        </div>
      )}

      <div className="account-grid">
        <div>
          <div className="card" style={{ padding:24, textAlign:'center' }}>
            <div style={{ display:'flex', justifyContent:'center' }}>
              <div className="avatar-circle">{user.name?.[0]?.toUpperCase() || 'A'}</div>
            </div>
            <div className="account-name">{user.name}</div>
            <div className="account-role">{user.role}</div>
            <div style={{ marginTop:16, padding:'12px 0', borderTop:'1px solid var(--border)' }}>
              <div style={{ fontSize:10, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:8, fontWeight:800 }}>Business</div>
              <div style={{ fontSize:14, fontWeight:700, color:'var(--text)' }}>Abi & Muthu Soaps</div>
              <div style={{ fontSize:12, color:'var(--text3)', marginTop:3 }}>Tamil Nadu, India</div>
            </div>
            <div style={{ marginTop:14, display:'flex', gap:6, justifyContent:'center', flexWrap:'wrap' }}>
              <span className="badge b-accent">Abi Soaps</span>
              <span className="badge b-amber">Muthu Soap</span>
            </div>
          </div>

          <div className="card" style={{ padding:20 }}>
            <div style={{ fontSize:10, fontWeight:800, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:14 }}>Access Level</div>
            {Object.entries(permLabels).map(([key, label]) => (
              <div key={key} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid var(--border)', fontSize:13 }}>
                <span style={{ color:'var(--text2)', fontWeight:600 }}>{label}</span>
                <span className={perms[key] ? 'badge b-green' : 'badge b-red'} style={{ fontSize:10 }}>
                  {perms[key] ? 'Full' : 'No Access'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="card">
            <div className="card-head"><h3>Profile Information</h3><span className="card-head-right">Logged in as: {user.username}</span></div>
            <div style={{ padding:'4px 0' }}>
              {fields.map(f => (
                <div key={f.key} className="info-row" style={{ padding:'14px 22px' }}>
                  <span style={{ fontSize:18, width:28, flexShrink:0 }}>{f.icon}</span>
                  <span className="info-label">{f.label}</span>
                  {editing === f.key ? (
                    <div style={{ flex:1, display:'flex', gap:8 }}>
                      <input
                        value={editVal}
                        onChange={e => setEditVal(e.target.value)}
                        style={{ flex:1, padding:'8px 12px', fontSize:13, borderRadius:'var(--rl)', border:'1px solid var(--accent)', background:'var(--surface2)', color:'var(--text)', fontFamily:'var(--font)', outline:'none' }}
                        onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditing(null) }}
                        autoFocus
                      />
                      <button className="btn-save" style={{ padding:'6px 14px', fontSize:12 }} onClick={saveEdit} disabled={saving}>
                        {saving ? '...' : 'Save'}
                      </button>
                      <button className="btn-cancel" style={{ padding:'6px 12px', fontSize:12 }} onClick={() => setEditing(null)}>Cancel</button>
                    </div>
                  ) : (
                    <>
                      <span className="info-value">{user[f.key] || <span style={{ color:'var(--text3)' }}>Not set</span>}</span>
                      <button className="info-edit" onClick={() => startEdit(f.key, user[f.key])}>Edit</button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-head"><h3>Security</h3></div>
            <div style={{ padding:'4px 0' }}>
              <div className="info-row" style={{ padding:'14px 22px' }}>
                <span className="info-label">Username</span>
                <span className="info-value" style={{ fontFamily:'var(--mono)', fontWeight:700 }}>{user.username}</span>
              </div>
              <div className="info-row" style={{ padding:'14px 22px' }}>
                <span className="info-label">Password</span>
                {changingPass ? (
                  <div style={{ flex:1, display:'flex', flexDirection:'column', gap:8 }}>
                    <div style={{ display:'flex', gap:8 }}>
                      <input
                        type="text"
                        value={newPass}
                        onChange={e => setNewPass(e.target.value)}
                        placeholder="Enter new password"
                        style={{ flex:1, padding:'8px 12px', fontSize:13, borderRadius:'var(--rl)', border:'1px solid var(--accent)', background:'var(--surface2)', color:'var(--text)', fontFamily:'var(--font)', outline:'none' }}
                      />
                      <button className="btn-save" style={{ padding:'6px 14px', fontSize:12 }} onClick={changePassword} disabled={saving}>{saving ? '...' : 'Update'}</button>
                      <button className="btn-cancel" style={{ padding:'6px 12px', fontSize:12 }} onClick={() => { setChangingPass(false); setPassMsg('') }}>Cancel</button>
                    </div>
                    {passMsg && <div style={{ fontSize:12, color:'var(--red)', fontWeight:700 }}>{passMsg}</div>}
                  </div>
                ) : (
                  <>
                    <span className="info-value">••••••••</span>
                    <button className="info-edit" onClick={() => setChangingPass(true)}>Change</button>
                  </>
                )}
              </div>
              <div className="info-row" style={{ padding:'14px 22px' }}>
                <span className="info-label">Last Login</span>
                <span className="info-value" style={{ fontSize:12, color:'var(--text3)' }}>{new Date().toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-head"><h3>Danger Zone</h3></div>
            <div style={{ padding:22 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:'var(--text)' }}>Sign Out</div>
                  <div style={{ fontSize:12, color:'var(--text3)', marginTop:3, fontWeight:600 }}>You will be returned to the login page</div>
                </div>
                <button
                  onClick={() => { if (confirm('Sign out?')) { localStorage.removeItem('abi_user'); onLogout() } }}
                  style={{ padding:'10px 20px', background:'var(--red-dim)', border:'1px solid rgba(220,60,80,.3)', borderRadius:'var(--rl)', color:'var(--red)', fontSize:13, fontFamily:'var(--font)', fontWeight:700, cursor:'pointer' }}
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
