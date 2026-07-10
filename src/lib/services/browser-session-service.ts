import { prisma } from "../prisma";
import { chromium, Browser, BrowserContext, Page } from "playwright";

interface ActiveSession {
  browser: Browser;
  context: BrowserContext;
  page: Page;
}

const activeSessions = new Map<string, ActiveSession>();

export class BrowserSessionService {
  /**
   * Starts a browser session, returning the DB ID.
   */
  static async startSession(userId: string, runId?: string): Promise<string> {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    const externalId = Math.random().toString(36).substring(7);

    const sessionRecord = await prisma.browserSession.create({
      data: {
        userId,
        runId,
        externalId,
        status: "active",
      },
    });

    activeSessions.set(sessionRecord.id, { browser, context, page });
    return sessionRecord.id;
  }

  static getActiveSession(sessionId: string): ActiveSession | undefined {
    return activeSessions.get(sessionId);
  }

  static async updateSessionUrl(sessionId: string, url: string, title: string) {
    await prisma.browserSession.update({
      where: { id: sessionId },
      data: { currentUrl: url, title },
    });
  }

  static async captureScreenshot(sessionId: string, userId: string, runId?: string, toolCallId?: string): Promise<string> {
    const session = this.getActiveSession(sessionId);
    if (!session) throw new Error("Session not found or inactive");

    const buffer = await session.page.screenshot({ fullPage: true });
    
    // Save to artifact table
    const artifact = await prisma.artifact.create({
      data: {
        userId,
        agentRunId: runId,
        toolCallId,
        type: "screenshot",
        title: `Screenshot: ${await session.page.title()}`,
        content: `data:image/png;base64,${buffer.toString("base64")}`,
        metadata: {
          mimeType: "image/png",
          sizeBytes: buffer.length
        },
      }
    });

    return artifact.id;
  }

  static async closeSession(sessionId: string) {
    const session = activeSessions.get(sessionId);
    if (session) {
      await session.browser.close();
      activeSessions.delete(sessionId);
    }

    await prisma.browserSession.update({
      where: { id: sessionId },
      data: { status: "closed" },
    });
  }
}
