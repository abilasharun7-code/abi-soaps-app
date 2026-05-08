import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const ALL_PERMS = ['dashboard','inventory','batches','products','clients','sales','expenses','status','account']
const PERM_LABELS = { dashboard:'Dashboard', inventory:'Raw Materials', batches:'Batch Production', products:'Products', clients:'Clients', sales:'Sales', expenses:'Expenses', status:'System Status', account:'Account' }

const emptyUser = { username:'', password:'', name:'', email:'', phone:'', role:'staff', permissions: Object.fromEntries(ALL_PERMS.map(p => [p, ['dashboard','batches','products','clients','sales'].includes(p)])) }

export default function Users({ user: currentUser }) {
  const [users, setUsers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]   = useState(false)
  const [form, setForm]     = useState(emptyUser)
  const [saving, setSaving] = useState(false)
  const [showPass, setShowPass] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('app_users').select('*').order('created_at')
    setUsers(data || [])
    setLoading(false)
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setPerm = (k, v) => setForm(f => ({ ...f, permissions: { ...f.permissions, [k]: v } }))

  async function save() {
    if (!form.username || !form.password || !form.name) return alert('Fill username, password and name')
    setSaving(true)
    const p = { username: form.username.toLowerCase(), password: form.password, name: form.name, email: form.email, phone: form.phone, role: form.role, permissions: form.permissions }
    if (form.id) await supabase.from('app_users').update(p).eq('id', form.id)
    else         await supabase.from('app_users').insert(p)
    setSaving(false); setModal(false); load()
  }

  async function del(id) {
    if (id === currentUser?.id) return alert('Cannot delete your own account')
    if (!confirm('Delete this user?')) return
    await supabase.from('app_users').delete().eq('id', id); load()
  }

  return (
    <div>
      <div className="stats-grid" style={{ gridTemplateColumns:'repeat(3,1fr)', marginBottom:24 }}>
        <div className="stat-card"><div className="stat-top"><div className="stat-icon-box si-accent">👥</div></div><div className="stat-label">Total Users</div><div className="stat-value" style={{ fontSize:24 }}>{users.length}</div></div>
        <div className="stat-card"><div className="stat-top"><div className="stat-icon-box si-purple">👑</div></div><div className="stat-label">Owners</div><div className="stat-value" style={{ fontSize:24 }}>{users.filter(u=>u.role==='owner').length}</div></div>
        <div className="stat-card"><div className="stat-top"><div className="stat-icon-box si-blue">🧑‍💼</div></div><div className="stat-label">Staff</div><div className="stat-value" style={{ fontSize:24 }}>{users.filter(u=>u.role==='staff').length}</div></div>
      </div>

      <div className="card">
        <div className="card-head"><h3>👥 User Accounts</h3><span className="card-head-right">{users.length} users</span></div>
        {loading ? <div className="loading">Loading...</div> :
          <table>
            <thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Phone</th><th>Email</th><th>Access</th><th></th></tr></thead>
            <tbody>
              {users.map(u => {
                const permCount = Object.values(u.permissions || {}).filter(Boolean).length
                return (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ width:32, height:32, borderRadius:'50%', background:'var(--accent-dim)', border:'1.5px solid var(--border3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:900, color:'var(--accent)', flexShrink:0 }}>
                          {u.name?.[0]?.toUpperCase()}
                        </div>
                        <b style={{ fontWeight:700 }}>{u.name}</b>
                        {u.username === currentUser?.username && <span className="badge b-green" style={{ fontSize:9 }}>YOU</span>}
                      </div>
                    </td>
                    <td><code style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--text2)' }}>@{u.username}</code></td>
                    <td><span className={`badge ${u.role==='owner'?'b-purple':'b-blue'}`}>{u.role==='owner'?'👑 Owner':'🧑‍💼 Staff'}</span></td>
                    <td style={{ fontSize:12, color:'var(--text2)' }}>{u.phone||'—'}</td>
                    <td style={{ fontSize:12, color:'var(--text2)' }}>{u.email||'—'}</td>
                    <td><span className="badge b-accent">{permCount}/{ALL_PERMS.length} pages</span></td>
                    <td>
                      <div style={{ display:'flex', gap:6 }}>
                        <button className="btn-edit" onClick={() => { setForm({ ...emptyUser, ...u, permissions: { ...emptyUser.permissions, ...(u.permissions||{}) } }); setModal(true) }}>Edit</button>
                        {u.username !== currentUser?.username && <button className="btn-del" onClick={() => del(u.id)}>Del</button>}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        }
      </div>

      {modal && (
        <div className="modal-bg" onClick={e => e.target.className==='modal-bg'&&setModal(false)}>
          <div className="modal" style={{ width:560, maxHeight:'85vh' }}>
            <h3>👤 {form.id ? 'Edit User' : 'Add New User'}</h3>

            <div className="form-grid">
              <div className="form-row"><label>Full Name *</label><input value={form.name} onChange={e=>set('name',e.target.value)} placeholder="e.g. Ravi Kumar" /></div>
              <div className="form-row"><label>Role</label>
                <select value={form.role} onChange={e=>set('role',e.target.value)}>
                  <option value="staff">Staff (limited access)</option>
                  <option value="owner">Owner (full access)</option>
                </select>
              </div>
            </div>
            <div className="form-grid">
              <div className="form-row"><label>Username *</label><input value={form.username} onChange={e=>set('username',e.target.value)} placeholder="e.g. ravi" /></div>
              <div className="form-row">
                <label>Password *</label>
                <div style={{ display:'flex', gap:6 }}>
                  <input type={showPass?'text':'password'} value={form.password} onChange={e=>set('password',e.target.value)} placeholder="Set password" style={{ flex:1 }} />
                  <button className="btn-edit" onClick={()=>setShowPass(s=>!s)} style={{ whiteSpace:'nowrap' }}>{showPass?'Hide':'Show'}</button>
                </div>
              </div>
            </div>
            <div className="form-grid">
              <div className="form-row"><label>Phone</label><input value={form.phone||''} onChange={e=>set('phone',e.target.value)} placeholder="9XXXXXXXXX" /></div>
              <div className="form-row"><label>Email</label><input value={form.email||''} onChange={e=>set('email',e.target.value)} placeholder="email@example.com" /></div>
            </div>

            <div style={{ marginTop:4, marginBottom:16 }}>
              <div style={{ fontSize:10, fontWeight:800, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.12em', marginBottom:12 }}>Page Access Permissions</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                {ALL_PERMS.map(p => (
                  <label key={p} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', background:'var(--surface2)', borderRadius:'var(--r)', border:`1px solid ${form.permissions[p]?'var(--border3)':'var(--border)'}`, cursor:'pointer', transition:'all .15s' }}>
                    <input type="checkbox" checked={!!form.permissions[p]} onChange={e=>setPerm(p,e.target.checked)} style={{ accentColor:'var(--accent)' }} />
                    <span style={{ fontSize:12, fontWeight:700, color:form.permissions[p]?'var(--accent)':'var(--text2)' }}>{PERM_LABELS[p]}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-cancel" onClick={()=>setModal(false)}>Cancel</button>
              <button className="btn-save" onClick={save} disabled={saving}>{saving?'Saving...':'Save User'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
