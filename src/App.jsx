/**
 * App.jsx — OPTIMIZADO
 * 1. lazy() + Suspense → code splitting automático (bundle ~150KB vs 1.1MB)
 * 2. Cada página carga su chunk solo cuando el usuario la navega
 */
import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import Login from './pages/Login'
import Pending from './pages/Pending'
import Layout from './components/Layout'

// ─── Lazy imports — genera un chunk por página en el build ───
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Arriendos  = lazy(() => import('./pages/Arriendos'))
const Equipos    = lazy(() => import('./pages/Equipos'))
const Clientes   = lazy(() => import('./pages/Clientes'))
const Combos     = lazy(() => import('./pages/Combos'))
const Usuarios   = lazy(() => import('./pages/Usuarios'))
const Reportes   = lazy(() => import('./pages/Reportes'))

function PageSpinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flex: 1 }}>
      <div className="spinner" style={{ width: 28, height: 28 }} />
    </div>
  )
}

function AppRoutes() {
  const { session, usuario, loading } = useAuth()

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div className="spinner" style={{ width: 36, height: 36 }} />
    </div>
  )

  if (!session) return <Login />

  if (!usuario || usuario.estado === 'pendiente' || usuario.estado === 'rechazado') {
    return <Pending />
  }

  return (
    <Layout>
      <Suspense fallback={<PageSpinner />}>
        <Routes>
          <Route path="/"          element={<Dashboard />} />
          <Route path="/arriendos" element={<Arriendos />} />
          <Route path="/equipos"   element={<Equipos />} />
          <Route path="/clientes"  element={<Clientes />} />
          <Route path="/combos"    element={<Combos />} />
          <Route path="/reportes"  element={<Reportes />} />
          <Route path="/usuarios"  element={<Usuarios />} />
          <Route path="*"          element={<Navigate to="/" />} />
        </Routes>
      </Suspense>
    </Layout>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
