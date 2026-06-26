// Auth Session Helper for API Routes
// Use getUser() in any API route to get the authenticated user.

import { auth } from "./auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

/**
 * Get the authenticated user from the current request.
 * Returns null if not authenticated.
 */
export async function getUser() {
  try {
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
  } catch {
    return null;
  }
}

/**
 * Get the authenticated user or return a 401 NextResponse.
 * Usage:
 *   const userOrResponse = await requireUser();
 *   if (userOrResponse instanceof NextResponse) return userOrResponse;
 */
export async function requireUser() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized — please sign in" },
      { status: 401 }
    );
  }
  return user;
}
