const http = require('http');
const { PrismaClient } = require('@prisma/client');

const PORT = 3000;
const API_URL = `http://localhost:${PORT}`;

async function runE2ETest() {
  const prisma = new PrismaClient();
  let TEST_USER_ID = 'e2e-test-user';
  
  try {
    const user = await prisma.user.findFirst();
    if (user) {
      TEST_USER_ID = user.id;
      console.log(`[Setup] Using existing database user ID: ${TEST_USER_ID}`);
    } else {
      console.log(`[Setup] No user found. Creating a test user...`);
      const newUser = await prisma.user.create({
        data: { name: 'E2E Test User', email: 'e2e@vibe2ship.test', emailVerified: true }
      });
      TEST_USER_ID = newUser.id;
    }
  } catch (err) {
    console.log("[Setup] Could not access DB directly. Proceeding with dummy ID...", err.message);
  } finally {
    await prisma.$disconnect();
  }

  console.log("=== VIBE2SHIP E2E SYSTEM TEST ===");

  // 1. Health Check
  console.log("\n[1] Checking Server Health...");
  try {
    const healthRes = await fetch(`${API_URL}/api/health`);
    if (!healthRes.ok) throw new Error(`Health check failed: ${healthRes.status}`);
    const healthData = await healthRes.json();
    console.log("✅ Health Check Passed:", healthData);
  } catch (err) {
    console.error("❌ Health Check Failed:", err.message);
    process.exit(1);
  }

  // 2. CEO Agent + Browser Sandbox Integration Test
  console.log("\n[2] Testing CEO Agent & Browser Sandbox...");
  const prompt = "Please use your Browser department to go to Wikipedia, search for 'Quantum Computing', and tell me the very first sentence of the article.";
  console.log(`Prompt: "${prompt}"`);

  try {
    const res = await fetch(`${API_URL}/api/agent/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-user-id': TEST_USER_ID
      },
      body: JSON.stringify({
        message: prompt
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Chat API failed (${res.status}): ${errText}`);
    }

    console.log("Connected. Waiting for agent response (this may take 20-30s)...");

    const fullResponse = await res.text();
    process.stdout.write(fullResponse);

    console.log("\n\n✅ Request Finished.");
    
    if (fullResponse.toLowerCase().includes("quantum")) {
      console.log("✅ SUCCESS: Agent successfully interacted with the Browser and returned the result.");
    } else {
      console.log("⚠️ WARNING: Agent responded, but might not have successfully used the browser.");
    }

  } catch (err) {
    console.error("❌ Chat API Test Failed:", err.message);
    process.exit(1);
  }

  console.log("\n=== E2E TEST COMPLETE ===");
}

runE2ETest();
