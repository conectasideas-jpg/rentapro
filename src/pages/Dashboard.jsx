/**
 * Dashboard.jsx — OPTIMIZADO
 * 1. useQuery con caché para arriendos activos y clientes
 * 2. SkeletonDashboardStats reemplaza spinner vacío
 * 3. invalidateMany() después de devolver equipo
 */
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useQuery, invalidateMany } from '../lib/cache'
import { fetchArriendosActivos, fetchClientes, fetchUsuariosPendientes } from '../lib/fetchers'
import { useAuth } from '../hooks/useAuth'
import PageHeader from '../components/PageHeader'
import { SkeletonDashboardStats, SkeletonTableRows } from '../components/Skeleton'

const fmt = n => '$' + Math.round(n || 0).toLocaleString('es-CL')

export default function Dashboard() {
  const { usuario, can } = useAuth()
  const navigate = useNavigate()

  const { data: arriendos = [], loading: loadArr } = useQuery('arriendos-activos', fetchArriendosActivos)
  const { data: clientes = [], loading: loadCli } = useQuery('clientes', fetchClientes)
  const { data: pendientes = [], loading: loadPend } = useQuery(
    'usuarios-pendientes', fetchUsuariosPendientes,
    { enabled: usuario?.rol === 'admin' }
  )

  const loading = loadArr || loadCli

  const hoy = new Date().toISOString().split('T')[0]
  const mes = hoy.slice(0, 7)
  const activos = arriendos.filter(a => a.estado === 'activo')
  const vencidos = activos.filter(a => a.fecha_fin < hoy)
  const ingMes = arriendos.filter(a => a.fecha_inicio?.startsWith(mes)).reduce((s, a) => s + (a.total || 0), 0)

  async function devolver(id) {
    const { data: arriendo, error } = await supabase
      .from('arriendos').select('tipo, equipo_id').eq('id', id).single()
    if (error) { console.error(error); return }

    await supabase.from('arriendos').update({ estado: 'devuelto' }).eq('id', id)

    if (arriendo?.tipo === 'equipo' && arriendo.equipo_id) {
      const { data: equipo } = await supabase.from('equipos').select('rentados').eq('id', arriendo.equipo_id).single()
      if (equipo) {
        const rentados = Math.max(0, (equipo.rentados || 0) - 1)
        await supabase.from('equipos').update({ rentados }).eq('id', arriendo.equipo_id)
      }
    }
    // Invalida arriendos activos y equipos (puede haber cambiado el stock disponible)
    invalidateMany('arriendos-activos', 'arriendos', 'equipos')
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <PageHeader title="Dashboard" actions={
        can('arriendos') && <button className="btn btn-primary" onClick={() => navigate('/arriendos')}>
          <i className="ti ti-plus" /> Nuevo arriendo
        </button>
      } />
      <div style={{ flex: 1, overflow: 'auto', padding: '20px 22px' }}>

        {loading ? <SkeletonDashboardStats /> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Arriendos activos', val: activos.length, color: 'var(--brand)', icon: 'ti-clipboard-check' },
              { label: 'Ingresos del mes', val: fmt(ingMes), color: 'var(--text)', icon: 'ti-currency-dollar' },
              { label: 'Clientes', val: clientes.length, color: 'var(--text)', icon: 'ti-users' },
              { label: 'Vencidos', val: vencidos.length, color: vencidos.length > 0 ? 'var(--red)' : 'var(--text)', icon: 'ti-alert-circle' },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '14px 16px' }}>
                <i className={`ti ${s.icon}`} style={{ fontSize: 18, color: 'var(--text3)', display: 'block', marginBottom: 8 }} />
                <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.val}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {!loadPend && pendientes.length > 0 && (
          <div style={{ background: 'var(--amber-bg)', border: '1px solid var(--amber-border)', borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#7A5C00' }}>
            <i className="ti ti-users" />
            <span>{pendientes.length} usuario{pendientes.length > 1 ? 's' : ''} esperan aprobación</span>
            <button className="btn btn-sm btn-warning" style={{ marginLeft: 'auto' }} onClick={() => navigate('/usuarios')}>Ver usuarios</button>
          </div>
        )}

        <div className="tcard">
          <div className="tcard-head"><span className="tcard-title">Arriendos activos</span></div>
          {loadArr ? (
            <table><SkeletonTableRows rows={4} cols={8} /></table>
          ) : (
            <table>
              <thead><tr>
                <th style={{ width: '20%' }}>Cliente</th>
                <th style={{ width: '22%' }}>Equipo / combo</th>
                <th style={{ width: '12%' }}>Inicio</th>
                <th style={{ width: '12%' }}>Término</th>
                <th style={{ width: '7%' }}>Días</th>
                <th style={{ width: '12%' }}>Total</th>
                <th style={{ width: '10%' }}>Estado</th>
                <th style={{ width: '5%' }}></th>
              </tr></thead>
              <tbody>
                {activos.length === 0 ? (
                  <tr><td colSpan={8}><div className="empty-state"><i className="ti ti-clipboard-x" style={{ fontSize: 36, display: 'block', marginBottom: 8 }} />Sin arriendos activos</div></td></tr>
                ) : activos.map(a => {
                  const ov = a.fecha_fin < hoy
                  return (
                    <tr key={a.id}>
                      <td><strong>{a.clientes?.nombre || '—'}</strong></td>
                      <td>{a.nombre_item}</td>
                      <td>{a.fecha_inicio}</td>
                      <td>{a.fecha_fin}</td>
                      <td>{a.dias}</td>
                      <td style={{ fontWeight: 700, color: 'var(--brand)' }}>{fmt(a.total)}</td>
                      <td><span className={`badge ${ov ? 'b-overdue' : 'b-active'}`}>{ov ? 'Vencido' : 'Activo'}</span></td>
                      <td>
                        {can('devolucion') && (
                          <button className="btn btn-sm btn-icon" title="Registrar devolución" onClick={() => devolver(a.id)}>
                            <i className="ti ti-package-export" />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
