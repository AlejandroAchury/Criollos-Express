const { sql, getPool } = require('../config/db');

class RegistroPedidos {
  obtenerNombreTabla() {
    throw new Error('cada clase hija debe definir obtenerNombreTabla()');
  }

  async crearTablaSiNoExiste() {
    const pool = await getPool();
    const nombreTabla = this.obtenerNombreTabla();
    await pool.request().query(`
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
    `);
  }

  async guardar(datos) {
    const pool = await getPool();
    const nombreTabla = this.obtenerNombreTabla();
    const resultado = await pool
      .request()
      .input('tienda', sql.NVarChar, datos.tienda)
      .input('nombre', sql.NVarChar, datos.nombre)
      .input('direccion', sql.NVarChar, datos.direccion)
      .input('producto', sql.NVarChar, datos.producto)
      .input('cantidad', sql.Int, datos.cantidad)
      .input('total', sql.Decimal(15, 2), datos.total).query(`
        INSERT INTO ${nombreTabla} (tienda, nombre, direccion, producto, cantidad, valor_total)
        OUTPUT INSERTED.*
        VALUES (@tienda, @nombre, @direccion, @producto, @cantidad, @total)
      `);
    return resultado.recordset[0];
  }

  async actualizar(id, datos) {
    const pool = await getPool();
    const nombreTabla = this.obtenerNombreTabla();
    const resultado = await pool
      .request()
      .input('id', sql.Int, id)
      .input('tienda', sql.NVarChar, datos.tienda)
      .input('nombre', sql.NVarChar, datos.nombre)
      .input('direccion', sql.NVarChar, datos.direccion)
      .input('producto', sql.NVarChar, datos.producto)
      .input('cantidad', sql.Int, datos.cantidad)
      .input('total', sql.Decimal(15, 2), datos.total).query(`
        UPDATE ${nombreTabla}
        SET tienda = @tienda, nombre = @nombre, direccion = @direccion,
            producto = @producto, cantidad = @cantidad, valor_total = @total
        OUTPUT INSERTED.*
        WHERE id_registro = @id
      `);
    return resultado.recordset[0];
  }

  async eliminar(id) {
    const pool = await getPool();
    const nombreTabla = this.obtenerNombreTabla();
    const resultado = await pool
      .request()
      .input('id', sql.Int, id)
      .query(`DELETE FROM ${nombreTabla} OUTPUT DELETED.* WHERE id_registro = @id`);
    return resultado.recordset[0];
  }

  async listarTodos() {
    const pool = await getPool();
    const nombreTabla = this.obtenerNombreTabla();
    const resultado = await pool.request().query(`SELECT * FROM ${nombreTabla} ORDER BY id_registro DESC`);
    return resultado.recordset;
  }

  // fecha en formato 'YYYY-MM-DD', igual a como viene de un <input type="date">
  async listarPorFecha(fecha) {
    const pool = await getPool();
    const nombreTabla = this.obtenerNombreTabla();
    const resultado = await pool
      .request()
      .input('fecha', sql.Date, fecha)
      .query(`
        SELECT * FROM ${nombreTabla}
        WHERE CAST(hora_registro AS DATE) = @fecha
        ORDER BY id_registro DESC
      `);
    return resultado.recordset;
  }
}

module.exports = RegistroPedidos;
