import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { agentReply } from '@/lib/agent';
import { transcribeAudio } from '@/lib/audio';
import { downloadWhatsAppMedia, sendWhatsAppMessage } from '@/lib/whatsapp-meta';

// Next.js Edge Functions or Serverless configuration
export const dynamic = 'force-dynamic';

// GET - Webhook verification by Meta
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const challenge = searchParams.get('hub.challenge');
  const verifyToken = searchParams.get('hub.verify_token');

  const EXPECTED_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === 'subscribe' && verifyToken === EXPECTED_TOKEN) {
    return new Response(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}

// POST - Receive messages from Meta
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Check if it's a valid WhatsApp message payload
    if (body.object !== 'whatsapp_business_account') {
      return NextResponse.json({ status: 'ignored' }, { status: 200 });
    }

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages;
    
    // Ignore statuses (read receipts, delivery receipts, etc.)
    if (!messages || messages.length === 0) {
      return NextResponse.json({ status: 'ignored' }, { status: 200 });
    }

    const message = messages[0];
    const senderPhone = message.from; // Phone number of the user sending the message

    // Find the primary user (single-tenant assumption for hackathon)
    const user = await prisma.user.findFirst();
    if (!user) {
      console.error("[WhatsApp Meta] No user found in database.");
      return NextResponse.json({ error: 'No user' }, { status: 200 }); // Always return 200 to Meta
    }

    // Process the message asynchronously so we don't block the webhook response
    // Meta requires a 200 OK within 3 seconds, or it will retry.
    processMessage(message, senderPhone, user.id).catch((err) => {
      console.error("[WhatsApp Meta] Error processing message async:", err);
    });

    return NextResponse.json({ status: 'received' }, { status: 200 });

  } catch (error) {
    console.error("[WhatsApp Meta] Error in webhook:", error);
    // Always return 200 to prevent Meta from disabling the webhook due to retries
    return NextResponse.json({ status: 'error' }, { status: 200 });
  }
}

async function processMessage(message: any, senderPhone: string, userId: string) {
  let text = "";

  if (message.type === 'text') {
    text = message.text.body;
  } else if (message.type === 'audio') {
    // It's a voice note!
    await sendWhatsAppMessage(senderPhone, "🎤 _Transcribing voice note..._");
    
    const mediaId = message.audio.id;
    const audioBuffer = await downloadWhatsAppMedia(mediaId);
    
    text = await transcribeAudio(audioBuffer);
    await sendWhatsAppMessage(senderPhone, `🎤 *Transcription:* "${text}"\n_Processing..._`);
  } else {
    // Unsupported type
    await sendWhatsAppMessage(senderPhone, "Sorry, I only understand text and voice notes right now.");
    return;
  }

  if (!text) return;

  // Run the AI Agent
  const reply = await agentReply(text, userId);

  // Send the reply back to the user
  await sendWhatsAppMessage(senderPhone, reply);
}
