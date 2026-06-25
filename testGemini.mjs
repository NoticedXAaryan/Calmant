import { GoogleGenerativeAI } from "@google/generative-ai";

async function testGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("No API key");
    process.exit(1);
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  try {
    const result = await model.generateContent("Say hello world in exactly 3 words.");
    console.log("Success:", result.response.text());
  } catch (err) {
    console.error("Error:", err);
  }
}

testGemini();
