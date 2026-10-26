import pool from '../db.js';

async function checkAdmin() {
  const [users] = await pool.query(`
    SELECT u.id, u.email, u.estado, ur.rol 
    FROM usuarios u 
    LEFT JOIN usuario_roles ur ON u.id = ur.usuario_id 
    WHERE u.email LIKE '%admin%' OR u.email LIKE '%pendulo%'
  `);
  console.log('ADMIN USERS IN DB1:', users);
  process.exit(0);
}

checkAdmin();
