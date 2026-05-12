import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import Login from './pages/Login'
import Pending from './pages/Pending'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Arriendos from './pages/Arriendos'
import Equipos from './pages/Equipos'
import Clientes from './pages/Clientes'
import Combos from './pages/Combos'
import Usuarios from './pages/Usuarios'

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
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/arriendos" element={<Arriendos />} />
        <Route path="/equipos" element={<Equipos />} />
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/combos" element={<Combos />} />
        <Route path="/usuarios" element={<Usuarios />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
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
