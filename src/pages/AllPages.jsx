import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import InvoiceModal from '../components/InvoiceModal'

const today = new Date().toISOString().split('T')[0]

/* ─── shared hook: load products from DB ─── */
function useProducts() {
  const [products, setProducts] = useState([])
  const [brands, setBrands] = useState([])

  const load = useCallback(async () => {
    const { data } = await supabase.from('products').select('*').order('brand').order('name')
    const p = data || []
    setProducts(p)
    setBrands([...new Set(p.map(x => x.brand))])
  }, [])

  useEffect(() => { load() }, [load])

  const forBrand = (brand) => products.filter(p => p.brand === brand)
  const getUnit  = (brand, name) => products.find(p => p.brand === brand && p.name === name)?.unit || 'pcs'
  const getPrice = (brand, name) => products.find(p => p.brand === brand && p.name === name)?.price || 0

  return { products, brands, forBrand, getUnit, getPrice }
}

/* ─── shared hook: CRUD on any table ─── */
function useTable(tableName, orderCol = 'created_at') {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from(tableName).select('*').order(orderCol, { ascending: false })
    setItems(data || [])
    setLoading(false)
  }, [tableName, orderCol])

  useEffect(() => { load() }, [load])

  async function del(id) {
    if (!confirm('Delete this record?')) return
    await supabase.from(tableName).delete().eq('id', id)
    load()
  }

  return { items, loading, load, del }
}

function ActionBtns({ onEdit, onDel }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <button className="btn-edit" onClick={onEdit}>Edit</button>
      <button className="btn-del"  onClick={onDel}>Del</button>
    </div>
  )
}

/* ═══════════════════════════════════════
   INVENTORY
═══════════════════════════════════════ */
const emptyI = { name: '', unit: 'kg', stock: '', min: '', cost: '', supplier: '' }
const INV_UNITS = ['kg', 'L', 'g', 'ml', 'pcs', 'packet', 'bottle', 'bar', 'tin', 'drum']

