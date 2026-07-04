import { prisma } from './prisma';
import { searchMemory } from './memory';

export async function buildUserContext(userId: string, currentMessage?: string) {
  const [tasks, habits] = await Promise.all([
    prisma.task.findMany({
      where: { userId, status: { in: ['PENDING', 'IN_PROGRESS'] } },
      orderBy: { entropyScore: 'desc' },
      take: 10,
      include: { subtasks: true },
    }),
    prisma.habit.findMany({
      where: { userId },
      include: { completions: { orderBy: { date: 'desc' }, take: 1 } },
      take: 10,
    }),
  ]);

  // Semantic memory search — retrieves facts RELEVANT to the current message
  let memories: string[] = [];
  if (currentMessage) {
    memories = await searchMemory(currentMessage, userId, 15);
  }

  return { tasks, memories, habits };
}

export function formatContextForPrompt(ctx: Awaited<ReturnType<typeof buildUserContext>>, timeZone?: string) {
  const now = new Date();
  
  const timeString = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    timeZone: timeZone,
    timeZoneName: 'short'
  }).format(now);

  const taskLines = ctx.tasks.map(t => {
    const hoursLeft = Math.round((t.deadline.getTime() - now.getTime()) / 3600000);
    return `- "${t.title}" (entropy: ${t.entropyScore.toFixed(2)}, ${hoursLeft}h left, status: ${t.status})`;
  }).join('\n');

  const memoryLines = ctx.memories.length > 0
    ? ctx.memories.map((m: string) => `- ${m}`).join('\n')
    : 'Nothing stored yet.';

  const habitLines = ctx.habits.map(h =>
    `- ${h.name} (streak: ${h.streak})`
  ).join('\n');

  return `
CURRENT USER CONTEXT:
System Time: ${timeString}
(Note: If the user provides a time, relate it to the system time to understand the offset if necessary.)

ACTIVE TASKS (${ctx.tasks.length}):
${taskLines || 'No active tasks.'}

WHAT I REMEMBER ABOUT YOU:
${memoryLines || 'Nothing stored yet.'}

HABITS:
${habitLines || 'No habits tracked.'}
`.trim();
}
