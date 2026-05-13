export default function PageHeader({ title, actions, count }) {
  return (
    <div className="page-header">
      <div className="page-header-left">
        <h1 className="page-header-title">{title}</h1>
        {count !== undefined && count !== null && (
          <span className="page-header-count">{count}</span>
        )}
      </div>
      {actions && (
        <div className="page-header-actions">{actions}</div>
      )}
    </div>
  )
}
