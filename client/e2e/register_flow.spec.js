import { test, expect } from '@playwright/test';

// Use localhost for this test to allow email verification interception
const URL = 'http://localhost:5173';

test.describe('Registration Flow', () => {
    test('should register a new user, verify email, and delete account', async ({ page }) => {
        // Generate unique user data
        const timestamp = Date.now();
        const userData = {
            fullName: `Test User ${timestamp}`,
            email: `test_user_${timestamp}@example.com`,
            communityName: `Test Community ${timestamp}`,
            address: `123 Test St`,
            password: 'TestPassword123!'
        };

        console.log(`Starting Registration Test for: ${userData.email}`);

        // 1. Go to Register Page
        await page.goto(`${URL}/register`);

        // 2. Fill Registration Form
        await page.fill('input[name="fullName"]', userData.fullName);
        await page.fill('input[name="communityName"]', userData.communityName);
        await page.fill('input[name="communityAddress"]', userData.address);
        await page.fill('input[name="email"]', userData.email);
        await page.fill('input[name="password"]', userData.password);
        await page.fill('input[name="confirmPassword"]', userData.password);

        // 3. Submit Form and Intercept Response
        const [response] = await Promise.all([
            page.waitForResponse(resp => resp.url().includes('/api/auth/register') && resp.status() === 201),
            page.click('button[type="submit"]')
        ]);

        const responseBody = await response.json();

        // 4. Verify Success Message
        await expect(page.getByText(/Registration successful|Registro exitoso/i)).toBeVisible({ timeout: 10000 });

        // 5. Build Verification Link (Workaround for Prod/Dev diffs)
        // If the server returns verificationLink (Dev mode), use it.
        let verificationLink = responseBody.verificationLink;

        if (verificationLink) {
            console.log('Intercepted Verification Link:', verificationLink);
            // Link redirects to prod (habiio.com), so we visit it to verify status
            await page.goto(verificationLink);

            // Wait for handling
            await page.waitForTimeout(5000);

            // Navigate BACK to localhost to login
            console.log('Navigating back to localhost login...');
            await page.goto(`${URL}/login`);
        } else {
            console.warn('No verification link found in response. Skipping verification step.');
        }

        // 6. Login
        console.log('Logging in with new account...');
        await page.fill('input[type="email"]', userData.email);
        await page.fill('input[type="password"]', userData.password);
        await page.click('button[type="submit"]');

        // 7. Verify Login Success (Dashboard)
        try {
            await page.waitForURL(/.*\/app/, { timeout: 15000 });
            console.log('Redirected to App. URL:', page.url());
            // Dashboard layout has a nav, not a header
            await expect(page.locator('nav')).toBeVisible({ timeout: 15000 });
        } catch (e) {
            console.error('Login failed or timed out. Final URL:', page.url());
            throw e;
        }

        // 8. Go to Settings to Delete Account
        console.log('Navigating to Settings for account deletion...');
        await page.goto(`${URL}/app/settings`);

        // 9. Find Delete Account button
        // It might be in a "Danger Zone" section
        const deleteBtn = page.getByText(/Delete Account|Eliminar Cuenta/i).last(); // last() because it might appear in title and button
        await deleteBtn.scrollIntoViewIfNeeded();
        await deleteBtn.click();

        // 10. Handle Confirmation Modal
        console.log('Confirming deletion...');
        // Modal should appear
        // Input placeholder is "DELETE" (based on code analysis)
        await page.fill('input[placeholder="DELETE"]', 'DELETE');

        // Confirm Button
        // We look for the button inside the modal logic or by text
        // "Delete Account" is likely the text on the confirm button too
        // Use a more specific selector for the MODAL button 
        // Targeted via the modal overlay container class usually having high z-index or fixed positioning
        // ConfirmationModal.jsx has z-[60]
        const modalDeleteBtn = page.locator('.z-\\[60\\] button').filter({ hasText: /Delete Account|Eliminar Cuenta/i });
        await modalDeleteBtn.click();

        // 11. Verify Cleanup
        // Should redirect to login or landing
        await page.waitForURL(/.*\/login/);

        // Optional: Try to login again to confirm failure
        console.log('Verifying account is deleted...');
        await page.fill('input[type="email"]', userData.email);
        await page.fill('input[type="password"]', userData.password);
        await page.click('button[type="submit"]');

        // Expect error message
        // 12. Expect failure (User should be deleted)
        // Wait a bit for response
        await page.waitForTimeout(2000);

        if (page.url().includes('/app')) {
            throw new Error('Login succeeded! Account was NOT deleted.');
        }

        // Expect to still be on login page
        expect(page.url()).toContain('/login');

        // Expect ANY error message (usually red text)
        await expect(page.locator('.text-red-600')).toBeVisible();

        console.log('Test Complete: Account created, verified, and deleted successfully.');
    });
});
