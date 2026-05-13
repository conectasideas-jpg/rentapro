export default function PageHeader({ title, actions }) {
  return (
    <div className="page-header">
      <div className="page-header-title">{title}</div>
      <div className="page-header-actions">{actions}</div>
    </div>
  )
}
