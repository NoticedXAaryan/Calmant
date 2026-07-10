// Health Check Endpoint
// Source: Architecture.md → /api/health, Tasks.md → T-006
// Validation: Returns HTTP 200 with { status, timestamp }
// Referenced by: Vision.md SC-8, Validation.md T-020

import { respond } from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Check DB connectivity
    await prisma.$queryRaw`SELECT 1`;

    return respond({
      status: 'ok',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
      services: {
        database: 'up',
      }
    });
  } catch (error) {
    console.error("Health check failed:", error);
    return new Response(JSON.stringify({
      status: 'error',
      timestamp: new Date().toISOString(),
      services: {
        database: 'down',
      },
      error: error instanceof Error ? error.message : "Unknown error"
    }), { status: 503, headers: { 'Content-Type': 'application/json' } });
  }
}
