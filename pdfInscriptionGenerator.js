import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PRIVATE_PDF_DIR = path.join(__dirname, 'uploads', 'pdf_inscriptions');
if (!fs.existsSync(PRIVATE_PDF_DIR)) {
  fs.mkdirSync(PRIVATE_PDF_DIR, { recursive: true });
}

/**
 * Generate official PDF for an inscription request
 * @param {Object} data Inscription request object
 * @returns {Promise<string>} File path of generated PDF
 */
export function generateInscriptionPDF(data) {
  return new Promise((resolve, reject) => {
    try {
      const fileName = `solicitud_${data.request_number}.pdf`;
      const filePath = path.join(PRIVATE_PDF_DIR, fileName);

      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        autoFirstPage: true,
      });

      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      const RED = '#DC2626';
      const DARK_GRAY = '#1F2937';
      const LIGHT_BG = '#FEF2F2';
      const BORDER_COLOR = '#D1D5DB';

      // ==========================================
      // PAGE 1
      // ==========================================

      // Header Branding
      doc.fillColor(DARK_GRAY).font('Helvetica-Bold').fontSize(20).text('Academias', 40, 40);
      doc.fillColor(RED).fontSize(26).text('PÉNDULO', 40, 60);
      doc.fillColor('#4B5563').font('Helvetica-Bold').fontSize(8).text('FORMACIÓN EN AUTOMOCIÓN', 40, 90);

      // Document Title Right Aligned
      doc.fillColor(RED).font('Helvetica-Bold').fontSize(16).text('SOLICITUD DE INSCRIPCIÓN', 300, 45, { align: 'right' });
      doc.fillColor('#6B7280').font('Helvetica').fontSize(9).text('Formación subvencionada · Academias Péndulo', 300, 67, { align: 'right' });
      doc.fillColor(DARK_GRAY).font('Helvetica-Bold').fontSize(10).text(`N.º: ${data.request_number}`, 300, 82, { align: 'right' });

      // Red Divider Line
      doc.moveTo(40, 105).lineTo(555, 105).strokeColor(RED).lineWidth(2).stroke();

      // Subsidized Training Notice Banner
      doc.rect(40, 115, 515, 32).fillAndStroke(LIGHT_BG, '#FCA5A5');
      doc.fillColor(RED).font('Helvetica-Bold').fontSize(9).text('FORMACIÓN SUBVENCIONADA', 50, 121);
      doc.fillColor(DARK_GRAY).font('Helvetica').fontSize(8.5).text('Esta solicitud no requiere pago, transferencia bancaria ni abono en efectivo o con tarjeta.', 50, 133);

      // Section 1: CURSO / ESPECIALIDAD SOLICITADA
      let y = 160;
      doc.fillColor(DARK_GRAY).font('Helvetica-Bold').fontSize(10).text('1. CURSO / ESPECIALIDAD SOLICITADA', 40, y);
      doc.moveTo(40, y + 14).lineTo(555, y + 14).strokeColor(RED).lineWidth(1).stroke();
      y += 22;

      // Fields row 1: Curso, Código
      doc.fillColor('#374151').font('Helvetica-Bold').fontSize(8).text('Curso o especialidad *', 40, y);
      doc.text('Código (si procede)', 380, y);
      
      doc.rect(40, y + 10, 330, 22).strokeColor(BORDER_COLOR).stroke();
      doc.fillColor(DARK_GRAY).font('Helvetica').fontSize(9).text(data.course_name || '', 45, y + 16);

      doc.rect(380, y + 10, 175, 22).strokeColor(BORDER_COLOR).stroke();
      doc.fillColor(DARK_GRAY).font('Helvetica').fontSize(9).text(data.course_code || '---', 385, y + 16);
      y += 38;

      // Fields row 2: Centro, Convocatoria
      doc.fillColor('#374151').font('Helvetica-Bold').fontSize(8).text('Centro', 40, y);
      doc.text('Convocatoria / edición', 290, y);

      doc.rect(40, y + 10, 240, 22).strokeColor(BORDER_COLOR).stroke();
      doc.fillColor(DARK_GRAY).font('Helvetica').fontSize(9).text(data.center || 'Academias Péndulo - Almería', 45, y + 16);

      doc.rect(290, y + 10, 265, 22).strokeColor(BORDER_COLOR).stroke();
      doc.fillColor(DARK_GRAY).font('Helvetica').fontSize(9).text(data.edition || 'Convocatoria 2026', 295, y + 16);
      y += 45;

      // Section 2: DATOS DEL ALUMNO/A
      doc.fillColor(DARK_GRAY).font('Helvetica-Bold').fontSize(10).text('2. DATOS DEL ALUMNO/A', 40, y);
      doc.moveTo(40, y + 14).lineTo(555, y + 14).strokeColor(RED).lineWidth(1).stroke();
      y += 22;

      // Nombre, Primer apellido, Segundo apellido
      doc.fillColor('#374151').font('Helvetica-Bold').fontSize(8).text('Nombre *', 40, y);
      doc.text('Primer apellido *', 210, y);
      doc.text('Segundo apellido', 380, y);

      doc.rect(40, y + 10, 160, 22).strokeColor(BORDER_COLOR).stroke();
      doc.fillColor(DARK_GRAY).font('Helvetica').fontSize(9).text(data.first_name || '', 45, y + 16);

      doc.rect(210, y + 10, 160, 22).strokeColor(BORDER_COLOR).stroke();
      doc.fillColor(DARK_GRAY).font('Helvetica').fontSize(9).text(data.last_name_1 || '', 215, y + 16);

      doc.rect(380, y + 10, 175, 22).strokeColor(BORDER_COLOR).stroke();
      doc.fillColor(DARK_GRAY).font('Helvetica').fontSize(9).text(data.last_name_2 || '', 385, y + 16);
      y += 38;

      // DNI, Fecha nacimiento, Teléfono
      doc.fillColor('#374151').font('Helvetica-Bold').fontSize(8).text('DNI / NIE *', 40, y);
      doc.text('Fecha de nacimiento *', 210, y);
      doc.text('Teléfono *', 380, y);

      doc.rect(40, y + 10, 160, 22).strokeColor(BORDER_COLOR).stroke();
      doc.fillColor(DARK_GRAY).font('Helvetica').fontSize(9).text(data.dni_nie || '', 45, y + 16);

      const formattedBirthDate = data.birth_date ? new Date(data.birth_date).toLocaleDateString('es-ES') : '';
      doc.rect(210, y + 10, 160, 22).strokeColor(BORDER_COLOR).stroke();
      doc.fillColor(DARK_GRAY).font('Helvetica').fontSize(9).text(formattedBirthDate, 215, y + 16);

      doc.rect(380, y + 10, 175, 22).strokeColor(BORDER_COLOR).stroke();
      doc.fillColor(DARK_GRAY).font('Helvetica').fontSize(9).text(data.phone || '', 385, y + 16);
      y += 38;

      // Email
      doc.fillColor('#374151').font('Helvetica-Bold').fontSize(8).text('Correo electrónico *', 40, y);
      doc.rect(40, y + 10, 515, 22).strokeColor(BORDER_COLOR).stroke();
      doc.fillColor(DARK_GRAY).font('Helvetica').fontSize(9).text(data.email || '', 45, y + 16);
      y += 38;

      // Dirección
      doc.fillColor('#374151').font('Helvetica-Bold').fontSize(8).text('Dirección', 40, y);
      doc.rect(40, y + 10, 515, 22).strokeColor(BORDER_COLOR).stroke();
      doc.fillColor(DARK_GRAY).font('Helvetica').fontSize(9).text(data.address || '', 45, y + 16);
      y += 38;

      // CP, Localidad, Provincia
      doc.fillColor('#374151').font('Helvetica-Bold').fontSize(8).text('Código postal', 40, y);
      doc.text('Localidad', 160, y);
      doc.text('Provincia', 360, y);

      doc.rect(40, y + 10, 110, 22).strokeColor(BORDER_COLOR).stroke();
      doc.fillColor(DARK_GRAY).font('Helvetica').fontSize(9).text(data.postal_code || '', 45, y + 16);

      doc.rect(160, y + 10, 190, 22).strokeColor(BORDER_COLOR).stroke();
      doc.fillColor(DARK_GRAY).font('Helvetica').fontSize(9).text(data.city || '', 165, y + 16);

      doc.rect(360, y + 10, 195, 22).strokeColor(BORDER_COLOR).stroke();
      doc.fillColor(DARK_GRAY).font('Helvetica').fontSize(9).text(data.province || '', 365, y + 16);
      y += 45;

      // Section 3: SITUACIÓN LABORAL
      doc.fillColor(DARK_GRAY).font('Helvetica-Bold').fontSize(10).text('3. SITUACIÓN LABORAL', 40, y);
      doc.moveTo(40, y + 14).lineTo(555, y + 14).strokeColor(RED).lineWidth(1).stroke();
      y += 22;

      // Checkboxes
      const empStatus = (data.employment_status || '').toLowerCase();
      const options = [
        { label: 'Ocupado/a', key: 'ocupado/a', x: 40 },
        { label: 'Desempleado/a', key: 'desempleado/a', x: 170 },
        { label: 'Autónomo/a', key: 'autónomo/a', x: 310 },
        { label: 'Otra', key: 'otra', x: 450 },
      ];

      options.forEach(opt => {
        const checked = empStatus.includes(opt.key.substring(0, 4));
        doc.rect(opt.x, y, 14, 14).strokeColor(BORDER_COLOR).stroke();
        if (checked) {
          doc.fillColor(RED).font('Helvetica-Bold').fontSize(10).text('X', opt.x + 3, y + 2);
        }
        doc.fillColor(DARK_GRAY).font('Helvetica').fontSize(9).text(opt.label, opt.x + 20, y + 2);
      });
      y += 24;

      doc.fillColor('#374151').font('Helvetica-Bold').fontSize(8).text('Empresa / actividad profesional (opcional)', 40, y);
      doc.rect(40, y + 10, 515, 22).strokeColor(BORDER_COLOR).stroke();
      doc.fillColor(DARK_GRAY).font('Helvetica').fontSize(9).text(data.company_activity || '', 45, y + 16);
      y += 45;

      // Section 4: OBSERVACIONES
      doc.fillColor(DARK_GRAY).font('Helvetica-Bold').fontSize(10).text('4. OBSERVACIONES', 40, y);
      doc.moveTo(40, y + 14).lineTo(555, y + 14).strokeColor(RED).lineWidth(1).stroke();
      y += 22;

      doc.rect(40, y, 515, 60).strokeColor(BORDER_COLOR).stroke();
      doc.fillColor(DARK_GRAY).font('Helvetica').fontSize(8.5).text(data.observations || 'Sin observaciones.', 48, y + 8, { width: 500 });

      // Page 1 Footer
      doc.fillColor('#9CA3AF').font('Helvetica').fontSize(8).text(
        'Academias Péndulo · Formación en Automoción · www.academiaspendulo.es · info@academiaspendulo.com',
        40, 770, { width: 450 }
      );
      doc.text('Página 1 de 2', 500, 770, { align: 'right' });

      // ==========================================
      // PAGE 2
      // ==========================================
      doc.addPage({ size: 'A4', margin: 40 });

      // Header Page 2
      doc.fillColor(DARK_GRAY).font('Helvetica-Bold').fontSize(20).text('Academias', 40, 40);
      doc.fillColor(RED).fontSize(26).text('PÉNDULO', 40, 60);
      doc.fillColor('#4B5563').font('Helvetica-Bold').fontSize(8).text('FORMACIÓN EN AUTOMOCIÓN', 40, 90);

      doc.fillColor(RED).font('Helvetica-Bold').fontSize(15).text('DECLARACIONES Y CONSENTIMIENTOS', 250, 45, { align: 'right' });
      doc.fillColor('#6B7280').font('Helvetica').fontSize(9).text('Solicitud de inscripción · Formación subvencionada', 250, 67, { align: 'right' });
      doc.fillColor(DARK_GRAY).font('Helvetica-Bold').fontSize(10).text(`N.º: ${data.request_number}`, 250, 82, { align: 'right' });

      doc.moveTo(40, 105).lineTo(555, 105).strokeColor(RED).lineWidth(2).stroke();

      y = 125;
      // Section 5: DECLARACIÓN DEL SOLICITANTE
      doc.fillColor(DARK_GRAY).font('Helvetica-Bold').fontSize(10).text('5. DECLARACIÓN DEL SOLICITANTE', 40, y);
      doc.moveTo(40, y + 14).lineTo(555, y + 14).strokeColor(RED).lineWidth(1).stroke();
      y += 24;

      const decls = [
        { text: 'Declaro que los datos facilitados en esta solicitud son veraces y están actualizados.', check: data.truth_declaration },
        { text: 'He sido informado/a de que la formación solicitada es subvencionada y que la admisión puede estar sujeta a requisitos de acceso, disponibilidad de plazas y validación de la convocatoria.', check: data.subsidized_training_acceptance },
        { text: 'Autorizo a Academias Péndulo a contactar conmigo por teléfono o correo electrónico para gestionar esta solicitud, la matrícula y las comunicaciones relacionadas con el curso.', check: data.contact_authorization }
      ];

      decls.forEach(item => {
        doc.rect(40, y, 14, 14).strokeColor(BORDER_COLOR).stroke();
        if (item.check) {
          doc.fillColor(RED).font('Helvetica-Bold').fontSize(10).text('X', 43, y + 2);
        }
        doc.fillColor(DARK_GRAY).font('Helvetica').fontSize(8.5).text(item.text, 62, y + 1, { width: 490 });
        y += 32;
      });
      y += 10;

      // Section 6: PROTECCIÓN DE DATOS
      doc.fillColor(DARK_GRAY).font('Helvetica-Bold').fontSize(10).text('6. PROTECCIÓN DE DATOS', 40, y);
      doc.moveTo(40, y + 14).lineTo(555, y + 14).strokeColor(RED).lineWidth(1).stroke();
      y += 22;

      doc.fillColor('#4B5563').font('Helvetica').fontSize(8).text(
        'Los datos facilitados serán tratados por Academias Péndulo S.L. con la finalidad de gestionar la solicitud, comprobar los requisitos de acceso, tramitar la matrícula y mantener las comunicaciones necesarias relacionadas con la formación. El tratamiento se realizará conforme al Reglamento (UE) 2016/679 (RGPD) y a la Ley Orgánica 3/2018 (LOPDGDD).',
        40, y, { width: 515 }
      );
      y += 38;

      // Consent checkboxes
      doc.rect(40, y, 14, 14).strokeColor(BORDER_COLOR).stroke();
      if (data.privacy_acceptance) {
        doc.fillColor(RED).font('Helvetica-Bold').fontSize(10).text('X', 43, y + 2);
      }
      doc.fillColor(DARK_GRAY).font('Helvetica-Bold').fontSize(8.5).text('He leído y acepto la información sobre protección de datos necesaria para tramitar mi solicitud. *', 62, y + 2);
      y += 26;

      doc.rect(40, y, 14, 14).strokeColor(BORDER_COLOR).stroke();
      if (data.marketing_consent) {
        doc.fillColor(RED).font('Helvetica-Bold').fontSize(10).text('X', 43, y + 2);
      }
      doc.fillColor(DARK_GRAY).font('Helvetica').fontSize(8.5).text('Deseo recibir información sobre futuras convocatorias, cursos y actividades de Academias Péndulo. (Opcional)', 62, y + 2);
      y += 40;

      // Section 7: CONFIRMACIÓN Y FIRMA
      doc.fillColor(DARK_GRAY).font('Helvetica-Bold').fontSize(10).text('7. CONFIRMACIÓN Y FIRMA', 40, y);
      doc.moveTo(40, y + 14).lineTo(555, y + 14).strokeColor(RED).lineWidth(1).stroke();
      y += 22;

      doc.fillColor('#374151').font('Helvetica-Bold').fontSize(8).text('Nombre completo del solicitante *', 40, y);
      doc.text('Fecha *', 360, y);

      doc.rect(40, y + 10, 305, 22).strokeColor(BORDER_COLOR).stroke();
      doc.fillColor(DARK_GRAY).font('Helvetica').fontSize(9).text(data.signature_name || `${data.first_name} ${data.last_name_1}`, 45, y + 16);

      const formattedSigDate = data.signature_date ? new Date(data.signature_date).toLocaleDateString('es-ES') : new Date().toLocaleDateString('es-ES');
      doc.rect(360, y + 10, 195, 22).strokeColor(BORDER_COLOR).stroke();
      doc.fillColor(DARK_GRAY).font('Helvetica').fontSize(9).text(formattedSigDate, 365, y + 16);
      y += 38;

      doc.fillColor('#374151').font('Helvetica-Bold').fontSize(8).text('Firma / nombre de conformidad', 40, y);
      doc.rect(40, y + 10, 515, 35).strokeColor(BORDER_COLOR).stroke();
      doc.fillColor('#1F2937').font('Helvetica-BoldOblique').fontSize(11).text(data.signature_name || `${data.first_name} ${data.last_name_1}`, 55, y + 22);
      y += 60;

      // Web Submission Box Notice
      doc.rect(40, y, 515, 45).fillAndStroke('#F9FAFB', '#E5E7EB');
      doc.fillColor(DARK_GRAY).font('Helvetica-Bold').fontSize(8.5).text('ENVÍO DESDE LA WEB ACADEMIAS PÉNDULO', 50, y + 8);
      doc.fillColor('#4B5563').font('Helvetica').fontSize(8).text(
        `Este documento ha sido generado automáticamente tras la transmisión telemática de la solicitud registrada con el número ${data.request_number}. Se encuentra archivado digitalmente en Secretaría.`,
        50, y + 20, { width: 495 }
      );

      // Page 2 Footer
      doc.fillColor('#9CA3AF').font('Helvetica').fontSize(8).text(
        'Academias Péndulo · Formación en Automoción · www.academiaspendulo.es · info@academiaspendulo.com',
        40, 770, { width: 450 }
      );
      doc.text('Página 2 de 2', 500, 770, { align: 'right' });

      doc.end();

      stream.on('finish', () => {
        resolve(filePath);
      });

      stream.on('error', (err) => {
        reject(err);
      });
    } catch (err) {
      reject(err);
    }
  });
}
