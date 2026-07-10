export class ApprovalRequiredError extends Error {
  constructor(public toolCallId: string, public toolName: string, message?: string) {
    super(message || `Tool ${toolName} requires user approval (ToolCall ID: ${toolCallId})`);
    this.name = 'ApprovalRequiredError';
  }
}
