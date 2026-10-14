import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const scenarios = [
  {
    scenarioNumber: 1,
    title: 'Passive VA: Low Initiative',
    category: 'INITIATIVE',
    defaultSeverity: 'MODERATE',
    description: 'The VA consistently waits to be told what to do rather than proactively identifying tasks, opportunities, or improvements. Work is reactive rather than driven.',
    warningSigns: JSON.stringify([
      'VA only completes explicitly assigned tasks with no additional contributions',
      'Client frequently reports needing to remind VA of recurring tasks',
      'VA does not ask clarifying questions or suggest improvements',
      'Low volume of proactive updates or status reports from VA',
      'Client feedback indicates frustration with lack of drive',
      'VA rarely surfaces problems until they become urgent',
    ]),
    potentialRootCauses: JSON.stringify([
      'VA is unclear about what level of autonomy the client expects',
      'VA fears overstepping or making decisions without approval',
      'VA lacks confidence in their skills or knowledge of the client\'s business',
      'Client has previously rejected VA\'s independent actions, discouraging initiative',
      'VA has not been properly onboarded to understand client\'s business context',
    ]),
    vaQuestions: JSON.stringify([
      'Can you describe what a typical week looks like for you with this client?',
      'When you notice something that could be improved, what do you usually do?',
      'Have you ever taken initiative on something and had it not go well? Tell me about that.',
      'How does the client communicate their priorities to you?',
      'What stops you from taking on more independently?',
      'Do you feel confident you understand what success looks like for this role?',
    ]),
    clientQuestions: JSON.stringify([
      'What level of proactivity were you expecting from your VA?',
      'Can you give me an example of a time you wished your VA had acted without being asked?',
      'How do you prefer your VA to communicate ideas or suggestions?',
      'Have you given your VA feedback about initiative before? How did they respond?',
      'Are there areas where you\'d like your VA to own things more independently?',
      'How clearly have you defined what "proactive" means in your working relationship?',
    ]),
    evidenceToCollect: JSON.stringify([
      'Review of VA\'s task completion log for evidence of self-initiated tasks',
      'Client emails or messages showing repeated reminders for recurring tasks',
      'Assessment of VA\'s onboarding documentation and role clarity notes',
      'Any feedback history from client about VA performance',
      'Examples of tasks VA should have identified vs tasks that were assigned',
    ]),
    vaCoaching: JSON.stringify([
      'Clarify expectations: work with VA to explicitly define what initiative looks like for this client',
      'Build a proactive check-in habit: coach VA to send a weekly priorities update every Monday',
      'Teach the "see it, own it" framework: if VA notices something unaddressed, they flag or fix it',
      'Role-play scenarios where VA practices taking small independent actions',
      'Give VA a specific list of recurring tasks they should own without prompting',
      'Set a 30-day goal with one measurable proactive action per week',
    ]),
    vaScript: `Hi {{VA_NAME}}, I wanted to connect with you about your partnership with {{CLIENT_NAME}}.

One of the areas I want us to focus on together is initiative—specifically, how we can shift from waiting for direction to actively driving things forward.

I know this can feel tricky, especially when you're still learning what the client needs. But from the client's perspective, they're looking for someone who notices opportunities, flags issues early, and owns recurring responsibilities without needing a reminder.

Here's what I'd like to try: each week, I want you to identify at least one thing you can improve, start, or flag proactively—without being asked. This doesn't need to be big. It could be noticing an inbox that needs organizing, following up on something that's been pending, or sending a weekly priorities email on your own.

Let's make a plan together. What's one area where you feel you could take more ownership starting this week?`,
    clientScript: `Hi {{CLIENT_NAME}}, I'm reaching out as part of our ongoing support for your VA partnership.

We've been reviewing how things are going with {{VA_NAME}}, and I want to make sure we address something that's come up: the level of proactive support you're receiving.

We're working directly with {{VA_NAME}} to build stronger initiative habits and help them understand exactly what ownership looks like in your context. To make that work well, it helps to have your input on what "ideal" looks like for you.

Could you share one or two examples of things you wish your VA would handle without being asked? That will help us set very clear expectations and measure progress. We want this partnership working the way you envisioned.`,
    correctiveActions: JSON.stringify([
      'AM meets with VA to co-create a list of 5 recurring tasks VA will own independently',
      'VA sends client a weekly Monday priorities update for the next 4 weeks',
      'AM checks in with client after 2 weeks to assess improvement',
      'VA submits one proactive improvement suggestion to client per week for 30 days',
      'Document expectations in shared VA-client working agreement',
    ]),
    successMeasures: JSON.stringify([
      'Client confirms VA is completing recurring tasks without reminders within 30 days',
      'VA sends at least 3 unprompted status updates over the next month',
      'Client satisfaction score improves on next check-in call',
      'Zero "reminder needed" complaints from client in next 30-day period',
    ]),
    escalationCriteria: JSON.stringify([
      'No measurable improvement after 30 days of coaching',
      'Client explicitly requests a different VA due to initiative concerns',
      'VA shows resistance to coaching or engagement expectations',
      'Client\'s business is experiencing real harm from missed proactive actions',
    ]),
    relatedScenarios: JSON.stringify([2, 8, 13]),
  },
  {
    scenarioNumber: 2,
    title: 'Intimidated VA: Difficult Client',
    category: 'COMMUNICATION',
    defaultSeverity: 'MODERATE',
    description: 'The VA is uncomfortable, fearful, or walking on eggshells around the client due to the client\'s communication style, demanding nature, or previous negative interactions.',
    warningSigns: JSON.stringify([
      'VA expresses anxiety or dread about communicating with the client',
      'VA avoids updating the client, leading to communication gaps',
      'VA makes errors due to stress or fear of asking clarifying questions',
      'VA misses deadlines because they\'re afraid to push back on unrealistic requests',
      'VA mentions feeling criticized, dismissed, or belittled by the client',
      'VA requests to be switched to a different client',
    ]),
    potentialRootCauses: JSON.stringify([
      'Client has a blunt or aggressive communication style that the VA perceives as hostile',
      'VA lacks confidence in handling difficult personalities',
      'Previous negative interaction (e.g., being yelled at or publicly criticized) created fear',
      'VA has not received coaching on how to communicate assertively with challenging clients',
      'Client\'s expectations are unclear, making every interaction feel high-stakes',
    ]),
    vaQuestions: JSON.stringify([
      'How would you describe your working relationship with this client right now?',
      'Is there a specific interaction that shifted how you feel about working with them?',
      'What do you do when the client asks for something you\'re unsure about?',
      'How comfortable are you asking the client questions or pushing back on a deadline?',
      'What would make you feel more confident in your interactions with them?',
      'Have you ever felt uncomfortable or unsafe in an interaction with this client?',
    ]),
    clientQuestions: JSON.stringify([
      'How would you describe your communication style when you\'re under pressure?',
      'Have there been any misunderstandings with your VA that frustrated you?',
      'How do you prefer your VA to ask questions or raise concerns?',
      'Is there anything you feel your VA should be handling better?',
      'Do you feel the communication between you and your VA is working well?',
    ]),
    evidenceToCollect: JSON.stringify([
      'VA\'s account of specific incidents that caused discomfort',
      'Any message logs or email threads showing concerning communication patterns',
      'Record of missed updates or communication gaps and their timing',
      'Client\'s history with previous VAs if applicable',
      'VA\'s performance data before and after the shift in dynamic',
    ]),
    vaCoaching: JSON.stringify([
      'Validate VA\'s experience and confirm their wellbeing is a priority',
      'Provide scripts for handling tense conversations or difficult requests assertively',
      'Role-play challenging client scenarios to build confidence',
      'Coach VA to use written communication as a buffer when verbal interaction is stressful',
      'Set clear boundaries: what the VA should escalate to AM vs handle directly',
      'Weekly check-ins with VA to monitor emotional wellbeing and confidence',
    ]),
    vaScript: `Hi {{VA_NAME}}, I really appreciate you sharing how you\'re feeling with me. What you\'re experiencing matters, and I want to make sure we address it directly.

First — you are not doing anything wrong by feeling this way. Working with strong personalities can be genuinely challenging, and it takes skill to navigate it. That\'s something we can build together.

I want to give you some tools to feel more in control of these interactions. We\'re going to work on a few things: how to ask clarifying questions in a way that feels confident rather than apologetic, how to handle a sharp reply without internalizing it, and how to know when to escalate something to me instead of absorbing it alone.

Your job is not to manage the client\'s mood — your job is to do great work. Let\'s talk through the specific situations that have felt hardest and build a playbook for each one. You don\'t have to figure this out alone.`,
    clientScript: `Hi {{CLIENT_NAME}}, I\'m checking in about how your VA partnership is going.

We want to make sure {{VA_NAME}} is set up to do their best work for you. Part of that means making sure communication between you is flowing well.

I\'d love to hear your perspective on how things are going, and I also wanted to flag that {{VA_NAME}} has expressed some uncertainty about how to best communicate with you — particularly around clarifying questions and timelines. We\'re coaching them on that, and I want to make sure we\'re aligned on what ideal communication looks like from your end as well.

Is there anything you\'d like us to know about your preferred working style that would help us calibrate?`,
    correctiveActions: JSON.stringify([
      'AM speaks directly with VA to assess psychological safety and document concerns',
      'AM has a separate call with client to align on communication expectations',
      'Provide VA with assertive communication scripts for the top 3 challenging scenarios',
      'Establish a direct AM escalation path for any inappropriate client behavior',
      'Review dynamic again in 14 days to assess improvement',
    ]),
    successMeasures: JSON.stringify([
      'VA reports feeling more confident in client interactions within 30 days',
      'No escalations from VA about discomfort or mistreatment in next 30 days',
      'Communication cadence between VA and client normalizes',
      'Client confirms satisfaction with VA communication on next check-in',
    ]),
    escalationCriteria: JSON.stringify([
      'VA reports any abusive, harassing, or threatening behavior from client',
      'VA\'s mental health or performance is significantly impacted',
      'Client refuses to adjust communication style despite coaching',
      'Situation does not improve after two coaching cycles',
    ]),
    relatedScenarios: JSON.stringify([11, 18, 19]),
  },
  {
    scenarioNumber: 3,
    title: 'Unresponsive Client: Limited Communication',
    category: 'CLIENT_ENGAGEMENT',
    defaultSeverity: 'MODERATE',
    description: 'The client is consistently slow to respond, hard to reach, or disengaged from the partnership, causing the VA to stall, wait for decisions, or work without direction.',
    warningSigns: JSON.stringify([
      'VA reports frequent delays due to waiting on client responses',
      'Client takes 24-72+ hours to reply to routine messages',
      'Client cancels or misses check-in calls repeatedly',
      'VA is unable to complete tasks because client hasn\'t provided needed decisions or access',
      'Client does not review or approve deliverables in a timely manner',
      'VA is unsure what to prioritize due to lack of client direction',
    ]),
    potentialRootCauses: JSON.stringify([
      'Client is overwhelmed with other priorities and has deprioritized VA management',
      'Client did not establish clear communication norms at the start of the engagement',
      'Client lacks confidence in how to work with a VA effectively',
      'Client has low urgency about the engagement due to unclear ROI',
      'Client does not understand the impact their unresponsiveness has on VA output',
    ]),
    vaQuestions: JSON.stringify([
      'How do you handle it when you\'re waiting on the client for something urgent?',
      'What channels have you tried to reach the client through?',
      'Are there tasks you can work on independently while waiting for client input?',
      'How long does it typically take for the client to respond to your messages?',
      'Have you clearly communicated to the client when you\'re blocked?',
    ]),
    clientQuestions: JSON.stringify([
      'How often do you feel you need to be involved in the day-to-day work of your VA?',
      'What\'s the best way and time to reach you during the week?',
      'Do you feel the current communication frequency is working for you?',
      'Are you aware of how delays in your responses affect your VA\'s ability to work?',
      'What would make it easier for you to stay connected to what your VA is doing?',
      'Are there any barriers making it hard to stay engaged right now?',
    ]),
    evidenceToCollect: JSON.stringify([
      'VA\'s message log showing sent messages and response times',
      'List of tasks stalled due to client non-response',
      'Record of canceled or missed check-in calls',
      'Client\'s onboarding materials to assess what communication norms were set',
      'Any prior complaints or flags from VA about this issue',
    ]),
    vaCoaching: JSON.stringify([
      'Coach VA to send structured weekly updates even without a response to stay visible',
      'Establish a decision queue: a running document of items needing client input',
      'Teach VA to set response deadlines in their messages: "If I don\'t hear back by Friday, I\'ll proceed with option A"',
      'Encourage VA to use multiple channels (email, Slack, text) with a clear escalation order',
      'Help VA identify tasks they can advance independently while waiting',
      'Clarify when VA should escalate unresponsiveness to AM',
    ]),
    vaScript: `Hi {{VA_NAME}}, I want to talk about the communication challenges you\'ve been experiencing with {{CLIENT_NAME}}.

First — this is a common issue and it\'s not a reflection of your performance. Some clients are genuinely hard to reach, especially when they\'re busy. But it does create real blockers for you, and we need to address it.

Here are a few things I\'d like you to try. First, start sending a brief weekly update every Monday — even if they don\'t respond. This keeps you visible and creates a paper trail of your progress. Second, for any item you need a decision on, send a message that includes a default: "If I don\'t hear back by Thursday, I\'ll go ahead with X." This keeps you moving forward while still looping them in. Third, keep a decision queue document that tracks what\'s waiting on them.

If none of this moves the needle in two weeks, please let me know and I\'ll reach out directly to the client.`,
    clientScript: `Hi {{CLIENT_NAME}}, I\'m following up as part of our support check-in for your VA engagement.

{{VA_NAME}} is doing their part and working hard to make progress for you. To keep things moving, they do occasionally need timely responses to questions or decisions.

I know your time is valuable, so I want to make this as easy as possible. Would it help to set up a consistent 15-minute weekly touchpoint? Even asynchronous — a quick Slack or email review of a list they send you — can make a big difference in what they\'re able to accomplish each week.

Let\'s figure out a rhythm that works for your schedule. What does your availability look like?`,
    correctiveActions: JSON.stringify([
      'AM contacts client directly to reset communication expectations',
      'Establish agreed response time standard (e.g., 24 hours for non-urgent items)',
      'VA implements decision queue and default-action messaging technique',
      'AM monitors communication cadence over next 30 days',
      'If unresponsiveness continues, escalate to leadership for client engagement review',
    ]),
    successMeasures: JSON.stringify([
      'Client response time drops to under 24 hours for non-urgent items within 30 days',
      'VA has no stalled tasks due to client unresponsiveness for 2 consecutive weeks',
      'Client attends at least 2 scheduled check-ins within next 30 days',
    ]),
    escalationCriteria: JSON.stringify([
      'Client is unreachable for more than 7 days without explanation',
      'VA\'s output is severely compromised due to lack of direction',
      'Client engagement has not improved after two direct AM outreaches',
      'VA requests reassignment due to inability to perform their role',
    ]),
    relatedScenarios: JSON.stringify([4, 16, 22]),
  },
  {
    scenarioNumber: 4,
    title: 'Client Won\'t Delegate',
    category: 'DELEGATION',
    defaultSeverity: 'MODERATE',
    description: 'The client struggles to hand off tasks effectively, either holding onto work they should delegate, delegating poorly, or micromanaging after delegating.',
    warningSigns: JSON.stringify([
      'VA is underutilized — consistently has less than expected work',
      'Client frequently takes tasks back after assigning them',
      'Client redoes VA\'s work rather than providing feedback',
      'Client does not provide enough context for VA to complete tasks independently',
      'VA reports that most tasks come at the last minute with little lead time',
      'Client expresses that it\'s "easier to just do it myself"',
    ]),
    potentialRootCauses: JSON.stringify([
      'Client has never worked with a VA before and struggles to let go of control',
      'Client has had bad experiences with VAs in the past',
      'Client hasn\'t clearly articulated their standards and therefore can\'t delegate confidently',
      'Tasks are too complex or nuanced for the current VA\'s skill level',
      'Client lacks time to invest in training and onboarding the VA properly',
    ]),
    vaQuestions: JSON.stringify([
      'What percentage of your time feels productively used each week?',
      'Are there tasks you know the client is still doing that you could handle?',
      'When you receive a task, do you usually have enough context to complete it?',
      'Has the client ever given you a task and then taken it back? What happened?',
      'How does the client provide feedback on your work?',
    ]),
    clientQuestions: JSON.stringify([
      'How comfortable do you feel handing off tasks to your VA?',
      'Are there tasks you\'d like help with but haven\'t yet delegated? What\'s stopping you?',
      'When your VA completes a task, how often does it meet your standard without revision?',
      'Have you documented your preferences for the top tasks you want help with?',
      'What would need to be true for you to feel fully confident delegating more?',
    ]),
    evidenceToCollect: JSON.stringify([
      'VA\'s weekly time logs or task completion records',
      'List of tasks client identified in onboarding vs tasks actually delegated',
      'Any feedback notes from VA about workload gaps',
      'Client\'s communication of tasks (are they detailed enough?)',
    ]),
    vaCoaching: JSON.stringify([
      'Coach VA to proactively ask: "What\'s on your plate this week that I can take off it?"',
      'Help VA create a simple task intake process to build client confidence',
      'Encourage VA to complete small tasks with high quality to demonstrate reliability',
      'Coach VA to surface completed work visibly to build trust',
      'Help VA draft a "what I can do for you" overview to share with client',
    ]),
    vaScript: `Hi {{VA_NAME}}, I want to talk about something that will really help your partnership with {{CLIENT_NAME}} — and that\'s getting them to delegate more consistently.

Some clients find delegation hard, especially early in the relationship. It often comes from wanting things done a certain way, not from a lack of trust in you specifically. Our job is to make it as easy as possible for them to hand things over.

Here\'s what I\'d like you to try this week: ask the client at the start of each week, "What\'s on your plate that I can take off it?" Make it an open-ended invitation. Also, when you complete tasks, send a quick summary of what you did and the outcome — this builds their confidence in your work.

Over time, the more they see you execute reliably, the more they\'ll let go. Let\'s be patient and consistent.`,
    clientScript: `Hi {{CLIENT_NAME}}, I\'m checking in to talk about how to get the most out of your VA partnership.

One pattern we sometimes see early in engagements is that clients hold onto tasks they could delegate, often because it feels faster to do it themselves. That\'s completely understandable — but it can limit the value you\'re getting.

{{VA_NAME}} is ready and capable of taking on more. To help make delegation easier, we\'d love to set up a quick session to identify the top 5 tasks you\'d like help with, and document them with your preferences and standards. Once that\'s in place, handing things off becomes much smoother.

Would 30 minutes this week work to map that out together?`,
    correctiveActions: JSON.stringify([
      'AM and VA create a delegation starter list of 5 specific tasks for the client',
      'Client and VA complete a task standards documentation session',
      'VA proactively asks for work at the start of each week for 30 days',
      'AM follows up with client in 2 weeks to assess delegation progress',
    ]),
    successMeasures: JSON.stringify([
      'Client has delegated at least 5 new tasks to VA within 30 days',
      'VA utilization rate increases by at least 25% over baseline',
      'Client reports confidence in delegating on next check-in call',
    ]),
    escalationCriteria: JSON.stringify([
      'Client has not delegated any new tasks after 45 days of coaching',
      'VA is consistently underutilized at below 30% of expected hours',
      'Client indicates they do not believe the VA can handle more responsibility',
    ]),
    relatedScenarios: JSON.stringify([1, 6, 12]),
  },
  {
    scenarioNumber: 5,
    title: 'Missing Access',
    category: 'ACCESS',
    defaultSeverity: 'LOW',
    description: 'The VA lacks access to tools, accounts, systems, or documents needed to perform their role effectively.',
    warningSigns: JSON.stringify([
      'VA reports being unable to complete tasks due to missing logins or permissions',
      'VA is repeatedly asking for access to the same resources',
      'Client has not completed the access setup promised during onboarding',
      'VA is using workarounds that create inefficiency or security risks',
      'Tasks have been pending for days due to access issues',
    ]),
    potentialRootCauses: JSON.stringify([
      'Client did not complete the onboarding access checklist',
      'Client is uncertain which tools or level of access to grant',
      'Security or privacy concerns are causing client hesitation',
      'Access was promised but administrative delays occurred',
      'The scope of work has expanded beyond the originally planned tools',
    ]),
    vaQuestions: JSON.stringify([
      'What specific tools or accounts do you need access to right now that you don\'t have?',
      'Have you asked the client for access directly? What was the response?',
      'Are there tasks you\'ve been unable to start because of missing access?',
      'Are there workarounds you\'ve been using? What are the downsides?',
    ]),
    clientQuestions: JSON.stringify([
      'Has your VA confirmed which tools and systems they need access to?',
      'Are there any security or privacy concerns preventing you from granting access?',
      'What\'s the status of the access items from your onboarding checklist?',
      'Would it help to have a quick call to walk through access setup together?',
    ]),
    evidenceToCollect: JSON.stringify([
      'VA\'s list of missing access items with impact on tasks',
      'Original onboarding access checklist and completion status',
      'Timeline of access requests and client responses',
    ]),
    vaCoaching: JSON.stringify([
      'Coach VA to send a clear, prioritized access request list to the client',
      'Teach VA to document which tasks are blocked by which missing access',
      'Encourage VA to propose secure alternatives (e.g., LastPass sharing, limited permissions)',
      'Remind VA to escalate to AM if access is not resolved within 5 business days',
    ]),
    vaScript: `Hi {{VA_NAME}}, I want to help you get unblocked on the access issues you\'ve been dealing with.

Please put together a clear list of everything you need — specific tools, account names, and what you\'re trying to do with each one. Then send that to {{CLIENT_NAME}} with a message that frames it as: "Here are the tools I need to move forward on [specific tasks]. Could we get these set up this week?"

If you\'re running into any hesitation from them, let me know and I\'ll reach out directly. Access issues are usually quick to fix once they\'re clearly surfaced.`,
    clientScript: `Hi {{CLIENT_NAME}}, a quick note about your VA\'s setup.

{{VA_NAME}} is ready to take on more but is currently waiting on access to a few tools and systems. To help them move forward effectively, could we carve out 20-30 minutes this week to walk through the access setup?

They\'ll send you a specific list of what\'s needed. Most of these take only a few minutes to set up and will unlock a significant amount of work they can do for you.`,
    correctiveActions: JSON.stringify([
      'VA sends client a prioritized access request list within 24 hours',
      'AM follows up with client if access not granted within 5 business days',
      'Document all access grants in a shared security log',
      'Complete a full access review at the 30-day mark',
    ]),
    successMeasures: JSON.stringify([
      'All critical access items resolved within 10 business days',
      'No access-related blocked tasks reported by VA in the following 30 days',
      'Access documentation completed and stored securely',
    ]),
    escalationCriteria: JSON.stringify([
      'Client refuses to grant any access despite multiple requests',
      'VA has been blocked from core responsibilities for more than 2 weeks',
      'Security incident occurs due to workarounds used in place of proper access',
    ]),
    relatedScenarios: JSON.stringify([6, 22]),
  },
  {
    scenarioNumber: 6,
    title: 'Unclear Instructions or Context',
    category: 'COMMUNICATION',
    defaultSeverity: 'LOW',
    description: 'The VA consistently receives vague, incomplete, or ambiguous instructions from the client, resulting in errors, rework, and missed expectations.',
    warningSigns: JSON.stringify([
      'VA frequently completes tasks that miss what the client actually wanted',
      'Client gives feedback like "that\'s not what I meant" on completed work',
      'VA spends excessive time guessing at client intent',
      'Rework rate is high — tasks are returned for revision repeatedly',
      'VA is unsure what to prioritize among multiple competing requests',
      'Client gives verbal instructions without written follow-up',
    ]),
    potentialRootCauses: JSON.stringify([
      'Client assumes the VA has more context than they do',
      'Client communicates in shorthand that works with longer-tenured staff',
      'VA lacks confidence to ask enough clarifying questions upfront',
      'No structured briefing or task intake process exists',
      'Client is in "execution mode" and doesn\'t have bandwidth to provide full context',
    ]),
    vaQuestions: JSON.stringify([
      'When you receive a task, do you feel you have enough information to complete it?',
      'What do you do when a task is unclear — do you ask questions or make assumptions?',
      'Can you give me an example of a task where you weren\'t sure what the client wanted?',
      'Has the client ever been frustrated by your interpretation of a task?',
      'What format do most of your task assignments come in — verbal, email, Slack?',
    ]),
    clientQuestions: JSON.stringify([
      'When you assign tasks to your VA, how much background do you typically provide?',
      'Have you noticed your VA interpreting tasks differently than you intended?',
      'Do you have a preferred way for your VA to ask clarifying questions?',
      'Are you open to using a simple task template or briefing format?',
    ]),
    evidenceToCollect: JSON.stringify([
      'Examples of tasks completed incorrectly due to unclear direction',
      'Rework rate over the past 30 days',
      'Samples of task assignments to assess clarity',
      'VA\'s notes on which task types cause the most confusion',
    ]),
    vaCoaching: JSON.stringify([
      'Teach VA the "4 W\'s" clarification technique: What, When, Why, Who is it for?',
      'Coach VA to send a brief task confirmation message before starting',
      'Role-play scenarios where VA practices asking clarifying questions without seeming needy',
      'Help VA create a personal "context request" template for ambiguous tasks',
      'Encourage VA to over-communicate their interpretation before executing',
    ]),
    vaScript: `Hi {{VA_NAME}}, I want to help you get better outcomes on tasks where the instructions aren\'t completely clear.

The good news is this is a skill we can build together. The key is to make clarifying questions feel natural and professional, not like you\'re being difficult. Before starting any complex task, try sending a quick note like: "Just to make sure I\'m on the right track — my understanding is X. Does that sound right?"

This small step prevents a lot of rework. I also want you to try using a brief task intake template. When a new task comes in without full detail, you ask: What does done look like? When is it needed? Any constraints I should know about?

Let\'s practice this together. Tell me about the last task that came in unclear.`,
    clientScript: `Hi {{CLIENT_NAME}}, I want to help you get even better results from your VA by streamlining how tasks get handed off.

One thing we\'ve seen make a big difference is a simple task briefing routine. When {{VA_NAME}} has full context — the goal, the deadline, and any specific requirements — they can execute much more accurately.

I\'d love to share a simple task template that takes about 60 seconds to fill out and dramatically reduces miscommunication. Would you be open to trying it for two weeks and seeing how it affects the quality of output?`,
    correctiveActions: JSON.stringify([
      'Create and share a task briefing template with client and VA',
      'VA sends task confirmation summary before starting any complex work for 30 days',
      'Client commits to including goal and deadline in all new task assignments',
      'AM reviews 5 sample task assignments in 2 weeks to assess clarity improvement',
    ]),
    successMeasures: JSON.stringify([
      'Rework rate drops by 50% within 30 days',
      'VA reports feeling confident in task instructions in next AM check-in',
      'Client confirms improved quality of VA output on next review call',
    ]),
    escalationCriteria: JSON.stringify([
      'Client refuses to change task communication style despite training',
      'Rework continues at unacceptable levels after 45 days',
      'VA reports significant frustration or burnout from chronic ambiguity',
    ]),
    relatedScenarios: JSON.stringify([4, 10, 12]),
  },
  {
    scenarioNumber: 7,
    title: 'Disorganized Client / Changing Priorities',
    category: 'CLIENT_BEHAVIOR',
    defaultSeverity: 'MODERATE',
    description: 'The client frequently shifts priorities, operates reactively, or creates a chaotic working environment that makes it difficult for the VA to plan, execute, or build reliable workflows.',
    warningSigns: JSON.stringify([
      'VA receives conflicting or constantly changing task priorities',
      'Urgent requests regularly displace previously planned work',
      'Client changes direction on tasks mid-execution without notice',
      'VA cannot build repeatable systems because the environment keeps changing',
      'VA is stressed and overwhelmed by unpredictability',
      'Client expresses dissatisfaction even when VA follows their original direction',
    ]),
    potentialRootCauses: JSON.stringify([
      'Client operates a fast-moving business with genuine priority shifts',
      'Client lacks an internal organizational system and projects that disorganization onto VA',
      'Client has not clearly communicated what their "anchor" priorities are',
      'The nature of the client\'s industry requires high agility',
      'VA has not established a priority-setting communication protocol with client',
    ]),
    vaQuestions: JSON.stringify([
      'How do you handle it when the client asks you to drop everything and do something else?',
      'Do you have clarity on what the client\'s top 3 priorities are each week?',
      'How often do priorities change in a given week?',
      'Have you had a conversation with the client about how to handle priority conflicts?',
      'What do you do with work that gets interrupted and never picked back up?',
    ]),
    clientQuestions: JSON.stringify([
      'How would you describe the pace and predictability of your business right now?',
      'Do you have a sense of your top 3-5 priorities for the next month?',
      'What happens when you have competing urgent needs?',
      'How would you like your VA to handle it when you ask them to pivot?',
      'Are you open to a weekly priority alignment ritual to help your VA plan their week?',
    ]),
    evidenceToCollect: JSON.stringify([
      'VA\'s record of task pivots and interruptions over the past 30 days',
      'Any work that was abandoned mid-task due to shifting priorities',
      'Client\'s stated priorities vs actual task requests',
      'VA\'s stress level and capacity during this period',
    ]),
    vaCoaching: JSON.stringify([
      'Introduce a weekly priority email: VA asks client every Monday for their top 3 priorities',
      'Teach VA the "triage, park, or pivot" method for handling unexpected requests',
      'Coach VA to confirm in writing when pivoting: "Stopping X to do Y — confirming this is your preference"',
      'Help VA build a task backlog to protect important work from being forgotten',
      'Establish a weekly 15-minute sync call to reset priorities with client',
    ]),
    vaScript: `Hi {{VA_NAME}}, I know working in a fast-moving environment can be challenging, and I want to help you feel more in control of the chaos.

One of the best tools we have in situations like this is structure. Even when the client\'s world is unpredictable, we can create a framework that helps you navigate it.

Every Monday, send {{CLIENT_NAME}} a message that says: "What are your top 3 priorities for this week?" That simple ritual anchors your week even when things shift. When they ask you to pivot on something, confirm it in writing: "Got it — pausing X to do Y. Just confirming this is the priority."

This protects you professionally and helps the client see the tradeoffs of their requests. Let\'s build this habit together over the next 30 days.`,
    clientScript: `Hi {{CLIENT_NAME}}, I\'m reaching out because we want to help set {{VA_NAME}} up for success in your fast-paced environment.

One of the most effective things we can do is establish a quick weekly priority alignment routine. It takes about 5 minutes and helps your VA know where to focus even when things shift unexpectedly. It also creates a record of decisions, which is helpful when you both need to look back.

Would you be open to a Monday priority check-in — even just a quick message? We can make it very low-lift for you.`,
    correctiveActions: JSON.stringify([
      'VA implements weekly Monday priority email for 30 days',
      'Client and VA agree on a "pivot protocol" for handling task interruptions',
      'AM reviews task completion and pivot frequency at the 2-week mark',
      'Client and VA establish a standing 15-minute weekly sync',
    ]),
    successMeasures: JSON.stringify([
      'VA reports lower stress and better ability to plan within 30 days',
      'Task completion rate improves despite environment remaining fast-paced',
      'Client confirms improved satisfaction with VA\'s ability to adapt',
    ]),
    escalationCriteria: JSON.stringify([
      'VA reports burnout or requests reassignment due to workload unpredictability',
      'Client\'s disorganization is causing measurable harm to VA\'s output quality',
      'No improvement after 45 days of priority alignment coaching',
    ]),
    relatedScenarios: JSON.stringify([8, 22, 23]),
  },
  {
    scenarioNumber: 8,
    title: 'Overwhelmed VA / Excessive Workload',
    category: 'WORKLOAD',
    defaultSeverity: 'MODERATE',
    description: 'The VA is handling more work than they can realistically deliver well, leading to missed deadlines, declining quality, and risk of burnout.',
    warningSigns: JSON.stringify([
      'VA reports feeling overwhelmed or unable to keep up',
      'Increase in missed or late deadlines',
      'Declining quality of work output',
      'VA working beyond agreed hours without flagging capacity issues',
      'VA making uncharacteristic errors due to rushing',
      'VA shows signs of burnout: low energy, disengagement, emotional exhaustion',
    ]),
    potentialRootCauses: JSON.stringify([
      'Scope of client\'s work has expanded beyond what was originally agreed',
      'Client has added tasks without removing others, creating cumulative overload',
      'VA is taking on too much without communicating capacity limits',
      'VA lacks efficient systems or time management skills',
      'VA is afraid to push back on the client\'s requests',
    ]),
    vaQuestions: JSON.stringify([
      'On a scale of 1-10, how manageable does your current workload feel?',
      'Which tasks are taking longer than expected and why?',
      'Have you communicated to the client that you\'re at capacity?',
      'Are there tasks you\'re doing that feel outside your original scope?',
      'What would need to change for you to feel like your workload was sustainable?',
      'Are you working beyond your agreed hours? How often?',
    ]),
    clientQuestions: JSON.stringify([
      'Do you have a sense of how much you\'re asking your VA to handle each week?',
      'Have you added new tasks or responsibilities to your VA\'s plate recently?',
      'Are there things you\'re asking your VA to do that could be deprioritized or dropped?',
      'How would you feel about a capacity review to make sure the workload is sustainable?',
    ]),
    evidenceToCollect: JSON.stringify([
      'VA\'s task log and estimated hours for the last 30 days',
      'List of current recurring tasks vs original scope agreement',
      'Any missed deadlines or quality issues in the past 30 days',
      'VA\'s stated hours worked per week vs contracted hours',
    ]),
    vaCoaching: JSON.stringify([
      'Give VA explicit permission to communicate capacity limits to the client',
      'Coach VA to send a capacity signal: "I want to flag that I\'m at capacity this week — which of these should I prioritize?"',
      'Help VA build a task prioritization matrix to triage competing demands',
      'Review VA\'s systems for efficiency improvements',
      'Establish a weekly hours cap and escalation trigger if it\'s regularly exceeded',
    ]),
    vaScript: `Hi {{VA_NAME}}, I want to check in on something important — your workload and how you\'re doing.

I\'ve noticed some signs that you may be taking on more than is sustainable, and I want you to know that it\'s completely okay — and important — to flag when you\'re at capacity. Doing so is not a sign of weakness; it\'s good communication.

I want to give you permission to say to {{CLIENT_NAME}}: "I want to make sure I\'m giving everything my best effort. Here\'s what\'s on my plate this week — could we prioritize together?" This protects your quality of work and builds a healthier working relationship.

Let\'s also look at your current task list together right now. I want to help you triage what\'s truly urgent, what can wait, and what might need to be taken off your plate entirely.`,
    clientScript: `Hi {{CLIENT_NAME}}, I\'m reaching out because I want to make sure we\'re setting up the best possible conditions for your VA\'s success.

We\'ve noticed that {{VA_NAME}} is managing a full workload and I want to do a quick capacity check with you. The goal is to make sure the volume of work aligns with what they can deliver at the quality level you expect.

Would you be open to reviewing the current task list together? We want to make sure we\'re focusing on the highest-value work rather than spreading things too thin.`,
    correctiveActions: JSON.stringify([
      'AM and VA review full task list and categorize by priority',
      'AM speaks with client to reset scope expectations if needed',
      'VA implements weekly capacity signal communication for 30 days',
      'Set a clear weekly hour cap and escalation trigger if exceeded',
    ]),
    successMeasures: JSON.stringify([
      'VA reports sustainable workload within 30 days',
      'Missed deadline rate drops to zero within 2 weeks of scope adjustment',
      'No quality decline reported by client in next 30-day period',
    ]),
    escalationCriteria: JSON.stringify([
      'VA reports burnout symptoms requiring immediate relief',
      'Client refuses to reduce workload despite capacity concerns',
      'Significant quality or deadline failures continue after intervention',
    ]),
    relatedScenarios: JSON.stringify([7, 23, 15]),
  },
  {
    scenarioNumber: 9,
    title: 'Performance Issues',
    category: 'PERFORMANCE',
    defaultSeverity: 'HIGH',
    description: 'The VA is not meeting the expected quality, accuracy, or reliability standards of the role despite having had reasonable time to develop and receiving feedback.',
    warningSigns: JSON.stringify([
      'Consistent errors in deliverables that should not require correction',
      'Client is regularly dissatisfied with the quality of completed work',
      'VA misses deadlines frequently despite workload being reasonable',
      'Tasks need to be redone or significantly revised by the client',
      'VA does not improve after receiving specific, documented feedback',
      'Client is spending more time reviewing and correcting than they save',
    ]),
    potentialRootCauses: JSON.stringify([
      'VA lacks core skills required for the role',
      'VA has not received sufficient onboarding or training',
      'There is a significant mismatch between VA\'s strengths and role requirements',
      'VA is unclear about quality standards and what "good" looks like',
      'Personal circumstances are affecting VA\'s ability to focus',
    ]),
    vaQuestions: JSON.stringify([
      'How do you feel your performance has been lately? Are there areas you feel are weaker?',
      'When you complete a task, how do you assess whether it meets the client\'s standard?',
      'Have you received feedback you weren\'t sure how to act on?',
      'Are there specific skills or tools you feel you need more support with?',
      'Is there anything going on personally that might be affecting your work right now?',
      'Do you feel you have enough time to do tasks at the quality level expected?',
    ]),
    clientQuestions: JSON.stringify([
      'Can you give me specific examples of work that didn\'t meet your expectations?',
      'How and when have you communicated performance expectations to your VA?',
      'Have you seen any improvement since giving feedback?',
      'What does "meets standard" look like for the tasks you assign most often?',
      'How long has this performance concern been present?',
    ]),
    evidenceToCollect: JSON.stringify([
      'Client\'s documented examples of substandard work with specific issues noted',
      'VA\'s performance record over the past 60 days',
      'Any prior feedback sessions and VA\'s response to them',
      'Original role requirements vs actual skills demonstrated by VA',
      'Quality metrics: error rate, revision frequency, deadline adherence',
    ]),
    vaCoaching: JSON.stringify([
      'Deliver a clear, documented performance improvement conversation with specific examples',
      'Set measurable benchmarks: what improvement is needed and by when',
      'Identify specific skills gaps and provide targeted training resources',
      'Establish a 30-day structured check-in schedule to monitor progress',
      'Be direct about consequences if standards are not met',
      'Offer additional training or pairing with trainer if applicable',
    ]),
    vaScript: `Hi {{VA_NAME}}, I want to have an honest and supportive conversation with you today.

I\'ve received some specific feedback from {{CLIENT_NAME}} about the quality of recent work, and I want to share it directly with you so we can address it together. [Specific examples here.]

I want to be clear that this is something we can work through. But I also need to be honest: if we don\'t see improvement, it will eventually become a bigger issue. I don\'t want that for you, so I\'m invested in helping you get there.

Here\'s what I\'d like to do: I\'m going to share exactly what the client\'s standard looks like for the tasks that have come up, and we\'re going to build a plan for the next 30 days. I\'ll be checking in with you weekly. I believe you can turn this around — let\'s start right now.`,
    clientScript: `Hi {{CLIENT_NAME}}, thank you for the feedback you\'ve shared about your VA\'s performance.

I want you to know we\'re taking it seriously. I\'ve had a direct conversation with {{VA_NAME}} and we\'ve put a 30-day improvement plan in place that includes weekly check-ins and specific benchmarks.

I\'ll be monitoring progress closely and reporting back to you at the 2-week and 4-week marks. If you continue to see issues in the meantime, please document them and share them with me directly so I can address them in real time. Your business outcomes matter to us and we are committed to getting this right.`,
    correctiveActions: JSON.stringify([
      'Conduct a formal performance improvement meeting with VA and document it',
      'Set written performance benchmarks with 30-day target',
      'AM conducts weekly check-ins with VA for 30 days',
      'AM provides client update at 2-week and 4-week marks',
      'Initiate restaffing review if no improvement at 30 days',
    ]),
    successMeasures: JSON.stringify([
      'Zero revision-required tasks reported by client in week 4',
      'Client confirms improved quality in week 4 check-in',
      'VA can articulate and demonstrate quality standards correctly',
    ]),
    escalationCriteria: JSON.stringify([
      'No measurable improvement after 30 days of structured coaching',
      'Client demands replacement VA',
      'Performance gap is determined to be a fundamental skills mismatch',
      'VA shows disengagement or refuses feedback',
    ]),
    relatedScenarios: JSON.stringify([15, 19, 14]),
  },
  {
    scenarioNumber: 10,
    title: 'Poor Communication and Missing Updates',
    category: 'COMMUNICATION',
    defaultSeverity: 'MODERATE',
    description: 'The VA fails to communicate proactively, misses check-ins, or does not keep the client informed about task progress, blockers, or status changes.',
    warningSigns: JSON.stringify([
      'Client frequently asks "what happened with X?" on work they assigned',
      'VA completes work without notifying the client',
      'VA goes silent for extended periods without updating the client',
      'VA misses scheduled check-in calls or fails to reschedule them',
      'Client expresses frustration about not knowing what\'s happening',
      'Blockers go unreported, causing avoidable delays',
    ]),
    potentialRootCauses: JSON.stringify([
      'VA doesn\'t realize how important regular communication is to the client',
      'VA assumes the client doesn\'t want to be bothered with status updates',
      'VA is embarrassed to report delays or blockers and avoids the conversation',
      'No structured communication rhythm has been established',
      'VA lacks confidence in writing professional updates',
    ]),
    vaQuestions: JSON.stringify([
      'How often do you proactively update the client on your progress?',
      'When you hit a blocker, what do you do first?',
      'Do you have a scheduled check-in with the client? How is that going?',
      'Is there anything that makes it hard to send updates — time, comfort level, technology?',
      'Has the client ever expressed frustration about not hearing from you? What happened?',
    ]),
    clientQuestions: JSON.stringify([
      'How would you describe the communication you receive from your VA?',
      'What does an ideal update from your VA look like?',
      'How often would you like to hear from your VA proactively?',
      'Have you told your VA what your communication preferences are?',
    ]),
    evidenceToCollect: JSON.stringify([
      'Record of scheduled vs attended check-ins',
      'Client\'s messages asking for status updates as evidence of communication gaps',
      'Any instances of unreported blockers causing delays',
      'VA\'s message log showing frequency of proactive updates',
    ]),
    vaCoaching: JSON.stringify([
      'Introduce a structured weekly update template the VA sends every Friday',
      'Coach VA that updating the client on blockers is better than silence',
      'Role-play how to write a status update that is clear and concise',
      'Set a rule: any task more than 24 hours delayed gets a proactive update',
      'Review and improve VA\'s check-in call discipline',
    ]),
    vaScript: `Hi {{VA_NAME}}, I want to talk about communication habits because this is something that can really make or break your relationship with your client.

{{CLIENT_NAME}} doesn\'t just want results — they want to feel like you\'re on top of things. That confidence comes from regular, proactive updates. When you go quiet, it creates anxiety for them, even if the work is progressing well.

Here\'s what I\'d like you to implement: every Friday, send a short update. It can be three bullet points — what you worked on, what\'s in progress, and anything you\'re waiting on. That\'s it. Thirty seconds for them to read, five minutes for you to write, and it dramatically changes how they experience working with you.

Also, if you\'re blocked on something, reach out the same day. Don\'t wait until the check-in. The faster you surface a blocker, the faster it gets resolved.`,
    clientScript: `Hi {{CLIENT_NAME}}, I\'m following up on the communication flow with your VA.

We\'ve been coaching {{VA_NAME}} to implement a more structured communication routine — specifically a weekly Friday update and same-day blocker reporting. You should start seeing a difference very soon.

To help us calibrate: what does ideal communication look like from your end? How often do you want proactive updates, and in what format? Knowing this helps us personalize the routine to what works best for you.`,
    correctiveActions: JSON.stringify([
      'VA implements Friday weekly update for 30 consecutive days',
      'VA commits to same-day blocker reporting',
      'AM reviews client satisfaction with communication at 2-week mark',
      'Set escalation trigger if VA misses two consecutive weekly updates',
    ]),
    successMeasures: JSON.stringify([
      'Client confirms improved communication satisfaction in 30 days',
      'Client stops asking "what happened with X?" questions',
      'VA sends at least 4 weekly updates in the next 30 days',
    ]),
    escalationCriteria: JSON.stringify([
      'VA misses 3 consecutive weekly updates despite coaching',
      'Client reports continued frustration with communication after 45 days',
      'Communication failures cause a significant operational impact',
    ]),
    relatedScenarios: JSON.stringify([1, 3, 13]),
  },
  {
    scenarioNumber: 11,
    title: 'Relationship Breakdown / Loss of Trust',
    category: 'RELATIONSHIP',
    defaultSeverity: 'HIGH',
    description: 'The working relationship between the VA and client has deteriorated to a point where trust, respect, or goodwill is significantly damaged, threatening the viability of the partnership.',
    warningSigns: JSON.stringify([
      'Client explicitly says they no longer trust the VA',
      'Client micromanages every task or duplicates VA\'s work',
      'VA and client have had a direct conflict or confrontational exchange',
      'Client requests a different VA or expresses desire to end the engagement',
      'VA expresses that they can no longer work effectively with this client',
      'Communication between VA and client has nearly stopped',
    ]),
    potentialRootCauses: JSON.stringify([
      'A critical mistake or error by the VA damaged client confidence',
      'A perceived breach of confidentiality or professionalism',
      'Accumulated small frustrations that were never addressed',
      'A direct conflict over communication style or expectations',
      'Client has experienced losses (financial, reputational) linked to VA work',
    ]),
    vaQuestions: JSON.stringify([
      'In your words, what happened that changed the dynamic with this client?',
      'Do you feel the relationship can be repaired? Why or why not?',
      'Is there anything you regret or would do differently?',
      'How are you managing your own emotions in this situation?',
      'What would you need to feel safe continuing in this role?',
    ]),
    clientQuestions: JSON.stringify([
      'Can you describe what happened from your perspective?',
      'Is there a specific incident or pattern that caused the trust to break down?',
      'Are you open to trying to repair this relationship with your VA?',
      'What would the VA need to do differently for you to feel comfortable moving forward?',
      'Is there anything Goldbar could do differently to support you?',
    ]),
    evidenceToCollect: JSON.stringify([
      'Both VA\'s and client\'s account of key incidents',
      'Any written communication showing the breakdown',
      'Previous feedback history and whether it was addressed',
      'Timeline of relationship deterioration',
    ]),
    vaCoaching: JSON.stringify([
      'Provide emotional support and separate coaching session for VA',
      'Help VA understand client\'s perspective without assigning blame',
      'Coach VA on how to open a repair conversation if appropriate',
      'Set clear expectations for professional conduct regardless of feelings',
      'Determine if VA should be transitioned out for their own wellbeing',
    ]),
    vaScript: `Hi {{VA_NAME}}, I want to have a candid conversation with you today because I care about both you and the outcome here.

The relationship with {{CLIENT_NAME}} has hit a rough patch, and I think we need to look at it honestly together. I\'ve heard your side, and I\'ve heard theirs. There\'s a lot of complexity here, and I don\'t want to dismiss any of it.

Here\'s where we are: if this relationship is going to be repaired, it\'s going to take a deliberate effort from both sides — and I\'ll be supporting that process. If, on reflection, you feel the relationship is beyond repair or unsafe for you to continue in, I need to know that too, and we\'ll handle it appropriately.

What I need from you today is honesty about how you\'re feeling and what you think is possible. Let\'s figure this out together.`,
    clientScript: `Hi {{CLIENT_NAME}}, I want to speak with you directly about the relationship dynamic with your VA because I believe it deserves a real conversation.

I\'ve heard both perspectives, and I understand why trust has been strained. I\'m not here to assign blame — I\'m here to figure out what the path forward looks like for you and your business.

A few options exist: we can work together to repair the relationship with a structured mediation approach, or we can discuss transitioning to a new VA who might be a better fit. What matters most to me right now is that you feel supported and that your business needs are met. What would be most helpful to talk through?`,
    correctiveActions: JSON.stringify([
      'AM holds separate conversations with both VA and client within 48 hours',
      'AM determines if repair is viable or if transition is the right path',
      'If repair path: structured joint expectations-setting conversation with AM mediating',
      'If transition path: initiate restaffing with minimal disruption',
      'Document all decisions and rationale for leadership review',
    ]),
    successMeasures: JSON.stringify([
      'Clear resolution path defined within 5 business days',
      'If repair path: both parties confirm improved relationship at 30-day mark',
      'If transition path: successful restaffing within 3 weeks',
    ]),
    escalationCriteria: JSON.stringify([
      'Either party reports misconduct or inappropriate behavior',
      'Client threatens legal action or formal complaint',
      'VA reports feeling unsafe or harassed',
      'Repair attempts after 30 days show no improvement',
    ]),
    relatedScenarios: JSON.stringify([2, 18, 19, 24]),
  },
  {
    scenarioNumber: 12,
    title: 'Misaligned Expectations / Role Scope',
    category: 'EXPECTATIONS',
    defaultSeverity: 'MODERATE',
    description: 'The client\'s expectations of what the VA will do, how they will work, or what results they will deliver do not match the actual role, the VA\'s capabilities, or what was agreed upon during onboarding.',
    warningSigns: JSON.stringify([
      'Client expresses disappointment that VA isn\'t doing something not in their agreed scope',
      'VA is asked to perform tasks clearly outside their skill set or role definition',
      'Client compares the VA unfavorably to a different type of assistant (e.g., an employee)',
      'Frequent friction over what falls within vs outside the VA\'s responsibilities',
      'Client mentions features or services that were never part of the agreement',
      'VA feels unclear about where their responsibilities begin and end',
    ]),
    potentialRootCauses: JSON.stringify([
      'Scope was inadequately defined during the sales or onboarding phase',
      'Client\'s needs have evolved since onboarding but expectations haven\'t been reset',
      'Client had unrealistic expectations about VA capabilities from the start',
      'The agreed role has been informally expanded over time without formal adjustment',
      'VA has over-promised or under-delivered relative to role definition',
    ]),
    vaQuestions: JSON.stringify([
      'Can you describe what you understood your role with this client to be?',
      'Are there tasks the client asks for that feel outside what you were hired to do?',
      'Has the scope of what they expect from you changed since you started?',
      'How do you handle requests that you don\'t think are your responsibility?',
    ]),
    clientQuestions: JSON.stringify([
      'Can you describe what you expected your VA would be handling on a regular basis?',
      'Are there things you expected help with that haven\'t been happening?',
      'Are there any tasks you\'ve asked your VA to do that they\'ve said aren\'t their responsibility?',
      'Do you remember the conversation about scope at the start of the engagement?',
    ]),
    evidenceToCollect: JSON.stringify([
      'Original onboarding agreement and role description',
      'List of tasks client currently expects vs what was originally defined',
      'Any communications showing scope discussions or disputes',
      'Comparison of VA\'s skills to client\'s current task requests',
    ]),
    vaCoaching: JSON.stringify([
      'Clarify VA\'s role boundaries and give them language to decline out-of-scope requests gracefully',
      'Provide a script for re-setting boundaries: "That\'s a great idea — let me check if that\'s within my current scope"',
      'Coach VA to surface scope expansion to AM rather than absorbing it silently',
      'Review the original role definition together and identify any drift',
    ]),
    vaScript: `Hi {{VA_NAME}}, I want to talk about role scope because I think there\'s some confusion that\'s creating friction between you and {{CLIENT_NAME}}.

Let\'s start by looking at what your role was originally defined to cover and then compare that to what\'s actually being asked of you. If there\'s drift — if your scope has quietly expanded — that\'s something we need to address clearly with the client.

Going forward, if a request feels outside your scope, I want you to use this language: "That sounds like something worth exploring — let me check with my AM to confirm it\'s within what we\'ve set up." Then you bring it to me. Don\'t just absorb it and don\'t just say no — escalate it so we can manage it properly.`,
    clientScript: `Hi {{CLIENT_NAME}}, I want to have a clear conversation about the scope of what {{VA_NAME}} is set up to handle so we\'re fully aligned.

Sometimes as partnerships evolve, what\'s being asked of a VA naturally grows — and that\'s great. But it\'s important that we formally update expectations and make sure the VA has the right support for any expanded responsibilities.

Let\'s review what was originally agreed upon and talk about where you\'d like to see things go. If there are additional needs that fall outside the current setup, we can explore options together.`,
    correctiveActions: JSON.stringify([
      'AM reviews original role agreement and identifies any scope drift',
      'AM leads a three-way clarification call with client and VA',
      'Formalize updated role scope in writing and share with all parties',
      'VA given clear language for handling out-of-scope requests',
    ]),
    successMeasures: JSON.stringify([
      'Both client and VA confirm role clarity in follow-up check-in',
      'Scope-related friction complaints drop to zero within 30 days',
      'Any expanded scope is formally agreed upon and documented',
    ]),
    escalationCriteria: JSON.stringify([
      'Client insists on scope expansion VA cannot or should not absorb',
      'VA continues to receive out-of-scope requests after clarification',
      'Scope dispute escalates into relationship conflict',
    ]),
    relatedScenarios: JSON.stringify([4, 6, 23]),
  },
  {
    scenarioNumber: 13,
    title: 'Weak Relationship Building',
    category: 'RELATIONSHIP',
    defaultSeverity: 'LOW',
    description: 'The VA and client have a purely transactional relationship with no real rapport, trust, or personal connection, limiting the depth of collaboration and long-term partnership potential.',
    warningSigns: JSON.stringify([
      'Client describes the relationship as "fine" but shows no enthusiasm',
      'VA and client rarely have personal exchanges or off-task conversation',
      'Client does not advocate for the VA when questioned about the partnership',
      'VA does not know basic personal context about the client\'s business or goals',
      'No sense of shared purpose or partnership in the working relationship',
    ]),
    potentialRootCauses: JSON.stringify([
      'VA focuses only on task execution and not on relationship investment',
      'Client prefers purely professional relationships and hasn\'t signaled openness',
      'Communication has been limited to task-focused exchanges only',
      'VA lacks confidence in small talk or personal connection in a professional context',
      'Neither party has taken initiative to deepen the relationship',
    ]),
    vaQuestions: JSON.stringify([
      'How would you describe your personal connection with this client?',
      'Do you know anything about their goals, business vision, or what they care about?',
      'When was the last time you had a non-task conversation with them?',
      'How do you usually open your check-in calls?',
      'Do you feel like they like working with you? What makes you say that?',
    ]),
    clientQuestions: JSON.stringify([
      'How would you describe your working relationship with your VA?',
      'Do you feel your VA understands your business and what you\'re trying to achieve?',
      'Is there anything you wish your VA knew about you or your business that would help them?',
    ]),
    evidenceToCollect: JSON.stringify([
      'VA\'s notes on client context, interests, and personal details',
      'Quality and tone of recent communications between VA and client',
      'Client\'s satisfaction survey responses about the partnership',
    ]),
    vaCoaching: JSON.stringify([
      'Teach VA to open every check-in with a personal check-in question',
      'Coach VA to note and remember client\'s personal context (hobbies, family, goals)',
      'Encourage VA to send a note acknowledging client milestones (business wins, birthdays)',
      'Help VA understand how genuine interest in the client\'s success builds trust',
      'Practice small talk and relationship-building conversation openers',
    ]),
    vaScript: `Hi {{VA_NAME}}, I want to talk about something that can really elevate your partnership with {{CLIENT_NAME}} — and that\'s the human side of the relationship.

The best VA-client relationships aren\'t just about tasks getting done — they\'re built on genuine care and connection. When your client feels like you\'re invested in their success as a person, not just as an account, they trust you more, delegate more, and stay in the partnership longer.

Here\'s a small shift I\'d like you to make: at the start of every check-in, ask one personal question. It could be about their weekend, a business challenge they mentioned, or a goal they shared. And if you can, write it down and follow up on it next time. That kind of attentiveness makes a real impression.`,
    clientScript: `Hi {{CLIENT_NAME}}, I\'m checking in to see how you\'re feeling about your VA partnership overall — not just the task side, but the relationship as a whole.

We want to make sure {{VA_NAME}} feels like a true partner to you, not just a task-doer. Is there anything about the relationship that you\'d like to be different? More personal? More focused?

Your input helps us coach your VA to show up in a way that really works for you.`,
    correctiveActions: JSON.stringify([
      'VA adds personal check-in question to every call agenda',
      'VA creates a client context document with key personal and business notes',
      'AM coaches VA on relationship investment techniques monthly',
      'Check in with client on relationship quality at 60-day mark',
    ]),
    successMeasures: JSON.stringify([
      'Client describes VA relationship positively in next check-in',
      'VA can name 3+ pieces of personal context about the client within 30 days',
      'Client spontaneously refers to the VA positively in communications',
    ]),
    escalationCriteria: JSON.stringify([
      'Client explicitly requests a different VA citing lack of connection',
      'Relationship quality is impacting client\'s engagement with the service',
    ]),
    relatedScenarios: JSON.stringify([1, 10, 11]),
  },
  {
    scenarioNumber: 14,
    title: 'No Measurable Value',
    category: 'PERFORMANCE',
    defaultSeverity: 'MODERATE',
    description: 'The client is unable to articulate the value they are receiving from the VA partnership, raising questions about ROI and making the engagement vulnerable to cancellation.',
    warningSigns: JSON.stringify([
      'Client says "I\'m not sure this is working" or "I don\'t know what my VA does"',
      'Client cannot name specific tasks the VA handles consistently',
      'Client does not feel their time is being freed up meaningfully',
      'Client is considering pausing or ending the engagement',
      'VA\'s work is invisible — outcomes are not being communicated or tracked',
      'No measurable metrics or outcomes have been established for the partnership',
    ]),
    potentialRootCauses: JSON.stringify([
      'VA\'s contributions are real but not visible to the client',
      'No success metrics were established at the start of the engagement',
      'Client has not delegated enough for the VA to make a meaningful impact',
      'VA\'s work is in the background and client doesn\'t connect it to their productivity',
      'Client\'s definition of value has shifted since onboarding',
    ]),
    vaQuestions: JSON.stringify([
      'Do you have a sense of what impact you\'re having on the client\'s business?',
      'How do you communicate the results of your work to the client?',
      'What are the top 3 things you do for the client each week?',
      'Have you and the client ever talked about what success looks like?',
      'Is there any work you\'re doing that the client might not be aware of?',
    ]),
    clientQuestions: JSON.stringify([
      'What was the primary reason you started working with a VA?',
      'Can you describe 2-3 specific ways your VA has helped you this month?',
      'Do you feel like your time has been freed up by having a VA?',
      'What would need to be true for you to feel this partnership is working?',
    ]),
    evidenceToCollect: JSON.stringify([
      'List of completed tasks by VA over the past 30-60 days',
      'Client\'s stated goals from onboarding vs current situation',
      'Any time-savings or outcome data that can be quantified',
      'Client\'s feedback on the value perception',
    ]),
    vaCoaching: JSON.stringify([
      'Coach VA to send a monthly "value summary" to the client highlighting key contributions',
      'Help VA quantify their impact where possible (hours saved, tasks completed, issues resolved)',
      'Teach VA to connect their work to the client\'s stated goals',
      'Encourage VA to proactively propose new ways to add value',
      'Build a visible wins log that both VA and client can reference',
    ]),
    vaScript: `Hi {{VA_NAME}}, I want to work on making your impact on {{CLIENT_NAME}}\'s business more visible — because I believe you\'re doing good work, but it needs to be seen.

One of the most powerful things you can do is send a monthly summary: "Here\'s what I accomplished this month and how it helps your business." It can be brief — five bullet points — but it makes your work tangible for the client.

Let\'s also think about how your work connects to what the client actually cares about. If you know their goals, we can make sure your updates reflect progress toward those goals, not just tasks completed.

Let\'s build your first value summary together right now. What have you done in the last 30 days that made a difference for them?`,
    clientScript: `Hi {{CLIENT_NAME}}, I\'m reaching out because I want to make sure you\'re getting the full value from your VA partnership.

Sometimes the impact of a VA is happening behind the scenes and it\'s not fully visible. I\'d like to schedule a quick call to walk through what {{VA_NAME}} has been working on and connect it to what you were hoping to achieve. It will also give us a chance to refocus on the highest-value activities going forward.

Would 20 minutes this week work for that conversation?`,
    correctiveActions: JSON.stringify([
      'VA creates and sends first monthly value summary to client',
      'AM reviews task list with client and VA to refocus on highest-value activities',
      'Define 3 measurable success metrics for the next 60 days',
      'Schedule a value check-in call with AM, client, and VA at 30 days',
    ]),
    successMeasures: JSON.stringify([
      'Client can name 3+ specific ways the VA adds value at the 30-day check-in',
      'Client\'s satisfaction score improves after value refocus',
      'Client no longer expresses ROI concerns within 45 days',
    ]),
    escalationCriteria: JSON.stringify([
      'Client notifies cancellation intent despite value clarification efforts',
      'VA cannot articulate any meaningful contributions after 30 days of coaching',
      'Delegation level is so low the engagement is genuinely not viable',
    ]),
    relatedScenarios: JSON.stringify([1, 4, 9]),
  },
  {
    scenarioNumber: 15,
    title: 'Repeated Mistakes After Coaching',
    category: 'PERFORMANCE',
    defaultSeverity: 'HIGH',
    description: 'The VA continues to make the same errors or display the same problematic behaviors after receiving specific, documented coaching feedback, suggesting a deeper capability or commitment issue.',
    warningSigns: JSON.stringify([
      'The same specific mistake is recurring after being addressed in coaching',
      'VA acknowledges understanding in coaching sessions but reverts to old patterns',
      'Client identifies the same quality issue in consecutive weeks',
      'Previous improvement plans have been completed without lasting change',
      'VA shows low self-awareness about their recurring gaps',
      'AM has had the same coaching conversation multiple times',
    ]),
    potentialRootCauses: JSON.stringify([
      'VA lacks the foundational skill required to correct the problem',
      'VA has not internalized the feedback — agrees but doesn\'t actually change',
      'The coaching approach is not matching how the VA learns or retains information',
      'Underlying personal or motivational factor is preventing improvement',
      'The gap is a fundamental capability mismatch, not a training issue',
    ]),
    vaQuestions: JSON.stringify([
      'We\'ve talked about this before — what do you think is making it hard to change?',
      'Do you understand specifically what the standard looks like for this?',
      'What would help you remember to do this differently?',
      'Is there anything about this type of work that you find genuinely difficult?',
      'How committed are you to staying in this role and improving?',
    ]),
    clientQuestions: JSON.stringify([
      'How long has this specific issue been recurring?',
      'Has anything improved at all, or has it been consistent?',
      'What is the impact on your business when this happens?',
      'Are you open to continuing if you saw significant improvement in the next 30 days?',
    ]),
    evidenceToCollect: JSON.stringify([
      'Log of all prior coaching sessions on this specific issue with dates',
      'Documentation of the recurring error with examples from multiple time periods',
      'Client\'s written confirmation of the pattern',
      'VA\'s performance trajectory: has there been any improvement at all?',
    ]),
    vaCoaching: JSON.stringify([
      'Deliver a formal, documented final coaching session with clear consequences stated',
      'Move from verbal to written-only instructions with the VA for specific tasks',
      'Identify the root cause of the repeat: skill, will, or fit?',
      'Set a 2-week measurable benchmark — the next failure triggers escalation to restaffing',
      'Be compassionate but direct: "This is the last time we can address this before next steps change"',
    ]),
    vaScript: `Hi {{VA_NAME}}, I need to be completely honest with you today because I believe that\'s what will actually help you.

We\'ve talked about [specific issue] before — on [dates]. And I\'ve seen that you understand what I\'m saying in the moment, but the pattern continues. I\'m not saying that to be critical — I\'m saying it because something isn\'t connecting, and we need to figure out what that is.

I want to ask you directly: Do you know specifically what to do differently? And is there something — whether it\'s the task itself, the tools, or something personal — that\'s making it hard to make that change?

I\'m giving you one more clear chance here. The specific standard is [X]. If we see this issue again in the next two weeks, I\'ll need to have a different kind of conversation. I\'m rooting for you, and I mean that.`,
    clientScript: `Hi {{CLIENT_NAME}}, I want to update you on the situation with {{VA_NAME}}.

I\'ve had a direct, documented conversation about the recurring issue you\'ve flagged. I\'ve been very clear about what\'s expected and what will happen if it continues. I\'ve set a two-week benchmark for measurable improvement.

I\'ll follow up with you at the end of that window. If there\'s been meaningful progress, I\'ll share that with you. If not, I\'ll be taking the next step in our process, which may include transitioning to a different VA. I don\'t make that decision lightly, but your business outcomes matter more.`,
    correctiveActions: JSON.stringify([
      'Conduct a formal final coaching session with written documentation signed by VA',
      'Set a 2-week measurable benchmark with clear pass/fail criteria',
      'AM monitors quality daily for the 2-week period',
      'At 2 weeks: assess improvement and determine if restaffing should begin',
    ]),
    successMeasures: JSON.stringify([
      'Zero recurrence of the specific issue in the 2-week benchmark period',
      'Client confirms improvement in 2-week check-in',
      'VA can demonstrate self-monitoring for the issue independently',
    ]),
    escalationCriteria: JSON.stringify([
      'Issue recurs during the 2-week benchmark period',
      'VA shows resistance or dismissiveness in the formal coaching session',
      'Client explicitly requests replacement VA',
    ]),
    relatedScenarios: JSON.stringify([9, 19, 24]),
  },
  {
    scenarioNumber: 16,
    title: 'Missing Client Feedback',
    category: 'FEEDBACK',
    defaultSeverity: 'LOW',
    description: 'The client is not providing feedback on the VA\'s work, making it impossible to measure satisfaction, identify issues early, or improve the partnership quality.',
    warningSigns: JSON.stringify([
      'Client never responds to feedback requests or surveys',
      'VA has no idea how the client feels about their work',
      'Client says "everything is fine" without specifics even when issues may exist',
      'No formal feedback loop is established in the working relationship',
      'Issues surface late because there was no regular feedback mechanism',
    ]),
    potentialRootCauses: JSON.stringify([
      'Client doesn\'t feel feedback requests are worthwhile or actionable',
      'Feedback process is too formal or time-consuming for a busy client',
      'Client doesn\'t want to give negative feedback directly',
      'No structure exists for what to give feedback on',
      'Client\'s positive experience means they don\'t feel compelled to respond',
    ]),
    vaQuestions: JSON.stringify([
      'Have you ever asked the client directly for feedback on specific tasks?',
      'How does the client typically respond to your work — do they acknowledge it?',
      'Have you had a conversation about how they like to give feedback?',
    ]),
    clientQuestions: JSON.stringify([
      'How comfortable do you feel giving feedback to your VA?',
      'What would make giving feedback easier for you?',
      'Have you ever felt like something wasn\'t working but not sure how to raise it?',
      'Would a simple 1-minute weekly rating work for you?',
    ]),
    evidenceToCollect: JSON.stringify([
      'Record of feedback requests sent and response rate',
      'Any informal feedback or signals received (positive or negative)',
      'Client satisfaction survey history',
    ]),
    vaCoaching: JSON.stringify([
      'Teach VA to ask for micro-feedback: "On a scale of 1-3, how did that land for you?"',
      'Coach VA to make feedback feel low-stakes and conversational',
      'Establish a monthly one-question feedback check-in',
      'Help VA track informal signals that act as feedback proxies',
    ]),
    vaScript: `Hi {{VA_NAME}}, I want to talk about building a better feedback loop with {{CLIENT_NAME}}.

Getting regular feedback is important not just for your performance review — it\'s how you know you\'re on the right track. And it doesn\'t have to be a formal process.

Try this: after completing a bigger task, send a quick note: "Let me know if this hits the mark or if you\'d like anything adjusted." That\'s it. Make it easy for them to respond with a thumbs up or a tweak. Over time, this builds a healthy habit of two-way communication.`,
    clientScript: `Hi {{CLIENT_NAME}}, we want to make sure your VA experience is consistently excellent, and the best way for us to do that is with your input.

We\'re not looking for long reports — even a quick reply to your VA\'s work saying "this is great" or "can you adjust X" helps us ensure things are on track. Would you be open to a very simple monthly check-in — just two or three quick questions? It takes less than 2 minutes and helps us serve you better.`,
    correctiveActions: JSON.stringify([
      'VA implements micro-feedback requests after major task completions',
      'AM sends a simple monthly satisfaction check-in to client',
      'Establish a feedback norm in the working relationship within 30 days',
      'Document any feedback signals received for case review',
    ]),
    successMeasures: JSON.stringify([
      'Client provides at least one substantive piece of feedback within 30 days',
      'Monthly feedback mechanism established and sustained for 60 days',
      'VA reports better awareness of client satisfaction levels',
    ]),
    escalationCriteria: JSON.stringify([
      'Client is completely unresponsive to all feedback requests for 60+ days',
      'Issues surface that could have been caught earlier with a feedback loop',
    ]),
    relatedScenarios: JSON.stringify([3, 13, 14]),
  },
  {
    scenarioNumber: 17,
    title: 'Cultural / Communication Style Differences',
    category: 'COMMUNICATION',
    defaultSeverity: 'LOW',
    description: 'Cultural background or communication style differences between the VA and client are creating friction, misunderstandings, or a lack of comfort in the working relationship.',
    warningSigns: JSON.stringify([
      'Client misinterprets VA\'s directness or formality as rudeness or aloofness',
      'VA misreads client\'s casual communication as lack of respect',
      'Different expectations around response times, formality, or small talk',
      'Client has commented on communication style or accent in feedback',
      'VA is overly deferential due to cultural background, undermining their confidence',
      'Recurring miscommunication that seems to stem from style rather than intent',
    ]),
    potentialRootCauses: JSON.stringify([
      'VA and client come from different cultural communication norms',
      'Neither party has been coached on how to bridge the style gap',
      'Client has unexamined biases affecting their perception of the VA',
      'VA has not adapted their communication style to match client preferences',
      'Language nuances are creating unintended tone or meaning issues',
    ]),
    vaQuestions: JSON.stringify([
      'Have you felt any communication friction with this client that seems style-related?',
      'Are there moments where you\'re unsure how to phrase something for them?',
      'Has the client ever reacted unexpectedly to something you said or wrote?',
      'How comfortable are you adapting your communication style for different clients?',
    ]),
    clientQuestions: JSON.stringify([
      'How would you describe your VA\'s communication style?',
      'Are there moments in your exchanges that have felt awkward or unclear?',
      'What communication style do you work best with?',
      'Is there anything about how your VA communicates that you\'d like to see shift?',
    ]),
    evidenceToCollect: JSON.stringify([
      'Specific examples of communication friction from both parties',
      'Patterns in when miscommunications occur',
      'Any direct comments from client about VA\'s communication',
    ]),
    vaCoaching: JSON.stringify([
      'Provide specific examples of how the client prefers to communicate',
      'Coach VA on adjusting tone, formality level, and response style',
      'Celebrate the VA\'s strengths while helping them bridge the style gap',
      'Normalize the challenge and reframe it as a professional skill',
      'Avoid framing this as the VA needing to fundamentally change who they are',
    ]),
    vaScript: `Hi {{VA_NAME}}, I want to talk about something I think we can improve in your communication with {{CLIENT_NAME}} — and I want to start by saying this is purely a style calibration, not a criticism of who you are.

Every client has different preferences for how they like to communicate — some are formal, some are casual, some want lots of detail, others want brevity. With {{CLIENT_NAME}}, I\'ve noticed they tend to [client style description]. Let\'s talk about a few small adjustments that can make your communication feel more natural to them.

This is a skill that\'s genuinely valuable and will serve you in every client relationship. Let\'s work through it together.`,
    clientScript: `Hi {{CLIENT_NAME}}, I\'m following up about the communication dynamic with your VA.

Differences in communication style are very common in international working relationships, and the good news is they\'re very addressable. We\'re working with {{VA_NAME}} on calibrating their style to better match what you\'re used to.

Is there anything specific you\'d like to see shifted — more brevity, different tone, different check-in format? Your input will help us make that happen faster.`,
    correctiveActions: JSON.stringify([
      'AM provides VA with specific communication style guidelines for this client',
      'VA adjusts communication style and tests for 2 weeks',
      'AM checks in with client on communication improvement at 30 days',
      'If client has bias concerns: escalate to leadership for appropriate handling',
    ]),
    successMeasures: JSON.stringify([
      'Client reports improved communication comfort in next check-in',
      'VA confirms feeling more confident in their communication style',
      'Frequency of communication-related misunderstandings drops',
    ]),
    escalationCriteria: JSON.stringify([
      'Client makes discriminatory or biased comments about the VA\'s background',
      'VA reports feeling disrespected due to cultural or racial bias',
      'Communication issues persist after 60 days of coaching',
    ]),
    relatedScenarios: JSON.stringify([2, 6, 11]),
  },
  {
    scenarioNumber: 18,
    title: 'Disrespectful / Inappropriate Client Conduct',
    category: 'CONDUCT',
    defaultSeverity: 'CRITICAL',
    description: 'The client is behaving in a way that is disrespectful, abusive, discriminatory, or otherwise inappropriate toward the VA, creating a hostile and potentially harmful working environment.',
    warningSigns: JSON.stringify([
      'VA reports being yelled at, belittled, or insulted by the client',
      'Client sends messages with harsh, demeaning, or threatening language',
      'VA is visibly distressed when speaking about the client',
      'Client makes discriminatory comments related to race, gender, religion, or nationality',
      'Client crosses professional boundaries (inappropriate personal requests, harassment)',
      'VA has expressed fear about interacting with the client',
    ]),
    potentialRootCauses: JSON.stringify([
      'Client has a pattern of abusive behavior and it is intrinsic to their character',
      'Client is under extreme stress and has taken it out on the VA inappropriately',
      'Client does not respect the VA relationship or sees VAs as expendable',
      'Previous lack of accountability has emboldened client behavior',
      'Cultural differences in management style (this does not excuse the behavior)',
    ]),
    vaQuestions: JSON.stringify([
      'Can you describe exactly what happened, including what was said or done?',
      'How has this affected you emotionally and in terms of your ability to work?',
      'Is there any documentation of the incident (messages, recordings)?',
      'Do you feel safe continuing to work with this client?',
      'Has this happened before, and if so, how often?',
      'Are you comfortable with me reviewing any of the communications?',
    ]),
    clientQuestions: JSON.stringify([
      'I want to speak with you directly about an interaction that was reported to us.',
      'Can you walk me through what happened from your perspective?',
      'Are you aware of how this was received by your VA?',
      'We have clear conduct standards for all working relationships — I want to review those with you.',
    ]),
    evidenceToCollect: JSON.stringify([
      'VA\'s detailed account of the incident(s) with dates and specifics',
      'Any written or digital evidence of the inappropriate conduct',
      'History of similar behavior or prior warnings to client',
      'VA\'s emotional state and impact assessment',
    ]),
    vaCoaching: JSON.stringify([
      'Immediately validate VA\'s experience and confirm their safety is the top priority',
      'Do not require VA to continue working with the client while investigation is active',
      'Provide emotional support resources if needed',
      'Be transparent: this will be escalated to leadership immediately',
      'Confirm the VA knows they will not face any negative consequence for reporting',
    ]),
    vaScript: `Hi {{VA_NAME}}, thank you for telling me what happened. What you\'ve described is not acceptable, and I want to be very clear: you did the right thing by reporting it.

Your safety and wellbeing are the first priority here. While I take the next steps with leadership, I want to make sure you\'re okay. Is there anything you need right now?

I\'m going to document everything you\'ve shared with me and escalate this immediately. You will not be expected to interact with this client again until we\'ve resolved this situation. I\'ll keep you updated at every step, and I\'m here if you need to talk.`,
    clientScript: `Hi {{CLIENT_NAME}}, I need to speak with you directly about a serious matter.

It has been reported that during a recent interaction, behavior occurred that falls outside our conduct expectations for all partnerships. I\'m not in a position to continue this conversation by email — I\'d like to schedule a call today or tomorrow.

This is not a routine check-in. Please make yourself available at [proposed time]. If we cannot resolve this, we will need to make decisions about the status of the partnership.`,
    correctiveActions: JSON.stringify([
      'Escalate to leadership within 24 hours — no AM handles this alone',
      'Remove VA from active client contact immediately pending resolution',
      'Conduct a formal client conduct review',
      'Determine if client engagement should continue — consider termination',
      'Document everything and follow your organization\'s misconduct policy',
    ]),
    successMeasures: JSON.stringify([
      'VA is protected from further harmful interactions immediately',
      'Leadership decision on client engagement made within 5 business days',
      'If relationship continues: written conduct agreement signed by client',
    ]),
    escalationCriteria: JSON.stringify([
      'This scenario is itself an escalation trigger — leadership must be involved immediately',
      'Any threat of physical harm or illegal conduct triggers legal consultation',
      'If client repeats behavior after a conduct agreement: immediate termination of engagement',
    ]),
    relatedScenarios: JSON.stringify([2, 11, 19]),
  },
  {
    scenarioNumber: 19,
    title: 'Fundamental VA-Client Mismatch',
    category: 'MISMATCH',
    defaultSeverity: 'HIGH',
    description: 'The VA and client are fundamentally incompatible in working style, personality, communication preferences, or skillset — making a successful long-term partnership unlikely regardless of coaching.',
    warningSigns: JSON.stringify([
      'Despite coaching, neither party feels the relationship is working',
      'Client repeatedly compares VA unfavorably to an idealized standard',
      'VA dreads interactions with the client and shows consistent disengagement',
      'No significant improvement after multiple intervention cycles',
      'Client\'s needs are fundamentally outside the VA\'s strengths',
      'Both parties have expressed interest in ending the partnership',
    ]),
    potentialRootCauses: JSON.stringify([
      'The initial match was based on availability rather than true alignment',
      'Client\'s working style (e.g., extremely fast-paced) does not match the VA\'s',
      'Personality clash that cannot be resolved through coaching',
      'Skills mismatch that has been masked by workarounds',
      'Cultural or communication incompatibilities that have resisted bridging',
    ]),
    vaQuestions: JSON.stringify([
      'Honestly, how do you feel about continuing in this role?',
      'If you could change one thing about this client relationship, what would it be?',
      'Do you feel that you\'re able to do your best work with this client?',
      'What would a better match look like for you?',
    ]),
    clientQuestions: JSON.stringify([
      'If you\'re being completely honest, are you getting what you need from this partnership?',
      'What would an ideal VA look like for you?',
      'Are you open to trying a different VA who might be a better fit?',
      'What would make you confident in giving a new placement a real chance?',
    ]),
    evidenceToCollect: JSON.stringify([
      'History of all coaching interventions and their outcomes',
      'Client and VA feedback over the engagement timeline',
      'Assessment of VA\'s skills vs client\'s actual needs',
      'Both parties\' honest assessment of the relationship viability',
    ]),
    vaCoaching: JSON.stringify([
      'Have an honest conversation with the VA about the situation without judgment',
      'Explore the VA\'s preferences for their next placement',
      'Affirm the VA\'s strengths and frame this as a fit issue, not a failure',
      'Begin the transition plan collaboratively',
      'Support VA emotionally through the change',
    ]),
    vaScript: `Hi {{VA_NAME}}, I want to have a very honest conversation with you today.

After everything we\'ve tried, I think we both know that the fit with {{CLIENT_NAME}} isn\'t where it needs to be — and that\'s okay. Not every partnership is the right one, and it doesn\'t mean anything negative about your abilities or character.

What I want to do is make sure your next placement is a much better match — for your strengths, your working style, and your energy. I\'d love to spend some time this week talking about what that looks like for you. What kinds of clients bring out your best work?`,
    clientScript: `Hi {{CLIENT_NAME}}, after reviewing everything, I\'d like to recommend we explore a new VA match for you.

I say this not as a criticism of either party, but because I genuinely believe a different match will get you better outcomes. Based on what I know about your working style and needs, I have some ideas about what a stronger fit would look like.

Can we schedule 30 minutes to talk through this? I\'m committed to getting you into a partnership that truly works — and doing it as smoothly as possible.`,
    correctiveActions: JSON.stringify([
      'AM communicates transition decision to both VA and client',
      'Begin new client matching process immediately',
      'Ensure smooth handoff of work and context from current VA',
      'Reassign VA to a new placement with better fit criteria',
    ]),
    successMeasures: JSON.stringify([
      'Client successfully matched with new VA within 3 weeks',
      'VA placed with a new client within 3 weeks',
      'Both parties report better experience in new arrangements',
    ]),
    escalationCriteria: JSON.stringify([
      'Client refuses restaffing and demands to keep a VA they are clearly incompatible with',
      'VA reports emotional harm from the engagement requiring immediate relief',
      'Situation reaches a breaking point before restaffing can be arranged',
    ]),
    relatedScenarios: JSON.stringify([9, 11, 15, 24]),
  },
  {
    scenarioNumber: 20,
    title: 'Strong Performance but Limited Growth',
    category: 'DEVELOPMENT',
    defaultSeverity: 'LOW',
    description: 'The VA is performing their current role well but has plateaued and is not developing new skills, expanding responsibilities, or advancing professionally — creating risk of disengagement or turnover.',
    warningSigns: JSON.stringify([
      'VA consistently performs well but expresses boredom or restlessness',
      'VA has not taken on any new skills or responsibilities in 6+ months',
      'VA mentions interest in doing more or learning new things',
      'Client has not expanded the VA\'s role despite positive performance',
      'VA\'s engagement and enthusiasm appear to be declining',
    ]),
    potentialRootCauses: JSON.stringify([
      'Client is satisfied with status quo and hasn\'t thought about the VA\'s growth',
      'VA hasn\'t communicated their growth aspirations',
      'No development plan exists for the VA in this engagement',
      'The client\'s business needs don\'t naturally require expanded capabilities',
    ]),
    vaQuestions: JSON.stringify([
      'How do you feel about where you are in your professional development right now?',
      'Are there skills or responsibilities you\'d like to develop?',
      'Has growth or learning come up in your conversations with the client?',
      'What does your ideal professional trajectory look like?',
    ]),
    clientQuestions: JSON.stringify([
      'Are you satisfied with your VA\'s performance overall?',
      'Are there new areas where you could use more support?',
      'Would you be open to expanding your VA\'s responsibilities as they grow?',
    ]),
    evidenceToCollect: JSON.stringify([
      'VA\'s current responsibility scope vs initial scope',
      'VA\'s stated professional development goals',
      'Any conversations about growth from performance check-ins',
    ]),
    vaCoaching: JSON.stringify([
      'Facilitate a development conversation to understand VA\'s goals',
      'Work with VA to identify 2-3 new skills to develop in the next quarter',
      'Encourage VA to propose a skill expansion to the client',
      'Connect VA with internal development resources or training',
    ]),
    vaScript: `Hi {{VA_NAME}}, I\'m really proud of the work you\'ve been doing with {{CLIENT_NAME}} — you\'ve built something solid there.

I also want to make sure you\'re continuing to grow and not just maintaining the status quo. Tell me: where do you want to be in a year professionally? What skills do you want to develop?

I\'d love to put together a small development plan for you — even one new skill per quarter can make a real difference. And I\'d like to explore with you whether there are ways to expand what you\'re doing for the client, or other opportunities in your portfolio. Let\'s make sure this role is building you up, not just keeping you busy.`,
    clientScript: `Hi {{CLIENT_NAME}}, just a quick note to share that {{VA_NAME}} has been doing really well — you\'ve built a great working partnership.

I\'m also exploring with them whether there are ways to continue growing their skills and expanding their contributions. Are there any new areas in your business where you\'d welcome more support? Even a small expansion can keep the energy of the partnership fresh and build even more value for you.`,
    correctiveActions: JSON.stringify([
      'Create a 90-day development plan with the VA',
      'Propose one new responsibility area to the client within 30 days',
      'Schedule quarterly development check-ins with VA',
    ]),
    successMeasures: JSON.stringify([
      'VA identifies and begins developing one new skill within 30 days',
      'VA takes on at least one new responsibility within 60 days',
      'VA reports higher engagement level in next check-in',
    ]),
    escalationCriteria: JSON.stringify([
      'VA expresses firm intent to leave if growth opportunities don\'t emerge',
      'Client refuses any expansion despite excellent VA performance',
    ]),
    relatedScenarios: JSON.stringify([1, 13]),
  },
  {
    scenarioNumber: 21,
    title: 'Unclear Ownership in Multi-VA Account',
    category: 'PROCESS',
    defaultSeverity: 'MODERATE',
    description: 'A client has multiple VAs but roles, responsibilities, and communication ownership are unclear, causing duplication, dropped tasks, or confusion about who does what.',
    warningSigns: JSON.stringify([
      'Tasks are being duplicated between VAs or falling through the cracks',
      'Client is unsure which VA to contact for which tasks',
      'VAs are stepping on each other\'s responsibilities',
      'Communication to the client is inconsistent or contradictory across VAs',
      'VAs are unaware of what the other VAs are working on',
    ]),
    potentialRootCauses: JSON.stringify([
      'No clear role delineation was established when the second VA was added',
      'Client communicates with VAs separately without coordinating',
      'VAs do not have a shared visibility system for tasks and status',
      'Ownership handoffs were not defined for overlapping task categories',
    ]),
    vaQuestions: JSON.stringify([
      'Do you have a clear understanding of which tasks are yours vs your colleague\'s?',
      'How do you coordinate with the other VA on shared priorities?',
      'Have there been any instances of duplicated work or dropped balls recently?',
      'How does the client communicate tasks — to both of you or separately?',
    ]),
    clientQuestions: JSON.stringify([
      'How do you typically decide which VA to send a task to?',
      'Are you satisfied with how the two VAs are coordinating?',
      'Have there been any instances of tasks being missed or done twice?',
      'Would you like a clearer ownership structure established?',
    ]),
    evidenceToCollect: JSON.stringify([
      'Both VAs\' task lists to identify overlaps or gaps',
      'Client\'s communication patterns with each VA',
      'Any documented duplications or missed tasks',
    ]),
    vaCoaching: JSON.stringify([
      'Facilitate a coordination call between both VAs to establish working norms',
      'Create a shared task ownership document visible to both VAs and client',
      'Define primary contact rules: which VA owns which task category',
      'Establish a weekly brief coordination sync between VAs',
    ]),
    vaScript: `Hi {{VA_NAME}}, I want to talk about how you and {{VA2_NAME}} are coordinating on the {{CLIENT_NAME}} account.

Right now, some of the ownership between the two of you is unclear — and that\'s creating some risk of work falling through the cracks or being duplicated. That\'s not anyone\'s fault; it\'s something we need to set up properly.

I\'d like to bring both of you together for a short call to map out who owns what. From that, we\'ll create a simple shared document that you both maintain and that the client can reference. This will also make your check-ins with the client cleaner because they\'ll know exactly who to go to for what.`,
    clientScript: `Hi {{CLIENT_NAME}}, I want to make sure the coordination between your two VAs is working smoothly.

We\'re putting together a clear ownership structure so you always know who to contact for which types of tasks, and so nothing falls through the cracks. We\'ll share that with you once it\'s done — it\'ll be a simple reference document.

Is there anything on your end that feels unclear or that you\'d like us to address in that structure?`,
    correctiveActions: JSON.stringify([
      'Facilitate VA-VA coordination call within 1 week',
      'Create and share a task ownership matrix with client and both VAs',
      'Establish a weekly 15-minute VA coordination sync',
      'AM reviews task coverage at 30 days to assess improvement',
    ]),
    successMeasures: JSON.stringify([
      'Zero duplicated or dropped tasks reported in next 30 days',
      'Client reports clarity on who to contact for each task type',
      'Both VAs confirm clear understanding of their ownership areas',
    ]),
    escalationCriteria: JSON.stringify([
      'Coordination issues continue after structure is established',
      'Client requests reduction to single VA due to confusion',
      'Conflict emerges between VAs over ownership',
    ]),
    relatedScenarios: JSON.stringify([7, 10]),
  },
  {
    scenarioNumber: 22,
    title: 'Client-Side Delays Affecting VA Performance',
    category: 'CLIENT_BEHAVIOR',
    defaultSeverity: 'MODERATE',
    description: 'The VA\'s output and ability to meet deadlines is being consistently compromised by delays on the client\'s side — slow approvals, late content, or missing inputs.',
    warningSigns: JSON.stringify([
      'VA reports that tasks are stalled waiting on client-provided content, decisions, or approvals',
      'Deadlines are being missed because the VA doesn\'t have what they need from the client',
      'Client complains about delays without acknowledging their own contribution to them',
      'The VA is unable to plan their week because client dependencies are unpredictable',
      'VA is being blamed for missed deadlines that are actually client-caused',
    ]),
    potentialRootCauses: JSON.stringify([
      'Client\'s internal bottlenecks are creating upstream delays for the VA',
      'No clear input deadline system exists to protect the VA\'s output timelines',
      'Client doesn\'t see the connection between their delays and VA performance',
      'VA is absorbing blame without escalating the actual dependency',
    ]),
    vaQuestions: JSON.stringify([
      'Can you give me specific examples of tasks that were late because you were waiting on the client?',
      'Have you communicated to the client that you\'re blocked by their delay?',
      'How do you handle it when the client holds something up and then expects it done immediately?',
      'Have you been blamed for delays that were actually caused by client-side gaps?',
    ]),
    clientQuestions: JSON.stringify([
      'Are you aware that some of your VA\'s output delays have been due to waiting on your inputs?',
      'Are there specific items — approvals, content, decisions — that tend to take time on your end?',
      'How can we establish a system that protects the VA\'s timeline when inputs are needed?',
    ]),
    evidenceToCollect: JSON.stringify([
      'VA\'s log of tasks delayed due to client-side dependency',
      'Communication records showing VA waiting on client input',
      'Timeline analysis of client input request vs receipt vs task completion',
    ]),
    vaCoaching: JSON.stringify([
      'Coach VA to document and date-stamp client-caused delays in real time',
      'Teach VA to set expectations upfront: "I\'ll need X from you by Y to deliver Z by Z+2"',
      'Give VA language to flag delays without placing blame',
      'Coach VA to escalate to AM when they\'re being blamed for client-caused delays',
    ]),
    vaScript: `Hi {{VA_NAME}}, I want to address something important — the situation where client delays are affecting your timeline and potentially your reputation.

This is a real problem and you shouldn\'t be absorbing it silently. Here\'s what I want you to do: every time you send a request to {{CLIENT_NAME}} for something you need, write it like this — "I\'ll need [item] by [date] to complete [task] by [due date]." This creates a clear record.

If they\'re late and then the task is late, you have documentation. If it becomes a recurring pattern, bring it to me and I\'ll address it with them directly. You shouldn\'t be blamed for something outside your control.`,
    clientScript: `Hi {{CLIENT_NAME}}, I want to help us improve the overall delivery timeline on your account.

We\'ve noticed a pattern where {{VA_NAME}} is ready to execute but is waiting on inputs from your side — whether that\'s content, approvals, or decisions. When those come in late, it pushes the final delivery.

To fix this, we\'d like to establish a simple input-request protocol where your VA clearly flags what they need and when they need it by — so you have visibility and can plan accordingly. Would you be open to trying that?`,
    correctiveActions: JSON.stringify([
      'VA implements input-request protocol with deadlines on all dependencies',
      'AM educates client on impact of their delays on VA output',
      'AM adjusts client\'s expectations of delivery timelines to account for input lags',
      'Monitor for improvements over 30 days',
    ]),
    successMeasures: JSON.stringify([
      'Client-caused delays drop by 50% within 30 days',
      'VA is no longer blamed for delays with documented client-side causes',
      'Delivery timelines stabilize within 30 days',
    ]),
    escalationCriteria: JSON.stringify([
      'Client continues to blame VA for their own delays after education',
      'Delays are seriously impacting the viability of the VA\'s output',
      'VA is experiencing stress or performance concerns due to unfair attribution',
    ]),
    relatedScenarios: JSON.stringify([3, 7]),
  },
  {
    scenarioNumber: 23,
    title: 'Scope Creep',
    category: 'EXPECTATIONS',
    defaultSeverity: 'MODERATE',
    description: 'The client has gradually expanded what they expect the VA to do beyond the originally agreed scope without formal discussion, additional compensation, or acknowledgment.',
    warningSigns: JSON.stringify([
      'VA\'s task list has grown significantly since onboarding without a scope update',
      'VA is working on tasks that were never part of the original agreement',
      'Client casually assigns entirely new categories of work',
      'VA is burned out partly due to an expanding scope they feel they can\'t decline',
      'Billing or time agreements don\'t reflect the current volume of work',
    ]),
    potentialRootCauses: JSON.stringify([
      'Client sees the VA as a flexible resource and hasn\'t thought about scope limits',
      'VA has been saying yes to avoid conflict',
      'No formal scope document exists that everyone references',
      'Client\'s business needs have genuinely grown and they need more support',
    ]),
    vaQuestions: JSON.stringify([
      'How does what you\'re doing today compare to what you were hired to do?',
      'Are there tasks you\'re doing that don\'t feel like they\'re part of your role?',
      'Have you felt uncomfortable saying no to a request? Tell me about that.',
      'How many hours per week are you actually working for this client?',
    ]),
    clientQuestions: JSON.stringify([
      'Has your VA\'s workload grown since you started working together?',
      'Are you aware of the original scope agreement for this engagement?',
      'Are there tasks you\'ve added over time that weren\'t in the original plan?',
      'Have you considered whether the current scope warrants a scope adjustment conversation?',
    ]),
    evidenceToCollect: JSON.stringify([
      'Original scope document vs current task list',
      'VA\'s current hours vs contracted hours',
      'List of task categories added since onboarding',
      'Any communications where new responsibilities were assigned informally',
    ]),
    vaCoaching: JSON.stringify([
      'Give VA explicit permission and language to flag scope creep to client and AM',
      'Coach VA to say: "I want to check with my AM on whether this is within scope before I start"',
      'Reassure VA that advocating for appropriate scope is professional, not confrontational',
      'Help VA audit their current task list against original scope',
    ]),
    vaScript: `Hi {{VA_NAME}}, I want to look at something together — and I want you to know that bringing this up is the right thing to do, not a problem.

When I look at your current task list versus what you were originally set up to do for {{CLIENT_NAME}}, I\'m seeing a meaningful gap. Your scope has grown, and I want to make sure that\'s being handled properly — both for your wellbeing and for the health of the engagement.

Going forward, whenever a new category of work is assigned, I want you to say: "Let me check with my AM to confirm that\'s within our current scope." Bring it to me, and I\'ll handle the conversation with the client. You shouldn\'t be managing scope on your own.`,
    clientScript: `Hi {{CLIENT_NAME}}, I want to check in about the scope of what your VA is handling right now.

When we review it, we\'re seeing that {{VA_NAME}}\'s responsibilities have grown meaningfully since the start of the engagement. That\'s a great sign that you\'re getting more value — but we also want to make sure we\'re set up properly for the current scope, both in terms of workload and agreement.

Would you be open to a short scope review conversation? I want to make sure we\'re aligned on what\'s in and out of scope and that your VA has what they need to sustain that level of support.`,
    correctiveActions: JSON.stringify([
      'VA and AM audit current task list vs original scope',
      'AM presents scope findings to client in a non-confrontational conversation',
      'Formalize updated scope agreement if expansion is valid',
      'Remove out-of-scope tasks from VA\'s plate if expansion isn\'t justified',
    ]),
    successMeasures: JSON.stringify([
      'Scope agreement is updated and signed within 30 days',
      'VA\'s workload is at a sustainable level within 30 days',
      'No new tasks are added without formal scope acknowledgment',
    ]),
    escalationCriteria: JSON.stringify([
      'Client insists on expanded scope without fair compensation or acknowledgment',
      'VA is significantly overworked due to unchecked scope creep',
      'Scope dispute creates relationship conflict',
    ]),
    relatedScenarios: JSON.stringify([8, 12, 7]),
  },
  {
    scenarioNumber: 24,
    title: 'Client or VA Considering Ending Partnership',
    category: 'MISMATCH',
    defaultSeverity: 'CRITICAL',
    description: 'Either the client is considering canceling the engagement or the VA has expressed desire to leave the partnership, requiring immediate intervention to either repair or transition gracefully.',
    warningSigns: JSON.stringify([
      'Client explicitly mentions considering pausing or canceling service',
      'VA has told the AM they want to stop working with this client',
      'Either party is withdrawing emotionally — late responses, minimal engagement',
      'Client is interviewing other VA services or providers',
      'VA has begun job searching or asking about other placements',
      'Relationship quality or performance has been declining for 60+ days',
    ]),
    potentialRootCauses: JSON.stringify([
      'Unresolved issues from another scenario that were not addressed in time',
      'A specific breaking point event (mistake, conflict, inappropriate behavior)',
      'Fundamental mismatch that coaching cannot address',
      'External factors: client\'s budget, business closing, personal circumstances',
      'VA burnout or a better opportunity arising',
    ]),
    vaQuestions: JSON.stringify([
      'What\'s driving your decision? Is this something you\'ve been feeling for a while or was there a specific moment?',
      'Is there anything that would change your mind?',
      'How are you doing personally? Is there anything beyond this client I should know about?',
      'What would make your next placement better than this one?',
    ]),
    clientQuestions: JSON.stringify([
      'What\'s driving your thinking about ending the engagement?',
      'Is this about the VA specifically, or about the service as a whole?',
      'Is there anything we could do in the next 30 days that would change your decision?',
      'What would your ideal VA partnership look like going forward?',
    ]),
    evidenceToCollect: JSON.stringify([
      'Context for the decision: how long has this been building?',
      'Whether there\'s a specific trigger event',
      'History of unresolved issues in the case',
      'Client\'s overall satisfaction with Goldbar beyond this specific engagement',
    ]),
    vaCoaching: JSON.stringify([
      'Have an immediate, direct conversation to understand the VA\'s position fully',
      'If VA is leaving: support the transition, don\'t guilt them',
      'If VA is open to repair: escalate immediately and treat it as a high-priority case',
      'Document the VA\'s reasons for future matching improvement',
    ]),
    vaScript: `Hi {{VA_NAME}}, I\'m really glad you told me how you\'re feeling. I want to take this seriously.

I\'d like to understand what\'s driving this for you — is it the client specifically, the nature of the work, something in your life overall, or a combination? No judgment. Your honest answer helps me support you the best way I can.

If there\'s a path to making this work and you\'re open to it, I want to try. And if you\'ve made up your mind, I respect that and I want to help you transition well and find a placement that\'s a better fit. Either way, you matter to us — and this conversation is the start of figuring out the best next step for you.`,
    clientScript: `Hi {{CLIENT_NAME}}, I want to speak with you directly about where things stand with your VA engagement.

I understand you\'re considering ending the partnership, and I want to make sure I fully understand your reasons before anything is decided. Can we schedule a call in the next 48 hours?

I want to hear what hasn\'t been working and whether there are options we haven\'t yet explored — a different VA, a restructured scope, or something else. If you\'ve made a final decision, I want to make sure your offboarding is handled well. Either way, I\'m committed to getting this right for you.`,
    correctiveActions: JSON.stringify([
      'AM escalates to leadership immediately — 48 hours maximum',
      'Separate urgent conversations with VA and client to assess options',
      'Determine path: repair attempt or graceful transition',
      'If transition: begin restaffing or offboarding within 1 week',
    ]),
    successMeasures: JSON.stringify([
      'Clear resolution path decided within 5 business days',
      'If repair: meaningful improvement metrics agreed within 30 days',
      'If transition: smooth handoff with no disruption to client\'s business',
    ]),
    escalationCriteria: JSON.stringify([
      'This scenario itself requires immediate leadership escalation',
      'Either party is in a harmful situation requiring urgent protection',
      'Client is threatening public complaints or legal action',
    ]),
    relatedScenarios: JSON.stringify([11, 15, 18, 19]),
  },
]

async function main() {
  console.log('Seeding RH scenarios...')

  for (const scenario of scenarios) {
    await prisma.rHScenario.upsert({
      where: { scenarioNumber: scenario.scenarioNumber },
      update: scenario,
      create: scenario,
    })
    console.log(`  ✓ Scenario ${scenario.scenarioNumber}: ${scenario.title}`)
  }

  console.log(`\nDone! Seeded ${scenarios.length} scenarios.`)
}

main()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
