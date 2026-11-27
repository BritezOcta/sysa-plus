import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import {
  CERTIFICATE_LABELS,
  CERTIFICATE_TYPE,
  type CertificateContent,
  type CertificateType,
} from "../types/certificate.js";

/** RF-11: arma el PDF de un certificado a partir de los datos guardados al emitirlo. */

const INSTITUTION = "Universidad Tecnológica Nacional";
const FACULTY = "Facultad Regional General Pacheco";
const SYSTEM = "SysA+ · Sistema de Gestión Académica";

const COLORS = { ink: "#0f172a", muted: "#475569", line: "#cbd5e1", accent: "#0075ad", band: "#f1f5f9" };
const GRADE_WORDS = ["cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez"];
const TZ = "America/Argentina/Buenos_Aires";

export interface CertificatePdfInput {
  type: CertificateType;
  validationCode: string;
  issuedAt: Date;
  verificationUrl: string;
  content: CertificateContent;
}

function gradeText(grade: number | null): string {
  if (grade === null) return "—";
  return Number.isInteger(grade) && GRADE_WORDS[grade] ? `${grade} (${GRADE_WORDS[grade]})` : grade.toFixed(2);
}

/** "2026-03-16" → "16/03/2026" */
function isoToDisplay(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function longDate(date: Date): string {
  return new Intl.DateTimeFormat("es-AR", { timeZone: TZ, day: "numeric", month: "long", year: "numeric" }).format(date);
}

function dateTime(date: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

function formatDni(dni: string): string {
  return /^\d+$/.test(dni) ? Number(dni).toLocaleString("es-AR") : dni;
}

export async function buildCertificatePdf(input: CertificatePdfInput): Promise<Buffer> {
  const qr = await QRCode.toBuffer(input.verificationUrl, { margin: 1, width: 220, errorCorrectionLevel: "M" });

  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 50, bottom: 50, left: 56, right: 56 },
    bufferPages: true,
    info: {
      Title: `${CERTIFICATE_LABELS[input.type]} · ${input.validationCode}`,
      Author: `${INSTITUTION} · ${FACULTY}`,
      Creator: "SysA+",
    },
  });

  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const finished = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const left = doc.page.margins.left;
  const width = doc.page.width - left - doc.page.margins.right;
  const { student, career } = input.content;

  // ---- Encabezado institucional ----
  doc.rect(0, 0, doc.page.width, 8).fill(COLORS.accent);
  doc.fillColor(COLORS.ink).font("Helvetica-Bold").fontSize(15).text(INSTITUTION, left, 40, { width, align: "center" });
  doc.font("Helvetica").fontSize(11).fillColor(COLORS.muted).text(FACULTY, { width, align: "center" });
  doc.fontSize(9).text(SYSTEM, { width, align: "center" });
  doc.moveDown(0.8);
  doc.moveTo(left, doc.y).lineTo(left + width, doc.y).strokeColor(COLORS.line).lineWidth(1).stroke();
  doc.moveDown(1.2);

  doc.fillColor(COLORS.ink).font("Helvetica-Bold").fontSize(17).text(CERTIFICATE_LABELS[input.type].toUpperCase(), left, doc.y, {
    width,
    align: "center",
  });
  doc.moveDown(1.2);

  // ---- Cuerpo ----
  const name = student.fullName;
  const id = `DNI ${formatDni(student.dni)}, legajo N° ${student.legajo}`;
  doc.font("Helvetica").fontSize(11).fillColor(COLORS.ink);

  if (input.type === CERTIFICATE_TYPE.ALUMNO_REGULAR) {
    const period = input.content.period!;
    doc.text(
      `Se certifica que ${name}, ${id}, es alumno/a regular de la carrera ${career.name}, ${career.studyPlan}, ` +
        `de esta Facultad Regional, con ingreso en el año ${career.admissionYear}, y se encuentra cursando el ` +
        `${period.label}, comprendido entre el ${isoToDisplay(period.startDate)} y el ${isoToDisplay(period.endDate)}.`,
      { width, align: "justify", lineGap: 3 },
    );
    doc.moveDown(1);
    doc.font("Helvetica-Bold").text("Asignaturas en curso en el período");
    doc.moveDown(0.4);
    drawTable(doc, left, width, ["Código", "Asignatura", "Comisión"], [0.18, 0.62, 0.2],
      (input.content.courses ?? []).map((c) => [c.code, c.name, c.commission]));
  } else {
    const summary = input.content.summary!;
    const complete = input.type === CERTIFICATE_TYPE.ANALITICO_COMPLETO;
    doc.text(
      complete
        ? `Se certifica que ${name}, ${id}, ha aprobado la totalidad de las ${summary.totalSubjects} asignaturas del plan de estudios de la carrera ${career.name}, ${career.studyPlan}, según el siguiente detalle:`
        : `Se certifica que ${name}, ${id}, alumno/a de la carrera ${career.name}, ${career.studyPlan}, con ingreso en el año ${career.admissionYear}, ha aprobado las asignaturas que se detallan a continuación:`,
      { width, align: "justify", lineGap: 3 },
    );
    doc.moveDown(1);
    drawTable(doc, left, width, ["Año", "Código", "Asignatura", "Nota", "Fecha", "Forma"], [0.07, 0.12, 0.42, 0.13, 0.13, 0.13],
      (input.content.subjects ?? []).map((s) => [
        s.year ? `${s.year}°` : "—",
        s.code,
        s.name,
        gradeText(s.grade),
        isoToDisplay(s.approvalDate),
        s.approvedBy === "PROMOCION" ? "Promoción" : "Final",
      ]));
    doc.moveDown(0.8);
    ensureSpace(doc, 60);
    doc.font("Helvetica-Bold").fontSize(10.5).fillColor(COLORS.ink).text(
      `Asignaturas aprobadas: ${summary.approved} de ${summary.totalSubjects} (${summary.progressPercent}% del plan)` +
        (summary.average !== null ? ` · Promedio con finales: ${summary.average.toFixed(2)}` : ""),
      left,
      doc.y,
      { width },
    );
  }

  doc.moveDown(1.2);
  ensureSpace(doc, 40);
  doc.font("Helvetica").fontSize(11).fillColor(COLORS.ink).text(
    `A pedido del/de la interesado/a y para ser presentado ante quien corresponda, se extiende el presente en General Pacheco, el ${longDate(input.issuedAt)}.`,
    left,
    doc.y,
    { width, align: "justify", lineGap: 3 },
  );

  // ---- Bloque de validación (QR + código) ----
  const qrSize = 104;
  ensureSpace(doc, qrSize + 40);
  const boxTop = Math.max(doc.y + 24, doc.page.height - doc.page.margins.bottom - qrSize - 46);
  doc.roundedRect(left, boxTop, width, qrSize + 20, 6).fillAndStroke(COLORS.band, COLORS.line);
  doc.image(qr, left + 10, boxTop + 10, { width: qrSize, height: qrSize });
  const textX = left + qrSize + 26;
  const textW = width - qrSize - 36;
  doc.fillColor(COLORS.muted).font("Helvetica").fontSize(9).text("Código de validación", textX, boxTop + 14, { width: textW });
  doc.fillColor(COLORS.ink).font("Helvetica-Bold").fontSize(16).text(input.validationCode, textX, doc.y + 2, { width: textW });
  doc.fillColor(COLORS.muted).font("Helvetica").fontSize(9).text(
    `Emitido electrónicamente por SysA+ el ${dateTime(input.issuedAt)} hs. Escaneá el código QR o ingresá a ` +
      `${input.verificationUrl} para verificar su autenticidad.`,
    textX,
    doc.y + 6,
    { width: textW, lineGap: 2 },
  );

  // ---- Pie de página con numeración ----
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const bottom = doc.page.height - 30;
    const savedBottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc.fillColor(COLORS.muted).font("Helvetica").fontSize(8).text(
      `${CERTIFICATE_LABELS[input.type]} · ${input.validationCode} · Página ${i + 1} de ${range.count}`,
      left,
      bottom,
      { width, align: "center", lineBreak: false },
    );
    doc.page.margins.bottom = savedBottom;
  }

  doc.end();
  return finished;
}

