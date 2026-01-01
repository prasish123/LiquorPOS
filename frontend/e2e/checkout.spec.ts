import { test, expect } from '@playwright/test';

test.describe('Checkout Flow', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('complete checkout with product search', async ({ page }) => {
        // Search for product
        const searchInput = page.locator('input[placeholder*="search"]');
        await searchInput.fill('wine');

        // Wait for search results
        await page.waitForTimeout(500); // Wait for debounce

        // Click first product to add to cart
        const productCard = page.locator('.product-card').first();
        await expect(productCard).toBeVisible();
        await productCard.click();

        // Verify toast notification
        const toast = page.locator('.toast-success');
        await expect(toast).toBeVisible();
        await expect(toast).toContainText('Added');

        // Verify item in cart
        const cartItem = page.locator('.cart-item');
        await expect(cartItem).toBeVisible();

        // Verify cart shows correct price
        const cartTotal = page.locator('.cart-item-total');
        await expect(cartTotal).toBeVisible();
    });

    test('adjust quantity in cart', async ({ page }) => {
        // Add product to cart first
        const searchInput = page.locator('input[placeholder*="search"]');
        await searchInput.fill('beer');
        await page.waitForTimeout(500);

        const productCard = page.locator('.product-card').first();
        await productCard.click();

        // Increase quantity
        const plusButton = page.locator('.quantity-btn').last();
        await plusButton.click();

        // Verify quantity updated
        const quantity = page.locator('.quantity');
        await expect(quantity).toHaveText('2');

        // Decrease quantity
        const minusButton = page.locator('.quantity-btn').first();
        await minusButton.click();

        // Verify quantity decreased
        await expect(quantity).toHaveText('1');
    });

    test('remove item from cart', async ({ page }) => {
        // Add product to cart
        const searchInput = page.locator('input[placeholder*="search"]');
        await searchInput.fill('wine');
        await page.waitForTimeout(500);

        const productCard = page.locator('.product-card').first();
        await productCard.click();

        // Remove item
        const removeButton = page.locator('.remove-btn');
        await removeButton.click();

        // Verify toast notification
        const toast = page.locator('.toast-info');
        await expect(toast).toBeVisible();
        await expect(toast).toContainText('Removed');

        // Verify cart is empty
        const emptyCart = page.locator('.cart-empty');
        await expect(emptyCart).toBeVisible();
    });

    test('complete checkout with cash payment', async ({ page }) => {
        // Add product to cart
        const searchInput = page.locator('input[placeholder*="search"]');
        await searchInput.fill('wine');
        await page.waitForTimeout(500);

        const productCard = page.locator('.product-card').first();
        await productCard.click();

        // Select cash payment
        const cashButton = page.locator('.payment-btn').filter({ hasText: 'Cash' });
        await cashButton.click();

        // Verify cash button is active
        await expect(cashButton).toHaveClass(/active/);

        // Complete checkout
        const checkoutButton = page.locator('.checkout-btn');
        await checkoutButton.click();

        // Verify success message
        const successMessage = page.locator('.checkout-success');
        await expect(successMessage).toBeVisible({ timeout: 5000 });
        await expect(successMessage).toContainText('Transaction Complete');

        // Verify toast notification
        const toast = page.locator('.toast-success');
        await expect(toast).toBeVisible();
    });

    test('age verification for restricted items', async ({ page }) => {
        // Add age-restricted product
        const searchInput = page.locator('input[placeholder*="search"]');
        await searchInput.fill('wine');
        await page.waitForTimeout(500);

        const productCard = page.locator('.product-card').first();
        await productCard.click();

        // Verify age verification checkbox appears
        const ageCheckbox = page.locator('input[type="checkbox"]');
        await expect(ageCheckbox).toBeVisible();

        // Try to checkout without age verification
        const checkoutButton = page.locator('.checkout-btn');
        await expect(checkoutButton).toBeDisabled();

        // Check age verification
        await ageCheckbox.check();

        // Verify checkout button is enabled
        await expect(checkoutButton).toBeEnabled();
    });

    test('display error on checkout failure', async ({ page }) => {
        // Mock API to return error
        await page.route('**/api/orders', route => {
            route.fulfill({
                status: 500,
                body: JSON.stringify({ message: 'Server error' }),
            });
        });

        // Add product and try to checkout
        const searchInput = page.locator('input[placeholder*="search"]');
        await searchInput.fill('wine');
        await page.waitForTimeout(500);

        const productCard = page.locator('.product-card').first();
        await productCard.click();

        const checkoutButton = page.locator('.checkout-btn');
        await checkoutButton.click();

        // Verify error message
        const errorMessage = page.locator('.checkout-error');
        await expect(errorMessage).toBeVisible();
    });
});
