const { Router } = require('express');
const { listar, estadisticas, obtener, crear, responder, cerrar } = require('../controllers/pqr.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { requireRoles } = require('../middleware/roles.middleware');
const { validate } = require('../middleware/validate.middleware');
const { crearPQRSchema, responderPQRSchema, listQuerySchema } = require('../validators/pqr.validator');

const router = Router();

router.use(authMiddleware);

router.get('/',              validate(listQuerySchema, 'query'), listar);
router.get('/estadisticas',  estadisticas);
router.get('/:radicado',     obtener);

// Cualquier rol autenticado puede crear una PQR
router.post('/',             validate(crearPQRSchema), crear);

// Solo operador y admin pueden responder/cerrar
router.post(
  '/:radicado/responder',
  requireRoles('operador_eca', 'admin_asociacion'),
  validate(responderPQRSchema),
  responder
);

router.post(
  '/:radicado/cerrar',
  requireRoles('operador_eca', 'admin_asociacion'),
  cerrar
);

module.exports = router;
