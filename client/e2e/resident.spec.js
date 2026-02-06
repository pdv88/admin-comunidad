import { test, expect } from '@playwright/test';

test.describe('Resident Journey', () => {

    test.beforeEach(async ({ page }) => {
        // Mock Login with Communities
        await page.route('*/**/api/auth/login', async route => {
            await route.fulfill({
                json: {
                    token: 'resident-token',
                    user: { id: 2, email: 'resident@test.com', name: 'Resident Test', role: 'neighbor' },
                    communities: [{
                        community_id: 1,
                        name: 'Resident Community',
                        roles: [{ name: 'neighbor', block_id: 10 }]
                    }]
                }
            });
        });

        // Mock User/Role Context
        await page.route('*/**/api/communities/my', async route => {
            await route.fulfill({
                json: {
                    id: 1,
                    name: 'Resident Community',
                    roles: [{ name: 'neighbor', block_id: 10 }]
                }
            });
        });

        // Perform Login
        await page.goto('/login');
        await page.fill('input[type="email"]', 'resident@test.com');
        await page.fill('input[type="password"]', 'pass');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL(/\/app\/dashboard/);
    });

    test('Dashboard loads correctly', async ({ page }) => {
        // Mock Dashboard Widgets
        await page.route('*/**/api/notices*', async route => route.fulfill({ json: [] }));
        await page.route('*/**/api/polls/my-pending', async route => route.fulfill({ json: [] }));
        await page.route('*/**/api/payments/campaigns', async route => route.fulfill({ json: [] }));
        await page.route('*/**/api/reports/my', async route => route.fulfill({ json: [] }));

        // Verify widgets exist (Welcome message)
        await expect(page.locator('text=Welcome')).toBeVisible();
    });

    test('Can view my balance', async ({ page }) => {
        // Mock Balance/Statement Data
        // Note: MyBalance page likely fetches from 'my-statement' or similar
        // The component expects { data: [], totalPages: 1, totalCount: 1 }
        await page.route('*/**/api/maintenance/my-statement*', async route => {
            await route.fulfill({
                json: {
                    data: [
                        { id: 1, period: '2026-02', amount: 500, status: 'pending', unit_number: '101' }
                    ],
                    totalPages: 1,
                    totalCount: 1
                }
            });
        });

        // MyBalance might fetch campaigns too
        await page.route('*/**/api/payments/campaigns', async route => route.fulfill({ json: [] }));
        // MyBalance fetches blocks for hierarchy
        await page.route('*/**/api/properties/blocks*', async route => route.fulfill({ json: [] }));

        // Use specific link for residents: My Balance
        await page.click('a[href="/app/my-balance"]');

        await expect(page).toHaveURL(/\/app\/my-balance/);

        // Check for raw amount "500" as component does not format it
        await expect(page.getByText('500', { exact: true })).toBeVisible();

        // Check for status with case insensitivity
        await expect(page.getByText(/pending|pendiente/i)).toBeVisible();
    });

});
