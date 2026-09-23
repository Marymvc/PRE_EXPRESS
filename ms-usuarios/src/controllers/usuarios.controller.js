const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../firebase');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_cambiar_en_produccion';
const COLECCION = 'usuarios';

function generarToken(usuario) {
  return jwt.sign(
    { uid: usuario.id, email: usuario.email, nombre: usuario.nombre },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// POST /api/usuarios/registro
async function registro(req, res) {
  try {
    const { nombre, email, password } = req.body;

    if (!nombre || !email || !password) {
      return res.status(400).json({ error: 'Faltan campos: nombre, email, password' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    const existente = await db.collection(COLECCION).where('email', '==', email).limit(1).get();
    if (!existente.empty) {
      return res.status(409).json({ error: 'Ya existe una cuenta con ese email' });
    }

    const hash = await bcrypt.hash(password, 10);

    const docRef = await db.collection(COLECCION).add({
      nombre,
      email,
      password: hash,
      creadoEn: new Date().toISOString(),
    });

    const usuario = { id: docRef.id, nombre, email };
    const token = generarToken(usuario);

    return res.status(201).json({ token, usuario });
  } catch (err) {
    console.error('Error en registro:', err);
    return res.status(500).json({ error: 'Error del servidor al registrar' });
  }
}

// POST /api/usuarios/login
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Faltan campos: email, password' });
    }

    const snap = await db.collection(COLECCION).where('email', '==', email).limit(1).get();
    if (snap.empty) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const doc = snap.docs[0];
    const data = doc.data();

    const ok = await bcrypt.compare(password, data.password);
    if (!ok) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const usuario = { id: doc.id, nombre: data.nombre, email: data.email };
    const token = generarToken(usuario);

    return res.json({ token, usuario });
  } catch (err) {
    console.error('Error en login:', err);
    return res.status(500).json({ error: 'Error del servidor al iniciar sesión' });
  }
}

// GET /api/usuarios/me
async function me(req, res) {
  try {
    const doc = await db.collection(COLECCION).doc(req.usuario.uid).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    const data = doc.data();
    return res.json({
      id: doc.id,
      nombre: data.nombre,
      email: data.email,
      creadoEn: data.creadoEn,
    });
  } catch (err) {
    console.error('Error en /me:', err);
    return res.status(500).json({ error: 'Error del servidor' });
  }
}

module.exports = { registro, login, me };