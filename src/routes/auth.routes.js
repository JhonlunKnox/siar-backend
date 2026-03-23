const { Router } = require('express');
const { login, refresh, me, logout } = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { loginSchema, refreshSchema } = require('../validators/auth.validator');

const router = Router();

router.post('/login',   validate(loginSchema),   login);
router.post('/refresh', validate(refreshSchema), refresh);
router.post('/logout',  authMiddleware,           logout);
router.get('/me',       authMiddleware,           me);

module.exports = router;
