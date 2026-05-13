import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { exportToExcel } from '../lib/exportToExcel'
import { clp, num } from '../lib/formatCLP'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

export default function ReportesEquipos() {
  const [equipos, setEquipos] = useState([])
  const [arriendos, setArriendos] = useState([])
  const [loading, setLoading] = useState(true)
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')

  useEffect(() => { cargar() }, [])

  const cargar = async () => {
    setLoading(true)
    try {
      const [{ data: eq }, { data: arr }] = await Promise.all([
        supabase.from('equipos').select('*').order('nombre'),
        supabase.from('arriendos').select('equipo_id, dias, total, fecha_inicio, fecha_fin, estado')
      ])
      setEquipos(eq || [])
      setArriendos(arr || [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const arrFiltrados = arriendos.filter(a => {
    if (fechaDesde && a.fecha_inicio < fechaDesde) return false
    if (fechaHasta && a.fecha_inicio > fechaHasta) return false
    return true
  })

  const datos = equipos.map(eq => {
    const arrs = arrFiltrados.filter(a => a.equipo_id === eq.id)
    const diasArrendados = arrs.reduce((s, a) => s + (parseInt(a.dias) || 0), 0)
    const ingresos = arrs.reduce((s, a) => s + (parseFloat(a.total) || 0), 0)
    const costoOperacional = diasArrendados * (parseFloat(eq.costo_operacional_dia) || 0)
    const margen = ingresos - costoOperacional
    // Ocupación: días arrendados vs días disponibles en el período
    const diasPeriodo = (() => {
      if (!fechaDesde || !fechaHasta) return 365
      const d1 = new Date(fechaDesde), d2 = new Date(fechaHasta)
      return Math.max(1, Math.round((d2 - d1) / 86400000))
    })()
    const ocupacion = Math.min(100, Math.round((diasArrendados / (diasPeriodo * (eq.stock || 1))) * 100))
    return { ...eq, diasArrendados, ingresos, costoOperacional, margen, ocupacion, cantArriendos: arrs.length }
  }).sort((a, b) => b.ingresos - a.ingresos)

  const exportar = () => {
    exportToExcel(datos.map(d => ({
      'Equipo': d.nombre,
      'Stock': d.stock,
      'Precio/Día': clp(d.precio_dia),
      'Costo Compra': clp(d.costo_compra),
      'Costo Op/Día': clp(d.costo_operacional_dia),
      'Días Arrendados': d.diasArrendados,
      'Arriendos': d.cantArriendos,
      'Ingresos': clp(d.ingresos),
      'Costo Operacional': clp(d.costoOperacional),
      'Margen': clp(d.margen),
      'Ocupación %': d.ocupacion + '%',
    })), `reporte-equipos-${new Date().toISOString().split('T')[0]}`)
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 10, color: 'var(--text3)' }}>
      <div className="spinner" /> Cargando...
    </div>
  )

  const totalIngresos = datos.reduce((s, d) => s + d.ingresos, 0)
  const totalMargen = datos.reduce((s, d) => s + d.margen, 0)
  const totalDias = datos.reduce((s, d) => s + d.diasArrendados, 0)

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        {[
          { label: 'Ingresos totales', value: clp(totalIngresos), color: 'var(--brand)' },
          { label: 'Margen total', value: clp(totalMargen), color: totalMargen >= 0 ? 'var(--brand)' : 'var(--red)' },
          { label: 'Total días arrendados', value: num(totalDias) + ' días', color: 'var(--blue)' },
          { label: 'Equipos activos', value: equipos.filter(e => e.estado === 'arrendado').length + ' / ' + equipos.length, color: 'var(--text2)' },
        ].map((k, i) => (
          <div key={i} style={{ background: 'var(--surface2)', padding: 16, borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Filtro período */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 14, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="fg" style={{ minWidth: 140 }}>
          <label>Desde</label>
          <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} />
        </div>
        <div className="fg" style={{ minWidth: 140 }}>
          <label>Hasta</label>
          <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} />
        </div>
        <button className="btn btn-sm" onClick={() => { setFechaDesde(''); setFechaHasta('') }}>
          <i className="ti ti-x" /> Limpiar
        </button>
      </div>

      {/* Gráfico ingresos */}
      {datos.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', marginBottom: 12 }}>Ingresos vs Margen por equipo</div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={datos} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid stroke="var(--border)" horizontal={false} />
                <XAxis type="number" stroke="var(--text3)" fontSize={10} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <YAxis dataKey="nombre" type="category" stroke="var(--text3)" fontSize={10} width={80} />
                <Tooltip contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} formatter={v => clp(v)} />
                <Bar dataKey="ingresos" fill="var(--brand)" name="Ingresos" radius={[0,4,4,0]} />
                <Bar dataKey="margen" fill="var(--blue)" name="Margen" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', marginBottom: 12 }}>Tasa de ocupación por equipo (%)</div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={datos} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid stroke="var(--border)" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} stroke="var(--text3)" fontSize={10} tickFormatter={v => `${v}%`} />
                <YAxis dataKey="nombre" type="category" stroke="var(--text3)" fontSize={10} width={80} />
                <Tooltip contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} formatter={v => [v + '%', 'Ocupación']} />
                <Bar dataKey="ocupacion" name="Ocupación" radius={[0,4,4,0]}>
                  {datos.map((d, i) => (
                    <Cell key={i} fill={d.ocupacion >= 60 ? 'var(--brand)' : d.ocupacion >= 30 ? 'var(--amber)' : 'var(--red)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tabla */}
      <div className="tcard">
        <div className="tcard-head">
          <span className="tcard-title">Detalle por equipo</span>
          <button className="btn btn-sm btn-primary" onClick={exportar}>
            <i className="ti ti-download" /> Exportar Excel
          </button>
        </div>
        {datos.length === 0 ? (
          <div className="empty-state"><i className="ti ti-tool" style={{ fontSize: 32, marginBottom: 8, display: 'block' }} />Sin datos</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Equipo</th>
                  <th style={{ textAlign: 'center' }}>Stock</th>
                  <th style={{ textAlign: 'center' }}>Arriendos</th>
                  <th style={{ textAlign: 'center' }}>Días arr.</th>
                  <th style={{ textAlign: 'right' }}>Ingresos</th>
                  <th style={{ textAlign: 'right' }}>Costo Op.</th>
                  <th style={{ textAlign: 'right' }}>Margen</th>
                  <th style={{ textAlign: 'center' }}>Ocupación</th>
                </tr>
              </thead>
              <tbody>
                {datos.map((d, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{d.nombre}</td>
                    <td style={{ textAlign: 'center' }}>{d.stock}</td>
                    <td style={{ textAlign: 'center' }}>{d.cantArriendos}</td>
                    <td style={{ textAlign: 'center' }}>{d.diasArrendados}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--brand)' }}>{clp(d.ingresos)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--text2)' }}>{clp(d.costoOperacional)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: d.margen >= 0 ? 'var(--brand)' : 'var(--red)' }}>{clp(d.margen)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block', padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700,
                        background: d.ocupacion >= 60 ? '#D6F0DC' : d.ocupacion >= 30 ? 'var(--amber-bg)' : 'var(--red-bg)',
                        color: d.ocupacion >= 60 ? '#145A2A' : d.ocupacion >= 30 ? '#7A5C00' : 'var(--red)'
                      }}>
                        {d.ocupacion}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
