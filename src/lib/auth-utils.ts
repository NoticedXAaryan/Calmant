// Auth-aware user ID resolver for API routes.

import { auth } from "./auth";
import { headers } from "next/headers";

/**
 * Get the current user's ID from the Better Auth session.
 * Throws AuthError (401) for authenticated endpoints.
 * Pass fallbackAllowed=true for cron/webhook endpoints.
 */
export async function getUserId(fallbackAllowed = false): Promise<string> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (session?.user?.id) {
      return session.user.id;
    }
  } catch {
    // Session check failed (e.g., during build or cron context)
  }

  if (fallbackAllowed) {
    return "demo-user";
  }

  throw new AuthError("Unauthorized — please sign in");
}

/**
 * Get the current user's info (id, name, email) from session.
 * Returns null if no session.
 */
export async function getSessionUser(): Promise<{
  id: string;
  name: string;
  email: string;
} | null> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (session?.user) {
      return {
        id: session.user.id,
        name: session.user.name ?? "",
        email: session.user.email,
      };
    }
  } catch {
    // No session
  }

  return null;
}

export class AuthError extends Error {
  status = 401;
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}
