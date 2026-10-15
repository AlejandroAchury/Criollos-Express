const express = require('express');
const Producto = require('../models/Producto');

const router = express.Router();

function validarDatos(body) {
  const { nombre, precio, stock } = body || {};
  if (!nombre || typeof nombre !== 'string') return 'El nombre es obligatorio.';
  if (precio === undefined || isNaN(Number(precio)) || Number(precio) < 0) return 'El precio debe ser un número válido.';
  if (stock === undefined || isNaN(Number(stock)) || Number(stock) < 0) return 'El stock debe ser un número válido.';
  return null;
}


router.get('/', async (req, res) => {
  try {
    const productos = await Producto.listar(req.usuario.accountId);
    res.json(productos);
  } catch (error) {
    console.error('No se pudieron obtener los productos:', error.message);
    res.status(500).json({ error: 'No se pudieron obtener los productos.' });
  }
});


router.post('/', async (req, res) => { //esto crea
  const error = validarDatos(req.body);
  if (error) return res.status(400).json({ error });

  try {
    const { nombre, precio, stock } = req.body || {};
    const producto = await Producto.crear(
      { nombre, precio: Number(precio), stock: Number(stock) },
      req.usuario.accountId
    );
    res.status(201).json(producto);
  } catch (error) {
    console.error('No se pudo crear el producto:', error.message);
    res.status(500).json({ error: 'No se pudo crear el producto.' });
  }
});


router.put('/:id', async (req, res) => { //esto modifica
  const error = validarDatos(req.body);
  if (error) return res.status(400).json({ error });

  try {
    const existente = await Producto.obtener(req.params.id, req.usuario.accountId);
    if (!existente) return res.status(404).json({ error: 'producto no encontrado.' });

    const { nombre, precio, stock } = req.body || {};
    const producto = await Producto.actualizar(req.params.id, {
      nombre,
      precio: Number(precio),
      stock: Number(stock)
    }, req.usuario.accountId);
    res.json(producto);
  } catch (error) {
    console.error('No se pudo actualizar el producto:', error.message);
    res.status(500).json({ error: 'No se pudo actualizar el producto.' });
  }
});


router.delete('/:id', async (req, res) => { //esto elimina
  try {
    const eliminado = await Producto.eliminar(req.params.id, req.usuario.accountId);
    if (!eliminado) return res.status(404).json({ error: 'producto no encontrado.' });
    res.json(eliminado);
  } catch (error) {
    console.error('No se pudo eliminar el producto:', error.message);
    res.status(500).json({ error: 'No se pudo eliminar el producto.' });
  }
});

module.exports = router;
