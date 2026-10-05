const { sql, getPool } = require('../config/db');

class Producto {
  static async crearTablaSiNoExiste() {
    const pool = await getPool();
    await pool.request().query(`
      IF OBJECT_ID('ce_productos', 'U') IS NULL
      BEGIN
        CREATE TABLE ce_productos (
          id_producto INT IDENTITY(1,1) PRIMARY KEY,
          nombre      NVARCHAR(100) NOT NULL,
          precio      DECIMAL(15,2) NOT NULL,
          stock       INT NOT NULL
        );
      END
    `);
  }

  static async listar() {
    const pool = await getPool();
    const resultado = await pool.request().query('SELECT * FROM ce_productos ORDER BY id_producto');
    return resultado.recordset;
  }

  static async obtener(id) {
    const pool = await getPool();
    const resultado = await pool
      .request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM ce_productos WHERE id_producto = @id');
    return resultado.recordset[0];
  }

  static async crear({ nombre, precio, stock }) {
    const pool = await getPool();
    const resultado = await pool
      .request()
      .input('nombre', sql.NVarChar, nombre)
      .input('precio', sql.Decimal(15, 2), precio)
      .input('stock', sql.Int, stock).query(`
        INSERT INTO ce_productos (nombre, precio, stock)
        OUTPUT INSERTED.*
        VALUES (@nombre, @precio, @stock)
      `);
    return resultado.recordset[0];
  }

  static async actualizar(id, { nombre, precio, stock }) {
    const pool = await getPool();
    const resultado = await pool
      .request()
      .input('id', sql.Int, id)
      .input('nombre', sql.NVarChar, nombre)
      .input('precio', sql.Decimal(15, 2), precio)
      .input('stock', sql.Int, stock).query(`
        UPDATE ce_productos
        SET nombre = @nombre, precio = @precio, stock = @stock
        OUTPUT INSERTED.*
        WHERE id_producto = @id
      `);
    return resultado.recordset[0];
  }

  static async eliminar(id) {
    const pool = await getPool();
    const resultado = await pool
      .request()
      .input('id', sql.Int, id)
      .query('DELETE FROM ce_productos OUTPUT DELETED.* WHERE id_producto = @id');
    return resultado.recordset[0];
  }

  static async descontarStock(id, cantidad) {
    const pool = await getPool();
    await pool
      .request()
      .input('id', sql.Int, id)
      .input('cantidad', sql.Int, cantidad)
      .query('UPDATE ce_productos SET stock = stock - @cantidad WHERE id_producto = @id');
  }
}

module.exports = Producto;
