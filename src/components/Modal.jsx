export default function Modal({ id, title, children, actions, onClose, width = 520 }) {
  return (
    <div className="overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width, maxWidth: '96vw' }}>
        <div className="modal-title">
          <span>{title}</span>
          <button className="btn btn-sm" onClick={onClose}><i className="ti ti-x" /></button>
        </div>
        {children}
        {actions && <div className="modal-actions">{actions}</div>}
      </div>
    </div>
  )
}
