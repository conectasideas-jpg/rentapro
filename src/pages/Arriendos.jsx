/**
 * Arriendos.jsx — OPTIMIZADO
 * 1. useQuery para arriendos, clientes, equipos y combos → caché compartido con Dashboard
 *    (si ya cargó en Dashboard, aquí es instantáneo)
 * 2. SkeletonStatCards + SkeletonTableRows → no más spinner vacío
 * 3. invalidateMany() invalida claves relacionadas tras crear/devolver/eliminar
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useQuery, invalidateMany } from '../lib/cache'
import { fetchArriendos, fetchClientes, fetchEquiposBasic, fetchCombos } from '../lib/fetchers'
import { useAuth } from '../hooks/useAuth'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'
import { toast } from '../components/Toast'
import { SkeletonStatCards, SkeletonTableRows } from '../components/Skeleton'

const fmt = n => '$' + Math.round(n || 0).toLocaleString('es-CL')
const fmtDate = d => d ? new Date(d + 'T00:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—'

export default function Arriendos() {
  const navigate = useNavigate()
  const { usuario, can } = useAuth()
  const isAdmin = usuario?.rol === 'admin'

  // ─── Caché: si Dashboard ya cargó arriendos/clientes, aquí son instantáneos ───
  const { data: arriendosRaw, loading: loadArr } = useQuery('arriendos', fetchArriendos)
  const { data: clientesRaw, loading: loadCli } = useQuery('clientes', fetchClientes)
  const { data: equiposRaw, loading: loadEq } = useQuery('equipos-basic', fetchEquiposBasic)
  const { data: combosRaw, loading: loadCb } = useQuery('combos', fetchCombos)
  const arriendos = arriendosRaw || []
  const clientes = clientesRaw || []
  const equipos = equiposRaw || []
  const combos = combosRaw || []

  const loading = loadArr || loadCli || loadEq || loadCb

  const [modal, setModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [recalculando, setRecalculando] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ clienteId: '', fecha: today(), tipo: 'equipo', equipoId: '', comboId: '', dias: 1, notas: '' })

  function today() { return new Date().toISOString().split('T')[0] }

  const precioSeleccionado = () => {
    if (form.tipo === 'equipo') {
      return equipos.find(e => e.id === form.equipoId)?.precio_dia || 0
    } else {
      const c = combos.find(x => x.id === form.comboId)
      if (!c) return 0
      const base = (c.combo_equipos || []).reduce((s, ce) => s + (ce.equipos?.precio_dia || 0), 0)
      return Math.round(base * (1 - c.descuento_porcentaje / 100))
    }
  }

  const precio = precioSeleccionado()
  const dias = Number(form.dias) || 1
  const total = precio * dias

  async function save() {
    if (!form.clienteId) { toast('Selecciona un cliente'); return }
    if (form.tipo === 'equipo' && !form.equipoId) { toast('Selecciona un equipo'); return }
    if (form.tipo === 'combo' && !form.comboId) { toast('Selecciona una oferta'); return }
    setSaving(true)
    try {
      const fechaFin = new Date(form.fecha)
      fechaFin.setDate(fechaFin.getDate() + dias)
      const nombreItem = form.tipo === 'equipo'
        ? equipos.find(e => e.id === form.equipoId)?.nombre
        : combos.find(c => c.id === form.comboId)?.nombre

      const payload = {
        cliente_id: form.clienteId, tipo: form.tipo,
        equipo_id: form.tipo === 'equipo' ? form.equipoId : null,
        combo_id: form.tipo === 'combo' ? form.comboId : null,
        nombre_item: nombreItem, fecha_inicio: form.fecha,
        fecha_fin: fechaFin.toISOString().split('T')[0],
        dias, precio_dia: precio, total, notas: form.notas,
        estado: 'activo', creado_por: usuario?.id,
      }
      const { error: errArr } = await supabase.from('arriendos').insert(payload)
      if (errArr) throw new Error(errArr.message)

      const cli = clientes.find(c => c.id === form.clienteId)
      if (cli) {
        await supabase.from('clientes').update({ n_arriendos: (cli.n_arriendos || 0) + 1, total_pagado: (cli.total_pagado || 0) + total }).eq('id', form.clienteId)
      }
      if (form.tipo === 'equipo') {
        const eq = equipos.find(e => e.id === form.equipoId)
        if (eq) await supabase.from('equipos').update({ rentados: (eq.rentados || 0) + 1 }).eq('id', form.equipoId)
      }
      toast('Arriendo guardado ✓')
      setModal(false)
      setForm({ clienteId: '', fecha: today(), tipo: 'equipo', equipoId: '', comboId: '', dias: 1, notas: '' })
      invalidateMany('arriendos', 'arriendos-activos', 'equipos', 'equipos-basic', 'clientes')
    } catch (err) {
      console.error('[Arriendos.save]', err)
      toast('Error: ' + (err.message || 'No se pudo guardar el arriendo'))
    } finally {
      setSaving(false)
    }
  }

  async function devolver(id) {
    if (!confirm('¿Confirmar devolución?')) return
    const { data: arriendo, error } = await supabase.from('arriendos').select('tipo, equipo_id').eq('id', id).single()
    if (error) { toast('No se pudo procesar la devolución'); return }
    await supabase.from('arriendos').update({ estado: 'devuelto' }).eq('id', id)
    if (arriendo?.tipo === 'equipo' && arriendo.equipo_id) {
      const { data: equipo } = await supabase.from('equipos').select('rentados').eq('id', arriendo.equipo_id).single()
      if (equipo) await supabase.from('equipos').update({ rentados: Math.max(0, (equipo.rentados || 0) - 1) }).eq('id', arriendo.equipo_id)
    }
    toast('Devolución registrada')
    invalidateMany('arriendos', 'arriendos-activos', 'equipos', 'equipos-basic')
  }

  async function recalcularRentados() {
    setRecalculando(true)
    try {
      const [{ data: equiposData }, { data: arriendosActivos }] = await Promise.all([
        supabase.from('equipos').select('id'),
        supabase.from('arriendos').select('equipo_id').eq('estado', 'activo')
      ])
      const counts = (arriendosActivos || []).reduce((acc, a) => {
        if (a.equipo_id) acc[a.equipo_id] = (acc[a.equipo_id] || 0) + 1
        return acc
      }, {})
      await Promise.all((equiposData || []).map(e =>
        supabase.from('equipos').update({ rentados: counts[e.id] || 0 }).eq('id', e.id)
      ))
      toast('Rentados recalculados')
      invalidateMany('equipos', 'equipos-basic', 'arriendos', 'arriendos-activos')
    } catch { toast('Error recalculando') }
    finally { setRecalculando(false) }
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar este arriendo?')) return
    const { data: arriendo, error } = await supabase.from('arriendos').select('tipo, equipo_id').eq('id', id).single()
    if (error) { toast('No se pudo eliminar'); return }
    if (arriendo?.tipo === 'equipo' && arriendo?.equipo_id) {
      const { data: equipo } = await supabase.from('equipos').select('rentados').eq('id', arriendo.equipo_id).single()
      if (equipo) await supabase.from('equipos').update({ rentados: Math.max(0, (equipo.rentados || 0) - 1) }).eq('id', arriendo.equipo_id)
    }
    await supabase.from('arriendos').delete().eq('id', id)
    toast('Arriendo eliminado')
    invalidateMany('arriendos', 'arriendos-activos', 'equipos', 'equipos-basic')
  }

  const hoy = today()
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const activos = arriendos.filter(a => a.estado === 'activo')
  const vencidos = activos.filter(a => a.fecha_fin < hoy)
  const devueltos = arriendos.filter(a => a.estado === 'devuelto')
  const mes = hoy.slice(0, 7)
  const ingMes = arriendos.filter(a => a.fecha_inicio?.startsWith(mes)).reduce((s, a) => s + (a.total || 0), 0)

  const visible = arriendos.filter(a => {
    const ov = a.estado === 'activo' && a.fecha_fin < hoy
    if (filtroEstado === 'activos') return a.estado === 'activo' && !ov
    if (filtroEstado === 'vencidos') return ov
    if (filtroEstado === 'devueltos') return a.estado === 'devuelto'
    return true
  }).filter(a =>
    !search ||
    a.clientes?.nombre?.toLowerCase().includes(search.toLowerCase()) ||
    a.nombre_item?.toLowerCase().includes(search.toLowerCase())
  )

  const FILTROS = [
    { key: 'todos', label: 'Todos', count: arriendos.length },
    { key: 'activos', label: 'Activos', count: activos.length - vencidos.length },
    { key: 'vencidos', label: 'Vencidos', count: vencidos.length },
    { key: 'devueltos', label: 'Devueltos', count: devueltos.length },
  ]

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <PageHeader title="Arriendos" count={loading ? null : arriendos.length}
        actions={<>
          {can('clientes') && (
            <button className="btn" onClick={() => navigate('/clientes')}>
              <i className="ti ti-user-plus" /> Cliente
            </button>
          )}
          {can('arriendos') && (
            <button className="btn btn-primary" onClick={() => setModal(true)}>
              <i className="ti ti-plus" /> Nuevo arriendo
            </button>
          )}
        </>}
      />

      <div style={{ flex: 1, overflow: 'auto', padding: '18px 22px' }}>
        {/* Stats */}
        {loading ? <SkeletonStatCards count={4} /> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
            {[
              { label: 'Activos', val: activos.length - vencidos.length, color: 'var(--brand)', icon: 'ti-clipboard-check' },
              { label: 'Vencidos', val: vencidos.length, color: vencidos.length > 0 ? 'var(--red)' : 'var(--text3)', icon: 'ti-alert-circle' },
              { label: 'Devueltos', val: devueltos.length, color: 'var(--blue)', icon: 'ti-package-export' },
              { label: 'Ingresos del mes', val: fmt(ingMes), color: 'var(--text)', icon: 'ti-currency-dollar' },
            ].map(s => (
              <div key={s.label} className="stat-card">
                <i className={`ti ${s.icon} stat-icon`} style={{ color: s.color }} />
                <div className="stat-value" style={{ color: s.color }}>{s.val}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        <div className="tcard">
          <div className="tcard-head">
            <div>
              <div className="tcard-title">Registro de arriendos</div>
              <div className="tcard-subtitle">{visible.length} resultado{visible.length !== 1 ? 's' : ''}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 2, background: 'var(--surface2)', padding: 3, borderRadius: 8, border: '1px solid var(--border)' }}>
                {FILTROS.map(fil => (
                  <button key={fil.key} onClick={() => setFiltroEstado(fil.key)} style={{
                    padding: '4px 10px', border: 'none', borderRadius: 6,
                    fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    background: filtroEstado === fil.key ? 'var(--surface)' : 'transparent',
                    color: filtroEstado === fil.key ? 'var(--text)' : 'var(--text3)',
                    boxShadow: filtroEstado === fil.key ? 'var(--shadow-sm)' : 'none',
                    transition: 'all .12s',
                  }}>
                    {fil.label}
                    {fil.count > 0 && (
                      <span style={{
                        marginLeft: 4, background: filtroEstado === fil.key ? 'var(--brand-light)' : 'transparent',
                        color: filtroEstado === fil.key ? 'var(--brand)' : 'var(--text3)',
                        padding: '0 5px', borderRadius: 10, fontSize: 10, fontWeight: 700,
                      }}>{fil.count}</span>
                    )}
                  </button>
                ))}
              </div>
              <div className="search-wrap">
                <i className="ti ti-search search-icon" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." />
              </div>
              {isAdmin && (
                <button className="btn btn-sm btn-warning" onClick={recalcularRentados} disabled={recalculando} title="Recalcular unidades rentadas">
                  <i className="ti ti-refresh" style={{ animation: recalculando ? 'spin .7s linear infinite' : 'none' }} />
                  {recalculando ? 'Recalc...' : 'Recalcular'}
                </button>
              )}
            </div>
          </div>

          {loadArr ? (
            <table><SkeletonTableRows rows={5} cols={8} /></table>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead><tr>
                  <th style={{ width: '14%' }}>Cliente</th>
                  <th style={{ width: '18%' }}>Equipo / oferta</th>
                  <th style={{ width: '10%' }}>Inicio</th>
                  <th style={{ width: '10%' }}>Término</th>
                  <th style={{ width: '6%', textAlign: 'center' }}>Días</th>
                  <th style={{ width: '12%' }}>Total</th>
                  <th style={{ width: '10%' }}>Estado</th>
                  <th className="col-actions" style={{ width: '10%' }}>Acciones</th>
                </tr></thead>
                <tbody>
                  {visible.length === 0 ? (
                    <tr><td colSpan={8}>
                      <div className="empty-state">
                        <i className="ti ti-clipboard-x" />
                        <p>{search || filtroEstado !== 'todos' ? 'Sin resultados' : 'Sin arriendos registrados'}</p>
                      </div>
                    </td></tr>
                  ) : visible.map(a => {
                    const ov = a.estado === 'activo' && a.fecha_fin < hoy
                    const statusClass = a.estado === 'devuelto' ? 'b-returned' : ov ? 'b-overdue' : 'b-active'
                    const statusLabel = a.estado === 'devuelto' ? 'Devuelto' : ov ? 'Vencido' : 'Activo'
                    return (
                      <tr key={a.id} style={{ opacity: a.estado === 'devuelto' ? .75 : 1 }}>
                        <td><div className="cell-primary">{a.clientes?.nombre || '—'}</div></td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span>{a.nombre_item}</span>
                            {a.tipo === 'combo' && <span className="badge b-combo" style={{ fontSize: 9 }}>oferta</span>}
                          </div>
                        </td>
                        <td style={{ color: 'var(--text3)', fontSize: 11 }}>{fmtDate(a.fecha_inicio)}</td>
                        <td style={{ color: ov ? 'var(--red)' : 'var(--text3)', fontSize: 11, fontWeight: ov ? 700 : 400 }}>{fmtDate(a.fecha_fin)}</td>
                        <td style={{ textAlign: 'center', color: 'var(--text3)' }}>{a.dias}</td>
                        <td><span className="val-money">{fmt(a.total)}</span></td>
                        <td><span className={`badge b-dot ${statusClass}`}>{statusLabel}</span></td>
                        <td className="col-actions">
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                            {a.estado === 'activo' && can('devolucion') && (
                              <button className="btn btn-sm btn-icon" title="Registrar devolución" onClick={() => devolver(a.id)}>
                                <i className="ti ti-package-export" />
                              </button>
                            )}
                            {isAdmin && (
                              <button className="btn btn-sm btn-icon btn-danger" title="Eliminar" onClick={() => eliminar(a.id)}>
                                <i className="ti ti-trash" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {modal && (
        <Modal
          title={<><i className="ti ti-clipboard-plus" /> Nuevo arriendo</>}
          onClose={() => setModal(false)}
          actions={<>
            <button className="btn" onClick={() => setModal(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? <div className="spinner" /> : <><i className="ti ti-check" /> Guardar arriendo</>}
            </button>
          </>}
        >
          <div className="form-grid">
            <div className="fg">
              <label>Cliente *</label>
              <select value={form.clienteId} onChange={e => f('clienteId', e.target.value)}>
                <option value="">Seleccionar cliente...</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div className="fg">
              <label>Fecha inicio *</label>
              <input type="date" value={form.fecha} onChange={e => f('fecha', e.target.value)} />
            </div>
            <div className="fg">
              <label>Tipo</label>
              <select value={form.tipo} onChange={e => f('tipo', e.target.value)}>
                <option value="equipo">Equipo individual</option>
                <option value="combo">Oferta combo</option>
              </select>
            </div>
            {form.tipo === 'equipo' ? (
              <div className="fg">
                <label>Equipo *</label>
                <select value={form.equipoId} onChange={e => f('equipoId', e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {equipos.map(e => <option key={e.id} value={e.id}>{e.nombre} — {fmt(e.precio_dia)}/día</option>)}
                </select>
              </div>
            ) : (
              <div className="fg">
                <label>Oferta *</label>
                <select value={form.comboId} onChange={e => f('comboId', e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {combos.map(c => {
                    const base = (c.combo_equipos || []).reduce((s, ce) => s + (ce.equipos?.precio_dia || 0), 0)
                    const p = Math.round(base * (1 - c.descuento_porcentaje / 100))
                    return <option key={c.id} value={c.id}>{c.nombre} — {fmt(p)}/día</option>
                  })}
                </select>
              </div>
            )}
            <div className="fg">
              <label>Días *</label>
              <input type="number" min={1} value={form.dias} onChange={e => f('dias', e.target.value)} />
            </div>
            <div className="fg">
              <label>Notas</label>
              <input value={form.notas} onChange={e => f('notas', e.target.value)} placeholder="Lugar de entrega, observaciones..." />
            </div>
          </div>
          <div className="calc-box">
            <div className="calc-row"><span>Precio diario</span><span>{fmt(precio)}</span></div>
            <div className="calc-row"><span>Cantidad de días</span><span>{dias}</span></div>
            <div className="calc-total"><span>Total a cobrar</span><span>{fmt(total)}</span></div>
          </div>
        </Modal>
      )}
    </div>
  )
}
