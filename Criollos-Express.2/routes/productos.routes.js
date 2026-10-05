const express = require('express');
const Producto = require('../models/Producto');

const router = express.Router();

function validarDatos(body) {
  const { nombre, precio, stock } = body;
  if (!nombre || typeof nombre !== 'string') return 'El nombre es obligatorio.';
  if (precio === undefined || isNaN(Number(precio)) || Number(precio) < 0) return 'El precio debe ser un número válido.';
  if (stock === undefined || isNaN(Number(stock)) || Number(stock) < 0) return 'El stock debe ser un número válido.';
  return null;
}

// Leer todos
router.get('/', async (req, res) => {
  try {
    const productos = await Producto.listar();
    res.json(productos);
  } catch (error) {
    res.status(500).json({ error: 'No se pudieron obtener los productos.', detalle: error.message });
  }
});

// Crear
router.post('/', async (req, res) => {
  const error = validarDatos(req.body);
  if (error) return res.status(400).json({ error });

  try {
    const { nombre, precio, stock } = req.body;
    const producto = await Producto.crear({ nombre, precio: Number(precio), stock: Number(stock) });
    res.status(201).json(producto);
  } catch (error) {
    res.status(500).json({ error: 'No se pudo crear el producto.', detalle: error.message });
  }
});

// Modificar
router.put('/:id', async (req, res) => {
  const error = validarDatos(req.body);
  if (error) return res.status(400).json({ error });

  try {
    const existente = await Producto.obtener(req.params.id);
    if (!existente) return res.status(404).json({ error: 'Producto no encontrado.' });

    const { nombre, precio, stock } = req.body;
    const producto = await Producto.actualizar(req.params.id, {
      nombre,
      precio: Number(precio),
      stock: Number(stock)
    });
    res.json(producto);
  } catch (error) {
    res.status(500).json({ error: 'No se pudo actualizar el producto.', detalle: error.message });
  }
});

// Eliminar
router.delete('/:id', async (req, res) => {
  try {
    const eliminado = await Producto.eliminar(req.params.id);
    if (!eliminado) return res.status(404).json({ error: 'Producto no encontrado.' });
    res.json(eliminado);
  } catch (error) {
    res.status(500).json({ error: 'No se pudo eliminar el producto.', detalle: error.message });
  }
});

module.exports = router;
