require('dotenv').config();
const express = require('express');
const path = require('path');
const { getPool } = require('./config/db');
const Producto = require('./models/Producto');
const Autenticacion = require('./models/Autenticacion');
const RegistroUnico = require('./models/RegistroUnico');
const requerirAutenticacion = require('./middleware/autenticacion');
const autenticacionRouter = require('./routes/autenticacion.routes');
const productosRouter = require('./routes/productos.routes');
const pedidosRouter = require('./routes/pedidos.routes');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const registroGeneral = new RegistroUnico();
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(express.json({ limit: '10kb' }));

app.use('/api', (req, res, next) => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
  const origin = req.get('origin');
  if (!origin) return next();

  try {
    if (new URL(origin).origin !== `${req.protocol}://${req.get('host')}`) {
      return res.status(403).json({ error: 'Solicitud de otro origen no permitida.' });
    }
  } catch {
    return res.status(403).json({ error: 'Origen de solicitud no válido.' });
  }
  next();
});

app.use('/api/auth', autenticacionRouter);
app.use('/api', requerirAutenticacion);
app.use('/api/productos', productosRouter);
app.use('/api/pedidos', pedidosRouter);

async function servirAplicacion(req, res, next) {
  try {
    const usuario = await Autenticacion.obtenerSesion(req);
    if (!usuario) return res.redirect('/login');
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } catch (error) {
    next(error);
  }
}

app.get(['/', '/index.html'], servirAplicacion);
app.get(['/login', '/register'], async (req, res, next) => {
  try {
    if (await Autenticacion.obtenerSesion(req)) return res.redirect('/');
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
  } catch (error) {
    next(error);
  }
});

app.use(express.static(path.join(__dirname, 'public'), { index: false }));
app.use((error, req, res, next) => {
  console.error('Error no controlado en la solicitud:', error.message);
  if (res.headersSent) return next(error);
  res.status(500).send('Ocurrió un error inesperado.');
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
    await Autenticacion.crearTablasSiNoExisten();
    await Producto.crearTablaSiNoExiste();
    await registroGeneral.crearTablaSiNoExiste();
    const idCuentaPropietaria = await Autenticacion.obtenerCuentaPropietaria();
    if (idCuentaPropietaria) {
      await Producto.asignarProductosSinCuenta(idCuentaPropietaria);
      await registroGeneral.asignarRegistrosSinCuenta(idCuentaPropietaria);
      await RegistroUnico.migrarTablasDiariasSinCuenta(idCuentaPropietaria);
    } else {
      console.warn('No se configuró LEGACY_OWNER_EMAIL/PASSWORD; los datos anteriores sin cuenta no serán visibles hasta configurar la cuenta propietaria.');
    }
    console.log('Conectado a SQL Server:', pool.config.database);
    startServer(PORT);
  } catch (error) {
    console.error('No se pudo iniciar el servidor:', error.message);
    process.exit(1);
  }
}

iniciar();
