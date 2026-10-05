require('dotenv').config();
const sql = require('mssql');

// Ya no hay ningún usuario o contraseña personal escrito en el código.
// Todo sale del archivo .env, que cada quien crea a partir de .env.example.
// Con el login genérico "criollos_app" (ver sql/setup.sql), cualquier persona
// que clone el proyecto y ejecute ese script puede conectarse sin tener que
// crear una cuenta propia en SQL Server.
const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  options: {
    trustServerCertificate: true,
    encrypt: process.env.DB_ENCRYPT === 'true'
  }
};

let poolPromise = null;

function getPool() {
  if (!poolPromise) {
    poolPromise = sql
      .connect(config)
      .then((pool) => {
        console.log(`Conectado a SQL Server (${config.server} / ${config.database})`);
        return pool;
      })
      .catch((err) => {
        poolPromise = null; // permite reintentar en la siguiente petición
        console.error('Error al conectar con SQL Server:', err.message);
        throw err;
      });
  }
  return poolPromise;
}

module.exports = { sql, config, getPool };
