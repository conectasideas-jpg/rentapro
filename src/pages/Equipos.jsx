import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'
import { toast } from '../components/Toast'

const fmt = n => '$' + Math.round(n || 0).toLocaleString('es-CL')

const eqIcon = n => {
  if (/beton/i.test(n)) return '🏗️'
  if (/vibr/i.test(n)) return '⚡'
  if (/plac|compact/i.test(n)) return '🔧'
  if (/moto|bomba|agua/i.test(n)) return '💧'
  if (/genera/i.test(n)) return '🔌'
  if (/anda/i.test(n)) return '🏛️'
  return '🔩'
}

const EMPTY = { nombre: '', especificacion: '', precio_dia: '', stock: 1, costo_compra: '', costo_operacional_dia: '' }

export default function Equipos() {
  const { usuario } = useAuth()
  const isAdmin = usuario?.rol === 'admin'
  const [equipos, setEquipos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('equipos').select('*').order('nombre')
    setEquipos(data || [])
    setLoading(false)
  }

  function openNew() { setForm(EMPTY); setModal(true) }
  function openEdit(e) { setForm(e); setModal(true) }

  async function save() {
    if (!form.nombre || !form.precio_dia) { toast('Nombre y precio son obligatorios'); return }
    setSaving(true)
    const payload = {
      nombre: form.nombre, especificacion: form.especificacion,
      precio_dia: Number(form.precio_dia), stock: Number(form.stock) || 1,
      costo_compra: Number(form.costo_compra) || 0,
      costo_operacional_dia: Number(form.costo_operacional_dia) || 0,
    }
    if (form.id) {
      await supabase.from('equipos').update(payload).eq('id', form.id)
      toast('Equipo actualizado')
    } else {
      await supabase.from('equipos').insert({ ...payload, rentados: 0 })
      toast('Equipo agregado')
    }
    setSaving(false)
    setModal(false)
    load()
  }

  async function eliminar(id, nombre) {
    if (!confirm(`¿Eliminar el equipo "${nombre}"?`)) return
    await supabase.from('equipos').delete().eq('id', id)
    toast('Equipo eliminado')
    load()
  }

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <PageHeader title="Equipos" actions={
        isAdmin && <button className="btn btn-primary" onClick={openNew}><i className="ti ti-plus" /> Agregar equipo</button>
      } />
      <div style={{ flex: 1, overflow: 'auto', padding: '20px 22px' }}>

        {/* CARDS GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 20 }}>
          {equipos.map(e => {
            const lib = e.stock - e.rentados
            return (
              <div key={e.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 'var(--radius)', background: 'var(--brand-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                    {eqIcon(e.nombre)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{e.nombre}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>{e.especificacion}</div>
                  </div>
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--brand)' }}>
                  {fmt(e.precio_dia)}<span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text3)' }}>/día</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                  <span className={`badge ${lib > 0 ? 'b-avail' : 'b-rented'}`}>{lib > 0 ? `${lib} disponible${lib > 1 ? 's' : ''}` : 'Sin stock'}</span>
                  {isAdmin && (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-sm btn-icon" onClick={() => openEdit(e)}><i className="ti ti-edit" /></button>
                      <button className="btn btn-sm btn-icon btn-danger" onClick={() => eliminar(e.id, e.nombre)}><i className="ti ti-trash" /></button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* TABLE */}
        <div className="tcard">
          <div className="tcard-head">
            <span className="tcard-title">Detalle de equipos</span>
          </div>
          {loading ? <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" /></div> : (
            <table>
              <thead><tr>
                <th style={{ width: '18%' }}>Nombre</th><th style={{ width: '14%' }}>Especificación</th>
                <th style={{ width: '12%' }}>Precio/día</th><th style={{ width: '8%' }}>Stock</th>
                <th style={{ width: '10%' }}>Disponible</th><th style={{ width: '13%' }}>Costo compra</th>
                <th style={{ width: '13%' }}>Recuperación</th><th style={{ width: '12%' }}>Acciones</th>
              </tr></thead>
              <tbody>
                {equipos.map(e => {
                  const lib = e.stock - e.rentados
                  const rec = e.costo_compra && e.precio_dia ? Math.ceil(e.costo_compra / e.precio_dia) + ' días' : '—'
                  return (
                    <tr key={e.id}>
                      <td><strong>{e.nombre}</strong></td>
                      <td>{e.especificacion}</td>
                      <td style={{ fontWeight: 700, color: 'var(--brand)' }}>{fmt(e.precio_dia)}</td>
                      <td style={{ textAlign: 'center' }}>{e.stock}</td>
                      <td style={{ textAlign: 'center' }}><span className={`badge ${lib > 0 ? 'b-avail' : 'b-rented'}`}>{lib}</span></td>
                      <td>{e.costo_compra ? fmt(e.costo_compra) : '—'}</td>
                      <td>{rec}</td>
                      <td>
                        {isAdmin ? (
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="btn btn-sm btn-icon" onClick={() => openEdit(e)}><i className="ti ti-edit" /></button>
                            <button className="btn btn-sm btn-icon btn-danger" onClick={() => eliminar(e.id, e.nombre)}><i className="ti ti-trash" /></button>
                          </div>
                        ) : <span style={{ color: 'var(--text3)', fontSize: 11 }}>Solo lectura</span>}
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
          title={<><i className="ti ti-tool" /> {form.id ? 'Editar' : 'Agregar'} equipo</>}
          onClose={() => setModal(false)}
          actions={<>
            <button className="btn" onClick={() => setModal(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? <div className="spinner" /> : <><i className="ti ti-check" /> Guardar</>}
            </button>
          </>}
        >
          <div className="form-grid">
            <div className="fg"><label>Nombre *</label><input value={form.nombre} onChange={e => f('nombre', e.target.value)} placeholder="Ej: Betonera" /></div>
            <div className="fg"><label>Especificación</label><input value={form.especificacion} onChange={e => f('especificacion', e.target.value)} placeholder="Ej: 130 litros" /></div>
            <div className="fg"><label>Precio / día ($) *</label><input type="number" value={form.precio_dia} onChange={e => f('precio_dia', e.target.value)} /></div>
            <div className="fg"><label>Stock total</label><input type="number" min={1} value={form.stock} onChange={e => f('stock', e.target.value)} /></div>
            <div className="fg"><label>Costo de compra ($)</label><input type="number" value={form.costo_compra} onChange={e => f('costo_compra', e.target.value)} /></div>
            <div className="fg"><label>Costo operacional / día ($)</label><input type="number" value={form.costo_operacional_dia} onChange={e => f('costo_operacional_dia', e.target.value)} /></div>
          </div>
        </Modal>
      )}
    </div>
  )
}
