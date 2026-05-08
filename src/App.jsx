import { useState, useEffect } from 'react'
import Login from './components/Login'
import AIAssistant from './components/AIAssistant'
import ThemeSwitcher from './components/ThemeSwitcher'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import Batches from './pages/Batches'
import Clients from './pages/Clients'
import Sales from './pages/Sales'
import Expenses from './pages/Expenses'
import Products from './pages/Products'
import Analytics from './pages/Analytics'
import Users from './pages/Users'
import Status from './pages/Status'
import Account from './pages/Account'
import './App.css'

const ALL_NAV = [
  { id:'dashboard',  label:'Dashboard',        icon:'⊞', section:'Overview',    perm:'dashboard' },
  { id:'analytics',  label:'Analytics',         icon:'📊', section:null,         perm:'dashboard' },
  { id:'inventory',  label:'Raw Materials',     icon:'◫', section:'Operations',  perm:'inventory' },
  { id:'batches',    label:'Batch Production',  icon:'⬡', section:null,         perm:'batches' },
  { id:'products',   label:'Products',          icon:'🧴', section:'Business',   perm:'products' },
  { id:'clients',    label:'Clients',           icon:'◎', section:null,         perm:'clients' },
  { id:'sales',      label:'Sales & Orders',    icon:'◈', section:null,         perm:'sales' },
  { id:'expenses',   label:'Expenses',          icon:'◆', section:null,         perm:'expenses' },
  { id:'users',      label:'Users',             icon:'👥', section:'Settings',   perm:'status' },
  { id:'status',     label:'System Status',     icon:'◉', section:null,         perm:'status' },
  { id:'account',    label:'My Account',        icon:'◐', section:null,         perm:'account' },
]

const pages     = { dashboard:Dashboard, analytics:Analytics, inventory:Inventory, batches:Batches, products:Products, clients:Clients, sales:Sales, expenses:Expenses, users:Users, status:Status, account:Account }
const addLabels = { dashboard:'New Sale', analytics:null, inventory:'Add Material', batches:'New Batch', products:'Add Product', clients:'Add Client', sales:'New Sale', expenses:'Add Expense', users:'Add User', status:null, account:null }

export default function App() {
  const [user,       setUser]       = useState(() => { try { return JSON.parse(localStorage.getItem('abi_user')) } catch { return null } })
  const [page,       setPage]       = useState('dashboard')
  const [triggerAdd, setTriggerAdd] = useState(0)
  const [showAI,     setShowAI]     = useState(false)
  const [showTheme,  setShowTheme]  = useState(false)
  const [theme,      setTheme]      = useState(() => localStorage.getItem('abi_theme') || 'obsidian-teal')
  const [aiRefresh,  setAiRefresh]  = useState(0)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('abi_theme', theme)
  }, [theme])

  if (!user) return <Login onLogin={setUser} />

  // Filter nav based on user permissions
  const perms = user.permissions || {}
  const nav = ALL_NAV.filter(n => perms[n.perm] !== false)

  const PageComponent = pages[page] || Dashboard
  const addLabel      = addLabels[page]

  // Track sections to avoid duplicates
  const renderedSections = new Set()

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo">A</div>
          <div>
            <div className="brand-name">Abi & Muthu Soaps</div>
            <div className="brand-sub">Business Manager</div>
          </div>
        </div>

        <nav className="nav">
          {nav.map(item => {
            const showSection = item.section && !renderedSections.has(item.section)
            if (item.section) renderedSections.add(item.section)
            return (
              <div key={item.id}>
                {showSection && <div className="nav-section">{item.section}</div>}
                <button
                  className={`nav-item ${page === item.id ? 'active' : ''}`}
                  onClick={() => setPage(item.id)}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {item.label}
                  {item.id === 'status' && (
                    <span style={{ marginLeft:'auto', width:8, height:8, borderRadius:'50%', background:'var(--green)', boxShadow:'0 0 8px var(--green-glow)', flexShrink:0 }} />
                  )}
                  {item.id === 'analytics' && (
                    <span className="nav-badge" style={{ fontSize:8 }}>NEW</span>
                  )}
                </button>
              </div>
            )
          })}
        </nav>

        <div className="sidebar-bottom">
          <button className="nav-item ai-btn" onClick={() => setShowAI(true)}>
            <span className="nav-icon">✦</span>
            AI Assistant
            <span className="nav-badge">AI</span>
          </button>
          <button className="nav-item" onClick={() => setShowTheme(true)}>
            <span className="nav-icon">◐</span>
            Themes
          </button>
        </div>

        <div className="sidebar-footer">
          <span className="brand-pill bp-accent">Abi Soaps</span>
          <span className="brand-pill bp-amber">Muthu Soap</span>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="topbar-left">
            <div className="page-title">{ALL_NAV.find(n => n.id === page)?.label || 'Dashboard'}</div>
            <div className="topbar-date">{new Date().toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'long', year:'numeric' })}</div>
          </div>
          <div className="topbar-right">
            <button className="btn-ai" onClick={() => setShowAI(true)}>✦ Ask AI</button>
            {addLabel && (
              <button className="btn primary" onClick={() => setTriggerAdd(t => t + 1)}>
                + {addLabel}
              </button>
            )}
            <button className="btn" onClick={() => setPage('account')} style={{ gap:10 }}>
              <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--accent-dim)', border:'1.5px solid var(--border3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:900, color:'var(--accent)', boxShadow:'var(--glow-sm)', flexShrink:0 }}>
                {user.name?.[0]?.toUpperCase()}
              </div>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-start', gap:1 }}>
                <span style={{ fontWeight:800, fontSize:12 }}>{user.name}</span>
                <span style={{ fontSize:10, color:'var(--text3)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.06em' }}>{user.role}</span>
              </div>
            </button>
          </div>
        </header>

        <div className="content">
          <PageComponent
            triggerAdd={triggerAdd}
            aiRefresh={aiRefresh}
            user={user}
            onLogout={() => { localStorage.removeItem('abi_user'); setUser(null) }}
            onUpdateUser={u => { setUser(u); localStorage.setItem('abi_user', JSON.stringify(u)) }}
          />
        </div>
      </main>

      {showAI    && <AIAssistant   onClose={() => setShowAI(false)}    onDataSaved={() => setAiRefresh(r => r + 1)} />}
      {showTheme && <ThemeSwitcher current={theme} onChange={setTheme} onClose={() => setShowTheme(false)} />}
    </div>
  )
}
