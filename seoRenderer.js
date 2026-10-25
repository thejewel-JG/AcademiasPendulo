import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = process.env.PUBLIC_URL || 'https://academiaspendulo.com';

// Official Academy Information for Schema.org & SEO
export const CENTER_INFO = {
  name: 'ACADEMIAS PÉNDULO',
  legalName: 'Academias Péndulo S.L.',
  officialCode: '0400030892',
  description: 'Centro oficial de formación profesional privada homologado por la Junta de Andalucía y el SEPE, especializado en automoción, diagnosis avanzada, vehículos híbridos y eléctricos, y prevención de riesgos laborales.',
  address: {
    streetAddress: 'Carrera Doctoral 26',
    postalCode: '04005',
    addressLocality: 'Almería',
    addressRegion: 'Almería, Andalucía',
    addressCountry: 'ES'
  },
  telephone: '+34 620 35 16 22',
  phoneClean: '+34620351622',
  email: 'info@academiaspendulo.com',
  openingHours: 'Mo-Fr 08:30-20:30',
  geo: {
    latitude: 36.8381,
    longitude: -2.4597
  },
  url: BASE_URL,
  logo: 'https://res.cloudinary.com/dj3wfhav2/image/upload/v1788989228/Man_recording_vlog_in_refuge_202609052350_xgqnrb.jpg',
  defaultOgImage: 'https://res.cloudinary.com/dj3wfhav2/image/upload/v1788989687/Modern_car_in_calibration_bay_202609092333_srugod.jpg'
};

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getIndexHtmlTemplate() {
  const distPath = path.join(__dirname, 'dist', 'index.html');
  if (fs.existsSync(distPath)) {
    return fs.readFileSync(distPath, 'utf8');
  }
  const rootPath = path.join(__dirname, 'index.html');
  if (fs.existsSync(rootPath)) {
    return fs.readFileSync(rootPath, 'utf8');
  }
  return '<!doctype html><html lang="es"><head><meta charset="UTF-8"><title>Academias Péndulo</title></head><body><div id="root"></div></body></html>';
}

/**
 * Generate Schema.org JSON-LD graph for EducationalOrganization / LocalBusiness
 */
export function getOrganizationSchema(baseUrl = BASE_URL) {
  return {
    '@type': ['EducationalOrganization', 'LocalBusiness'],
    '@id': `${baseUrl}/#organization`,
    'name': CENTER_INFO.name,
    'legalName': CENTER_INFO.legalName,
    'identifier': CENTER_INFO.officialCode,
    'url': baseUrl,
    'logo': {
      '@type': 'ImageObject',
      'url': CENTER_INFO.logo,
      'caption': 'Logotipo Oficial de Academias Péndulo Almería'
    },
    'image': CENTER_INFO.defaultOgImage,
    'description': CENTER_INFO.description,
    'telephone': CENTER_INFO.telephone,
    'email': CENTER_INFO.email,
    'address': {
      '@type': 'PostalAddress',
      'streetAddress': CENTER_INFO.address.streetAddress,
      'postalCode': CENTER_INFO.address.postalCode,
      'addressLocality': CENTER_INFO.address.addressLocality,
      'addressRegion': CENTER_INFO.address.addressRegion,
      'addressCountry': CENTER_INFO.address.addressCountry
    },
    'geo': {
      '@type': 'GeoCoordinates',
      'latitude': CENTER_INFO.geo.latitude,
      'longitude': CENTER_INFO.geo.longitude
    },
    'openingHoursSpecification': [
      {
        '@type': 'OpeningHoursSpecification',
        'dayOfWeek': ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        'opens': '08:30',
        'closes': '20:30'
      }
    ],
    'hasCredential': {
      '@type': 'EducationalOccupationalCredential',
      'credentialCategory': 'Centro Homologado Junta de Andalucía y SEPE',
      'recognizedBy': {
        '@type': 'GovernmentOrganization',
        'name': 'Junta de Andalucía - Consejería de Empleo, Empresa y Trabajo Autónomo'
      }
    }
  };
}

/**
 * Render single course page HTML with SSR metadata, schema.org and semantic pre-rendered body
 */
