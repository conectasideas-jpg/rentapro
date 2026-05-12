import { useAuth } from '../hooks/useAuth'

export default function Pending() {
  const { usuario, signOut, refetchUsuario } = useAuth()
  const rechazado = usuario?.estado === 'rechazado'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: 'var(--bg)'
    }}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 20, padding: '44px 36px', textAlign: 'center',
        width: 420, maxWidth: '95vw'
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: rechazado ? 'var(--red-bg)' : 'var(--amber-bg)',
          border: `2px solid ${rechazado ? 'var(--red-border)' : 'var(--amber-border)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px', fontSize: 26
        }}>
          {rechazado ? '🚫' : '⏳'}
        </div>

        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, color: rechazado ? 'var(--red)' : 'var(--text)' }}>
          {rechazado ? 'Acceso denegado' : 'Acceso pendiente de aprobación'}
        </div>

        <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 16 }}>
          {rechazado
            ? 'Tu solicitud de acceso fue rechazada. Contacta al administrador si crees que es un error.'
            : 'Tu cuenta fue reconocida pero aún no tienes acceso. El administrador debe aprobarte.'
          }
        </p>

        <div style={{
          background: 'var(--surface2)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', padding: '8px 16px', fontSize: 13,
          fontWeight: 600, marginBottom: 20, display: 'inline-block'
        }}>
          {usuario?.email}
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          {!rechazado && (
            <button className="btn" onClick={refetchUsuario}>
              <i className="ti ti-refresh" /> Verificar acceso
            </button>
          )}
          <button className="btn btn-danger" onClick={signOut}>
            <i className="ti ti-logout" /> Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  )
}
