import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { exportToExcel } from '../lib/exportToExcel'
import { clp } from '../lib/formatCLP'
import {
  ComposedChart, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer
} from 'recharts'

export default function ReportesFlujoCaja() {
  const [arriendos, setArriendos] = useState([])
  const [equipos, setEquipos] = useState([])
  const [loading, setLoading] = useState(true)
  const [anio, setAnio] = useState(new Date().getFullYear())

  useEffect(() => { cargar() }, [])

  const cargar = async () => {
    setLoading(true)
    try {
      const [{ data: arr }, { data: eq }] = await Promise.all([
        supabase.from('arriendos').select('total, fecha_inicio, dias, equipo_id'),
        supabase.from('equipos').select('id, costo_operacional_dia')
      ])
      setArriendos(arr || [])
      setEquipos(eq || [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const costoOpPorEquipo = equipos.reduce((acc, eq) => {
    acc[eq.id] = parseFloat(eq.costo_operacional_dia) || 0
    return acc
  }, {})

  const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

  const datosMes = MESES.map((mes, idx) => {
    const arrs = arriendos.filter(a => {
      const d = new Date(a.fecha_inicio)
      return d.getFullYear() === parseInt(anio) && d.getMonth() === idx
    })
    const ingresos = arrs.reduce((s, a) => s + (parseFloat(a.total) || 0), 0)
    const costos = arrs.reduce((s, a) => s + ((parseInt(a.dias) || 0) * (costoOpPorEquipo[a.equipo_id] || 0)), 0)
    const margen = ingresos - costos
    return { mes, ingresos, costos, margen }
  })

  // Acumulado
  let acum = 0
  const datosConAcum = datosMes.map(d => {
    acum += d.margen
    return { ...d, acumulado: acum }
  })

  const totalAnio = datosMes.reduce((s, d) => s + d.ingresos, 0)
  const totalCostos = datosMes.reduce((s, d) => s + d.costos, 0)
  const totalMargen = datosMes.reduce((s, d) => s + d.margen, 0)
  const mejorMes = [...datosMes].sort((a, b) => b.ingresos - a.ingresos)[0]

  const exportar = () => {
    exportToExcel(datosConAcum.map(d => ({
      'Mes': d.mes,
      'Ingresos': clp(d.ingresos),
      'Costos Operacionales': clp(d.costos),
      'Margen': clp(d.margen),
      'Acumulado': clp(d.acumulado),
    })), `flujo-caja-${anio}`)
  }

  const anios = Array.from(new Set(arriendos.map(a => new Date(a.fecha_inicio).getFullYear()))).sort((a, b) => b - a)
  if (!anios.includes(new Date().getFullYear())) anios.unshift(new Date().getFullYear())

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 10, color: 'var(--text3)' }}>
      <div className="spinner" /> Cargando...
    </div>
  )

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Selector año */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 14, display: 'flex', gap: 12, alignItems: 'flex-end' }}>
        <div className="fg">
          <label>Año</label>
          <select value={anio} onChange={e => setAnio(parseInt(e.target.value))} style={{ width: 120 }}>
            {anios.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <button className="btn btn-sm btn-primary" onClick={exportar}>
          <i className="ti ti-download" /> Exportar Excel
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        {[
          { label: `Ingresos ${anio}`, value: clp(totalAnio), color: 'var(--brand)' },
          { label: 'Costos operacionales', value: clp(totalCostos), color: 'var(--red)' },
          { label: 'Margen neto', value: clp(totalMargen), color: totalMargen >= 0 ? 'var(--brand)' : 'var(--red)' },
          { label: 'Mejor mes', value: mejorMes?.ingresos > 0 ? mejorMes.mes : 'Sin datos', color: 'var(--blue)' },
        ].map((k, i) => (
          <div key={i} style={{ background: 'var(--surface2)', padding: 16, borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Gráfico principal */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', marginBottom: 12 }}>Flujo de caja mensual {anio}</div>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={datosConAcum}>
            <CartesianGrid stroke="var(--border)" />
            <XAxis dataKey="mes" stroke="var(--text3)" fontSize={11} />
            <YAxis yAxisId="left" stroke="var(--text3)" fontSize={10} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
            <YAxis yAxisId="right" orientation="right" stroke="var(--text3)" fontSize={10} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
            <Tooltip contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} formatter={v => clp(v)} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar yAxisId="left" dataKey="ingresos" fill="var(--brand)" name="Ingresos" radius={[4,4,0,0]} />
            <Bar yAxisId="left" dataKey="costos" fill="var(--red)" name="Costos" radius={[4,4,0,0]} opacity={0.7} />
            <Line yAxisId="right" type="monotone" dataKey="acumulado" stroke="var(--blue)" strokeWidth={2} dot={{ r: 3 }} name="Acumulado" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Tabla mensual */}
      <div className="tcard">
        <div className="tcard-head">
          <span className="tcard-title">Detalle mensual {anio}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Mes</th>
              <th style={{ textAlign: 'right' }}>Ingresos</th>
              <th style={{ textAlign: 'right' }}>Costos Op.</th>
              <th style={{ textAlign: 'right' }}>Margen</th>
              <th style={{ textAlign: 'right' }}>Acumulado</th>
            </tr>
          </thead>
          <tbody>
            {datosConAcum.map((d, i) => (
              <tr key={i} style={{ opacity: d.ingresos === 0 ? 0.5 : 1 }}>
                <td style={{ fontWeight: 600 }}>{d.mes}</td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--brand)' }}>{clp(d.ingresos)}</td>
                <td style={{ textAlign: 'right', color: 'var(--red)' }}>{clp(d.costos)}</td>
                <td style={{ textAlign: 'right', fontWeight: 600, color: d.margen >= 0 ? 'var(--brand)' : 'var(--red)' }}>{clp(d.margen)}</td>
                <td style={{ textAlign: 'right', fontWeight: 600, color: d.acumulado >= 0 ? 'var(--blue)' : 'var(--red)' }}>{clp(d.acumulado)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}