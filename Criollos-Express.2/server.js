require('dotenv').config();
const express = require('express');
const path = require('path');
const { getPool } = require('./config/db');
const Producto = require('./models/Producto');
const productosRouter = require('./routes/productos.routes');
const pedidosRouter = require('./routes/pedidos.routes');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/productos', productosRouter);
app.use('/api/pedidos', pedidosRouter);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const startServer = (port) => {
  const server = app.listen(port, () => {
    console.log(`Criollos Express corriendo en http://localhost:${port}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      const nextPort = port + 1;
      console.log(`Puerto ${port} ocupado. Probando ${nextPort}...`);
      startServer(nextPort);
      return;
    }

    console.error('Error al iniciar servidor:', err);
  });
};

async function iniciar() {
  try {
    const pool = await getPool();
    await Producto.crearTablaSiNoExiste();
    console.log('Conectado a SQL Server:', pool.config.database);
    startServer(PORT);
  } catch (error) {
    console.error('No se pudo iniciar el servidor:', error.message);
    process.exit(1);
  }
}

iniciar();
