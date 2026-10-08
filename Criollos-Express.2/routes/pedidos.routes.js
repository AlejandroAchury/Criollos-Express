const express = require('express');
const Producto = require('../models/Producto');
const RegistroPorDia = require('../models/RegistroPorDia');
const RegistroUnico = require('../models/RegistroUnico');

const router = express.Router();
const registroDiario = new RegistroPorDia();
const registroGeneral = new RegistroUnico();

async function asegurarTablas() {
  await registroDiario.crearTablaSiNoExiste();
  await registroGeneral.crearTablaSiNoExiste();
}

router.get('/hoy', async (req, res) => {
  try {
    await asegurarTablas();
    const pedidos = await registroDiario.listarTodos();
    res.json(pedidos);
  } catch (error) {
    res.status(500).json({ error: 'No se pudieron obtener los pedidos de hoy.', detalle: error.message }); // esto lee los que se pedidos que se hicieron hoy
  } 
});


router.get('/historial', async (req, res) => {
  try {
    await asegurarTablas();
    const { fecha } = req.query;
    const pedidos = fecha ? await registroGeneral.listarPorFecha(fecha) : await registroGeneral.listarTodos();
    res.json(pedidos);
  } catch (error) {
    res.status(500).json({ error: 'No se pudo obtener el historial.', detalle: error.message });
  }
}); // esto nos ayuda a leer historial completo por filtrado


router.post('/', async (req, res) => {
  const { tienda, nombre, direccion, id_producto, cantidad } = req.body;

  if (!tienda || !nombre || !direccion || !id_producto || !cantidad) {
    return res.status(400).json({ error: 'todos los campos son obligatorios.' });
  }

  try {
    await asegurarTablas();

    const producto = await Producto.obtener(id_producto);
    if (!producto) return res.status(404).json({ error: 'ese producto no existe.' });

    const cantidadNum = Number(cantidad);
    if (cantidadNum <= 0) return res.status(400).json({ error: 'la cantidad debe ser mayor a cero.' });
    if (cantidadNum > producto.stock) {
      return res.status(400).json({ error: `No hay suficiente stock. Solo quedan ${producto.stock}.` });
    }

    const total = producto.precio * cantidadNum;
    const datosPedido = {
      tienda,
      nombre,
      direccion,
      producto: producto.nombre,
      cantidad: cantidadNum,
      total
    };

    const pedidoDia = await registroDiario.guardar(datosPedido);
    await registroGeneral.guardar(datosPedido);
    await Producto.descontarStock(id_producto, cantidadNum);

    res.status(201).json(pedidoDia);
  } catch (error) {
    res.status(500).json({ error: 'No se pudo registrar el pedido.', detalle: error.message });
  }
});


router.put('/:id', async (req, res) => { // esto permite modificar un pedido del dia
  const { tienda, nombre, direccion, producto, cantidad, total } = req.body;
  if (!tienda || !nombre || !direccion || !producto || !cantidad || total === undefined) {
    return res.status(400).json({ error: 'todos los campos son obligatorios.' });
  }

  try {
    const actualizado = await registroDiario.actualizar(req.params.id, {
      tienda,
      nombre,
      direccion,
      producto,
      cantidad: Number(cantidad),
      total: Number(total)
    });
    if (!actualizado) return res.status(404).json({ error: 'Pedido no encontrado.' });
    res.json(actualizado);
  } catch (error) {
    res.status(500).json({ error: 'No se pudo modificar el pedido.', detalle: error.message });
  }
});


router.delete('/:id', async (req, res) => { // esta parte del codigo permite eliminar un pedido del dia, y si no existe nos manda un error 404
  try {
    const eliminado = await registroDiario.eliminar(req.params.id);
    if (!eliminado) return res.status(404).json({ error: 'Pedido no encontrado.' });
    res.json(eliminado);
  } catch (error) {
    res.status(500).json({ error: 'No se pudo eliminar el pedido.', detalle: error.message });
  }
});

module.exports = router;
