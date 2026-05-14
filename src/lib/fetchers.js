/**
 * fetchers.js — Todas las queries a Supabase centralizadas aquí.
 * Cada función retorna los datos directamente (no el objeto {data, error} de Supabase).
 * Los componentes llaman a estas funciones vía useQuery() del cache.
 */

import { supabase } from './supabase'

export async function fetchEquipos() {
  const { data, error } = await supabase
    .from('equipos')
    .select('*')
    .order('nombre')
  if (error) throw error
  return data || []
}

export async function fetchArriendos() {
  const { data, error } = await supabase
    .from('arriendos')
    .select('*, clientes(nombre)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function fetchArriendosActivos() {
  const { data, error } = await supabase
    .from('arriendos')
    .select('*, clientes(nombre)')
    .eq('estado', 'activo')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function fetchClientes() {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .order('nombre')
  if (error) throw error
  return data || []
}

export async function fetchCombos() {
  const { data, error } = await supabase
    .from('combos')
    .select('*, combo_equipos(equipo_id, equipos(id, nombre, precio_dia))')
    .order('nombre')
  if (error) throw error
  return data || []
}

export async function fetchUsuariosPendientes() {
  const { data, error } = await supabase
    .from('usuarios')
    .select('id')
    .eq('estado', 'pendiente')
  if (error) throw error
  return data || []
}

export async function fetchEquiposBasic() {
  const { data, error } = await supabase
    .from('equipos')
    .select('id, nombre, precio_dia, stock, rentados')
    .order('nombre')
  if (error) throw error
  return data || []
}
