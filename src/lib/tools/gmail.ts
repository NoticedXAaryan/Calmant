import { z } from "zod";
import { ToolExecutionContext } from "./tool-manifest";
import { GmailService } from "../services/gmail-service";

export const gmailSearchSchema = z.object({
  query: z.string().describe("Gmail search query (e.g. 'is:unread', 'from:boss@example.com')"),
  maxResults: z.number().int().min(1).max(50).default(10),
});

export const gmailCreateDraftSchema = z.object({
  to: z.string().email().describe("Recipient email address"),
  subject: z.string().describe("Email subject"),
  bodyText: z.string().describe("Plain text body of the email"),
});

export const gmailSendDraftSchema = z.object({
  draftId: z.string().describe("ID of the draft to send"),
});

export async function executeGmailSearch(args: z.infer<typeof gmailSearchSchema>, context: ToolExecutionContext): Promise<string> {
  const messages = await GmailService.searchMessages(context.userId, args.query, args.maxResults);
  if (messages.length === 0) return "No messages found matching the query.";

  const results = messages.map((m: any) => {
    const headers = m.payload?.headers || [];
    const subject = headers.find((h: any) => h.name === 'Subject')?.value || 'No Subject';
    const from = headers.find((h: any) => h.name === 'From')?.value || 'Unknown';
    return `ID: ${m.id}\nFrom: ${from}\nSubject: ${subject}\nSnippet: ${m.snippet}\n---`;
  });

  return `Found ${messages.length} messages:\n\n${results.join('\n')}`;
}

export async function executeGmailCreateDraft(args: z.infer<typeof gmailCreateDraftSchema>, context: ToolExecutionContext): Promise<string> {
  const draft = await GmailService.createDraft(context.userId, args.to, args.subject, args.bodyText);
  return `Draft created successfully. Draft ID: ${draft.id}`;
}

export async function executeGmailSendDraft(args: z.infer<typeof gmailSendDraftSchema>, context: ToolExecutionContext): Promise<string> {
  const res = await GmailService.sendDraft(context.userId, args.draftId);
  return `Draft ${args.draftId} sent successfully.`;
}
