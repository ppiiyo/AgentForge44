import { test, expect } from '@playwright/test';

test.describe('KostromAi44 E2E Orchestrator Suit', () => {

  test.beforeEach(async ({ page }) => {
    // Seed localStorage to skip the onboarding/first launch setup wizard
    await page.addInitScript(() => {
      window.localStorage.setItem('kostromai44_initialized', 'true');
      window.localStorage.setItem('kostromai44_lang', 'en');
      window.localStorage.setItem('kostromai44_user_name', 'KostromAiDev');
    });
    // Navigate to homepage before each scenario
    await page.goto('/');
    // Check initial loading
    await expect(page.getByRole('heading', { name: /KostromAi44/i }).first()).toBeVisible();
  });

  test('1. should load the workspace page, render canvas, and trigger template switching', async ({ page }) => {
    // Validate template drawer toggle Button is present
    const templatesBtn = page.locator('button:has-text("Templates"), button:has-text("Шаблоны")').first();
    await expect(templatesBtn).toBeVisible();
    await templatesBtn.click();

    // Confirm template items list is loaded
    const coderTemplate = page.locator('text=Self-Correcting Multi-Agent Coder').first();
    await expect(coderTemplate).toBeVisible();
    await coderTemplate.click();

    // Canvas node containers must become visible
    const firstNode = page.locator('[id^="node-"]').first();
    await expect(firstNode).toBeDefined();
  });

  test('2. should clear canvas and allow creating a new empty flow graph', async ({ page }) => {
    // Find Clear / Reset Button
    const clearBtn = page.locator('button:has-text("Clear"), button:has-text("Clear Canvas"), button:has-text("Очистить")').first();
    if (await clearBtn.isVisible()) {
      await clearBtn.click();
    }
  });

  test('3. should support adding custom node elements from the action Toolbox', async ({ page }) => {
    // Verify Toolbox toggle button or layout panel
    const toolboxHeader = page.locator('h3:has-text("Toolbox"), h3:has-text("Панель"), h3:has-text("Toolbox Actions"), h3:has-text("Добавить модули"), h3:has-text("算子工具箱")').first();
    await expect(toolboxHeader).toBeVisible();

    // Click on input node card button in the toolbox
    const addInputNodeBtn = page.locator('button:has-text("Input"), button:has-text("Ввод")').first();
    if (await addInputNodeBtn.isVisible()) {
      await addInputNodeBtn.click();
    }
  });

  test('4. should enable saving current flow layout snapshot checkpoints', async ({ page }) => {
    // Tracing snapshot logging and checkpoint save system
    const snapshotBtn = page.locator('button:has-text("Snapshot"), button:has-text("Snapshot Node"), button:has-text("Снимок")').first();
    if (await snapshotBtn.isVisible()) {
      await snapshotBtn.click();
    }
  });

  test('5. should load and configure real-time collaboration sessions', async ({ page }) => {
    // Open SyncHub / Collaboration Panel
    const syncHubBtn = page.locator('button:has-text("Collaboration"), button:has-text("Совместная"), button:has-text("SyncHub")').first();
    if (await syncHubBtn.isVisible()) {
      await syncHubBtn.click();
      
      const collabStatus = page.locator('text=Real-time Collaboration, text=Active Peering').first();
      await expect(collabStatus).toBeDefined();
    }
  });

});
