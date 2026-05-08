import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [showPass, setShowPass] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    if (!username || !password) return setError('Please enter username and password')
    setLoading(true)
    setError('')

    const uname = username.toLowerCase().trim()
    const pass  = password.trim()

    // First try Supabase app_users table
    try {
      const { data, error: dbErr } = await supabase
        .from('app_users')
        .select('*')
        .eq('username', uname)
        .eq('password', pass)
        .single()

      if (data && !dbErr) {
        localStorage.setItem('abi_user', JSON.stringify(data))
        onLogin(data)
        setLoading(false)
        return
      }
    } catch (err) {
      console.log('DB login failed, trying fallback:', err)
    }

    // Fallback: hardcoded users (works even if DB fails)
    const USERS = [
      {
        id: 'owner-1',
        username: 'abilash',
        password: 'abi',
        name: 'Abilash',
        email: 'abilash@abisoaps.com',
        phone: '+91 98765 43210',
        role: 'owner',
        permissions: {
          dashboard: true, inventory: true, batches: true,
          products: true, clients: true, sales: true,
          expenses: true, status: true, account: true
        }
      }
    ]

    const found = USERS.find(u => u.username === uname && u.password === pass)
    if (found) {
      localStorage.setItem('abi_user', JSON.stringify(found))
      onLogin(found)
    } else {
      setError('Invalid username or password')
    }

    setLoading(false)
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-box">A</div>
          <div>
            <div className="login-logo-text">Abi & Muthu Soaps</div>
            <div className="login-logo-sub">Business Management System</div>
          </div>
        </div>
        <div className="login-title">Welcome back</div>
        <div className="login-sub">Sign in to access your business dashboard</div>

        {error && <div className="login-error">⚠ {error}</div>}

        <form onSubmit={handleLogin}>
          <div className="login-form-row">
            <label>Username</label>
            <input
              value={username}
              onChange={e => { setUsername(e.target.value); setError('') }}
              placeholder="Enter your username"
              autoComplete="username"
            />
          </div>
          <div className="login-form-row">
            <label>Password</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                placeholder="Enter your password"
                autoComplete="current-password"
                style={{ flex: 1 }}
              />
              <button
                type="button"
                onClick={() => setShowPass(s => !s)}
                style={{ padding: '0 14px', background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 'var(--rl)', color: 'var(--text2)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font)', fontWeight: 700 }}
              >
                {showPass ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          <button className="login-btn" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : '→ Sign In'}
          </button>
        </form>

        <div className="login-footer">Abi Soaps Business Manager · Private Access Only</div>
      </div>
    </div>
  )
}
