/**
 * Skeleton.jsx — Componentes de placeholder animado.
 * Reemplazan el spinner vacío con una vista previa del layout real,
 * reduciendo la percepción de carga (aunque el tiempo real sea el mismo).
 */

/** Bloque genérico de skeleton con animación shimmer */
function SkeletonBlock({ width = '100%', height = 16, borderRadius = 6, style = {} }) {
  return (
    <div style={{
      width,
      height,
      borderRadius,
      background: 'var(--surface3)',
      overflow: 'hidden',
      position: 'relative',
      ...style,
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(90deg, transparent 0%, var(--surface) 50%, transparent 100%)',
        animation: 'sk-shimmer 1.4s infinite',
      }} />
    </div>
  )
}

/** Skeleton para las tarjetas de estadísticas (4 mini-cards en la parte superior) */
export function SkeletonStatCards({ count = 4 }) {
  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{
          flex: '1 1 160px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '10px 16px',
          display: 'flex', alignItems: 'center', gap: 10,
          boxShadow: 'var(--shadow-sm)',
        }}>
          <SkeletonBlock width={32} height={32} borderRadius={8} />
          <div style={{ flex: 1 }}>
            <SkeletonBlock width="50%" height={20} style={{ marginBottom: 6 }} />
            <SkeletonBlock width="80%" height={10} />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Skeleton para la lista/grid de equipos */
export function SkeletonEquiposGrid({ count = 6 }) {
  return (
    <div className="eq-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: 16,
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <SkeletonBlock width={40} height={40} borderRadius={10} />
            <div style={{ flex: 1 }}>
              <SkeletonBlock width="70%" height={14} style={{ marginBottom: 6 }} />
              <SkeletonBlock width="50%" height={11} />
            </div>
          </div>
          <SkeletonBlock width="40%" height={22} style={{ marginBottom: 10 }} />
          <SkeletonBlock width="60%" height={14} />
        </div>
      ))}
    </div>
  )
}

/** Skeleton para filas de tabla */
export function SkeletonTableRows({ rows = 5, cols = 6 }) {
  return (
    <tbody>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i}>
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} style={{ padding: '10px 12px' }}>
              <SkeletonBlock
                width={j === 0 ? '80%' : j === cols - 1 ? '40%' : '65%'}
                height={13}
              />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  )
}

/** Skeleton para las stat cards del Dashboard (layout diferente — 4 columnas) */
export function SkeletonDashboardStats() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '14px 16px',
        }}>
          <SkeletonBlock width={24} height={18} style={{ marginBottom: 8 }} />
          <SkeletonBlock width="50%" height={28} style={{ marginBottom: 6 }} />
          <SkeletonBlock width="75%" height={11} />
        </div>
      ))}
    </div>
  )
}

/** Inyecta el keyframe de shimmer en el head (solo una vez) */
if (typeof document !== 'undefined') {
  if (!document.getElementById('sk-style')) {
    const s = document.createElement('style')
    s.id = 'sk-style'
    s.textContent = `
      @keyframes sk-shimmer {
        0%   { transform: translateX(-100%) }
        100% { transform: translateX(100%) }
      }
    `
    document.head.appendChild(s)
  }
}
