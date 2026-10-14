export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const scenario = await prisma.rHScenario.findUnique({
      where: { id: params.id },
    })
    if (!scenario) {
      return NextResponse.json({ error: 'Scenario not found' }, { status: 404 })
    }
    return NextResponse.json(scenario)
  } catch (error) {
    console.error('Scenario GET error:', error)
    return NextResponse.json({ error: 'Failed to load scenario' }, { status: 500 })
  }
}
