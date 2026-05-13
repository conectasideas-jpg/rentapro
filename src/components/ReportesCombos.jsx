import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { exportToExcel } from '../lib/exportToExcel'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function ReportesCombos() {
  const [combosMasArrendados, setCombosMasArrendados] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cargarReportes()
  }, [])

  const cargarReportes = async () => {
    try {
      // Traer combos con sus arriendos
      const { data: combos, error } = await supabase
        .from('combos')
        .select(`
          id, nombre, descripcion, descuento_porcentaje,
          arriendos(total, dias, estado)
        `)

      if (error) throw error

      // Procesar data de combos
      const procesados = combos?.map(combo => {
        const arriendos = combo.arriendos || []
        const totalRecaudado = arriendos.reduce((sum, arr) => sum + (parseFloat(arr.total) || 0), 0)
        
        return {
          nombre: combo.nombre,
          descripcion: combo.descripcion || '-',
          descuento: combo.descuento_porcentaje,
          arriendos: arriendos.length,
          totalRecaudado,
          promedioArriendo: arriendos.length > 0 ? (totalRecaudado / arriendos.length).toFixed(2) : 0
        }
      }) || []

      setCombosMasArrendados(procesados.sort((a, b) => b.arriendos - a.arriendos))
    } catch (err) {
      console.error('Error cargando reportes:', err)
    } finally {
      setLoading(false)
    }
  }

  const exportarCombos = () => {
    const datos = combosMasArrendados.map(c => ({
      'Oferta': c.nombre,
      'Descripción': c.descripcion,
      'Descuento %': c.descuento,
      'Arriendos': c.arriendos,
      'Total Recaudado': `$${c.totalRecaudado.toFixed(2)}`,
      'Promedio/Arriendo': `$${c.promedioArriendo}`
    }))
    exportToExcel(datos, `reporte-ofertas-${new Date().toISOString().split('T')[0]}`)
  }

  if (loading) return <div style={{ padding: 20 }}>Cargando reportes...</div>

  const totalArriendos = combosMasArrendados.reduce((sum, c) => sum + c.arriendos, 0)
  const totalRecaudado = combosMasArrendados.reduce((sum, c) => sum + c.totalRecaudado, 0)

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h2 style={{ marginBottom: 12 }}>Ofertas Más Arrendadas</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
          <div style={{ background: 'var(--surface2)', padding: 16, borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>Total Ofertas</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--brand)' }}>{combosMasArrendados.length}</div>
          </div>
          <div style={{ background: 'var(--surface2)', padding: 16, borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>Total Arriendos</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--brand)' }}>{totalArriendos}</div>
          </div>
          <div style={{ background: 'var(--surface2)', padding: 16, borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>Total Recaudado</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--brand)' }}>
              ${totalRecaudado.toFixed(2)}
            </div>
          </div>
        </div>

        {combosMasArrendados.length > 0 && (
          <>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16, marginBottom: 16 }}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={combosMasArrendados}>
                  <CartesianGrid stroke="var(--border)" />
                  <XAxis dataKey="nombre" stroke="var(--text2)" angle={-45} height={80} />
                  <YAxis stroke="var(--text2)" />
                  <Tooltip 
                    contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}
                    formatter={(value, name) => {
                      if (name === 'arriendos') return [value, 'Arriendos']
                      return [`$${value.toFixed(2)}`, 'Total Recaudado']
                    }}
                  />
                  <Legend />
                  <Bar dataKey="arriendos" fill="var(--brand)" name="Cantidad de Arriendos" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', marginBottom: 16 }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'var(--surface2)', borderBottom: '2px solid var(--border)' }}>
                      <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>Oferta</th>
                      <th style={{ padding: 12, textAlign: 'center', fontWeight: 600 }}>Arriendos</th>
                      <th style={{ padding: 12, textAlign: 'right', fontWeight: 600 }}>Total Recaudado</th>
                      <th style={{ padding: 12, textAlign: 'right', fontWeight: 600 }}>Promedio</th>
                      <th style={{ padding: 12, textAlign: 'center', fontWeight: 600 }}>Descuento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {combosMasArrendados.map((combo, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: 12, color: 'var(--text)' }}>
                          <div style={{ fontWeight: 600 }}>{combo.nombre}</div>
                          <div style={{ fontSize: 11, color: 'var(--text3)' }}>{combo.descripcion}</div>
                        </td>
                        <td style={{ padding: 12, textAlign: 'center', color: 'var(--brand)', fontWeight: 600 }}>{combo.arriendos}</td>
                        <td style={{ padding: 12, textAlign: 'right', color: 'var(--brand)', fontWeight: 600 }}>
                          ${combo.totalRecaudado.toFixed(2)}
                        </td>
                        <td style={{ padding: 12, textAlign: 'right', color: 'var(--text2)' }}>
                          ${combo.promedioArriendo}
                        </td>
                        <td style={{ padding: 12, textAlign: 'center', color: 'var(--text2)' }}>
                          {combo.descuento}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        <button 
          className="btn btn-sm btn-primary"
          onClick={exportarCombos}
        >
          <i className="ti ti-download" /> Exportar a Excel
        </button>
      </div>
    </div>
  )
}
