export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const category = searchParams.get('category')

    const where: Record<string, unknown> = { isActive: true }
    if (category) where.category = category
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ]
    }

    const scenarios = await prisma.rHScenario.findMany({
      where,
      orderBy: { scenarioNumber: 'asc' },
      select: {
        id: true,
        scenarioNumber: true,
        title: true,
        category: true,
        description: true,
        defaultSeverity: true,
        isActive: true,
        version: true,
      },
    })

    return NextResponse.json(scenarios)
  } catch (error) {
    console.error('Scenarios GET error:', error)
    return NextResponse.json({ error: 'Failed to load scenarios' }, { status: 500 })
  }
}
