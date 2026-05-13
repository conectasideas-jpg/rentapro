import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const ROLES = { admin: 'Administrador', operador: 'Operador', readonly: 'Solo lectura' }
const initials = name => name?.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase() || 'RP'

const NAV_ITEMS = [
  { path: '/', icon: 'ti-layout-dashboard', label: 'Dashboard' },
  { path: '/arriendos', icon: 'ti-clipboard-list', label: 'Arriendos' },
  { path: '/equipos', icon: 'ti-tool', label: 'Equipos' },
  { path: '/clientes', icon: 'ti-users', label: 'Clientes' },
  { path: '/combos', icon: 'ti-package', label: 'Ofertas' },
]

const NAV_REPORTS = [
  { path: '/reportes', icon: 'ti-chart-bar', label: 'Reportes' },
]

const NAV_ADMIN = [
  { path: '/usuarios', icon: 'ti-shield-lock', label: 'Usuarios' },
]

export default function Layout({ children }) {
  const { usuario, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const isAdmin = usuario?.rol === 'admin'

  const allNavItems = [...NAV_ITEMS, ...NAV_REPORTS, ...(isAdmin ? NAV_ADMIN : [])]
  const currentTitle = useMemo(
    () => allNavItems.find(item => item.path === location.pathname)?.label || 'Dashboard',
    [location.pathname]
  )

  const closeMobileMenu = () => setMobileOpen(false)
  const goTo = (path) => { navigate(path); closeMobileMenu() }

  const renderNavGroup = (items) =>
    items.map(item => {
      const active = location.pathname === item.path
      return (
        <button
          key={item.path}
          className={`nav-item ${active ? 'active' : ''}`}
          onClick={() => goTo(item.path)}
        >
          <i className={`ti ${item.icon} nav-icon`} />
          {item.label}
        </button>
      )
    })

  return (
    <div className="app-layout">

      {/* MOBILE HEADER */}
      <div className="mobile-header">
        <button className="mobile-menu-btn" onClick={() => setMobileOpen(o => !o)}>
          <i className={`ti ${mobileOpen ? 'ti-x' : 'ti-menu-2'}`} />
        </button>
        <div className="mobile-header-logo">
          <img src="/icono.png" alt="RentaPro" className="sidebar-logo-img" />
          <span className="mobile-header-title">{currentTitle}</span>
        </div>
        <div className="mobile-header-avatar">{initials(usuario?.nombre)}</div>
      </div>

      {/* SIDEBAR */}
      <aside className={`app-sidebar ${mobileOpen ? 'mobile-open' : ''}`}>

        {/* Logo */}
        <div className="sidebar-logo">
          <img src="/icono.png" alt="RentaPro logo" className="sidebar-logo-img" />
          <div className="sidebar-logo-text">
            <div className="sidebar-logo-name">Renta<span>Pro</span></div>
            <div className="sidebar-logo-tagline">Gestión de arriendos</div>
          </div>
        </div>

        {/* Nav principal */}
        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Principal</div>
          {renderNavGroup(NAV_ITEMS)}

          <div className="sidebar-sep" />
          <div className="sidebar-section-label">Análisis</div>
          {renderNavGroup(NAV_REPORTS)}

          {isAdmin && (
            <>
              <div className="sidebar-sep" />
              <div className="sidebar-section-label">Admin</div>
              {renderNavGroup(NAV_ADMIN)}
            </>
          )}
        </nav>

        {/* User section */}
        <div className="sidebar-user">
          <div className="user-card">
            <div className="user-avatar">{initials(usuario?.nombre)}</div>
            <div style={{ minWidth: 0 }}>
              <div className="user-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {usuario?.nombre}
              </div>
              <div className="user-role">{ROLES[usuario?.rol]}</div>
            </div>
          </div>
          <button className="btn btn-sm" onClick={signOut} style={{ width: '100%', justifyContent: 'center' }}>
            <i className="ti ti-logout" /> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Overlay mobile */}
      <div className={`sidebar-overlay ${mobileOpen ? 'open' : ''}`} onClick={closeMobileMenu} />

      {/* MAIN */}
      <div className="app-main" onClick={mobileOpen ? closeMobileMenu : undefined}>
        {children}
      </div>
    </div>
  )
}
