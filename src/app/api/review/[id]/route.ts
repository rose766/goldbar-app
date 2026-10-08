import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { computeItemFlags } from '@/lib/health'

const WAITING_STATUSES = ['WAITING_ON_CLIENT', 'WAITING_ON_VA', 'WAITING_ON_GOLDBAR']

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { action, reviewedBy, finalValue, rejectionReason } = body

    const reviewItem = await prisma.reviewItem.findUnique({
      where: { id: params.id },
      include: { openItem: true },
    })

    if (!reviewItem) {
      return NextResponse.json({ error: 'Review item not found' }, { status: 404 })
    }

    const now = new Date()

    if (action === 'APPROVE' || action === 'EDIT_AND_APPROVE') {
      // Parse proposedData to apply to OpenItem
      let proposedData: Record<string, unknown> = {}
      try {
        proposedData = JSON.parse(reviewItem.proposedData)
      } catch {
        proposedData = {}
      }

      // Use finalValue override if EDIT_AND_APPROVE
      if (action === 'EDIT_AND_APPROVE' && finalValue) {
        try {
          const parsed = JSON.parse(finalValue)
          proposedData = { ...proposedData, ...parsed }
        } catch {
          // finalValue is a plain string — treat as a single value update
        }
      }

      if (reviewItem.openItemId) {
        // Update existing OpenItem
        const existing = await prisma.openItem.findUnique({
          where: { id: reviewItem.openItemId },
          include: { client: { select: { staleThresholdDays: true } } },
        })

        if (existing) {
          const historyEntries: {
            openItemId: string
            field: string
            previousValue: string | null
            newValue: string | null
            changedBy: string | null
            source: string | null
            sourceLink: string | null
            reviewItemId: string
          }[] = []

          for (const [field, newVal] of Object.entries(proposedData)) {
            const prevVal = existing[field as keyof typeof existing]
            const prevStr = prevVal === null || prevVal === undefined ? null : String(prevVal)
            const newStr = newVal === null || newVal === undefined ? null : String(newVal)
            if (prevStr !== newStr) {
              historyEntries.push({
                openItemId: existing.id,
                field,
                previousValue: prevStr,
                newValue: newStr,
                changedBy: reviewedBy ?? null,
                source: 'REVIEW',
                sourceLink: reviewItem.sourceLink ?? null,
                reviewItemId: params.id,
              })
            }
          }

          // Resolve date fields
          const deadline =
            'deadline' in proposedData && proposedData.deadline != null
              ? new Date(proposedData.deadline as string)
              : existing.deadline

          const lastConfirmed =
            'lastConfirmed' in proposedData && proposedData.lastConfirmed != null
              ? new Date(proposedData.lastConfirmed as string)
              : existing.lastConfirmed

          const status = (proposedData.status as string) ?? existing.status
          const owner = (proposedData.owner as string) ?? existing.owner
          const nextStep = (proposedData.nextStep as string) ?? existing.nextStep

          const flags = computeItemFlags({
            deadline,
            status,
            lastConfirmed,
            staleThresholdDays: existing.client?.staleThresholdDays ?? 5,
            owner,
            nextStep,
          })

          let waitingSince = existing.waitingSince
          if (WAITING_STATUSES.includes(status) && !existing.waitingSince) {
            waitingSince = now
          } else if (!WAITING_STATUSES.includes(status)) {
            waitingSince = null
          }

          const updateData: Record<string, unknown> = { ...flags, waitingSince }
          const dateFields = ['deadline', 'lastConfirmed', 'amFollowUpDate', 'completedDate']
          for (const [k, v] of Object.entries(proposedData)) {
            if (dateFields.includes(k)) {
              updateData[k] = v ? new Date(v as string) : null
            } else {
              updateData[k] = v
            }
          }

          await prisma.$transaction([
            prisma.openItem.update({
              where: { id: existing.id },
              data: updateData,
            }),
            ...historyEntries.map((h) => prisma.openItemHistory.create({ data: h })),
          ])
        }
      } else {
        // No linked openItem — create one from proposedData if clientId is present
        if (proposedData.clientId) {
          const clientData = await prisma.client.findUnique({
            where: { id: proposedData.clientId as string },
            select: { staleThresholdDays: true },
          })

          const deadline = proposedData.deadline ? new Date(proposedData.deadline as string) : null
          const lastConfirmed = proposedData.lastConfirmed ? new Date(proposedData.lastConfirmed as string) : null
          const status = (proposedData.status as string) ?? 'NOT_STARTED'
          const owner = (proposedData.owner as string) ?? null
          const nextStep = (proposedData.nextStep as string) ?? null

          const flags = computeItemFlags({
            deadline,
            status,
            lastConfirmed,
            staleThresholdDays: clientData?.staleThresholdDays ?? 5,
            owner,
            nextStep,
          })

          const waitingSince = WAITING_STATUSES.includes(status) ? now : undefined

          const newItem = await prisma.openItem.create({
            data: {
              clientId: proposedData.clientId as string,
              vaId: (proposedData.vaId as string) ?? undefined,
              title: (proposedData.title as string) ?? 'Untitled Item',
              description: proposedData.description as string | undefined,
              nextStep,
              owner,
              ownerType: (proposedData.ownerType as string) ?? 'UNASSIGNED',
              status,
              priority: (proposedData.priority as string) ?? 'MEDIUM',
              deadline,
              lastConfirmed,
              source: 'SLACK',
              sourceLink: reviewItem.sourceLink ?? undefined,
              sourceTimestamp: reviewItem.sourceTimestamp ?? undefined,
              ...flags,
              waitingSince,
            },
          })

          // Link review item to new open item
          await prisma.reviewItem.update({
            where: { id: params.id },
            data: { openItemId: newItem.id },
          })
        }
      }

      const updated = await prisma.reviewItem.update({
        where: { id: params.id },
        data: {
          status: action === 'EDIT_AND_APPROVE' ? 'EDITED_AND_APPROVED' : 'APPROVED',
          reviewedBy: reviewedBy ?? null,
          reviewedAt: now,
          finalValue: finalValue ?? null,
        },
      })

      return NextResponse.json(updated)
    }

    if (action === 'REJECT') {
      const updated = await prisma.reviewItem.update({
        where: { id: params.id },
        data: {
          status: 'REJECTED',
          reviewedBy: reviewedBy ?? null,
          reviewedAt: now,
          rejectionReason: rejectionReason ?? null,
        },
      })
      return NextResponse.json(updated)
    }

    if (action === 'IGNORE') {
      const updated = await prisma.reviewItem.update({
        where: { id: params.id },
        data: {
          status: 'IGNORED',
          reviewedBy: reviewedBy ?? null,
          reviewedAt: now,
        },
      })
      return NextResponse.json(updated)
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Review PATCH error:', error)
    return NextResponse.json({ error: 'Failed to process review action' }, { status: 500 })
  }
}
