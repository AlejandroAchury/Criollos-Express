const readline = require('readline');
const { sql, config } = require('./config/db');
const { mostrarProductos } = require('./services/productos');
const RegistroPorDia = require('./models/RegistroPorDia');
const RegistroUnico = require('./models/RegistroUnico');
 
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
 
function preguntar(texto) {
  return new Promise((resolve) => {
    rl.question(texto, (respuesta) => resolve(respuesta));
  });
}
 
async function main() {
  try {
    await sql.connect(config);
 

    const registroDiario = new RegistroPorDia();
    const registroGeneral = new RegistroUnico();
 
    await registroDiario.crearTablaSiNoExiste();
    await registroGeneral.crearTablaSiNoExiste();
 
    const tienda = await preguntar('¿Cuál es el nombre de la tienda? ');
    const nombre = await preguntar('¿Cuál es tu nombre? ');
    const direccion = await preguntar('¿A qué dirección enviamos el pedido? ');
 
    let quiereOtro = true;
 
    while (quiereOtro) {
      const productos = await mostrarProductos();
 
      const idTexto = await preguntar('\n¿Qué producto quieres? (escribe el número) ');
      const idProducto = parseInt(idTexto);
 
      const producto = productos.find((p) => p.id_producto === idProducto);
 
      if (!producto) {
        console.log('Ese producto no existe, intenta de nuevo.');
        continue;
      }
 
      const cantidadTexto = await preguntar(`¿Cuánto stock quieres de "${producto.nombre}"? `);
      const cantidad = parseInt(cantidadTexto);
 
      if (cantidad > producto.stock) {
        console.log(`No hay suficiente stock. Solo quedan ${producto.stock}.`);
        continue;
      }
 
      const total = producto.precio * cantidad;
 
      const datosPedido = {
        tienda,
        nombre,
        direccion,
        producto: producto.nombre,
        cantidad,
        total
      };
 
      await registroDiario.guardar(datosPedido);
      await registroGeneral.guardar(datosPedido);
 
      const actualizar = new sql.Request();
      actualizar.input('cantidad', sql.Int, cantidad);
      actualizar.input('id', sql.Int, idProducto);
      await actualizar.query('UPDATE productos SET stock = stock - @cantidad WHERE id_producto = @id');
 
      console.log(`\n¡Registrado! Pediste ${cantidad} de "${producto.nombre}". Total: $${total}`);
 
      const otroTexto = await preguntar('\n¿Quieres pedir otro producto? (s/n) ');
      quiereOtro = otroTexto.trim().toLowerCase() === 's';
    }
 
    console.log('\n===== Pedidos de HOY =====');
    await registroDiario.mostrarTodos();
 
    console.log('\n===== Historial COMPLETO (todos los días) =====');
    await registroGeneral.mostrarTodos();
  } catch (error) {
    console.error('Error:', error);
  } finally {
    rl.close();
    sql.close();
  }
}
 
main();
 