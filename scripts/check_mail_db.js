import pool from '../db.js';
import dotenv from 'dotenv';
dotenv.config();

const db = pool;

async function checkMailAccounts() {
  try {
    const [accounts] = await db.query('SELECT id, buzon, proveedor, estado, secreto_ref, configuracion FROM cuentas_correo');
    console.log('Current Mail Accounts in DB:', JSON.stringify(accounts, null, 2));

    const [tasks] = await db.query('SELECT id, destino_email, tipo_tarea, estado, reintentos, ultimo_error FROM tareas_correo ORDER BY creado_en DESC LIMIT 10');
    console.log('\nPending Email Tasks:', JSON.stringify(tasks, null, 2));
  } catch (err) {
    console.error('Error querying DB:', err);
  } finally {
    process.exit(0);
  }
}

checkMailAccounts();
