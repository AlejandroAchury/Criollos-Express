const express = require('express');
const { sql, getPool } = require('../config/db');
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
    const pedidos = await registroDiario.listarTodos(req.usuario.accountId);
    res.json(pedidos);
  } catch (error) {
    console.error('No se pudieron obtener los pedidos de hoy:', error.message);
    res.status(500).json({ error: 'No se pudieron obtener los pedidos de hoy.' });
  }
});


router.get('/historial', async (req, res) => {
  try {
    await asegurarTablas();
    const { fecha } = req.query;
    if (fecha && !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return res.status(400).json({ error: 'La fecha no tiene un formato válido.' });
    }
    const pedidos = fecha
      ? await registroGeneral.listarPorFecha(fecha, req.usuario.accountId)
      : await registroGeneral.listarTodos(req.usuario.accountId);
    res.json(pedidos);
  } catch (error) {
    console.error('No se pudo obtener el historial:', error.message);
    res.status(500).json({ error: 'No se pudo obtener el historial.' });
  }
}); // esto nos ayuda a leer historial completo por filtrado


router.post('/', async (req, res) => {
  const { tienda, nombre, direccion, id_producto, cantidad } = req.body || {};

  if (!tienda || !nombre || !direccion || !id_producto || !cantidad) {
    return res.status(400).json({ error: 'todos los campos son obligatorios.' });
  }

  const idProducto = Number(id_producto);
  const cantidadNum = Number(cantidad);
  if (!Number.isSafeInteger(idProducto) || idProducto <= 0) {
    return res.status(400).json({ error: 'El producto seleccionado no es válido.' });
  }
  if (!Number.isSafeInteger(cantidadNum) || cantidadNum <= 0) {
    return res.status(400).json({ error: 'La cantidad debe ser un número entero mayor a cero.' });
  }

  try {
    await asegurarTablas();

    const producto = await Producto.obtener(idProducto, req.usuario.accountId);
    if (!producto) return res.status(404).json({ error: 'ese producto no existe.' });

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

    const transaction = new sql.Transaction(await getPool());
    await transaction.begin();
    let pedidoDia;
    try {
      const stockActualizado = await Producto.descontarStock(
        idProducto,
        cantidadNum,
        req.usuario.accountId,
        transaction
      );
      if (!stockActualizado) {
        await transaction.rollback();
        return res.status(409).json({ error: 'El inventario cambió. Actualiza los productos e inténtalo de nuevo.' });
      }
      pedidoDia = await registroDiario.guardar(datosPedido, req.usuario.accountId, transaction);
      await registroGeneral.guardar(datosPedido, req.usuario.accountId, transaction);
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }

    res.status(201).json(pedidoDia);
  } catch (error) {
    console.error('No se pudo registrar el pedido:', error.message);
    res.status(500).json({ error: 'No se pudo registrar el pedido.' });
  }
});


router.put('/:id', async (req, res) => { // esto permite modificar un pedido del dia
  const { tienda, nombre, direccion, producto, cantidad, total } = req.body || {};
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
    }, req.usuario.accountId);
    if (!actualizado) return res.status(404).json({ error: 'Pedido no encontrado.' });
    res.json(actualizado);
  } catch (error) {
    console.error('No se pudo modificar el pedido:', error.message);
    res.status(500).json({ error: 'No se pudo modificar el pedido.' });
  }
});


router.delete('/:id', async (req, res) => { // esta parte del codigo permite eliminar un pedido del dia, y si no existe nos manda un error 404
  try {
    const eliminado = await registroDiario.eliminar(req.params.id, req.usuario.accountId);
    if (!eliminado) return res.status(404).json({ error: 'Pedido no encontrado.' });
    res.json(eliminado);
  } catch (error) {
    console.error('No se pudo eliminar el pedido:', error.message);
    res.status(500).json({ error: 'No se pudo eliminar el pedido.' });
  }
});

module.exports = router;
