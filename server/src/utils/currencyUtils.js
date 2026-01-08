/**
 * Server-side currency utilities
 */

const CURRENCY_SYMBOLS = {
    EUR: '€',
    USD: '$',
    MXN: '$',
    GBP: '£',
    COP: '$',
    ARS: '$',
    CLP: '$',
    PEN: 'S/',
    BRL: 'R$'
};

const DEFAULT_CURRENCY = 'EUR';

/**
 * Get currency symbol for a given currency code
 * @param {string} currencyCode - ISO 4217 currency code
 * @returns {string} Currency symbol
 */
function getCurrencySymbol(currencyCode) {
    return CURRENCY_SYMBOLS[currencyCode] || CURRENCY_SYMBOLS[DEFAULT_CURRENCY];
}

/**
 * Format amount with currency
 * @param {number} amount - The amount to format
 * @param {string} currencyCode - ISO 4217 currency code
 * @param {string} locale - Locale for formatting (default: 'es-ES')
 * @returns {string} Formatted currency string
 */
function formatCurrency(amount, currencyCode = DEFAULT_CURRENCY, locale = 'es-ES') {
    try {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currencyCode
        }).format(amount);
    } catch (e) {
        // Fallback if currency code is invalid
        return `${getCurrencySymbol(currencyCode)}${amount}`;
    }
}

module.exports = {
    CURRENCY_SYMBOLS,
    DEFAULT_CURRENCY,
    getCurrencySymbol,
    formatCurrency
};
