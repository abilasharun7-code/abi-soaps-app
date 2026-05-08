import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AlertsBanner() {
  const [alerts, setAlerts] = useState([])
  const [dismissed, setDismissed] = useState(() => {
    try { return JSON.parse(localStorage.getItem('dismissed_alerts') || '[]') } catch { return [] }
  })

  useEffect(() => { checkAlerts() }, [])

  async function checkAlerts() {
    const newAlerts = []
    const today = new Date().toISOString().split('T')[0]

    const { data: inv } = await supabase.from('inventory').select('*')
    const { data: sales } = await supabase.from('sales').select('*').eq('status', 'pending')
    const { data: todaySales } = await supabase.from('sales').select('id').eq('date', today)

    // Out of stock — highest priority
    const outOfStock = (inv || []).filter(m => +m.stock === 0)
    outOfStock.forEach(m => {
      newAlerts.push({
        id: 'out_' + m.id,
        type: 'danger',
        icon: '🚨',
        text: 'OUT OF STOCK: ' + m.name + ' — restock immediately!'
      })
    })

    // Low stock
    const lowStock = (inv || []).filter(m => +m.stock > 0 && +m.stock <= +m.min)
    lowStock.forEach(m => {
      newAlerts.push({
        id: 'low_' + m.id,
        type: 'warning',
        icon: '📦',
        text: 'Low stock: ' + m.name + ' — only ' + m.stock + ' ' + m.unit + ' left'
      })
    })

    // Pending payments
    const pendingSales = sales || []
    if (pendingSales.length > 0) {
      const total = pendingSales.reduce((a, s) => a + Number(s.amount), 0)
      const count = pendingSales.length
      const label = count === 1 ? '1 pending payment' : count + ' pending payments'
      newAlerts.push({
        id: 'pending_pay',
        type: 'amber',
        icon: '💳',
        text: label + ': Rs.' + total.toLocaleString('en-IN') + ' outstanding'
      })
    }

    // No sales today
    if ((todaySales || []).length === 0) {
      newAlerts.push({
        id: 'no_sales_today',
        type: 'info',
        icon: '🛒',
        text: 'No sales recorded today yet — remember to log your orders!'
      })
    }

    setAlerts(newAlerts.filter(a => !dismissed.includes(a.id)))
  }

  function dismiss(id) {
    const updated = [...dismissed, id]
    setDismissed(updated)
    localStorage.setItem('dismissed_alerts', JSON.stringify(updated))
    setAlerts(prev => prev.filter(a => a.id !== id))
  }

  if (alerts.length === 0) return null

  const colorMap = {
    danger:  { bg: 'var(--red-dim)',    border: 'rgba(220,60,80,.3)',  text: 'var(--red)',    glow: '0 0 12px rgba(220,60,80,.3)' },
    warning: { bg: 'var(--amber-dim)',  border: 'rgba(255,179,0,.3)',  text: 'var(--amber)',  glow: '0 0 12px rgba(255,179,0,.3)' },
    amber:   { bg: 'var(--amber-dim)',  border: 'rgba(255,179,0,.3)',  text: 'var(--amber)',  glow: '0 0 12px rgba(255,179,0,.3)' },
    info:    { bg: 'var(--accent-dim)', border: 'var(--border3)',      text: 'var(--accent)', glow: '0 0 12px var(--accent-dim)' },
  }

  return (
    <div style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {alerts.map(a => {
        const c = colorMap[a.type] || colorMap.info
        return (
          <div
            key={a.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '11px 16px',
              background: c.bg,
              border: '1px solid ' + c.border,
              borderRadius: 'var(--rl)',
              boxShadow: c.glow,
            }}
          >
            <span style={{ fontSize: 16, flexShrink: 0 }}>{a.icon}</span>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: c.text }}>{a.text}</span>
            <button
              onClick={() => dismiss(a.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.text, fontSize: 16, opacity: 0.6, fontWeight: 900, padding: '0 4px' }}
            >
              x
            </button>
          </div>
        )
      })}
    </div>
  )
}
