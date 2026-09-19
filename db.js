import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Create connection pool to Hostinger MySQL
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'srv1787.hstgr.io',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'u141101294_guillermina',
  password: process.env.DB_PASS || 'Wattpad_3317',
  database: process.env.DB_NAME || 'u141101294_Academias',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000,
});

// Helper for executing queries
export async function query(sql, params = []) {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (err) {
    console.error(`[DB ERROR] Query failed: ${sql}`, err.message);
    throw err;
  }
}

export default pool;
