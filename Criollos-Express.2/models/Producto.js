const { sql, getPool } = require('../config/db');

class Producto {
  static async crearTablaSiNoExiste() {
    const pool = await getPool();
    await pool.request().query(`
      IF OBJECT_ID('ce_productos', 'U') IS NULL
      BEGIN
        CREATE TABLE ce_productos (
          id_producto INT IDENTITY(1,1) PRIMARY KEY,
          id_cuenta   INT NULL,
          nombre      NVARCHAR(100) NOT NULL,
          precio      DECIMAL(15,2) NOT NULL,
          stock       INT NOT NULL
        );
      END

      IF COL_LENGTH('ce_productos', 'id_cuenta') IS NULL
        ALTER TABLE ce_productos ADD id_cuenta INT NULL;
    `);
  }

  static async asignarProductosSinCuenta(idCuenta) {
    if (!idCuenta) return;
    const pool = await getPool();
    await pool
      .request()
      .input('idCuenta', sql.Int, idCuenta)
      .query('UPDATE ce_productos SET id_cuenta = @idCuenta WHERE id_cuenta IS NULL');
  }

  static async listar(idCuenta) {
    const pool = await getPool();
    const resultado = await pool
      .request()
      .input('idCuenta', sql.Int, idCuenta)
      .query('SELECT * FROM ce_productos WHERE id_cuenta = @idCuenta ORDER BY id_producto');
    return resultado.recordset;
  }

  static async obtener(id, idCuenta) {
    const pool = await getPool();
    const resultado = await pool
      .request()
      .input('id', sql.Int, id)
      .input('idCuenta', sql.Int, idCuenta)
      .query('SELECT * FROM ce_productos WHERE id_producto = @id AND id_cuenta = @idCuenta');
    return resultado.recordset[0];
  }

  static async crear({ nombre, precio, stock }, idCuenta) {
    const pool = await getPool();
    const resultado = await pool
      .request()
      .input('idCuenta', sql.Int, idCuenta)
      .input('nombre', sql.NVarChar, nombre)
      .input('precio', sql.Decimal(15, 2), precio)
      .input('stock', sql.Int, stock).query(`
        INSERT INTO ce_productos (id_cuenta, nombre, precio, stock)
        OUTPUT INSERTED.*
        VALUES (@idCuenta, @nombre, @precio, @stock)
      `);
    return resultado.recordset[0];
  }

  static async actualizar(id, { nombre, precio, stock }, idCuenta) {
    const pool = await getPool();
    const resultado = await pool
      .request()
      .input('id', sql.Int, id)
      .input('idCuenta', sql.Int, idCuenta)
      .input('nombre', sql.NVarChar, nombre)
      .input('precio', sql.Decimal(15, 2), precio)
      .input('stock', sql.Int, stock).query(`
        UPDATE ce_productos
        SET nombre = @nombre, precio = @precio, stock = @stock
        OUTPUT INSERTED.*
        WHERE id_producto = @id AND id_cuenta = @idCuenta
      `);
    return resultado.recordset[0];
  }

  static async eliminar(id, idCuenta) {
    const pool = await getPool();
    const resultado = await pool
      .request()
      .input('id', sql.Int, id)
      .input('idCuenta', sql.Int, idCuenta)
      .query('DELETE FROM ce_productos OUTPUT DELETED.* WHERE id_producto = @id AND id_cuenta = @idCuenta');
    return resultado.recordset[0];
  }

  static async descontarStock(id, cantidad, idCuenta, transaction) {
    const pool = transaction ? null : await getPool();
    const request = transaction ? new sql.Request(transaction) : pool.request();
    const resultado = await request
      .input('id', sql.Int, id)
      .input('cantidad', sql.Int, cantidad)
      .input('idCuenta', sql.Int, idCuenta)
      .query(`
        UPDATE ce_productos
        SET stock = stock - @cantidad
        OUTPUT INSERTED.id_producto
        WHERE id_producto = @id AND id_cuenta = @idCuenta AND stock >= @cantidad
      `);
    return resultado.recordset[0];
  }
}

module.exports = Producto;
