require('dotenv').config();
const sql = require('mssql');


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
