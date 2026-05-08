import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function InvoiceModal({ sale, onClose }) {
  const [business] = useState({
    name: 'Abi & Muthu Soaps',
    address: 'Tamil Nadu, India',
    phone: '+91 98765 43210',
    email: 'abilash@abisoaps.com',
    gstin: 'YOUR GSTIN HERE',
  })

  const invoiceNum = `INV-${String(sale.invoice_index || 1).padStart(4,'0')}`
  const date = new Date(sale.date).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })
  const fmt = n => '₹' + Number(n).toLocaleString('en-IN')
  const subtotal = +sale.amount
  const tax = 0 // Add GST if needed
  const total = subtotal + tax

  function printInvoice() {
    const w = window.open('', '_blank')
    w.document.write(generateHTML())
    w.document.close()
    w.focus()
    setTimeout(() => { w.print(); w.close() }, 500)
  }

  function shareWhatsApp() {
    const msg = encodeURIComponent(
      `*${business.name}*\n` +
      `Invoice: ${invoiceNum}\n` +
      `Date: ${date}\n` +
      `─────────────────\n` +
      `Product: ${sale.product}\n` +
      `Qty: ${sale.qty || '—'} ${sale.unit || ''}\n` +
      `Amount: ${fmt(total)}\n` +
      `Status: ${sale.status?.toUpperCase()}\n` +
      `─────────────────\n` +
      `Thank you for your business! 🧴`
    )
    window.open(`https://wa.me/?text=${msg}`, '_blank')
  }

  function generateHTML() {
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Invoice ${invoiceNum}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #111; background: #fff; padding: 40px; font-size: 13px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 24px; border-bottom: 3px solid #00d4be; }
  .logo { font-size: 24px; font-weight: 900; color: #00d4be; letter-spacing: -0.5px; }
  .biz-sub { font-size: 11px; color: #888; margin-top: 4px; }
  .inv-title { font-size: 32px; font-weight: 900; color: #111; text-align: right; }
  .inv-num { font-size: 14px; color: #00d4be; font-weight: 700; text-align: right; margin-top: 4px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 36px; }
  .info-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #888; font-weight: 700; margin-bottom: 6px; }
  .info-val { font-size: 14px; font-weight: 600; color: #111; line-height: 1.6; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  th { background: #f4fffe; border-bottom: 2px solid #00d4be; padding: 12px 16px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #555; font-weight: 800; }
  td { padding: 14px 16px; border-bottom: 1px solid #f0f0f0; font-size: 13px; }
  .total-row { display: flex; justify-content: flex-end; margin-top: 8px; }
  .total-box { background: #f4fffe; border: 2px solid #00d4be; border-radius: 12px; padding: 16px 24px; min-width: 220px; }
  .total-line { display: flex; justify-content: space-between; gap: 32px; margin-bottom: 6px; font-size: 13px; color: #555; }
  .total-final { display: flex; justify-content: space-between; gap: 32px; font-size: 18px; font-weight: 900; color: #00d4be; border-top: 1px solid #cdf0ec; padding-top: 10px; margin-top: 6px; }
  .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; }
  .paid { background: #e8fdf4; color: #00a060; border: 1px solid #00c87088; }
  .pending { background: #fff8e0; color: #a07000; border: 1px solid #ffb30088; }
  .partial { background: #e8f0ff; color: #2050a0; border: 1px solid #6090e088; }
  .footer { margin-top: 48px; padding-top: 20px; border-top: 1px solid #eee; display: flex; justify-content: space-between; font-size: 11px; color: #aaa; }
  .accent { color: #00d4be; }
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="logo">🧴 ${business.name}</div>
    <div class="biz-sub">${business.address}</div>
    <div class="biz-sub">${business.phone} · ${business.email}</div>
    ${business.gstin !== 'YOUR GSTIN HERE' ? `<div class="biz-sub">GSTIN: ${business.gstin}</div>` : ''}
  </div>
  <div>
    <div class="inv-title">INVOICE</div>
    <div class="inv-num">${invoiceNum}</div>
    <div style="text-align:right;font-size:12px;color:#888;margin-top:8px;">Date: ${date}</div>
  </div>
</div>

<div class="info-grid">
  <div>
    <div class="info-label">Bill To</div>
    <div class="info-val">${sale.client || 'Walk-in Customer'}</div>
  </div>
  <div>
    <div class="info-label">Payment Status</div>
    <div class="info-val">
      <span class="status-badge ${sale.status}">${sale.status}</span>
    </div>
  </div>
</div>

<table>
  <thead>
    <tr>
      <th>#</th>
      <th>Brand</th>
      <th>Product / Description</th>
      <th>Qty</th>
      <th>Unit</th>
      <th style="text-align:right">Amount</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>1</td>
      <td>${sale.brand}</td>
      <td><strong>${sale.product}</strong></td>
      <td>${sale.qty || '—'}</td>
      <td>${sale.unit || 'pcs'}</td>
      <td style="text-align:right;font-weight:700">${fmt(subtotal)}</td>
    </tr>
  </tbody>
</table>

<div class="total-row">
  <div class="total-box">
    <div class="total-line"><span>Subtotal</span><span>${fmt(subtotal)}</span></div>
    <div class="total-line"><span>GST / Tax</span><span>₹0</span></div>
    <div class="total-final"><span>Total</span><span>${fmt(total)}</span></div>
  </div>
</div>

${sale.notes ? `<div style="margin-top:24px;padding:14px 16px;background:#f8f8f8;border-radius:8px;font-size:12px;color:#555;"><strong>Notes:</strong> ${sale.notes}</div>` : ''}

<div class="footer">
  <span>Generated by Abi & Muthu Soaps Business Manager</span>
  <span class="accent">Thank you for your business! 🙏</span>
</div>
</body>
</html>`
  }

  return (
    <div className="modal-bg" onClick={e => e.target.className === 'modal-bg' && onClose()}>
      <div className="modal" style={{ width: 560 }}>
        <h3>🧾 Invoice — {invoiceNum}</h3>

        {/* Invoice Preview */}
        <div style={{ background:'var(--surface2)', borderRadius:'var(--rl)', padding:24, marginBottom:20, border:'1px solid var(--border2)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
            <div>
              <div style={{ fontSize:16, fontWeight:900, color:'var(--accent)' }}>🧴 {business.name}</div>
              <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>{business.address}</div>
              <div style={{ fontSize:11, color:'var(--text3)' }}>{business.phone}</div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:22, fontWeight:900, color:'var(--text)' }}>INVOICE</div>
              <div style={{ fontSize:13, color:'var(--accent)', fontWeight:700 }}>{invoiceNum}</div>
              <div style={{ fontSize:11, color:'var(--text3)', marginTop:4 }}>{date}</div>
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
            <div>
              <div style={{ fontSize:10, color:'var(--text3)', fontWeight:800, textTransform:'uppercase', letterSpacing:'.1em', marginBottom:4 }}>Bill To</div>
              <div style={{ fontSize:14, fontWeight:700, color:'var(--text)' }}>{sale.client || 'Walk-in Customer'}</div>
            </div>
            <div>
              <div style={{ fontSize:10, color:'var(--text3)', fontWeight:800, textTransform:'uppercase', letterSpacing:'.1em', marginBottom:4 }}>Status</div>
              <span className={`badge ${sale.status==='paid'?'b-green':sale.status==='pending'?'b-amber':'b-blue'}`} style={{ fontSize:11 }}>{sale.status?.toUpperCase()}</span>
            </div>
          </div>

          <table style={{ marginBottom:16 }}>
            <thead><tr><th>Brand</th><th>Product</th><th>Qty</th><th>Unit</th><th style={{ textAlign:'right' }}>Amount</th></tr></thead>
            <tbody>
              <tr>
                <td><span className="badge b-accent">{sale.brand}</span></td>
                <td style={{ fontWeight:700 }}>{sale.product}</td>
                <td style={{ fontFamily:'var(--mono)' }}>{sale.qty || '—'}</td>
                <td style={{ color:'var(--text3)' }}>{sale.unit || 'pcs'}</td>
                <td style={{ textAlign:'right', fontFamily:'var(--mono)', color:'var(--accent)', fontWeight:700 }}>{fmt(total)}</td>
              </tr>
            </tbody>
          </table>

          <div style={{ display:'flex', justifyContent:'flex-end' }}>
            <div style={{ background:'var(--accent-dim)', border:'1px solid var(--border3)', borderRadius:'var(--rl)', padding:'14px 20px', minWidth:200 }}>
              <div style={{ display:'flex', justifyContent:'space-between', gap:24, fontSize:12, color:'var(--text2)', marginBottom:6 }}>
                <span>Subtotal</span><span style={{ fontFamily:'var(--mono)' }}>{fmt(subtotal)}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', gap:24, fontSize:12, color:'var(--text2)', marginBottom:10 }}>
                <span>Tax</span><span style={{ fontFamily:'var(--mono)' }}>₹0</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', gap:24, fontSize:18, fontWeight:900, color:'var(--accent)', borderTop:'1px solid var(--border3)', paddingTop:10 }}>
                <span>Total</span><span style={{ fontFamily:'var(--mono)' }}>{fmt(total)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>Close</button>
          <button className="btn" onClick={shareWhatsApp} style={{ color:'#25D366', borderColor:'#25D366' }}>
            📱 WhatsApp
          </button>
          <button className="btn-save" onClick={printInvoice}>
            🖨️ Print / Save PDF
          </button>
        </div>
      </div>
    </div>
  )
}
