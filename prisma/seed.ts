import { PrismaClient } from '@prisma/client'
import { addDays, subDays, subHours } from 'date-fns'

const prisma = new PrismaClient()
const today = new Date()

async function main() {
  console.log('Seeding database...')

  // ─── CLIENT 1: Apex Marketing Group — 1 VA, healthy with a few issues ────
  const apex = await prisma.client.create({
    data: {
      name: 'Apex Marketing Group',
      status: 'ACTIVE',
      accountManager: 'Rose',
      health: 'NEEDS_ATTENTION',
      healthReasons: JSON.stringify([
        '1 overdue item',
        'Waiting on client for 6 days',
        '1 item missing deadline',
      ]),
      nextCheckIn: addDays(today, 3),
      lastActivity: subDays(today, 2),
      lastItemUpdate: subDays(today, 2),
      lastConfirmedActivity: subDays(today, 6),
      staleThresholdDays: 5,
      notes: 'Long-term client. CEO is responsive but ops team is slow to provide access.',
    },
  })

  const apexVA = await prisma.vA.create({
    data: {
      clientId: apex.id,
      name: 'Maria Santos',
      role: 'Executive Assistant',
      startDate: subDays(today, 90),
      status: 'ACTIVE',
      currentPriorities: 'CRM cleanup, email management, calendar optimization',
      lastUpdate: subDays(today, 2),
      notes: 'Strong performer. Client loves her. Needs more guidance on proactive research.',
    },
  })

  const apexGamePlan = await prisma.gamePlan.create({
    data: {
      clientId: apex.id,
      title: 'Apex Q4 Operations Game Plan',
      version: 1,
      status: 'ACTIVE',
      date: subDays(today, 30),
      summary: 'Streamline operations, improve lead response time, and automate CRM workflows before end of Q4.',
      keyObjectives: '1. CRM cleanup and automation\n2. Email inbox zero system\n3. Lead response SLA improvement',
      keyCommitments: 'Client to provide CRM access by Oct 5. VA to complete audit by Oct 12.',
      nextSteps: 'Rose to follow up on CRM access. Maria to begin audit once access is granted.',
    },
  })

  const apexObj1 = await prisma.objective.create({
    data: {
      gamePlanId: apexGamePlan.id,
      title: 'CRM Cleanup & Automation',
      description: 'Audit, clean, and automate the client CRM to improve lead tracking.',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      dueDate: addDays(today, 14),
      order: 1,
    },
  })

  const apexMs1 = await prisma.milestone.create({
    data: {
      objectiveId: apexObj1.id,
      vaId: apexVA.id,
      title: 'Client provides CRM access credentials',
      status: 'NOT_STARTED',
      deadline: subDays(today, 3),
      order: 1,
    },
  })

  await prisma.milestone.create({
    data: {
      objectiveId: apexObj1.id,
      vaId: apexVA.id,
      title: 'Maria completes CRM audit',
      status: 'NOT_STARTED',
      deadline: addDays(today, 4),
      order: 2,
    },
  })

  await prisma.milestone.create({
    data: {
      objectiveId: apexObj1.id,
      vaId: apexVA.id,
      title: 'Automation workflows built and tested',
      status: 'NOT_STARTED',
      deadline: addDays(today, 14),
      order: 3,
    },
  })

  // Open items for Apex
  await prisma.openItem.create({
    data: {
      clientId: apex.id,
      vaId: apexVA.id,
      gamePlanId: apexGamePlan.id,
      objectiveId: apexObj1.id,
      milestoneId: apexMs1.id,
      title: 'Client to provide CRM access credentials',
      description: 'Client (John, CEO) committed to sharing CRM admin login by October 5. Required before Maria can begin the audit.',
      nextStep: 'Rose to follow up with John directly — credentials are now 3 days overdue.',
      owner: 'John (CEO)',
      ownerType: 'CLIENT',
      amFollowUp: true,
      amFollowUpDate: today,
      amFollowUpNotes: 'Follow up via email and Slack. This is blocking Maria\'s audit.',
      deadline: subDays(today, 3),
      deadlineStatus: 'CONFIRMED',
      status: 'WAITING_ON_CLIENT',
      priority: 'CRITICAL',
      isOverdue: true,
      isDueSoon: false,
      isStale: true,
      isMissingDeadline: false,
      isMissingOwner: false,
      isMissingNextStep: false,
      isClientLevel: false,
      waitingSince: subDays(today, 6),
      waitingFor: 'CRM credentials from John (CEO)',
      lastConfirmed: subDays(today, 6),
      source: 'GAME_PLAN',
      sourceDate: subDays(today, 30),
      sourceMessage: 'John confirmed he will send CRM access by Oct 5. Game plan slide 3.',
      confidenceLevel: 'HIGH',
    },
  })

  await prisma.openItem.create({
    data: {
      clientId: apex.id,
      vaId: apexVA.id,
      title: 'Maria to complete email management SOP',
      description: 'Create a standard operating procedure for managing client inbox using the Goldbar email management framework.',
      nextStep: 'Maria to draft SOP using the template Rose shared. Target: Oct 12.',
      owner: 'Maria Santos',
      ownerType: 'VA',
      amFollowUp: true,
      amFollowUpDate: addDays(today, 4),
      deadline: addDays(today, 4),
      deadlineStatus: 'CONFIRMED',
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
      isDueSoon: true,
      lastConfirmed: subDays(today, 1),
      source: 'SLACK',
      sourceDate: subDays(today, 7),
      sourceMessage: 'Rose: Maria is working on the email SOP, target Oct 12.',
      confidenceLevel: 'HIGH',
    },
  })

  await prisma.openItem.create({
    data: {
      clientId: apex.id,
      title: 'Schedule quarterly business review meeting',
      description: 'Rose to schedule QBR with client for Q4 review. No VA needed for this task.',
      nextStep: 'Rose to send calendar invite to John for week of Oct 21.',
      owner: 'Rose',
      ownerType: 'ACCOUNT_MANAGER',
      amFollowUp: false,
      deadline: addDays(today, 13),
      deadlineStatus: 'CONFIRMED',
      status: 'NOT_STARTED',
      priority: 'HIGH',
      isClientLevel: true,
      lastConfirmed: subDays(today, 2),
      source: 'MANUAL',
      confidenceLevel: 'HIGH',
    },
  })

  await prisma.openItem.create({
    data: {
      clientId: apex.id,
      vaId: apexVA.id,
      title: 'Improve lead response time — review current process',
      description: 'Client mentioned response time to new leads is too slow. Maria to audit and propose improvement.',
      nextStep: 'Maria to audit current response time and present findings.',
      owner: 'Maria Santos',
      ownerType: 'VA',
      amFollowUp: true,
      amFollowUpDate: addDays(today, 7),
      deadline: null,
      deadlineStatus: 'MISSING',
      status: 'NOT_STARTED',
      priority: 'HIGH',
      isMissingDeadline: true,
      confidenceLevel: 'HIGH',
      source: 'SLACK',
      sourceDate: subDays(today, 5),
      sourceMessage: 'Client flagged lead response time in last check-in. Needs improvement.',
    },
  })

  // ─── CLIENT 2: BlueSky Ventures — 2 VAs, At Risk ──────────────────────────
  const bluesky = await prisma.client.create({
    data: {
      name: 'BlueSky Ventures',
      status: 'ACTIVE',
      accountManager: 'Rose',
      health: 'AT_RISK',
      healthReasons: JSON.stringify([
        '3 overdue items',
        'VA performance concern noted',
        '2 blocked items',
        'Client has not responded in 8 days',
        '2 items missing deadlines',
      ]),
      nextCheckIn: addDays(today, 1),
      lastActivity: subDays(today, 8),
      lastItemUpdate: subDays(today, 8),
      lastConfirmedActivity: subDays(today, 8),
      staleThresholdDays: 5,
      notes: 'Client has been unresponsive. Two VAs with coordination challenges.',
    },
  })

  const bsVA1 = await prisma.vA.create({
    data: {
      clientId: bluesky.id,
      name: 'James Okafor',
      role: 'Executive Assistant',
      startDate: subDays(today, 60),
      status: 'ACTIVE',
      currentPriorities: 'Travel coordination, vendor management, inbox management',
      performanceFlags: JSON.stringify(['Missed 2 check-in deadlines', 'Response time concern']),
      lastClientFeedback: 'Client: James needs to be more proactive and responsive.',
      lastUpdate: subDays(today, 8),
    },
  })

  const bsVA2 = await prisma.vA.create({
    data: {
      clientId: bluesky.id,
      name: 'Sarah Kim',
      role: 'Operations Assistant',
      startDate: subDays(today, 45),
      status: 'ACTIVE',
      currentPriorities: 'Vendor onboarding, contract management',
      lastUpdate: subDays(today, 3),
    },
  })

  const bsGamePlan = await prisma.gamePlan.create({
    data: {
      clientId: bluesky.id,
      title: 'BlueSky Onboarding & Systems Setup',
      version: 2,
      status: 'ACTIVE',
      date: subDays(today, 45),
      summary: 'Full operational setup for BlueSky. Two-VA team to cover executive support and ops management.',
      keyObjectives: '1. Complete onboarding for both VAs\n2. Establish vendor management process\n3. Set up travel booking SOP',
      keyCommitments: 'Client to share vendor list by Sept 25. James to complete travel SOP by Oct 1.',
    },
  })

  const bsGamePlanV1 = await prisma.gamePlan.create({
    data: {
      clientId: bluesky.id,
      title: 'BlueSky Onboarding & Systems Setup',
      version: 1,
      status: 'SUPERSEDED',
      date: subDays(today, 60),
      summary: 'Initial onboarding plan. Superseded when second VA was added.',
      previousVersionId: null,
    },
  })

  await prisma.gamePlan.update({
    where: { id: bsGamePlan.id },
    data: { previousVersionId: bsGamePlanV1.id },
  })

  // Overdue + blocked items for BlueSky
  await prisma.openItem.create({
    data: {
      clientId: bluesky.id,
      vaId: bsVA1.id,
      title: 'James to complete travel booking SOP',
      description: 'Standard operating procedure for booking travel (flights, hotels, ground transport) for client executives.',
      nextStep: 'Rose to contact James today — this is 7 days overdue.',
      owner: 'James Okafor',
      ownerType: 'VA',
      amFollowUp: true,
      amFollowUpDate: today,
      deadline: subDays(today, 7),
      deadlineStatus: 'CONFIRMED',
      status: 'NOT_STARTED',
      priority: 'CRITICAL',
      isOverdue: true,
      isStale: true,
      waitingSince: subDays(today, 7),
      waitingFor: 'James to begin and complete SOP',
      lastConfirmed: subDays(today, 14),
      source: 'GAME_PLAN',
      sourceDate: subDays(today, 45),
      sourceMessage: 'Game plan commitment: James to complete travel SOP by Oct 1.',
      confidenceLevel: 'HIGH',
    },
  })

  await prisma.openItem.create({
    data: {
      clientId: bluesky.id,
      title: 'Client to share complete vendor list',
      description: 'Client (CEO) committed to sharing the full vendor list with contacts so Sarah can begin onboarding coordination.',
      nextStep: 'Rose to follow up — client has not responded to two messages over 8 days.',
      owner: 'CEO (BlueSky)',
      ownerType: 'CLIENT',
      amFollowUp: true,
      amFollowUpDate: today,
      deadline: subDays(today, 13),
      deadlineStatus: 'CONFIRMED',
      status: 'WAITING_ON_CLIENT',
      priority: 'CRITICAL',
      isOverdue: true,
      isStale: true,
      isClientLevel: true,
      waitingSince: subDays(today, 13),
      waitingFor: 'CEO to respond with vendor list',
      lastConfirmed: subDays(today, 13),
      source: 'GAME_PLAN',
      confidenceLevel: 'HIGH',
    },
  })

  await prisma.openItem.create({
    data: {
      clientId: bluesky.id,
      vaId: bsVA2.id,
      title: 'Sarah to onboard 3 new vendors into tracking system',
      description: 'Three new vendors identified but not yet onboarded because client has not provided the full list.',
      nextStep: 'Blocked — waiting on client to share vendor list. Sarah is ready to proceed once received.',
      owner: 'Sarah Kim',
      ownerType: 'VA',
      amFollowUp: true,
      amFollowUpDate: addDays(today, 1),
      deadline: subDays(today, 5),
      deadlineStatus: 'CONFIRMED',
      status: 'BLOCKED',
      priority: 'HIGH',
      isOverdue: true,
      blockerDescription: 'Waiting on client to provide vendor list (now 13 days overdue).',
      dependency: 'Client vendor list',
      source: 'SLACK',
      confidenceLevel: 'HIGH',
    },
  })

  await prisma.openItem.create({
    data: {
      clientId: bluesky.id,
      vaId: bsVA1.id,
      title: 'Address James response time — performance coaching',
      description: 'Client raised concern about James being slow to respond and not proactive enough. Rose needs to coach James.',
      nextStep: 'Rose to schedule 1:1 with James this week to address performance feedback.',
      owner: 'Rose',
      ownerType: 'ACCOUNT_MANAGER',
      amFollowUp: false,
      deadline: addDays(today, 2),
      deadlineStatus: 'CONFIRMED',
      status: 'NOT_STARTED',
      priority: 'HIGH',
      isClientLevel: false,
      source: 'SLACK',
      sourceDate: subDays(today, 2),
      sourceMessage: 'Client: James needs to be more proactive. Rose to address.',
      confidenceLevel: 'HIGH',
    },
  })

  await prisma.openItem.create({
    data: {
      clientId: bluesky.id,
      vaId: bsVA2.id,
      title: 'Sarah to draft contract review checklist',
      description: 'Create checklist for reviewing vendor contracts before CEO signature.',
      nextStep: 'Sarah to draft checklist.',
      owner: 'Sarah Kim',
      ownerType: 'VA',
      amFollowUp: true,
      amFollowUpDate: addDays(today, 5),
      deadline: null,
      deadlineStatus: 'MISSING',
      status: 'NOT_STARTED',
      priority: 'MEDIUM',
      isMissingDeadline: true,
      source: 'SLACK',
      confidenceLevel: 'HIGH',
    },
  })

  await prisma.openItem.create({
    data: {
      clientId: bluesky.id,
      vaId: bsVA2.id,
      title: 'Contract review SOP — assign deadline',
      description: 'No deadline was given for this item when it was created. Needs confirmation from Rose.',
      nextStep: 'Rose to confirm deadline with client.',
      owner: 'UNASSIGNED',
      ownerType: 'UNASSIGNED',
      amFollowUp: true,
      amFollowUpDate: addDays(today, 1),
      deadline: null,
      deadlineStatus: 'MISSING',
      status: 'NEEDS_CLARIFICATION',
      priority: 'LOW',
      isMissingDeadline: true,
      isMissingOwner: true,
      confidenceLevel: 'NEEDS_REVIEW',
      source: 'SLACK',
      sourceMessage: 'Unclear item — needs review.',
    },
  })

  // ─── CLIENT 3: Crestwood Capital — 3 VAs, On Track ───────────────────────
  const crestwood = await prisma.client.create({
    data: {
      name: 'Crestwood Capital',
      status: 'ACTIVE',
      accountManager: 'Rose',
      health: 'ON_TRACK',
      healthReasons: JSON.stringify(['All items on track', 'Active updates from VA team']),
      nextCheckIn: addDays(today, 7),
      lastActivity: subDays(today, 1),
      lastItemUpdate: subDays(today, 1),
      lastConfirmedActivity: subDays(today, 1),
      staleThresholdDays: 5,
      notes: 'Flagship client. 3-VA team. Very organized. CEO sends weekly updates.',
    },
  })

  const cwVA1 = await prisma.vA.create({
    data: {
      clientId: crestwood.id,
      name: 'Lisa Chen',
      role: 'Chief of Staff EA',
      startDate: subDays(today, 180),
      status: 'ACTIVE',
      currentPriorities: 'CEO calendar, board communications, strategic projects',
      lastClientFeedback: 'Lisa is excellent — feels like a true partner.',
      lastUpdate: subDays(today, 1),
    },
  })

  const cwVA2 = await prisma.vA.create({
    data: {
      clientId: crestwood.id,
      name: 'Tom Rivera',
      role: 'Operations EA',
      startDate: subDays(today, 120),
      status: 'ACTIVE',
      currentPriorities: 'Vendor management, team scheduling, expense reporting',
      lastUpdate: subDays(today, 1),
    },
  })

  const cwVA3 = await prisma.vA.create({
    data: {
      clientId: crestwood.id,
      name: 'David Park',
      role: 'Research & Analytics EA',
      startDate: subDays(today, 45),
      status: 'ACTIVE',
      currentPriorities: 'Market research, competitor analysis, investor reports',
      lastUpdate: subDays(today, 2),
    },
  })

  const cwGamePlan = await prisma.gamePlan.create({
    data: {
      clientId: crestwood.id,
      title: 'Crestwood Q4 Strategic Operations Plan',
      version: 1,
      status: 'ACTIVE',
      date: subDays(today, 14),
      summary: 'Full-team Q4 plan covering investor relations, operational efficiency, and new market research.',
      keyObjectives: '1. Board meeting preparation\n2. Operational cost analysis\n3. New market opportunity research',
      keyCommitments: 'All VAs to submit weekly updates every Friday. David to deliver market research by Oct 20.',
      lastReviewed: subDays(today, 1),
    },
  })

  const cwObj1 = await prisma.objective.create({
    data: {
      gamePlanId: cwGamePlan.id,
      title: 'Board Meeting Preparation',
      description: 'Full preparation for Q4 board meeting including materials, logistics, and communications.',
      status: 'IN_PROGRESS',
      priority: 'CRITICAL',
      dueDate: addDays(today, 12),
      order: 1,
    },
  })

  await prisma.openItem.create({
    data: {
      clientId: crestwood.id,
      vaId: cwVA1.id,
      gamePlanId: cwGamePlan.id,
      objectiveId: cwObj1.id,
      title: 'Lisa to compile board meeting materials',
      description: 'Collect and format all materials for Q4 board meeting: financials, strategy deck, action items.',
      nextStep: 'Lisa to finalize deck and send to CEO for review by Oct 15.',
      owner: 'Lisa Chen',
      ownerType: 'VA',
      amFollowUp: true,
      amFollowUpDate: addDays(today, 7),
      deadline: addDays(today, 7),
      deadlineStatus: 'CONFIRMED',
      status: 'IN_PROGRESS',
      priority: 'CRITICAL',
      lastConfirmed: subDays(today, 1),
      source: 'GAME_PLAN',
      confidenceLevel: 'HIGH',
    },
  })

  await prisma.openItem.create({
    data: {
      clientId: crestwood.id,
      vaId: cwVA2.id,
      title: 'Tom to complete Q4 expense report',
      description: 'Compile all Q3 and early Q4 expenses for CFO review.',
      nextStep: 'Tom to send expense report to CFO by Oct 14.',
      owner: 'Tom Rivera',
      ownerType: 'VA',
      amFollowUp: false,
      deadline: addDays(today, 6),
      deadlineStatus: 'CONFIRMED',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      lastConfirmed: subDays(today, 1),
      source: 'SLACK',
      confidenceLevel: 'HIGH',
    },
  })

  await prisma.openItem.create({
    data: {
      clientId: crestwood.id,
      vaId: cwVA3.id,
      title: 'David to deliver market research report',
      description: 'Research 3 new market opportunities in Southeast Asia. Deliver executive summary.',
      nextStep: 'David to finalize report by Oct 20 and send to CEO.',
      owner: 'David Park',
      ownerType: 'VA',
      amFollowUp: true,
      amFollowUpDate: addDays(today, 12),
      deadline: addDays(today, 12),
      deadlineStatus: 'CONFIRMED',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      lastConfirmed: subDays(today, 2),
      source: 'GAME_PLAN',
      confidenceLevel: 'HIGH',
    },
  })

  // Completed item
  await prisma.openItem.create({
    data: {
      clientId: crestwood.id,
      vaId: cwVA1.id,
      title: 'Set up recurring team standup calendar invites',
      description: 'Lisa to create weekly standup invites for the full team.',
      nextStep: 'Done.',
      owner: 'Lisa Chen',
      ownerType: 'VA',
      amFollowUp: false,
      deadline: subDays(today, 5),
      deadlineStatus: 'CONFIRMED',
      status: 'COMPLETED',
      priority: 'MEDIUM',
      completionEvidence: 'Calendar invites sent and confirmed by all team members.',
      completedDate: subDays(today, 6),
      lastConfirmed: subDays(today, 6),
      source: 'SLACK',
      sourceDate: subDays(today, 6),
      sourceMessage: 'Lisa: All standup invites sent and accepted!',
      confidenceLevel: 'HIGH',
    },
  })

  await prisma.openItem.create({
    data: {
      clientId: crestwood.id,
      title: 'Renew annual service agreement',
      description: 'Client contract renewal due. Rose to initiate renewal conversation with CEO.',
      nextStep: 'Rose to send renewal proposal to CEO by Oct 20.',
      owner: 'Rose',
      ownerType: 'ACCOUNT_MANAGER',
      amFollowUp: false,
      deadline: addDays(today, 22),
      deadlineStatus: 'CONFIRMED',
      status: 'NOT_STARTED',
      priority: 'HIGH',
      isClientLevel: true,
      source: 'MANUAL',
      confidenceLevel: 'HIGH',
    },
  })

  // ─── Review Items (AI-flagged) ────────────────────────────────────────────
  await prisma.reviewItem.create({
    data: {
      reviewType: 'POSSIBLE_DUPLICATE',
      status: 'PENDING',
      aiInterpretation: 'Slack message mentions "client to send CRM credentials" which appears to match existing item "Client to provide CRM access credentials" for Apex Marketing Group.',
      aiConfidence: 'MEDIUM',
      proposedAction: 'UPDATE',
      proposedData: JSON.stringify({
        openItemId: '(existing item id)',
        field: 'lastConfirmed',
        value: new Date().toISOString(),
      }),
      sourceMessage: 'John said he\'ll get the CRM login to Maria this week.',
      sourceTimestamp: new Date().toISOString(),
      notes: 'May be duplicate of existing CRM credentials item. Review before creating new item.',
    },
  })

  await prisma.reviewItem.create({
    data: {
      reviewType: 'MISSING_DEADLINE',
      status: 'PENDING',
      aiInterpretation: 'Message mentions a new task for BlueSky but no deadline was stated.',
      aiConfidence: 'HIGH',
      proposedAction: 'CREATE',
      proposedData: JSON.stringify({
        clientName: 'BlueSky Ventures',
        vaName: 'Sarah Kim',
        title: 'Sarah to update vendor tracking spreadsheet',
        owner: 'Sarah Kim',
        ownerType: 'VA',
        deadlineStatus: 'MISSING',
      }),
      sourceMessage: 'Can Sarah update the vendor tracking sheet when she gets a chance?',
      sourceTimestamp: subDays(today, 1).toISOString(),
      notes: 'Item extracted but no deadline. Needs Rose to confirm deadline before creating.',
    },
  })

  await prisma.reviewItem.create({
    data: {
      reviewType: 'POSSIBLE_COMPLETION',
      status: 'PENDING',
      aiInterpretation: 'Slack message may indicate that the Crestwood standup invites item was completed, but language is ambiguous.',
      aiConfidence: 'MEDIUM',
      proposedAction: 'COMPLETE',
      proposedData: JSON.stringify({
        title: 'Set up recurring team standup calendar invites',
        status: 'COMPLETED',
        completionEvidence: 'Slack: invites sent and accepted',
      }),
      sourceMessage: 'I think Lisa got those calendar invites out finally.',
      sourceTimestamp: subDays(today, 3).toISOString(),
      notes: 'Language is uncertain ("I think"). Flagged for Rose to confirm before marking complete.',
    },
  })

  // ─── History entries ──────────────────────────────────────────────────────
  const overdueApexItem = await prisma.openItem.findFirst({
    where: { clientId: apex.id, title: { contains: 'CRM access' } },
  })

  if (overdueApexItem) {
    await prisma.openItemHistory.create({
      data: {
        openItemId: overdueApexItem.id,
        field: 'deadline',
        previousValue: subDays(today, 10).toISOString(),
        newValue: subDays(today, 3).toISOString(),
        reason: 'Client requested extension from original Oct 1 to Oct 5 deadline.',
        source: 'Slack — account-management channel',
        changedBy: 'AI (High Confidence)',
        changedAt: subDays(today, 5),
      },
    })

    await prisma.openItemHistory.create({
      data: {
        openItemId: overdueApexItem.id,
        field: 'status',
        previousValue: 'NOT_STARTED',
        newValue: 'WAITING_ON_CLIENT',
        reason: 'Item transitioned to waiting after deadline passed without response.',
        source: 'System',
        changedBy: 'System',
        changedAt: subDays(today, 3),
      },
    })
  }

  // ─── Daily Summary ────────────────────────────────────────────────────────
  await prisma.dailySummary.create({
    data: {
      date: today,
      newItems: 2,
      completedItems: 1,
      updatedItems: 4,
      overdueItems: 4,
      dueSoonItems: 3,
      missingDeadlines: 4,
      missingOwners: 1,
      atRiskClients: 1,
      pendingReviews: 3,
      fullSummaryJson: JSON.stringify({
        immediateAttention: [
          'Apex: CRM credentials now 3 days overdue — John has not responded',
          'BlueSky: Travel SOP 7 days overdue — James has not started',
          'BlueSky: Vendor list 13 days overdue — CEO unresponsive',
        ],
        clientsAtRisk: ['BlueSky Ventures'],
        clientsNeedingAttention: ['Apex Marketing Group'],
        completedToday: ['Crestwood: Standup invites confirmed complete'],
        newToday: ['BlueSky: Contract review checklist added', 'Apex: QBR scheduling added'],
      }),
      generatedAt: today,
    },
  })

  console.log('✅ Seed complete.')
  console.log('  Clients: 3')
  console.log('  VAs: 6 (1 + 2 + 3)')
  console.log('  Game Plans: 4')
  console.log('  Open Items: 15+')
  console.log('  Review Items: 3')
  console.log('  History entries: 2')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
