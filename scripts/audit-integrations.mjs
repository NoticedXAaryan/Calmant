import nextEnv from "@next/env";
import { google } from "googleapis";
import { PrismaClient } from "@prisma/client";
import { Resend } from "resend";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const prisma = new PrismaClient();

function maskEmail(value) {
  if (!value) return null;
  return value.replace(/^(.).+(@.+)$/, "$1***$2");
}

function fromDomain(value) {
  if (!value || !value.includes("@")) return null;
  return value.split("@").at(-1);
}

try {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      emailVerified: true,
      onboarded: true,
      createdAt: true,
      accounts: {
        select: {
          providerId: true,
          scope: true,
          accessToken: true,
          refreshToken: true,
          accessTokenExpiresAt: true,
        },
      },
      _count: { select: { tasks: true, habits: true } },
    },
  });
  const primaryGoogleAccount = users
    .flatMap((user) =>
      user.accounts
        .filter((account) => account.providerId === "google")
        .map((account) => ({ user, account })),
    )
    .find(({ account }) => Boolean(account.accessToken));

  let calendarLiveCheck = {
    attempted: false,
    ok: false,
    reason: "No linked Google Calendar account with access token.",
  };

  if (primaryGoogleAccount) {
    calendarLiveCheck = await checkCalendarRead(primaryGoogleAccount.account);
  }

  const audit = {
    env: {
      resendApiKeyPresent: Boolean(process.env.RESEND_API_KEY),
      resendFromDomain: fromDomain(process.env.RESEND_FROM_EMAIL),
      userEmail: maskEmail(process.env.USER_EMAIL),
      googleClientIdPresent: Boolean(process.env.GOOGLE_CLIENT_ID),
      googleClientSecretPresent: Boolean(process.env.GOOGLE_CLIENT_SECRET),
      telegramBotTokenPresent: Boolean(process.env.TELEGRAM_BOT_TOKEN),
    },
    users: users.map((user) => ({
      id: user.id,
      email: maskEmail(user.email),
      emailVerified: user.emailVerified,
      onboarded: user.onboarded,
      taskCount: user._count.tasks,
      habitCount: user._count.habits,
      calendarAccounts: user.accounts
        .filter((account) => account.providerId === "google")
        .map((account) => ({
          providerId: account.providerId,
          hasAccessToken: Boolean(account.accessToken),
          hasRefreshToken: Boolean(account.refreshToken),
          hasCalendarScope: account.scope?.includes("calendar") ?? false,
          scope: account.scope,
          accessTokenExpiresAt: account.accessTokenExpiresAt,
        })),
      otherProviders: user.accounts
        .filter((account) => account.providerId !== "google")
        .map((account) => account.providerId),
    })),
    liveChecks: {
      googleCalendarRead: calendarLiveCheck,
    },
  };

  console.log(JSON.stringify(audit, null, 2));
} finally {
  await prisma.$disconnect();
}

async function checkCalendarRead(account) {
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
    );

    oauth2Client.setCredentials({
      access_token: account.accessToken,
      refresh_token: account.refreshToken,
      expiry_date: account.accessTokenExpiresAt?.getTime(),
    });

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });
    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: new Date().toISOString(),
      maxResults: 3,
      singleEvents: true,
      orderBy: "startTime",
    });

    return {
      attempted: true,
      ok: true,
      upcomingEventCount: response.data.items?.length ?? 0,
      checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      attempted: true,
      ok: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function getResendEmailStatus(emailId) {
  if (!process.env.RESEND_API_KEY || !emailId) return null;
  const resend = new Resend(process.env.RESEND_API_KEY);
  const result = await resend.emails.get(emailId);
  return result;
}
