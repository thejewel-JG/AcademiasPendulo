import { query } from '../db.js';

async function main() {
  console.log('--- CREANDO TABLA candidaturas_trabajo EN HOSTINGER MYSQL ---');
  await query(`
    CREATE TABLE IF NOT EXISTS candidaturas_trabajo (
      id VARCHAR(64) PRIMARY KEY,
      nombre VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      telefono VARCHAR(64) NOT NULL,
      puesto VARCHAR(100) NOT NULL,
      observaciones TEXT,
      cv_nombre VARCHAR(255),
      cv_ruta VARCHAR(255),
      estado ENUM('PENDIENTE', 'REVISADO', 'EN_PROCESO', 'DESCARTADO', 'SELECCIONADO') NOT NULL DEFAULT 'PENDIENTE',
      creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_cand_email (email),
      INDEX idx_cand_puesto (puesto),
      INDEX idx_cand_estado (estado),
      INDEX idx_cand_fecha (creado_en)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('✅ TABLA candidaturas_trabajo CREADA / VERIFICADA CORRECTAMENTE!');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Error creando tabla candidaturas_trabajo:', err);
  process.exit(1);
});
