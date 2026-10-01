import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function migrate() {
  console.log('🔄 Connecting to Hostinger MySQL Database for Prompt 2 Migration...');
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'srv1787.hstgr.io',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'u141101294_guillermina',
    password: process.env.DB_PASS || 'Wattpad_3317',
    database: process.env.DB_NAME || 'u141101294_Academias',
  });

  try {
    console.log('🚀 Updating `inscription_requests` columns & status ENUM...');

    // 1. Add converted columns if not present
    try {
      await connection.query(`
        ALTER TABLE inscription_requests
        ADD COLUMN converted_to_student TINYINT(1) DEFAULT 0 AFTER pdf_path,
        ADD COLUMN student_user_id VARCHAR(100) DEFAULT NULL AFTER converted_to_student,
        ADD COLUMN converted_at DATETIME DEFAULT NULL AFTER student_user_id;
      `);
      console.log('✅ Added conversion columns to `inscription_requests`.');
    } catch (e) {
      console.log('ℹ️ Conversion columns already exist in `inscription_requests`.');
    }

    // 2. Modify ENUM status to include 'Matriculado'
    await connection.query(`
      ALTER TABLE inscription_requests
      MODIFY COLUMN status ENUM('Nueva', 'En revisión', 'Pendiente de documentación', 'Contactado', 'Aceptada', 'Rechazada', 'Cerrada', 'Matriculado') DEFAULT 'Nueva';
    `);
    console.log('✅ Updated status ENUM to include `Matriculado`.');

    // 3. Create `inscription_request_history`
    await connection.query(`
      CREATE TABLE IF NOT EXISTS inscription_request_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        request_id INT NOT NULL,
        user_id VARCHAR(100) DEFAULT NULL,
        event_type VARCHAR(50) NOT NULL,
        description TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_inscr_hist_req FOREIGN KEY (request_id) REFERENCES inscription_requests(id) ON DELETE CASCADE,
        INDEX idx_hist_req (request_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ Created table `inscription_request_history`.');

    // 4. Create `account_activation_tokens`
    await connection.query(`
      CREATE TABLE IF NOT EXISTS account_activation_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(100) NOT NULL,
        token_hash VARCHAR(64) NOT NULL,
        expires_at DATETIME NOT NULL,
        used_at DATETIME DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_token_hash (token_hash),
        INDEX idx_user_token (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ Created table `account_activation_tokens`.');

    console.log('🎉 Prompt 2 Migration completed successfully!');
  } catch (err) {
    console.error('❌ Migration error:', err);
  } finally {
    await connection.end();
  }
}

migrate();
