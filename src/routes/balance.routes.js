const { Router } = require('express');
const { obtenerMes, recalcularDesdePesajes, ajusteManual } = require('../controllers/balance.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { requireRoles } = require('../middleware/roles.middleware');
const { validate } = require('../middleware/validate.middleware');
const { ajusteManualSchema } = require('../validators/balance.validator');

const router = Router();

router.use(authMiddleware);

router.get('/:yyyymm',            obtenerMes);

router.post(
  '/:yyyymm/recalcular',
  requireRoles('operador_eca', 'admin_asociacion'),
  recalcularDesdePesajes
);

router.post(
  '/ajuste',
  requireRoles('operador_eca', 'admin_asociacion'),
  validate(ajusteManualSchema),
  ajusteManual
);

module.exports = router;
