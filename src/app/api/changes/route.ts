import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') ?? '7', 10)

    const since = new Date()
    since.setDate(since.getDate() - days)

    const history = await prisma.openItemHistory.findMany({
      where: {
        changedAt: { gte: since },
      },
      include: {
        openItem: {
          select: {
            id: true,
            title: true,
            client: { select: { id: true, name: true } },
            va: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { changedAt: 'desc' },
    })

    const entries = history.map((h) => ({
      id: h.id,
      openItemId: h.openItemId,
      itemTitle: h.openItem.title,
      clientName: h.openItem.client.name,
      vaName: h.openItem.va?.name ?? null,
      changedAt: h.changedAt,
      field: h.field,
      previousValue: h.previousValue,
      newValue: h.newValue,
      reason: h.reason,
      source: h.source,
      sourceLink: h.sourceLink,
      changedBy: h.changedBy,
    }))

    return NextResponse.json(entries)
  } catch (error) {
    console.error('Changes GET error:', error)
    return NextResponse.json({ error: 'Failed to load change log' }, { status: 500 })
  }
}
