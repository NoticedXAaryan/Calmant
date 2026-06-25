import { google } from "googleapis";
import { prisma } from "./prisma";

async function getGoogleAuthClient(userId: string) {
  const account = await prisma.account.findFirst({
    where: { userId, providerId: "google" },
  });

  if (!account || !account.accessToken) {
    throw new Error("No Google Account linked or missing access token");
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    access_token: account.accessToken,
    refresh_token: account.refreshToken,
    expiry_date: account.accessTokenExpiresAt?.getTime(),
  });

  return oauth2Client;
}

export async function getUpcomingEvents(userId: string, maxResults = 10) {
  const auth = await getGoogleAuthClient(userId);
  const calendar = google.calendar({ version: "v3", auth });

  const res = await calendar.events.list({
    calendarId: "primary",
    timeMin: new Date().toISOString(),
    maxResults,
    singleEvents: true,
    orderBy: "startTime",
  });

  return res.data.items || [];
}

export async function addEventToCalendar(userId: string, title: string, startTime: Date, durationMins = 30) {
  const auth = await getGoogleAuthClient(userId);
  const calendar = google.calendar({ version: "v3", auth });

  const endTime = new Date(startTime.getTime() + durationMins * 60000);

  const event = {
    summary: title,
    start: {
      dateTime: startTime.toISOString(),
    },
    end: {
      dateTime: endTime.toISOString(),
    },
  };

  const res = await calendar.events.insert({
    calendarId: "primary",
    requestBody: event,
  });

  return res.data;
}
