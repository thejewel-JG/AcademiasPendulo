import dotenv from 'dotenv';
dotenv.config();

async function testHostingerApi() {
  const token = process.env.HOSTINGER_API_TOKEN;
  console.log('\n--- TESTING HOSTINGER API ---');
  console.log('Token prefix:', token ? token.substring(0, 10) + '...' : 'NONE');

  if (!token) {
    console.error('No HOSTINGER_API_TOKEN found in .env');
    process.exit(1);
  }

  try {
    const res = await fetch('https://api.hostinger.com/v1/emails', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    console.log('API Status:', res.status, res.statusText);
    const data = await res.json().catch(() => ({}));
    console.log('API Response:', JSON.stringify(data, null, 2));

  } catch (err) {
    console.error('Hostinger API Error:', err.message);
  } finally {
    process.exit(0);
  }
}

testHostingerApi();
