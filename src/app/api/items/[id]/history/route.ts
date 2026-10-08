export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const history = await prisma.openItemHistory.findMany({
      where: { openItemId: params.id },
      orderBy: { changedAt: 'desc' },
    })
    return NextResponse.json(history)
  } catch (error) {
    console.error('Item history GET error:', error)
    return NextResponse.json({ error: 'Failed to load item history' }, { status: 500 })
  }
}
