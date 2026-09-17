const { sql } = require('../config/db');


class RegistroPedidos {
  obtenerNombreTabla() {

    throw new Error('cada clase hija debe definir obtenerNombreTabla()');
  }

  async crearTablaSiNoExiste() {
    const nombreTabla = this.obtenerNombreTabla();
    const query = `
      IF OBJECT_ID('${nombreTabla}', 'U') IS NULL
      BEGIN
        CREATE TABLE ${nombreTabla} (
          id_registro INT IDENTITY(1,1) PRIMARY KEY,
          tienda NVARCHAR(100) NOT NULL,
          nombre NVARCHAR(100) NOT NULL,
          direccion NVARCHAR(150) NOT NULL,
          producto NVARCHAR(100) NOT NULL,
          cantidad INT NOT NULL,
          valor_total DECIMAL(15,2) NOT NULL,
          hora_registro DATETIME NOT NULL DEFAULT GETDATE()
        );
      END
    `;
    await sql.query(query);
  }

  async guardar(datos) {
    const nombreTabla = this.obtenerNombreTabla();
    const insertar = new sql.Request();
    insertar.input('tienda', sql.NVarChar, datos.tienda);
    insertar.input('nombre', sql.NVarChar, datos.nombre);
    insertar.input('direccion', sql.NVarChar, datos.direccion);
    insertar.input('producto', sql.NVarChar, datos.producto);
    insertar.input('cantidad', sql.Int, datos.cantidad);
    insertar.input('total', sql.Decimal(15, 2), datos.total);

    await insertar.query(`
      INSERT INTO ${nombreTabla} (tienda, nombre, direccion, producto, cantidad, valor_total)
      VALUES (@tienda, @nombre, @direccion, @producto, @cantidad, @total)
    `);
  }

  async mostrarTodos() {
    const nombreTabla = this.obtenerNombreTabla();
    console.log(`\n¡Gracias por tu pedido! Todos tus registros guardados en SQL Server [${nombreTabla}]:`);
    const resultado = await sql.query(`SELECT * FROM ${nombreTabla}`);
    resultado.recordset.forEach((r) => {
      console.log(
        `[#${r.id_registro}] Tienda: ${r.tienda} | Cliente: ${r.nombre} | Producto: ${r.producto} | Cantidad: ${r.cantidad} | Total: $${r.valor_total} | Hora: ${r.hora_registro}`
      );
    });
  }
}

module.exports = RegistroPedidos;
