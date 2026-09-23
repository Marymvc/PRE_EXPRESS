require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { db } = require('./firebase');

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_cambiar_en_produccion';
const COLECCION = 'items';

function verificarToken(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Token no proporcionado' });
  try {
    req.usuario = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

// GET /api/items — lista del catálogo
app.get('/api/items', verificarToken, async (req, res) => {
  try {
    const snap = await db.collection(COLECCION)
      .where('usuarioId', '==', req.usuario.uid)
      .get();
    const items = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json(items);
  } catch (err) {
    console.error('Error listando items:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/items — crear item
app.post('/api/items', verificarToken, async (req, res) => {
  try {
    const { nombre, categoria, unidad, costoUnitario } = req.body;
    if (!nombre || !categoria || !unidad || costoUnitario == null) {
      return res.status(400).json({ error: 'Faltan campos' });
    }

    const nuevo = {
      nombre,
      categoria,
      unidad,
      costoUnitario: Number(costoUnitario),
      usuarioId: req.usuario.uid,
      creadoEn: new Date().toISOString(),
    };

    const ref = await db.collection(COLECCION).add(nuevo);
    res.status(201).json({ id: ref.id, ...nuevo });
  } catch (err) {
    console.error('Error creando item:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// DELETE /api/items/:id
app.delete('/api/items/:id', verificarToken, async (req, res) => {
  try {
    const ref = db.collection(COLECCION).doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: 'No encontrado' });
    if (doc.data().usuarioId !== req.usuario.uid) {
      return res.status(403).json({ error: 'No autorizado' });
    }
    await ref.delete();
    res.status(204).end();
  } catch (err) {
    console.error('Error eliminando item:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok', servicio: 'ms-items' }));

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`✅ µs-Items corriendo en puerto ${PORT}`);
});