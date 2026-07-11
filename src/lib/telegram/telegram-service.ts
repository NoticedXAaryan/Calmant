/**
 * Telegram Service — Thin wrapper for sending messages from workers/services.
 * 
 * The TelegramUpdateRouter handles incoming messages.
 * This service handles outgoing messages initiated by the system (notifications,
 * reports, execution updates, etc.).
 */

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

/**
 * Send a message to the owner's Telegram chat.
 * Finds the chat ID from the integration connection.
 */
export async function sendTelegramMessage(
  message: string,
  metadata?: Record<string, any>,
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn('[TelegramService] No TELEGRAM_BOT_TOKEN set, skipping message');
    return;
  }

  // Get the owner's Telegram chat ID from the database
  const { prisma } = await import('../prisma');
  const connection = await prisma.integrationConnection.findFirst({
    where: {
      provider: 'telegram',
      status: { in: ['connected', 'live_verified'] },
    },
    select: { externalId: true },
  });

  if (!connection?.externalId) {
    console.warn('[TelegramService] No connected Telegram chat found, skipping message');
    return;
  }

  const chatId = connection.externalId;

  // Send the message
  const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: 'Markdown',
      // Add inline keyboard if metadata includes actions
      ...(metadata?.inlineKeyboard ? {
        reply_markup: {
          inline_keyboard: metadata.inlineKeyboard,
        },
      } : {}),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Telegram API error: ${response.status} — ${error}`);
  }
}

/**
 * Send a photo to the owner's Telegram chat (for sandbox screenshots).
 */
export async function sendTelegramPhoto(
  photoUrl: string,
  caption?: string,
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;

  const { prisma } = await import('../prisma');
  const connection = await prisma.integrationConnection.findFirst({
    where: {
      provider: 'telegram',
      status: { in: ['connected', 'live_verified'] },
    },
    select: { externalId: true },
  });

  if (!connection?.externalId) return;

  await fetch(`${TELEGRAM_API}/sendPhoto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: connection.externalId,
      photo: photoUrl,
      caption: caption || '',
      parse_mode: 'Markdown',
    }),
  });
}
