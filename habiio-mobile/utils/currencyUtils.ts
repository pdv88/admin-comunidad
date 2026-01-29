export const getCurrencySymbol = (currencyCode: string | undefined): string => {
    if (!currencyCode) return '$';
    try {
        // Very basic map for common currencies, expandable later or use Intl APIs properly if environment supports
        const symbols: Record<string, string> = {
            'USD': '$',
            'EUR': '€',
            'GBP': '£',
            'MXN': '$',
            'COP': '$',
        };
        return symbols[currencyCode] || '$';
    } catch (e) {
        return '$';
    }
};

export const formatMoney = (amount: number, currency = 'USD'): string => {
    // ... basic formatter implementation
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}