export function Inventory({ triggerAdd, aiRefresh }) {
  const { items, loading, load, del } = useTable('inventory')
  const [modal, setModal] = useState(false)
  const [form, setForm]   = useState(emptyI)
  const [saving, setSaving] = useState(false)
  const [customUnit, setCustomUnit] = useState(false)

  useEffect(() => { load() }, [aiRefresh])
  useEffect(() => { if (triggerAdd > 0) { setForm(emptyI); setCustomUnit(false); setModal(true) } }, [triggerAdd])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function save() {
    if (!form.name) return alert('Enter material name')
    setSaving(true)
    const p = { name: form.name, unit: form.unit, stock: +form.stock || 0, min: +form.min || 5, cost: +form.cost || 0, supplier: form.supplier }
    if (form.id) await supabase.from('inventory').update(p).eq('id', form.id)
    else         await supabase.from('inventory').insert(p)
    setSaving(false); setModal(false); load()
  }

  return (
    <div>
      <div className="card">
        <div className="card-head">
          <h3>◫ Raw Materials</h3>
          <span className="card-head-right">{items.length} materials</span>
        </div>
        {loading ? <div className="loading">Loading...</div> : !items.length
          ? <div className="empty"><div className="empty-icon">📦</div><p>No materials yet.</p></div>
          : <div className="table-wrap"><table>
              <thead><tr><th>Material</th><th>Stock</th><th>Min Level</th><th>Level</th><th>Cost / Unit</th><th>Supplier</th><th></th></tr></thead>
              <tbody>{items.map(m => {
                const pct = Math.min(100, Math.round((+m.stock / (+m.min * 3 || 1)) * 100))
                return (
                  <tr key={m.id}>
                    <td><b style={{ fontWeight: 500 }}>{m.name}</b></td>
                    <td><span className={`badge ${+m.stock <= +m.min ? 'b-red' : 'b-green'}`}>{m.stock} {m.unit}</span></td>
                    <td style={{ color: 'var(--text3)', fontFamily: 'var(--mono)', fontSize: 12 }}>{m.min} {m.unit}</td>
                    <td><div className="progress-bar"><div className={`progress-fill ${pct < 30 ? 'low' : pct < 60 ? 'mid' : ''}`} style={{ width: pct + '%' }} /></div></td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>₹{m.cost} / {m.unit}</td>
                    <td style={{ color: 'var(--text3)', fontSize: 12 }}>{m.supplier || '—'}</td>
                    <td><ActionBtns onEdit={() => { setForm({ ...m }); setCustomUnit(!INV_UNITS.includes(m.unit)); setModal(true) }} onDel={() => del(m.id)} /></td>
                  </tr>
                )
              })}</tbody>
            </table></div>
        }
      </div>

      {modal && (
        <div className="modal-bg" onClick={e => e.target.className === 'modal-bg' && setModal(false)}>
          <div className="modal">
            <h3>📦 {form.id ? 'Edit' : 'Add'} Material</h3>
            <div className="form-grid">
              <div className="form-row">
                <label>Material Name *</label>
                <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Caustic Soda" />
              </div>
              <div className="form-row">
                <label>Unit</label>
                {customUnit
                  ? <div style={{ display: 'flex', gap: 6 }}>
                      <input value={form.unit} onChange={e => set('unit', e.target.value)} placeholder="custom unit" style={{ flex: 1 }} />
                      <button className="btn-edit" onClick={() => { setCustomUnit(false); set('unit', 'kg') }}>⟵</button>
                    </div>
                  : <div style={{ display: 'flex', gap: 6 }}>
                      <select value={form.unit} onChange={e => set('unit', e.target.value)} style={{ flex: 1 }}>
                        {INV_UNITS.map(u => <option key={u}>{u}</option>)}
                      </select>
                      <button className="btn-edit" onClick={() => setCustomUnit(true)} title="Custom unit">+</button>
                    </div>
                }
              </div>
            </div>
            <div className="form-grid">
              <div className="form-row"><label>Current Stock</label><input type="number" value={form.stock} onChange={e => set('stock', e.target.value)} placeholder="0" /></div>
              <div className="form-row"><label>Min Alert Level</label><input type="number" value={form.min} onChange={e => set('min', e.target.value)} placeholder="5" /></div>
            </div>
            <div className="form-grid">
              <div className="form-row"><label>Cost per {form.unit || 'unit'} (₹)</label><input type="number" value={form.cost} onChange={e => set('cost', e.target.value)} placeholder="0" /></div>
              <div className="form-row"><label>Supplier</label><input value={form.supplier} onChange={e => set('supplier', e.target.value)} placeholder="Optional" /></div>
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn-save" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════
   BATCHES — dynamic brand/product/unit
═══════════════════════════════════════ */
export function Batches({ triggerAdd, aiRefresh }) {
  const { items, loading, load, del } = useTable('batches', 'date')
  const { products, brands, forBrand, getUnit } = useProducts()
  const [modal, setModal]   = useState(false)
  const [saving, setSaving] = useState(false)

  const defaultBrand   = brands[0] || 'Abi Soaps'
  const defaultProduct = forBrand(defaultBrand)[0]?.name || ''
  const [form, setForm] = useState({ date: today, brand: defaultBrand, product: defaultProduct, qty: '', status: 'completed', notes: '' })

  useEffect(() => { load() }, [aiRefresh])
  useEffect(() => {
    if (triggerAdd > 0) {
      const b = brands[0] || 'Abi Soaps'
      const p = forBrand(b)[0]?.name || ''
      setForm({ date: today, brand: b, product: p, qty: '', status: 'completed', notes: '' })
      setModal(true)
    }
  }, [triggerAdd])

  const set = (k, v) => setForm(f => {
    const n = { ...f, [k]: v }
    if (k === 'brand') n.product = forBrand(v)[0]?.name || ''
    return n
  })

  async function save() {
    if (!form.qty) return alert('Enter quantity')
    setSaving(true)
    const unit = getUnit(form.brand, form.product)
    const p = { date: form.date, brand: form.brand, product: form.product, qty: +form.qty, unit, status: form.status, notes: form.notes }
    if (form.id) await supabase.from('batches').update(p).eq('id', form.id)
    else         await supabase.from('batches').insert(p)
    setSaving(false); setModal(false); load()
  }

  const sb = { completed: 'b-green', in_progress: 'b-amber', cancelled: 'b-red' }

  return (
    <div>
      <div className="card">
        <div className="card-head"><h3>⬡ Batch Production</h3><span className="card-head-right">{items.length} batches</span></div>
        {loading ? <div className="loading">Loading...</div> : !items.length
          ? <div className="empty"><div className="empty-icon">🧪</div><p>No batches yet.</p></div>
          : <div className="table-wrap"><table>
              <thead><tr><th>Batch #</th><th>Date</th><th>Brand</th><th>Product</th><th>Qty</th><th>Unit</th><th>Status</th><th>Notes</th><th></th></tr></thead>
              <tbody>{items.map((b, i) => (
                <tr key={b.id}>
                  <td><code style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)' }}>BCH-{String(i + 1).padStart(3, '0')}</code></td>
                  <td style={{ fontSize: 12 }}>{new Date(b.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  <td><span className={`badge ${b.brand === (brands[0] || 'Abi Soaps') ? 'b-accent' : 'b-amber'}`}>{b.brand}</span></td>
                  <td style={{ fontSize: 12 }}>{b.product}</td>
                  <td><b style={{ fontWeight: 600, fontFamily: 'var(--mono)' }}>{b.qty}</b></td>
                  <td style={{ fontSize: 12, color: 'var(--text2)' }}>{b.unit || getUnit(b.brand, b.product)}</td>
                  <td><span className={`badge ${sb[b.status] || 'b-gray'}`}>{b.status?.replace('_', ' ')}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--text3)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.notes || '—'}</td>
                  <td><ActionBtns onEdit={() => { setForm({ ...b }); setModal(true) }} onDel={() => del(b.id)} /></td>
                </tr>
              ))}</tbody>
            </table></div>
        }
      </div>

      {modal && (
        <div className="modal-bg" onClick={e => e.target.className === 'modal-bg' && setModal(false)}>
          <div className="modal">
            <h3>🧪 {form.id ? 'Edit' : 'New'} Batch</h3>
            <div className="form-grid">
              <div className="form-row"><label>Date</label><input type="date" value={form.date} onChange={e => set('date', e.target.value)} /></div>
              <div className="form-row">
                <label>Brand</label>
                <select value={form.brand} onChange={e => set('brand', e.target.value)}>
                  {brands.length ? brands.map(b => <option key={b}>{b}</option>) : <option>Abi Soaps</option>}
                </select>
              </div>
            </div>
            <div className="form-row">
              <label>Product</label>
              <select value={form.product} onChange={e => set('product', e.target.value)}>
                {forBrand(form.brand).length
                  ? forBrand(form.brand).map(p => <option key={p.id}>{p.name}</option>)
                  : <option>{form.product}</option>}
              </select>
            </div>
            {form.product && (
              <div style={{ background: 'var(--accent-dim)', border: '1px solid var(--border2)', borderRadius: 'var(--r)', padding: '8px 12px', fontSize: 12, color: 'var(--accent)', marginBottom: 14 }}>
                Unit: <b>{getUnit(form.brand, form.product)}</b> · Price: <b>₹{getUnit && getPrice ? '' : ''}₹{products.find(p => p.brand === form.brand && p.name === form.product)?.price || 0} / {getUnit(form.brand, form.product)}</b>
              </div>
            )}
            <div className="form-grid">
              <div className="form-row">
                <label>Qty Produced * ({getUnit(form.brand, form.product)})</label>
                <input type="number" value={form.qty} onChange={e => set('qty', e.target.value)} placeholder="0" />
              </div>
              <div className="form-row">
                <label>Status</label>
                <select value={form.status} onChange={e => set('status', e.target.value)}>
                  <option value="completed">Completed</option>
                  <option value="in_progress">In Progress</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
            <div className="form-row"><label>Notes</label><textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any batch notes..." /></div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn-save" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Batch'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════
   CLIENTS
═══════════════════════════════════════ */
const emptyC = { name: '', type: 'Retailer', phone: '', location: '', buys: '' }

export function Clients({ triggerAdd, aiRefresh }) {
  const { items, loading, load, del } = useTable('clients')
  const [totals, setTotals] = useState({})
  const [modal, setModal]   = useState(false)
  const [form, setForm]     = useState(emptyC)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load(); loadTotals() }, [aiRefresh])
  useEffect(() => { if (triggerAdd > 0) { setForm(emptyC); setModal(true) } }, [triggerAdd])

  async function loadTotals() {
    const { data } = await supabase.from('sales').select('client, amount')
    const t = {}
    ;(data || []).forEach(s => { t[s.client] = (t[s.client] || 0) + +s.amount })
    setTotals(t)
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function save() {
    if (!form.name) return alert('Enter client name')
    setSaving(true)
    const p = { name: form.name, type: form.type, phone: form.phone, location: form.location, buys: form.buys }
    if (form.id) await supabase.from('clients').update(p).eq('id', form.id)
    else         await supabase.from('clients').insert(p)
    setSaving(false); setModal(false); load(); loadTotals()
  }

  const tb = { Retailer: 'b-blue', Wholesaler: 'b-accent', 'Direct Consumer': 'b-gray', Distributor: 'b-amber' }

  return (
    <div>
      <div className="card">
        <div className="card-head"><h3>◎ Clients</h3><span className="card-head-right">{items.length} clients</span></div>
        {loading ? <div className="loading">Loading...</div> : !items.length
          ? <div className="empty"><div className="empty-icon">👥</div><p>No clients yet.</p></div>
          : <div className="table-wrap"><table>
              <thead><tr><th>Name</th><th>Type</th><th>Phone</th><th>Location</th><th>Buys</th><th>Total Business</th><th></th></tr></thead>
              <tbody>{items.map(c => (
                <tr key={c.id}>
                  <td><b style={{ fontWeight: 500 }}>{c.name}</b></td>
                  <td><span className={`badge ${tb[c.type] || 'b-gray'}`}>{c.type}</span></td>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{c.phone || '—'}</td>
                  <td style={{ color: 'var(--text3)', fontSize: 12 }}>{c.location || '—'}</td>
                  <td style={{ fontSize: 12, color: 'var(--text2)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.buys || '—'}</td>
                  <td style={{ fontFamily: 'var(--mono)', color: 'var(--accent)', fontWeight: 600 }}>₹{(totals[c.name] || 0).toLocaleString('en-IN')}</td>
                  <td><ActionBtns onEdit={() => { setForm({ ...c }); setModal(true) }} onDel={() => del(c.id)} /></td>
                </tr>
              ))}</tbody>
            </table></div>
        }
      </div>

      {modal && (
        <div className="modal-bg" onClick={e => e.target.className === 'modal-bg' && setModal(false)}>
          <div className="modal">
            <h3>👤 {form.id ? 'Edit' : 'Add'} Client</h3>
            <div className="form-grid">
              <div className="form-row"><label>Name *</label><input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Shop or person name" /></div>
              <div className="form-row">
                <label>Type</label>
                <select value={form.type} onChange={e => set('type', e.target.value)}>
                  {['Retailer', 'Wholesaler', 'Direct Consumer', 'Distributor'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="form-grid">
              <div className="form-row"><label>Phone</label><input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="9XXXXXXXXX" /></div>
              <div className="form-row"><label>Location</label><input value={form.location} onChange={e => set('location', e.target.value)} placeholder="City or area" /></div>
            </div>
            <div className="form-row"><label>Buys Which Products</label><input value={form.buys} onChange={e => set('buys', e.target.value)} placeholder="e.g. Abi Washing Powder, Dishwash" /></div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn-save" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Client'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════
   SALES — dynamic product + auto unit/price
═══════════════════════════════════════ */
export function Sales({ triggerAdd, aiRefresh }) {
  const { items, loading, load, del } = useTable('sales', 'date')
  const { products, brands, forBrand, getUnit, getPrice } = useProducts()
  const [clients, setClients]   = useState([])
  const [modal, setModal]       = useState(false)
  const [saving, setSaving]     = useState(false)
  const [invoiceSale, setInvoiceSale] = useState(null)

  const defaultBrand   = brands[0] || 'Abi Soaps'
  const defaultProduct = forBrand(defaultBrand)[0]?.name || ''
  const [form, setForm] = useState({ date: today, client: '', brand: defaultBrand, product: defaultProduct, qty: '', amount: '', status: 'paid' })

  useEffect(() => {
    load()
    supabase.from('clients').select('name').order('name').then(r => setClients(r.data || []))
  }, [aiRefresh])

  useEffect(() => {
    if (triggerAdd > 0) {
      const b = brands[0] || 'Abi Soaps'
      const p = forBrand(b)[0]?.name || ''
      setForm({ date: today, client: '', brand: b, product: p, qty: '', amount: '', status: 'paid' })
      setModal(true)
    }
  }, [triggerAdd])

  const set = (k, v) => setForm(f => {
    const n = { ...f, [k]: v }
    if (k === 'brand') { n.product = forBrand(v)[0]?.name || ''; n.amount = '' }
    if (k === 'product') { n.amount = '' }
    // Auto-calculate amount when qty changes
    if (k === 'qty' && v) {
      const price = getPrice(f.brand, f.product)
      if (price) n.amount = String(+v * price)
    }
    return n
  })

  async function save() {
    if (!form.amount) return alert('Enter amount')
    setSaving(true)
    const unit = getUnit(form.brand, form.product)
    const p = { date: form.date, client: form.client, brand: form.brand, product: form.product, qty: +form.qty || 0, unit, amount: +form.amount, status: form.status }
    if (form.id) await supabase.from('sales').update(p).eq('id', form.id)
    else         await supabase.from('sales').insert(p)
    setSaving(false); setModal(false); load()
  }

  const rev  = items.reduce((a, s) => a + +s.amount, 0)
  const pend = items.filter(s => s.status === 'pending').reduce((a, s) => a + +s.amount, 0)
  const autoPrice = form.product ? getPrice(form.brand, form.product) : 0
  const unit      = form.product ? getUnit(form.brand, form.product) : ''

  return (
    <div>
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 20 }}>
        <div className="stat-card"><div className="stat-top"><div className="stat-icon-box si-accent">💰</div></div><div className="stat-label">Total Revenue</div><div className="stat-value" style={{ fontSize: 22 }}>₹{rev.toLocaleString('en-IN')}</div></div>
        <div className="stat-card"><div className="stat-top"><div className="stat-icon-box si-amber">⏳</div></div><div className="stat-label">Pending</div><div className="stat-value" style={{ fontSize: 22 }}>₹{pend.toLocaleString('en-IN')}</div></div>
        <div className="stat-card"><div className="stat-top"><div className="stat-icon-box si-blue">📋</div></div><div className="stat-label">Total Orders</div><div className="stat-value" style={{ fontSize: 22 }}>{items.length}</div></div>
      </div>

      <div className="card">
        <div className="card-head"><h3>◈ Sales & Orders</h3><span className="card-head-right">{items.length} records</span></div>
        {loading ? <div className="loading">Loading...</div> : !items.length
          ? <div className="empty"><div className="empty-icon">🛒</div><p>No sales yet.</p></div>
          : <div className="table-wrap"><table>
              <thead><tr><th>Invoice</th><th>Date</th><th>Client</th><th>Brand</th><th>Product</th><th>Qty</th><th>Unit</th><th>Amount</th><th>Status</th><th></th></tr></thead>
              <tbody>{items.map((s, i) => (
                <tr key={s.id}>
                  <td><code style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)' }}>INV-{String(i + 1).padStart(4, '0')}</code></td>
                  <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{new Date(s.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                  <td><b style={{ fontWeight: 500 }}>{s.client || 'Walk-in'}</b></td>
                  <td><span className={`badge ${s.brand === (brands[0] || 'Abi Soaps') ? 'b-accent' : 'b-amber'}`}>{s.brand}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--text2)' }}>{s.product}</td>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{s.qty || '—'}</td>
                  <td style={{ fontSize: 12, color: 'var(--text3)' }}>{s.unit || getUnit(s.brand, s.product)}</td>
                  <td style={{ fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--accent)' }}>₹{(+s.amount).toLocaleString('en-IN')}</td>
                  <td><span className={`badge ${s.status === 'paid' ? 'b-green' : s.status === 'pending' ? 'b-amber' : 'b-blue'}`}>{s.status}</span></td>
                  <td>
                <div style={{display:'flex',gap:6}}>
                  <button className="btn-edit" style={{color:'var(--green)',borderColor:'rgba(0,200,100,.2)',background:'var(--green-dim)'}} onClick={()=>setInvoiceSale({...s,invoice_index:i+1})}>🧾</button>
                  <ActionBtns onEdit={()=>{setForm({...s});setModal(true)}} onDel={()=>del(s.id)} />
                </div>
              </td>
                </tr>
              ))}</tbody>
            </table></div>
        }
      </div>

      {invoiceSale && <InvoiceModal sale={invoiceSale} onClose={()=>setInvoiceSale(null)} />}
      {modal && (
        <div className="modal-bg" onClick={e => e.target.className === 'modal-bg' && setModal(false)}>
          <div className="modal">
            <h3>💰 {form.id ? 'Edit' : 'New'} Sale</h3>
            <div className="form-grid">
              <div className="form-row"><label>Date</label><input type="date" value={form.date} onChange={e => set('date', e.target.value)} /></div>
              <div className="form-row">
                <label>Client</label>
                <select value={form.client} onChange={e => set('client', e.target.value)}>
                  <option value="">Walk-in (optional)</option>
                  {clients.map(c => <option key={c.name}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="form-grid">
              <div className="form-row">
                <label>Brand</label>
                <select value={form.brand} onChange={e => set('brand', e.target.value)}>
                  {brands.length ? brands.map(b => <option key={b}>{b}</option>) : <option>Abi Soaps</option>}
                </select>
              </div>
              <div className="form-row">
                <label>Product</label>
                <select value={form.product} onChange={e => set('product', e.target.value)}>
                  {forBrand(form.brand).length
                    ? forBrand(form.brand).map(p => <option key={p.id}>{p.name}</option>)
                    : <option>{form.product}</option>}
                </select>
              </div>
            </div>

            {/* Auto price hint */}
            {form.product && autoPrice > 0 && (
              <div style={{ background: 'var(--accent-dim)', border: '1px solid var(--border2)', borderRadius: 'var(--r)', padding: '8px 14px', fontSize: 12, color: 'var(--accent)', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>📦 Unit: <b>{unit}</b> · Price: <b>₹{autoPrice} / {unit}</b></span>
                <span style={{ color: 'var(--text3)' }}>Amount auto-calculated from qty</span>
              </div>
            )}

            <div className="form-grid">
              <div className="form-row">
                <label>Quantity ({unit || 'units'})</label>
                <input type="number" value={form.qty} onChange={e => set('qty', e.target.value)} placeholder="0" />
              </div>
              <div className="form-row">
                <label>Total Amount (₹) *</label>
                <input type="number" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder={autoPrice ? `Auto: qty × ₹${autoPrice}` : '0'} />
              </div>
            </div>
            <div className="form-row">
              <label>Payment Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="partial">Partial</option>
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn-save" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Sale'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════
   EXPENSES
═══════════════════════════════════════ */
const cats  = ['Raw Material', 'Labour', 'Transport', 'Packaging', 'Utilities', 'Rent', 'Maintenance', 'Other']
const emptyE = { date: today, category: 'Raw Material', description: '', brand: 'Both', amount: '', paidby: '' }

export function Expenses({ triggerAdd, aiRefresh }) {
  const { items, loading, load, del } = useTable('expenses', 'date')
  const { brands } = useProducts()
  const [modal, setModal]   = useState(false)
  const [form, setForm]     = useState(emptyE)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [aiRefresh])
  useEffect(() => { if (triggerAdd > 0) { setForm(emptyE); setModal(true) } }, [triggerAdd])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function save() {
    if (!form.amount || !form.description) return alert('Fill amount and description')
    setSaving(true)
    const p = { date: form.date, category: form.category, description: form.description, brand: form.brand, amount: +form.amount, paidby: form.paidby }
    if (form.id) await supabase.from('expenses').update(p).eq('id', form.id)
    else         await supabase.from('expenses').insert(p)
    setSaving(false); setModal(false); load()
  }

  const total  = items.reduce((a, e) => a + +e.amount, 0)
  const topCat = cats.map(c => ({ c, t: items.filter(e => e.category === c).reduce((a, e) => a + +e.amount, 0) })).sort((a, b) => b.t - a.t)[0]
  const brandOptions = ['Both', ...brands]

  return (
    <div>
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 20 }}>
        <div className="stat-card"><div className="stat-top"><div className="stat-icon-box si-amber">🧾</div></div><div className="stat-label">Total Expenses</div><div className="stat-value" style={{ fontSize: 22 }}>₹{total.toLocaleString('en-IN')}</div></div>
        <div className="stat-card"><div className="stat-top"><div className="stat-icon-box si-purple">📊</div></div><div className="stat-label">Top Category</div><div className="stat-value" style={{ fontSize: 16, marginTop: 4 }}>{topCat?.t > 0 ? topCat.c : '—'}</div></div>
        <div className="stat-card"><div className="stat-top"><div className="stat-icon-box si-blue">📋</div></div><div className="stat-label">Total Records</div><div className="stat-value" style={{ fontSize: 22 }}>{items.length}</div></div>
      </div>

      <div className="card">
        <div className="card-head"><h3>◆ Expenses</h3><span className="card-head-right">{items.length} records</span></div>
        {loading ? <div className="loading">Loading...</div> : !items.length
          ? <div className="empty"><div className="empty-icon">🧾</div><p>No expenses yet.</p></div>
          : <div className="table-wrap"><table>
              <thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Brand</th><th>Amount</th><th>Paid By</th><th></th></tr></thead>
              <tbody>{items.map(e => (
                <tr key={e.id}>
                  <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{new Date(e.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  <td><span className="badge b-gray">{e.category}</span></td>
                  <td>{e.description}</td>
                  <td><span className={`badge ${e.brand === (brands[0] || 'Abi Soaps') ? 'b-accent' : e.brand === (brands[1] || 'Muthu Soap') ? 'b-amber' : 'b-gray'}`}>{e.brand}</span></td>
                  <td style={{ fontFamily: 'var(--mono)', color: 'var(--red)', fontWeight: 600 }}>₹{(+e.amount).toLocaleString('en-IN')}</td>
                  <td style={{ color: 'var(--text3)', fontSize: 12 }}>{e.paidby || '—'}</td>
                  <td><ActionBtns onEdit={() => { setForm({ ...e }); setModal(true) }} onDel={() => del(e.id)} /></td>
                </tr>
              ))}</tbody>
            </table></div>
        }
      </div>

      {modal && (
        <div className="modal-bg" onClick={e => e.target.className === 'modal-bg' && setModal(false)}>
          <div className="modal">
            <h3>🧾 {form.id ? 'Edit' : 'Add'} Expense</h3>
            <div className="form-grid">
              <div className="form-row"><label>Date</label><input type="date" value={form.date} onChange={e => set('date', e.target.value)} /></div>
              <div className="form-row">
                <label>Category</label>
                <select value={form.category} onChange={e => set('category', e.target.value)}>
                  {cats.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row"><label>Description *</label><input value={form.description} onChange={e => set('description', e.target.value)} placeholder="What was this expense for?" /></div>
            <div className="form-grid">
              <div className="form-row"><label>Amount (₹) *</label><input type="number" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0" /></div>
              <div className="form-row">
                <label>Brand</label>
                <select value={form.brand} onChange={e => set('brand', e.target.value)}>
                  {brandOptions.map(b => <option key={b}>{b}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row"><label>Paid By</label><input value={form.paidby} onChange={e => set('paidby', e.target.value)} placeholder="Cash / Bank / Name" /></div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn-save" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Expense'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
