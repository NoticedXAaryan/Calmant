const GRAPH_API_VERSION = "v18.0";
const GRAPH_API_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

/**
 * Downloads a media file (like a voice note) from the WhatsApp Cloud API.
 * The Meta API requires two steps:
 * 1. GET the media URL using the media ID.
 * 2. GET the binary data from that URL using the Bearer token.
 */
export async function downloadWhatsAppMedia(mediaId: string): Promise<Buffer> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!accessToken) throw new Error("WHATSAPP_ACCESS_TOKEN not set");

  // Step 1: Get the URL
  const urlRes = await fetch(`${GRAPH_API_URL}/${mediaId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  
  if (!urlRes.ok) {
    const err = await urlRes.text();
    throw new Error(`Failed to get media URL: ${err}`);
  }
  
  const { url } = await urlRes.json();

  // Step 2: Download the binary data
  const mediaRes = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!mediaRes.ok) {
    const err = await mediaRes.text();
    throw new Error(`Failed to download media bytes: ${err}`);
  }

  const arrayBuffer = await mediaRes.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Sends a text message back to the user via the WhatsApp Cloud API.
 */
export async function sendWhatsAppMessage(toPhone: string, text: string): Promise<void> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_ID;

  if (!accessToken || !phoneNumberId) {
    throw new Error("WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_ID not set");
  }

  const res = await fetch(`${GRAPH_API_URL}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: toPhone,
      text: { body: text },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[WhatsApp Meta] Failed to send message:", err);
  }
}