export function renderCoursePage(course, baseUrl = BASE_URL) {
  let template = getIndexHtmlTemplate();

  const courseUrl = `${baseUrl}/cursos/${course.slug}`;
  const title = course.meta_title || `${course.nombre} en Almería | Academias Péndulo`;
  const description = course.meta_description || course.descripcion || `Información oficial del curso ${course.nombre} en Academias Péndulo Almería.`;
  const ogImage = course.og_image || CENTER_INFO.defaultOgImage;
  const altText = course.alt_text || `Curso ${course.nombre} en taller de Academias Péndulo Almería`;
  const isIndexable = course.indexable === 1 && course.estado_publicacion === 'PUBLICADO';
  const robotsDirective = isIndexable ? 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1' : 'noindex, nofollow';

  // Format price
  let offerSchema = null;
  if (course.estado_precio === 'CONFIGURADO' && course.precio_final !== null && course.precio_final !== undefined) {
    offerSchema = {
      '@type': 'Offer',
      'price': String(course.precio_final),
      'priceCurrency': 'EUR',
      'availability': course.estado_disponibilidad === 'ABIERTA' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      'url': courseUrl,
      'validFrom': course.fecha_apertura_inscripcion || undefined
    };
  } else {
    offerSchema = {
      '@type': 'Offer',
      'price': '0.00',
      'priceCurrency': 'EUR',
      'availability': course.estado_disponibilidad === 'ABIERTA' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      'url': courseUrl,
      'priceSpecification': {
        '@type': 'PriceSpecification',
        'priceCurrency': 'EUR',
        'description': 'Curso subvencionado o precio a consultar en secretaría'
      }
    };
  }

  // Schema.org JSON-LD
  const schemaGraph = {
    '@context': 'https://schema.org',
    '@graph': [
      getOrganizationSchema(baseUrl),
      {
        '@type': 'BreadcrumbList',
        '@id': `${courseUrl}#breadcrumb`,
        'itemListElement': [
          {
            '@type': 'ListItem',
            'position': 1,
            'name': 'Inicio',
            'item': `${baseUrl}/`
          },
          {
            '@type': 'ListItem',
            'position': 2,
            'name': 'Catálogo de Cursos',
            'item': `${baseUrl}/cursos`
          },
          {
            '@type': 'ListItem',
            'position': 3,
            'name': course.nombre,
            'item': courseUrl
          }
        ]
      },
      {
        '@type': 'Course',
        '@id': `${courseUrl}#course`,
        'name': course.nombre,
        'courseCode': course.codigo,
        'description': course.descripcion,
        'provider': {
          '@id': `${baseUrl}/#organization`
        },
        'educationalCredentialAwarded': course.nivel || 'Especialidad Oficial Autorizada',
        'hasCourseInstance': {
          '@type': 'CourseInstance',
          'courseMode': course.modalidad || 'Presencial',
          'courseWorkload': `PT${course.horas_totales || 40}H`,
          'location': {
            '@type': 'Place',
            'name': 'Sede Principal Academias Péndulo',
            'address': {
              '@type': 'PostalAddress',
              'streetAddress': CENTER_INFO.address.streetAddress,
              'postalCode': CENTER_INFO.address.postalCode,
              'addressLocality': CENTER_INFO.address.addressLocality,
              'addressRegion': CENTER_INFO.address.addressRegion,
              'addressCountry': 'ES'
            }
          },
          'offers': offerSchema
        }
      },
      {
        '@type': 'FAQPage',
        '@id': `${courseUrl}#faq`,
        'mainEntity': [
          {
            '@type': 'Question',
            'name': `¿Dónde se imparte el curso de ${course.nombre}?`,
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': `El curso se imparte en modalidad ${course.modalidad} en las instalaciones homologadas de Academias Péndulo en Carrera Doctoral 26, 04005 Almería (Centro Homologado Nº 0400030892).`
            }
          },
          {
            '@type': 'Question',
            'name': `¿Cuántas horas de duración tiene este curso?`,
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': `El curso consta de ${course.horas_totales} horas lectivas oficiales, incluyendo ${course.horas_practicas || 0} horas de prácticas reales en taller con equipamiento técnico.`
            }
          },
          {
            '@type': 'Question',
            'name': `¿Cómo puedo solicitar plaza o consultar la matrícula?`,
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': `Puedes solicitar información o formalizar tu preinscripción a través de nuestra web oficial, llamando al teléfono 620 351 622 o acudiendo a nuestras oficinas en Almería. Las solicitudes son revisadas por Secretaría.`
            }
          },
          {
            '@type': 'Question',
            'name': `¿Puedo solicitar información si la matrícula aparece como cerrada?`,
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': `Sí. Cuando un curso tiene matrícula cerrada, la ficha informativa permanece pública y puedes dejar tus datos para que secretaría te avise prioritariamente de la apertura de la próxima convocatoria.`
            }
          }
        ]
      }
    ]
  };

  // Replace Title
  template = template.replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);

  // Replace or inject Description
  if (template.includes('name="description"')) {
    template = template.replace(/<meta name="description" content=".*?"\s*\/?>/i, `<meta name="description" content="${escapeHtml(description)}" />`);
  } else {
    template = template.replace('</head>', `  <meta name="description" content="${escapeHtml(description)}" />\n</head>`);
  }

  // Canonical tag
  const canonicalTag = `  <link rel="canonical" href="${courseUrl}" />\n`;

  // Robots meta
  const robotsTag = `  <meta name="robots" content="${robotsDirective}" />\n`;

  // Open Graph & Twitter Cards
  const socialMeta = `
  <!-- Metadatos Open Graph y Redes Sociales -->
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${courseUrl}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Academias Péndulo" />
  <meta property="og:locale" content="es_ES" />
  <meta property="og:image" content="${ogImage}" />
  <meta property="og:image:alt" content="${escapeHtml(altText)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${ogImage}" />
  <meta name="twitter:image:alt" content="${escapeHtml(altText)}" />

  <!-- Verificación para herramientas webmaster si están configuradas -->
  ${process.env.GOOGLE_SITE_VERIFICATION ? `<meta name="google-site-verification" content="${process.env.GOOGLE_SITE_VERIFICATION}" />` : ''}
  ${process.env.BING_SITE_VERIFICATION ? `<meta name="msvalidate.01" content="${process.env.BING_SITE_VERIFICATION}" />` : ''}

  <!-- Datos Estructurados Schema.org JSON-LD -->
  <script type="application/ld+json">
${JSON.stringify(schemaGraph, null, 2)}
  </script>
`;

  // Inject in head before </head>
  template = template.replace('</head>', `${canonicalTag}${robotsTag}${socialMeta}</head>`);

  // Pre-rendered semantic HTML fallback for search engines / AI crawlers (OAI-SearchBot, Bingbot, Googlebot)
  const isAvailable = course.estado_disponibilidad === 'ABIERTA';
  const availabilityText = isAvailable ? 'Matrícula Abierta — Convocatoria disponible' : 'Matrícula Cerrada actualmente — Ficha informativa disponible para consulta y reserva de plaza';
  
  const priceDisplay = (course.estado_precio === 'CONFIGURADO' && course.precio_final !== null)
    ? `${new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(course.precio_final)} (IVA incluido)`
    : 'Consultar opciones de subvención o precio en Secretaría';

  const semanticContent = `
    <!-- CONTENIDO SEMÁNTICO PRE-RENDERIZADO PARA BUSCADORES TRADICIONALES Y MOTORES CON IA (ChatGPT Search, Bing, Google) -->
    <main id="seo-prerender-content" class="sr-only-when-js-mounted" style="max-width: 900px; margin: 0 auto; padding: 2rem 1rem; font-family: system-ui, -apple-system, sans-serif; color: #1e293b; line-height: 1.6;">
      <nav aria-label="Migas de pan" style="margin-bottom: 1rem; font-size: 0.875rem; color: #64748b;">
        <a href="${baseUrl}/" style="color: #dc2626; text-decoration: none;">Inicio</a> &gt; 
        <a href="${baseUrl}/cursos" style="color: #dc2626; text-decoration: none;">Cursos de Formación</a> &gt; 
        <span aria-current="page">${escapeHtml(course.nombre)}</span>
      </nav>

      <header style="margin-bottom: 2rem; border-bottom: 1px solid #e2e8f0; pb: 1.5rem;">
        <div style="display: inline-block; background-color: #fee2e2; color: #991b1b; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.875rem; font-weight: bold; margin-bottom: 0.5rem;">
          Código Oficial: ${escapeHtml(course.codigo)}
        </div>
        <h1 style="font-size: 2rem; font-weight: 800; color: #0f172a; margin-top: 0.5rem; margin-bottom: 0.75rem;">
          ${escapeHtml(course.nombre)}
        </h1>
        <p style="font-size: 1.125rem; color: #475569; margin: 0;">
          ${escapeHtml(course.descripcion)}
        </p>
      </header>

      <section aria-labelledby="sec-caracteristicas" style="margin-bottom: 2rem;">
        <h2 id="sec-caracteristicas" style="font-size: 1.25rem; font-weight: 700; color: #0f172a;">Características Principales del Curso</h2>
        <ul style="list-style-type: none; padding-left: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem;">
          <li style="background: #f8fafc; padding: 1rem; border-radius: 0.75rem; border: 1px solid #e2e8f0;">
            <strong>Duración Total:</strong> ${course.horas_totales} horas lectivas oficiales (${course.horas_practicas || 0} horas de prácticas reales en taller).
          </li>
          <li style="background: #f8fafc; padding: 1rem; border-radius: 0.75rem; border: 1px solid #e2e8f0;">
            <strong>Modalidad de Impartición:</strong> ${escapeHtml(course.modalidad || 'Presencial')}.
          </li>
          <li style="background: #f8fafc; padding: 1rem; border-radius: 0.75rem; border: 1px solid #e2e8f0;">
            <strong>Estado de Matrícula:</strong> <span style="color: ${isAvailable ? '#166534' : '#991b1b'}; font-weight: 700;">${availabilityText}</span>.
          </li>
          <li style="background: #f8fafc; padding: 1rem; border-radius: 0.75rem; border: 1px solid #e2e8f0;">
            <strong>Precio Oficial:</strong> ${escapeHtml(priceDisplay)}.
          </li>
          <li style="background: #f8fafc; padding: 1rem; border-radius: 0.75rem; border: 1px solid #e2e8f0;">
            <strong>Centro y Ubicación:</strong> Academias Péndulo, Carrera Doctoral 26, 04005 Almería. Centro Homologado Oficial Nº 0400030892.
          </li>
        </ul>
      </section>

      <section aria-labelledby="sec-objetivos" style="margin-bottom: 2rem;">
        <h2 id="sec-objetivos" style="font-size: 1.25rem; font-weight: 700; color: #0f172a;">Metodología y Objetivos Formativos</h2>
        <p>
          Esta especialidad oficial de formación profesional está orientada a dotar al alumno de competencias técnicas prácticas y operativas directamente aplicables en el entorno productivo de automoción y prevención.
          Las clases prácticas se realizan en nuestras instalaciones dotadas de elevadores, osciloscopios PicoScope, equipos de diagnosis multimarca, analizadores de gases y paneles de calibración ADAS.
        </p>
      </section>

      <section aria-labelledby="sec-faqs" style="margin-bottom: 2rem;">
        <h2 id="sec-faqs" style="font-size: 1.25rem; font-weight: 700; color: #0f172a;">Preguntas Frecuentes sobre el Curso</h2>
        <div style="margin-bottom: 1rem;">
          <h3 style="font-size: 1rem; font-weight: 700; margin-bottom: 0.25rem; color: #1e293b;">¿Dónde estudiar este curso en Almería?</h3>
          <p style="margin: 0; color: #475569;">En la sede central de Academias Péndulo, ubicada en Carrera Doctoral 26, 04005 Almería.</p>
        </div>
        <div style="margin-bottom: 1rem;">
          <h3 style="font-size: 1rem; font-weight: 700; margin-bottom: 0.25rem; color: #1e293b;">¿Cómo solicitar una plaza en este curso?</h3>
          <p style="margin: 0; color: #475569;">Puedes enviar tu solicitud directamente desde esta página, contactar por teléfono en el +34 620 35 16 22 o por correo en info@academiaspendulo.com.</p>
        </div>
        <div style="margin-bottom: 1rem;">
          <h3 style="font-size: 1rem; font-weight: 700; margin-bottom: 0.25rem; color: #1e293b;">¿Puedo pedir información si la convocatoria está cerrada?</h3>
          <p style="margin: 0; color: #475569;">Sí. El cierre de convocatoria no retira la ficha del curso. Puedes inscribirte en lista de espera y secretaría te notificará la próxima fecha de apertura.</p>
        </div>
      </section>

      <footer style="border-top: 1px solid #e2e8f0; padding-top: 1rem; font-size: 0.875rem; color: #64748b;">
        <p><strong>Academias Péndulo</strong> — Centro Oficial de Formación Profesional Privada en Almería (Código de Centro 0400030892). Teléfono: +34 620 35 16 22. Horario: Lunes a Viernes de 08:30 a 20:30 h.</p>
      </footer>
    </main>
  `;

  // Inject semantic fallback inside <div id="root">
  if (template.includes('<div id="root"></div>')) {
    template = template.replace('<div id="root"></div>', `<div id="root">${semanticContent}</div>`);
  } else if (template.includes('<div id="root">')) {
    template = template.replace('<div id="root">', `<div id="root">${semanticContent}`);
  }

  return template;
}

