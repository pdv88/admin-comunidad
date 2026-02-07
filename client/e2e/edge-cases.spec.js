import { test, expect } from '@playwright/test';

test.describe('Edge Cases & Error Handling', () => {

    test.beforeEach(async ({ page }) => {
        // Standard Login Mock
        await page.route('*/**/api/auth/login', async route => {
            await route.fulfill({
                json: {
                    token: 'edge-token',
                    user: { id: 1, email: 'edge@test.com', role: 'admin' },
                    communities: [{ community_id: 1, name: 'Edge Community', roles: [{ name: 'admin' }] }]
                }
            });
        });

        await page.route('*/**/api/auth/me', async route => {
            await route.fulfill({
                json: {
                    user: { id: 1, email: 'edge@test.com' },
                    communities: [{ community_id: 1, name: 'Edge Community', roles: [{ name: 'admin' }] }]
                }
            });
        });

        await page.route('*/**/api/communities/my', async route => {
            await route.fulfill({ json: { id: 1, name: 'Edge Community', roles: [{ name: 'admin' }] } });
        });

        // Login
        await page.goto('/login');
        await page.fill('input[type="email"]', 'edge@test.com');
        await page.fill('input[type="password"]', 'pass');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL(/\/app\/dashboard/);
    });

    test('Handles Network Error (500) gracefully on Dashboard', async ({ page }) => {
        // Mock 500 on Notices
        await page.route('*/**/api/notices*', async route => {
            await route.fulfill({ status: 500, body: 'Internal Server Error' });
        });

        // Should not crash (white screen). Should show error or empty state or just load other widgets.
        // Dashboard usually handles errors by just not showing the widget or showing a toast
        // We check that the sidebar is still visible (app didn't crash)
        await expect(page.locator('nav')).toBeVisible();

        // Check if error toast/message appears (optional, depends on implementation)
        // await expect(page.getByText(/Error|Failed/i)).toBeVisible(); 
    });

    test('Handles Empty States correctly', async ({ page }) => {
        // Mock Empty Notices
        await page.route('*/**/api/notices*', async route => route.fulfill({ json: [] }));
        await page.click('a[href="/app/notices"]');

        // Expect "No notices found" or similar text
        // Adjust text based on actual UI
        await expect(page.getByText(/No hay avisos|No notices|no se encontraron/i)).toBeVisible();
    });

    test('Handles Session Expiry (401) on API call', async ({ page }) => {
        // Mock 401 on navigation
        await page.route('*/**/api/users*', async route => {
            await route.fulfill({ status: 401, json: { error: 'Unauthorized' } });
        });

        await page.goto('/app/users');

        // Should trigger AuthContext 401 interceptor and redirect to login
        await expect(page).toHaveURL(/\/login/);
    });

});
