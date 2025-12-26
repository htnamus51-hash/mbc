import { test, expect } from '@playwright/test';

// Basic E2E skeleton: requires Playwright installation to run.

test('create group and send message (smoke)', async ({ page }) => {
  // This test assumes the app is running locally on http://localhost:5173 or similar.
  // Adjust base URL as needed in Playwright config or before running.
  await page.goto('http://localhost:5173');

  // Open New Message modal
  await page.click('button:has-text("New Message")');

  // Search users (this depends on seeded users in the backend)
  await page.fill('input[placeholder="Search users by email or name..."]', 'doctor');
  await page.waitForTimeout(500);

  // Select first two results checkboxes (if present)
  const checkboxes = await page.$$('input[type=checkbox]');
  if (checkboxes.length >= 2) {
    await checkboxes[0].check();
    await checkboxes[1].check();
  }

  // Enter group name
  await page.fill('input[placeholder="Group name (optional)"]', 'E2E Test Group');

  // Click Create Group
  await page.click('button:has-text("Create Group")');

  // Wait briefly and assert that a conversation with name appears
  await page.waitForTimeout(1000);
  const conv = await page.$(`text=E2E Test Group`);
  expect(conv).not.toBeNull();

  // Open the group and send a message (depends on app state)
  await conv?.click();
  await page.fill('textarea[placeholder="Type your message..."]', 'Hello from E2E');
  await page.click('button:has-text("Send")');

  // Check that the message appears in the chat
  await page.waitForTimeout(500);
  const sent = await page.$('text=Hello from E2E');
  expect(sent).not.toBeNull();
});
