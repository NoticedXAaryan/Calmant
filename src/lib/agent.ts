export async function agentReply(message: string, userId: string): Promise<string> {
  const url = process.env.HERMES_URL || "http://hermes:8000";
  try {
    const res = await fetch(`${url}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, userId }),
    });
    
    if (!res.ok) {
      console.error("[agentReply] Hermes HTTP error:", res.status, res.statusText);
      return "I'm having a little trouble connecting to my brain right now. Try again in a moment!";
    }
    
    const data = await res.json();
    return data.response;
  } catch (err) {
    console.error("[agentReply] Error calling Hermes:", err);
    return "I'm having a little trouble connecting to my brain right now. Try again in a moment!";
  }
}
