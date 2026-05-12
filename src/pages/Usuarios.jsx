import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'
import { toast } from '../components/Toast'

const ROLES = { admin: 'Administrador', operador: 'Operador', readonly: 'Solo lectura', pendiente: 'Pendiente', rechazado: 'Rechazado' }
const initials = n => n?.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase() || '?'
const COLORS = ['#27A04A', '#1A6FC4', '#D4A000', '#C44B1A', '#7B5CF4', '#D4537E']

export default function Usuarios() {
  const { usuario } = useAuth()
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalInvitar, setModalInvitar] = useState(false)
  const [modalRol, setModalRol] = useState(null)
  const [invForm, setInvForm] = useState({ email: '', nombre: '', rol: 'operador' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('usuarios').select('*').order('created_at')
    setUsuarios(data || [])
    setLoading(false)
  }

  async function aprobar(u) {
    await supabase.from('usuarios').update({ estado: 'activo', rol: 'operador' }).eq('id', u.id)
    toast(`${u.nombre} aprobado como Operador`)
    load()
  }

  async function rechazar(u) {
    await supabase.from('usuarios').update({ estado: 'rechazado', rol: 'rechazado' }).eq('id', u.id)
    toast('Solicitud rechazada')
    load()
  }

  async function cambiarRol(u, nuevoRol) {
    await supabase.from('usuarios').update({ rol: nuevoRol }).eq('id', u.id)
    toast('Rol actualizado')
    setModalRol(null)
    load()
  }

  async function desactivar(u) {
    if (!confirm(`¿Desactivar a ${u.nombre}?`)) return
    await supabase.from('usuarios').update({ estado: 'rechazado' }).eq('id', u.id)
    toast('Usuario desactivado')
    load()
  }

  async function reactivar(u) {
    await supabase.from('usuarios').update({ estado: 'activo', rol: 'operador' }).eq('id', u.id)
    toast('Usuario reactivado')
    load()
  }

  async function invitar() {
    if (!invForm.email) { toast('Email es obligatorio'); return }
    if (usuarios.find(u => u.email === invForm.email)) { toast('Este email ya está registrado'); return }
    setSaving(true)
    await supabase.from('usuarios').insert({
      email: invForm.email,
      nombre: invForm.nombre || invForm.email.split('@')[0],
      rol: invForm.rol,
      estado: 'activo',
    })
    toast('Usuario invitado')
    setSaving(false)
    setModalInvitar(false)
    setInvForm({ email: '', nombre: '', rol: 'operador' })
    load()
  }

  const pendientes = usuarios.filter(u => u.estado === 'pendiente')
  const activos = usuarios.filter(u => u.estado === 'activo')
  const rechazados = usuarios.filter(u => u.estado === 'rechazado')

  const UserRow = ({ u, i, actions }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '.5px solid var(--border)' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', background: COLORS[i % COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11, color: '#fff', flexShrink: 0 }}>
        {initials(u.nombre)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{u.nombre} {u.id === usuario?.id && <span style={{ fontSize: 10, color: 'var(--text3)' }}>(tú)</span>}</div>
        <div style={{ fontSize: 11, color: 'var(--text3)' }}>{u.email}</div>
      </div>
      <span className={`badge ${u.rol === 'admin' ? 'b-admin' : u.rol === 'operador' ? 'b-op' : u.rol === 'pendiente' ? 'b-pending' : u.rol === 'rechazado' ? 'b-rejected' : 'b-readonly'}`}>
        {ROLES[u.rol] || u.rol}
      </span>
      <div style={{ display: 'flex', gap: 6, marginLeft: 8 }}>{actions}</div>
    </div>
  )

  const SectionHead = ({ label, count, color = 'var(--text3)', bg = 'var(--surface2)' }) => (
    <div style={{ padding: '8px 16px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color, background: bg, borderBottom: '.5px solid var(--border)' }}>
      {label} ({count})
    </div>
  )

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <PageHeader title="Usuarios" actions={
        <button className="btn btn-primary" onClick={() => setModalInvitar(true)}><i className="ti ti-user-plus" /> Invitar usuario</button>
      } />
      <div style={{ flex: 1, overflow: 'auto', padding: '20px 22px' }}>
        <div className="tcard">
          {loading ? <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" /></div> : <>

            {pendientes.length > 0 && <>
              <SectionHead label="Pendientes de aprobación" count={pendientes.length} color="var(--amber)" bg="var(--amber-bg)" />
              {pendientes.map((u, i) => (
                <UserRow key={u.id} u={u} i={i} actions={<>
                  <button className="btn btn-primary btn-sm" onClick={() => aprobar(u)}><i className="ti ti-check" /> Aprobar</button>
                  <button className="btn btn-danger btn-sm" onClick={() => rechazar(u)}><i className="ti ti-x" /> Rechazar</button>
                </>} />
              ))}
            </>}

            {activos.length > 0 && <>
              <SectionHead label="Usuarios activos" count={activos.length} />
              {activos.map((u, i) => (
                <UserRow key={u.id} u={u} i={i} actions={
                  u.id !== usuario?.id ? <>
                    <button className="btn btn-sm" onClick={() => setModalRol(u)}><i className="ti ti-edit" /> Rol</button>
                    <button className="btn btn-danger btn-sm btn-icon" onClick={() => desactivar(u)}><i className="ti ti-user-off" /></button>
                  </> : null
                } />
              ))}
            </>}

            {rechazados.length > 0 && <>
              <SectionHead label="Desactivados / rechazados" count={rechazados.length} />
              {rechazados.map((u, i) => (
                <UserRow key={u.id} u={u} i={i} actions={
                  <button className="btn btn-sm" onClick={() => reactivar(u)}><i className="ti ti-rotate-clockwise" /> Reactivar</button>
                } />
              ))}
            </>}

            {usuarios.length === 0 && <div className="empty-state">Sin usuarios registrados</div>}
          </>}
        </div>
      </div>

      {modalInvitar && (
        <Modal title={<><i className="ti ti-user-plus" /> Invitar usuario</>} onClose={() => setModalInvitar(false)} width={400}
          actions={<>
            <button className="btn" onClick={() => setModalInvitar(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={invitar} disabled={saving}>
              {saving ? <div className="spinner" /> : <><i className="ti ti-send" /> Invitar</>}
            </button>
          </>}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="fg"><label>Email Google *</label><input type="email" value={invForm.email} onChange={e => setInvForm(p => ({ ...p, email: e.target.value }))} placeholder="usuario@gmail.com" /></div>
            <div className="fg"><label>Nombre</label><input value={invForm.nombre} onChange={e => setInvForm(p => ({ ...p, nombre: e.target.value }))} placeholder="Nombre del usuario" /></div>
            <div className="fg">
              <label>Rol *</label>
              <select value={invForm.rol} onChange={e => setInvForm(p => ({ ...p, rol: e.target.value }))}>
                <option value="operador">Operador — puede gestionar arriendos</option>
                <option value="readonly">Solo lectura — solo puede ver</option>
                <option value="admin">Administrador — acceso total</option>
              </select>
            </div>
          </div>
        </Modal>
      )}

      {modalRol && (
        <Modal title={<><i className="ti ti-edit" /> Cambiar rol</>} onClose={() => setModalRol(null)} width={380}
          actions={<>
            <button className="btn" onClick={() => setModalRol(null)}>Cancelar</button>
            <button className="btn btn-primary" onClick={() => cambiarRol(modalRol, document.getElementById('nuevo-rol').value)}>
              <i className="ti ti-check" /> Guardar
            </button>
          </>}
        >
          <div className="fg">
            <label>Nuevo rol para <strong>{modalRol.nombre}</strong></label>
            <select id="nuevo-rol" defaultValue={modalRol.rol}>
              <option value="admin">Administrador</option>
              <option value="operador">Operador</option>
              <option value="readonly">Solo lectura</option>
            </select>
          </div>
        </Modal>
      )}
    </div>
  )
}
