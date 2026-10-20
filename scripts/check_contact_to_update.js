import mysql from 'mysql2/promise';

async function updateContact() {
  const conn = await mysql.createConnection({
    host: 'srv1017.hstgr.io',
    user: 'u869063079_guillermina',
    password: 'Wattpad_3317',
    database: 'u869063079_academias'
  });

  console.log('--- BUSCANDO USUARIOS CON CORREO O NOMBRE GUILLERMINA ---');
  const [users] = await conn.query('SELECT id, nombre, apellidos, email, telefono FROM usuarios');
  const matchUsers = users.filter(u => (u.email && u.email.includes('guillermina')) || (u.nombre && u.nombre.toLowerCase().includes('guillermina')));
  console.log('Usuarios encontrados:', matchUsers);

  console.log('\n--- BUSCANDO CUENTAS DE CORREO ---');
  const [cuentas] = await conn.query('SELECT id, email_remoto, buzon, proveedor, configuracion_json FROM cuentas_correo');
  console.log('Cuentas encontradas:', cuentas);

  await conn.end();
}

updateContact();
