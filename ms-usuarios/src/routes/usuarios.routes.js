const express = require('express');
const { registro, login, me } = require('../controllers/usuarios.controller');
const { verificarToken } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/registro', registro);
router.post('/login', login);
router.get('/me', verificarToken, me);

module.exports = router;