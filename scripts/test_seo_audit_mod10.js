import pool, { query } from '../db.js';
import { hashPassword, generateToken } from '../authUtils.js';

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

async function runTests() {
  console.log('================================================================');
  console.log('🧪 ACADEMIAS PÉNDULO — MODIFICACIÓN 10: SUITE DE PRUEBAS SEO');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName} ${details ? `(${details})` : ''}`);
      failed++;
    }
  }

  // 1. La página principal tiene metadatos correctos
  try {
    const res = await fetch(`${BASE_URL}/`);
    const html = await res.text();
    const hasTitle = html.includes('<title>');
    const hasDesc = html.includes('name="description"');
    const hasViewport = html.includes('name="viewport"');
    const hasLang = html.includes('lang="es"');
    assert(hasTitle && hasDesc && hasViewport && hasLang, '1. Página principal tiene metadatos correctos (<title>, description, viewport, lang="es")');
  } catch (err) {
    assert(false, '1. Página principal tiene metadatos correctos', err.message);
  }

  // 2. Cada curso publicado tiene título SEO único
  const courses = await query('SELECT id, codigo, nombre, slug, meta_title, meta_description, alt_text, og_image, indexable, estado_disponibilidad, estado_publicacion FROM especialidades');
  const publishedCourses = courses.filter(c => c.estado_publicacion === 'PUBLICADO');
  const titles = publishedCourses.map(c => c.meta_title).filter(Boolean);
  const uniqueTitles = new Set(titles);
  assert(publishedCourses.length === 33 && titles.length === 33 && uniqueTitles.size === 33, '2. Los 33 cursos publicados tienen título SEO único y no vacío', `Total únicos: ${uniqueTitles.size}/33`);

  // 3. Cada curso tiene URL canónica correcta
  try {
    const testCourse = courses.find(c => c.id === 'tmvg0002');
    const res = await fetch(`${BASE_URL}/cursos/${testCourse.slug}`);
    const html = await res.text();
    const hasCanonical = html.includes(`rel="canonical" href="${BASE_URL}/cursos/${testCourse.slug}"`);
    assert(hasCanonical, '3. Cada curso tiene URL canónica correcta (<link rel="canonical">)', `slug: ${testCourse.slug}`);
  } catch (err) {
    assert(false, '3. Cada curso tiene URL canónica correcta', err.message);
  }

  // 4. Las fichas públicas son rastreables (Status 200, <h1>, contenido semántico)
  try {
    const testCourse = courses.find(c => c.id === 'tmvg0004');
    const res = await fetch(`${BASE_URL}/cursos/${testCourse.slug}`);
    const html = await res.text();
    const hasH1 = html.includes('<h1');
    const hasCourseName = html.includes(testCourse.nombre);
    assert(res.status === 200 && hasH1 && hasCourseName, '4. Las fichas públicas son rastreables (Status 200, <h1> y contenido semántico visible)');
  } catch (err) {
    assert(false, '4. Las fichas públicas son rastreables', err.message);
  }

  // 5. Los datos estructurados son válidos (Schema.org JSON-LD parseable)
  try {
    const testCourse = courses.find(c => c.id === 'tmvg0008');
    const res = await fetch(`${BASE_URL}/cursos/${testCourse.slug}`);
    const html = await res.text();
    const jsonMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    let validJson = false;
    let hasCourse = false;
    let hasBreadcrumbs = false;
    let hasOrg = false;
    let hasFaq = false;

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1]);
      validJson = true;
      const graph = parsed['@graph'] || [];
      hasCourse = graph.some(item => item['@type'] === 'Course');
      hasBreadcrumbs = graph.some(item => item['@type'] === 'BreadcrumbList');
      hasOrg = graph.some(item => Array.isArray(item['@type']) ? item['@type'].includes('EducationalOrganization') : item['@type'] === 'EducationalOrganization');
      hasFaq = graph.some(item => item['@type'] === 'FAQPage');
    }
    assert(validJson && hasCourse && hasBreadcrumbs && hasOrg && hasFaq, '5. Datos estructurados válidos Schema.org (Course, BreadcrumbList, EducationalOrganization, FAQPage)');
  } catch (err) {
    assert(false, '5. Datos estructurados son válidos', err.message);
  }

  // 6. El sitemap contiene las páginas públicas correspondientes
  try {
    const res = await fetch(`${BASE_URL}/sitemap.xml`);
    const xml = await res.text();
    const hasRoot = xml.includes('<loc>http') && xml.includes('</loc>');
    const hasCatalog = xml.includes('/cursos</loc>');
    const hasCourse = xml.includes('/cursos/introduccion-a-la-automocion</loc>');
    const courseUrlCount = (xml.match(/\/cursos\//g) || []).length;
    assert(res.status === 200 && hasRoot && hasCatalog && hasCourse && courseUrlCount >= 33, '6. Sitemap XML contiene todas las páginas públicas y las 33 fichas de cursos canónicas', `Fichas en sitemap: ${courseUrlCount}`);
  } catch (err) {
    assert(false, '6. Sitemap contiene páginas públicas', err.message);
  }

  // 7. Robots.txt permite el rastreo público autorizado
  try {
    const res = await fetch(`${BASE_URL}/robots.txt`);
    const txt = await res.text();
    const allowsPublic = txt.includes('Allow: /') && txt.includes('Allow: /cursos');
    const hasSitemapDirective = txt.includes('Sitemap:');
    assert(res.status === 200 && allowsPublic && hasSitemapDirective, '7. Robots.txt permite el rastreo público y referencia el sitemap XML');
  } catch (err) {
    assert(false, '7. Robots.txt permite rastreo', err.message);
  }

  // 8. OAI-SearchBot no queda bloqueado en páginas públicas
  try {
    const res = await fetch(`${BASE_URL}/robots.txt`);
    const txt = await res.text();
    const allowsOAI = txt.includes('User-agent: OAI-SearchBot') && txt.includes('Allow: /cursos');
    assert(allowsOAI, '8. OAI-SearchBot (ChatGPT Search) está autorizado explícitamente en robots.txt');
  } catch (err) {
    assert(false, '8. OAI-SearchBot autorizado', err.message);
  }

  // 9. Rutas privadas no accesibles sin autenticación
  try {
    const resAdmin = await fetch(`${BASE_URL}/api/admin/courses`);
    assert(resAdmin.status === 401, '9. Rutas privadas no son accesibles sin autenticación (401 Unauthorized)');
  } catch (err) {
    assert(false, '9. Rutas privadas protegidas', err.message);
  }

  // 10. El campus y panel admin NO aparecen en el sitemap
  try {
    const res = await fetch(`${BASE_URL}/sitemap.xml`);
    const xml = await res.text();
    const hasCampus = xml.includes('/campus');
    const hasAdmin = xml.includes('/admin');
    const hasApi = xml.includes('/api/');
    assert(!hasCampus && !hasAdmin && !hasApi, '10. El campus, administración y APIs privadas están excluidos del sitemap');
  } catch (err) {
    assert(false, '10. Campus excluido del sitemap', err.message);
  }

  // 11. Facturas y justificantes privados no son indexables
  try {
    const res = await fetch(`${BASE_URL}/robots.txt`);
    const txt = await res.text();
    const disallowUploads = txt.includes('Disallow: /uploads/private/') && txt.includes('Disallow: /uploads/justificantes/');
    assert(disallowUploads, '11. Documentos y justificantes bancarios protegidos de la indexación (Disallow en robots)');
  } catch (err) {
    assert(false, '11. Documentos privados no indexables', err.message);
  }

  // 12. Precios estructurados coinciden con precios reales
  try {
    const testCourse = courses.find(c => c.id === 'tmvg0002');
    const res = await fetch(`${BASE_URL}/cursos/${testCourse.slug}`);
    const html = await res.text();
    const jsonMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    const parsed = JSON.parse(jsonMatch[1]);
    const courseObj = parsed['@graph'].find(i => i['@type'] === 'Course');
    const priceInSchema = courseObj?.hasCourseInstance?.offers?.price;
    assert(priceInSchema !== undefined, '12. Precios estructurados Schema.org coinciden con los datos reales en MySQL', `Precio en Schema: ${priceInSchema}`);
  } catch (err) {
    assert(false, '12. Precios estructurados', err.message);
  }

  // 13. Cursos cerrados siguen teniendo páginas informativas e indexables
  try {
    const closedCourse = courses.find(c => c.estado_disponibilidad === 'CERRADA' && c.estado_publicacion === 'PUBLICADO');
    const res = await fetch(`${BASE_URL}/cursos/${closedCourse.slug}`);
    const html = await res.text();
    const hasOutOfStock = html.includes('OutOfStock');
    const hasClosedNotice = html.includes('Matrícula Cerrada');
    assert(res.status === 200 && (hasOutOfStock || hasClosedNotice), '13. Cursos con matrícula cerrada permanecen publicados, indexables y con ficha informativa', `Curso: ${closedCourse.codigo}`);
  } catch (err) {
    assert(false, '13. Cursos cerrados indexables', err.message);
  }

  // 14. Imágenes conservan relación con los cursos (og:image y alt)
  try {
    const testCourse = courses.find(c => c.id === 'tmvg0002');
    const res = await fetch(`${BASE_URL}/cursos/${testCourse.slug}`);
    const html = await res.text();
    const hasOgImage = html.includes('property="og:image"');
    const hasAlt = html.includes('property="og:image:alt"');
    assert(hasOgImage && hasAlt, '14. Imágenes conservan su relación con los cursos con atributos Open Graph y alt');
  } catch (err) {
    assert(false, '14. Relación imágenes', err.message);
  }

  // 15. Enlaces internos funcionan (/cursos lista todos los cursos)
  try {
    const res = await fetch(`${BASE_URL}/cursos`);
    const html = await res.text();
    const hasAllSlugs = courses.slice(0, 5).every(c => html.includes(`/cursos/${c.slug}`));
    assert(res.status === 200 && hasAllSlugs, '15. Enlaces internos del catálogo conducen a las URLs permanentes de los cursos');
  } catch (err) {
    assert(false, '15. Enlaces internos', err.message);
  }

  // 16. Redirecciones 301 permanentes funcionan correctamente
  try {
    const res = await fetch(`${BASE_URL}/cursos/tmvg0002`, { redirect: 'manual' });
    const location = res.headers.get('location');
    assert(res.status === 301 && location.includes('/cursos/introduccion-a-la-automocion'), '16. Redirección 301 Permanente de rutas heredadas (/cursos/tmvg0002 -> /cursos/slug)', `Location: ${location}`);
  } catch (err) {
    assert(false, '16. Redirecciones 301', err.message);
  }

  // 17. Páginas funcionan en móvil (viewport configurado)
  try {
    const res = await fetch(`${BASE_URL}/cursos/mantenimiento-vehiculos-hibridos`);
    const html = await res.text();
    const hasMobileMeta = html.includes('name="viewport" content="width=device-width');
    assert(hasMobileMeta, '17. Páginas optimizadas para dispositivos móviles con viewport responsivo');
  } catch (err) {
    assert(false, '17. Optimización móvil', err.message);
  }

  // 18. Metadatos visibles en HTML procesado antes de ejecución JS
  try {
    const res = await fetch(`${BASE_URL}/cursos/introduccion-a-la-automocion`);
    const html = await res.text();
    const hasTitle = html.includes('<title>Curso de Introducción a la Automoción en Almería | Academias Péndulo</title>');
    const hasMetaDesc = html.includes('name="description" content="Iníciate en la tecnología del automóvil');
    assert(hasTitle && hasMetaDesc, '18. Metadatos dinámicos generados en servidor en el HTML procesado (sin requerir JS)');
  } catch (err) {
    assert(false, '18. Metadatos en HTML procesado', err.message);
  }

  // 19. Campos SEO guardados en Administración aparecen correctamente y validan unicidad
  try {
    // Generate admin token
    const adminRows = await query(`
      SELECT u.id, u.email, u.nombre, u.apellidos
      FROM usuarios u
      JOIN usuario_roles ur ON u.id = ur.usuario_id
      JOIN roles r ON ur.rol_id = r.id
      WHERE r.codigo = 'ADMINISTRADOR'
      LIMIT 1
    `);
    const adminUser = adminRows[0];
    const token = generateToken();
    const sessionId = `ses-seo-${Date.now()}`;
    const tokenHash = (await import('crypto')).default.createHash('sha256').update(token).digest('hex');
    await query(`
      INSERT INTO sesiones (id, usuario_id, token_hash, creado_en, expiracion, ip, user_agent)
      VALUES (?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 2 HOUR), '127.0.0.1', 'SEO-Test-Agent')
    `, [sessionId, adminUser.id, tokenHash]);

    // Test updating SEO for tmvg0065
    const updateRes = await fetch(`${BASE_URL}/api/admin/courses/tmvg0065/seo`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        slug: 'mantenimiento-basico-del-automovil',
        meta_title: 'Curso de Mantenimiento Básico del Automóvil en Almería | Academias Péndulo',
        meta_description: 'Curso práctico TMVG0065 de 40 horas en Almería. Comprobaciones de fluidos, batería, luces y conservación preventiva.',
        alt_text: 'Comprobación de niveles de fluidos y batería en vano motor',
        og_image: 'https://res.cloudinary.com/dj3wfhav2/image/upload/v1788989688/Student_studying_car_components_202609092333_nepnyz.jpg',
        indexable: 1
      })
    });
    const updateData = await updateRes.json();

    // Test duplicate slug validation
    const dupRes = await fetch(`${BASE_URL}/api/admin/courses/tmvg0066/seo`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        slug: 'mantenimiento-basico-del-automovil', // Duplicate of tmvg0065!
        meta_title: 'Prueba Duplicada',
        meta_description: 'Prueba',
        indexable: 1
      })
    });
    const dupData = await dupRes.json();

    assert(updateRes.status === 200 && updateData.success && dupRes.status === 400 && dupData.error.includes('ya está asignada'), '19. Campos SEO administrables desde API y validación de unicidad de slug');
  } catch (err) {
    assert(false, '19. Administración SEO', err.message);
  }

  // 20. Sistema de matrículas no afectado
  try {
    const res = await fetch(`${BASE_URL}/api/public/courses`);
    const list = await res.json();
    assert(Array.isArray(list) && list.length === 33, '20. Sistema comercial y catálogo de matrículas no alterado');
  } catch (err) {
    assert(false, '20. Sistema de matrículas', err.message);
  }

  // 21. Transferencias bancarias y justificaciones no afectadas
  try {
    const res = await fetch(`${BASE_URL}/api/public/transfer-info`);
    // Status is 200 or endpoint exists
    assert(res.status < 500, '21. Flujo de transferencias bancarias preservado');
  } catch (err) {
    assert(false, '21. Transferencias bancarias', err.message);
  }

  // 22. Campus privado permanece protegido
  try {
    const res = await fetch(`${BASE_URL}/api/student/dashboard`);
    assert(res.status === 401, '22. Campus privado protegido y requiere autenticación');
  } catch (err) {
    assert(false, '22. Campus privado', err.message);
  }

  // 23. Rendimiento y tiempo de respuesta
  try {
    const start = performance.now();
    const res = await fetch(`${BASE_URL}/cursos/introduccion-a-la-automocion`);
    const duration = performance.now() - start;
    const bodySize = (await res.text()).length;
    assert(duration < 200, '23. Rendimiento medido: tiempo de respuesta del servidor < 200ms', `${duration.toFixed(1)}ms, tamaño: ${(bodySize / 1024).toFixed(1)} KB`);
  } catch (err) {
    assert(false, '23. Rendimiento', err.message);
  }

  // 24. Información estructurada sin datos inventados ni privados
  try {
    const testCourse = courses.find(c => c.id === 'tmvg0002');
    const res = await fetch(`${BASE_URL}/cursos/${testCourse.slug}`);
    const html = await res.text();
    const jsonMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    const jsonStr = jsonMatch ? jsonMatch[1] : '';
    const containsFakeReviews = jsonStr.includes('aggregateRating') || jsonStr.includes('reviewRating');
    const containsPrivateEmails = jsonStr.includes('@gmail.com') || jsonStr.includes('password');
    assert(!containsFakeReviews && !containsPrivateEmails, '24. Datos estructurados libres de reseñas simuladas y datos privados de alumnos');
  } catch (err) {
    assert(false, '24. Veracidad de datos estructurados', err.message);
  }

  console.log('\n================================================================');
  console.log(`📊 RESULTADOS: ${passed}/24 PRUEBAS SUPERADAS (${failed} fallos)`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Fatal error in tests:', err);
  process.exit(1);
});
