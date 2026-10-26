import mysql from 'mysql2/promise';

const dbs = [
  {
    name: 'DB1 (srv1017 - u869063079_academias)',
    host: '195.35.53.48',
    user: 'u869063079_guillermina',
    password: 'Wattpad_3317',
    database: 'u869063079_academias'
  },
  {
    name: 'DB2 (srv1787 - u141101294_Academias)',
    host: 'srv1787.hstgr.io',
    user: 'u141101294_guillermina',
    password: 'Wattpad_3317',
    database: 'u141101294_Academias'
  }
];

async function cleanupAccounts() {
  for (const db of dbs) {
    try {
      const conn = await mysql.createConnection(db);
      await conn.query(`DELETE FROM cuentas_correo WHERE id LIKE 'test_acc_%'`);
      await conn.query(`UPDATE cuentas_correo SET estado = 'INACTIVA' WHERE buzon != 'info.academiaspendulo@gmail.com'`);
      await conn.query(`UPDATE cuentas_correo SET estado = 'ACTIVA' WHERE buzon = 'info.academiaspendulo@gmail.com'`);
      
      const [rows] = await conn.query('SELECT id, buzon, estado FROM cuentas_correo');
      console.log(`Cuentas en ${db.name}:`, rows);
      await conn.end();
    } catch (e) {
      console.error(`Error en ${db.name}:`, e.message);
    }
  }
}

cleanupAccounts();
