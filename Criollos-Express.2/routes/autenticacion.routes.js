const express = require('express');
const rateLimit = require('express-rate-limit');
const Autenticacion = require('../models/Autenticacion');
const requerirAutenticacion = require('../middleware/autenticacion');

const router = express.Router();
const limitarIntentos = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Espera unos minutos y vuelve a intentarlo.' }
});

function normalizarCorreo(valor) {
  return typeof valor === 'string' ? valor.trim().toLowerCase() : '';
}

router.post('/registro', limitarIntentos, async (req, res) => {
  const body = req.body || {};
  const nombre = typeof body.nombre === 'string' ? body.nombre.trim() : '';
  const correo = normalizarCorreo(body.correo);
  const contrasena = typeof body.contrasena === 'string' ? body.contrasena : '';

  if (!nombre || nombre.length > 100) {
    return res.status(400).json({ error: 'El nombre del negocio es obligatorio (máximo 100 caracteres).' });
  }
  if (correo.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    return res.status(400).json({ error: 'Escribe un correo válido.' });
  }
  const bytesContrasena = Buffer.byteLength(contrasena, 'utf8');
  if (bytesContrasena < 12 || bytesContrasena > 72) {
    return res.status(400).json({ error: 'La contraseña debe tener entre 12 y 72 bytes.' });
  }

  try {
    const usuario = await Autenticacion.crearCuenta({ nombre, correo, contrasena }, res);
    res.status(201).json({ usuario });
  } catch (error) {
    if (error.number === 2601 || error.number === 2627) {
      return res.status(409).json({ error: 'Ya existe una cuenta con ese correo.' });
    }
    console.error('No se pudo registrar la cuenta:', error.message);
    res.status(500).json({ error: 'No se pudo registrar la cuenta.' });
  }
});

router.post('/login', limitarIntentos, async (req, res) => {
  const body = req.body || {};
  const correo = normalizarCorreo(body.correo);
  const contrasena = typeof body.contrasena === 'string' ? body.contrasena : '';
  if (correo.length > 254 || !correo || !contrasena || Buffer.byteLength(contrasena, 'utf8') > 72) {
    return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
  }

  try {
    const usuario = await Autenticacion.autenticar(correo, contrasena);
    if (!usuario) return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
    await Autenticacion.crearSesion(usuario.id, res);
    res.json({ usuario });
  } catch (error) {
    console.error('No se pudo iniciar sesión:', error.message);
    res.status(500).json({ error: 'No se pudo iniciar sesión.' });
  }
});

router.get('/me', requerirAutenticacion, (req, res) => {
  res.json({ usuario: req.usuario });
});

router.post('/logout', async (req, res) => {
  try {
    await Autenticacion.cerrarSesion(req, res);
    res.sendStatus(204);
  } catch (error) {
    console.error('No se pudo cerrar la sesión:', error.message);
    res.status(500).json({ error: 'No se pudo cerrar la sesión.' });
  }
});

module.exports = router;
