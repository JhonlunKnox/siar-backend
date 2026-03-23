const { Router } = require('express');
const { listar, registroDia, obtener, crear, actualizarEstado } = require('../controllers/pesaje.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { requireRoles } = require('../middleware/roles.middleware');
const { validate } = require('../middleware/validate.middleware');
const { crearPesajeSchema, actualizarEstadoSchema, listQuerySchema } = require('../validators/pesaje.validator');

const router = Router();

router.use(authMiddleware);

router.get('/',          validate(listQuerySchema, 'query'), listar);
router.get('/dia',       registroDia);
router.get('/:id',       obtener);

// Solo operador y admin pueden crear/modificar
router.post(
  '/',
  requireRoles('operador_eca', 'admin_asociacion'),
  validate(crearPesajeSchema),
  crear
);
router.patch(
  '/:id/estado',
  requireRoles('operador_eca', 'admin_asociacion'),
  validate(actualizarEstadoSchema),
  actualizarEstado
);

module.exports = router;
