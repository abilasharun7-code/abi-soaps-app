import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Status() {
  const [checks, setChecks] = useState({
    supabase: 'checking',
    anthropic: 'checking',
    tables: {},
    latency: null,
  })

  useEffect(() => { runChecks() }, [])

  async function runChecks() {
    // Check Supabase
    const t0 = Date.now()
    try {
      const { error } = await supabase.from('sales').select('id').limit(1)
      const latency = Date.now() - t0
      setChecks(c => ({ ...c, supabase: error ? 'error' : 'ok', latency }))
    } catch {
      setChecks(c => ({ ...c, supabase: 'error' }))
    }

    // Check each table
    const tables = ['inventory', 'batches', 'clients', 'sales', 'expenses']
    const tableResults = {}
    for (const t of tables) {
      try {
        const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true })
        tableResults[t] = error ? { status: 'error', count: 0 } : { status: 'ok', count: count || 0 }
      } catch {
        tableResults[t] = { status: 'error', count: 0 }
      }
    }
    setChecks(c => ({ ...c, tables: tableResults }))

    // Check Anthropic API key
    const key = import.meta.env.VITE_ANTHROPIC_KEY
    if (!key || key === 'your_anthropic_api_key_here' || key.length < 20) {
      setChecks(c => ({ ...c, anthropic: 'missing' }))
    } else {
      setChecks(c => ({ ...c, anthropic: 'ok' }))
    }
  }

  const statusBadge = (s) => {
    if (s === 'checking') return <span className="badge b-amber">● Checking...</span>
    if (s === 'ok') return <span className="badge b-green">● Connected</span>
    if (s === 'missing') return <span className="badge b-amber">⚠ Key Missing</span>
    return <span className="badge b-red">✕ Error</span>
  }

  const dot = (s) => {
    if (s === 'checking') return 'sd-amber'
    if (s === 'ok') return 'sd-green'
    return 'sd-red'
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'Not set'
  const anthropicKey = import.meta.env.VITE_ANTHROPIC_KEY
  const keyDisplay = anthropicKey && anthropicKey.length > 10
    ? anthropicKey.slice(0, 12) + '••••••••' + anthropicKey.slice(-4)
    : 'Not configured'

  return (
    <div>
      {/* Overall Status Banner */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: checks.supabase === 'ok' ? 'var(--green-dim)' : 'var(--amber-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
            {checks.supabase === 'ok' ? '✅' : '⚠️'}
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
              {checks.supabase === 'ok' ? 'All Systems Operational' : 'Checking Systems...'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
              {checks.latency ? `Database response: ${checks.latency}ms` : 'Running diagnostics...'}
            </div>
          </div>
          <button className="btn" style={{ marginLeft: 'auto' }} onClick={runChecks}>↻ Refresh</button>
        </div>
      </div>

      <div className="grid-2">
        {/* Connection Status */}
        <div className="card">
          <div className="card-head"><h3>🔌 Connections</h3></div>
          <div style={{ padding: '8px 0' }}>
            <div className="info-row" style={{ padding: '14px 20px' }}>
              <span className={`status-dot ${dot(checks.supabase)}`}></span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>Supabase Database</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2, fontFamily: 'var(--mono)' }}>{supabaseUrl.replace('https://', '').slice(0, 30)}...</div>
              </div>
              {statusBadge(checks.supabase)}
            </div>
            <div className="info-row" style={{ padding: '14px 20px' }}>
              <span className={`status-dot ${dot(checks.anthropic)}`}></span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>Anthropic Claude AI</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2, fontFamily: 'var(--mono)' }}>{keyDisplay}</div>
              </div>
              {statusBadge(checks.anthropic)}
            </div>
          </div>
          {checks.anthropic === 'missing' && (
            <div style={{ margin: '0 20px 16px', background: 'var(--amber-dim)', border: '1px solid rgba(210,153,34,0.3)', borderRadius: 'var(--r)', padding: '12px 14px', fontSize: 12, color: 'var(--amber)', lineHeight: 1.6 }}>
              ⚠️ <b>AI Assistant not configured.</b> Add your Anthropic API key to the <code style={{ background: 'var(--surface3)', padding: '1px 5px', borderRadius: 4 }}>.env</code> file:<br />
              <code style={{ display: 'block', marginTop: 8, background: 'var(--surface3)', padding: '6px 10px', borderRadius: 4, fontFamily: 'var(--mono)', color: 'var(--text)' }}>VITE_ANTHROPIC_KEY=sk-ant-api03-...</code>
              Then restart <code style={{ background: 'var(--surface3)', padding: '1px 5px', borderRadius: 4 }}>npm run dev</code>
            </div>
          )}
        </div>

        {/* Environment Config */}
        <div className="card">
          <div className="card-head"><h3>⚙️ Configuration</h3></div>
          <div style={{ padding: '4px 0' }}>
            {[
              { label: 'App Version', value: 'v2.0.0' },
              { label: 'Environment', value: 'Development (localhost)' },
              { label: 'Supabase URL', value: supabaseUrl !== 'Not set' ? '✓ Set' : '✕ Missing', ok: supabaseUrl !== 'Not set' },
              { label: 'Supabase Key', value: import.meta.env.VITE_SUPABASE_KEY ? '✓ Set' : '✕ Missing', ok: !!import.meta.env.VITE_SUPABASE_KEY },
              { label: 'Anthropic Key', value: checks.anthropic === 'ok' ? '✓ Set' : '✕ Missing', ok: checks.anthropic === 'ok' },
              { label: 'DB Latency', value: checks.latency ? `${checks.latency}ms` : 'Measuring...' },
            ].map(r => (
              <div key={r.label} className="info-row" style={{ padding: '10px 20px' }}>
                <span className="info-label">{r.label}</span>
                <span className="info-value" style={{ fontFamily: 'var(--mono)', fontSize: 12, color: r.ok === false ? 'var(--red)' : r.ok === true ? 'var(--green)' : 'var(--text)' }}>
                  {r.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Database Tables */}
      <div className="card">
        <div className="card-head"><h3>🗄️ Database Tables</h3></div>
        <table>
          <thead>
            <tr>
              <th>Table Name</th>
              <th>Status</th>
              <th>Records</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {[
              { name: 'inventory', desc: 'Raw materials and stock levels' },
              { name: 'batches', desc: 'Production batch records' },
              { name: 'clients', desc: 'Customer and client accounts' },
              { name: 'sales', desc: 'Sales orders and invoices' },
              { name: 'expenses', desc: 'Business expenses and costs' },
            ].map(t => {
              const info = checks.tables[t.name]
              return (
                <tr key={t.name}>
                  <td><code style={{ fontFamily: 'var(--mono)', fontSize: 12, background: 'var(--surface2)', padding: '2px 6px', borderRadius: 4 }}>{t.name}</code></td>
                  <td>
                    {!info ? <span className="badge b-amber">Checking...</span>
                      : info.status === 'ok' ? <span className="badge b-green">✓ Ready</span>
                      : <span className="badge b-red">✕ Error</span>}
                  </td>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--teal)' }}>
                    {info ? info.count : '—'}
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text3)' }}>{t.desc}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
