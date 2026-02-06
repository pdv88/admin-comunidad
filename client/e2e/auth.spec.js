import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {

    test('Login with valid credentials redirects to dashboard', async ({ page }) => {
        // Mock the login API call
        await page.route('*/**/api/auth/login', async route => {
            const json = {
                token: 'fake-jwt-token',
                user: {
                    id: 1,
                    email: 'test@example.com',
                    role: 'resident'
                }
            };
            await route.fulfill({ json });
        });

        // Mock the "Get Me" or "My Community" call that happens after login
        // Adjust logic based on what your app fetches on dashboard load
        await page.route('*/**/api/communities/my', async route => {
            await route.fulfill({ json: { id: 1, name: 'Test Community' } });
        });

        await page.goto('/login');

        // Fill login form
        await page.fill('input[type="email"]', 'test@example.com');
        await page.fill('input[type="password"]', 'password123');
        await page.click('button[type="submit"]');

        // Assert redirection to dashboard
        await expect(page).toHaveURL(/\/app\/dashboard/);

        // Optional: Assert dashboard content appears
        // await expect(page.getByText('Test Community')).toBeVisible();
    });

    test('Protected route redirects to login', async ({ page }) => {
        await page.goto('/app/dashboard');
        await expect(page).toHaveURL(/\/login/);
    });

});
