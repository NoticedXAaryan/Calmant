import { NextResponse } from "next/server";
import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";

const RequestSchema = z.object({
  transcripts: z.array(z.string()).min(1),
});

const PersonaSchema = z.object({
  name: z.string(),
  bio: z.string(),
  goals: z.array(z.string()),
  skills: z.array(z.string()),
  personality: z.array(z.string()),
  workStyle: z.string(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { transcripts } = RequestSchema.parse(body);

    const combinedTranscript = transcripts
      .map((t, i) => `[Answer ${i + 1}]: ${t}`)
      .join("\n\n");

    const apiKey = process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "No API key configured" },
        { status: 500 }
      );
    }

    const google = createGoogleGenerativeAI({
      apiKey,
      ...(process.env.OPENROUTER_API_KEY ? {
        baseURL: "https://openrouter.ai/api/v1",
      } : {}),
    });
    const model = google(process.env.GEMINI_MODEL_FAST || "gemini-2.5-flash");

    const { text } = await generateText({
      model,
      system: `You are an expert at understanding people from their self-introductions. 
Extract structured information from the user's voice transcripts.

Return a JSON object with these fields:
- name: string (the person's first name)
- bio: string (a 2-3 sentence professional bio written in first person)
- goals: string[] (3-5 specific goals they mentioned or implied)
- skills: string[] (3-8 skills, technologies, or domains they mentioned)
- personality: string[] (2-4 personality traits evident from their speech)
- workStyle: string (one sentence about how they work best)

Be accurate to what they said. Don't invent things they didn't mention.
Return ONLY valid JSON, no markdown fences.`,
      prompt: `Here are the user's voice responses during onboarding:\n\n${combinedTranscript}`,
    });

    // Parse the response
    let persona;
    try {
      // Strip markdown code fences if present
      const cleaned = text.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      persona = PersonaSchema.parse(JSON.parse(cleaned));
    } catch (parseErr) {
      console.error("[generate-persona] Failed to parse AI response:", text);
      // Fallback: create basic persona from transcripts
      persona = {
        name: "",
        bio: transcripts.join(" ").substring(0, 300),
        goals: [],
        skills: [],
        personality: [],
        workStyle: "",
      };
    }

    // Write to soul files (server-side)
    try {
      const { SoulWriter } = await import("@/lib/memory/soul-writer");

      if (persona.bio) {
        SoulWriter.updateSoulSection({
          section: "Owner Context",
          content: persona.bio,
        });
      }

      if (persona.personality.length > 0) {
        // These are traits about the owner, stored in memory
        const { MemoryManager } = await import("@/lib/memory/memory-manager");
        for (const trait of persona.personality) {
          await MemoryManager.addMemory({
            content: trait,
            category: "identity",
            confidence: 0.8,
            source: "voice_onboarding",
          }).catch(() => {}); // Don't fail if DB not ready
        }
      }

      if (persona.skills.length > 0) {
        const { MemoryManager } = await import("@/lib/memory/memory-manager");
        for (const skill of persona.skills) {
          await MemoryManager.addMemory({
            content: skill,
            category: "skills",
            confidence: 0.8,
            source: "voice_onboarding",
          }).catch(() => {});
        }
      }

      // Write goals to GOALS.md
      if (persona.goals.length > 0) {
        for (const goal of persona.goals) {
          SoulWriter.writeGoal({
            title: goal,
            status: "active",
            currentPhase: "ideate",
            lastUpdate: "Created during onboarding",
          });
        }
      }
    } catch (soulErr) {
      console.warn("[generate-persona] Could not write to soul files:", soulErr);
    }

    return NextResponse.json({ persona });
  } catch (err: any) {
    console.error("[generate-persona] Error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
