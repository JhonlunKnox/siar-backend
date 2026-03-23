const { Router } = require('express');
const { listar, obtener, crear, actualizarPrecio, historialPrecios, listarCompradores, crearComprador } = require('../controllers/materiales.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { requireRoles } = require('../middleware/roles.middleware');
const { validate } = require('../middleware/validate.middleware');
const { crearMaterialSchema, actualizarPrecioSchema, crearCompradorSchema } = require('../validators/materiales.validator');

const router = Router();

router.use(authMiddleware);

router.get('/',                    listar);
router.get('/compradores',         listarCompradores);
router.get('/:id',                 obtener);
router.get('/:id/precios',         historialPrecios);

router.post(
  '/',
  requireRoles('admin_asociacion'),
  validate(crearMaterialSchema),
  crear
);

router.post(
  '/compradores',
  requireRoles('operador_eca', 'admin_asociacion'),
  validate(crearCompradorSchema),
  crearComprador
);

router.post(
  '/:id/precio',
  requireRoles('operador_eca', 'admin_asociacion'),
  validate(actualizarPrecioSchema),
  actualizarPrecio
);

module.exports = router;