/** Salta de página si no quedan `needed` puntos libres. */
function ensureSpace(doc: PDFKit.PDFDocument, needed: number) {
  if (doc.y + needed > doc.page.height - doc.page.margins.bottom) doc.addPage();
}

function drawTable(
  doc: PDFKit.PDFDocument,
  left: number,
  width: number,
  headers: string[],
  ratios: number[],
  rows: string[][],
) {
  const widths = ratios.map((r) => r * width);
  const pad = 4;

  const drawRow = (cells: string[], bold: boolean, shaded: boolean) => {
    doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(9);
    const height =
      Math.max(...cells.map((c, i) => doc.heightOfString(c, { width: widths[i]! - pad * 2 }))) + pad * 2;
    if (doc.y + height > doc.page.height - doc.page.margins.bottom - 20) {
      doc.addPage();
      if (!bold) drawRow(headers, true, true);
    }
    const top = doc.y;
    if (shaded) doc.rect(left, top, width, height).fill(COLORS.band);
    let x = left;
    cells.forEach((cell, i) => {
      doc.fillColor(COLORS.ink).text(cell, x + pad, top + pad, { width: widths[i]! - pad * 2 });
      x += widths[i]!;
    });
    doc.moveTo(left, top + height).lineTo(left + width, top + height).strokeColor(COLORS.line).lineWidth(0.5).stroke();
    doc.y = top + height;
  };

  drawRow(headers, true, true);
  if (rows.length === 0) {
    doc.font("Helvetica-Oblique").fontSize(9).fillColor(COLORS.muted).text("Sin registros.", left + pad, doc.y + pad);
    return;
  }
  rows.forEach((row) => drawRow(row, false, false));
  doc.x = left;
}
