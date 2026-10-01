import dotenv from 'dotenv';
dotenv.config();

async function testContactApi() {
  console.log('--- PROBANDO ENDPOINT PÚBLICO /api/public/contact ---');
  
  const testPayload = {
    first_name: 'María',
    last_name: 'Pruebas',
    email: 'guillerminajoya@gmail.com', // Usamos tu correo para recibir ambos emails de prueba
    phone: '612345678',
    course_id: 'TMVG0004',
    course_code: 'TMVG0004',
    course_name: 'Mantenimiento de Vehículos Híbridos y Eléctricos',
    preferred_schedule: 'Mañana (09:00 - 14:00)',
    employment_status: 'Desempleado / Demandante de empleo',
    comments: 'Solicitud de prueba enviada desde la página principal.',
    source: 'Formulario Web Principal'
  };

  try {
    const res = await fetch('http://localhost:3000/api/public/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload)
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

testContactApi();
