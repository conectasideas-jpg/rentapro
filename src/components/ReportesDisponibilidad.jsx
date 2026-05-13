import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { clp } from '../lib/formatCLP'

export default function ReportesDisponibilidad() {
  const [activos, setActivos] = useState([])
  const [proximos, setProximos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { cargar() }, [])

  const cargar = async () => {
    setLoading(true)
    try {
      const hoy = new Date().toISOString().split('T')[0]
      const en7dias = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

      const [{ data: act }, { data: prox }] = await Promise.all([
        supabase
          .from('arriendos')
          .select('*, clientes(nombre, telefono), equipos(nombre)')
          .eq('estado', 'activo')
          .order('fecha_fin', { ascending: true }),
        supabase
          .from('arriendos')
          .select('*, clientes(nombre, telefono), equipos(nombre)')
          .eq('estado', 'activo')
          .gte('fecha_fin', hoy)
          .lte('fecha_fin', en7dias)
          .order('fecha_fin', { ascending: true })
      ])
      setActivos(act || [])
      setProximos(prox || [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const diasRestantes = (fechaFin) => {
    const hoy = new Date()
    const fin = new Date(fechaFin)
    const dias = Math.round((fin - hoy) / 86400000)
    return dias
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 10, color: 'var(--text3)' }}>
      <div className="spinner" /> Cargando...
    </div>
  )

  const vencidos = activos.filter(a => diasRestantes(a.fecha_fin) < 0)
  const hoy = activos.filter(a => diasRestantes(a.fecha_fin) === 0)

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        {[
          { label: 'Equipos fuera ahora', value: activos.length, color: 'var(--blue)' },
          { label: 'Devuelven hoy', value: hoy.length, color: 'var(--brand)' },
          { label: 'Devuelven en 7 días', value: proximos.length, color: 'var(--amber)' },
          { label: 'Vencidos sin devolver', value: vencidos.length, color: vencidos.length > 0 ? 'var(--red)' : 'var(--text3)' },
        ].map((k, i) => (
          <div key={i} style={{ background: 'var(--surface2)', padding: 16, borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Alerta vencidos */}
      {vencidos.length > 0 && (
        <div style={{ background: 'var(--red-bg)', border: '1px solid var(--red-border)', borderRadius: 'var(--radius)', padding: 14 }}>
          <div style={{ fontWeight: 700, color: 'var(--red)', marginBottom: 10, fontSize: 13 }}>
            🚨 {vencidos.length} arriendo{vencidos.length > 1 ? 's' : ''} vencido{vencidos.length > 1 ? 's' : ''} sin devolver
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {vencidos.map((a, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '8px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--red-border)' }}>
                <div>
                  <span style={{ fontWeight: 700 }}>{a.clientes?.nombre}</span>
                  <span style={{ color: 'var(--text3)', margin: '0 6px' }}>·</span>
                  <span style={{ color: 'var(--text2)' }}>{a.equipos?.nombre || a.nombre_item}</span>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--red)', fontWeight: 700 }}>Venció {a.fecha_fin}</span>
                  {a.clientes?.telefono && (
                    <a href={`https://wa.me/56${a.clientes.telefono.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
                      style={{ background: '#25D366', color: '#fff', padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, textDecoration: 'none' }}>
                      WhatsApp
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Próximas devoluciones */}
      <div className="tcard">
        <div className="tcard-head">
          <span className="tcard-title">📅 Devoluciones en los próximos 7 días ({proximos.length})</span>
        </div>
        {proximos.length === 0 ? (
          <div className="empty-state">No hay devoluciones en los próximos 7 días</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Equipo</th>
                  <th>Devuelve</th>
                  <th style={{ textAlign: 'center' }}>Días restantes</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                  <th>Teléfono</th>
                </tr>
              </thead>
              <tbody>
                {proximos.map((a, i) => {
                  const dr = diasRestantes(a.fecha_fin)
                  return (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{a.clientes?.nombre || '-'}</td>
                      <td>{a.equipos?.nombre || a.nombre_item}</td>
                      <td>{a.fecha_fin}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block', padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700,
                          background: dr === 0 ? '#D6F0DC' : dr <= 2 ? 'var(--red-bg)' : 'var(--amber-bg)',
                          color: dr === 0 ? '#145A2A' : dr <= 2 ? 'var(--red)' : '#7A5C00'
                        }}>
                          {dr === 0 ? 'Hoy' : `${dr}d`}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--brand)' }}>{clp(a.total)}</td>
                      <td>
                        {a.clientes?.telefono ? (
                          <a href={`https://wa.me/56${a.clientes.telefono.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
                            style={{ color: '#25D366', fontWeight: 600, fontSize: 12, textDecoration: 'none' }}>
                            {a.clientes.telefono}
                          </a>
                        ) : '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Todos los activos */}
      <div className="tcard">
        <div className="tcard-head">
          <span className="tcard-title">📦 Todos los equipos arrendados actualmente ({activos.length})</span>
        </div>
        {activos.length === 0 ? (
          <div className="empty-state">No hay equipos arrendados en este momento</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Equipo</th>
                  <th>Inicio</th>
                  <th>Devolución</th>
                  <th style={{ textAlign: 'center' }}>Estado</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {activos.map((a, i) => {
                  const dr = diasRestantes(a.fecha_fin)
                  return (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{a.clientes?.nombre || '-'}</td>
                      <td>{a.equipos?.nombre || a.nombre_item}</td>
                      <td style={{ color: 'var(--text2)' }}>{a.fecha_inicio}</td>
                      <td style={{ color: 'var(--text2)' }}>{a.fecha_fin}</td>
                      <td style={{ textAlign: 'center' }}>
                        {dr < 0 ? (
                          <span className="badge b-overdue">Vencido</span>
                        ) : dr === 0 ? (
                          <span className="badge b-active">Hoy</span>
                        ) : dr <= 2 ? (
                          <span className="badge b-pending">Próximo</span>
                        ) : (
                          <span className="badge b-active">En curso</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--brand)' }}>{clp(a.total)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}