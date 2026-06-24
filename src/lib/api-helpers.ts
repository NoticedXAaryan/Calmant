// API Response Helpers
// Source: Validation.md → API Validation, 04-context-and-skills → Skill 3
// All API routes return this standard shape: { success, data?, error?, timestamp }

import type { ApiResponse } from './types';

export function respond<T>(data: T, status = 200): Response {
  const body: ApiResponse<T> = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };
  return Response.json(body, { status });
}

export function respondError(message: string, status = 500): Response {
  const body: ApiResponse = {
    success: false,
    error: message,
    timestamp: new Date().toISOString(),
  };
  return Response.json(body, { status });
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
