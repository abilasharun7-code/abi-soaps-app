import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const BRANDS = ['Abi Soaps', 'Muthu Soap']
const CATEGORIES = ['Soap', 'Powder', 'Liquid', 'Detergent', 'Other']
const UNITS = ['bar', 'kg', 'g', 'L', 'ml', 'pcs', 'packet', 'bottle']

const empty = { brand: 'Abi Soaps', name: '', category: 'Soap', price: '', unit: 'bar' }

export default function Products({ triggerAdd }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])
  useEffect(() => { if (triggerAdd > 0) openModal() }, [triggerAdd])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('products').select('*').order('brand').order('name')
    setItems(data || [])
    setLoading(false)
  }

  function openModal(item = null) {
    setForm(item ? { ...item } : empty)
    setModal(true)
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function save() {
    if (!form.name) return alert('Enter product name')
    if (!form.price) return alert('Enter price')
    setSaving(true)
    const payload = {
      brand: form.brand,
      name: form.name,
      category: form.category,
      price: Number(form.price),
      unit: form.unit,
    }
    if (form.id) {
      await supabase.from('products').update(payload).eq('id', form.id)
    } else {
      await supabase.from('products').insert(payload)
    }
    setSaving(false)
    setModal(false)
    load()
  }

  async function del(id) {
    if (!confirm('Delete this product?')) return
    await supabase.from('products').delete().eq('id', id)
    load()
  }

  // Group by brand for display
  const grouped = items.reduce((acc, p) => {
    if (!acc[p.brand]) acc[p.brand] = []
    acc[p.brand].push(p)
    return acc
  }, {})

  return (
    <div>
      {/* Summary stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-top"><div className="stat-icon-box si-accent">🧴</div></div>
          <div className="stat-label">Total Products</div>
          <div className="stat-value" style={{ fontSize: 24 }}>{items.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-top"><div className="stat-icon-box si-green">🏷️</div></div>
          <div className="stat-label">Brands</div>
          <div className="stat-value" style={{ fontSize: 24 }}>{Object.keys(grouped).length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-top"><div className="stat-icon-box si-amber">📦</div></div>
          <div className="stat-label">Categories</div>
          <div className="stat-value" style={{ fontSize: 24 }}>{[...new Set(items.map(p => p.category))].length}</div>
        </div>
      </div>

      {Object.entries(grouped).map(([brand, products]) => (
        <div className="card" key={brand}>
          <div className="card-head">
            <h3>
              <span className={`badge ${brand === 'Abi Soaps' ? 'b-accent' : 'b-amber'}`}>{brand}</span>
              <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text3)', marginLeft: 4 }}>{products.length} products</span>
            </h3>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Unit</th>
                  <th>Price Display</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id}>
                    <td><b style={{ fontWeight: 500 }}>{p.name}</b></td>
                    <td><span className="badge b-gray">{p.category}</span></td>
                    <td style={{ fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--accent)' }}>
                      ₹{Number(p.price).toLocaleString('en-IN')}
                    </td>
                    <td style={{ color: 'var(--text2)', fontSize: 12 }}>per {p.unit}</td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text3)' }}>
                      ₹{Number(p.price).toLocaleString('en-IN')} / {p.unit}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn-edit" onClick={() => openModal(p)}>Edit</button>
                        <button className="btn-del" onClick={() => del(p.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {!loading && items.length === 0 && (
        <div className="empty"><div className="empty-icon">🧴</div><p>No products yet. Click + Add Product.</p></div>
      )}
      {loading && <div className="loading">Loading products...</div>}

      {modal && (
        <div className="modal-bg" onClick={e => e.target.className === 'modal-bg' && setModal(false)}>
          <div className="modal">
            <h3>🧴 {form.id ? 'Edit Product' : 'Add New Product'}</h3>

            <div className="form-row">
              <label>Brand</label>
              <select value={form.brand} onChange={e => set('brand', e.target.value)}>
                {BRANDS.map(b => <option key={b}>{b}</option>)}
              </select>
            </div>

            <div className="form-row">
              <label>Product Name *</label>
              <input
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="e.g. Clothes Washing Soap (Bar)"
              />
            </div>

            <div className="form-grid">
              <div className="form-row">
                <label>Category</label>
                <select value={form.category} onChange={e => set('category', e.target.value)}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-row">
                <label>Unit</label>
                <select value={form.unit} onChange={e => set('unit', e.target.value)}>
                  {UNITS.map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
            </div>

            <div className="form-row">
              <label>Price per {form.unit} (₹) *</label>
              <input
                type="number"
                value={form.price}
                onChange={e => set('price', e.target.value)}
                placeholder="0"
              />
            </div>

            {form.price && (
              <div style={{
                background: 'var(--accent-dim)', border: '1px solid var(--border2)',
                borderRadius: 'var(--r)', padding: '10px 14px', fontSize: 13,
                color: 'var(--accent)', marginBottom: 4
              }}>
                Preview: <b>{form.name || 'Product'}</b> → ₹{Number(form.price).toLocaleString('en-IN')} / {form.unit}
              </div>
            )}

            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn-save" onClick={save} disabled={saving}>
                {saving ? 'Saving...' : 'Save Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
