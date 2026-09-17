const { sql } = require('../config/db');

async function mostrarProductos() {
  const resultado = await sql.query('SELECT * FROM productos');
  console.log('\n--- Productos disponibles ---');
  resultado.recordset.forEach((p) => {
    console.log(`${p.id_producto}) ${p.nombre} - $${p.precio} - Stock: ${p.stock}`);
  });
  return resultado.recordset;
}

module.exports = { mostrarProductos };
