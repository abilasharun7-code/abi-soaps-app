import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const today = new Date().toISOString().split('T')[0]

const SYSTEM = `You are a smart business assistant for "Abi & Muthu Soaps", a soap manufacturing business in India.

You have TWO modes:
1. DATA ENTRY MODE: When user describes their day (production, sales, expenses, purchases) — extract and return JSON
2. QUESTION MODE: When user asks a question about their business — answer in plain English

For DATA ENTRY, return ONLY this JSON:
{
  "mode": "data",
  "summary": "one line summary",
  "inventory": [{"name":"","unit":"kg","stock":0,"min":5,"cost":0,"supplier":""}],
  "batches": [{"date":"${today}","brand":"","product":"","qty":0,"status":"completed","notes":""}],
  "clients": [{"name":"","type":"Retailer","phone":"","location":"","buys":""}],
  "sales": [{"date":"${today}","client":"","brand":"","product":"","qty":0,"amount":0,"status":"paid"}],
  "expenses": [{"date":"${today}","category":"Raw Material","description":"","brand":"Both","amount":0,"paidby":""}]
}

For QUESTIONS, return ONLY this JSON:
{
  "mode": "answer",
  "answer": "your clear, helpful answer here"
}

Rules:
- Use today ${today} if no date mentioned
- Numbers only for amounts (no ₹ symbol)
- Empty arrays [] if no data for that category
- Return ONLY valid JSON, nothing else`

