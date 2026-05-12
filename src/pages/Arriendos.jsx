import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'
import { toast } from '../components/Toast'

const fmt = n => '$' + Math.round(n || 0).toLocaleString('es-CL')

export default function Arriendos() {
  const { usuario, can } = useAuth()
  const isAdmin = usuario?.rol === 'admin'
  const [arriendos, setArriendos] = useState([])
  const [clientes, setClientes] = useState([])
  const [equipos, setEquipos] = useState([])
  const [combos, setCombos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ clienteId: '', fecha: today(), tipo: 'equipo', equipoId: '', comboId: '', dias: 1, notas: '' })

  function today() { return new Date().toISOString().split('T')[0] }

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: arr }, { data: cli }, { data: eq }, { data: cb }] = await Promise.all([
      supabase.from('arriendos').select('*, clientes(nombre)').order('created_at', { ascending: false }),
      supabase.from('clientes').select('id, nombre').order('nombre'),
      supabase.from('equipos').select('id, nombre, precio_dia, stock, rentados').order('nombre'),
      supabase.from('combos').select('*, combo_equipos(equipo_id, equipos(precio_dia))').order('nombre'),
    ])
    setArriendos(arr || [])
    setClientes(cli || [])
    setEquipos(eq || [])
    setCombos(cb || [])
    setLoading(false)
  }

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
    if (form.tipo === 'combo' && !form.comboId) { toast('Selecciona un combo'); return }
    setSaving(true)
    const fechaFin = new Date(form.fecha)
    fechaFin.setDate(fechaFin.getDate() + dias)
    const nombreItem = form.tipo === 'equipo'
      ? equipos.find(e => e.id === form.equipoId)?.nombre
      : combos.find(c => c.id === form.comboId)?.nombre

    const payload = {
      cliente_id: form.clienteId,
      tipo: form.tipo,
      equipo_id: form.tipo === 'equipo' ? form.equipoId : null,
      combo_id: form.tipo === 'combo' ? form.comboId : null,
      nombre_item: nombreItem,
      fecha_inicio: form.fecha,
      fecha_fin: fechaFin.toISOString().split('T')[0],
      dias, precio_dia: precio, total,
      notas: form.notas,
      estado: 'activo',
      creado_por: usuario?.id,
    }
    await supabase.from('arriendos').insert(payload)
    // Actualizar contador cliente
    const cli = clientes.find(c => c.id === form.clienteId)
    if (cli) {
      await supabase.from('clientes').update({ n_arriendos: (cli.n_arriendos || 0) + 1, total_pagado: (cli.total_pagado || 0) + total }).eq('id', form.clienteId)
    }
    // Actualizar rentados equipo
    if (form.tipo === 'equipo') {
      const eq = equipos.find(e => e.id === form.equipoId)
      if (eq) await supabase.from('equipos').update({ rentados: (eq.rentados || 0) + 1 }).eq('id', form.equipoId)
    }
    toast('Arriendo guardado')
    setSaving(false)
    setModal(false)
    setForm({ clienteId: '', fecha: today(), tipo: 'equipo', equipoId: '', comboId: '', dias: 1, notas: '' })
    load()
  }

  async function devolver(id) {
    if (!confirm('¿Confirmar devolución?')) return
    await supabase.from('arriendos').update({ estado: 'devuelto' }).eq('id', id)
    toast('Devolución registrada')
    load()
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar este arriendo?')) return
    await supabase.from('arriendos').delete().eq('id', id)
    toast('Arriendo eliminado')
    load()
  }

  const hoy = today()
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <PageHeader title="Arriendos" actions={
        can('arriendos') && <button className="btn btn-primary" onClick={() => setModal(true)}><i className="ti ti-plus" /> Nuevo arriendo</button>
      } />
      <div style={{ flex: 1, overflow: 'auto', padding: '20px 22px' }}>
        <div className="tcard">
          {loading ? <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" /></div> : (
            <table>
              <thead><tr>
                <th style={{ width: '10%' }}>Fecha</th><th style={{ width: '18%' }}>Cliente</th>
                <th style={{ width: '20%' }}>Equipo / combo</th><th style={{ width: '7%' }}>Días</th>
                <th style={{ width: '12%' }}>Total</th><th style={{ width: '11%' }}>Término</th>
                <th style={{ width: '9%' }}>Estado</th><th style={{ width: '13%' }}>Acciones</th>
              </tr></thead>
              <tbody>
                {arriendos.length === 0 ? (
                  <tr><td colSpan={8}><div className="empty-state"><i className="ti ti-clipboard-x" style={{ fontSize: 36, display: 'block', marginBottom: 8 }} />Sin arriendos</div></td></tr>
                ) : arriendos.map(a => {
                  const ov = a.estado === 'activo' && a.fecha_fin < hoy
                  return (
                    <tr key={a.id}>
                      <td>{a.fecha_inicio}</td>
                      <td>{a.clientes?.nombre || '—'}</td>
                      <td>{a.nombre_item} {a.tipo === 'combo' && <span className="badge b-combo">combo</span>}</td>
                      <td>{a.dias}</td>
                      <td style={{ fontWeight: 700, color: 'var(--brand)' }}>{fmt(a.total)}</td>
                      <td>{a.fecha_fin}</td>
                      <td><span className={`badge ${a.estado === 'devuelto' ? 'b-returned' : ov ? 'b-overdue' : 'b-active'}`}>{a.estado === 'devuelto' ? 'Devuelto' : ov ? 'Vencido' : 'Activo'}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {a.estado === 'activo' && can('devolucion') && (
                            <button className="btn btn-sm btn-icon" title="Devolver" onClick={() => devolver(a.id)}><i className="ti ti-package-export" /></button>
                          )}
                          {isAdmin && <button className="btn btn-sm btn-icon btn-danger" onClick={() => eliminar(a.id)}><i className="ti ti-trash" /></button>}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
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
            <div className="fg"><label>Fecha inicio *</label><input type="date" value={form.fecha} onChange={e => f('fecha', e.target.value)} /></div>
            <div className="fg">
              <label>Tipo</label>
              <select value={form.tipo} onChange={e => f('tipo', e.target.value)}>
                <option value="equipo">Equipo individual</option>
                <option value="combo">Combo</option>
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
                <label>Combo *</label>
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
            <div className="fg"><label>Días *</label><input type="number" min={1} value={form.dias} onChange={e => f('dias', e.target.value)} /></div>
          </div>
          <div className="calc-box">
            <div className="calc-row"><span>Precio diario</span><span>{fmt(precio)}</span></div>
            <div className="calc-row"><span>Días</span><span>{dias}</span></div>
            <div className="calc-total"><span>Total</span><span>{fmt(total)}</span></div>
          </div>
          <div className="sep" />
          <div className="fg full"><label>Notas</label><textarea rows={2} value={form.notas} onChange={e => f('notas', e.target.value)} placeholder="Lugar de entrega, observaciones..." /></div>
        </Modal>
      )}
    </div>
  )
}
