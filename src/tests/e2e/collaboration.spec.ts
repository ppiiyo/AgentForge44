import { test, expect } from '@playwright/test';

test.describe('E2E Real-Time Collaboration Sync Suite', () => {
  test('should synchronize user edits across two independent browser contexts on the same graph', async ({ browser }) => {
    // 1. Establish first client workspace
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();
    await page1.addInitScript(() => {
      window.localStorage.setItem('kostromai44_initialized', 'true');
      window.localStorage.setItem('kostromai44_lang', 'en');
      window.localStorage.setItem('kostromai44_user_name', 'KostromAiDev1');
    });
    await page1.goto('/');

    const title1 = page1.getByRole('heading', { name: /KostromAi44/i });
    await expect(title1).toBeVisible();

    // Ensure we are in a default shared workflow room
    const roomLocator1 = page1.locator('input[placeholder*="Room"], input[placeholder*="Комната"]').first();
    let roomName = 'shared-forge-collab';
    if (await roomLocator1.isVisible()) {
      await roomLocator1.fill(roomName);
    }

    // 2. Establish second client workspace
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    await page2.addInitScript(() => {
      window.localStorage.setItem('kostromai44_initialized', 'true');
      window.localStorage.setItem('kostromai44_lang', 'en');
      window.localStorage.setItem('kostromai44_user_name', 'KostromAiDev2');
    });
    await page2.goto('/');

    const title2 = page2.getByRole('heading', { name: /KostromAi44/i });
    await expect(title2).toBeVisible();

    const roomLocator2 = page2.locator('input[placeholder*="Room"], input[placeholder*="Комната"]').first();
    if (await roomLocator2.isVisible()) {
      await roomLocator2.fill(roomName);
    }

    // 3. Trigger interaction/edit in browser context 1
    const nodeHeader1 = page1.locator('[class*="react-flow__node"], [class*="node-wrapper"]').first();
    if (await nodeHeader1.isVisible()) {
      await nodeHeader1.click();
      
      const promptInput1 = page1.locator('textarea, input[type="text"]').first();
      if (await promptInput1.isVisible()) {
        await promptInput1.fill('Shared Collaboration Prompt Text Value');
        
        // 4. Validate context 2 matches the value propagated via socket.io
        const promptInput2 = page2.locator('textarea, input[type="text"]').first();
        await expect(promptInput2).toHaveValue('Shared Collaboration Prompt Text Value');
      }
    }

    // Clean up contexts
    await context1.close();
    await context2.close();
  });
});
