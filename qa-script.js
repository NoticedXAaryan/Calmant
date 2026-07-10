const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function runQA() {
  console.log('Starting Visual QA...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  
  // Desktop
  const desktopPage = await context.newPage();
  await desktopPage.setViewportSize({ width: 1280, height: 800 });
  await desktopPage.goto('http://localhost:3000/login');
  await desktopPage.waitForTimeout(2000); // allow hydration/animations
  
  const screenshotsDir = path.join(__dirname, 'qa-screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir);
  }
  
  await desktopPage.screenshot({ path: path.join(screenshotsDir, 'desktop-login.png') });
  console.log('Desktop screenshot saved.');
  
  // Mobile
  const mobilePage = await context.newPage();
  await mobilePage.setViewportSize({ width: 375, height: 667 });
  await mobilePage.goto('http://localhost:3000/login');
  await mobilePage.waitForTimeout(2000);
  await mobilePage.screenshot({ path: path.join(screenshotsDir, 'mobile-login.png') });
  console.log('Mobile screenshot saved.');
  
  await browser.close();
  console.log('Visual QA complete.');
}

runQA().catch(console.error);
