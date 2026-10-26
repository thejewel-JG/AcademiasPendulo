import nodemailer from 'nodemailer';

async function testHostingerSmtp() {
  const candidates = [
    'info@penduloformacion.com',
    'secretaria@penduloformacion.com',
    'contacto@penduloformacion.com',
    'admin@penduloformacion.com',
    'info@academiaspendulo.com',
    'secretaria@academiaspendulo.com'
  ];

  for (const user of candidates) {
    const transporter = nodemailer.createTransport({
      host: 'smtp.hostinger.com',
      port: 465,
      secure: true,
      auth: {
        user: user,
        pass: 'Wattpad_3317'
      },
      tls: { rejectUnauthorized: false }
    });

    try {
      await transporter.verify();
      console.log(`✅ SUCCESS WITH: ${user}`);
      return user;
    } catch (err) {
      console.log(`❌ Failed for ${user}: ${err.message}`);
    }
  }
}

testHostingerSmtp();
