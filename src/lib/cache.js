/**
 * cache.js — Mini caché en memoria que imita lo esencial de React Query.
 * Sin dependencias externas. Funciona con cualquier función async que retorne datos.
 *
 * USO:
 *   import { useQuery, invalidate } from '../lib/cache'
 *   const { data, loading, error } = useQuery('equipos', fetchEquipos)
 *   invalidate('equipos')  // después de crear/editar/eliminar
 */

import { useState, useEffect, useRef } from 'react'

// Almacén global en memoria (sobrevive entre navegaciones de la misma sesión)
const store = new Map()      // key → { data, ts, promise }
const listeners = new Map()  // key → Set<setState>

const TTL_MS = 60_000 // 1 minuto de caché fresco

function notify(key) {
  const subs = listeners.get(key)
  if (subs) subs.forEach(fn => fn(v => v + 1))
}

/** Invalida una clave y notifica a todos los componentes suscritos para que recarguen. */
export function invalidate(key) {
  store.delete(key)
  notify(key)
}

/** Invalida múltiples claves de una vez. */
export function invalidateMany(...keys) {
  keys.forEach(invalidate)
}

/**
 * Hook principal. Equivalente básico a useQuery de React Query.
 *
 * @param {string}   key      Identificador único (ej: 'equipos', 'arriendos')
 * @param {Function} fetcher  Función async que retorna los datos
 * @param {Object}   opts     { enabled: boolean }  — para queries condicionales
 */
export function useQuery(key, fetcher, opts = {}) {
  const { enabled = true } = opts
  const [, forceRender] = useState(0)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  // Suscribirse a invalidaciones
  useEffect(() => {
    if (!enabled) return
    if (!listeners.has(key)) listeners.set(key, new Set())
    listeners.get(key).add(forceRender)
    return () => listeners.get(key)?.delete(forceRender)
  }, [key, enabled])

  // Disparar fetch si no hay caché fresco
  useEffect(() => {
    if (!enabled) return
    const cached = store.get(key)
    const isFresh = cached && !cached.error && (Date.now() - cached.ts < TTL_MS)
    if (isFresh || cached?.promise) return

    const promise = fetcher().then(data => {
      if (!mountedRef.current) return
      store.set(key, { data, ts: Date.now(), promise: null, error: null })
      notify(key)
    }).catch(error => {
      if (!mountedRef.current) return
      store.set(key, { data: null, ts: Date.now(), promise: null, error })
      notify(key)
    })

    store.set(key, { ...(store.get(key) || {}), promise, error: null })
  }, [key, enabled, forceRender]) // forceRender cambia cuando invalidate() llama notify()

  const cached = store.get(key)

  return {
    data:    cached?.data ?? null,
    loading: !cached || !!cached.promise,
    error:   cached?.error ?? null,
    // Permite refetch manual sin invalidar el caché de otras páginas
    refetch: () => invalidate(key),
  }
}
