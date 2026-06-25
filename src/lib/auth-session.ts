// Auth Session Helper for API Routes
// Use getUser() in any API route to get the authenticated user.

import { auth } from "./auth";
import { headers } from "next/headers";

/**
 * Get the authenticated user from the current request.
 * Returns null if not authenticated.
 */
export async function getUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) return null;

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    image: session.user.image,
  };
}

/**
 * Get the authenticated user or throw a 401.
 * Use this in API routes that require authentication.
 */
export async function requireUser() {
  const user = await getUser();
  if (!user) {
    throw new Response(
      JSON.stringify({
        success: false,
        error: "Unauthorized — please sign in",
        timestamp: new Date().toISOString(),
      }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }
  return user;
}
