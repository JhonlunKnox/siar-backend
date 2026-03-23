const { Router } = require('express');
const { kpis, actividadReciente, composicionMaterial, tendenciaSemanal } = require('../controllers/dashboard.controller');
const authMiddleware = require('../middleware/auth.middleware');

const router = Router();

router.use(authMiddleware);

router.get('/kpis',               kpis);
router.get('/actividad-reciente', actividadReciente);
router.get('/composicion',        composicionMaterial);
router.get('/tendencia-semanal',  tendenciaSemanal);

module.exports = router;
