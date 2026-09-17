const sql = require('mssql');

const config = {
  user: 'alejandroachury',
  password: 'alejandro18!',
  server: 'localhost\\SQLEXPRESS',
  database: 'Pollos',
  options: {
    trustServerCertificate: true,
    encrypt: true
  }
};


module.exports = { sql, config };
