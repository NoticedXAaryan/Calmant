// Health Check Endpoint
// Source: Architecture.md → /api/health, Tasks.md → T-006
// Validation: Returns HTTP 200 with { status, timestamp }
// Referenced by: Vision.md SC-8, Validation.md T-020

import { respond } from '@/lib/api-helpers';

export async function GET() {
  return respond({
    status: 'ok',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
  });
}
