import fetch from 'node-fetch';

async function testSubmit() {
  console.log('🧪 Testing POST /api/public/inscription-request...');

  const payload = {
    course_name: 'Mantenimiento Electromecánico de Vehículos',
    course_code: 'TMVG0209',
    center: 'Academias Péndulo - Almería',
    edition: 'Convocatoria 2026',
    first_name: 'Administración',
    last_name_1: 'Péndulo',
    last_name_2: 'Centro',
    dni_nie: '12345678Z',
    birth_date: '1995-05-15',
    phone: '620351622',
    email: 'info.academiaspendulo@gmail.com',
    address: 'Carrera Doctoral 26',
    postal_code: '04005',
    city: 'Almería',
    province: 'Almería',
    employment_status: 'desempleado/a',
    company_activity: 'Sector Automoción',
    observations: 'Prueba de envío telemático de solicitud de inscripción subvencionada.',
    truth_declaration: true,
    subsidized_training_acceptance: true,
    contact_authorization: true,
    privacy_acceptance: true,
    marketing_consent: true,
    signature_name: 'Administración Academias Péndulo',
    signature_date: '2026-09-29'
  };

  try {
    const res = await fetch('http://localhost:3000/api/public/inscription-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    console.log('Result Status:', res.status);
    console.log('Result Data:', data);
  } catch (err) {
    console.error('Test Error:', err);
  }
}

testSubmit();
