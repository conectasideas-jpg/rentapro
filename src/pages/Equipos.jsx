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
  const [search, setSearch] = useState('')
  const [view, setView] = useState('cards') // 'cards' | 'table'

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

  const filtered = equipos.filter(e =>
    !search || e.nombre?.toLowerCase().includes(search.toLowerCase()) ||
    e.especificacion?.toLowerCase().includes(search.toLowerCase())
  )

  const totalDisponible = equipos.reduce((s, e) => s + Math.max(0, e.stock - e.rentados), 0)
  const totalStock = equipos.reduce((s, e) => s + (e.stock || 0), 0)

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <PageHeader
        title="Equipos"
        count={equipos.length}
        actions={
          isAdmin && (
            <button className="btn btn-primary" onClick={openNew}>
              <i className="ti ti-plus" /> Agregar equipo
            </button>
          )
        }
      />

      <div style={{ flex: 1, overflow: 'auto', padding: '18px 22px' }}>

        {/* Summary strip */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          {[
            { label: 'Total equipos', val: equipos.length, icon: 'ti-tool' },
            { label: 'Unidades en stock', val: totalStock, icon: 'ti-stack-2' },
            { label: 'Disponibles ahora', val: totalDisponible, icon: 'ti-check', color: 'var(--brand)' },
            { label: 'Actualmente rentados', val: totalStock - totalDisponible, icon: 'ti-calendar-event', color: 'var(--blue)' },
          ].map(s => (
            <div key={s.label} style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', padding: '10px 16px',
              display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 160px',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <i className={`ti ${s.icon}`} style={{ fontSize: 18, color: s.color || 'var(--text3)' }} />
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: s.color || 'var(--text)', lineHeight: 1 }}>{s.val}</div>
                <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="search-wrap" style={{ flex: '1 1 200px', maxWidth: 280 }}>
            <i className="ti ti-search search-icon" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar equipo..."
            />
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
            <button
              className={`btn btn-sm ${view === 'cards' ? 'btn-primary' : ''}`}
              onClick={() => setView('cards')} title="Vista tarjetas"
            >
              <i className="ti ti-layout-grid" />
            </button>
            <button
              className={`btn btn-sm ${view === 'table' ? 'btn-primary' : ''}`}
              onClick={() => setView('table')} title="Vista tabla"
            >
              <i className="ti ti-table" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading-wrap"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="tcard">
            <div className="empty-state">
              <i className="ti ti-tool" />
              <p>{search ? 'Sin resultados para la búsqueda' : 'No hay equipos registrados'}</p>
            </div>
          </div>
        ) : view === 'cards' ? (
          /* CARDS VIEW */
          <div className="eq-grid">
            {filtered.map(e => {
              const lib = e.stock - e.rentados
              return (
                <div key={e.id} className="eq-card">
                  <div className="eq-card-header">
                    <div className="eq-icon">{eqIcon(e.nombre)}</div>
                    <div style={{ minWidth: 0 }}>
                      <div className="eq-name">{e.nombre}</div>
                      {e.especificacion && <div className="eq-spec">{e.especificacion}</div>}
                    </div>
                  </div>
                  <div className="eq-price">
                    {fmt(e.precio_dia)}<span> /día</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span className={`badge b-dot ${lib > 0 ? 'b-avail' : 'b-rented'}`}>
                      {lib > 0 ? `${lib} disponible${lib > 1 ? 's' : ''}` : 'Sin stock'}
                    </span>
                    <span className="badge b-readonly" style={{ color: 'var(--text3)' }}>
                      Stock: {e.stock}
                    </span>
                  </div>
                  <div className="eq-card-footer">
                    {e.costo_compra > 0 && (
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                        Rec. {Math.ceil(e.costo_compra / e.precio_dia)}d
                      </div>
                    )}
                    {isAdmin && (
                      <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
                        <button className="btn btn-sm btn-icon" title="Editar" onClick={() => openEdit(e)}>
                          <i className="ti ti-edit" />
                        </button>
                        <button className="btn btn-sm btn-icon btn-danger" title="Eliminar" onClick={() => eliminar(e.id, e.nombre)}>
                          <i className="ti ti-trash" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* TABLE VIEW */
          <div className="tcard">
            <div className="tcard-head">
              <div>
                <div className="tcard-title">Detalle de equipos</div>
                <div className="tcard-subtitle">{filtered.length} equipo{filtered.length !== 1 ? 's' : ''}</div>
              </div>
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '22%' }}>Equipo</th>
                    <th style={{ width: '12%' }}>Precio/día</th>
                    <th style={{ width: '8%', textAlign: 'center' }}>Stock</th>
                    <th style={{ width: '10%', textAlign: 'center' }}>Disponible</th>
                    <th style={{ width: '10%', textAlign: 'center' }}>Rentados</th>
                    <th style={{ width: '13%' }}>Costo compra</th>
                    <th style={{ width: '13%' }}>Recuperación</th>
                    {isAdmin && <th className="col-actions" style={{ width: '12%' }}>Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(e => {
                    const lib = e.stock - e.rentados
                    const rec = e.costo_compra && e.precio_dia
                      ? Math.ceil(e.costo_compra / e.precio_dia) + ' días'
                      : '—'
                    return (
                      <tr key={e.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                            <span style={{ fontSize: 16 }}>{eqIcon(e.nombre)}</span>
                            <div>
                              <div className="cell-primary">{e.nombre}</div>
                              {e.especificacion && <div className="cell-secondary">{e.especificacion}</div>}
                            </div>
                          </div>
                        </td>
                        <td><span className="val-money">{fmt(e.precio_dia)}</span></td>
                        <td style={{ textAlign: 'center' }}>{e.stock}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`badge b-dot ${lib > 0 ? 'b-avail' : 'b-rented'}`}>{lib}</span>
                        </td>
                        <td style={{ textAlign: 'center' }}>{e.rentados || 0}</td>
                        <td>{e.costo_compra ? fmt(e.costo_compra) : <span style={{ color: 'var(--text3)' }}>—</span>}</td>
                        <td>{rec !== '—' ? rec : <span style={{ color: 'var(--text3)' }}>—</span>}</td>
                        {isAdmin && (
                          <td className="col-actions">
                            <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                              <button className="btn btn-sm btn-icon" title="Editar" onClick={() => openEdit(e)}>
                                <i className="ti ti-edit" />
                              </button>
                              <button className="btn btn-sm btn-icon btn-danger" title="Eliminar" onClick={() => eliminar(e.id, e.nombre)}>
                                <i className="ti ti-trash" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
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
            <div className="fg">
              <label>Nombre *</label>
              <input value={form.nombre} onChange={e => f('nombre', e.target.value)} placeholder="Ej: Betonera" />
            </div>
            <div className="fg">
              <label>Especificación</label>
              <input value={form.especificacion} onChange={e => f('especificacion', e.target.value)} placeholder="Ej: 130 litros" />
            </div>
            <div className="fg">
              <label>Precio / día ($) *</label>
              <input type="number" value={form.precio_dia} onChange={e => f('precio_dia', e.target.value)} placeholder="0" />
            </div>
            <div className="fg">
              <label>Stock total</label>
              <input type="number" min={1} value={form.stock} onChange={e => f('stock', e.target.value)} />
            </div>
            <div className="fg">
              <label>Costo de compra ($)</label>
              <input type="number" value={form.costo_compra} onChange={e => f('costo_compra', e.target.value)} placeholder="0" />
            </div>
            <div className="fg">
              <label>Costo operacional / día ($)</label>
              <input type="number" value={form.costo_operacional_dia} onChange={e => f('costo_operacional_dia', e.target.value)} placeholder="0" />
            </div>
          </div>
          {form.precio_dia > 0 && form.costo_compra > 0 && (
            <div className="calc-box" style={{ marginTop: 14 }}>
              <div className="calc-row">
                <span>Precio diario</span>
                <span>{fmt(form.precio_dia)}</span>
              </div>
              <div className="calc-row">
                <span>Costo de compra</span>
                <span>{fmt(form.costo_compra)}</span>
              </div>
              <div className="calc-total" style={{ fontSize: 14 }}>
                <span>Días para recuperar inversión</span>
                <span>{Math.ceil(form.costo_compra / form.precio_dia)} días</span>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}
