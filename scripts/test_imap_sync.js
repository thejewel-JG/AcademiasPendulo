import { syncMailbox } from '../mailEngine.js';

async function testSync() {
  console.log('--- Probando sincronización IMAP del buzón con Gmail ---');
  try {
    const res = await syncMailbox('acc_gmail_guillermina');
    console.log('Resultado de sincronización:', JSON.stringify(res, null, 2));
  } catch (err) {
    console.error('Error durante sync:', err);
  } finally {
    process.exit(0);
  }
}

testSync();
