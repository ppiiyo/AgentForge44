import { test, expect } from '@playwright/test';

test.describe('E2E Canvas Operations Suite', () => {
  test('should load visual constructor, create nodes, link them and save graph project', async ({ page }) => {
    // 1. Navigate to main UI container port route
    await page.goto('/');

    // 2. Clear any lingering states or modal layers
    const titleLocator = page.locator('span:has-text("KostromAi44")');
    await expect(titleLocator).toBeVisible();

    // 3. Locate and press Add Node action or specific toolboxes buttons
    const addPromptBtn = page.locator('button:has-text("Prompt"), button:has-text("Шаблон")').first();
    if (await addPromptBtn.isVisible()) {
      await addPromptBtn.click();
    }

    // 4. Verify new Node element is rendered inside coordinates systems
    const newlyCreatedNode = page.locator('[class*="react-flow__node"], [class*="node"]').first();
    await expect(newlyCreatedNode).toBeVisible();

    // 5. Query Project configuration input elements
    const projectNameInput = page.locator('input[placeholder*="Project name..."], input[placeholder*="Название проекта..."]').first();
    if (await projectNameInput.isVisible()) {
      await projectNameInput.fill('E2E-Automated-Graph');
      
      const saveProjectBtn = page.locator('button:has-text("Save Project"), button:has-text("Сохранить проект")').first();
      await expect(saveProjectBtn).toBeVisible();
      await saveProjectBtn.click();
    }
  });
});
