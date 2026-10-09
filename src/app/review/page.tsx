import { prisma } from '@/lib/prisma'
import { TopBar } from '@/components/layout/top-bar'
import { ReviewCard, type SerializedReview } from '@/components/review/ReviewCard'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getPendingReviews() {
  return prisma.reviewItem.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
    include: {
      openItem: {
        select: {
          id: true,
          title: true,
          client: { select: { name: true } },
          va: { select: { name: true } },
        },
      },
      sourceDocument: {
        select: { id: true, title: true, sourceType: true },
      },
    },
  })
}

export default async function ReviewPage() {
  const reviews = await getPendingReviews()

  // Serialize for client components — Dates → ISO strings
  const serialized: SerializedReview[] = reviews.map((r) => ({
    id: r.id,
    reviewType: r.reviewType,
    aiConfidence: r.aiConfidence,
    aiInterpretation: r.aiInterpretation,
    proposedAction: r.proposedAction,
    proposedData: r.proposedData,
    sourceMessage: r.sourceMessage,
    sourceLink: r.sourceLink,
    sourceTimestamp: r.sourceTimestamp,
    createdAtISO: r.createdAt.toISOString(),
    openItemId: r.openItemId,
    openItem: r.openItem
      ? {
          id: r.openItem.id,
          title: r.openItem.title,
          client: r.openItem.client,
          va: r.openItem.va ?? null,
        }
      : null,
    sourceDocument: r.sourceDocument ?? null,
  }))

  return (
    <div>
      <TopBar
        title="AI Review Queue"
        subtitle={`${reviews.length} item${reviews.length !== 1 ? 's' : ''} pending review`}
      />

      <div className="p-6 space-y-4">
        {reviews.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-16 text-center dark:border-slate-800 dark:bg-slate-950">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">Review queue is clear</p>
            <p className="text-sm text-slate-400 mt-1">All AI-generated items have been reviewed.</p>
          </div>
        ) : (
          serialized.map((review) => <ReviewCard key={review.id} review={review} />)
        )}
      </div>
    </div>
  )
}
