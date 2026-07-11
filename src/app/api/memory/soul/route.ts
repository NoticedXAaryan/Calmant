import { NextResponse } from "next/server";
import { z } from "zod";
import { SoulReader } from "@/lib/memory/soul-reader";
import { SoulWriter } from "@/lib/memory/soul-writer";
import { MemoryManager } from "@/lib/memory/memory-manager";

/**
 * GET /api/memory/soul — Read the full soul snapshot
 */
export async function GET() {
  try {
    const snapshot = SoulReader.readSnapshot();
    const isOnboarded = SoulReader.isOnboarded();

    return NextResponse.json({
      snapshot: {
        identity: snapshot.identity,
        memory: snapshot.memory,
        skills: snapshot.skills,
        goals: snapshot.goals,
      },
      raw: snapshot.raw,
      isOnboarded,
    });
  } catch (err: any) {
    console.error("[API:memory/soul] Error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

const AddMemorySchema = z.object({
  content: z.string(),
  category: z.enum([
    'identity', 'preferences', 'projects', 'skills',
    'relationships', 'patterns', 'corrections',
  ]),
  confidence: z.number().min(0).max(1).optional(),
  source: z.string().optional(),
});

const CorrectMemorySchema = z.object({
  originalContent: z.string(),
  correction: z.string(),
});

const UpdateSoulSchema = z.object({
  section: z.enum(['Owner Context', 'Personality Traits', 'Communication Style']),
  content: z.string(),
});

/**
 * POST /api/memory/soul — Add memory, correct memory, or update soul section
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const action = body.action;

    switch (action) {
      case 'add_memory': {
        const { content, category, confidence, source } = AddMemorySchema.parse(body);
        const result = await MemoryManager.addMemory({
          content,
          category,
          confidence,
          source: source || 'owner_manual',
        });
        return NextResponse.json({ success: true, result });
      }

      case 'correct_memory': {
        const { originalContent, correction } = CorrectMemorySchema.parse(body);
        await MemoryManager.correctMemory(originalContent, correction);
        return NextResponse.json({ success: true });
      }

      case 'update_soul': {
        const { section, content } = UpdateSoulSchema.parse(body);
        const result = SoulWriter.updateSoulSection({ section, content });
        return NextResponse.json({ success: true, result });
      }

      case 'consolidate': {
        const result = await MemoryManager.consolidate();
        return NextResponse.json({ success: true, result });
      }

      case 'search': {
        const query = z.string().parse(body.query);
        const results = await MemoryManager.searchMemory(query);
        return NextResponse.json({ success: true, results });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (err: any) {
    console.error("[API:memory/soul] POST Error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
