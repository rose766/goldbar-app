import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const clientId = searchParams.get('clientId')
  const sourceType = searchParams.get('sourceType')
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '25', 10)))
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}
  if (status) where.processingStatus = status
  if (clientId) where.clientId = clientId
  if (sourceType) where.sourceType = sourceType

  const [docs, total] = await Promise.all([
    prisma.sourceDocument.findMany({
      where,
      orderBy: { receivedAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        fileName: true,
        fileType: true,
        sourceType: true,
        googleDriveUrl: true,
        documentVersion: true,
        processingStatus: true,
        processingError: true,
        proposalsCreated: true,
        proposalsApproved: true,
        proposalsRejected: true,
        itemsCreated: true,
        receivedAt: true,
        lastProcessedAt: true,
        clientId: true,
        client: { select: { name: true } },
        previousVersionId: true,
        _count: { select: { reviewItems: true } },
      },
    }),
    prisma.sourceDocument.count({ where }),
  ])

  return NextResponse.json({
    documents: docs,
    total,
    page,
    pages: Math.ceil(total / limit),
  })
}
