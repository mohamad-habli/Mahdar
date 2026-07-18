import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx'
import type { ExportReportDocument, ExportReportSection } from './export-reports'
import { readUploadedLogoUrl } from './uploads'

function color(hex: string) {
  return hex.replace('#', '').toUpperCase()
}

function paragraph(text: string, options?: { bold?: boolean; size?: number; color?: string; heading?: typeof HeadingLevel[keyof typeof HeadingLevel]; center?: boolean }) {
  return new Paragraph({
    bidirectional: true,
    alignment: options?.center ? AlignmentType.CENTER : AlignmentType.RIGHT,
    heading: options?.heading,
    children: [new TextRun({
      text,
      bold: options?.bold,
      size: options?.size,
      color: options?.color,
      font: 'Arial',
      rightToLeft: true,
    })],
    spacing: { after: 100 },
  })
}

function cell(text: string, header: boolean, primary: string) {
  return new TableCell({
    shading: header ? { fill: primary } : undefined,
    margins: { top: 90, bottom: 90, left: 90, right: 90 },
    children: [paragraph(text, { bold: header, color: header ? 'FFFFFF' : '202735', size: 20 })],
  })
}

function sectionBlocks(section: ExportReportSection, primary: string) {
  const blocks: (Paragraph | Table)[] = [
    paragraph(section.title, { bold: true, size: 27, color: primary, heading: HeadingLevel.HEADING_2 }),
  ]
  for (const text of section.paragraphs ?? []) blocks.push(paragraph(text, { size: 22 }))
  if (section.rows) {
    const rows: TableRow[] = []
    if (section.headers) rows.push(new TableRow({ tableHeader: true, children: section.headers.map((header) => cell(header, true, primary)) }))
    rows.push(...section.rows.map((row) => new TableRow({ children: row.map((value) => cell(value, false, primary)) })))
    blocks.push(new Table({
      rows,
      width: { size: 100, type: WidthType.PERCENTAGE },
      visuallyRightToLeft: true,
      alignment: AlignmentType.CENTER,
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: 'D9DEE8' },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: 'D9DEE8' },
        left: { style: BorderStyle.SINGLE, size: 1, color: 'D9DEE8' },
        right: { style: BorderStyle.SINGLE, size: 1, color: 'D9DEE8' },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'E8EBF0' },
        insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'E8EBF0' },
      },
    }))
  }
  blocks.push(new Paragraph({ children: [] }))
  return blocks
}

async function logoRun(logoUrl: string | null) {
  const asset = await readUploadedLogoUrl(logoUrl)
  if (!asset) return null
  try {
    const sharp = (await import('sharp')).default
    const png = await sharp(asset.data).resize({ width: 180, height: 180, fit: 'inside' }).png().toBuffer()
    return new ImageRun({ data: png, type: 'png', transformation: { width: 72, height: 72 }, altText: { title: 'شعار المركز', description: 'شعار المركز', name: 'logo' } })
  } catch {
    return null
  }
}

export async function buildReportDocx(report: ExportReportDocument) {
  const primary = color(report.branding.reportTheme === 'MONO' ? '#111111' : report.branding.primaryColor)
  const secondary = color(report.branding.reportTheme === 'MONO' ? '#555555' : report.branding.secondaryColor)
  const logo = await logoRun(report.logoUrl)
  const children: (Paragraph | Table)[] = []
  if (logo) children.push(new Paragraph({ alignment: AlignmentType.RIGHT, bidirectional: true, children: [logo] }))
  children.push(
    paragraph(report.organizationName, { bold: true, size: 25, color: primary }),
    paragraph(report.title, { bold: true, size: 38, color: primary, heading: HeadingLevel.TITLE }),
    paragraph(report.subtitle, { size: 23, color: secondary }),
    new Table({
      rows: report.metadata.map(([label, value]) => new TableRow({ children: [cell(label, true, primary), cell(value, false, primary)] })),
      width: { size: 100, type: WidthType.PERCENTAGE },
      visuallyRightToLeft: true,
    }),
    new Paragraph({ children: [] }),
  )
  for (const section of report.sections) children.push(...sectionBlocks(section, primary))
  if (report.signatures) {
    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      visuallyRightToLeft: true,
      rows: [new TableRow({
        children: report.signatures.map((signature) => new TableCell({
          borders: { top: { style: BorderStyle.NIL }, bottom: { style: BorderStyle.NIL }, left: { style: BorderStyle.NIL }, right: { style: BorderStyle.NIL } },
          children: [paragraph(signature, { bold: true, center: true }), paragraph('____________________', { center: true })],
        })),
      })],
    }))
  }
  const document = new Document({
    creator: 'Mahdar',
    title: report.title,
    description: report.subtitle,
    sections: [{
      properties: { page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } } },
      children,
    }],
  })
  return Packer.toBuffer(document)
}
