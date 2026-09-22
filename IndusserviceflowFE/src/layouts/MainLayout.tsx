import { type ReactNode, type CSSProperties, useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'

const NAV = [
  { path: '/simulation', label: 'Simulations', icon: '∿' },
]

export default function MainLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
  }, [isDark])

  const t = isDark ? dark : light

  return (
    <div style={{ ...s.shell, background: t.pageBg }}>
      <aside style={{ ...s.sidebar, background: t.surface, borderColor: t.border }}>
        <div style={s.brand}>
          <div style={s.brandIcon}>
            <span style={{ fontSize: 18 }}>〜</span>
          </div>
          <div>
            <div style={{ ...s.brandName, color: t.text }}>Indus Service Flow</div>
            <div style={s.brandSub}>ORGANIZATION PORTAL</div>
          </div>
        </div>

        <nav style={s.nav}>
          {NAV.map(({ path, label, icon }) => {
            const active = pathname.startsWith(path)
            return (
              <Link key={path} to={path} style={{ ...s.navItem, color: active ? '#0d9488' : t.muted, ...(active ? s.navActive : { background: 'transparent' }) }}>
                <span style={s.navIcon}>{icon}</span>
                <span>{label}</span>
              </Link>
            )
          })}
        </nav>
      </aside>

      <div style={s.main}>
        <header style={{ ...s.topbar, background: t.surface, borderColor: t.border }}>
          <div style={s.orgBadge}>
            <div style={s.orgAvatar}>A</div>
            <span style={{ ...s.orgName, color: t.text }}>Apollo Hospitals Chennai</span>
          </div>
          <div style={s.topRight}>
            <div style={{ ...s.searchBox, background: t.inputBg, borderColor: t.border }}>
              <span style={{ color: '#94a3b8', marginRight: 6 }}>🔍</span>
              <input style={{ ...s.searchInput, color: t.text }} placeholder="Search..." />
            </div>
            <button style={{ ...s.iconBtn, borderColor: t.border, background: t.inputBg }} onClick={() => setIsDark(d => !d)}>
              {isDark ? '☀️' : '🌙'}
            </button>
            <button style={s.iconBtn}>🔔</button>
            <div style={s.avatar}>R</div>
          </div>
        </header>

        <div style={{ ...s.content, background: t.pageBg }}>{children}</div>
      </div>
    </div>
  )
}

const light = { pageBg: '#f0f4f8', surface: '#fff', border: '#e2e8f0', text: '#0f172a', muted: '#64748b', inputBg: '#f8fafc' }
const dark  = { pageBg: '#0f172a', surface: '#1e293b', border: '#334155', text: '#f1f5f9',  muted: '#94a3b8', inputBg: '#0f172a' }

const s: Record<string, CSSProperties> = {
  shell: { display: 'flex', minHeight: '100vh', background: '#f0f4f8' },
  sidebar: {
    width: 230,
    background: '#fff',
    borderRight: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    position: 'sticky',
    top: 0,
    height: '100vh',
    overflowY: 'auto',
  },
  brand: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '18px 16px 16px',
    borderBottom: '1px solid #f1f5f9',
  },
  brandIcon: {
    width: 36, height: 36, borderRadius: 8,
    background: 'linear-gradient(135deg,#0d9488,#0891b2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', fontWeight: 700,
  },
  brandName: { fontSize: 13, fontWeight: 700, color: '#0f172a' },
  brandSub: { fontSize: 9, color: '#94a3b8', letterSpacing: '0.08em', marginTop: 1 },
  nav: { flex: 1, padding: '10px 10px', display: 'flex', flexDirection: 'column', gap: 2 },
  navItem: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '9px 12px', borderRadius: 8,
    fontSize: 13, color: '#64748b', fontWeight: 500,
    textDecoration: 'none',
  },
  navActive: { background: '#f0fdfa', color: '#0d9488', fontWeight: 600 },
  navIcon: { fontSize: 15, width: 18, textAlign: 'center' },
  main: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 },
  topbar: {
    height: 56, background: '#fff',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex', alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px', flexShrink: 0,
    position: 'sticky', top: 0, zIndex: 10,
  },
  orgBadge: { display: 'flex', alignItems: 'center', gap: 10 },
  orgAvatar: {
    width: 30, height: 30, borderRadius: 6,
    background: '#0d9488', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 13, fontWeight: 700,
  },
  orgName: { fontSize: 14, fontWeight: 600, color: '#0f172a' },
  topRight: { display: 'flex', alignItems: 'center', gap: 10 },
  searchBox: {
    display: 'flex', alignItems: 'center',
    background: '#f8fafc', border: '1px solid #e2e8f0',
    borderRadius: 8, padding: '6px 12px',
  },
  searchInput: {
    border: 'none', background: 'none',
    outline: 'none', fontSize: 13, color: '#334155', width: 160,
  },
  iconBtn: {
    background: 'none', border: '1px solid #e2e8f0',
    borderRadius: 8, padding: '6px 10px',
    cursor: 'pointer', fontSize: 14,
  },
  avatar: {
    width: 32, height: 32, borderRadius: '50%',
    background: '#0d9488', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 13, fontWeight: 700,
  },
  content: { flex: 1, padding: '24px' },
}
