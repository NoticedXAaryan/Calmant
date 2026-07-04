import { Memory } from "mem0ai/oss";

// Configure Mem0 to use your existing PostgreSQL with pgvector
const mem0Config = {
  vectorStore: {
    provider: "pgvector" as const,
    config: {
      connectionString: process.env.DATABASE_URL || "",
      collectionName: "mem0_memories",
    },
  },
  // Use Gemini for embedding generation
  embedder: {
    provider: "gemini" as const,
    config: {
      apiKey: process.env.GEMINI_API_KEY || "",
      model: "text-embedding-004",
    },
  },
};

let memoryInstance: Memory | null = null;

export function getMemory(): Memory {
  if (!memoryInstance) {
    if (!process.env.DATABASE_URL) {
        console.warn("DATABASE_URL is missing, Mem0 may fail");
    }
    if (!process.env.GEMINI_API_KEY) {
        console.warn("GEMINI_API_KEY is missing, Mem0 may fail");
    }
    memoryInstance = new Memory(mem0Config);
  }
  return memoryInstance;
}

/**
 * Store new information from a conversation.
 * Mem0 handles deduplication and conflict resolution automatically.
 */
export async function addMemory(text: string, userId: string): Promise<void> {
  const memory = getMemory();
  await memory.add(text, { userId });
}

/**
 * Retrieve relevant memories for a query.
 * Returns semantically similar facts, not just "most recently updated".
 */
export async function searchMemory(query: string, userId: string, limit = 15): Promise<string[]> {
  const memory = getMemory();
  const searchRes = await memory.search(query, { filters: { user_id: userId }, topK: limit });
  return searchRes.results.map((r: any) => r.memory || r.text || String(r));
}

/**
 * Get all memories for a user (for context building).
 */
export async function getAllMemories(userId: string): Promise<string[]> {
  const memory = getMemory();
  const searchRes = await memory.getAll({ filters: { user_id: userId } });
  return searchRes.results.map((r: any) => r.memory || r.text || String(r));
}
