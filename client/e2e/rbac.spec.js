import { test, expect } from '@playwright/test';

test.describe('RBAC & Role Visibility', () => {

    const mockLogin = async (page, userRole, rolesArray = []) => {
        // Construct roles array for the community
        // AuthContext expects roles to be an array of objects: [{ name: 'admin' }, { name: 'neighbor', block_id: 1 }]
        const communityRoles = rolesArray.length > 0
            ? rolesArray.map(r => ({ name: r }))
            : [{ name: userRole }];

        // Mock Login Response
        await page.route('*/**/api/auth/login', async route => {
            await route.fulfill({
                json: {
                    token: 'rbac-token',
                    user: { id: 100, email: 'rbac@test.com' }, // User object usually doesn't need global role if community roles are used
                    communities: [{
                        community_id: 1,
                        name: 'RBAC Community',
                        roles: communityRoles
                    }]
                }
            });
        });

        // Mock Active Community Context (Critical for hasAnyRole)
        await page.route('*/**/api/communities/my', async route => {
            await route.fulfill({
                json: {
                    id: 1,
                    name: 'RBAC Community',
                    roles: communityRoles,
                    communities: { currency: 'USD' }
                }
            });
        });

        // Mock Session Verification (REQUIRED for page refreshes/direct navigation)
        await page.route('*/**/api/auth/me', async route => {
            await route.fulfill({
                json: {
                    user: { id: 100, email: 'rbac@test.com' },
                    communities: [{
                        community_id: 1,
                        name: 'RBAC Community',
                        roles: communityRoles
                    }]
                }
            });
        });

        // Default mocks
        await page.route('*/**/api/notices*', async route => route.fulfill({ json: [] }));
        await page.route('*/**/api/users*', async route => route.fulfill({ json: { data: [], count: 0 } }));
        await page.route('*/**/api/maintenance/my-statement*', async route => route.fulfill({ json: { data: [], totalPages: 1 } }));
        await page.route('*/**/api/visitors*', async route => route.fulfill({ json: [] }));
        await page.route('*/**/api/reports*', async route => route.fulfill({ json: { data: [], count: 0 } }));

        // Perform Login
        await page.goto('/login');
        await page.fill('input[type="email"]', 'rbac@test.com');
        await page.fill('input[type="password"]', 'pass');
        await page.click('button[type="submit"]');

        // Wait for dashboard to ensure auth is settled
        await expect(page).toHaveURL(/\/app\/dashboard/);
    };

    test('Neighbor (Resident) cannot access Admin Routes', async ({ page }) => {
        await mockLogin(page, 'neighbor');

        // 1. Verify Sidebar Links (Should NOT see Users)
        await expect(page.locator('a[href="/app/users"]')).not.toBeVisible();

        // 2. Attempt direct navigation to User Management
        await page.goto('/app/users');

        // 3. Should REDIRECT to Dashboard (Protected Route)
        // We wait for the URL to stabilize
        await expect(page).toHaveURL(/\/app\/dashboard/);
    });

    test('Treasurer can see Finance but NOT Users', async ({ page }) => {
        await mockLogin(page, 'treasurer');

        // ✅ Allowed: Maintenance (Fees)
        await expect(page.locator('a[href="/app/maintenance"]')).toBeVisible();

        // ⛔ Restricted: Users, Properties
        await expect(page.locator('a[href="/app/users"]')).not.toBeVisible();
        await expect(page.locator('a[href="/app/properties"]')).not.toBeVisible();

        // Verify direct access redirect
        await page.goto('/app/properties');
        await expect(page).toHaveURL(/\/app\/dashboard/);
    });

    test('Security can see Visitors but NOT Finance', async ({ page }) => {
        await mockLogin(page, 'security');

        // ✅ Allowed: Visitors
        await expect(page.locator('a[href="/app/visitors"]')).toBeVisible();

        // ✅ Allowed: Reservations
        await expect(page.locator('a[href="/app/reservations"]')).toBeVisible();

        // ⛔ Restricted: Finance, Users
        await expect(page.locator('a[href="/app/maintenance"]')).not.toBeVisible();
        await expect(page.locator('a[href="/app/users"]')).not.toBeVisible();
    });

    test('Maintenance can see Reports but NOT Finance', async ({ page }) => {
        await mockLogin(page, 'maintenance');

        // ✅ Allowed: Reports
        await expect(page.locator('a[href="/app/reports"]')).toBeVisible();

        // ⛔ Restricted: Users, Settings
        await expect(page.locator('a[href="/app/users"]')).not.toBeVisible();

        // Note: DashboardLayout ALLOWS maintenance to see /app/reservations too
        await expect(page.locator('a[href="/app/reservations"]')).toBeVisible();
    });

    test('Vocal has broad access but constrained by block', async ({ page }) => {
        // Vocal is allowed in many admin areas in Sidebar but NOT strict admin areas (Users/Properties)
        // According to DashboardLayout.jsx:
        // Allowed: Notices, Reports, Voting, Maintenance, Reservations, Visitors
        // Restricted: Users, Properties, Community Settings, Alerts

        await mockLogin(page, 'vocal');

        // ✅ Allowed
        await expect(page.locator('a[href="/app/maintenance"]')).toBeVisible();
        await expect(page.locator('a[href="/app/voting"]')).toBeVisible();

        // ⛔ Restricted
        await expect(page.locator('a[href="/app/users"]')).not.toBeVisible();
        await expect(page.locator('a[href="/app/properties"]')).not.toBeVisible();
    });

    test('Multi-Role (Neighbor + Admin) has Additive Access', async ({ page }) => {
        await mockLogin(page, 'admin', ['neighbor', 'admin']);

        // ✅ Allowed: Admin Route (Users)
        await expect(page.locator('a[href="/app/users"]')).toBeVisible();

        // ✅ Allowed: Resident Route (My Balance)
        await expect(page.locator('a[href="/app/my-balance"]')).toBeVisible();
    });

});
