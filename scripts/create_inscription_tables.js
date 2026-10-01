import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function migrate() {
  console.log('🔄 Connecting to Hostinger MySQL Database...');
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'srv1787.hstgr.io',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'u141101294_guillermina',
    password: process.env.DB_PASS || 'Wattpad_3317',
    database: process.env.DB_NAME || 'u141101294_Academias',
  });

  try {
    console.log('🚀 Creating table `inscription_requests`...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS inscription_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        request_number VARCHAR(30) UNIQUE NOT NULL,
        course_id VARCHAR(50) DEFAULT NULL,
        course_name VARCHAR(255) NOT NULL,
        course_code VARCHAR(50) DEFAULT NULL,
        center VARCHAR(150) DEFAULT 'Academias Péndulo - Almería',
        edition VARCHAR(150) DEFAULT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name_1 VARCHAR(100) NOT NULL,
        last_name_2 VARCHAR(100) DEFAULT NULL,
        dni_nie VARCHAR(20) NOT NULL,
        birth_date DATE NOT NULL,
        phone VARCHAR(25) NOT NULL,
        email VARCHAR(150) NOT NULL,
        address VARCHAR(255) DEFAULT NULL,
        postal_code VARCHAR(10) DEFAULT NULL,
        city VARCHAR(100) DEFAULT NULL,
        province VARCHAR(100) DEFAULT NULL,
        employment_status VARCHAR(50) NOT NULL,
        company_activity VARCHAR(255) DEFAULT NULL,
        observations TEXT DEFAULT NULL,
        truth_declaration TINYINT(1) DEFAULT 1,
        subsidized_training_acceptance TINYINT(1) DEFAULT 1,
        contact_authorization TINYINT(1) DEFAULT 1,
        privacy_acceptance TINYINT(1) DEFAULT 1,
        marketing_consent TINYINT(1) DEFAULT 0,
        signature_name VARCHAR(200) NOT NULL,
        signature_date DATE NOT NULL,
        pdf_path VARCHAR(550) DEFAULT NULL,
        status ENUM('Nueva', 'En revisión', 'Pendiente de documentación', 'Contactado', 'Aceptada', 'Rechazada', 'Cerrada') DEFAULT 'Nueva',
        secretary_notes TEXT DEFAULT NULL,
        assigned_to INT DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        reviewed_at DATETIME DEFAULT NULL,
        closed_at DATETIME DEFAULT NULL,
        INDEX idx_request_num (request_number),
        INDEX idx_dni (dni_nie),
        INDEX idx_email (email),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('🚀 Creating table `inscription_request_messages`...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS inscription_request_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        request_id INT NOT NULL,
        sender_user_id INT DEFAULT NULL,
        sender_type ENUM('secretary', 'system', 'student') NOT NULL DEFAULT 'secretary',
        recipient_email VARCHAR(150) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_inscr_msg_req FOREIGN KEY (request_id) REFERENCES inscription_requests(id) ON DELETE CASCADE,
        INDEX idx_req_id (request_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('✅ Tables `inscription_requests` & `inscription_request_messages` created successfully in Hostinger MySQL!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await connection.end();
  }
}

migrate();
