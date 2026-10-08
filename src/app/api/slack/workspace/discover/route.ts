export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 60

import { NextResponse } from 'next/server'
import { discoverWorkspace } from '@/lib/slack-workspace'

export async function POST() {
  if (!process.env.SLACK_BOT_TOKEN) {
    return NextResponse.json({ error: 'SLACK_BOT_TOKEN is not configured' }, { status: 400 })
  }

  try {
    const result = await discoverWorkspace()
    return NextResponse.json({
      success: true,
      teamId: result.workspace.teamId,
      teamName: result.workspace.teamName,
      channelsDiscovered: result.channelsDiscovered,
      channelsAccessible: result.channelsAccessible,
      channelsUpserted: result.channelsUpserted,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Workspace discover error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
