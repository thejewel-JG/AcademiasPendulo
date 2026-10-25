const { query } = require('../db');

async function applyMigration016() {
  console.log('--- Applying Migration 016: Course Ordering and Enrollment Control ---');

  // 1. Add orden_visualizacion column if not exists
  const cols = await query(`SHOW COLUMNS FROM especialidades LIKE 'orden_visualizacion'`);
  if (!cols || cols.length === 0) {
    console.log('Adding column orden_visualizacion to especialidades...');
    await query(`
      ALTER TABLE especialidades 
      ADD COLUMN orden_visualizacion INT NOT NULL DEFAULT 0 
      COMMENT 'Orden de visualización manual en catálogo'
    `);
    console.log('Column orden_visualizacion added successfully.');
  } else {
    console.log('Column orden_visualizacion already exists.');
  }

  // 2. Add modificado_por_admin column if not exists
  const colsMod = await query(`SHOW COLUMNS FROM especialidades LIKE 'modificado_por_admin'`);
  if (!colsMod || colsMod.length === 0) {
    console.log('Adding column modificado_por_admin to especialidades...');
    await query(`
      ALTER TABLE especialidades 
      ADD COLUMN modificado_por_admin VARCHAR(100) DEFAULT NULL 
      COMMENT 'Administrador que modificó el estado o disponibilidad'
    `);
    console.log('Column modificado_por_admin added successfully.');
  } else {
    console.log('Column modificado_por_admin already exists.');
  }

  // 3. Initialize orden_visualizacion sequentially for existing courses if all 0
  const zeroCount = await query(`SELECT COUNT(*) as cnt FROM especialidades WHERE orden_visualizacion = 0`);
  if (zeroCount[0].cnt > 0) {
    console.log('Initializing sequential orden_visualizacion for courses...');
    const courses = await query(`SELECT id FROM especialidades ORDER BY FIELD(categoria_id, 'tmv', 'fco'), codigo ASC`);
    for (let i = 0; i < courses.length; i++) {
      await query(`UPDATE especialidades SET orden_visualizacion = ? WHERE id = ?`, [i + 1, courses[i].id]);
    }
    console.log(`Initialized orden_visualizacion for ${courses.length} courses (1 to ${courses.length}).`);
  }

  // 4. Record migration in migraciones table if table exists
  try {
    await query(`
      INSERT INTO migraciones (nombre, ejecutada_en) 
      VALUES ('016_add_course_ordering_and_enrollment_control.sql', NOW())
      ON DUPLICATE KEY UPDATE ejecutada_en = NOW()
    `);
    console.log('Recorded migration in migraciones table.');
  } catch (mErr) {
    console.warn('Note: migraciones table insert:', mErr.message);
  }

  // 5. Verify
  const sample = await query(`SELECT id, codigo, nombre, estado_disponibilidad, orden_visualizacion FROM especialidades ORDER BY orden_visualizacion ASC LIMIT 5`);
  console.log('Sample updated courses:', sample);

  console.log('--- Migration 016 Completed Successfully ---');
}

applyMigration016()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Migration 016 Error:', err);
    process.exit(1);
  });
