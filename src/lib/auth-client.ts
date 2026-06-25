// Better Auth — Client-Side Auth Hooks
// Provides useSession, signIn, signUp, signOut for React components.

import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: typeof window !== "undefined" ? window.location.origin : "http://localhost:3000",
});

export const {
  useSession,
  signIn,
  signUp,
  signOut,
} = authClient;
