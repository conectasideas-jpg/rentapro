-- =============================================
-- RENTAPRO — Schema SQL para Supabase
-- Ejecutar en Supabase > SQL Editor
-- =============================================

-- USUARIOS (lista blanca + roles)
create table public.usuarios (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  nombre text,
  rol text not null default 'pendiente', -- 'admin' | 'operador' | 'readonly' | 'pendiente' | 'rechazado'
  estado text not null default 'pendiente', -- 'activo' | 'pendiente' | 'rechazado'
  avatar_url text,
  created_at timestamptz default now()
);

-- EQUIPOS
create table public.equipos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  especificacion text,
  precio_dia numeric not null default 0,
  stock integer not null default 1,
  rentados integer not null default 0,
  costo_compra numeric default 0,
  costo_operacional_dia numeric default 0,
  created_at timestamptz default now()
);

-- COMBOS
create table public.combos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  descuento_porcentaje numeric not null default 0,
  created_at timestamptz default now()
);

-- COMBO_EQUIPOS (relación muchos a muchos)
create table public.combo_equipos (
  combo_id uuid references public.combos(id) on delete cascade,
  equipo_id uuid references public.equipos(id) on delete cascade,
  primary key (combo_id, equipo_id)
);

-- CLIENTES
create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  telefono text,
  rut text,
  comuna text,
  direccion text,
  n_arriendos integer default 0,
  total_pagado numeric default 0,
  created_at timestamptz default now()
);

-- ARRIENDOS
create table public.arriendos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.clientes(id),
  tipo text not null default 'equipo', -- 'equipo' | 'combo'
  equipo_id uuid references public.equipos(id),
  combo_id uuid references public.combos(id),
  nombre_item text not null,
  fecha_inicio date not null,
  fecha_fin date not null,
  dias integer not null,
  precio_dia numeric not null,
  total numeric not null,
  notas text,
  estado text not null default 'activo', -- 'activo' | 'devuelto'
  creado_por uuid references public.usuarios(id),
  created_at timestamptz default now()
);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

alter table public.usuarios enable row level security;
alter table public.equipos enable row level security;
alter table public.combos enable row level security;
alter table public.combo_equipos enable row level security;
alter table public.clientes enable row level security;
alter table public.arriendos enable row level security;

-- Función helper para obtener rol del usuario autenticado
create or replace function public.get_my_rol()
returns text as $$
  select rol from public.usuarios where email = auth.jwt()->>'email';
$$ language sql security definer;

-- USUARIOS: cualquier autenticado puede leer su propio registro;
--           solo admin lee todos
create policy "usuarios_select" on public.usuarios
  for select using (
    auth.jwt()->>'email' = email
    or public.get_my_rol() = 'admin'
  );

create policy "usuarios_insert" on public.usuarios
  for insert with check (true); -- El trigger lo maneja

create policy "usuarios_update" on public.usuarios
  for update using (public.get_my_rol() = 'admin');

-- EQUIPOS: todos los activos pueden leer
create policy "equipos_select" on public.equipos
  for select using (public.get_my_rol() in ('admin','operador','readonly'));

create policy "equipos_insert" on public.equipos
  for insert with check (public.get_my_rol() = 'admin');

create policy "equipos_update" on public.equipos
  for update using (public.get_my_rol() = 'admin');

create policy "equipos_delete" on public.equipos
  for delete using (public.get_my_rol() = 'admin');

-- COMBOS
create policy "combos_select" on public.combos
  for select using (public.get_my_rol() in ('admin','operador','readonly'));

create policy "combos_insert" on public.combos
  for insert with check (public.get_my_rol() = 'admin');

create policy "combos_update" on public.combos
  for update using (public.get_my_rol() = 'admin');

create policy "combos_delete" on public.combos
  for delete using (public.get_my_rol() = 'admin');

-- COMBO_EQUIPOS
create policy "combo_equipos_select" on public.combo_equipos
  for select using (public.get_my_rol() in ('admin','operador','readonly'));

create policy "combo_equipos_all" on public.combo_equipos
  for all using (public.get_my_rol() = 'admin');

-- CLIENTES
create policy "clientes_select" on public.clientes
  for select using (public.get_my_rol() in ('admin','operador','readonly'));

create policy "clientes_insert" on public.clientes
  for insert with check (public.get_my_rol() in ('admin','operador'));

create policy "clientes_update" on public.clientes
  for update using (public.get_my_rol() in ('admin','operador'));

create policy "clientes_delete" on public.clientes
  for delete using (public.get_my_rol() = 'admin');

-- ARRIENDOS
create policy "arriendos_select" on public.arriendos
  for select using (public.get_my_rol() in ('admin','operador','readonly'));

create policy "arriendos_insert" on public.arriendos
  for insert with check (public.get_my_rol() in ('admin','operador'));

create policy "arriendos_update" on public.arriendos
  for update using (public.get_my_rol() in ('admin','operador'));

create policy "arriendos_delete" on public.arriendos
  for delete using (public.get_my_rol() = 'admin');

-- =============================================
-- TRIGGER: auto-registrar usuario al hacer login
-- =============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.usuarios (email, nombre, avatar_url, rol, estado)
  values (
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'avatar_url',
    'pendiente',
    'pendiente'
  )
  on conflict (email) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =============================================
-- DATOS INICIALES (equipos demo)
-- =============================================
insert into public.equipos (nombre, especificacion, precio_dia, stock, costo_compra, costo_operacional_dia) values
  ('Betonera', '130 litros', 8000, 2, 450000, 500),
  ('Vibrador de Hormigón', 'Eléctrico', 5000, 1, 180000, 200),
  ('Placa Compactadora', '90 kg', 9000, 1, 520000, 600),
  ('Motobomba de Agua', '2 pulgadas', 7000, 1, 280000, 400),
  ('Generador', '3600W', 10000, 2, 620000, 700),
  ('Andamios', 'Set completo', 6000, 3, 380000, 300);

-- =============================================
-- PRIMER ADMIN: reemplaza con tu email de Google
-- =============================================
-- Ejecuta esto DESPUÉS de hacer tu primer login:
--
-- update public.usuarios
-- set rol = 'admin', estado = 'activo'
-- where email = 'TU_EMAIL@gmail.com';
