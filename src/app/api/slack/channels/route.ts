export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const classification = searchParams.get('classification')
    const ingestionEnabled = searchParams.get('ingestionEnabled')
    const analysisEnabled = searchParams.get('analysisEnabled')
    const page = parseInt(searchParams.get('page') ?? '1', 10)
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '100', 10), 500)
    const skip = (page - 1) * limit

    type WhereClause = NonNullable<Parameters<typeof prisma.slackChannel.findMany>[0]>['where']
    const where: WhereClause = {}
    if (classification) where.classification = classification
    if (ingestionEnabled !== null) where.ingestionEnabled = ingestionEnabled === 'true'
    if (analysisEnabled !== null) where.analysisEnabled = analysisEnabled === 'true'

    const [channels, total] = await Promise.all([
      prisma.slackChannel.findMany({
        where,
        orderBy: [{ channelName: 'asc' }],
        skip,
        take: limit,
        select: {
          id: true,
          slackChannelId: true,
          channelName: true,
          channelType: true,
          isPrivate: true,
          isArchived: true,
          isMember: true,
          isAccessible: true,
          enabled: true,
          ingestionEnabled: true,
          analysisEnabled: true,
          classification: true,
          cursor: true,
          lastSyncAt: true,
          lastSuccessfulSyncAt: true,
          lastError: true,
          messagesAnalyzed: true,
          messagesSkipped: true,
          totalMessages: true,
          updatedAt: true,
        },
      }),
      prisma.slackChannel.count({ where }),
    ])

    return NextResponse.json({ channels, total, page, limit })
  } catch (error) {
    console.error('Channels GET error:', error)
    return NextResponse.json({ error: 'Failed to load channels' }, { status: 500 })
  }
}
