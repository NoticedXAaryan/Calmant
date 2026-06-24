// Agent: Proactive Scan API
// Source: Architecture.md → /api/agent/scan, Tasks.md → T-013
// Called on dashboard load to auto-decompose urgent tasks

import { store } from '@/lib/store';
import { respond, respondError } from '@/lib/api-helpers';
import type { AgentAction } from '@/lib/types';

const DEMO_USER_ID = 'demo-user';

export async function POST() {
  try {
    const tasks = await store.getTasks(DEMO_USER_ID);
    const actions: AgentAction[] = [];

    // Find high-entropy tasks that haven't been decomposed
    const urgentUndecomposed = tasks.filter(
      t => t.entropyScore > 0.7 && t.subtasks.length === 0 && t.status === 'pending'
    );

    // Return the list of tasks that need attention
    // Frontend will trigger decomposition for each
    for (const task of urgentUndecomposed) {
      actions.push({
        type: 'decompose',
        taskId: task.id,
        description: `"${task.title}" is urgent (entropy: ${task.entropyScore.toFixed(2)}) and has no plan yet`,
        timestamp: new Date().toISOString(),
      });
    }

    // Check for overdue tasks
    const overdue = tasks.filter(
      t => t.status !== 'done' && t.status !== 'skipped' && new Date(t.deadline) < new Date()
    );

    for (const task of overdue) {
      actions.push({
        type: 'notify',
        taskId: task.id,
        description: `"${task.title}" is OVERDUE — deadline was ${task.deadline}`,
        timestamp: new Date().toISOString(),
      });
    }

    return respond({
      actions,
      scannedAt: new Date().toISOString(),
      totalTasks: tasks.length,
      urgentCount: urgentUndecomposed.length,
      overdueCount: overdue.length,
    });
  } catch (error) {
    console.error('[POST /api/agent/scan]', error);
    return respondError('Failed to run proactive scan');
  }
}
