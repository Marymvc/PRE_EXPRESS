require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { verificarToken } = require('./middleware/auth.middleware');

const app = express();

// --- CORS ---
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    // Permitir local, GitHub Pages, Railway y ngrok
    if (
      /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin) ||
      /\.github\.io$/.test(origin) ||
      /\.railway\.app$/.test(origin) ||
      /\.up\.railway\.app$/.test(origin) ||
      /\.ngrok-free\.app$/.test(origin)
    ) {
      return callback(null, true);
    }
    return callback(null, true); // permisivo en desarrollo
  },
  credentials: true,
}));

// --- Rate limit ---
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas peticiones, intenta de nuevo más tarde' },
});
app.use(limiter);

// --- URLs de microservicios ---
const USUARIOS_URL = process.env.USUARIOS_URL || 'http://localhost:3001';
const ITEMS_URL = process.env.ITEMS_URL || 'http://localhost:3002';
const PRESUPUESTOS_URL = process.env.PRESUPUESTOS_URL || 'http://localhost:3003';

function proxyHacia(target) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: (path, req) => req.originalUrl,
    onError: (err, req, res) => {
      console.error(`[proxy] Error hacia ${target}:`, err.message);
      res.status(502).json({
        error: 'Servicio no disponible',
        target,
        detalle: err.message,
      });
    },
  });
}

// --- Rutas proxied ---
app.use('/api/usuarios/registro', proxyHacia(USUARIOS_URL));
app.use('/api/usuarios/login', proxyHacia(USUARIOS_URL));
app.use('/api/usuarios', verificarToken, proxyHacia(USUARIOS_URL));

app.use('/api/items', verificarToken, proxyHacia(ITEMS_URL));

app.use('/graphql', verificarToken, proxyHacia(PRESUPUESTOS_URL));

// --- Health check ---
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    servicio: 'PRE_EXPRESS Gateway',
    targets: {
      usuarios: USUARIOS_URL,
      items: ITEMS_URL,
      presupuestos: PRESUPUESTOS_URL,
    },
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Gateway PRE_EXPRESS corriendo en puerto ${PORT}`);
  console.log(`   → µs-Usuarios:     ${USUARIOS_URL}`);
  console.log(`   → µs-Items:        ${ITEMS_URL}`);
  console.log(`   → µs-Presupuestos: ${PRESUPUESTOS_URL}`);
});