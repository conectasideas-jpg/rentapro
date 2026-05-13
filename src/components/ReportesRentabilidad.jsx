import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { exportToExcel } from '../lib/exportToExcel'
import { clp, num } from '../lib/formatCLP'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

export default function ReportesRentabilidad() {
  const [equipos, setEquipos] = useState([])
  const [arriendos, setArriendos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { cargar() }, [])

  const cargar = async () => {
    setLoading(true)
    try {
      const [{ data: eq }, { data: arr }] = await Promise.all([
        supabase.from('equipos').select('*').order('nombre'),
        supabase.from('arriendos').select('equipo_id, dias, total')
      ])
      setEquipos(eq || [])
      setArriendos(arr || [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const datos = equipos.map(eq => {
    const arrs = arriendos.filter(a => a.equipo_id === eq.id)
    const ingresos = arrs.reduce((s, a) => s + (parseFloat(a.total) || 0), 0)
    const diasArrendados = arrs.reduce((s, a) => s + (parseInt(a.dias) || 0), 0)
    const costoCompra = parseFloat(eq.costo_compra) || 0
    const costoOpTotal = diasArrendados * (parseFloat(eq.costo_operacional_dia) || 0)
    const costoTotal = costoCompra + costoOpTotal
    const margen = ingresos - costoOpTotal
    const gananciaNetoVsInversion = ingresos - costoTotal
    // Días necesarios para recuperar inversión
    const precioDia = parseFloat(eq.precio_dia) || 0
    const costoOpDia = parseFloat(eq.costo_operacional_dia) || 0
    const margenDia = precioDia - costoOpDia
    const diasParaROI = costoCompra > 0 && margenDia > 0
      ? Math.ceil(costoCompra / margenDia) : null
    // % de recuperación de inversión
    const pctRecuperado = costoCompra > 0 ? Math.min(100, Math.round((ingresos / costoCompra) * 100)) : 0

    return { ...eq, ingresos, diasArrendados, costoOpTotal, margen, gananciaNetoVsInversion, diasParaROI, pctRecuperado, cantArriendos: arrs.length }
  }).sort((a, b) => b.pctRecuperado - a.pctRecuperado)

  const exportar = () => {
    exportToExcel(datos.map(d => ({
      'Equipo': d.nombre,
      'Costo Compra': clp(d.costo_compra),
      'Precio/Día': clp(d.precio_dia),
      'Costo Op/Día': clp(d.costo_operacional_dia),
      'Días Arrendados': d.diasArrendados,
      'Ingresos Totales': clp(d.ingresos),
      'Costo Operacional Total': clp(d.costoOpTotal),
      'Margen Operacional': clp(d.margen),
      'Ganancia vs Inversión': clp(d.gananciaNetoVsInversion),
      '% Inversión Recuperada': d.pctRecuperado + '%',
      'Días para ROI': d.diasParaROI ? num(d.diasParaROI) + ' días' : 'N/A',
    })), `reporte-rentabilidad-${new Date().toISOString().split('T')[0]}`)
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 10, color: 'var(--text3)' }}>
      <div className="spinner" /> Cargando...
    </div>
  )

  const totalIngresos = datos.reduce((s, d) => s + d.ingresos, 0)
  const totalInversion = datos.reduce((s, d) => s + (parseFloat(d.costo_compra) || 0), 0)
  const totalMargen = datos.reduce((s, d) => s + d.margen, 0)
  const equiposROI = datos.filter(d => d.gananciaNetoVsInversion > 0).length

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        {[
          { label: 'Inversión total en equipos', value: clp(totalInversion), color: 'var(--text2)' },
          { label: 'Ingresos generados', value: clp(totalIngresos), color: 'var(--brand)' },
          { label: 'Margen operacional', value: clp(totalMargen), color: totalMargen >= 0 ? 'var(--brand)' : 'var(--red)' },
          { label: 'Equipos con ROI positivo', value: `${equiposROI} / ${datos.length}`, color: equiposROI > 0 ? 'var(--brand)' : 'var(--red)' },
        ].map((k, i) => (
          <div key={i} style={{ background: 'var(--surface2)', padding: 16, borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Gráficos */}
      {datos.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', marginBottom: 12 }}>% Inversión recuperada por equipo</div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={datos} layout="vertical" margin={{ left: 90 }}>
                <CartesianGrid stroke="var(--border)" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} stroke="var(--text3)" fontSize={10} tickFormatter={v => `${v}%`} />
                <YAxis dataKey="nombre" type="category" stroke="var(--text3)" fontSize={10} width={90} />
                <Tooltip contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} formatter={v => [v + '%', 'Recuperado']} />
                <Bar dataKey="pctRecuperado" name="% Recuperado" radius={[0,4,4,0]}>
                  {datos.map((d, i) => (
                    <Cell key={i} fill={d.pctRecuperado >= 100 ? 'var(--brand)' : d.pctRecuperado >= 50 ? 'var(--amber)' : 'var(--red)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', marginBottom: 12 }}>Días necesarios para recuperar inversión</div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={datos.filter(d => d.diasParaROI)} layout="vertical" margin={{ left: 90 }}>
                <CartesianGrid stroke="var(--border)" horizontal={false} />
                <XAxis type="number" stroke="var(--text3)" fontSize={10} />
                <YAxis dataKey="nombre" type="category" stroke="var(--text3)" fontSize={10} width={90} />
                <Tooltip contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} formatter={v => [v + ' días', 'Para ROI']} />
                <Bar dataKey="diasParaROI" fill="var(--blue)" name="Días para ROI" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tabla */}
      <div className="tcard">
        <div className="tcard-head">
          <span className="tcard-title">Rentabilidad por equipo</span>
          <button className="btn btn-sm btn-primary" onClick={exportar}>
            <i className="ti ti-download" /> Exportar Excel
          </button>
        </div>
        {datos.length === 0 ? (
          <div className="empty-state">Sin equipos registrados</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Equipo</th>
                  <th style={{ textAlign: 'right' }}>Inversión</th>
                  <th style={{ textAlign: 'right' }}>Ingresos</th>
                  <th style={{ textAlign: 'right' }}>Margen Op.</th>
                  <th style={{ textAlign: 'right' }}>Gan. vs Inv.</th>
                  <th style={{ textAlign: 'center' }}>% Recuperado</th>
                  <th style={{ textAlign: 'center' }}>Días p/ROI</th>
                </tr>
              </thead>
              <tbody>
                {datos.map((d, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{d.nombre}</td>
                    <td style={{ textAlign: 'right', color: 'var(--text2)' }}>{clp(d.costo_compra)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--brand)' }}>{clp(d.ingresos)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: d.margen >= 0 ? 'var(--brand)' : 'var(--red)' }}>{clp(d.margen)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: d.gananciaNetoVsInversion >= 0 ? 'var(--brand)' : 'var(--red)' }}>{clp(d.gananciaNetoVsInversion)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                        <div style={{ background: 'var(--border)', borderRadius: 99, height: 6, width: 60, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.min(100, d.pctRecuperado)}%`, background: d.pctRecuperado >= 100 ? 'var(--brand)' : d.pctRecuperado >= 50 ? 'var(--amber)' : 'var(--red)', borderRadius: 99, transition: 'width .3s' }} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: d.pctRecuperado >= 100 ? 'var(--brand)' : d.pctRecuperado >= 50 ? '#7A5C00' : 'var(--red)' }}>{d.pctRecuperado}%</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', color: 'var(--text2)', fontSize: 12 }}>
                      {d.diasParaROI ? `${num(d.diasParaROI)}d` : 'N/A'}
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