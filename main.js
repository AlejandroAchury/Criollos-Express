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


    const registro = new RegistroPorDia();

    await registro.crearTablaSiNoExiste();

    const tienda = await preguntar('¿Cual es el nombre de la tienda? ');
    const nombre = await preguntar('¿Cual es tu nombre? ');
    const direccion = await preguntar('¿A que direccion enviamos el pedido? ');

    let quiereOtro = true;

    while (quiereOtro) {
      const productos = await mostrarProductos();

      const idTexto = await preguntar('\n¿Que producto quieres? (escribe el numero) ');
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

      await registro.guardar({
        tienda,
        nombre,
        direccion,
        producto: producto.nombre,
        cantidad,
        total
      });

      const actualizar = new sql.Request();
      actualizar.input('cantidad', sql.Int, cantidad);
      actualizar.input('id', sql.Int, idProducto);
      await actualizar.query('UPDATE productos SET stock = stock - @cantidad WHERE id_producto = @id');

      console.log(`\n¡Registrado! Pediste ${cantidad} de "${producto.nombre}". Total: $${total}`);

      const otroTexto = await preguntar('\n¿Quieres pedir otro producto? (s/n) ');
      quiereOtro = otroTexto.trim().toLowerCase() === 's';
    }

    await registro.mostrarTodos();
  } catch (error) {
    console.error('Error:', error);
  } finally {
    rl.close();
    sql.close();
  }
}

main();
