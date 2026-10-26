import mysql from 'mysql2/promise';

async function updateDb(host, user, password, database) {
  console.log(`\n--- Actualizando disponibilidad en ${host} / ${database} ---`);
  const conn = await mysql.createConnection({ host, user, password, database });

  // 1. Cerrar todas las matrículas
  await conn.query("UPDATE especialidades SET estado_disponibilidad = 'CERRADA'");

  // 2. Abrir TMVG0109 y TMVG0209 con orden prioritario 1 y 2
  await conn.query("UPDATE especialidades SET estado_disponibilidad = 'ABIERTA', orden_visualizacion = 1 WHERE codigo = 'TMVG0109'");
  await conn.query("UPDATE especialidades SET estado_disponibilidad = 'ABIERTA', orden_visualizacion = 2 WHERE codigo = 'TMVG0209'");

  // 3. Reordenar el resto de cursos cerrados correlativamente a partir de 3
  const [closed] = await conn.query("SELECT id FROM especialidades WHERE codigo NOT IN ('TMVG0109', 'TMVG0209') ORDER BY orden_visualizacion ASC, codigo ASC");
  for (let i = 0; i < closed.length; i++) {
    await conn.query("UPDATE especialidades SET orden_visualizacion = ? WHERE id = ?", [i + 3, closed[i].id]);
  }

  const [openCourses] = await conn.query("SELECT codigo, nombre, estado_disponibilidad, orden_visualizacion FROM especialidades WHERE estado_disponibilidad = 'ABIERTA' ORDER BY orden_visualizacion ASC");
  const [closedRows] = await conn.query("SELECT COUNT(id) as count FROM especialidades WHERE estado_disponibilidad = 'CERRADA'");

  console.log(`✅ Cursos con matrícula ABIERTA (${openCourses.length}):`);
  for (const c of openCourses) {
    console.log(`   [Pos ${c.orden_visualizacion}] ${c.codigo} — ${c.nombre} (${c.estado_disponibilidad})`);
  }
  console.log(`🔒 Total de cursos con matrícula CERRADA: ${closedRows[0].count}`);

  await conn.end();
}

async function run() {
  await updateDb('srv1017.hstgr.io', 'u869063079_guillermina', 'Wattpad_3317', 'u869063079_academias');
  await updateDb('srv1787.hstgr.io', 'u141101294_guillermina', 'Wattpad_3317', 'u141101294_Academias');
  console.log('\n🎉 ¡AMBAS BASES DE DATOS ACTUALIZADAS CORRECTAMENTE!\n');
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
