import { prisma } from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/current-user'

export const dynamic = 'force-dynamic'

export default async function NewAssessmentPage({ params }: { params: { id: string } }) {
  const rhCase = await prisma.rHCase.findUnique({ where: { id: params.id } })
  if (!rhCase) notFound()

  // Get the next version number
  const lastAssessment = await prisma.rHAssessment.findFirst({
    where: { caseId: params.id },
    orderBy: { version: 'desc' },
    select: { version: true },
  })
  const version = (lastAssessment?.version ?? 0) + 1

  const assessment = await prisma.rHAssessment.create({
    data: {
      caseId: params.id,
      version,
      status: 'DRAFT',
      assessedBy: getCurrentUser(),
    },
  })

  // Advance case to AWAITING_ASSESSMENT if still NEW
  if (rhCase.status === 'NEW') {
    await prisma.rHCase.update({
      where: { id: params.id },
      data: { status: 'AWAITING_ASSESSMENT' },
    })
  }

  redirect(`/relationship-health/cases/${params.id}/assessment/${assessment.id}`)
}
