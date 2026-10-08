import crypto from 'crypto'

export interface ExtractedDocument {
  text: string
  pageCount?: number
  slideCount?: number
  contentHash: string
}

// ─── PPTX: unzip and pull text from slide XML ─────────────────────────────────

async function extractPptx(buffer: Buffer): Promise<ExtractedDocument> {
  // Dynamic import to avoid SSR issues
  const JSZip = (await import('jszip')).default
  const zip = await JSZip.loadAsync(buffer)

  const slideFiles = Object.keys(zip.files)
    .filter((f) => /^ppt\/slides\/slide\d+\.xml$/i.test(f))
    .sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)?.[0] ?? '0', 10)
      const numB = parseInt(b.match(/\d+/)?.[0] ?? '0', 10)
      return numA - numB
    })

  const slideTexts: string[] = []

  for (const slideFile of slideFiles) {
    const xml = await zip.files[slideFile].async('string')
    // Extract all <a:t> text elements
    const matches = xml.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) ?? []
    const slideText = matches
      .map((m) => m.replace(/<[^>]+>/g, '').trim())
      .filter(Boolean)
      .join(' ')
    if (slideText) {
      const slideNum = slideFile.match(/\d+/)?.[0] ?? '?'
      slideTexts.push(`[Slide ${slideNum}] ${slideText}`)
    }
  }

  const text = slideTexts.join('\n\n')
  return {
    text,
    slideCount: slideFiles.length,
    contentHash: hashText(text),
  }
}

// ─── PDF ─────────────────────────────────────────────────────────────────────

async function extractPdf(buffer: Buffer): Promise<ExtractedDocument> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfModule = await import('pdf-parse') as any
  const pdfParse = pdfModule.default ?? pdfModule
  const data = await pdfParse(buffer)
  const text = data.text ?? ''
  return {
    text,
    pageCount: data.numpages,
    contentHash: hashText(text),
  }
}

// ─── DOCX ─────────────────────────────────────────────────────────────────────

async function extractDocx(buffer: Buffer): Promise<ExtractedDocument> {
  const mammoth = await import('mammoth')
  const result = await mammoth.extractRawText({ buffer })
  const text = result.value ?? ''
  return {
    text,
    contentHash: hashText(text),
  }
}

// ─── Plain text / Markdown ────────────────────────────────────────────────────

function extractPlainText(buffer: Buffer): ExtractedDocument {
  const text = buffer.toString('utf-8')
  return { text, contentHash: hashText(text) }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function extractDocumentText(
  buffer: Buffer,
  fileType: string
): Promise<ExtractedDocument> {
  const type = fileType.toLowerCase().replace(/^\./, '')

  switch (type) {
    case 'pptx': return extractPptx(buffer)
    case 'pdf':  return extractPdf(buffer)
    case 'docx': return extractDocx(buffer)
    case 'txt':
    case 'md':
    case 'markdown':
    case 'text':
      return extractPlainText(buffer)
    default:
      // Try plain text as fallback
      try {
        return extractPlainText(buffer)
      } catch {
        throw new Error(`Unsupported file type: ${fileType}`)
      }
  }
}

export function hashText(text: string): string {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex').slice(0, 32)
}

export function detectFileType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? 'txt'
  return ext
}
