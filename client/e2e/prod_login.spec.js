import { test, expect } from '@playwright/test';

const URL = 'https://habiio.com';

const users = [
    { role: 'Super Admin', email: '888.pdv@gmail.com', pass: 'contra123' },
    { role: 'Treasurer', email: '888pdv@gmail.com', pass: 'contra123' },
    { role: 'Neighbor', email: '88.8pdv@gmail.com', pass: 'contra123' },
    { role: 'Maintenance', email: '888p.dv@gmail.com', pass: 'contra123' },
    { role: 'Security & Neighbor', email: '888pd.v@gmail.com', pass: 'contra123' }
];

test.describe('Production Login Tests', () => {
    for (const user of users) {
        test(`Login as ${user.role} (${user.email}) and verify Lomas Country`, async ({ page }) => {
            // 1. Go to production URL (Login page directly)
            await page.goto(`${URL}/login`);

            // 2. Fill Credentials
            await page.fill('input[type="email"]', user.email);
            await page.fill('input[type="password"]', user.pass);

            // 3. Submit
            await page.click('button[type="submit"]');

            // 4. Verify Login Success (Dashboard or similar)
            await expect(page).toHaveURL(/.*\/app\/dashboard/, { timeout: 15000 });

            // 5. Check for Community Name "Lomas Country"
            // It is displayed in the sidebar CommunitySwitcher
            const communitySwitcher = page.locator('div.px-4.mb-2.relative button').first();

            // Allow some time for data to load
            await expect(communitySwitcher).toBeVisible({ timeout: 10000 });

            const communityName = await communitySwitcher.textContent();
            console.log(`Current community for ${user.role}: ${communityName}`);

            if (!communityName.includes('Lomas Country')) {
                console.log(`Active community is NOT 'Lomas Country'. Attempting to switch...`);
                // Open switcher
                await communitySwitcher.click();

                // Find Lomas Country in the list
                const lomasOption = page.getByRole('button', { name: /Lomas Country/i });

                if (await lomasOption.count() > 0) {
                    await lomasOption.click();
                    console.log('Switched to Lomas Country');
                    await page.waitForTimeout(2000); // Wait for reload/update
                } else {
                    console.warn(`'Lomas Country' not found in switcher for user ${user.role}`);
                    // We might choose to fail here, or just warn. 
                    // The prompt said "make sure you are in the lomas country community".
                    // So we should fail if we can't be in it.
                    throw new Error(`User ${user.role} does not have access to 'Lomas Country'`);
                }
            }

            // Final Verification
            await expect(page.locator('body')).toContainText(/Lomas Country/i);
            console.log(`✅ Successfully verified ${user.role} in Lomas Country`);
        });
    }
});
