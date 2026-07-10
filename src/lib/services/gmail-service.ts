import { prisma } from "../prisma";
import { TelegramService } from "./telegram-service";
import { ModelRouter } from "../agent-runtime/model-router";

export class GmailService {
  /**
   * Retrieves the access token for the given user's Gmail connection.
   */
  static async getAccessToken(userId: string): Promise<string> {
    const conn = await prisma.integrationConnection.findUnique({
      where: { userId_provider: { userId, provider: "email" } }, // Note: assuming provider is "email" or "gmail"
    });

    if (!conn || conn.status !== "connected" || !conn.accessToken) {
      throw new Error("Gmail not connected. Ask user to connect.");
    }
    
    if (conn.expiresAt && conn.expiresAt < new Date() && conn.refreshToken) {
      const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          refresh_token: conn.refreshToken,
          grant_type: "refresh_token",
        }),
      });
      const tokens = await res.json();
      await prisma.integrationConnection.update({
        where: { id: conn.id },
        data: {
          accessToken: tokens.access_token,
          expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        },
      });
      return tokens.access_token;
    }
    
    return conn.accessToken;
  }

  static async searchMessages(userId: string, query: string, maxResults: number = 10) {
    const token = await this.getAccessToken(userId);
    const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!res.ok) throw new Error(`Gmail API error: ${res.status}`);
    const data = await res.json();
    
    if (!data.messages) return [];

    const messages = await Promise.all(data.messages.map(async (msg: any) => {
      const msgRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return msgRes.json();
    }));

    return messages;
  }

  static async createDraft(userId: string, to: string, subject: string, bodyText: string) {
    const token = await this.getAccessToken(userId);
    
    const message = [
      `To: ${to}`,
      `Subject: ${subject}`,
      '',
      bodyText
    ].join('\n');
    
    const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    
    const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/drafts`, {
      method: "POST",
      headers: { 
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: { raw: encodedMessage }
      })
    });

    if (!res.ok) throw new Error(`Gmail API error: ${res.status}`);
    return res.json();
  }

  static async sendDraft(userId: string, draftId: string) {
    const token = await this.getAccessToken(userId);
    const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/drafts/send`, {
      method: "POST",
      headers: { 
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ id: draftId })
    });

    if (!res.ok) throw new Error(`Gmail API error: ${res.status}`);
    return res.json();
  }

  static async scanOutcomes(userId: string) {
    try {
      // Find latest unread emails in the last 24h
      const query = "is:unread newer_than:1d";
      const messages = await this.searchMessages(userId, query, 5);
      
      for (const msg of messages) {
        const headers = msg.payload?.headers || [];
        const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
        const from = headers.find((h: any) => h.name === 'From')?.value || '';
        
        let snippet = msg.snippet || '';

        // Minimal LLM check
        const prompt = `Analyze this email from "${from}" with subject "${subject}". Snippet: "${snippet}".
Does this email represent a job application outcome (e.g. rejection, interview invite, offer)? 
Reply strictly in JSON format: {"isOutcome": true/false, "category": "rejection"|"interview"|"offer"|"none", "reason": "..."}`;

        const text = await ModelRouter.generateText(
          prompt,
          { model: "gpt-4o-mini" }
        );

        try {
          const parsed = JSON.parse(text);
          if (parsed.isOutcome) {
            await prisma.agentMemory.create({
              data: {
                userId,
                fact: `Application outcome from ${from}: ${parsed.category}. Reason: ${parsed.reason}`,
                category: "pattern",
                confidence: 0.9,
                status: "active"
              }
            });
            await TelegramService.sendMessage(userId, `📬 **Application Update**\n\nYou received a ${parsed.category} email from ${from}.`);
          }
        } catch (e) {
          // ignore parsing error
        }
      }
    } catch (err) {
      console.error(`Error scanning Gmail outcomes for ${userId}:`, err);
    }
  }
}
