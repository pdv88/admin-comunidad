import { test, expect } from '@playwright/test';

test.describe('Admin Journey', () => {

    test.beforeEach(async ({ page }) => {
        // Mock Login
        await page.route('*/**/api/auth/login', async route => {
            await route.fulfill({
                json: {
                    token: 'admin-token',
                    user: { id: 1, email: 'admin@test.com', role: 'admin' },
                    communities: [{
                        community_id: 1,
                        name: 'Admin Community',
                        roles: [{ name: 'admin' }, { name: 'president' }]
                    }]
                }
            });
        });

        // Mock Admin Context
        await page.route('*/**/api/communities/my', async route => {
            await route.fulfill({
                json: {
                    id: 1,
                    name: 'Admin Community',
                    roles: [{ name: 'admin' }, { name: 'president' }]
                }
            });
        });

        // Perform Login
        await page.goto('/login');
        await page.fill('input[type="email"]', 'admin@test.com');
        await page.fill('input[type="password"]', 'pass');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL(/\/app\/dashboard/);
    });

    test('Can view user management list', async ({ page }) => {
        // Mock Users (Paginated structure)
        await page.route('*/**/api/users*', async route => {
            await route.fulfill({
                json: {
                    data: [{ id: 10, name: 'User A', full_name: 'User A', email: 'user.a@test.com', roles: [] }],
                    count: 1
                }
            });
        });

        // Note: If link click fails, it might be due to sidebar animation or role mismatch.
        // Try to force visibility or wait.
        await page.waitForSelector('a[href="/app/users"]', { state: 'attached' });
        await page.click('a[href="/app/users"]');
        await expect(page).toHaveURL(/\/app\/users/);
        await expect(page.getByText('User A')).toBeVisible();
    });

    test('Can create a notice', async ({ page }) => {
        // Mock Notices
        await page.route('*/**/api/notices', async route => {
            if (route.request().method() === 'GET') {
                await route.fulfill({ json: [] });
            } else if (route.request().method() === 'POST') {
                await route.fulfill({ json: { success: true } });
            }
        });

        await page.route('*/**/api/properties/blocks', async route => route.fulfill({ json: [] }));

        await page.click('a[href="/app/notices"]');

        // Use specific button selector to avoid matching page title
        await page.getByRole('button', { name: /Post Notice|Publicar|Create|Crear|New|Nuevo/i }).first().click();

        // Fill form inside the modal
        const modal = page.locator('form');
        await expect(modal).toBeVisible(); // Wait for animation

        // Using simple input type selectors as we are inside the form context
        await modal.locator('input[type="text"]').first().fill('Test E2E Notice');
        await modal.locator('textarea').fill('This is a test content');

        await modal.locator('button[type="submit"]').click();

        // Expect modal to close on success
        await expect(modal).not.toBeVisible();
    });

});
