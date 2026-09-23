require('dotenv').config();
const express = require('express');
const cors = require('cors');
const usuariosRoutes = require('./routes/usuarios.routes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/usuarios', usuariosRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok', servicio: 'ms-usuarios' }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ µs-Usuarios corriendo en puerto ${PORT}`);
});