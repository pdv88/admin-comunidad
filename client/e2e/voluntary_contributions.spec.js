
import { test, expect } from '@playwright/test';

test.describe('Voluntary Contributions', () => {

    test.beforeEach(async ({ page }) => {
        // Mock Login
        await page.route(/api\/auth\/login/, async route => {
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

        // Mock Session Verification (Me)
        await page.route(/api\/auth\/me/, async route => {
            await route.fulfill({
                json: {
                    user: { id: 2, email: 'resident@test.com', name: 'Resident Test', role: 'neighbor' },
                    communities: [{
                        community_id: 1,
                        name: 'Resident Community',
                        roles: [{ name: 'neighbor', block_id: 10 }]
                    }]
                }
            });
        });

        // Mock Context
        await page.route(/api\/communities\/my/, async route => {
            await route.fulfill({
                json: {
                    id: 1,
                    name: 'Resident Community',
                    roles: [{ name: 'neighbor', block_id: 10 }]
                }
            });
        });

        // Mock Dashboard extras
        await page.route(/api\/notices/, async route => route.fulfill({ json: [] }));
        await page.route(/api\/polls/, async route => route.fulfill({ json: [] }));
        await page.route(/api\/reports/, async route => route.fulfill({ json: [] }));

        // Perform Login
        await page.goto('/login');
        await page.fill('input[type="email"]', 'resident@test.com');
        await page.fill('input[type="password"]', 'pass');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL(/\/app\/dashboard/);
    });

    test('Can submit voluntary payment', async ({ page }) => {
        const campaignId = 'camp-123';

        // Mock Campaign Details
        await page.route(/api\/payments\/campaigns\/camp-123/, async route => {
            await route.fulfill({
                json: {
                    id: campaignId,
                    name: 'Optional Campaign',
                    is_mandatory: false,
                    is_active: true,
                    target_amount: 1000,
                    current_amount: 0
                }
            });
        });
        await page.route(/api\/payments\?.*campaign_id=camp-123/, async route => route.fulfill({ json: [] }));

        // Mock Payment Submission
        await page.route(/api\/payments$/, async route => {
            if (route.request().method() === 'POST') {
                await route.fulfill({ json: { success: true } });
            } else {
                await route.continue();
            }
        });

        await page.route(/api\/payments\/campaigns$|api\/campaigns$/, async route => route.fulfill({ json: [] }));
        await page.route(/api\/users/, async route => route.fulfill({ json: { data: [] } }));
        await page.route(/api\/maintenance\/my-statement/, async route => route.fulfill({ json: [] }));

        await page.goto(`/app/campaigns/${campaignId}`);

        // Sync: Wait for campaign title
        await expect(page.getByText('Optional Campaign')).toBeVisible({ timeout: 10000 });

        // Click Contribute (Supports English fallback, English translation, and Spanish)
        await page.getByRole('button', { name: /Make a Contribution|Contribute|Contribuir/i }).click();

        const modal = page.locator('form');
        await expect(modal).toBeVisible();

        await modal.locator('input[type="number"]').fill('50');
        await modal.locator('button[type="submit"]').click();

        // Check for success message (flexible regex to handle translation variations)
        await expect(page.getByText(/Payment registered successfully|Payment uploaded successfully|Pago registrado/i)).toBeVisible();
    });

    test('Voluntary payment appears in My Balance', async ({ page }) => {
        // Mock My Statement
        await page.route(/api\/maintenance\/my-statement.*type=extraordinary/, async route => {
            await route.fulfill({
                json: {
                    data: [
                        {
                            id: 'pay-1',
                            period: 'Optional Campaign',
                            amount: 50,
                            status: 'paid',
                            type: 'extraordinary',
                            is_voluntary: true,
                            payment_date: new Date().toISOString(),
                            units: { unit_number: '101', block_id: 99, blocks: { name: 'Test Block' } },
                            campaigns: { name: 'Optional Campaign', deadline: null }
                        }
                    ],
                    totalPages: 1,
                    totalCount: 1
                }
            });
        });

        await page.route(/api\/properties\/blocks/, async route => route.fulfill({ json: [] }));

        await page.goto('/app/my-balance');
        await page.getByRole('button', { name: /Extraordinary Fees|Cuotas Extraordinarias/i }).click();

        await expect(page.getByText('Optional Campaign')).toBeVisible();
        await expect(page.getByText('50', { exact: true })).toBeVisible();
        await expect(page.getByText('Paid', { exact: true })).toBeVisible();
    });

});
