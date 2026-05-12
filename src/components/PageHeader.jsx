export default function PageHeader({ title, actions }) {
  return (
    <div style={{
      background: 'var(--surface)', borderBottom: '1px solid var(--border)',
      padding: '12px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
    }}>
      <div style={{ fontSize: 17, fontWeight: 700 }}>{title}</div>
      <div style={{ display: 'flex', gap: 8 }}>{actions}</div>
    </div>
  )
}
