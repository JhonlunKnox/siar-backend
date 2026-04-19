require('dotenv').config();

const REQUIRED_ENV = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'SUPABASE_URL', 'SUPABASE_SERVICE_KEY'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) throw new Error(`Falta variable de entorno: ${key}`);
}

const express     = require('express');
const cors        = require('cors');
const morgan      = require('morgan');
const compression = require('compression');

const authRoutes         = require('./routes/auth.routes');
const dashboardRoutes    = require('./routes/dashboard.routes');
const pesajeRoutes       = require('./routes/pesaje.routes');
const recicladoresRoutes = require('./routes/recicladores.routes');
const rutasRoutes        = require('./routes/rutas.routes');
const materialesRoutes   = require('./routes/materiales.routes');
const balanceRoutes      = require('./routes/balance.routes');
const suiRoutes          = require('./routes/sui.routes');
const pqrRoutes          = require('./routes/pqr.routes');
const vehiculosRoutes    = require('./routes/vehiculos.routes');

const app = express();

// Necesario para Render/proxies
app.set('trust proxy', 1);

// ─── CORS ────────────────────────────────────────────────────────────────────
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : ['http://localhost:5173'];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) return cb(null, true);
    cb(new Error(`Origin ${origin} no permitido por CORS`));
  },
  credentials: true,
}));

// ─── Middlewares ─────────────────────────────────────────────────────────────
app.use(compression());
app.use(express.json());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// No server-side cache headers — let the frontend control caching
const noCache = (_req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
  next();
};

// ─── Health check ────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ─── Rutas ───────────────────────────────────────────────────────────────────
app.use('/api/auth',         authRoutes);
app.use('/api/dashboard',    noCache, dashboardRoutes);
app.use('/api/pesaje',       noCache, pesajeRoutes);
app.use('/api/recicladores', noCache, recicladoresRoutes);
app.use('/api/rutas',        noCache, rutasRoutes);
app.use('/api/materiales',   noCache, materialesRoutes);
app.use('/api/balance',      balanceRoutes);
app.use('/api/sui',          suiRoutes);
app.use('/api/pqr',          pqrRoutes);
app.use('/api/vehiculos',    noCache, vehiculosRoutes);

// ─── 404 ─────────────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

// ─── Error handler ───────────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err.message?.includes('CORS')) return res.status(403).json({ error: err.message });
  console.error(err);
  res.status(500).json({
    error: process.env.NODE_ENV === 'production' ? 'Error interno del servidor' : err.message,
  });
});

// ─── Arranque ────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🌿 SIAR Backend (sin Prisma) → http://0.0.0.0:${PORT}`);
  console.log(`   Entorno:  ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Supabase: ${process.env.SUPABASE_URL}`);
  console.log(`   Health:   http://0.0.0.0:${PORT}/health\n`);
  setTimeout(warmUp, 5000);
});

async function warmUp() {
  const { warmSet } = require('./lib/cache');
  const { computeKpis, computeActividad, computeComposicion, computeTendencia } = require('./controllers/dashboard.controller');
  try {
    const [kpisData, actividad, composicion, tendencia] = await Promise.all([
      computeKpis(), computeActividad(), computeComposicion(), computeTendencia(),
    ]);
    warmSet('/api/dashboard/all', { kpis: kpisData, actividad, composicion, tendencia }, 5 * 60_000);
    console.log('   Cache warm-up: /dashboard/all ✓');
  } catch (err) {
    console.warn('   Cache warm-up falló (no crítico):', err.message);
  }
}