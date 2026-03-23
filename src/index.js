require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const authRoutes        = require('./routes/auth.routes');
const dashboardRoutes   = require('./routes/dashboard.routes');
const pesajeRoutes      = require('./routes/pesaje.routes');
const recicladoresRoutes = require('./routes/recicladores.routes');
const rutasRoutes       = require('./routes/rutas.routes');
const materialesRoutes  = require('./routes/materiales.routes');
const balanceRoutes     = require('./routes/balance.routes');
const suiRoutes         = require('./routes/sui.routes');
const pqrRoutes         = require('./routes/pqr.routes');

const app = express();

// ─── Middlewares globales ──────────────────────────────────────────────────────
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), env: process.env.NODE_ENV });
});

// ─── Rutas API ────────────────────────────────────────────────────────────────
app.use('/api/auth',        authRoutes);
app.use('/api/dashboard',   dashboardRoutes);
app.use('/api/pesaje',      pesajeRoutes);
app.use('/api/recicladores', recicladoresRoutes);
app.use('/api/rutas',       rutasRoutes);
app.use('/api/materiales',  materialesRoutes);
app.use('/api/balance',     balanceRoutes);
app.use('/api/sui',         suiRoutes);
app.use('/api/pqr',         pqrRoutes);

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// ─── Error handler global ─────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// ─── Arranque ─────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🌿 SIAR Backend corriendo en http://localhost:${PORT}`);
  console.log(`   Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Health:  http://localhost:${PORT}/health\n`);
});
