/**
 * Combos.jsx — OPTIMIZADO
 * 1. useQuery para combos y equipos → caché compartido con Arriendos
 * 2. invalidateMany invalida combos en todas las páginas que los usan
 */
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useQuery, invalidateMany } from '../lib/cache'
import { fetchCombos, fetchEquiposBasic } from '../lib/fetchers'
import { useAuth } from '../hooks/useAuth'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'
import { toast } from '../components/Toast'

const fmt = n => '$' + Math.round(n || 0).toLocaleString('es-CL')
const EMPTY = { nombre: '', descripcion: '', descuento_porcentaje: 10, equiposIds: [] }

export default function Combos() {
  const { usuario } = useAuth()
  const isAdmin = usuario?.rol === 'admin'
  const { data: combos = [], loading: loadCb } = useQuery('combos', fetchCombos)
  const { data: equipos = [], loading: loadEq } = useQuery('equipos-basic', fetchEquiposBasic)
  const loading = loadCb || loadEq
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  function openNew() { setForm(EMPTY); setModal(true) }
  function openEdit(c) {
    setForm({ id: c.id, nombre: c.nombre, descripcion: c.descripcion || '',
      descuento_porcentaje: c.descuento_porcentaje,
      equiposIds: c.combo_equipos.map(ce => ce.equipo_id)
    })
    setModal(true)
  }

  function toggleEquipo(id) {
    setForm(p => ({
      ...p,
      equiposIds: p.equiposIds.includes(id) ? p.equiposIds.filter(x => x !== id) : [...p.equiposIds, id]
    }))
  }

  const base = form.equiposIds.reduce((s, id) => {
    const e = equipos.find(x => x.id === id)
    return s + (e?.precio_dia || 0)
  }, 0)
  const dcto = base * (form.descuento_porcentaje || 0) / 100
  const final = base - dcto

  async function save() {
    if (!form.nombre) { toast('Nombre es obligatorio'); return }
    if (form.equiposIds.length < 2) { toast('Selecciona al menos 2 equipos'); return }
    setSaving(true)
    try {
      const payload = {
        nombre: form.nombre,
        descripcion: form.descripcion,
        descuento_porcentaje: Number(form.descuento_porcentaje) || 0,
      }
      let comboId = form.id

      if (form.id) {
        // ── Editar combo existente ──
        const { error: errUpdate } = await supabase.from('combos').update(payload).eq('id', form.id)
        if (errUpdate) throw new Error('No se pudo actualizar la oferta: ' + errUpdate.message)

        const { error: errDel } = await supabase.from('combo_equipos').delete().eq('combo_id', form.id)
        if (errDel) throw new Error('Error limpiando equipos anteriores: ' + errDel.message)
      } else {
        // ── Crear nuevo combo ──
        const { data, error: errInsert } = await supabase
          .from('combos').insert(payload).select().single()

        if (errInsert) throw new Error('No se pudo crear la oferta: ' + errInsert.message)
        if (!data?.id) throw new Error('Supabase no devolvió el ID del nuevo combo.')

        comboId = data.id
      }

      // ── Insertar relaciones equipo ──
      const { error: errEq } = await supabase
        .from('combo_equipos')
        .insert(form.equiposIds.map(eid => ({ combo_id: comboId, equipo_id: eid })))

      if (errEq) throw new Error('Error guardando equipos del combo: ' + errEq.message)

      toast(form.id ? 'Oferta actualizada ✓' : 'Oferta creada ✓')
      setModal(false)
      invalidateMany('combos')
    } catch (err) {
      console.error('[Combos.save]', err)
      toast('Error: ' + (err.message || 'No se pudo guardar'))
    } finally {
      // SIEMPRE libera el botón, aunque falle
      setSaving(false)
    }
  }

  async function eliminar(id, nombre) {
    if (!confirm(`¿Eliminar el combo "${nombre}"?`)) return
    await supabase.from('combos').delete().eq('id', id)
    toast('Oferta eliminada')
    invalidateMany('combos')
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <PageHeader title="Ofertas" count={loading ? null : combos.length}
        actions={isAdmin && <button className="btn btn-primary" onClick={openNew}><i className="ti ti-plus" /> Agregar oferta</button>}
      />
      <div style={{ flex: 1, overflow: 'auto', padding: '20px 22px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1,2,3].map(i => (
              <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 16, height: 110, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent 0%, var(--surface2) 50%, transparent 100%)', animation: 'sk-shimmer 1.4s infinite' }} />
              </div>
            ))}
          </div>
        ) : combos.length === 0 ? (
          <div className="empty-state">
            <i className="ti ti-package" style={{ fontSize: 36, display: 'block', marginBottom: 8 }} />
            Sin ofertas. {isAdmin && 'Agrega la primera.'}
          </div>
        ) : combos.map(c => {
          const eqs = c.combo_equipos || []
          const baseP = eqs.reduce((s, ce) => s + (ce.equipos?.precio_dia || 0), 0)
          const fin = Math.round(baseP * (1 - c.descuento_porcentaje / 100))
          const eqNames = eqs.map(ce => ce.equipos?.nombre).filter(Boolean).join(' + ')
          return (
            <div key={c.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 16, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 3 }}>
                  {c.nombre} <span className="badge b-combo">-{c.descuento_porcentaje}%</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>{c.descripcion}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>{eqNames}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                  <span style={{ fontSize: 12, color: 'var(--text3)', textDecoration: 'line-through' }}>{fmt(baseP)}/día</span>
                  <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--brand)' }}>{fmt(fin)}</span>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>/día</span>
                </div>
              </div>
              {isAdmin && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <button className="btn btn-sm" onClick={() => openEdit(c)}><i className="ti ti-edit" /> Editar</button>
                  <button className="btn btn-sm btn-danger" onClick={() => eliminar(c.id, c.nombre)}><i className="ti ti-trash" /></button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {modal && (
        <Modal
          title={<><i className="ti ti-package" /> {form.id ? 'Editar' : 'Nueva'} oferta</>}
          onClose={() => setModal(false)}
          actions={<>
            <button className="btn" onClick={() => setModal(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? <div className="spinner" /> : <><i className="ti ti-check" /> Guardar</>}
            </button>
          </>}
        >
          <div className="form-grid">
            <div className="fg"><label>Nombre *</label><input value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} /></div>
            <div className="fg"><label>Descuento (%)</label><input type="number" min={0} max={60} value={form.descuento_porcentaje} onChange={e => setForm(p => ({ ...p, descuento_porcentaje: e.target.value }))} /></div>
            <div className="fg full"><label>Descripción</label><input value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} /></div>
          </div>
          <div className="sep" />
          <div className="fg">
            <label>Equipos incluidos *</label>
            <div className="check-grid">
              {equipos.map(e => (
                <div key={e.id} className={`check-item ${form.equiposIds.includes(e.id) ? 'selected' : ''}`} onClick={() => toggleEquipo(e.id)}>
                  <input type="checkbox" checked={form.equiposIds.includes(e.id)} onChange={() => {}} style={{ pointerEvents: 'none', accentColor: 'var(--brand)' }} />
                  {e.nombre}
                </div>
              ))}
            </div>
          </div>
          <div className="calc-box">
            <div className="calc-row"><span>Precio base</span><span>{fmt(base)}</span></div>
            <div className="calc-row"><span>Descuento {form.descuento_porcentaje}%</span><span>-{fmt(dcto)}</span></div>
            <div className="calc-total"><span>Precio combo / día</span><span>{fmt(final)}</span></div>
          </div>
        </Modal>
      )}
    </div>
  )
}
