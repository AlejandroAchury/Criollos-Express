require('dotenv').config();
const path = require('path');
const express = require('express');

const Producto = require('./models/Producto');
const productosRouter = require('./routes/productos.routes');
const pedidosRouter = require('./routes/pedidos.routes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/productos', productosRouter);
app.use('/api/pedidos', pedidosRouter);

async function iniciar() {
  try {
    await Producto.crearTablaSiNoExiste();
    app.listen(PORT, () => {
      console.log(`Criollos Express corriendo en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('No se pudo iniciar el servidor:', error.message);
    process.exit(1);
  }
}

iniciar();
