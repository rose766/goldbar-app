import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const doc = await prisma.sourceDocument.findUnique({
    where: { id: params.id },
    include: {
      client: { select: { id: true, name: true, health: true } },
      reviewItems: {
        orderBy: { createdAt: 'desc' },
        include: {
          openItem: {
            select: { id: true, title: true, status: true, owner: true, deadline: true },
          },
        },
      },
      gamePlans: {
        select: { id: true, title: true, status: true, date: true, version: true },
      },
      openItems: {
        select: { id: true, title: true, status: true, owner: true, deadline: true, priority: true },
      },
      previousVersion: {
        select: { id: true, title: true, documentVersion: true, receivedAt: true },
      },
      laterVersions: {
        select: { id: true, title: true, documentVersion: true, receivedAt: true },
        orderBy: { receivedAt: 'desc' },
        take: 5,
      },
    },
  })

  if (!doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  // Never expose extractedText in list — only in detail. Strip for privacy on demand.
  return NextResponse.json({ document: doc })
}
