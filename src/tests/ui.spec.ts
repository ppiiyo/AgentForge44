import { test, expect } from '@playwright/test';

test.describe('AgentForge44 Visual Orchestrator Canvas Suite', () => {
  test('should load the workspace page, render canvas, and trigger template switching', async ({ page }) => {
    // Navigate to local port container proxy
    await page.goto('/');

    // 1. Verify title elements are rendered accurately
    const mainTitle = page.locator('span:has-text("AgentForge44")');
    await expect(mainTitle).toBeVisible();

    // 2. Validate template drawer visibility
    const templatesBtn = page.locator('button:has-text("Templates"), button:has-text("Шаблоны")').first();
    await expect(templatesBtn).toBeVisible();
    await templatesBtn.click();

    // 3. Confirm built-in workflow items list successfully loaded
    const coderTemplate = page.locator('text=Self-Correcting Multi-Agent Coder').first();
    await expect(coderTemplate).toBeVisible();
    await coderTemplate.click();

    // 4. Trace presence of standard interactive node wrappers on canvas
    const nodeInput = page.locator('[id="node-input"]');
    await expect(nodeInput).toBeVisible();

    const nodeReviewer = page.locator('[id="node-reviewer"]');
    await expect(nodeReviewer).toBeVisible();

    // 5. Test execution click triggering
    const playBtn = page.locator('button:has-text("Execute"), button:has-text("Запустить")').first();
    await expect(playBtn).toBeVisible();
  });
});
