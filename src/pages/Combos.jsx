import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'
import { toast } from '../components/Toast'

const fmt = n => '$' + Math.round(n || 0).toLocaleString('es-CL')
const EMPTY = { nombre: '', descripcion: '', descuento_porcentaje: 10, equiposIds: [] }

export default function Combos() {
  const { usuario } = useAuth()
  const isAdmin = usuario?.rol === 'admin'
  const [combos, setCombos] = useState([])
  const [equipos, setEquipos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  // Mensaje de validación visible en pantalla (no toast que desaparece)
  const [validMsg, setValidMsg] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: cb }, { data: eq }] = await Promise.all([
      supabase.from('combos').select('*, combo_equipos(equipo_id, equipos(id, nombre, precio_dia))').order('nombre'),
      supabase.from('equipos').select('id, nombre, precio_dia').order('nombre')
    ])
    setCombos(cb || [])
    setEquipos(eq || [])
    setLoading(false)
  }

  function openNew() { setForm(EMPTY); setValidMsg(''); setModal(true) }
  function openEdit(c) {
    setForm({
      id: c.id, nombre: c.nombre, descripcion: c.descripcion || '',
      descuento_porcentaje: c.descuento_porcentaje,
      equiposIds: c.combo_equipos.map(ce => ce.equipo_id)
    })
    setValidMsg('')
    setModal(true)
  }

  function toggleEquipo(id) {
    setValidMsg('')
    setForm(p => ({
      ...p,
      equiposIds: p.equiposIds.includes(id)
        ? p.equiposIds.filter(x => x !== id)
        : [...p.equiposIds, id]
    }))
  }

  const base = form.equiposIds.reduce((s, id) => {
    const e = equipos.find(x => x.id === id)
    return s + (e?.precio_dia || 0)
  }, 0)
  const dcto = base * (form.descuento_porcentaje || 0) / 100
  const final = base - dcto

  async function save() {
    // Validaciones con mensaje visible en pantalla (no toast)
    if (!form.nombre.trim()) {
      setValidMsg('⚠ El nombre es obligatorio')
      return
    }
    // FIX: bajamos el mínimo a 1 equipo — no tiene sentido bloquear con 1
    if (form.equiposIds.length < 1) {
      setValidMsg('⚠ Selecciona al menos 1 equipo')
      return
    }
    setValidMsg('')
    setSaving(true)
    try {
      const payload = {
        nombre: form.nombre.trim(),
        descripcion: form.descripcion,
        descuento_porcentaje: Number(form.descuento_porcentaje) || 0,
      }
      let comboId = form.id
      if (form.id) {
        const { error: e1 } = await supabase.from('combos').update(payload).eq('id', form.id)
        if (e1) throw new Error(e1.message)
        const { error: e2 } = await supabase.from('combo_equipos').delete().eq('combo_id', form.id)
        if (e2) throw new Error(e2.message)
      } else {
        const { data, error: e1 } = await supabase.from('combos').insert(payload).select().single()
        if (e1) throw new Error(e1.message)
        if (!data?.id) throw new Error('No se recibió ID del nuevo combo')
        comboId = data.id
      }
      const { error: e3 } = await supabase
        .from('combo_equipos')
        .insert(form.equiposIds.map(eid => ({ combo_id: comboId, equipo_id: eid })))
      if (e3) throw new Error(e3.message)

      toast(form.id ? 'Oferta actualizada ✓' : 'Oferta creada ✓')
      setModal(false)
      load()
    } catch (err) {
      // Muestra el error en pantalla, no en toast
      setValidMsg('❌ Error: ' + (err.message || 'No se pudo guardar'))
    } finally {
      setSaving(false)
    }
  }

  async function eliminar(id, nombre) {
    if (!confirm(`¿Eliminar el combo "${nombre}"?`)) return
    await supabase.from('combos').delete().eq('id', id)
    toast('Oferta eliminada')
    load()
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <PageHeader title="Ofertas" actions={
        isAdmin && <button className="btn btn-primary" onClick={openNew}><i className="ti ti-plus" /> Agregar oferta</button>
      } />
      <div style={{ flex: 1, overflow: 'auto', padding: '20px 22px' }}>
        {loading ? <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" /></div> : (
          combos.length === 0
            ? <div className="empty-state"><i className="ti ti-package" style={{ fontSize: 36, display: 'block', marginBottom: 8 }} />Sin ofertas. {isAdmin && 'Agrega la primera.'}</div>
            : combos.map(c => {
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
            })
        )}
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
            <div className="fg"><label>Descuento (%)</label><input type="number" min={0} max={100} value={form.descuento_porcentaje} onChange={e => setForm(p => ({ ...p, descuento_porcentaje: e.target.value }))} /></div>
            <div className="fg full"><label>Descripción</label><input value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} /></div>
          </div>
          <div className="sep" />
          <div className="fg">
            <label>Equipos incluidos * <span style={{ fontWeight: 400, color: 'var(--text3)', fontSize: 11 }}>({form.equiposIds.length} seleccionado{form.equiposIds.length !== 1 ? 's' : ''})</span></label>
            <div className="check-grid">
              {equipos.map(e => (
                <div key={e.id} className={`check-item ${form.equiposIds.includes(e.id) ? 'selected' : ''}`} onClick={() => toggleEquipo(e.id)}>
                  <input type="checkbox" checked={form.equiposIds.includes(e.id)} onChange={() => { }} style={{ pointerEvents: 'none', accentColor: 'var(--brand)' }} />
                  {e.nombre}
                </div>
              ))}
            </div>
          </div>

          {/* Mensaje de validación visible y persistente */}
          {validMsg && (
            <div style={{
              marginTop: 10, padding: '10px 14px',
              background: validMsg.startsWith('❌') ? '#fee2e2' : '#fef9c3',
              color: validMsg.startsWith('❌') ? '#991b1b' : '#854d0e',
              borderRadius: 8, fontSize: 13, fontWeight: 600,
            }}>
              {validMsg}
            </div>
          )}

          <div className="calc-box" style={{ marginTop: 12 }}>
            <div className="calc-row"><span>Precio base</span><span>{fmt(base)}</span></div>
            <div className="calc-row"><span>Descuento {form.descuento_porcentaje}%</span><span>-{fmt(dcto)}</span></div>
            <div className="calc-total"><span>Precio combo / día</span><span>{fmt(final)}</span></div>
          </div>
        </Modal>
      )}
    </div>
  )
}
