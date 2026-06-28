import { emailTemplate } from "./email";

export function welcomeEmailHtml(name: string, dashboardUrl: string, telegramBotName: string): { subject: string; html: string } {
  const firstName = name.split(" ")[0] || "there";
  
  return {
    subject: "Welcome to Calmant — Your AI Productivity Companion",
    html: emailTemplate(
      `Welcome, ${firstName} 🚀`,
      `<p style="color:#94a3b8;margin:0 0 16px;line-height:1.6;">
        I'm Calmant, your new proactive execution assistant. I'm here to make sure you never miss a deadline or forget a commitment again.
      </p>
      
      <h3 style="color:#f1f5f9;margin:24px 0 12px;font-size:16px;">How I can help you:</h3>
      <ul style="color:#94a3b8;margin:0 0 24px;padding-left:20px;line-height:1.6;">
        <li><strong>Capture anything:</strong> Send me a vague thought, a voice note, or a link, and I'll extract the deadlines and next steps.</li>
        <li><strong>Plan backwards:</strong> Tell me when something is due, and I'll schedule the prep work.</li>
        <li><strong>Remind effectively:</strong> I'll nudge you before it's too late, and escalate if you're falling behind.</li>
      </ul>

      <h3 style="color:#f1f5f9;margin:24px 0 12px;font-size:16px;">Connect Telegram (Recommended)</h3>
      <p style="color:#94a3b8;margin:0 0 16px;line-height:1.6;">
        The best way to interact with me is through Telegram. You can send me tasks and voice notes on the go.
      </p>
      
      <div style="background:#27272a;border-radius:8px;padding:16px;margin-bottom:24px;">
        <ol style="color:#e2e8f0;margin:0;padding-left:20px;line-height:1.6;">
          <li>Open <a href="https://t.me/${telegramBotName}" style="color:#60a5fa;text-decoration:none;">@${telegramBotName}</a> in Telegram</li>
          <li>Go to your <a href="${dashboardUrl}/dashboard/integrations" style="color:#60a5fa;text-decoration:none;">Integrations Dashboard</a> to get your Connect Code</li>
          <li>Send <code>/connect YOUR_CODE</code> to the bot</li>
        </ol>
      </div>

      <div style="text-align:center;margin:32px 0 16px;">
        <a href="${dashboardUrl}/dashboard" style="display:inline-block;background:#f1f5f9;color:#0f172a;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:6px;font-size:14px;">
          Go to Dashboard
        </a>
      </div>`
    ),
  };
}
