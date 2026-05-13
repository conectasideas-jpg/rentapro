import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const ROLES = { admin: 'Administrador', operador: 'Operador', readonly: 'Solo lectura' }

const initials = name => name?.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase() || 'RP'

export default function Layout({ children }) {
  const { usuario, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const isAdmin = usuario?.rol === 'admin'

  const navItems = [
    { path: '/', icon: 'ti-chart-bar', label: 'Dashboard' },
    { path: '/arriendos', icon: 'ti-clipboard-list', label: 'Arriendos' },
    { path: '/equipos', icon: 'ti-tool', label: 'Equipos' },
    { path: '/clientes', icon: 'ti-users', label: 'Clientes' },
    { path: '/combos', icon: 'ti-package', label: 'Ofertas' },
    { path: '/reportes', icon: 'ti-chart-line', label: 'Reportes', sep: true },
    ...(isAdmin ? [{ path: '/usuarios', icon: 'ti-shield-lock', label: 'Usuarios', sep: true }] : []),
  ]

  return (
    <div className="app-layout">
      {/* SIDEBAR */}
      <div className="app-sidebar">
        <div style={{ padding: '18px 14px 14px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 20, fontWeight: 800 }}>
            Renta<span style={{ color: 'var(--brand)' }}>Pro</span>
          </div>
          <div style={{ fontSize: 10, color: 'var(--text3)', letterSpacing: 2, textTransform: 'uppercase', marginTop: 3 }}>
            Gestión de arriendos
          </div>
        </div>

        <nav style={{ flex: 1, padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {navItems.map(item => {
            const active = location.pathname === item.path
            return (
              <div key={item.path}>
                {item.sep && <div style={{ height: 1, background: 'var(--border)', margin: '6px 4px' }} />}
                <button
                  onClick={() => navigate(item.path)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 9,
                    padding: active ? '9px 9px 9px 9px' : '9px 10px',
                    borderRadius: active ? '0 var(--radius) var(--radius) 0' : 'var(--radius)',
                    background: active ? 'var(--brand-light)' : 'none',
                    color: active ? 'var(--brand-text)' : 'var(--text2)',
                    fontWeight: active ? 700 : 500,
                    borderLeft: active ? '3px solid var(--brand)' : '3px solid transparent',
                    border: active ? undefined : '1px solid transparent',
                    fontSize: 13, width: '100%', textAlign: 'left', cursor: 'pointer',
                    transition: 'all .12s'
                  }}
                >
                  <i className={`ti ${item.icon}`} style={{ fontSize: 17 }} />
                  {item.label}
                </button>
              </div>
            )
          })}
        </nav>

        <div style={{ padding: 10, borderTop: '1px solid var(--border)' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: 8, borderRadius: 'var(--radius)', background: 'var(--surface2)'
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%', background: 'var(--brand)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 11, color: '#fff', flexShrink: 0
            }}>
              {initials(usuario?.nombre)}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {usuario?.nombre}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text3)' }}>{ROLES[usuario?.rol]}</div>
            </div>
          </div>
          <button className="btn btn-sm" onClick={signOut}
            style={{ width: '100%', justifyContent: 'center', marginTop: 6 }}>
            <i className="ti ti-logout" /> Salir
          </button>
        </div>
      </div>

      {/* MAIN */}
      <div className="app-main">
        {children}
      </div>
    </div>
  )
}
