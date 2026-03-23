# SIAR Backend

Backend para el **Sistema de Aprovechamiento de Residuos (SIAR)** — API REST construida con Node.js, Express, PostgreSQL y Prisma ORM.

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Runtime | Node.js 18+ |
| Framework | Express 4 |
| ORM | Prisma 5 |
| Base de datos | PostgreSQL 15+ |
| Autenticación | JWT (jsonwebtoken) |
| Validación | Zod |
| Hash de passwords | bcryptjs |
| Logging | Morgan |

---

## Requisitos previos

- Node.js ≥ 18
- PostgreSQL ≥ 15 corriendo localmente (o conexión remota)
- npm ≥ 9

---

## Instalación

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con tu DATABASE_URL y JWT_SECRET

# 3. Crear la base de datos en PostgreSQL
# En psql:  CREATE DATABASE siar_db;

# 4. Aplicar el schema
npm run db:push

# 5. Sembrar datos de prueba
npm run db:seed

# 6. Iniciar en modo desarrollo
npm run dev
```

El servidor arranca en `http://localhost:3000`.

---

## Variables de entorno

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `DATABASE_URL` | Cadena de conexión PostgreSQL | `postgresql://user:pass@localhost:5432/siar_db` |
| `JWT_SECRET` | Secreto para firmar tokens de acceso | cadena aleatoria larga |
| `JWT_EXPIRES_IN` | Duración del access token | `8h` |
| `JWT_REFRESH_SECRET` | Secreto para refresh tokens | cadena aleatoria diferente |
| `JWT_REFRESH_EXPIRES_IN` | Duración del refresh token | `7d` |
| `PORT` | Puerto del servidor | `3000` |
| `NODE_ENV` | Entorno | `development` |
| `CORS_ORIGIN` | URL del frontend | `http://localhost:5173` |

---

## Scripts npm

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor con hot-reload (nodemon) |
| `npm start` | Servidor en producción |
| `npm run db:push` | Aplicar schema sin migraciones |
| `npm run db:migrate` | Crear y aplicar migración |
| `npm run db:seed` | Sembrar datos de prueba |
| `npm run db:studio` | Abrir Prisma Studio (GUI) |
| `npm run db:reset` | Resetear BD y volver a sembrar |

---

## Credenciales de prueba (seed)

| Rol | Email | Password |
|-----|-------|----------|
| `admin_asociacion` | admin@asociacion-bogota.co | Admin2024! |
| `operador_eca` | operador@eca-bogota.co | Operador2024! |
| `reciclador_oficio` | jluis@recicladores.co | Recicla2024! |
| `reciclador_oficio` | aperez@recicladores.co | Recicla2024! |

---

## Estructura del proyecto

```
siar-backend/
├── prisma/
│   ├── schema.prisma        # Modelos de BD
│   └── seed.js              # Datos de prueba
├── src/
│   ├── controllers/         # Lógica de negocio
│   │   ├── auth.controller.js
│   │   ├── dashboard.controller.js
│   │   ├── pesaje.controller.js
│   │   ├── recicladores.controller.js
│   │   ├── rutas.controller.js
│   │   ├── materiales.controller.js
│   │   ├── balance.controller.js
│   │   ├── sui.controller.js
│   │   └── pqr.controller.js
│   ├── routes/              # Definición de endpoints
│   ├── middleware/
│   │   ├── auth.middleware.js     # Verificación JWT
│   │   ├── roles.middleware.js    # Control de acceso por rol
│   │   └── validate.middleware.js # Validación Zod
│   ├── validators/          # Schemas Zod por módulo
│   ├── lib/
│   │   └── prisma.js        # Cliente Prisma singleton
│   └── index.js             # Entry point
├── .env.example
└── package.json
```

---

## API Reference

### Autenticación

```
POST   /api/auth/login       → { token, refreshToken, usuario }
POST   /api/auth/refresh     → { token }
POST   /api/auth/logout      → 200 OK
GET    /api/auth/me          → Usuario autenticado
```

**Login example:**
```json
POST /api/auth/login
{
  "email": "operador@eca-bogota.co",
  "password": "Operador2024!"
}
```

Incluir el token en requests protegidas:
```
Authorization: Bearer <token>
```

---

### Dashboard

```
GET /api/dashboard/kpis               → KPIs del mes actual
GET /api/dashboard/actividad-reciente → Últimos 10 pesajes
GET /api/dashboard/composicion        → Distribución kg por material (%)
GET /api/dashboard/tendencia-semanal  → Kg por semana (últimas 8 semanas)
```

---

### Pesaje

```
GET    /api/pesaje                → Lista paginada (query: fecha, recicladorId, rutaId, estado, page, limit)
GET    /api/pesaje/dia            → Pesajes de hoy + resumen
GET    /api/pesaje/:id            → Detalle de un pesaje
POST   /api/pesaje                → Crear pesaje (operador, admin)
PATCH  /api/pesaje/:id/estado     → Cambiar estado (operador, admin)
```

**Crear pesaje:**
```json
{
  "recicladorId": 1,
  "rutaId": 2,
  "horaEntrada": "2026-03-23T08:00:00",
  "materiales": [
    { "materialId": 1, "pesoNeto": 120.5, "rechazo": 5.0 }
  ]
}
```

---

### Recicladores

