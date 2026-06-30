// Calmant Browser Sandbox — HTTP API server for autonomous web automation
// Runs inside a Docker container with Playwright pre-installed.
// The Browser Department agent calls these endpoints to navigate, interact, and screenshot.

const express = require("express");
const { chromium } = require("playwright");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const path = require("path");
const http = require("http");
const WebSocket = require("ws");

const app = express();
app.use(express.json({ limit: "10mb" }));

const PORT = process.env.PORT || 4000;
const ARTIFACTS_DIR = process.env.ARTIFACTS_DIR || path.join(__dirname, "artifacts");
const SESSION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minute timeout per session
const MAX_SESSIONS = 5; // Max concurrent sessions

// Ensure artifacts directory exists
if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

// --- Session Manager ---

let browser = null;
const sessions = new Map(); // sessionId -> { context, page, createdAt, timeoutTimer }

async function getBrowser() {
  if (!browser || !browser.isConnected()) {
    browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });
    console.log("[Sandbox] Browser launched");
  }
  return browser;
}

function cleanupSession(sessionId) {
  const session = sessions.get(sessionId);
  if (session) {
    clearTimeout(session.timeoutTimer);
    if (session.cdpClient) {
      session.cdpClient.detach().catch(() => {});
    }
    session.context.close().catch(() => {});
    sessions.delete(sessionId);
    console.log(`[Sandbox] Session ${sessionId} cleaned up. Active: ${sessions.size}`);
  }
}

// Auto-cleanup stale sessions
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.createdAt > SESSION_TIMEOUT_MS) {
      console.log(`[Sandbox] Session ${id} timed out`);
      cleanupSession(id);
    }
  }
}, 30000);

// --- Health Check ---

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    activeSessions: sessions.size,
    maxSessions: MAX_SESSIONS,
    uptime: process.uptime(),
  });
});

app.get("/sessions/active", (req, res) => {
  const activeIds = [...sessions.keys()];
  res.json({ active: activeIds.length > 0, sessionId: activeIds[0] || null });
});

// --- Create Session ---

app.post("/session", async (req, res) => {
  try {
    if (sessions.size >= MAX_SESSIONS) {
      // Kill the oldest session
      const oldest = [...sessions.entries()].sort((a, b) => a[1].createdAt - b[1].createdAt)[0];
      if (oldest) cleanupSession(oldest[0]);
    }

    const b = await getBrowser();
    const context = await b.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    });
    const page = await context.newPage();
    const sessionId = uuidv4();

    const timeoutTimer = setTimeout(() => cleanupSession(sessionId), SESSION_TIMEOUT_MS);

    sessions.set(sessionId, {
      context,
      page,
      createdAt: Date.now(),
      timeoutTimer,
    });

    console.log(`[Sandbox] Session ${sessionId} created. Active: ${sessions.size}`);
    res.json({ sessionId, status: "created" });
  } catch (err) {
    console.error("[Sandbox] Session creation failed:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// --- Navigate ---

app.post("/session/:id/navigate", async (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) return res.status(404).json({ error: "Session not found" });

  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "URL is required" });

  try {
    await session.page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    const title = await session.page.title();
    const pageUrl = session.page.url();

    // Extract visible text
    const text = await session.page.evaluate(() => {
      const el = document.body;
      if (!el) return "";
      // Remove scripts, styles, nav, footer
      const clone = el.cloneNode(true);
      clone.querySelectorAll("script, style, nav, footer, iframe, svg").forEach((e) => e.remove());
      return clone.innerText.replace(/\s+/g, " ").trim().slice(0, 15000);
    });

    res.json({ title, url: pageUrl, textLength: text.length, text });
  } catch (err) {
    res.status(500).json({ error: `Navigation failed: ${err.message}` });
  }
});

// --- Screenshot ---

app.post("/session/:id/screenshot", async (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) return res.status(404).json({ error: "Session not found" });

  try {
    const filename = `screenshot_${Date.now()}.png`;
    const filepath = path.join(ARTIFACTS_DIR, filename);
    const body = req.body || {};
    await session.page.screenshot({ path: filepath, fullPage: body.fullPage || false });

    res.json({ filename, filepath, url: `/artifacts/${filename}` });
  } catch (err) {
    res.status(500).json({ error: `Screenshot failed: ${err.message}` });
  }
});

// --- Act (click, type, select) ---

