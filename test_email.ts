import { sendEmail, criticalAlertEmail, morningBriefingEmail, eveningReviewEmail } from './src/lib/email';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

// Dummy Data
const dummyTasks = [
  { id: '1', userId: 'user_1', title: 'Ship the Next.js App', deadline: new Date(Date.now() - 3600000), status: 'pending', entropyScore: 0.95, createdAt: new Date(), updatedAt: new Date(), subtasks: [], completedAt: null },
  { id: '2', userId: 'user_1', title: 'Prepare Investor Pitch', deadline: new Date(Date.now() + 7200000), status: 'pending', entropyScore: 0.75, createdAt: new Date(), updatedAt: new Date(), subtasks: [], completedAt: null },
  { id: '3', userId: 'user_1', title: 'Fix CSS Bug', deadline: new Date(Date.now() + 86400000), status: 'in_progress', entropyScore: 0.2, createdAt: new Date(), updatedAt: new Date(), subtasks: [], completedAt: null }
] as any[];

const completedTasks = [
  { id: '4', userId: 'user_1', title: 'Morning Workout', deadline: new Date(), status: 'done', entropyScore: 0.0, createdAt: new Date(), updatedAt: new Date(), subtasks: [], completedAt: new Date() }
] as any[];

const dummyHabits = [
  { name: 'Read 10 pages', emoji: '📚', completedToday: false },
  { name: 'Drink Water', emoji: '💧', completedToday: true }
];

async function testAllEmails() {
  console.log("Sending Critical Alert...");
  const critical = criticalAlertEmail(dummyTasks.filter(t => t.entropyScore >= 0.8));
  await sendEmail(critical.subject, critical.html, process.env.USER_EMAIL);

  console.log("Sending Morning Briefing...");
  const morning = morningBriefingEmail(dummyTasks, dummyHabits, 'Aaryan');
  await sendEmail(morning.subject, morning.html, process.env.USER_EMAIL);

  console.log("Sending Evening Review...");
  const evening = eveningReviewEmail(completedTasks, dummyTasks, 1, 2);
  await sendEmail(evening.subject, evening.html, process.env.USER_EMAIL);

  console.log("✅ All test emails sent successfully!");
}

testAllEmails().catch(console.error);
