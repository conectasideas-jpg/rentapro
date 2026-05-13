import { useState } from 'react'
import ReportesArriendos from '../components/ReportesArriendos'
import ReportesClientes from '../components/ReportesClientes'
import ReportesEquipos from '../components/ReportesEquipos'
import ReportesCombos from '../components/ReportesCombos'
import ReportesRentabilidad from '../components/ReportesRentabilidad'
import ReportesDisponibilidad from '../components/ReportesDisponibilidad'
import ReportesFlujoCaja from '../components/ReportesFlujoCaja'
import PageHeader from '../components/PageHeader'

export default function Reportes() {
  const [tabActiva, setTabActiva] = useState('arriendos')

  const tabs = [
    { id: 'arriendos',      label: 'Arriendos',     icon: 'ti-clipboard-list' },
    { id: 'clientes',       label: 'Clientes',      icon: 'ti-users' },
    { id: 'equipos',        label: 'Equipos',       icon: 'ti-tool' },
    { id: 'combos',         label: 'Ofertas',       icon: 'ti-package' },
    { id: 'disponibilidad', label: 'Disponibilidad',icon: 'ti-calendar-check' },
    { id: 'rentabilidad',   label: 'Rentabilidad',  icon: 'ti-coin' },
    { id: 'flujo',          label: 'Flujo de Caja', icon: 'ti-trending-up' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <PageHeader title="Reportes" icon="ti-chart-bar" />

      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* TABS */}
        <div style={{
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          padding: '0 20px',
          display: 'flex',
          gap: 0,
          overflowX: 'auto'
        }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setTabActiva(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '16px 18px', border: 'none',
                background: tabActiva === tab.id ? 'var(--bg)' : 'transparent',
                borderBottom: tabActiva === tab.id ? '3px solid var(--brand)' : '3px solid transparent',
                color: tabActiva === tab.id ? 'var(--brand)' : 'var(--text2)',
                fontWeight: tabActiva === tab.id ? 600 : 500,
                fontSize: 13, cursor: 'pointer',
                transition: 'all .12s', whiteSpace: 'nowrap'
              }}
            >
              <i className={`ti ${tab.icon}`} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* CONTENIDO */}
        <div style={{ flex: 1, overflow: 'auto', background: 'var(--bg)' }}>
          {tabActiva === 'arriendos'      && <ReportesArriendos />}
          {tabActiva === 'clientes'       && <ReportesClientes />}
          {tabActiva === 'equipos'        && <ReportesEquipos />}
          {tabActiva === 'combos'         && <ReportesCombos />}
          {tabActiva === 'disponibilidad' && <ReportesDisponibilidad />}
          {tabActiva === 'rentabilidad'   && <ReportesRentabilidad />}
          {tabActiva === 'flujo'          && <ReportesFlujoCaja />}
        </div>
      </div>
    </div>
  )
}
