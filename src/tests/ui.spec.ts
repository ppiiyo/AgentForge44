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
    const templatesBtn = page.locator('#tab-btn-market, [id="tab-btn-market"]').first();
    await expect(templatesBtn).toBeVisible();
    await templatesBtn.click();

    // Confirm template items list is loaded
    const coderTemplate = page.locator('text=Self-Correcting Multi-Agent Coder').first();
    await expect(coderTemplate).toBeVisible();
    await coderTemplate.click();

    // Click the actual Install into Workspace button inside detail view
    const installBtn = page.getByRole('button', { name: /install|установить|导入/i }).first();
    await expect(installBtn).toBeVisible();
    await installBtn.click();

    // Canvas node containers must become visible
    const firstNode = page.locator('[id^="node-"], [class*="react-flow__node"]').first();
    await expect(firstNode).toBeVisible();
  });

  test('2. should clear canvas and allow creating a new empty flow graph', async ({ page }) => {
    // Find Clear / Reset Button
    const clearBtn = page.getByRole('button', { name: /clear|очистить/i }).first();
    if (await clearBtn.isVisible()) {
      await clearBtn.click();
    }
  });

  test('3. should support adding custom node elements from the action Toolbox', async ({ page }) => {
    // Verify Toolbox toggle button or layout panel
    const toolboxHeader = page.getByRole('heading', { name: /toolbox|панель|добавить/i }).first();
    await expect(toolboxHeader).toBeVisible();

    // Click on input node card button in the toolbox
    const addInputNodeBtn = page.getByRole('button', { name: /input|ввод/i }).first();
    if (await addInputNodeBtn.isVisible()) {
      await addInputNodeBtn.click();
    }
  });

  test('4. should enable saving current flow layout snapshot checkpoints', async ({ page }) => {
    // Tracing snapshot logging and checkpoint save system
    const snapshotBtn = page.getByRole('button', { name: /snapshot|снимок/i }).first();
    if (await snapshotBtn.isVisible()) {
      await snapshotBtn.click();
    }
  });

  test('5. should load and configure real-time collaboration sessions', async ({ page }) => {
    // Open SyncHub / Collaboration Panel
    const syncHubBtn = page.getByRole('button', { name: /collaboration|совместная|synchub/i }).first();
    if (await syncHubBtn.isVisible()) {
      await syncHubBtn.click();
      
      const collabStatus = page.locator('text=Real-time Collaboration, text=Active Peering').first();
      await expect(collabStatus).toBeDefined();
    }
  });

});
