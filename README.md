# RentaPro 🏗️
**Sistema de gestión de arriendos de maquinaria para construcción**

Stack: React + Vite · Supabase · Netlify

---

## ⚡ Pasos para levantar (30 minutos)

---

### PASO 1 — Supabase (base de datos + login Google)

1. Ve a **https://supabase.com** → "Start for free" → crea cuenta
2. Crea un nuevo proyecto (elige región **South America - São Paulo**)
3. Espera que cargue (~2 min)
4. En el menú izquierdo ve a **SQL Editor**
5. Pega el contenido de `supabase_schema.sql` y haz clic en **Run**
6. Ve a **Authentication → Providers → Google** y actívalo
7. Necesitarás un **Client ID y Secret de Google** (ver Paso 1b)

#### PASO 1b — Google OAuth (credenciales)

1. Ve a **https://console.cloud.google.com**
2. Crea un proyecto nuevo (o usa uno existente)
3. Ve a **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
4. Tipo: **Web application**
5. En "Authorized redirect URIs" agrega:
   ```
   https://xxxxxx.supabase.co/auth/v1/callback
   ```
   (reemplaza `xxxxxx` con tu Project ID de Supabase)
6. Copia el **Client ID** y **Client Secret**
7. Vuelve a Supabase → Authentication → Providers → Google y pégalos

#### PASO 1c — URL del proyecto

En Supabase ve a **Settings → API** y copia:
- `Project URL` → es tu `VITE_SUPABASE_URL`
- `anon public key` → es tu `VITE_SUPABASE_ANON_KEY`

---

### PASO 2 — Configurar el proyecto local

1. Descomprime el archivo descargado
2. Copia el archivo de variables de entorno:
   ```bash
   cp .env.example .env
   ```
3. Edita `.env` con tus datos de Supabase:
   ```
   VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGci...
   ```
4. Instala dependencias y corre en modo desarrollo:
   ```bash
   npm install
   npm run dev
   ```
5. Abre **http://localhost:5173**

---

### PASO 3 — Hacerte Admin (¡importante!)

1. Entra a la app con tu cuenta de Google
2. Verás la pantalla "Acceso pendiente" — esto es normal
3. Ve a Supabase → **SQL Editor** y ejecuta:
   ```sql
   UPDATE public.usuarios
   SET rol = 'admin', estado = 'activo'
   WHERE email = 'TU_EMAIL@gmail.com';
   ```
4. Vuelve a la app y haz clic en "Verificar acceso" (o recarga)
5. ¡Listo! Ya tienes acceso total

---

### PASO 4 — Subir a GitHub

```bash
# Dentro de la carpeta del proyecto:
git init
git add .
git commit -m "RentaPro v1.0"

# En github.com crea un repositorio nuevo (sin README)
git remote add origin https://github.com/TU_USUARIO/rentapro.git
git branch -M main
git push -u origin main
```

---

### PASO 5 — Desplegar en Netlify (gratis)

1. Ve a **https://netlify.com** → Sign up (gratis)
2. "Add new site" → "Import an existing project" → GitHub
3. Selecciona tu repositorio `rentapro`
4. Configuración de build:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
5. Antes de hacer deploy, ve a **Site settings → Environment variables** y agrega:
   ```
   VITE_SUPABASE_URL = https://xxxxxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY = eyJhbGci...
   ```
6. Haz clic en **Deploy site**
7. Netlify te dará una URL como `https://rentapro-abc123.netlify.app`

#### Agregar dominio personalizado (opcional)
En Netlify → Domain settings → Add custom domain

---

### PASO 5b — Actualizar Supabase con tu URL de Netlify

1. En Supabase → **Authentication → URL Configuration**
2. Agrega tu URL de Netlify en **Redirect URLs**:
   ```
   https://rentapro-abc123.netlify.app
   ```
3. En Google Cloud Console actualiza los **Authorized redirect URIs** también

---

## 📁 Estructura del proyecto

```
rentapro/
├── src/
│   ├── components/
│   │   ├── Layout.jsx        # Sidebar + navegación
│   │   ├── Modal.jsx         # Modal reutilizable
│   │   ├── PageHeader.jsx    # Header de cada página
│   │   └── Toast.jsx         # Notificaciones
│   ├── hooks/
│   │   └── useAuth.jsx       # Autenticación + roles
│   ├── lib/
│   │   └── supabase.js       # Cliente Supabase
│   ├── pages/
│   │   ├── Login.jsx         # Pantalla de login
│   │   ├── Pending.jsx       # Usuario pendiente/rechazado
│   │   ├── Dashboard.jsx     # Panel principal
│   │   ├── Arriendos.jsx     # Gestión de arriendos
│   │   ├── Equipos.jsx       # Catálogo de equipos
│   │   ├── Clientes.jsx      # Base de clientes
│   │   ├── Combos.jsx        # Combos con descuento
│   │   └── Usuarios.jsx      # Admin de usuarios
│   ├── styles/
│   │   └── global.css
│   ├── App.jsx
│   └── main.jsx
├── supabase_schema.sql        # ← Ejecutar en Supabase
├── .env.example               # ← Copiar a .env
├── netlify.toml               # Configuración Netlify
└── package.json
```

---

## 🔐 Roles de usuario

| Rol | Dashboard | Arriendos | Clientes | Equipos | Combos | Usuarios |
|-----|-----------|-----------|----------|---------|--------|----------|
| **Admin** | ✅ | ✅ editar | ✅ editar | ✅ editar | ✅ editar | ✅ gestionar |
| **Operador** | ✅ | ✅ crear | ✅ crear | 👁️ ver | 👁️ ver | ❌ |
| **Solo lectura** | ✅ | 👁️ ver | 👁️ ver | 👁️ ver | 👁️ ver | ❌ |

---

## 🆘 Soporte

Si algo no funciona, revisa:
1. Que el `.env` tenga las keys correctas de Supabase
2. Que ejecutaste el SQL completo en Supabase
3. Que agregaste la URL de callback correcta en Google OAuth
