/**
 * Currency utilities for formatting and symbol lookup.
 */

// Currency code to symbol mapping
export const CURRENCY_SYMBOLS = {
    EUR: '€',
    USD: '$',
    MXN: '$',
    GBP: '£',
    COP: '$',
    ARS: '$',
    CLP: '$',
    PEN: 'S/',
    BRL: 'R$',
};

// Default currency if none set
export const DEFAULT_CURRENCY = 'EUR';

/**
 * Get the symbol for a currency code.
 * @param {string} currencyCode - ISO 4217 currency code (e.g., 'EUR', 'USD')
 * @returns {string} Currency symbol (e.g., '€', '$')
 */
export const getCurrencySymbol = (currencyCode) => {
    return CURRENCY_SYMBOLS[currencyCode] || currencyCode || CURRENCY_SYMBOLS[DEFAULT_CURRENCY];
};

/**
 * Format a number as currency using Intl.NumberFormat.
 * @param {number} amount - The amount to format
 * @param {string} currencyCode - ISO 4217 currency code
 * @param {string} locale - Optional locale (defaults to browser's locale)
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, currencyCode = DEFAULT_CURRENCY, locale) => {
    const code = currencyCode || DEFAULT_CURRENCY;
    try {
        return new Intl.NumberFormat(locale || undefined, {
            style: 'currency',
            currency: code,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    } catch (e) {
        // Fallback if Intl fails
        return `${getCurrencySymbol(code)}${Number(amount).toFixed(2)}`;
    }
};

/**
 * List of supported currencies for the dropdown.
 */
export const SUPPORTED_CURRENCIES = [
    { code: 'EUR', name: 'Euro (€)' },
    { code: 'USD', name: 'US Dollar ($)' },
    { code: 'MXN', name: 'Mexican Peso ($)' },
    { code: 'GBP', name: 'British Pound (£)' },
    { code: 'COP', name: 'Colombian Peso ($)' },
    { code: 'ARS', name: 'Argentine Peso ($)' },
    { code: 'CLP', name: 'Chilean Peso ($)' },
    { code: 'PEN', name: 'Peruvian Sol (S/)' },
    { code: 'BRL', name: 'Brazilian Real (R$)' },
];
