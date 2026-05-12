import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import PageHeader from '../components/PageHeader'

const fmt = n => '$' + Math.round(n || 0).toLocaleString('es-CL')

export default function Dashboard() {
  const { usuario, can } = useAuth()
  const navigate = useNavigate()
  const [arriendos, setArriendos] = useState([])
  const [clientes, setClientes] = useState([])
  const [pendientes, setPendientes] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: arr }, { data: cli }, { data: usr }] = await Promise.all([
      supabase.from('arriendos').select('*, clientes(nombre)').eq('estado', 'activo').order('created_at', { ascending: false }),
      supabase.from('clientes').select('id'),
      usuario?.rol === 'admin' ? supabase.from('usuarios').select('id').eq('estado', 'pendiente') : Promise.resolve({ data: [] })
    ])
    setArriendos(arr || [])
    setClientes(cli || [])
    setPendientes(usr?.length || 0)
    setLoading(false)
  }

  const hoy = new Date().toISOString().split('T')[0]
  const mes = hoy.slice(0, 7)
  const activos = arriendos.filter(a => a.estado === 'activo')
  const vencidos = activos.filter(a => a.fecha_fin < hoy)
  const ingMes = arriendos.filter(a => a.fecha_inicio?.startsWith(mes)).reduce((s, a) => s + (a.total || 0), 0)

  async function devolver(id) {
    await supabase.from('arriendos').update({ estado: 'devuelto' }).eq('id', id)
    load()
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <PageHeader title="Dashboard" actions={
        can('arriendos') && <button className="btn btn-primary" onClick={() => navigate('/arriendos')}>
          <i className="ti ti-plus" /> Nuevo arriendo
        </button>
      } />
      <div style={{ flex: 1, overflow: 'auto', padding: '20px 22px' }}>

        {/* STATS */}
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

        {/* ALERTA PENDIENTES */}
        {pendientes > 0 && (
          <div style={{ background: 'var(--amber-bg)', border: '1px solid var(--amber-border)', borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#7A5C00' }}>
            <i className="ti ti-users" />
            <span>{pendientes} usuario{pendientes > 1 ? 's' : ''} esperan aprobación</span>
            <button className="btn btn-sm btn-warning" style={{ marginLeft: 'auto' }} onClick={() => navigate('/usuarios')}>
              Ver usuarios
            </button>
          </div>
        )}

        {/* TABLA */}
        <div className="tcard">
          <div className="tcard-head"><span className="tcard-title">Arriendos activos</span></div>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" /></div>
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
