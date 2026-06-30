// Better Auth — Server Configuration
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { Resend } from "resend";
import { prisma } from "./prisma";

const appUrl = process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  baseURL: appUrl,
  secret: process.env.BETTER_AUTH_SECRET,

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
    requireEmailVerification: false,
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      console.log(`[Auth] Sending verification email to ${user.email}`);
      console.log(`[Auth] Verification URL: ${url}`);
      const apiKey = process.env.RESEND_API_KEY;
      if (!apiKey) {
        console.error("[Auth] RESEND_API_KEY is not configured — cannot send verification email");
        return;
      }
      const resend = new Resend(apiKey);
      const fromAddr = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
      const fromEmail = fromAddr.includes("<") ? fromAddr : `Calmant <${fromAddr}>`;
      try {
        const result = await resend.emails.send({
          from: fromEmail,
          to: user.email,
          subject: "Verify your Calmant account",
          html: verificationEmailHtml(user.name ?? user.email, url),
        });
        if (result.error) {
          console.error("[Auth] Resend error:", result.error);
        } else {
          console.log(`[Auth] Verification email sent (id: ${result.data?.id})`);
        }
      } catch (err) {
        console.error("[Auth] Failed to send verification email:", err);
      }
    },
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      accessType: "offline",
      prompt: "consent",
      scope: [
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/calendar.events",
        "https://www.googleapis.com/auth/calendar.readonly",
      ],
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },

  trustedOrigins: [
    "http://localhost:3000",
    "http://localhost:3001",
    appUrl,
  ].filter(Boolean),
});

export type Auth = typeof auth;

function verificationEmailHtml(name: string, url: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#09090b;font-family:Inter,system-ui,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:48px 24px;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:32px;">
      <div style="width:28px;height:28px;border-radius:6px;background:#fff;display:flex;align-items:center;justify-content:center;">
        <span style="font-size:14px;">⚡</span>
      </div>
      <span style="color:#fff;font-weight:700;font-size:15px;letter-spacing:-0.01em;">Calmant</span>
    </div>
    <div style="background:#111;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:32px;">
      <h1 style="color:#fff;font-size:20px;font-weight:700;margin:0 0 8px;letter-spacing:-0.02em;">Verify your email</h1>
      <p style="color:rgba(255,255,255,0.45);font-size:14px;line-height:1.6;margin:0 0 28px;">
        Hey ${name}, click the button below to verify your email address and activate your Calmant account.
      </p>
      <a href="${url}" style="display:inline-block;background:#fff;color:#000;font-weight:700;font-size:14px;padding:12px 28px;border-radius:10px;text-decoration:none;letter-spacing:-0.01em;">
        Verify my email →
      </a>
      <p style="color:rgba(255,255,255,0.2);font-size:12px;margin:24px 0 0;line-height:1.5;">
        This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.
      </p>
    </div>
    <p style="color:rgba(255,255,255,0.1);font-size:11px;text-align:center;margin-top:24px;">© 2026 Calmant</p>
  </div>
</body>
</html>`;
}
