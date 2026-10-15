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
          id_cuenta INT NULL,
          tienda NVARCHAR(100) NOT NULL,
          nombre NVARCHAR(100) NOT NULL,
          direccion NVARCHAR(150) NOT NULL,
          producto NVARCHAR(100) NOT NULL,
          cantidad INT NOT NULL,
          valor_total DECIMAL(15,2) NOT NULL,
          hora_registro DATETIME NOT NULL DEFAULT GETDATE()
        );
      END

      IF COL_LENGTH('${nombreTabla}', 'id_cuenta') IS NULL
        ALTER TABLE ${nombreTabla} ADD id_cuenta INT NULL;
    `);
  }

  async asignarRegistrosSinCuenta(idCuenta) {
    if (!idCuenta) return;
    const pool = await getPool();
    const nombreTabla = this.obtenerNombreTabla();
    await pool
      .request()
      .input('idCuenta', sql.Int, idCuenta)
      .query(`UPDATE ${nombreTabla} SET id_cuenta = @idCuenta WHERE id_cuenta IS NULL`);
  }

  async guardar(datos, idCuenta, transaction) {
    const pool = transaction ? null : await getPool();
    const nombreTabla = this.obtenerNombreTabla();
    const request = transaction ? new sql.Request(transaction) : pool.request();
    const resultado = await request
      .input('idCuenta', sql.Int, idCuenta)
      .input('tienda', sql.NVarChar, datos.tienda)
      .input('nombre', sql.NVarChar, datos.nombre)
      .input('direccion', sql.NVarChar, datos.direccion)
      .input('producto', sql.NVarChar, datos.producto)
      .input('cantidad', sql.Int, datos.cantidad)
      .input('total', sql.Decimal(15, 2), datos.total).query(`
        INSERT INTO ${nombreTabla} (id_cuenta, tienda, nombre, direccion, producto, cantidad, valor_total)
        OUTPUT INSERTED.*
        VALUES (@idCuenta, @tienda, @nombre, @direccion, @producto, @cantidad, @total)
      `);
    return resultado.recordset[0];
  }

  async actualizar(id, datos, idCuenta) {
    const pool = await getPool();
    const nombreTabla = this.obtenerNombreTabla();
    const resultado = await pool
      .request()
      .input('id', sql.Int, id)
      .input('idCuenta', sql.Int, idCuenta)
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
        WHERE id_registro = @id AND id_cuenta = @idCuenta
      `);
    return resultado.recordset[0];
  }

  async eliminar(id, idCuenta) {
    const pool = await getPool();
    const nombreTabla = this.obtenerNombreTabla();
    const resultado = await pool
      .request()
      .input('id', sql.Int, id)
      .input('idCuenta', sql.Int, idCuenta)
      .query(`DELETE FROM ${nombreTabla} OUTPUT DELETED.* WHERE id_registro = @id AND id_cuenta = @idCuenta`);
    return resultado.recordset[0];
  }

  async listarTodos(idCuenta) {
    const pool = await getPool();
    const nombreTabla = this.obtenerNombreTabla();
    const resultado = await pool
      .request()
      .input('idCuenta', sql.Int, idCuenta)
      .query(`SELECT * FROM ${nombreTabla} WHERE id_cuenta = @idCuenta ORDER BY id_registro DESC`);
    return resultado.recordset;
  }

  async listarPorFecha(fecha, idCuenta) {
    const pool = await getPool();
    const nombreTabla = this.obtenerNombreTabla();
    const resultado = await pool
      .request()
      .input('fecha', sql.Date, fecha)
      .input('idCuenta', sql.Int, idCuenta)
      .query(`
        SELECT * FROM ${nombreTabla}
        WHERE CAST(hora_registro AS DATE) = @fecha AND id_cuenta = @idCuenta
        ORDER BY id_registro DESC
      `);
    return resultado.recordset;
  }

  static async migrarTablasDiariasSinCuenta(idCuenta) {
    if (!idCuenta) return;
    const pool = await getPool();
    const tablas = await pool.request().query(`
      SELECT name
      FROM sys.tables
      WHERE name LIKE 'pedidos[_]20[0-9][0-9][_][0-9][0-9][_][0-9][0-9]'
    `);

    for (const { name } of tablas.recordset) {
      if (!/^pedidos_\d{4}_\d{2}_\d{2}$/.test(name)) continue;
      await pool
        .request()
        .input('idCuenta', sql.Int, idCuenta)
        .query(`
          IF COL_LENGTH('${name}', 'id_cuenta') IS NULL
            ALTER TABLE [${name}] ADD id_cuenta INT NULL;
          UPDATE [${name}] SET id_cuenta = @idCuenta WHERE id_cuenta IS NULL;
        `);
    }
  }
}

module.exports = RegistroPedidos;
