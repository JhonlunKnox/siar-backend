const { Router } = require('express');
const { listar, resumenCobertura, obtener, crear, actualizar } = require('../controllers/rutas.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { requireRoles } = require('../middleware/roles.middleware');
const { validate } = require('../middleware/validate.middleware');
const { crearRutaSchema, actualizarRutaSchema } = require('../validators/rutas.validator');

const router = Router();

router.use(authMiddleware);

router.get('/',         listar);
router.get('/cobertura', resumenCobertura);
router.get('/:id',      obtener);

router.post(
  '/',
  requireRoles('admin_asociacion'),
  validate(crearRutaSchema),
  crear
);

router.put(
  '/:id',
  requireRoles('operador_eca', 'admin_asociacion'),
  validate(actualizarRutaSchema),
  actualizar
);

module.exports = router;
