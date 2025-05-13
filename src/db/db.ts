import mysql from 'mysql2'

const pool = mysql.createPool({
  host: 'localhost', 
  user: 'root', 
  password: 'J040R007#321', 
  database: 'criptocesar', 
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
})

const promisePool = pool.promise()

export { promisePool }
