import { z } from "zod";
import { ToolContext } from "./registry";

export const tavilySearchSchema = z.object({
  query: z.string().describe("The search query to execute"),
  search_depth: z.enum(["basic", "advanced"]).optional().default("basic").describe("The depth of the search"),
});

export const firecrawlSchema = z.object({
  url: z.string().url().describe("The URL to crawl and scrape"),
});

export async function executeTavilySearch(args: z.infer<typeof tavilySearchSchema>, context: ToolContext) {
  const apiKey = context.env.TAVILY_API_KEY || process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error("TAVILY_API_KEY is not set in environment");
  }
  
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query: args.query,
      search_depth: args.search_depth,
      include_answer: true,
    })
  });
  
  if (!res.ok) {
    throw new Error(`Tavily search failed: ${res.statusText} ${await res.text()}`);
  }
  
  return await res.json();
}

export async function executeFirecrawl(args: z.infer<typeof firecrawlSchema>, context: ToolContext) {
  const apiKey = context.env.FIRECRAWL_API_KEY || process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    throw new Error("FIRECRAWL_API_KEY is not set in environment");
  }
  
  const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      url: args.url,
      formats: ["markdown"]
    })
  });
  
  if (!res.ok) {
    throw new Error(`Firecrawl scrape failed: ${res.statusText} ${await res.text()}`);
  }
  
  const data = await res.json();
  if (!data.success) {
    throw new Error(`Firecrawl API error: ${data.error || "Unknown error"}`);
  }
  
  return data;
}
