import { test, expect } from '@playwright/test';

test.describe('Input Validation & Constraints', () => {

    test.beforeEach(async ({ page }) => {
        // Mock Login (Admin)
        await page.route('*/**/api/auth/login', async route => {
            await route.fulfill({
                json: {
                    token: 'val-token',
                    user: { id: 1, email: 'admin@test.com', role: 'admin' },
                    communities: [{ community_id: 1, name: 'Val Community', roles: [{ name: 'admin' }] }]
                }
            });
        });

        await page.route('*/**/api/auth/me', async route => {
            await route.fulfill({
                json: {
                    user: { id: 1, email: 'admin@test.com' },
                    communities: [{ community_id: 1, name: 'Val Community', roles: [{ name: 'admin' }] }]
                }
            });
        });

        await page.route('*/**/api/communities/my', async route => {
            await route.fulfill({ json: { id: 1, name: 'Val Community', roles: [{ name: 'admin' }] } });
        });

        // Default mocks
        await page.route('*/**/api/users*', async route => route.fulfill({ json: { data: [], count: 0 } }));
        await page.route('*/**/api/properties/blocks', async route => route.fulfill({ json: [] }));

        await page.goto('/login');
        await page.fill('input[type="email"]', 'admin@test.com');
        await page.fill('input[type="password"]', 'pass');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL(/\/app\/dashboard/);
    });

    test('User Invite Form requires valid email', async ({ page }) => {
        await page.goto('/app/users');

        // Open Invite Modal (Assuming button exists and opens modal)
        await page.getByRole('button', { name: /Invite|Invitar/i }).click();

        const emailInput = page.locator('input[type="email"]');

        // 1. Try Invalid Email
        await emailInput.fill('invalid-email');
        await page.locator('button[type="submit"]').click();

        // Check for browser validation or UI error
        // Note: HTML5 validation prevents submission if we check :invalid pseudo-class or evaluate validity
        const isInvalid = await emailInput.evaluate(e => !e.checkValidity());
        expect(isInvalid).toBeTruthy();

        // 2. Try Empty Submit
        await emailInput.fill('');
        await page.locator('button[type="submit"]').click();
        const isRequired = await emailInput.evaluate(e => e.required);
        expect(isRequired).toBeTruthy();
    });

    test('Campaign Creation Constraint Checks', async ({ page }) => {
        // Navigate to campaigns via Maintenance (Treasurer/Admin view)
        // Or check if /app/campaigns redirects to maintenance based on App.jsx routes
        // App.jsx: /app/campaigns -> /app/maintenance?tab=extraordinary
        await page.goto('/app/maintenance?tab=extraordinary');

        // Open Create Modal
        await page.getByRole('button', { name: /Create|Crear/i }).click();

        // 1. Negative Amount check
        const amountInput = page.locator('input[type="number"]').first(); // Goal Amount
        await amountInput.fill('-500');

        // Submit
        await page.locator('button[type="submit"]').click();

        // HTML5 min="0" check or manual validation?
        // Assuming standard html5 input type number
        // Let's assert that the input is invalid
        const isInvalidAmount = await amountInput.evaluate(e => !e.checkValidity());
        expect(isInvalidAmount).toBeTruthy();
    });

});
