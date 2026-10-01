import dotenv from 'dotenv';
dotenv.config();

async function testEmploymentPool() {
  console.log('--- PROBANDO ENDPOINT PÚBLICO /api/public/employment-pool ---');
  
  const testCandidate = {
    nombre: 'Carlos Electromecánico',
    telefono: '699112233',
    email: 'guillerminajoya@gmail.com', // Usamos tu correo para recibir la notificación de prueba
    ciudad: 'Almería',
    especialidad: 'Electromecánica y Diagnóstico Avanzado ADAS',
    titulacion: 'Certificado de Profesionalidad Oficial (Nivel 3)',
    experiencia: 'De 3 a 5 años',
    disponibilidad: 'Inmediata (Jornada Completa)',
    observaciones: 'Experiencia en equipos Bosch KTS, Texa y reparación de sistemas de inyección y electromecánica general en taller oficial.'
  };

  try {
    const res = await fetch('http://localhost:3000/api/public/employment-pool', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testCandidate)
    });

    console.log('HTTP Status:', res.status);
    const data = await res.json();
    console.log('API Response:', data);

  } catch (err) {
    console.error('API Test Error:', err.message);
  } finally {
    process.exit(0);
  }
}

testEmploymentPool();
