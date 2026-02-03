/**
 * Date Utilities Module
 * Handles date parsing and monthly aggregation for transaction data
 */

class DateUtils {
    /**
     * Parse transaction date from various formats
     * @param {string|number|Date} dateInput - Date in various formats
     * @returns {Date|null} - Parsed date or null if invalid
     */
    static parseTransactionDate(dateInput) {
        if (!dateInput) {
            return null;
        }

        // If already a Date object
        if (dateInput instanceof Date) {
            return isNaN(dateInput.getTime()) ? null : dateInput;
        }

        // If it's a number (Excel serial date)
        if (typeof dateInput === 'number') {
            // Excel dates start from 1900-01-01 (serial 1)
            // JavaScript dates from 1970-01-01 (epoch 0)
            // Excel incorrectly treats 1900 as a leap year, so we adjust
            const excelEpoch = new Date(1899, 11, 30);
            const date = new Date(excelEpoch.getTime() + dateInput * 86400000);

            if (isNaN(date.getTime())) {
                return null;
            }

            // Validate year range
            const year = date.getFullYear();
            if (year < 2000 || year > 2100) {
                return null;
            }

            return date;
        }

        // Convert to string for string parsing
        const dateString = String(dateInput).trim();

        if (!dateString) {
            return null;
        }

        // Try DD/MM/YYYY or DD/MM/YY format (Hebrew locale)
        const slashParts = dateString.split('/');
        if (slashParts.length === 3) {
            const day = parseInt(slashParts[0], 10);
            const month = parseInt(slashParts[1], 10);
            let year = parseInt(slashParts[2], 10);

            if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                // Convert 2-digit year to 4-digit year
                if (year < 100) {
                    year += 2000; // Assume 2000-2099
                }

                // Validate ranges
                if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 2000 && year <= 2100) {
                    const date = new Date(year, month - 1, day);

                    // Verify the date is valid (handles invalid dates like Feb 31)
                    if (date.getFullYear() === year &&
                        date.getMonth() === month - 1 &&
                        date.getDate() === day) {
                        return date;
                    }
                }
            }
        }

        // Try DD.MM.YYYY or DD.MM.YY format (dot separator)
        const dotParts = dateString.split('.');
        if (dotParts.length === 3) {
            const day = parseInt(dotParts[0], 10);
            const month = parseInt(dotParts[1], 10);
            let year = parseInt(dotParts[2], 10);

            if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                // Convert 2-digit year to 4-digit year
                if (year < 100) {
                    year += 2000; // Assume 2000-2099
                }

                // Validate ranges
                if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 2000 && year <= 2100) {
                    const date = new Date(year, month - 1, day);

                    // Verify the date is valid (handles invalid dates like Feb 31)
                    if (date.getFullYear() === year &&
                        date.getMonth() === month - 1 &&
                        date.getDate() === day) {
                        return date;
                    }
                }
            }
        }

        // Try DD-MM-YYYY or DD-MM-YY format
        const dashParts = dateString.split('-');
        if (dashParts.length === 3) {
            const day = parseInt(dashParts[0], 10);
            const month = parseInt(dashParts[1], 10);
            let year = parseInt(dashParts[2], 10);

            if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                // Convert 2-digit year to 4-digit year
                if (year < 100) {
                    year += 2000; // Assume 2000-2099
                }

                if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 2000 && year <= 2100) {
                    const date = new Date(year, month - 1, day);

                    if (date.getFullYear() === year &&
                        date.getMonth() === month - 1 &&
                        date.getDate() === day) {
                        return date;
                    }
                }
            }
        }

        // Try ISO format (YYYY-MM-DD or full ISO string)
        try {
            const date = new Date(dateString);
            if (!isNaN(date.getTime())) {
                const year = date.getFullYear();
                if (year >= 2000 && year <= 2100) {
                    return date;
                }
            }
        } catch (e) {
            // Invalid date string
        }

        return null;
    }

    /**
     * Generate month key from date in YYYY-MM format
     * @param {Date} date - Date object
     * @returns {string} - Month key for sorting (e.g., "2025-02")
     */
    static getMonthKey(date) {
        if (!(date instanceof Date) || isNaN(date.getTime())) {
            return null;
        }

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    }

    /**
     * Format month key to display format
     * @param {string} monthKey - Month key in YYYY-MM format
     * @returns {string} - Formatted month (e.g., "February 2025")
     */
    static formatMonthHebrew(monthKey) {
        if (!monthKey) {
            return '';
        }

        // Month names in English
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];

        const parts = monthKey.split('-');
        if (parts.length !== 2) {
            return monthKey;
        }

        const year = parts[0];
        const monthIndex = parseInt(parts[1], 10) - 1;

        if (monthIndex < 0 || monthIndex >= 12) {
            return monthKey;
        }

        return `${months[monthIndex]} ${year}`;
    }

    /**
     * Aggregate transactions by month for a specific merchant
     * @param {Array} transactions - All transactions
     * @param {string} merchantName - Merchant to filter by
     * @returns {Object} - { labels: [], amounts: [], counts: [], invalidDates: 0 }
     */
    static aggregateByMonth(transactions, merchantName) {
        const monthMap = new Map();
        let invalidDates = 0;
        let sampleInvalidDates = [];

        // Filter by merchant and group by month
        transactions.forEach(transaction => {
            if (transaction.merchant !== merchantName) {
                return;
            }

            const date = this.parseTransactionDate(transaction.date);
            if (!date) {
                invalidDates++;
                // Log first few invalid dates for debugging
                if (sampleInvalidDates.length < 3) {
                    sampleInvalidDates.push({
                        value: transaction.date,
                        type: typeof transaction.date
                    });
                }
                return;
            }

            const monthKey = this.getMonthKey(date);
            if (!monthKey) {
                invalidDates++;
                return;
            }

            if (monthMap.has(monthKey)) {
                const existing = monthMap.get(monthKey);
                monthMap.set(monthKey, {
                    amount: existing.amount + transaction.amountInILS,
                    count: existing.count + 1
                });
            } else {
                monthMap.set(monthKey, {
                    amount: transaction.amountInILS,
                    count: 1
                });
            }
        });

        // Log sample invalid dates if any
        if (sampleInvalidDates.length > 0) {
            console.log('Sample invalid dates:', sampleInvalidDates);
        }

        // Convert to sorted arrays
        const sortedEntries = Array.from(monthMap.entries())
            .sort((a, b) => a[0].localeCompare(b[0]));

        const labels = sortedEntries.map(([monthKey]) =>
            this.formatMonthHebrew(monthKey)
        );
        const amounts = sortedEntries.map(([, data]) => data.amount);
        const counts = sortedEntries.map(([, data]) => data.count);

        return {
            labels,
            amounts,
            counts,
            invalidDates
        };
    }
}
