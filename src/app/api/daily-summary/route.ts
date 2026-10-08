import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function todayMidnight(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

async function generateSummary() {
  const today = todayMidnight()
  const todayEnd = new Date(today.getTime() + 24 * 60 * 60 * 1000)

  const [
    newItems,
    completedItems,
    updatedItems,
    overdueItems,
    dueSoonItems,
    missingDeadlines,
    missingOwners,
    atRiskClients,
    pendingReviews,
  ] = await Promise.all([
    prisma.openItem.count({ where: { createdAt: { gte: today, lt: todayEnd } } }),
    prisma.openItem.count({
      where: { status: 'COMPLETED', updatedAt: { gte: today, lt: todayEnd } },
    }),
    prisma.openItemHistory.count({ where: { changedAt: { gte: today, lt: todayEnd } } }),
    prisma.openItem.count({ where: { isOverdue: true, status: { notIn: ['COMPLETED', 'CANCELLED'] } } }),
    prisma.openItem.count({ where: { isDueSoon: true, status: { notIn: ['COMPLETED', 'CANCELLED'] } } }),
    prisma.openItem.count({ where: { isMissingDeadline: true, status: { notIn: ['COMPLETED', 'CANCELLED'] } } }),
    prisma.openItem.count({ where: { isMissingOwner: true, status: { notIn: ['COMPLETED', 'CANCELLED'] } } }),
    prisma.client.count({ where: { health: 'AT_RISK' } }),
    prisma.reviewItem.count({ where: { status: 'PENDING' } }),
  ])

  const fullSummaryJson = JSON.stringify({
    generatedAt: new Date().toISOString(),
    newItems,
    completedItems,
    updatedItems,
    overdueItems,
    dueSoonItems,
    missingDeadlines,
    missingOwners,
    atRiskClients,
    pendingReviews,
  })

  return {
    newItems,
    completedItems,
    updatedItems,
    overdueItems,
    dueSoonItems,
    missingDeadlines,
    missingOwners,
    atRiskClients,
    pendingReviews,
    fullSummaryJson,
  }
}

export async function GET() {
  try {
    const today = todayMidnight()

    let summary = await prisma.dailySummary.findUnique({ where: { date: today } })

    if (!summary) {
      const data = await generateSummary()
      summary = await prisma.dailySummary.create({
        data: { date: today, ...data },
      })
    }

    return NextResponse.json(summary)
  } catch (error) {
    console.error('Daily summary GET error:', error)
    return NextResponse.json({ error: 'Failed to load daily summary' }, { status: 500 })
  }
}

export async function POST() {
  try {
    const today = todayMidnight()
    const data = await generateSummary()

    const summary = await prisma.dailySummary.upsert({
      where: { date: today },
      create: { date: today, ...data },
      update: { ...data, generatedAt: new Date() },
    })

    return NextResponse.json(summary)
  } catch (error) {
    console.error('Daily summary POST error:', error)
    return NextResponse.json({ error: 'Failed to generate daily summary' }, { status: 500 })
  }
}