```
GET  /api/recicladores                       → Lista (query: rutaId, estado, q, page, limit)
GET  /api/recicladores/:id                   → Perfil completo + estadísticas mes
GET  /api/recicladores/:id/historial         → Historial de pesajes paginado
GET  /api/recicladores/:id/cuenta-cobro      → Cuenta de cobro (query: mes, anio)
POST /api/recicladores                       → Crear (operador, admin)
PUT  /api/recicladores/:id                   → Actualizar (operador, admin)
```

---

### Rutas

```
GET  /api/rutas               → Lista de rutas con kg del mes
GET  /api/rutas/cobertura     → Resumen: total rutas, barrios, recicladores, kg/mes
GET  /api/rutas/:id           → Detalle con recicladores asignados
POST /api/rutas               → Crear (solo admin)
PUT  /api/rutas/:id           → Actualizar (operador, admin)
```

---

### Materiales

```
GET  /api/materiales                    → Lista con precio vigente
GET  /api/materiales/compradores        → Compradores activos
GET  /api/materiales/:id                → Detalle + precios + compradores
GET  /api/materiales/:id/precios        → Historial de precios
POST /api/materiales                    → Crear material (solo admin)
POST /api/materiales/:id/precio         → Actualizar precio (operador, admin)
POST /api/materiales/compradores        → Agregar comprador (operador, admin)
```

---

### Balance de Masas

```
GET  /api/balance/:yyyymm               → Balance del mes (ej: 2026-02)
POST /api/balance/:yyyymm/recalcular    → Recalcular desde pesajes (operador, admin)
POST /api/balance/ajuste                → Ajuste manual (operador, admin)
```

**Ajuste manual:**
```json
{
  "materialId": 1,
  "anio": 2026,
  "mes": 3,
  "cantidad": 50.5,
  "tipo": "entrada",
  "motivo": "Corrección por error de pesaje del día 15"
}
```

---

### Reporte SUI

```
GET  /api/sui                    → Lista de reportes
GET  /api/sui/mes/:yyyymm        → Reporte por periodo
GET  /api/sui/:id                → Reporte por ID
GET  /api/sui/:id/xml            → Descarga XML para envío al SUI
POST /api/sui                    → Crear reporte (operador, admin)
PUT  /api/sui/:id                → Actualizar borrador (operador, admin)
POST /api/sui/:id/enviar         → Marcar como enviado (operador, admin)
```

---

### PQR

```
GET  /api/pqr                        → Lista paginada (query: estado, tipo, page, limit)
GET  /api/pqr/estadisticas           → Stats del mes: totales, tiempos, quejas
GET  /api/pqr/:radicado              → Detalle por radicado (ej: PQR-2026-0001)
POST /api/pqr                        → Crear PQR (cualquier rol)
POST /api/pqr/:radicado/responder    → Responder (operador, admin)
POST /api/pqr/:radicado/cerrar       → Cerrar (operador, admin)
```

---

## Roles y permisos

| Endpoint | reciclador_oficio | operador_eca | admin_asociacion |
|----------|:-----------------:|:------------:|:----------------:|
| Dashboard | ✅ | ✅ | ✅ |
| Pesaje (leer) | Solo propios | ✅ | ✅ |
| Pesaje (crear/editar) | ❌ | ✅ | ✅ |
| Recicladores (leer) | ✅ | ✅ | ✅ |
| Recicladores (crear/editar) | ❌ | ✅ | ✅ |
| Rutas (leer) | ✅ | ✅ | ✅ |
| Rutas (crear) | ❌ | ❌ | ✅ |
| Rutas (editar) | ❌ | ✅ | ✅ |
| Materiales (leer) | ✅ | ✅ | ✅ |
| Materiales (crear) | ❌ | ❌ | ✅ |
| Materiales (precio) | ❌ | ✅ | ✅ |
| Balance | ✅ | ✅ | ✅ |
| Balance (ajustar) | ❌ | ✅ | ✅ |
| SUI | ❌ | ✅ | ✅ |
| PQR (crear) | ✅ | ✅ | ✅ |
| PQR (responder) | ❌ | ✅ | ✅ |

---

## Modelos de datos

### Usuario
```
id, email, password (bcrypt), nombre, rol (enum), activo
```

### Reciclador
```
id, codigo (ID-XXXX), nombre, documento, telefono, email, color, estado, rutaId
```

### Ruta
```
id, numero (R-01), nombre, descripcion, barrios (array), estado
```

### Material
```
id, nombre, codigo (CAR-01), icono, unidad
→ PrecioMaterial: precio, tendencia, vigencia
→ Comprador: empresa, precio
```

### Pesaje
```
id, ticket (cuid), recicladorId, rutaId, horaEntrada, horaSalida, estado, operadorId
→ PesajeMaterial: materialId, pesoNeto, rechazo
```

### BalanceMes
```
id, anio, mes, materialId, ingresado, vendido, rechazos, cerrado
→ BalanceAjuste: cantidad, tipo, motivo
```

### ReporteSUI
```
id, periodo, anio, mes, registro13 (JSON), registro14 (JSON), estado, fechaEnvio
```

### PQR
```
id, radicado (PQR-YYYY-NNNN), tipo, estado, canal, solicitante, descripcion, respuesta, fechaLimite
```
