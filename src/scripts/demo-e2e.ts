import { prisma } from "../lib/prisma";
import { TelegramUpdateRouter } from "../lib/telegram/update-router";

async function runDemo() {
  console.log("=== Running End-To-End Demo ===");

  // 1. Setup a dummy user and telegram connection if not exists
  const user = await prisma.user.upsert({
    where: { email: "demo@example.com" },
    update: {},
    create: {
      email: "demo@example.com",
      name: "Demo User",
    }
  });

  const connection = await prisma.integrationConnection.upsert({
    where: {
      userId_provider: {
        userId: user.id,
        provider: "telegram"
      }
    },
    update: { userId: user.id },
    create: {
      userId: user.id,
      provider: "telegram",
      externalId: "12345",
      status: "live_verified"
    }
  });

  console.log("1. User setup complete");

  // 2. Simulate Telegram Message: "Apply to 5 AI internships this week."
  console.log("2. Simulating Telegram message...");
  // We mock the bot inside update router by not actually calling Telegram API, or we can just call the router.
  // Actually, sending a message directly to TelegramUpdateRouter might trigger real Telegram API calls for the reply.
  // We'll just call the CommandCenterService directly to create the goal, as if the Intent Router parsed it correctly.
  
  const intentAction = "create_goal";
  console.log("Intent routed:", intentAction);

  if (intentAction === "create_goal") {
    const { CommandCenterService } = await import("../lib/services/command-center-service");
    const { goal, projectCell } = await CommandCenterService.createObjective(user.id, "Apply to AI Internships", "Apply to 5 AI internships this week.");
    console.log("Goal created:", goal.id);
    console.log("Project Cell created:", projectCell.id);
    
    // Create some dummy tasks to represent the planning phase
    await prisma.projectTask.createMany({
      data: [
        {
          projectCellId: projectCell.id,
          title: "search_internships",
          description: "Find 5 AI internships",
          status: "completed"
        },
        {
          projectCellId: projectCell.id,
          title: "submit_application",
          description: "Submit application to OpenAI",
          status: "pending"
        }
      ]
    });
    
    console.log("Tasks created.");

    // Trigger an approval request to simulate risk gating
    const { ApprovalService } = await import("../lib/agent-runtime/approval-service");
    
    // Create a dummy tool call and agent run
    const agentRun = await prisma.agentRun.create({
      data: {
        userId: user.id,
        projectCellId: projectCell.id,
        prompt: "Submit application",
        status: "running"
      }
    });

    const toolCall = await prisma.toolCall.create({
      data: {
        runId: agentRun.id,
        toolName: "browser_action",
        args: { action: "submit", selector: "#submit-btn" },
        status: "pending"
      }
    });

    const approvalId = await ApprovalService.createApproval(toolCall.id);
    console.log("Approval requested for submission. ID:", approvalId);
    
    // Generate Evening Report
    const { ReportService } = await import("../lib/services/report-service");
    // We mock TelegramService.sendMessage so it doesn't fail
    const { TelegramService } = await import("../lib/services/telegram-service");
    TelegramService.sendMessage = async (userId: string, text: string) => {
      console.log("[Mock Telegram] Sending message:", text);
    };

    const report = await ReportService.generateEveningReport(user.id);
    console.log("Evening report generated:", report.id);
  }

  console.log("=== Demo Complete ===");
  process.exit(0);
}

runDemo().catch(console.error);
