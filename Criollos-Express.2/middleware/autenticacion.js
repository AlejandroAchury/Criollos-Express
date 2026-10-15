
const Autenticacion = require('../models/Autenticacion');

async function requerirAutenticacion(req, res, next) {
  try {
    const usuario = await Autenticacion.obtenerSesion(req);
    if (!usuario) {
      return res.status(401).json({ error: 'Inicia sesión para continuar.' });
    }
    req.usuario = usuario;
    next();
  } catch (error) {
    console.error('No se pudo validar la sesión:', error.message);
    res.status(500).json({ error: 'No se pudo validar la sesión.' });
  }
}

module.exports = requerirAutenticacion;
