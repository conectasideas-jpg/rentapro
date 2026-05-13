import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { exportToExcel } from '../lib/exportToExcel'
import { clp } from '../lib/formatCLP'
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts'

const ESTADO_LABELS = { todos: 'Todos', activo: 'Activos', devuelto: 'Devueltos' }

export default function ReportesArriendos() {
  const [arriendos, setArriendos] = useState([])
  const [periodos, setPeriodos] = useState([])
  const [totalRecaudado, setTotalRecaudado] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')

  useEffect(() => { cargarReportes() }, [])

  const cargarReportes = async () => {
    setLoading(true)
    try {
      let q = supabase
        .from('arriendos')
        .select('*, clientes(nombre)')
        .order('fecha_inicio', { ascending: false })
      const { data, error } = await q
      if (error) throw error
      setArriendos(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const arriendosFiltrados = arriendos.filter(a => {
    if (filtroEstado !== 'todos' && a.estado !== filtroEstado) return false
    if (fechaDesde && a.fecha_inicio < fechaDesde) return false
    if (fechaHasta && a.fecha_inicio > fechaHasta) return false
    return true
  })

  useEffect(() => {
    const porMes = {}
    let total = 0
    arriendosFiltrados.forEach(arr => {
      const fecha = new Date(arr.fecha_inicio)
      const mes = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`
      if (!porMes[mes]) porMes[mes] = { periodo: mes, cantidad: 0, monto: 0 }
      porMes[mes].cantidad += 1
      porMes[mes].monto += parseFloat(arr.total) || 0
      total += parseFloat(arr.total) || 0
    })
    setPeriodos(Object.values(porMes).sort((a, b) => a.periodo.localeCompare(b.periodo)))
    setTotalRecaudado(total)
  }, [arriendosFiltrados.length, filtroEstado, fechaDesde, fechaHasta])

  const exportar = () => {
    const datos = arriendosFiltrados.map(arr => ({
      'Cliente': arr.clientes?.nombre || 'Sin cliente',
      'Producto': arr.nombre_item,
      'Tipo': arr.tipo,
      'Inicio': arr.fecha_inicio,
      'Fin': arr.fecha_fin,
      'Días': arr.dias,
      'Precio/Día': clp(arr.precio_dia),
      'Total': clp(arr.total),
      'Estado': arr.estado
    }))
    exportToExcel(datos, `reporte-arriendos-${new Date().toISOString().split('T')[0]}`)
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 10, color: 'var(--text3)' }}>
      <div className="spinner" /> Cargando reportes...
    </div>
  )

  const activos = arriendos.filter(a => a.estado === 'activo').length
  const devueltos = arriendos.filter(a => a.estado === 'devuelto').length

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        {[
          { label: 'Total recaudado', value: clp(totalRecaudado), color: 'var(--brand)' },
          { label: 'Total arriendos', value: arriendosFiltrados.length, color: 'var(--brand)' },
          { label: 'Activos', value: activos, color: 'var(--blue)' },
          { label: 'Devueltos', value: devueltos, color: 'var(--text2)' },
          { label: 'Promedio por arriendo', value: arriendosFiltrados.length > 0 ? clp(totalRecaudado / arriendosFiltrados.length) : clp(0), color: 'var(--amber)' },
        ].map((k, i) => (
          <div key={i} style={{ background: 'var(--surface2)', padding: 16, borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 14, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="fg" style={{ minWidth: 140 }}>
          <label>Estado</label>
          <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
            {Object.entries(ESTADO_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div className="fg" style={{ minWidth: 140 }}>
          <label>Desde</label>
          <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} />
        </div>
        <div className="fg" style={{ minWidth: 140 }}>
          <label>Hasta</label>
          <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} />
        </div>
        <button className="btn btn-sm" onClick={() => { setFiltroEstado('todos'); setFechaDesde(''); setFechaHasta('') }}>
          <i className="ti ti-x" /> Limpiar
        </button>
      </div>

      {/* Gráficos */}
      {periodos.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', marginBottom: 12 }}>Monto recaudado por mes</div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={periodos}>
                <CartesianGrid stroke="var(--border)" />
                <XAxis dataKey="periodo" stroke="var(--text3)" fontSize={10} />
                <YAxis stroke="var(--text3)" fontSize={10} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} formatter={v => [clp(v), 'Monto']} />
                <Bar dataKey="monto" fill="var(--brand)" name="Monto" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', marginBottom: 12 }}>Cantidad de arriendos por mes</div>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={periodos}>
                <CartesianGrid stroke="var(--border)" />
                <XAxis dataKey="periodo" stroke="var(--text3)" fontSize={10} />
                <YAxis stroke="var(--text3)" fontSize={10} allowDecimals={false} />
                <Tooltip contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} formatter={v => [v, 'Arriendos']} />
                <Line dataKey="cantidad" stroke="var(--blue)" strokeWidth={2} dot={{ r: 4 }} name="Arriendos" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="empty-state"><i className="ti ti-chart-bar" style={{ fontSize: 32, marginBottom: 8, display: 'block' }} />Sin datos para el período seleccionado</div>
      )}

      {/* Tabla */}
      {arriendosFiltrados.length > 0 && (
        <div className="tcard">
          <div className="tcard-head">
            <span className="tcard-title">Detalle de arriendos ({arriendosFiltrados.length})</span>
            <button className="btn btn-sm btn-primary" onClick={exportar}>
              <i className="ti ti-download" /> Exportar Excel
            </button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Producto</th>
                  <th>Inicio</th>
                  <th>Fin</th>
                  <th style={{ textAlign: 'center' }}>Días</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                  <th style={{ textAlign: 'center' }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {arriendosFiltrados.map((arr, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{arr.clientes?.nombre || '-'}</td>
                    <td>{arr.nombre_item}</td>
                    <td style={{ color: 'var(--text2)' }}>{arr.fecha_inicio}</td>
                    <td style={{ color: 'var(--text2)' }}>{arr.fecha_fin}</td>
                    <td style={{ textAlign: 'center' }}>{arr.dias}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--brand)' }}>{clp(arr.total)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`badge ${arr.estado === 'activo' ? 'b-active' : 'b-returned'}`}>
                        {arr.estado === 'activo' ? 'Activo' : 'Devuelto'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
