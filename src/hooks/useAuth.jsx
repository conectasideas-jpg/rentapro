import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [usuario, setUsuario] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchUsuario(session.user.email)
      else setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchUsuario(session.user.email)
      else { setUsuario(null); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function fetchUsuario(email) {
    setLoading(true)
    const { data } = await supabase.from('usuarios').select('*').eq('email', email).single()
    setUsuario(data)
    setLoading(false)
  }

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    })
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUsuario(null)
  }

  const can = (perm) => {
    if (!usuario) return false
    if (usuario.rol === 'admin') return true
    if (usuario.rol === 'operador') return ['arriendos', 'clientes', 'devolucion'].includes(perm)
    return false
  }

  return (
    <AuthContext.Provider value={{ session, usuario, loading, signInWithGoogle, signOut, can, refetchUsuario: () => fetchUsuario(session?.user?.email) }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
