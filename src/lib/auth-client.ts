// Better Auth — Client-Side Auth Hooks
// Provides useSession, signIn, signUp, signOut for React components.

import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  // Use NEXT_PUBLIC_APP_URL so it works consistently in both dev and prod.
  // Falls back to window.location.origin at runtime so SSR and client match.
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"),
});

export const {
  useSession,
  signIn,
  signUp,
  signOut,
} = authClient;
