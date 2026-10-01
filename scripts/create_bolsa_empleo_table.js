import pool from '../db.js';

async function createTable() {
  console.log('--- CREANDO TABLA bolsa_empleo EN HOSTINGER MYSQL ---');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bolsa_empleo (
      id VARCHAR(64) PRIMARY KEY,
      nombre VARCHAR(150) NOT NULL,
      telefono VARCHAR(30) NOT NULL,
      email VARCHAR(150) NOT NULL,
      ciudad VARCHAR(100) DEFAULT NULL,
      especialidad VARCHAR(150) NOT NULL,
      titulacion VARCHAR(150) DEFAULT NULL,
      experiencia VARCHAR(100) DEFAULT NULL,
      disponibilidad VARCHAR(100) DEFAULT NULL,
      observaciones TEXT DEFAULT NULL,
      estado ENUM('ACTIVO', 'CONTRATADO', 'DESCARTADO') DEFAULT 'ACTIVO',
      creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('✅ TABLA bolsa_empleo CREADA / LISTA!');
  process.exit(0);
}

createTable().catch(err => {
  console.error('Error al crear tabla:', err);
  process.exit(1);
});