/**
 * Render Catalog index page HTML (/cursos)
 */
export function renderCatalogPage(courses, baseUrl = BASE_URL) {
  let template = getIndexHtmlTemplate();

  const title = 'Catálogo Oficial de Cursos de Automoción y Formación Profesional en Almería | Academias Péndulo';
  const description = 'Explora nuestro catálogo de 33 especialidades y certificados oficiales en Almería: mecánica, diagnosis, vehículos híbridos y eléctricos, y PRL. Centro 0400030892.';
  const catalogUrl = `${baseUrl}/cursos`;

  // Schema.org ItemList of all published indexable courses
  const itemListElements = courses
    .filter(c => c.indexable === 1 && c.estado_publicacion === 'PUBLICADO')
    .map((c, idx) => ({
      '@type': 'ListItem',
      'position': idx + 1,
      'item': {
        '@type': 'Course',
        '@id': `${baseUrl}/cursos/${c.slug}#course`,
        'name': c.nombre,
        'courseCode': c.codigo,
        'description': c.descripcion,
        'url': `${baseUrl}/cursos/${c.slug}`,
        'provider': {
          '@id': `${baseUrl}/#organization`
        }
      }
    }));

  const schemaGraph = {
    '@context': 'https://schema.org',
    '@graph': [
      getOrganizationSchema(baseUrl),
      {
        '@type': 'BreadcrumbList',
        'itemListElement': [
          {
            '@type': 'ListItem',
            'position': 1,
            'name': 'Inicio',
            'item': `${baseUrl}/`
          },
          {
            '@type': 'ListItem',
            'position': 2,
            'name': 'Catálogo de Cursos',
            'item': catalogUrl
          }
        ]
      },
      {
        '@type': 'ItemList',
        '@id': `${catalogUrl}#itemlist`,
        'name': 'Catálogo Oficial de Especialidades Formativas — Academias Péndulo Almería',
        'numberOfItems': itemListElements.length,
        'itemListElement': itemListElements
      }
    ]
  };

  // Replace Title
  template = template.replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);

  // Replace or inject Description
  if (template.includes('name="description"')) {
    template = template.replace(/<meta name="description" content=".*?"\s*\/?>/i, `<meta name="description" content="${escapeHtml(description)}" />`);
  } else {
    template = template.replace('</head>', `  <meta name="description" content="${escapeHtml(description)}" />\n</head>`);
  }

  // Canonical tag
  const canonicalTag = `  <link rel="canonical" href="${catalogUrl}" />\n`;
  const robotsTag = `  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />\n`;

  const socialMeta = `
  <!-- Metadatos Open Graph y Redes Sociales -->
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${catalogUrl}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Academias Péndulo" />
  <meta property="og:locale" content="es_ES" />
  <meta property="og:image" content="${CENTER_INFO.defaultOgImage}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${CENTER_INFO.defaultOgImage}" />

  <!-- Schema.org JSON-LD -->
  <script type="application/ld+json">
${JSON.stringify(schemaGraph, null, 2)}
  </script>
`;

  template = template.replace('</head>', `${canonicalTag}${robotsTag}${socialMeta}</head>`);

  // Semantic course list for robots
  const coursesListHtml = courses
    .filter(c => c.indexable === 1 && c.estado_publicacion === 'PUBLICADO')
    .map(c => `
      <article style="border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 1.25rem; margin-bottom: 1rem; background: #ffffff;">
        <span style="font-size: 0.75rem; font-weight: bold; background: #fee2e2; color: #991b1b; padding: 0.2rem 0.5rem; border-radius: 0.375rem;">
          ${escapeHtml(c.codigo)}
        </span>
        <h2 style="font-size: 1.25rem; font-weight: 700; margin-top: 0.5rem; margin-bottom: 0.5rem;">
          <a href="${baseUrl}/cursos/${c.slug}" style="color: #0f172a; text-decoration: none;">
            ${escapeHtml(c.nombre)}
          </a>
        </h2>
        <p style="color: #475569; font-size: 0.875rem; margin-bottom: 0.75rem;">
          ${escapeHtml(c.descripcion || '')}
        </p>
        <div style="font-size: 0.8rem; color: #64748b; display: flex; gap: 1rem; flex-wrap: wrap;">
          <span><strong>Duración:</strong> ${c.horas_totales || 40}h (${c.horas_practicas || 0}h prácticas)</span>
          <span><strong>Modalidad:</strong> ${escapeHtml(c.modalidad || 'Presencial')}</span>
          <span><strong>Matrícula:</strong> ${c.estado_disponibilidad === 'ABIERTA' ? 'Abierta' : 'Cerrada'}</span>
        </div>
        <div style="margin-top: 0.75rem;">
          <a href="${baseUrl}/cursos/${c.slug}" style="color: #dc2626; font-weight: 600; text-decoration: underline; font-size: 0.875rem;">
            Ver ficha completa y temario de ${escapeHtml(c.nombre)} &rarr;
          </a>
        </div>
      </article>
    `)
    .join('');

  const semanticCatalog = `
    <main id="seo-prerender-catalog" class="sr-only-when-js-mounted" style="max-width: 1000px; margin: 0 auto; padding: 2rem 1rem; font-family: system-ui, -apple-system, sans-serif; color: #1e293b; line-height: 1.6;">
      <nav aria-label="Migas de pan" style="margin-bottom: 1rem; font-size: 0.875rem; color: #64748b;">
        <a href="${baseUrl}/" style="color: #dc2626; text-decoration: none;">Inicio</a> &gt; 
        <span aria-current="page">Catálogo Oficial de Cursos</span>
      </nav>

      <header style="margin-bottom: 2rem;">
        <h1 style="font-size: 2.25rem; font-weight: 800; color: #0f172a; margin-bottom: 0.5rem;">
          Catálogo Oficial de Cursos y Certificados de Automoción en Almería
        </h1>
        <p style="font-size: 1.125rem; color: #475569;">
          Consulta las 33 especialidades formativas autorizadas en Academias Péndulo (Centro Oficial Nº 0400030892). Formación técnica presencial en Almería con prácticas intensivas en taller.
        </p>
      </header>

      <section aria-label="Listado de especialidades oficiales">
        ${coursesListHtml}
      </section>

      <footer style="margin-top: 3rem; border-top: 1px solid #e2e8f0; padding-top: 1rem; font-size: 0.875rem; color: #64748b;">
        <p><strong>Academias Péndulo</strong> — Sede en Carrera Doctoral 26, 04005 Almería. Tel: +34 620 35 16 22. Email: info@academiaspendulo.com</p>
      </footer>
    </main>
  `;

  if (template.includes('<div id="root"></div>')) {
    template = template.replace('<div id="root"></div>', `<div id="root">${semanticCatalog}</div>`);
  } else if (template.includes('<div id="root">')) {
    template = template.replace('<div id="root">', `<div id="root">${semanticCatalog}`);
  }

  return template;
}

