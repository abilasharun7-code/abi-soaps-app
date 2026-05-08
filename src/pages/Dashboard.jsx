import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import AlertsBanner from '../components/AlertsBanner'

export default function Dashboard({ triggerAdd, aiRefresh }) {
  const [stats, setStats]         = useState({ revenue:0, expenses:0, clients:0, batches:0, profit:0 })
  const [lowStock, setLowStock]   = useState([])
  const [recentSales, setRecentSales] = useState([])
  const [products, setProducts]   = useState([])
  const [todayStats, setTodayStats] = useState({ sales:0, revenue:0, batches:0 })
  const [aiSummary, setAiSummary] = useState('')
  const [loadingAI, setLoadingAI] = useState(false)
  const [loading, setLoading]     = useState(true)
  const today = new Date().toISOString().split('T')[0]
  const fmt = n => '₹' + Number(n).toLocaleString('en-IN')

  useEffect(() => { load() }, [triggerAdd, aiRefresh])

  async function load() {
    setLoading(true)
    const [s, e, cl, ba, inv, prod, ts, tb] = await Promise.all([
      supabase.from('sales').select('amount'),
      supabase.from('expenses').select('amount'),
      supabase.from('clients').select('id', { count:'exact' }),
      supabase.from('batches').select('id', { count:'exact' }),
      supabase.from('inventory').select('*'),
      supabase.from('products').select('*').order('brand').order('name'),
      supabase.from('sales').select('amount').eq('date', today),
      supabase.from('batches').select('id', { count:'exact' }).eq('date', today),
    ])
    const revenue  = (s.data||[]).reduce((a,x)=>a+ +x.amount,0)
    const expenses = (e.data||[]).reduce((a,x)=>a+ +x.amount,0)
    setStats({ revenue, expenses, profit:revenue-expenses, clients:cl.count||0, batches:ba.count||0 })
    setLowStock((inv.data||[]).filter(m=>+m.stock<=+m.min))
    setProducts(prod.data||[])
    const todayRev = (ts.data||[]).reduce((a,x)=>a+ +x.amount,0)
    setTodayStats({ sales:(ts.data||[]).length, revenue:todayRev, batches:tb.count||0 })
    const { data:rs } = await supabase.from('sales').select('*').order('created_at',{ascending:false}).limit(6)
    setRecentSales(rs||[])
    setLoading(false)
  }

  async function generateAISummary() {
    const key = import.meta.env.VITE_ANTHROPIC_KEY
    if (!key || key.length < 20) return alert('Add VITE_ANTHROPIC_KEY to .env to use AI Summary')
    setLoadingAI(true); setAiSummary('')

    const [s, e, b, inv] = await Promise.all([
      supabase.from('sales').select('*').eq('date', today),
      supabase.from('expenses').select('*').eq('date', today),
      supabase.from('batches').select('*').eq('date', today),
      supabase.from('inventory').select('*'),
    ])

    const prompt = `You are a business analyst for "Abi & Muthu Soaps". Today's data:
Sales: ${JSON.stringify(s.data||[])}
Expenses: ${JSON.stringify(e.data||[])}
Batches: ${JSON.stringify(b.data||[])}
Low stock items: ${JSON.stringify((inv.data||[]).filter(m=>+m.stock<=+m.min))}

Write a short, friendly daily business summary in 3-4 sentences. Mention key numbers, highlight anything concerning, and give one actionable suggestion. Keep it warm and practical, like a smart business advisor.`

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST',
        headers:{'Content-Type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
        body: JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:300, messages:[{role:'user',content:prompt}] })
      })
      const data = await res.json()
      setAiSummary(data.content?.[0]?.text || 'Could not generate summary.')
    } catch { setAiSummary('Error generating summary. Check your API key.') }
    setLoadingAI(false)
  }

  if (loading) return <div className="loading">Loading dashboard...</div>

  return (
    <div>
      <AlertsBanner key={aiRefresh} />

      {/* Today's snapshot */}
      <div style={{ background:'var(--accent-dim)', border:'1px solid var(--border3)', borderRadius:'var(--rxl)', padding:'16px 22px', marginBottom:22, display:'flex', alignItems:'center', justifyContent:'space-between', boxShadow:'var(--glow-sm)' }}>
        <div style={{ display:'flex', gap:32 }}>
          <div>
            <div style={{ fontSize:10, color:'var(--text3)', fontWeight:800, textTransform:'uppercase', letterSpacing:'.12em', marginBottom:3 }}>Today's Sales</div>
            <div style={{ fontSize:20, fontWeight:900, color:'var(--accent)', fontFamily:'var(--mono)' }}>{fmt(todayStats.revenue)}</div>
            <div style={{ fontSize:11, color:'var(--text3)', fontWeight:600 }}>{todayStats.sales} orders</div>
          </div>
          <div style={{ width:1, background:'var(--border2)' }} />
          <div>
            <div style={{ fontSize:10, color:'var(--text3)', fontWeight:800, textTransform:'uppercase', letterSpacing:'.12em', marginBottom:3 }}>Today's Batches</div>
            <div style={{ fontSize:20, fontWeight:900, color:'var(--text)', fontFamily:'var(--mono)' }}>{todayStats.batches}</div>
            <div style={{ fontSize:11, color:'var(--text3)', fontWeight:600 }}>produced today</div>
          </div>
          <div style={{ width:1, background:'var(--border2)' }} />
          <div>
            <div style={{ fontSize:10, color:'var(--text3)', fontWeight:800, textTransform:'uppercase', letterSpacing:'.12em', marginBottom:3 }}>All-Time Profit</div>
            <div style={{ fontSize:20, fontWeight:900, fontFamily:'var(--mono)' }} className={stats.profit>=0?'profit-pos':'profit-neg'}>{fmt(stats.profit)}</div>
            <div style={{ fontSize:11, color:'var(--text3)', fontWeight:600 }}>{stats.profit>=0?'Profitable':'In Loss'}</div>
          </div>
        </div>
        <button className="btn-ai" onClick={generateAISummary} disabled={loadingAI}>
          {loadingAI ? '⏳ Thinking...' : '✦ AI Daily Summary'}
        </button>
      </div>

      {/* AI Summary */}
      {aiSummary && (
        <div style={{ background:'var(--surface)', border:'1px solid var(--border3)', borderRadius:'var(--rxl)', padding:'18px 22px', marginBottom:22, boxShadow:'var(--glow-md)' }}>
          <div style={{ fontSize:11, color:'var(--accent)', fontWeight:800, textTransform:'uppercase', letterSpacing:'.1em', marginBottom:10 }}>✦ AI Daily Business Summary</div>
          <p style={{ fontSize:14, color:'var(--text)', lineHeight:1.8, fontWeight:500 }}>{aiSummary}</p>
        </div>
      )}

      {/* Main stats */}
      <div className="stats-grid">
        {[
          { label:'Total Revenue',  value:fmt(stats.revenue),  icon:'💰', cls:'si-accent',  change:'All sales' },
          { label:'Total Expenses', value:fmt(stats.expenses), icon:'🧾', cls:'si-amber',   change:'All time' },
          { label:'Net Profit',     value:fmt(stats.profit||0),icon:'📈', cls:stats.profit>=0?'si-green':'si-red', change:stats.profit>=0?'Profitable ↑':'In Loss ↓', up:stats.profit>=0 },
          { label:'Clients',        value:stats.clients,        icon:'👥', cls:'si-blue',    change:`${stats.batches} batches` },
        ].map(c=>(
          <div className="stat-card" key={c.label}>
            <div className="stat-top"><div className={`stat-icon-box ${c.cls}`}>{c.icon}</div>
              <span className={`stat-change ${c.up===true?'sc-up':c.up===false?'sc-down':'sc-neutral'}`}>{c.change}</span>
            </div>
            <div className="stat-label">{c.label}</div>
            <div className="stat-value" style={{ fontSize:typeof c.value==='string'&&c.value.length>9?18:25 }}>{c.value}</div>
          </div>
        ))}
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-head"><h3>⚠ Low Stock Alerts</h3><span className="card-head-right">{lowStock.length} items</span></div>
          {!lowStock.length
            ? <div className="empty"><div className="empty-icon">✅</div><p>All materials stocked</p></div>
            : <table><thead><tr><th>Material</th><th>Stock</th><th>Min</th></tr></thead>
              <tbody>{lowStock.map(m=><tr key={m.id}><td><b style={{fontWeight:700}}>{m.name}</b></td><td><span className="badge b-red">{m.stock} {m.unit}</span></td><td style={{color:'var(--text3)'}}>{m.min} {m.unit}</td></tr>)}</tbody>
            </table>}
        </div>
        <div className="card">
          <div className="card-head"><h3>◈ Recent Sales</h3><span className="card-head-right">{recentSales.length} latest</span></div>
          {!recentSales.length
            ? <div className="empty"><div className="empty-icon">🛒</div><p>No sales yet</p></div>
            : <table><thead><tr><th>Client</th><th>Product</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>{recentSales.map(s=><tr key={s.id}>
                <td><b style={{fontWeight:600}}>{s.client||'Walk-in'}</b></td>
                <td style={{fontSize:12,color:'var(--text2)'}}>{s.product}</td>
                <td style={{fontFamily:'var(--mono)',fontWeight:700,color:'var(--accent)'}}>{fmt(s.amount)}</td>
                <td><span className={`badge ${s.status==='paid'?'b-green':s.status==='pending'?'b-amber':'b-blue'}`}>{s.status}</span></td>
              </tr>)}</tbody>
            </table>}
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h3>🧴 Products Catalogue</h3><span className="card-head-right">{products.length} products — edit in Products page</span></div>
        <table>
          <thead><tr><th>Brand</th><th>Product</th><th>Category</th><th>Price</th></tr></thead>
          <tbody>
            {products.map(p=>(
              <tr key={p.id}>
                <td><span className={`badge ${p.brand===products[0]?.brand?'b-accent':'b-amber'}`}>{p.brand}</span></td>
                <td style={{fontWeight:600}}>{p.name}</td>
                <td><span className="badge b-gray">{p.category}</span></td>
                <td style={{fontFamily:'var(--mono)',color:'var(--accent)',fontWeight:700}}>₹{Number(p.price).toLocaleString('en-IN')} / {p.unit}</td>
              </tr>
            ))}
            {!products.length && <tr><td colSpan={4} style={{textAlign:'center',color:'var(--text3)',padding:20}}>No products — go to Products page to add them</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
