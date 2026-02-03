/**
 * Utility class for formatting numbers and currency values
 */
class FormatUtils {
    /**
     * Format a number as currency with thousand separators and 2 decimal places
     * @param {number} amount - The amount to format
     * @returns {string} Formatted currency string (e.g., "1,234.56")
     */
    static formatCurrency(amount) {
        return amount.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    /**
     * Format a number with thousand separators and no decimal places
     * @param {number} value - The value to format
     * @returns {string} Formatted number string (e.g., "1,234")
     */
    static formatNumber(value) {
        return value.toLocaleString('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });
    }
}
