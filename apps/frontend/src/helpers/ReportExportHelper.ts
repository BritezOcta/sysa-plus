import type {
  AcademicReportResponse,
  ReportRow,
  ReportType,
} from '../api/adminReports.api'

/**
 * Exportación de reportes académicos (RF-12) a PDF y Excel (.xlsx).
 * Las librerías se cargan de forma diferida (import dinámico) para no
 * incrementar el bundle inicial de la aplicación.
 */

export interface ReportExportMeta {
  title: string
  filters: { label: string; value: string }[]
}

interface Column {
  header: string
  value: (r: ReportRow) => string | number
  percent?: boolean
  width: number
}

const BASE_COLUMNS: Column[] = [
  { header: 'Carrera', value: (r) => r.careerName, width: 28 },
  { header: 'Código', value: (r) => r.subjectCode, width: 10 },
  { header: 'Materia', value: (r) => r.subjectName, width: 32 },
  { header: 'Comisión', value: (r) => r.commission, width: 10 },
  { header: 'Período', value: (r) => r.period, width: 14 },
  { header: 'Inscriptos', value: (r) => r.totalInscriptos, width: 11 },
]

const TYPE_COLUMNS: Record<ReportType, Column[]> = {
  RENDIMIENTO: [
    { header: 'Aprobados', value: (r) => r.aprobados, width: 11 },
    { header: 'Regulares', value: (r) => r.regulares, width: 11 },
    { header: 'Desaprobados', value: (r) => r.desaprobados, width: 13 },
    { header: 'Tasa Aprobación', value: (r) => r.tasaAprobacion, percent: true, width: 16 },
  ],
  ASISTENCIA: [
    { header: 'Asistencia Promedio', value: (r) => r.promedioAsistencia, percent: true, width: 19 },
  ],
  INSCRIPCIONES: [
    { header: 'Cupo', value: (r) => r.capacity, width: 8 },
    { header: 'Activos', value: (r) => r.activos, width: 9 },
    { header: 'Canceladas', value: (r) => r.canceladas, width: 11 },
  ],
  DESERCION: [
    { header: 'Libres', value: (r) => r.libres, width: 8 },
    { header: 'Canceladas', value: (r) => r.canceladas, width: 11 },
    { header: 'Tasa Deserción', value: (r) => r.tasaDesercion, percent: true, width: 15 },
  ],
}

function getColumns(type: ReportType): Column[] {
  return [...BASE_COLUMNS, ...TYPE_COLUMNS[type]]
}

function getSummary(report: AcademicReportResponse): [string, string][] {
  const s = report.summary
  return [
    ['Comisiones analizadas', String(s.totalCommissions)],
    ['Total inscriptos', String(s.totalInscriptos)],
    ['Aprobación promedio', `${s.avgAprobacion}%`],
    ['Asistencia promedio', `${s.avgAsistencia}%`],
    ['Deserción promedio', `${s.avgDesercion}%`],
  ]
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

function buildFileName(report: AcademicReportResponse, ext: string): string {
  const date = new Date(report.generatedAt).toISOString().slice(0, 10)
  return `reporte_${report.reportType.toLowerCase()}_${date}.${ext}`
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}

const BRAND_RGB: [number, number, number] = [30, 58, 138]
const BRAND_HEX = 'FF1E3A8A'

export async function exportReportToPdf(
  report: AcademicReportResponse,
  meta: ReportExportMeta,
): Promise<void> {
  const [{ jsPDF }, { autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 14

  // Encabezado
  doc.setFillColor(...BRAND_RGB)
  doc.rect(0, 0, pageWidth, 22, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('SysA+ · Reporte Académico', margin, 10)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text(meta.title, margin, 17)
  doc.setFontSize(9)
  doc.text(`Generado: ${formatDate(report.generatedAt)}`, pageWidth - margin, 17, {
    align: 'right',
  })

  // Filtros aplicados
  doc.setTextColor(51, 65, 85)
  doc.setFontSize(9)
  const filtersText = meta.filters.map((f) => `${f.label}: ${f.value}`).join('   ·   ')
  doc.text(filtersText, margin, 30)

  // Resumen
  autoTable(doc, {
    startY: 34,
    margin: { left: margin, right: margin },
    head: [getSummary(report).map(([label]) => label)],
    body: [getSummary(report).map(([, value]) => value)],
    theme: 'grid',
    styles: { halign: 'center', fontSize: 9 },
    headStyles: { fillColor: [226, 232, 240], textColor: [30, 41, 59], fontStyle: 'bold' },
    bodyStyles: { fontSize: 12, fontStyle: 'bold' },
  })
  const summaryEndY = (doc as unknown as { lastAutoTable: { finalY: number } })
    .lastAutoTable.finalY

  // Detalle
  const columns = getColumns(report.reportType)
  autoTable(doc, {
    startY: summaryEndY + 6,
    margin: { left: margin, right: margin, bottom: 14 },
    head: [columns.map((c) => c.header)],
    body: report.rows.map((r) =>
      columns.map((c) => {
        const v = c.value(r)
        return c.percent ? `${v}%` : String(v)
      }),
    ),
    theme: 'striped',
    styles: { fontSize: 8.5, cellPadding: 2 },
    headStyles: { fillColor: BRAND_RGB, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [241, 245, 249] },
    columnStyles: Object.fromEntries(
      columns.map((c, i) => [
        i,
        typeof c.value(report.rows[0]) === 'number'
          ? { halign: 'right' as const, fontStyle: c.percent ? ('bold' as const) : ('normal' as const) }
          : {},
      ]),
    ),
  })

  // Pie de página con numeración
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(100, 116, 139)
    doc.text('SysA+ · Documento generado automáticamente', margin, pageHeight - 6)
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 6, {
      align: 'right',
    })
  }

  doc.save(buildFileName(report, 'pdf'))
}

export async function exportReportToExcel(
  report: AcademicReportResponse,
  meta: ReportExportMeta,
): Promise<void> {
  const { default: ExcelJS } = await import('exceljs')

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'SysA+'
  workbook.created = new Date(report.generatedAt)

  const columns = getColumns(report.reportType)
  const sheet = workbook.addWorksheet('Reporte', {
    views: [{ state: 'frozen', ySplit: 1 }],
  })

  sheet.columns = columns.map((c) => ({ header: c.header, width: c.width }))
  const header = sheet.getRow(1)
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_HEX } }
  header.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
  header.height = 22

  for (const r of report.rows) {
    sheet.addRow(
      columns.map((c) => {
        const v = c.value(r)
        // Los porcentajes se guardan como fracción para que Excel los trate como número.
        return c.percent && typeof v === 'number' ? v / 100 : v
      }),
    )
  }

  columns.forEach((c, i) => {
    if (c.percent) sheet.getColumn(i + 1).numFmt = '0%'
  })
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columns.length },
  }

  // Hoja de resumen con filtros e indicadores
  const summary = workbook.addWorksheet('Resumen')
  summary.columns = [{ width: 26 }, { width: 40 }]
  summary.addRow([meta.title]).font = { bold: true, size: 14 }
  summary.addRow(['Generado', formatDate(report.generatedAt)])
  summary.addRow([])
  summary.addRow(['Filtros aplicados']).font = { bold: true }
  meta.filters.forEach((f) => summary.addRow([f.label, f.value]))
  summary.addRow([])
  summary.addRow(['Indicadores']).font = { bold: true }
  getSummary(report).forEach(([label, value]) => summary.addRow([label, value]))

  const buffer = await workbook.xlsx.writeBuffer()
  downloadBlob(
    new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    buildFileName(report, 'xlsx'),
  )
}
