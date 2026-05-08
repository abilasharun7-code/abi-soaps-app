import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function Bar({ value, max, color, label, amount }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, flex:1 }}>
      <div style={{ fontSize:11, color:'var(--text3)', fontWeight:700, fontFamily:'var(--mono)' }}>
        {amount > 0 ? '₹' + (amount/1000).toFixed(0) + 'k' : '—'}
      </div>
      <div style={{ width:'100%', height:140, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
        <div style={{
          width:'60%', height: pct + '%', minHeight: pct > 0 ? 4 : 0,
          background: color, borderRadius:'6px 6px 0 0',
          boxShadow: pct > 0 ? `0 0 12px ${color}88` : 'none',
          transition:'height .4s cubic-bezier(.4,0,.2,1)',
          position:'relative'
        }}>
          {pct > 10 && (
            <div style={{ position:'absolute', top:-20, left:'50%', transform:'translateX(-50%)', fontSize:10, color:'var(--text2)', whiteSpace:'nowrap', fontWeight:700 }}>
              {pct}%
            </div>
          )}
        </div>
      </div>
      <div style={{ fontSize:10, color:'var(--text3)', fontWeight:700, letterSpacing:'.04em' }}>{label}</div>
    </div>
  )
}

function MiniDonut({ data, total }) {
  if (total === 0) return <div className="empty"><div className="empty-icon">📊</div><p>No data yet</p></div>
  let offset = 0
  const r = 60, cx = 75, cy = 75, circ = 2 * Math.PI * r
  return (
    <div style={{ display:'flex', alignItems:'center', gap:24 }}>
      <svg width={150} height={150} viewBox="0 0 150 150">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--surface3)" strokeWidth={18} />
        {data.map((d, i) => {
          const pct = d.value / total
          const dash = pct * circ
          const el = (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none"
              stroke={d.color} strokeWidth={18}
              strokeDasharray={`${dash} ${circ}`}
              strokeDashoffset={-offset * circ}
              strokeLinecap="round"
              style={{ filter:`drop-shadow(0 0 6px ${d.color}88)` }}
              transform="rotate(-90, 75, 75)"
            />
          )
          offset += pct
          return el
        })}
        <text x={cx} y={cy-6} textAnchor="middle" fill="var(--text)" fontSize={11} fontWeight={800} fontFamily="var(--mono)">TOTAL</text>
        <text x={cx} y={cy+12} textAnchor="middle" fill="var(--accent)" fontSize={13} fontWeight={900} fontFamily="var(--mono)">
          ₹{(total/1000).toFixed(0)}k
        </text>
      </svg>
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {data.map((d, i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:10, height:10, borderRadius:'50%', background:d.color, boxShadow:`0 0 6px ${d.color}88`, flexShrink:0 }} />
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--text)' }}>{d.label}</div>
              <div style={{ fontSize:11, color:'var(--text3)', fontFamily:'var(--mono)' }}>₹{d.value.toLocaleString('en-IN')}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Analytics() {
  const [monthly, setMonthly] = useState([])
  const [products, setProducts] = useState([])
  const [clients, setClients] = useState([])
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const year = new Date().getFullYear()
  const fmt = n => '₹' + Number(n).toLocaleString('en-IN')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [s, e, cl, prod] = await Promise.all([
      supabase.from('sales').select('*'),
      supabase.from('expenses').select('*'),
      supabase.from('clients').select('name'),
      supabase.from('products').select('name, brand'),
    ])

    const salesData   = s.data || []
    const expData     = e.data || []
    const clientList  = (cl.data || []).map(c => c.name)
    const prodList    = prod.data || []

    // Monthly revenue + expenses
    const mon = MONTHS.map((m, i) => {
      const rev = salesData.filter(x => new Date(x.date).getMonth() === i && new Date(x.date).getFullYear() === year).reduce((a, x) => a + +x.amount, 0)
      const exp = expData.filter(x => new Date(x.date).getMonth() === i && new Date(x.date).getFullYear() === year).reduce((a, x) => a + +x.amount, 0)
      return { month: m, revenue: rev, expenses: exp, profit: rev - exp }
    })
    setMonthly(mon)

    // Product sales breakdown
    const prodSales = prodList.map(p => ({
      name: p.name.length > 20 ? p.name.slice(0, 18) + '…' : p.name,
      fullName: p.name,
      brand: p.brand,
      total: salesData.filter(s => s.product === p.name).reduce((a, x) => a + +x.amount, 0),
      qty: salesData.filter(s => s.product === p.name).reduce((a, x) => a + +x.qty, 0),
    })).sort((a, b) => b.total - a.total)
    setProducts(prodSales)

    // Client sales breakdown
    const clientSales = clientList.map(name => ({
      name,
      total: salesData.filter(s => s.client === name).reduce((a, x) => a + +x.amount, 0),
      orders: salesData.filter(s => s.client === name).length,
    })).sort((a, b) => b.total - a.total).slice(0, 8)
    setClients(clientSales)

    // Expense by category
    const cats = ['Raw Material','Labour','Transport','Packaging','Utilities','Rent','Maintenance','Other']
    const catColors = ['var(--accent)','var(--blue)','var(--amber)','var(--purple)','var(--green)','var(--red)','#ff9800','var(--text2)']
    const expCats = cats.map((cat, i) => ({
      label: cat, color: catColors[i],
      value: expData.filter(e => e.category === cat).reduce((a, x) => a + +x.amount, 0)
    })).filter(c => c.value > 0)
    setExpenses(expCats)

    setLoading(false)
  }

  if (loading) return <div className="loading">Loading analytics...</div>

  const maxRev  = Math.max(...monthly.map(m => m.revenue), 1)
  const maxExp  = Math.max(...monthly.map(m => m.expenses), 1)
  const maxProd = Math.max(...products.map(p => p.total), 1)
  const maxCli  = Math.max(...clients.map(c => c.total), 1)
  const totalRev  = monthly.reduce((a, m) => a + m.revenue, 0)
  const totalExp  = monthly.reduce((a, m) => a + m.expenses, 0)
  const totalProf = totalRev - totalExp
  const bestMonth = [...monthly].sort((a, b) => b.revenue - a.revenue)[0]
  const bestProd  = products[0]

  return (
    <div>
      {/* KPI row */}
      <div className="stats-grid" style={{ gridTemplateColumns:'repeat(4,1fr)', marginBottom:24 }}>
        {[
          { label:`${year} Revenue`,  value:fmt(totalRev),  icon:'💰', cls:'si-accent',  change:'Year total' },
          { label:`${year} Expenses`, value:fmt(totalExp),  icon:'🧾', cls:'si-amber',   change:'Year total' },
          { label:`${year} Profit`,   value:fmt(totalProf), icon:'📈', cls:totalProf>=0?'si-green':'si-red', change:totalProf>=0?'Profitable ↑':'In Loss ↓', up:totalProf>=0 },
          { label:'Best Month',       value:bestMonth?.month||'—', icon:'🏆', cls:'si-purple', change:bestMonth?.revenue>0?fmt(bestMonth.revenue):'No data' },
        ].map(c => (
          <div className="stat-card" key={c.label}>
            <div className="stat-top"><div className={`stat-icon-box ${c.cls}`}>{c.icon}</div>
              <span className={`stat-change ${c.up===true?'sc-up':c.up===false?'sc-down':'sc-neutral'}`}>{c.change}</span>
            </div>
            <div className="stat-label">{c.label}</div>
            <div className="stat-value" style={{ fontSize:typeof c.value==='string'&&c.value.length>8?18:25 }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Monthly Revenue Chart */}
      <div className="card" style={{ marginBottom:22 }}>
        <div className="card-head"><h3>📊 Monthly Revenue vs Expenses — {year}</h3></div>
        <div style={{ padding:'24px 20px 16px' }}>
          <div style={{ display:'flex', gap:16, marginBottom:16 }}>
            {[{color:'var(--accent)',label:'Revenue'},{color:'var(--red)',label:'Expenses'},{color:'var(--green)',label:'Profit'}].map(l=>(
              <div key={l.label} style={{ display:'flex',alignItems:'center',gap:6,fontSize:11,fontWeight:700,color:'var(--text2)' }}>
                <div style={{ width:10,height:10,borderRadius:2,background:l.color,boxShadow:`0 0 6px ${l.color}88` }}/>
                {l.label}
              </div>
            ))}
          </div>
          <div style={{ display:'flex', gap:4, alignItems:'flex-end', height:180, overflowX:'auto' }}>
            {monthly.map((m, i) => (
              <div key={i} style={{ flex:1, minWidth:36, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                <div style={{ width:'100%', height:160, display:'flex', gap:2, alignItems:'flex-end', justifyContent:'center' }}>
                  {[
                    { val:m.revenue, max:maxRev, color:'var(--accent)' },
                    { val:m.expenses, max:maxExp, color:'var(--red)' },
                    { val:Math.max(0,m.profit), max:maxRev, color:'var(--green)' },
                  ].map((b, j) => (
                    <div key={j} title={`₹${b.val.toLocaleString('en-IN')}`} style={{
                      flex:1, height: b.max>0 ? Math.max(b.val/b.max*140,b.val>0?3:0) : 0,
                      background:b.color, borderRadius:'4px 4px 0 0',
                      boxShadow:b.val>0?`0 0 8px ${b.color}66`:'none',
                      transition:'height .5s cubic-bezier(.4,0,.2,1)',
                      cursor:'default'
                    }}/>
                  ))}
                </div>
                <div style={{ fontSize:9, color:'var(--text3)', fontWeight:800, letterSpacing:'.04em' }}>{m.month}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid-2">
        {/* Product Sales */}
        <div className="card">
          <div className="card-head"><h3>🧴 Sales by Product</h3><span className="card-head-right">Best: {bestProd?.name||'—'}</span></div>
          <div style={{ padding:'16px 20px', display:'flex', flexDirection:'column', gap:10 }}>
            {products.length === 0
              ? <div className="empty"><div className="empty-icon">🧴</div><p>No sales data</p></div>
              : products.map((p, i) => (
                <div key={i}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:'var(--text)' }}>{p.name}</div>
                    <div style={{ fontSize:12, fontFamily:'var(--mono)', color:'var(--accent)', fontWeight:700 }}>{fmt(p.total)}</div>
                  </div>
                  <div style={{ height:5, background:'var(--surface3)', borderRadius:3, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:(p.total/maxProd*100)+'%', background:'var(--accent)', borderRadius:3, boxShadow:'0 0 8px var(--accent)88', transition:'width .5s' }} />
                  </div>
                  <div style={{ fontSize:10, color:'var(--text3)', marginTop:3, fontWeight:600 }}>{p.qty} units sold</div>
                </div>
              ))
            }
          </div>
        </div>

        {/* Expense Breakdown Donut */}
        <div className="card">
          <div className="card-head"><h3>🧾 Expenses by Category</h3></div>
          <div style={{ padding:'24px 20px' }}>
            <MiniDonut data={expenses} total={expenses.reduce((a,e)=>a+e.value,0)} />
          </div>
        </div>
      </div>

      {/* Client Leaderboard */}
      <div className="card">
        <div className="card-head"><h3>👥 Top Clients by Revenue</h3><span className="card-head-right">Top {clients.length}</span></div>
        {clients.length === 0
          ? <div className="empty"><div className="empty-icon">👥</div><p>No client sales data</p></div>
          : <table>
              <thead><tr><th>#</th><th>Client</th><th>Orders</th><th>Total Revenue</th><th>Share</th></tr></thead>
              <tbody>{clients.map((c, i) => (
                <tr key={i}>
                  <td><span style={{ fontFamily:'var(--mono)', color:'var(--text3)', fontWeight:700 }}>#{i+1}</span></td>
                  <td><b style={{ fontWeight:700 }}>{c.name}</b></td>
                  <td><span className="badge b-blue">{c.orders} orders</span></td>
                  <td style={{ fontFamily:'var(--mono)', color:'var(--accent)', fontWeight:700 }}>{fmt(c.total)}</td>
                  <td style={{ width:120 }}>
                    <div style={{ height:5, background:'var(--surface3)', borderRadius:3, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:(c.total/maxCli*100)+'%', background:'var(--accent)', borderRadius:3, boxShadow:'0 0 6px var(--accent)66', transition:'width .5s' }} />
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table>
        }
      </div>
    </div>
  )
}