app.post("/session/:id/act", async (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) return res.status(404).json({ error: "Session not found" });

  const { action, selector, value } = req.body;
  if (!action) return res.status(400).json({ error: "Action is required" });

  try {
    switch (action) {
      case "click":
        await session.page.click(selector, { timeout: 10000 });
        break;
      case "type":
        await session.page.fill(selector, value || "", { timeout: 10000 });
        break;
      case "select":
        await session.page.selectOption(selector, value || "", { timeout: 10000 });
        break;
      case "scroll":
        await session.page.evaluate((px) => window.scrollBy(0, px), value || 500);
        break;
      case "wait":
        await session.page.waitForTimeout(Math.min(value || 1000, 5000));
        break;
      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }

    // Brief wait for page to settle
    await session.page.waitForTimeout(500);

    const url = session.page.url();
    const title = await session.page.title();
    res.json({ success: true, action, url, title });
  } catch (err) {
    res.status(500).json({ error: `Action '${action}' failed: ${err.message}` });
  }
});

// --- Extract structured data ---

app.post("/session/:id/extract", async (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) return res.status(404).json({ error: "Session not found" });

  try {
    const data = await session.page.evaluate(() => {
      // Extract form fields
      const forms = [];
      document.querySelectorAll("form").forEach((form) => {
        const fields = [];
        form.querySelectorAll("input, select, textarea").forEach((el) => {
          fields.push({
            type: el.tagName.toLowerCase(),
            name: el.name || el.id || "",
            inputType: el.type || "",
            value: el.value || "",
            placeholder: el.placeholder || "",
            required: el.required || false,
          });
        });
        forms.push({ action: form.action, method: form.method, fields });
      });

      // Extract links
      const links = [];
      document.querySelectorAll("a[href]").forEach((a) => {
        if (a.textContent.trim()) {
          links.push({ text: a.textContent.trim().slice(0, 100), href: a.href });
        }
      });

      // Extract main text
      const clone = document.body.cloneNode(true);
      clone.querySelectorAll("script, style, nav, footer").forEach((e) => e.remove());
      const text = clone.innerText.replace(/\s+/g, " ").trim().slice(0, 10000);

      return {
        title: document.title,
        url: window.location.href,
        forms: forms.slice(0, 5),
        links: links.slice(0, 20),
        text,
      };
    });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: `Extraction failed: ${err.message}` });
  }
});

// --- Close Session ---

app.delete("/session/:id", (req, res) => {
  const sessionId = req.params.id;
  if (!sessions.has(sessionId)) {
    return res.status(404).json({ error: "Session not found" });
  }
  cleanupSession(sessionId);
  res.json({ status: "closed" });
});

// --- Serve Artifacts ---

app.use("/artifacts", express.static(ARTIFACTS_DIR));

// --- WebSocket & Server ---

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      if (data.action === "subscribe") {
        const targetSessionId = data.sessionId || [...sessions.keys()][0];
        if (!targetSessionId || !sessions.has(targetSessionId)) {
          ws.send(JSON.stringify({ type: 'status', status: 'idle', message: 'No active session' }));
          return;
        }

        const session = sessions.get(targetSessionId);
        
        if (!session.cdpClient) {
          session.cdpClient = await session.page.context().newCDPSession(session.page);
          session.wsClients = new Set();
          
          session.cdpClient.on('Page.screencastFrame', (frameObj) => {
             const payload = JSON.stringify({ type: 'frame', data: frameObj.data });
             for (const client of session.wsClients) {
                if (client.readyState === WebSocket.OPEN) {
                   client.send(payload);
                }
             }
             session.cdpClient.send('Page.screencastFrameAck', { sessionId: frameObj.sessionId }).catch(()=>{});
          });
          
          await session.cdpClient.send('Page.startScreencast', { format: 'jpeg', quality: 50, everyNthFrame: 1 });
        }
        
        session.wsClients.add(ws);
        ws.send(JSON.stringify({ type: 'status', status: 'live', sessionId: targetSessionId }));
        
        ws.on('close', () => {
          session.wsClients?.delete(ws);
          if (session.wsClients?.size === 0 && session.cdpClient) {
             session.cdpClient.send('Page.stopScreencast').catch(()=>{});
             session.cdpClient.detach().catch(()=>{});
             session.cdpClient = null;
          }
        });
      }
    } catch(err) {
      console.error("[Sandbox] WS error", err);
    }
  });
});

server.listen(PORT, () => {
  console.log(`[Sandbox] Browser sandbox running on port ${PORT} (HTTP & WS)`);
  console.log(`[Sandbox] Artifacts directory: ${ARTIFACTS_DIR}`);
  console.log(`[Sandbox] Max sessions: ${MAX_SESSIONS}`);
  console.log(`[Sandbox] Session timeout: ${SESSION_TIMEOUT_MS / 1000}s`);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("[Sandbox] Shutting down...");
  for (const [id] of sessions) cleanupSession(id);
  if (browser) await browser.close();
  process.exit(0);
});
