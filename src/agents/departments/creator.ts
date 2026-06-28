// Creator Department — Generate deliverables: documents, summaries, reports.
// Owns: generate_document, generate_summary, create_artifact
// Personality: Creative, thorough, uses knowledge graph for context.

import { Agent } from "@mastra/core/agent";
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { getModel, llmChat } from "../model-router";
import { requireUserId, withAudit } from "./capture";

// --- Tools ---

export const generateDocumentTool = createTool({
  id: "generate_document",
  description:
    "Generate a document (outline, report, essay, notes) based on a topic and user context. Returns markdown content.",
  inputSchema: z.object({
    topic: z.string().describe("What the document should be about"),
    type: z.enum(["outline", "report", "notes", "essay", "presentation_outline", "email_draft"]),
    additionalContext: z.string().optional().describe("Extra instructions or context"),
  }),
  execute: withAudit("generate_document", async (data, ctx) => {
    const userId = requireUserId(ctx);

    // Pull user preferences from knowledge graph
    const memories = await prisma.agentMemory.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 15,
    });
    const userContext = memories.map((m) => `[${m.category}] ${m.fact}`).join("\n");

    const content = await llmChat(
      `Generate a ${data.type} about: "${data.topic}"

${data.additionalContext ? `Additional instructions: ${data.additionalContext}` : ""}

User context (use this to personalize):
${userContext || "No prior context available."}

Requirements:
- Output clean markdown.
- Be thorough but concise.
- Use headers, bullet points, and structure.
- If creating a presentation_outline, use slide-by-slide format.
- If creating an email_draft, be professional and ready to send.`,
      {
        systemPrompt: `You are a professional content creator. Create high-quality, well-structured documents. Personalize based on user context when relevant.`,
      }
    );

    // Store as artifact
    const artifact = await prisma.artifact.create({
      data: {
        userId,
        type: "document",
        title: `${data.type}: ${data.topic}`,
        content,
        metadata: { topic: data.topic, docType: data.type },
      },
    });

    return {
      artifactId: artifact.id,
      type: data.type,
      topic: data.topic,
      content,
    };
  }),
});

export const generateSummaryTool = createTool({
  id: "generate_summary",
  description: "Generate a concise summary of provided text or a topic.",
  inputSchema: z.object({
    text: z.string().describe("Text to summarize, or a topic to research and summarize"),
    maxBullets: z.number().optional().describe("Max number of bullet points (default 5)"),
  }),
  execute: withAudit("generate_summary", async (data) => {
    const summary = await llmChat(
      `Summarize the following in ${data.maxBullets || 5} concise bullet points:\n\n${data.text}`,
      { systemPrompt: "You are a precise summarizer. Extract only the most important points." }
    );
    return { summary };
  }),
});

// --- Agent ---

export const creatorAgent = new Agent({
  id: "creatorAgent",
  name: "Creator Department",
  instructions: `You are the Creator Department of Calmant — a personal AI company.

Your job: Generate deliverables — documents, summaries, reports, outlines, email drafts.

Your personality:
- Creative and thorough. "Here's your document. I used your past preferences for formatting."
- You always pull from the user's knowledge graph to personalize output.
- You produce polished, ready-to-use content — not rough drafts.

Rules:
- Use generate_document for substantial content creation (outlines, reports, essays, presentation outlines, email drafts).
- Use generate_summary for quick summaries of text or topics.
- Always structure content with headers, bullet points, and clear sections.
- When creating presentation outlines, format as slide-by-slide with title + content bullets.
- When creating email drafts, make them professional and ready to copy-paste.
- Reference user preferences from memory when relevant (e.g., "User prefers dark themes for presentations").`,
  model: getModel("smart"),
  tools: {
    generate_document: generateDocumentTool,
    generate_summary: generateSummaryTool,
  },
});
