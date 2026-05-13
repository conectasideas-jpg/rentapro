import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { exportToExcel } from '../lib/exportToExcel'
import { clp } from '../lib/formatCLP'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

const COLORS = ['#27A04A','#1A6FC4','#D4A000','#D93025','#8B5CF6','#0891B2']

export default function ReportesClientes() {
  const [clientes, setClientes] = useState([])
  const [arriendos, setArriendos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { cargar() }, [])

  const cargar = async () => {
    setLoading(true)
    try {
      const [{ data: cl }, { data: arr }] = await Promise.all([
        supabase.from('clientes').select('*'),
        supabase.from('arriendos').select('cliente_id, total, fecha_inicio, estado')
      ])
      setClientes(cl || [])
      setArriendos(arr || [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const datos = clientes.map(cl => {
    const arrs = arriendos.filter(a => a.cliente_id === cl.id)
    const total = arrs.reduce((s, a) => s + (parseFloat(a.total) || 0), 0)
    const fechas = arrs.map(a => new Date(a.fecha_inicio)).sort((a, b) => b - a)
    const ultimoArriendo = fechas[0] ? fechas[0].toISOString().split('T')[0] : null
    // Frecuencia promedio en días entre arriendos
    let frecuencia = null
    if (fechas.length >= 2) {
      const diffs = []
      for (let i = 0; i < fechas.length - 1; i++) diffs.push((fechas[i] - fechas[i+1]) / 86400000)
      frecuencia = Math.round(diffs.reduce((s, d) => s + d, 0) / diffs.length)
    }
    // Días desde último arriendo
    const diasInactivo = ultimoArriendo
      ? Math.round((new Date() - new Date(ultimoArriendo)) / 86400000) : null

    return { ...cl, cantArriendos: arrs.length, totalPagado: total, ultimoArriendo, frecuencia, diasInactivo }
  }).sort((a, b) => b.totalPagado - a.totalPagado)

  // Por comuna
  const porComuna = Object.entries(
    clientes.reduce((acc, cl) => {
      const c = cl.comuna || 'Sin especificar'
      acc[c] = (acc[c] || 0) + 1
      return acc
    }, {})
  ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)

  // Clientes sin arriendos recientes (> 60 días)
  const inactivos = datos.filter(d => d.diasInactivo !== null && d.diasInactivo > 60)
  const sinArriendos = datos.filter(d => d.cantArriendos === 0)

  const exportar = () => {
    exportToExcel(datos.map(d => ({
      'Cliente': d.nombre,
      'RUT': d.rut || '',
      'Teléfono': d.telefono || '',
      'Comuna': d.comuna || '',
      'Arriendos': d.cantArriendos,
      'Total pagado': clp(d.totalPagado),
      'Último arriendo': d.ultimoArriendo || 'Nunca',
      'Días inactivo': d.diasInactivo ?? '-',
      'Frecuencia prom. (días)': d.frecuencia ?? 'Sin datos',
    })), `reporte-clientes-${new Date().toISOString().split('T')[0]}`)
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 10, color: 'var(--text3)' }}>
      <div className="spinner" /> Cargando...
    </div>
  )

  const totalFacturado = datos.reduce((s, d) => s + d.totalPagado, 0)

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        {[
          { label: 'Total clientes', value: clientes.length, color: 'var(--brand)' },
          { label: 'Total facturado', value: clp(totalFacturado), color: 'var(--brand)' },
          { label: 'Promedio por cliente', value: clp(clientes.length > 0 ? totalFacturado / clientes.length : 0), color: 'var(--blue)' },
          { label: 'Inactivos +60 días', value: inactivos.length, color: 'var(--amber)' },
          { label: 'Sin arriendos', value: sinArriendos.length, color: 'var(--red)' },
        ].map((k, i) => (
          <div key={i} style={{ background: 'var(--surface2)', padding: 16, borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Gráficos */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Top clientes */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', marginBottom: 12 }}>Top 8 clientes por facturación</div>
          {datos.slice(0, 8).length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={datos.slice(0, 8)} layout="vertical" margin={{ left: 100 }}>
                <CartesianGrid stroke="var(--border)" horizontal={false} />
                <XAxis type="number" stroke="var(--text3)" fontSize={10} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <YAxis dataKey="nombre" type="category" stroke="var(--text3)" fontSize={10} width={100} />
                <Tooltip contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} formatter={v => [clp(v), 'Facturado']} />
                <Bar dataKey="totalPagado" fill="var(--brand)" name="Total" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="empty-state">Sin datos</div>}
        </div>

        {/* Por comuna */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', marginBottom: 12 }}>Distribución por comuna</div>
          {porComuna.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={porComuna} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} (${(percent*100).toFixed(0)}%)`} labelLine={false} fontSize={10}>
                  {porComuna.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="empty-state">Sin datos de comuna</div>}
        </div>
      </div>

      {/* Alerta clientes inactivos */}
      {inactivos.length > 0 && (
        <div style={{ background: 'var(--amber-bg)', border: '1px solid var(--amber-border)', borderRadius: 'var(--radius)', padding: 14 }}>
          <div style={{ fontWeight: 700, color: '#7A5C00', marginBottom: 8, fontSize: 13 }}>
            ⚠️ {inactivos.length} cliente{inactivos.length > 1 ? 's' : ''} sin arriendos hace más de 60 días
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {inactivos.slice(0, 10).map((c, i) => (
              <span key={i} style={{ background: 'var(--amber-border)', borderRadius: 99, padding: '3px 10px', fontSize: 11, fontWeight: 600, color: '#5A3E00' }}>
                {c.nombre} · {c.diasInactivo}d
              </span>
            ))}
            {inactivos.length > 10 && <span style={{ fontSize: 11, color: '#7A5C00' }}>+{inactivos.length - 10} más</span>}
          </div>
        </div>
      )}

      {/* Tabla */}
      <div className="tcard">
        <div className="tcard-head">
          <span className="tcard-title">Detalle de clientes ({datos.length})</span>
          <button className="btn btn-sm btn-primary" onClick={exportar}>
            <i className="ti ti-download" /> Exportar Excel
          </button>
        </div>
        {datos.length === 0 ? (
          <div className="empty-state">Sin clientes registrados</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Teléfono</th>
                  <th>Comuna</th>
                  <th style={{ textAlign: 'center' }}>Arriendos</th>
                  <th style={{ textAlign: 'right' }}>Total pagado</th>
                  <th>Último arriendo</th>
                  <th style={{ textAlign: 'center' }}>Frec. prom.</th>
                  <th style={{ textAlign: 'center' }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {datos.map((d, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{d.nombre}</td>
                    <td style={{ color: 'var(--text2)' }}>{d.telefono || '-'}</td>
                    <td style={{ color: 'var(--text2)' }}>{d.comuna || '-'}</td>
                    <td style={{ textAlign: 'center' }}>{d.cantArriendos}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--brand)' }}>{clp(d.totalPagado)}</td>
                    <td style={{ color: 'var(--text2)' }}>{d.ultimoArriendo || 'Nunca'}</td>
                    <td style={{ textAlign: 'center', color: 'var(--text2)' }}>{d.frecuencia ? `${d.frecuencia}d` : '-'}</td>
                    <td style={{ textAlign: 'center' }}>
                      {d.cantArriendos === 0 ? (
                        <span className="badge b-returned">Sin arriendos</span>
                      ) : d.diasInactivo !== null && d.diasInactivo > 60 ? (
                        <span className="badge b-pending">Inactivo</span>
                      ) : (
                        <span className="badge b-active">Activo</span>
                      )}
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
