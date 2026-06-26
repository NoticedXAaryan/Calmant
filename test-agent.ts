import { agentReply } from "./src/lib/agent";

async function main() {
  try {
    console.log("Testing agentReply...");
    const res = await agentReply("Hello", "test-user-id");
    console.log("Success:", res);
  } catch (err) {
    console.error("Error calling agentReply:", err);
  }
}

main();