export default function AIAssistant({ onClose, onDataSaved }) {
  const [messages, setMessages] = useState([{
    role:'system',
    text:`✦ Hi! I'm your AI business assistant.\n\n📝 Describe your day and I'll save everything automatically.\n💬 Or ask me any question about your business!\n\nExamples:\n• "Today made 200 bars Abi soap. Sold to Ravi for ₹2000. Bought caustic soda 15kg for ₹900"\n• "Which product made the most profit this month?"\n• "How much did I spend on raw materials this week?"`
  }])
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef             = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }) }, [messages])

  async function send() {
    if (!input.trim() || loading) return
    const text = input.trim(); setInput('')
    setMessages(m => [...m, { role:'user', text }, { role:'thinking', text:'✦ Thinking...' }])
    setLoading(true)

    const key = import.meta.env.VITE_ANTHROPIC_KEY
    if (!key || key.length < 20) {
      setMessages(m => m.filter(x=>x.role!=='thinking').concat([{ role:'error', text:'⚠️ Add VITE_ANTHROPIC_KEY to your .env file and restart npm run dev.' }]))
      setLoading(false); return
    }

    // For questions, fetch business context
    let contextPrompt = text
    const isQuestion = /\?|how much|which|what|who|when|show me|tell me|compare|best|most|least|total|summary/i.test(text)
    if (isQuestion) {
      const [s, e, b, inv, prod] = await Promise.all([
        supabase.from('sales').select('*').order('date', {ascending:false}).limit(50),
        supabase.from('expenses').select('*').order('date', {ascending:false}).limit(50),
        supabase.from('batches').select('*').order('date', {ascending:false}).limit(20),
        supabase.from('inventory').select('*'),
        supabase.from('products').select('*'),
      ])
      contextPrompt = `Business data context:
Sales (last 50): ${JSON.stringify(s.data||[])}
Expenses (last 50): ${JSON.stringify(e.data||[])}
Batches (last 20): ${JSON.stringify(b.data||[])}
Inventory: ${JSON.stringify(inv.data||[])}
Products: ${JSON.stringify(prod.data||[])}
Today: ${today}

User question: ${text}`
    }

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST',
        headers:{'Content-Type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
        body: JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:1000, system:SYSTEM, messages:[{role:'user',content:contextPrompt}] })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'API error')
      let parsed
      try { parsed = JSON.parse(data.content?.[0]?.text?.replace(/```json|```/g,'').trim()) }
      catch { setMessages(m=>m.filter(x=>x.role!=='thinking').concat([{role:'error',text:'Could not parse response. Try again.'}])); setLoading(false); return }

      if (parsed.mode === 'answer') {
        setMessages(m=>m.filter(x=>x.role!=='thinking').concat([{ role:'assistant', text:parsed.answer, isAnswer:true }]))
      } else {
        const saved = []
        for (const item of (parsed.inventory||[])) {
          if (item.name) { await supabase.from('inventory').insert({ name:item.name, unit:item.unit||'kg', stock:+item.stock||0, min:+item.min||5, cost:+item.cost||0, supplier:item.supplier||'' }); saved.push(`📦 Material: ${item.name} — ${item.stock} ${item.unit}`) }
        }
        for (const b of (parsed.batches||[])) {
          if (b.qty) { await supabase.from('batches').insert({ date:b.date||today, brand:b.brand, product:b.product, qty:+b.qty, status:b.status||'completed', notes:b.notes||'' }); saved.push(`🧪 Batch: ${b.qty} units — ${b.product}`) }
        }
        for (const c of (parsed.clients||[])) {
          if (c.name) { const {data:ex}=await supabase.from('clients').select('id').eq('name',c.name).single(); if(!ex){await supabase.from('clients').insert({name:c.name,type:c.type||'Retailer',phone:c.phone||'',location:c.location||'',buys:c.buys||''}); saved.push(`👤 New client: ${c.name}`)}}
        }
        for (const s of (parsed.sales||[])) {
          if (s.amount) { await supabase.from('sales').insert({date:s.date||today,client:s.client||'',brand:s.brand,product:s.product||'',qty:+s.qty||0,amount:+s.amount,status:s.status||'paid'}); saved.push(`💰 Sale: ₹${Number(s.amount).toLocaleString('en-IN')} — ${s.product}`) }
        }
        for (const e of (parsed.expenses||[])) {
          if (e.amount) { await supabase.from('expenses').insert({date:e.date||today,category:e.category||'Other',description:e.description||'',brand:e.brand||'Both',amount:+e.amount,paidby:e.paidby||''}); saved.push(`🧾 Expense: ₹${Number(e.amount).toLocaleString('en-IN')} — ${e.description}`) }
        }
        setMessages(m=>m.filter(x=>x.role!=='thinking').concat([{ role:'assistant', text:parsed.summary||'Done!', saved }]))
        if (saved.length>0) onDataSaved()
      }
    } catch(err) {
      setMessages(m=>m.filter(x=>x.role!=='thinking').concat([{role:'error',text:`Error: ${err.message}`}]))
    }
    setLoading(false)
  }

  const quickQ = ['Which product sold most this month?', 'How much profit did I make this week?', 'Which client owes me money?', 'What raw materials are running low?']

  return (
    <div className="ai-panel">
      <div className="ai-head">
        <h2>✦ AI Assistant</h2>
        <button className="btn" onClick={onClose}>✕ Close</button>
      </div>
      <div className="ai-messages">
        {messages.map((m,i)=>(
          <div key={i} className={`ai-msg ${m.role}`}>
            {m.isAnswer && <div style={{fontSize:10,fontWeight:800,color:'var(--accent)',marginBottom:8,textTransform:'uppercase',letterSpacing:'.1em'}}>✦ AI ANSWER</div>}
            <div style={{whiteSpace:'pre-line'}}>{m.text}</div>
            {m.saved?.length>0&&(
              <div style={{marginTop:10}}>
                <div style={{fontSize:10,fontWeight:800,color:'var(--text3)',marginBottom:6,textTransform:'uppercase',letterSpacing:'.08em'}}>Saved to database</div>
                {m.saved.map((s,j)=><div key={j} className="ai-saved">{s}</div>)}
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef}/>
      </div>
      <div className="ai-footer">
        <div style={{display:'flex',gap:6,marginBottom:10,flexWrap:'wrap'}}>
          {quickQ.map((q,i)=>(
            <button key={i} onClick={()=>setInput(q)} style={{fontSize:10,padding:'4px 9px',background:'var(--accent-dim)',border:'1px solid var(--border2)',borderRadius:20,color:'var(--accent)',cursor:'pointer',fontFamily:'var(--font)',fontWeight:700,transition:'all .15s'}}>{q}</button>
          ))}
        </div>
        <div className="ai-hint">📝 Describe your day OR 💬 ask any business question</div>
        <div className="ai-row">
          <textarea value={input} onChange={e=>setInput(e.target.value)} placeholder="e.g. Today made 150 bars Abi soap... or Which product sold most?" onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}}} disabled={loading}/>
          <button className="ai-send" onClick={send} disabled={loading}>{loading?'...':'Send ↗'}</button>
        </div>
      </div>
    </div>
  )
}
