import { useState, useCallback } from 'react'

let _setToast = null

export function ToastProvider() {
  const [toast, setToast] = useState(null)
  _setToast = setToast

  if (!toast) return null
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24,
      background: 'var(--text)', color: '#fff',
      padding: '10px 16px', borderRadius: 'var(--radius)',
      fontSize: 12, fontWeight: 600, zIndex: 999,
      animation: 'fadeInUp .2s ease'
    }}>
      {toast}
    </div>
  )
}

export function toast(msg, duration = 2500) {
  if (_setToast) {
    _setToast(msg)
    setTimeout(() => _setToast(null), duration)
  }
}