/**
 * Render dynamic sitemap.xml listing all indexable canonical public pages
 */
export function renderSitemapXml(courses, baseUrl = BASE_URL) {
  const now = new Date().toISOString().split('T')[0];

  const staticUrls = [
    { loc: `${baseUrl}/`, changefreq: 'daily', priority: '1.0', lastmod: now },
    { loc: `${baseUrl}/cursos`, changefreq: 'daily', priority: '0.9', lastmod: now },
    { loc: `${baseUrl}/nosotros`, changefreq: 'monthly', priority: '0.7', lastmod: now },
    { loc: `${baseUrl}/contacto`, changefreq: 'monthly', priority: '0.7', lastmod: now }
  ];

  const courseUrls = courses
    .filter(c => c.indexable === 1 && c.estado_publicacion === 'PUBLICADO' && c.slug)
    .map(c => {
      let modDate = now;
      if (c.actualizado_en) {
        try {
          modDate = new Date(c.actualizado_en).toISOString().split('T')[0];
        } catch (_) {}
      } else if (c.creado_en) {
        try {
          modDate = new Date(c.creado_en).toISOString().split('T')[0];
        } catch (_) {}
      }

      return {
        loc: `${baseUrl}/cursos/${c.slug}`,
        changefreq: 'weekly',
        priority: '0.8',
        lastmod: modDate
      };
    });

  const allUrls = [...staticUrls, ...courseUrls];

  const xmlEntries = allUrls.map(item => `  <url>
    <loc>${item.loc}</loc>
    <lastmod>${item.lastmod}</lastmod>
    <changefreq>${item.changefreq}</changefreq>
    <priority>${item.priority}</priority>
  </url>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xmlEntries}
</urlset>`;
}

/**
 * Render compliant robots.txt with search engine & AI crawler permissions
 */
export function renderRobotsTxt(baseUrl = BASE_URL) {
  return `# ==============================================================================
# ROBOTS.TXT — ACADEMIAS PÉNDULO (https://academiaspendulo.com)
# Configuración técnica de rastreo e indexación para buscadores y motores de IA
# ==============================================================================

# 1. Reglas generales para todos los rastreadores legítimos
User-agent: *
Allow: /
Allow: /cursos
Allow: /cursos/*
Allow: /contacto
Allow: /nosotros
Allow: /solicitud-inscripcion

# Rutas privadas, administrativas y operativas excluidas de la indexación pública
Disallow: /api/
Disallow: /admin
Disallow: /#admin
Disallow: /campus
Disallow: /#campus
Disallow: /#reset-password
Disallow: /#activar-cuenta
Disallow: /activar-cuenta
Disallow: /uploads/private/
Disallow: /uploads/justificantes/

# 2. Rastreador oficial de Google (Googlebot)
User-agent: Googlebot
Allow: /
Allow: /cursos
Allow: /cursos/*
Allow: /contacto
Allow: /nosotros
Disallow: /api/
Disallow: /admin
Disallow: /campus
Disallow: /uploads/

# 3. Rastreador oficial de Microsoft Bing (Bingbot)
User-agent: Bingbot
Allow: /
Allow: /cursos
Allow: /cursos/*
Allow: /contacto
Allow: /nosotros
Disallow: /api/
Disallow: /admin
Disallow: /campus
Disallow: /uploads/

# 4. Rastreador oficial de ChatGPT Search (OAI-SearchBot)
# Autorizado explícitamente para descubrimiento de contenidos públicos en búsquedas de IA
User-agent: OAI-SearchBot
Allow: /
Allow: /cursos
Allow: /cursos/*
Allow: /contacto
Allow: /nosotros
Disallow: /api/
Disallow: /admin
Disallow: /campus
Disallow: /uploads/

# 5. Localización oficial del mapa del sitio XML
Sitemap: ${baseUrl}/sitemap.xml
`;
}
