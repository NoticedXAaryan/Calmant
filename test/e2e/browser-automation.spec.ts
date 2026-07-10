import { test, expect } from '@playwright/test';
import { BrowserSessionService } from '../../src/lib/services/browser-session-service';

test.describe('Browser Automation Pipeline Smoke Test', () => {
  // We need to ensure we don't conflict with global instances, 
  // but for a smoke test we can just start and stop a session.
  
  test('should successfully launch a browser session, navigate, and close', async () => {
    // 1. Start session
    const userId = "test-user-123";
    const runId = "test-run-456";
    const sessionId = await BrowserSessionService.startSession(userId, runId);
    
    expect(sessionId).toBeTruthy();
    
    // 2. Get active session
    const session = BrowserSessionService.getActiveSession(sessionId);
    expect(session).toBeDefined();
    expect(session?.page).toBeDefined();
    
    // 3. Navigate to a safe test URL
    if (session) {
      const response = await session.page.goto('https://example.com');
      expect(response?.ok()).toBeTruthy();
      
      const title = await session.page.title();
      expect(title).toBe('Example Domain');
    }
    
    // 4. Close session
    await BrowserSessionService.closeSession(sessionId);
    const closedSession = BrowserSessionService.getActiveSession(sessionId);
    expect(closedSession).toBeUndefined();
  });
});
