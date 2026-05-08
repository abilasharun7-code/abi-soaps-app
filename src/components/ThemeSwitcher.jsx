const THEMES = [
  { id:'obsidian-teal',  name:'Obsidian Teal',   type:'dark',  bg:'#080d12', accent:'#00d4be', s1:'#0e1520', s2:'#131e2e' },
  { id:'neon-violet',    name:'Neon Violet',      type:'dark',  bg:'#06040f', accent:'#a855f7', s1:'#0d0a1e', s2:'#120f28' },
  { id:'cyber-amber',    name:'Cyber Amber',      type:'dark',  bg:'#0a0800', accent:'#ffb300', s1:'#141000', s2:'#1c1600' },
  { id:'deep-cosmos',    name:'Deep Cosmos',      type:'dark',  bg:'#020408', accent:'#6495ff', s1:'#080c18', s2:'#0d1224' },
  { id:'forest-emerald', name:'Forest Emerald',   type:'dark',  bg:'#030a04', accent:'#00c864', s1:'#071410', s2:'#0a1c16' },
  { id:'crimson-noir',   name:'Crimson Noir',     type:'dark',  bg:'#080404', accent:'#dc3c50', s1:'#120808', s2:'#1a0c0c' },
  { id:'slate-gold',     name:'Slate Gold',       type:'dark',  bg:'#09080e', accent:'#c8a850', s1:'#111018', s2:'#181624' },
  { id:'pearl-light',    name:'Pearl Light',      type:'light', bg:'#f8f9fc', accent:'#3d6ce8', s1:'#ffffff', s2:'#f0f4fa' },
  { id:'rose-quartz',    name:'Rose Quartz',      type:'light', bg:'#fdf6f8', accent:'#e0406a', s1:'#ffffff', s2:'#fceef2' },
  { id:'matcha',         name:'Matcha',           type:'light', bg:'#f4f9f4', accent:'#2a8c50', s1:'#ffffff', s2:'#eaf4ea' },
  { id:'golden-hour',    name:'Golden Hour',      type:'light', bg:'#fffaf0', accent:'#c87800', s1:'#ffffff', s2:'#fff6e0' },
  { id:'arctic-mist',    name:'Arctic Mist',      type:'light', bg:'#f0f7ff', accent:'#1a5ec8', s1:'#ffffff', s2:'#e4f0ff' },
]

function ThemePreview({ theme }) {
  return (
    <div className="theme-preview" style={{ background: theme.bg }}>
      <div className="theme-preview-inner">
        {/* Mini sidebar */}
        <div style={{ width: 28, height: 48, background: theme.s1, borderRadius: 4, marginRight: 4, display: 'flex', flexDirection: 'column', gap: 3, padding: '5px 4px', border: `1px solid ${theme.accent}22` }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ height: 5, borderRadius: 2, background: i === 1 ? theme.accent : `${theme.accent}33`, boxShadow: i === 1 ? `0 0 6px ${theme.accent}88` : 'none' }} />
          ))}
        </div>
        {/* Mini content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{ display: 'flex', gap: 3 }}>
            {[theme.accent, `${theme.accent}66`, `${theme.accent}44`, `${theme.accent}33`].map((c, i) => (
              <div key={i} style={{ flex: 1, height: 14, borderRadius: 3, background: theme.s2, border: `1px solid ${theme.accent}22`, borderTop: `2px solid ${c}`, boxShadow: i === 0 ? `0 0 8px ${theme.accent}55` : 'none' }} />
            ))}
          </div>
          <div style={{ height: 22, background: theme.s2, borderRadius: 3, border: `1px solid ${theme.accent}22` }} />
        </div>
      </div>
    </div>
  )
}

export default function ThemeSwitcher({ current, onChange, onClose }) {
  return (
    <div className="modal-bg" onClick={e => e.target.className === 'modal-bg' && onClose()}>
      <div className="modal theme-modal">
        <h3>✦ Choose Your Theme</h3>
        <div className="theme-grid">
          {THEMES.map(t => (
            <div
              key={t.id}
              className={`theme-option ${current === t.id ? 'selected' : ''}`}
              onClick={() => onChange(t.id)}
            >
              <div style={{ position: 'relative' }}>
                <ThemePreview theme={t} />
                {current === t.id && <div className="theme-check">✓</div>}
              </div>
              <div className="theme-meta">
                <div className="theme-name">{t.name}</div>
                <div className="theme-font">Nunito · DM Mono</div>
                <span className={`theme-type t-${t.type}`}>{t.type === 'dark' ? '◗ DARK' : '◑ LIGHT'}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="theme-footer">12 themes · Nunito throughout · Saved automatically</div>
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
