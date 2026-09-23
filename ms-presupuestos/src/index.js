require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { graphqlHTTP } = require('express-graphql');
const { buildSchema } = require('graphql');
const jwt = require('jsonwebtoken');
const { db } = require('./firebase');
const { numeroALetras } = require('./numeroALetras');

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_cambiar_en_produccion';
const COLECCION = 'presupuestos';

// --- Schema GraphQL ---
const schema = buildSchema(`
  type Item {
    itemId: ID
    descripcion: String!
    categoria: String!
    unidad: String!
    superficie: Float!
    costoUnitario: Float!
    subtotal: Float!
  }

  type SubtotalCategoria {
    categoria: String!
    subtotal: Float!
  }

  type Presupuesto {
    id: ID!
    nombre: String!
    cliente: String
    items: [Item!]!
    subtotalesPorCategoria: [SubtotalCategoria!]!
    total: Float!
    totalEnLetras: String!
    estado: String
    fecha: String!
  }

  input ItemInput {
    itemId: ID
    descripcion: String!
    categoria: String!
    unidad: String!
    superficie: Float!
    costoUnitario: Float!
  }

  type Query {
    misPresupuestos: [Presupuesto!]!
  }

  type Mutation {
    crearPresupuesto(nombre: String!, cliente: String, items: [ItemInput!]!): Presupuesto!
    actualizarPresupuesto(id: ID!, nombre: String, cliente: String, items: [ItemInput!]!): Presupuesto!
    eliminarPresupuesto(id: ID!): Boolean!
  }
`);

// --- Helpers ---
function calcular(items) {
  const itemsConSubtotal = items.map((it) => ({
    ...it,
    subtotal: Number((it.superficie * it.costoUnitario).toFixed(2)),
  }));

  const mapa = new Map();
  itemsConSubtotal.forEach((it) => {
    mapa.set(it.categoria, (mapa.get(it.categoria) || 0) + it.subtotal);
  });

  const subtotalesPorCategoria = Array.from(mapa.entries()).map(([categoria, subtotal]) => ({
    categoria,
    subtotal: Number(subtotal.toFixed(2)),
  }));

  const total = Number(
    itemsConSubtotal.reduce((s, it) => s + it.subtotal, 0).toFixed(2)
  );

  return {
    items: itemsConSubtotal,
    subtotalesPorCategoria,
    total,
    totalEnLetras: numeroALetras(total),
  };
}

// --- Resolvers ---
const root = {
  misPresupuestos: async (_, context) => {
    const snap = await db.collection(COLECCION)
      .where('usuarioId', '==', context.usuario.uid)
      .get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  },

  crearPresupuesto: async ({ nombre, cliente, items }, context) => {
    const calculo = calcular(items);
    const nuevo = {
      nombre,
      cliente: cliente || null,
      usuarioId: context.usuario.uid,
      ...calculo,
      estado: 'borrador',
      fecha: new Date().toISOString(),
    };
    const ref = await db.collection(COLECCION).add(nuevo);
    return { id: ref.id, ...nuevo };
  },

  actualizarPresupuesto: async ({ id, nombre, cliente, items }, context) => {
    const ref = db.collection(COLECCION).doc(id);
    const doc = await ref.get();
    if (!doc.exists) throw new Error('Presupuesto no encontrado');
    if (doc.data().usuarioId !== context.usuario.uid) throw new Error('No autorizado');

    const calculo = calcular(items);
    const actualizado = {
      nombre: nombre || doc.data().nombre,
      cliente: cliente !== undefined ? cliente : doc.data().cliente,
      ...calculo,
      fecha: new Date().toISOString(),
    };
    await ref.update(actualizado);
    return { id, ...doc.data(), ...actualizado };
  },

  eliminarPresupuesto: async ({ id }, context) => {
    const ref = db.collection(COLECCION).doc(id);
    const doc = await ref.get();
    if (!doc.exists) throw new Error('Presupuesto no encontrado');
    if (doc.data().usuarioId !== context.usuario.uid) throw new Error('No autorizado');
    await ref.delete();
    return true;
  },
};

// --- GraphQL endpoint con auth ---
app.use('/graphql', (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ errors: [{ message: 'Token no proporcionado', extensions: { code: 'UNAUTHENTICATED' } }] });
  }

  try {
    req.usuario = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ errors: [{ message: 'Token inválido', extensions: { code: 'UNAUTHENTICATED' } }] });
  }
});

app.use('/graphql', graphqlHTTP((req) => ({
  schema,
  rootValue: root,
  context: { usuario: req.usuario },
  graphiql: false,
})));

app.get('/health', (req, res) => res.json({ status: 'ok', servicio: 'ms-presupuestos' }));

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
  console.log(`✅ µs-Presupuestos corriendo en puerto ${PORT}`);
});