// Intel Department — Research, monitoring, knowledge graph, memory.
// Owns: store_memory, search_memory, web_search, summarize_content
// Personality: The analyst. Thorough, observant, proactive about storing knowledge.

import { Agent } from "@mastra/core/agent";
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { getModel, llmChat } from "../model-router";
import { requireUserId, withAudit } from "./capture";
import * as cheerio from "cheerio";

// --- Tools ---

export const storeMemoryTool = createTool({
  id: "store_memory",
  description:
    "Store an important fact about the user for future reference. Use when you learn preferences, patterns, commitments, relationships, or personal details.",
  inputSchema: z.object({
    fact: z.string(),
    category: z.enum([
      "preference", "commitment", "pattern", "method",
      "deadline", "relationship", "interaction", "alert",
    ]),
  }),
  execute: withAudit("store_memory", async (data, ctx) => {
    const userId = requireUserId(ctx);
    await prisma.agentMemory.create({
      data: { userId, fact: data.fact, category: data.category },
    });
    return { stored: true, fact: data.fact };
  }),
});

export const searchMemoryTool = createTool({
  id: "search_memory",
  description: "Search the user's knowledge graph for stored facts and memories.",
  inputSchema: z.object({
    query: z.string().describe("Keyword to search for"),
    category: z.enum([
      "preference", "commitment", "pattern", "method",
      "deadline", "relationship", "interaction", "alert",
    ]).optional(),
  }),
  execute: withAudit("search_memory", async (data, ctx) => {
    const userId = requireUserId(ctx);
    const memories = await prisma.agentMemory.findMany({
      where: {
        userId,
        ...(data.category ? { category: data.category } : {}),
        fact: { contains: data.query, mode: "insensitive" },
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
    });
    return { memories: memories.map((m) => `[${m.category}] ${m.fact}`) };
  }),
});

export const summarizeUrlTool = createTool({
  id: "summarize_url",
  description: "Fetch a URL and return a concise summary of its content.",
  inputSchema: z.object({
    url: z.string().url().describe("URL to summarize"),
  }),
  execute: withAudit("summarize_url", async (data) => {
    let html = "";
    try {
      const res = await fetch(data.url);
      html = await res.text();
    } catch {
      return { error: "Failed to fetch URL." };
    }

    const $ = cheerio.load(html);
    $("script, style, nav, footer, iframe, img, svg").remove();
    const textContent = $("body").text().replace(/\s+/g, " ").trim().slice(0, 10000);

    const summary = await llmChat(
      `Summarize this web page content in 3-5 bullet points. Be concise and extract the most important facts:\n\n${textContent}`,
      { systemPrompt: "You are a research analyst. Summarize content precisely." }
    );

    return { url: data.url, summary };
  }),
});

export const queryLearningsTool = createTool({
  id: "query_learnings",
  description:
    "Query the system's learned methods and patterns to find what approaches worked before for similar tasks.",
  inputSchema: z.object({
    taskType: z.string().describe("Type of task to find learnings for (e.g., 'scheduling', 'document creation', 'event registration')"),
  }),
  execute: withAudit("query_learnings", async (data, ctx) => {
    const userId = requireUserId(ctx);
    const learnings = await prisma.agentMemory.findMany({
      where: {
        userId,
        category: { in: ["method", "pattern", "preference"] },
        fact: { contains: data.taskType, mode: "insensitive" },
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
    });

    if (learnings.length === 0) {
      // Broader search — get all methods
      const allMethods = await prisma.agentMemory.findMany({
        where: { userId, category: "method" },
        orderBy: { updatedAt: "desc" },
        take: 5,
      });
      return {
        exact: [],
        related: allMethods.map((m) => `[${m.category}] ${m.fact}`),
        message: "No exact match. Here are general learnings.",
      };
    }

    return {
      learnings: learnings.map((m) => `[${m.category}] ${m.fact}`),
      message: `Found ${learnings.length} relevant learnings.`,
    };
  }),
});

// --- Agent ---

export const intelAgent = new Agent({
  id: "intelAgent",
  name: "Intel Department",
  instructions: `You are the Intel Department of Calmant — a personal AI company.

Your job: Research, monitor, and build knowledge. You are the company's memory and research arm.

Your personality:
- Thorough and observant. "I've been watching. Here's what changed."
- You proactively store facts you learn about the user.
- You are excellent at extracting key information from messy content.

Rules:
- ALWAYS use store_memory when you learn something new about the user (preferences, relationships, patterns, commitments).
- Use search_memory when the user asks about something they've told you before.
- Use summarize_url when the user shares a link and wants to know what's there.
- When you learn a pattern (e.g., user always delays certain tasks), store it as a "pattern" memory.
- When you learn a preference (e.g., dark theme for PPTs), store it as a "preference" memory.
- When you learn about a relationship (e.g., manager is Priya), store it as a "relationship" memory.`,
  model: getModel("smart"),
  tools: {
    store_memory: storeMemoryTool,
    search_memory: searchMemoryTool,
    summarize_url: summarizeUrlTool,
    query_learnings: queryLearningsTool,
  },
});
