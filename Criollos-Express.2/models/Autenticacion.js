const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { sql, getPool } = require('../config/db');

const COOKIE_NAME = 'criollos_session';
const SESSION_DAYS = 7;
let dummyPasswordHash;

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function setSessionCookie(res, token, maxAge) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`
  );
}

function readSessionCookie(req) {
  const cookies = (req.headers.cookie || '').split(';');
  const cookie = cookies.find((item) => item.trim().startsWith(`${COOKIE_NAME}=`));
  return cookie ? cookie.trim().slice(COOKIE_NAME.length + 1) : null;
}

class Autenticacion {
  static async crearTablasSiNoExisten() {
    const pool = await getPool();
    await pool.request().query(`
      IF OBJECT_ID('ce_cuentas', 'U') IS NULL
      BEGIN
        CREATE TABLE ce_cuentas (
          id_cuenta INT IDENTITY(1,1) PRIMARY KEY,
          nombre NVARCHAR(100) NOT NULL,
          fecha_creacion DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
        );
      END;

      IF OBJECT_ID('ce_usuarios', 'U') IS NULL
      BEGIN
        CREATE TABLE ce_usuarios (
          id_usuario INT IDENTITY(1,1) PRIMARY KEY,
          id_cuenta INT NOT NULL,
          correo NVARCHAR(254) NOT NULL,
          hash_contrasena NVARCHAR(100) NOT NULL,
          fecha_creacion DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
          CONSTRAINT FK_ce_usuarios_cuentas FOREIGN KEY (id_cuenta)
            REFERENCES ce_cuentas(id_cuenta),
          CONSTRAINT UQ_ce_usuarios_correo UNIQUE (correo)
        );
      END;

      IF OBJECT_ID('ce_sesiones', 'U') IS NULL
      BEGIN
        CREATE TABLE ce_sesiones (
          hash_token CHAR(64) PRIMARY KEY,
          id_usuario INT NOT NULL,
          expira_en DATETIME2 NOT NULL,
          CONSTRAINT FK_ce_sesiones_usuarios FOREIGN KEY (id_usuario)
            REFERENCES ce_usuarios(id_usuario) ON DELETE CASCADE
        );
      END;
    `);
    dummyPasswordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
  }

  static async crearCuenta({ nombre, correo, contrasena }, res) {
    const pool = await getPool();
    const hashContrasena = await bcrypt.hash(contrasena, 12);
    const token = crypto.randomBytes(32).toString('hex');
    const expiracion = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
    const transaction = new sql.Transaction(pool);

    await transaction.begin();
    try {
      const resultadoCuenta = await new sql.Request(transaction)
        .input('nombre', sql.NVarChar(100), nombre)
        .query(`
          INSERT INTO ce_cuentas (nombre)
          OUTPUT INSERTED.id_cuenta
          VALUES (@nombre)
        `);
      const idCuenta = resultadoCuenta.recordset[0].id_cuenta;
      const resultadoUsuario = await new sql.Request(transaction)
        .input('idCuenta', sql.Int, idCuenta)
        .input('correo', sql.NVarChar(254), correo)
        .input('hashContrasena', sql.NVarChar(100), hashContrasena)
        .query(`
          INSERT INTO ce_usuarios (id_cuenta, correo, hash_contrasena)
          OUTPUT INSERTED.id_usuario, INSERTED.id_cuenta, INSERTED.correo
          VALUES (@idCuenta, @correo, @hashContrasena)
        `);
      await new sql.Request(transaction)
        .input('hashToken', sql.Char(64), hashToken(token))
        .input('idUsuario', sql.Int, resultadoUsuario.recordset[0].id_usuario)
        .input('expiraEn', sql.DateTime2, expiracion)
        .query(`
          DELETE FROM ce_sesiones WHERE expira_en <= SYSUTCDATETIME();
          INSERT INTO ce_sesiones (hash_token, id_usuario, expira_en)
          VALUES (@hashToken, @idUsuario, @expiraEn)
        `);
      await transaction.commit();
      setSessionCookie(res, token, SESSION_DAYS * 24 * 60 * 60);

      return {
        id: resultadoUsuario.recordset[0].id_usuario,
        accountId: resultadoUsuario.recordset[0].id_cuenta,
        email: resultadoUsuario.recordset[0].correo,
        accountName: nombre
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  static async autenticar(correo, contrasena) {
    const pool = await getPool();
    const resultado = await pool
      .request()
      .input('correo', sql.NVarChar(254), correo)
      .query(`
        SELECT u.id_usuario, u.id_cuenta, u.correo, u.hash_contrasena, c.nombre AS nombre_cuenta
        FROM ce_usuarios u
        INNER JOIN ce_cuentas c ON c.id_cuenta = u.id_cuenta
        WHERE u.correo = @correo
      `);
    const usuario = resultado.recordset[0];
    const contrasenaValida = await bcrypt.compare(
      contrasena,
      usuario ? usuario.hash_contrasena : dummyPasswordHash
    );
    if (!usuario || !contrasenaValida) return null;

    return {
      id: usuario.id_usuario,
      accountId: usuario.id_cuenta,
      email: usuario.correo,
      accountName: usuario.nombre_cuenta
    };
  }

  static async crearSesion(idUsuario, res) {
    const pool = await getPool();
    const token = crypto.randomBytes(32).toString('hex');
    const expiracion = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

    await pool
      .request()
      .input('hashToken', sql.Char(64), hashToken(token))
      .input('idUsuario', sql.Int, idUsuario)
      .input('expiraEn', sql.DateTime2, expiracion)
      .query(`
        DELETE FROM ce_sesiones WHERE expira_en <= SYSUTCDATETIME();
        INSERT INTO ce_sesiones (hash_token, id_usuario, expira_en)
        VALUES (@hashToken, @idUsuario, @expiraEn)
      `);

    setSessionCookie(res, token, SESSION_DAYS * 24 * 60 * 60);
  }

  static async cerrarSesion(req, res) {
    const token = readSessionCookie(req);
    if (token && /^[a-f0-9]{64}$/i.test(token)) {
      const pool = await getPool();
      await pool
        .request()
        .input('hashToken', sql.Char(64), hashToken(token))
        .query('DELETE FROM ce_sesiones WHERE hash_token = @hashToken');
    }
    setSessionCookie(res, '', 0);
  }

  static async obtenerSesion(req) {
    const token = readSessionCookie(req);
    if (!token || !/^[a-f0-9]{64}$/i.test(token)) return null;

    const pool = await getPool();
    const resultado = await pool
      .request()
      .input('hashToken', sql.Char(64), hashToken(token))
      .query(`
        SELECT u.id_usuario, u.id_cuenta, u.correo, c.nombre AS nombre_cuenta
        FROM ce_sesiones s
        INNER JOIN ce_usuarios u ON u.id_usuario = s.id_usuario
        INNER JOIN ce_cuentas c ON c.id_cuenta = u.id_cuenta
        WHERE s.hash_token = @hashToken AND s.expira_en > SYSUTCDATETIME()
      `);
    const usuario = resultado.recordset[0];
    if (!usuario) return null;

    return {
      id: usuario.id_usuario,
      accountId: usuario.id_cuenta,
      email: usuario.correo,
      accountName: usuario.nombre_cuenta
    };
  }

  static async obtenerCuentaPropietaria() {
    const correo = process.env.LEGACY_OWNER_EMAIL?.trim().toLowerCase();
    const contrasena = process.env.LEGACY_OWNER_PASSWORD;

    if (!correo && !contrasena) return null;
    if (!correo || !contrasena) {
      throw new Error('Configura LEGACY_OWNER_EMAIL y LEGACY_OWNER_PASSWORD juntos.');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) || Buffer.byteLength(contrasena, 'utf8') < 12 ||
        Buffer.byteLength(contrasena, 'utf8') > 72) {
      throw new Error('La cuenta propietaria requiere un correo válido y una contraseña de 12 a 72 bytes.');
    }

    const pool = await getPool();
    const existente = await pool
      .request()
      .input('correo', sql.NVarChar(254), correo)
      .query('SELECT id_cuenta FROM ce_usuarios WHERE correo = @correo');
    if (existente.recordset[0]) return existente.recordset[0].id_cuenta;

    const nombre = process.env.LEGACY_OWNER_NAME?.trim() || 'Cuenta propietaria';
    const hashContrasena = await bcrypt.hash(contrasena, 12);
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      const cuenta = await new sql.Request(transaction)
        .input('nombre', sql.NVarChar(100), nombre)
        .query('INSERT INTO ce_cuentas (nombre) OUTPUT INSERTED.id_cuenta VALUES (@nombre)');
      const idCuenta = cuenta.recordset[0].id_cuenta;
      await new sql.Request(transaction)
        .input('idCuenta', sql.Int, idCuenta)
        .input('correo', sql.NVarChar(254), correo)
        .input('hashContrasena', sql.NVarChar(100), hashContrasena)
        .query(`
          INSERT INTO ce_usuarios (id_cuenta, correo, hash_contrasena)
          VALUES (@idCuenta, @correo, @hashContrasena)
        `);
      await transaction.commit();
      return idCuenta;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}

module.exports = Autenticacion;
