/**
 * prisma/restore.ts
 *
 * Idempotent data restore for the Goldbar Command Center.
 * Reads prisma/restore-data.json and upserts every record in the correct
 * dependency order. Safe to run multiple times — existing records are updated
 * in place, no duplicates are created.
 *
 * Usage (in the project root):
 *   npx tsx prisma/restore.ts
 *
 * Prerequisites:
 *   - DATABASE_URL must be set (via .env.local or environment)
 *   - Prisma migrations must already be applied:
 *       npx prisma migrate deploy   (or npx prisma db push)
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

// ─── Load export file ─────────────────────────────────────────────────────────

const exportPath = path.join(__dirname, 'restore-data.json')
if (!fs.existsSync(exportPath)) {
  console.error('restore-data.json not found at', exportPath)
  process.exit(1)
}

const exported = JSON.parse(fs.readFileSync(exportPath, 'utf-8'))
const t = exported.tables

console.log('Restoring Goldbar Command Center data...')
console.log('Export timestamp:', exported.exportedAt)
console.log('Records to restore:', {
  clients: t.clients.length,
  vas: t.vas.length,
  sourceDocuments: t.sourceDocuments.length,
  gamePlans: t.gamePlans.length,
  objectives: t.objectives.length,
  milestones: t.milestones.length,
  openItems: t.openItems.length,
  openItemHistory: t.openItemHistory.length,
  reviewItems: t.reviewItems.length,
  clientHealthHistory: t.clientHealthHistory.length,
  dailySummaries: t.dailySummaries.length,
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Convert date strings back to Date objects for specified fields
function dates<T extends Record<string, unknown>>(obj: T, fields: string[]): T {
  const out = { ...obj }
  for (const f of fields) {
    if (typeof out[f] === 'string') {
      out[f] = new Date(out[f] as string) as unknown as T[typeof f]
    }
  }
  return out
}

// ─── Main restore ─────────────────────────────────────────────────────────────

async function main() {
  // 1. Clients — no dependencies
  for (const r of t.clients) {
    const data = dates(r, [
      'nextCheckIn', 'lastActivity', 'lastDashboardUpdate', 'lastDocumentSync',
      'lastItemUpdate', 'lastConfirmedActivity', 'createdAt', 'updatedAt',
    ])
    await prisma.client.upsert({ where: { id: r.id }, create: data, update: data })
  }
  console.log(`  ✓ ${t.clients.length} Clients`)

  // 2. VAs — depends on Client
  for (const r of t.vas) {
    const data = dates(r, ['startDate', 'lastUpdate', 'createdAt', 'updatedAt'])
    await prisma.vA.upsert({ where: { id: r.id }, create: data, update: data })
  }
  console.log(`  ✓ ${t.vas.length} VAs`)

  // 3. SourceDocuments — depends on Client; self-reference handled in second pass
  //    First pass: insert without previousVersionId
  for (const r of t.sourceDocuments) {
    const data = dates(
      { ...r, previousVersionId: null },
      ['uploadedAt', 'receivedAt', 'lastProcessedAt', 'createdAt', 'updatedAt'],
    )
    await prisma.sourceDocument.upsert({ where: { id: r.id }, create: data, update: data })
  }
  //    Second pass: wire previousVersionId
  for (const r of t.sourceDocuments) {
    if (r.previousVersionId) {
      await prisma.sourceDocument.update({
        where: { id: r.id },
        data: { previousVersionId: r.previousVersionId },
      })
    }
  }
  console.log(`  ✓ ${t.sourceDocuments.length} SourceDocuments`)

  // 4. GamePlans — depends on Client, SourceDocument; self-reference in second pass
  for (const r of t.gamePlans) {
    const data = dates(
      { ...r, previousVersionId: null },
      ['date', 'lastReviewed', 'createdAt', 'updatedAt'],
    )
    await prisma.gamePlan.upsert({ where: { id: r.id }, create: data, update: data })
  }
  for (const r of t.gamePlans) {
    if (r.previousVersionId) {
      await prisma.gamePlan.update({
        where: { id: r.id },
        data: { previousVersionId: r.previousVersionId },
      })
    }
  }
  console.log(`  ✓ ${t.gamePlans.length} GamePlans`)

  // 5. Objectives — depends on GamePlan
  for (const r of t.objectives) {
    const data = dates(r, ['dueDate', 'createdAt', 'updatedAt'])
    await prisma.objective.upsert({ where: { id: r.id }, create: data, update: data })
  }
  console.log(`  ✓ ${t.objectives.length} Objectives`)

  // 6. Milestones — depends on Objective, VA
  for (const r of t.milestones) {
    const data = dates(r, ['deadline', 'completedAt', 'createdAt', 'updatedAt'])
    await prisma.milestone.upsert({ where: { id: r.id }, create: data, update: data })
  }
  console.log(`  ✓ ${t.milestones.length} Milestones`)

  // 7. OpenItems — depends on Client, VA, GamePlan, Objective, Milestone, SourceDocument
  for (const r of t.openItems) {
    const data = dates(r, [
      'amFollowUpDate', 'deadline', 'waitingSince', 'lastConfirmed',
      'sourceDate', 'completedDate', 'createdAt', 'updatedAt',
    ])
    await prisma.openItem.upsert({ where: { id: r.id }, create: data, update: data })
  }
  console.log(`  ✓ ${t.openItems.length} OpenItems`)

  // 8. OpenItemHistory — depends on OpenItem
  for (const r of t.openItemHistory) {
    const data = dates(r, ['changedAt'])
    await prisma.openItemHistory.upsert({ where: { id: r.id }, create: data, update: data })
  }
  console.log(`  ✓ ${t.openItemHistory.length} OpenItemHistory entries`)

  // 9. ReviewItems — depends on SourceDocument, OpenItem
  for (const r of t.reviewItems) {
    const data = dates(r, ['reviewedAt', 'createdAt', 'updatedAt'])
    await prisma.reviewItem.upsert({ where: { id: r.id }, create: data, update: data })
  }
  console.log(`  ✓ ${t.reviewItems.length} ReviewItems`)

  // 10. ClientHealthHistory — depends on Client
  for (const r of t.clientHealthHistory) {
    const data = dates(r, ['changedAt'])
    await prisma.clientHealthHistory.upsert({ where: { id: r.id }, create: data, update: data })
  }
  console.log(`  ✓ ${t.clientHealthHistory.length} ClientHealthHistory entries`)

  // 11. DailySummaries — no dependencies
  for (const r of t.dailySummaries) {
    const data = dates(r, ['date', 'generatedAt'])
    await prisma.dailySummary.upsert({ where: { id: r.id }, create: data, update: data })
  }
  console.log(`  ✓ ${t.dailySummaries.length} DailySummaries`)

  // ─── Verification ──────────────────────────────────────────────────────────
  console.log('\nVerifying restored counts...')
  const restored = {
    clients: await prisma.client.count(),
    vas: await prisma.vA.count(),
    sourceDocuments: await prisma.sourceDocument.count(),
    gamePlans: await prisma.gamePlan.count(),
    objectives: await prisma.objective.count(),
    milestones: await prisma.milestone.count(),
    openItems: await prisma.openItem.count(),
    openItemHistory: await prisma.openItemHistory.count(),
    reviewItems: await prisma.reviewItem.count(),
    clientHealthHistory: await prisma.clientHealthHistory.count(),
    dailySummaries: await prisma.dailySummary.count(),
  }

  const expected: Record<string, number> = {
    clients: t.clients.length,
    vas: t.vas.length,
    sourceDocuments: t.sourceDocuments.length,
    gamePlans: t.gamePlans.length,
    objectives: t.objectives.length,
    milestones: t.milestones.length,
    openItems: t.openItems.length,
    openItemHistory: t.openItemHistory.length,
    reviewItems: t.reviewItems.length,
    clientHealthHistory: t.clientHealthHistory.length,
    dailySummaries: t.dailySummaries.length,
  }

  let allMatch = true
  for (const [table, count] of Object.entries(restored)) {
    const exp = expected[table]
    const ok = count >= exp
    if (!ok) allMatch = false
    console.log(`  ${ok ? '✓' : '✗'} ${table}: ${count} (expected ${exp})`)
  }

  if (allMatch) {
    console.log('\n✅ Restore complete — all counts verified.')
  } else {
    console.error('\n❌ Some counts do not match. Check above output.')
    process.exit(1)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
