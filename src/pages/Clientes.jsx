/**
 * Clientes.jsx — OPTIMIZADO
 * 1. useQuery('clientes') → caché compartido con Arriendos y Dashboard
 * 2. SkeletonTableRows → reemplaza spinner vacío
 * 3. invalidateMany → invalida clientes en todas las páginas que lo usan
 */
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useQuery, invalidateMany } from '../lib/cache'
import { fetchClientes } from '../lib/fetchers'
import { useAuth } from '../hooks/useAuth'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'
import { toast } from '../components/Toast'
import { SkeletonTableRows } from '../components/Skeleton'

const fmt = n => '$' + Math.round(n || 0).toLocaleString('es-CL')
const EMPTY = { nombre: '', telefono: '', rut: '', comuna: '', direccion: '' }

export default function Clientes() {
  const { usuario, can } = useAuth()
  const isAdmin = usuario?.rol === 'admin'
  const { data: clientes = [], loading } = useQuery('clientes', fetchClientes)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  function openNew() { setForm(EMPTY); setModal(true) }
  function openEdit(c) { setForm(c); setModal(true) }

  async function save() {
    if (!form.nombre) { toast('El nombre es obligatorio'); return }
    setSaving(true)
    try {
      const payload = { nombre: form.nombre, telefono: form.telefono, rut: form.rut, comuna: form.comuna, direccion: form.direccion }
      if (form.id) {
        const { error } = await supabase.from('clientes').update(payload).eq('id', form.id)
        if (error) throw new Error(error.message)
        toast('Cliente actualizado ✓')
      } else {
        const { error } = await supabase.from('clientes').insert({ ...payload, n_arriendos: 0, total_pagado: 0 })
        if (error) throw new Error(error.message)
        toast('Cliente guardado ✓')
      }
      setModal(false)
      invalidateMany('clientes')
    } catch (err) {
      console.error('[Clientes.save]', err)
      toast('Error: ' + (err.message || 'No se pudo guardar'))
    } finally {
      setSaving(false)
    }
  }

  async function eliminar(id, nombre) {
    if (!confirm(`¿Eliminar al cliente "${nombre}"?`)) return
    await supabase.from('clientes').delete().eq('id', id)
    toast('Cliente eliminado')
    invalidateMany('clientes')
  }

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <PageHeader title="Clientes" count={loading ? null : clientes.length}
        actions={can('clientes') && <button className="btn btn-primary" onClick={openNew}><i className="ti ti-plus" /> Nuevo cliente</button>}
      />
      <div style={{ flex: 1, overflow: 'auto', padding: '20px 22px' }}>
        <div className="tcard">
          <table>
            <thead><tr>
              <th style={{ width: '22%' }}>Nombre</th>
              <th style={{ width: '15%' }}>Teléfono</th>
              <th style={{ width: '13%' }}>RUT</th>
              <th style={{ width: '15%' }}>Comuna</th>
              <th style={{ width: '10%' }}>Arriendos</th>
              <th style={{ width: '14%' }}>Total pagado</th>
              <th style={{ width: '11%' }}>Acciones</th>
            </tr></thead>
            {loading ? (
              <SkeletonTableRows rows={5} cols={7} />
            ) : (
              <tbody>
                {clientes.length === 0 ? (
                  <tr><td colSpan={7}>
                    <div className="empty-state"><i className="ti ti-user-x" style={{ fontSize: 36, display: 'block', marginBottom: 8 }} />Sin clientes registrados</div>
                  </td></tr>
                ) : clientes.map(c => (
                  <tr key={c.id}>
                    <td><strong>{c.nombre}</strong></td>
                    <td>{c.telefono || '—'}</td>
                    <td>{c.rut || '—'}</td>
                    <td>{c.comuna || '—'}</td>
                    <td style={{ textAlign: 'center' }}>{c.n_arriendos || 0}</td>
                    <td style={{ fontWeight: 700, color: 'var(--brand)' }}>{fmt(c.total_pagado)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {can('clientes') && <button className="btn btn-sm btn-icon" onClick={() => openEdit(c)}><i className="ti ti-edit" /></button>}
                        {isAdmin && <button className="btn btn-sm btn-icon btn-danger" onClick={() => eliminar(c.id, c.nombre)}><i className="ti ti-trash" /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>
      </div>

      {modal && (
        <Modal
          title={<><i className="ti ti-user-plus" /> {form.id ? 'Editar' : 'Nuevo'} cliente</>}
          onClose={() => setModal(false)}
          actions={<>
            <button className="btn" onClick={() => setModal(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? <div className="spinner" /> : <><i className="ti ti-check" /> Guardar</>}
            </button>
          </>}
        >
          <div className="form-grid">
            <div className="fg"><label>Nombre *</label><input value={form.nombre} onChange={e => f('nombre', e.target.value)} placeholder="Juan Pérez" /></div>
            <div className="fg"><label>Teléfono</label><input value={form.telefono} onChange={e => f('telefono', e.target.value)} placeholder="+56 9 3406 7991" /></div>
            <div className="fg"><label>RUT</label><input value={form.rut} onChange={e => f('rut', e.target.value)} placeholder="12.345.678-9" /></div>
            <div className="fg"><label>Comuna</label><input value={form.comuna} onChange={e => f('comuna', e.target.value)} placeholder="Lanco, Malalhue..." /></div>
            <div className="fg full"><label>Dirección</label><input value={form.direccion} onChange={e => f('direccion', e.target.value)} placeholder="Calle y número" /></div>
          </div>
        </Modal>
      )}
    </div>
  )
}
