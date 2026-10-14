import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const scenarios = await prisma.rHScenario.findMany({
    orderBy: { scenarioNumber: 'asc' },
  })
  return NextResponse.json(scenarios)
}
