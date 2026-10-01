import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function inspectSchema() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'srv1787.hstgr.io',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'u141101294_guillermina',
    password: process.env.DB_PASS || 'Wattpad_3317',
    database: process.env.DB_NAME || 'u141101294_Academias',
  });

  try {
    const [roles] = await connection.query('SELECT * FROM roles');
    console.log('--- ROLES ---', roles);

    const [specialties] = await connection.query('SELECT * FROM especialidades LIMIT 10');
    console.log('--- ESPECIALIDADES ---', specialties);

    const [groups] = await connection.query('SELECT * FROM grupos LIMIT 10');
    console.log('--- GRUPOS ---', groups);
  } catch (err) {
    console.error('Inspect error:', err);
  } finally {
    await connection.end();
  }
}

inspectSchema();
