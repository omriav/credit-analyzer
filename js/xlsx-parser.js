/**
 * XLSX Parser Module
 * Handles parsing of credit card transaction XLSX files
 */

class XLSXParser {
    constructor() {
        this.exchangeRates = null;
    }

    /**
     * Fetch current exchange rates from API
     */
    async fetchExchangeRates() {
        try {
            const response = await fetch('https://api.exchangerate-api.com/v4/latest/ILS');
            const data = await response.json();

            this.exchangeRates = {
                USD: 1 / data.rates.USD,
                EUR: 1 / data.rates.EUR,
                GBP: 1 / data.rates.GBP,
                date: new Date().toLocaleDateString('en-US')
            };

            return this.exchangeRates;
        } catch (error) {
            console.warn('Failed to fetch exchange rates, using fallback:', error);
            // Fallback rates
            this.exchangeRates = {
                USD: 3.70,
                EUR: 4.05,
                GBP: 4.70,
                date: 'Fixed Rate'
            };
            return this.exchangeRates;
        }
    }

    /**
     * Convert amount to ILS based on currency
     */
    convertToILS(amount, currency) {
        if (!currency || currency === '₪' || currency === 'ILS') {
            return amount;
        }

        const currencyMap = {
            '$': 'USD',
            'USD': 'USD',
            '€': 'EUR',
            'EUR': 'EUR',
            '£': 'GBP',
            'GBP': 'GBP'
        };

        const currencyCode = currencyMap[currency.trim()];

        if (currencyCode && this.exchangeRates[currencyCode]) {
            return amount * this.exchangeRates[currencyCode];
        }

        // If unknown currency, return as-is
        return amount;
    }

    /**
     * Parse a single XLSX file and extract transactions
     */
    parseFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });

                    // Get the first sheet
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];

                    // Convert to JSON (array of arrays)
                    // Use raw: true to preserve Excel date numbers
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                        header: 1,
                        raw: true,
                        defval: ''
                    });

                    // Parse transactions from the data
                    const transactions = this.extractTransactions(jsonData);

                    // Get format info for this file
                    const format = this.detectFormat(jsonData);

                    resolve({
                        fileName: file.name,
                        transactions: transactions,
                        count: transactions.length,
                        format: format
                    });
                } catch (error) {
                    reject(new Error(`Failed to parse ${file.name}: ${error.message}`));
                }
            };

            reader.onerror = () => {
                reject(new Error(`Failed to read ${file.name}`));
            };

            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Detect which credit card issuer format is being used
     * @returns {Object} Format configuration
     */
    detectFormat(data) {
        // Check first 10 rows for header patterns
        for (let i = 0; i < Math.min(10, data.length); i++) {
            const row = data[i];
            if (!row || row.length === 0) continue;

            const rowStr = row.join('|').toLowerCase();

            // Format B: Has "קטגוריה" in header row (unique to Format B)
            if (rowStr.includes('קטגוריה') && rowStr.includes('תאריך עסקה')) {
                return {
                    type: 'FORMAT_B',
                    name: 'Discount/Max/Other Issuer',
                    headerRow: i,
                    dataStartRow: i + 1,
                    columns: {
                        date: 0,
                        merchant: 1,
                        category: 2,
                        transactionAmount: 7,
                        transactionCurrency: 8,
                        billingAmount: 5,
                        billingCurrency: 6,
                        billingDate: 9,
                        notes: 10
                    }
                };
            }

            // Format A: Original format (current)
            if (rowStr.includes('שם בית עסק') && !rowStr.includes('קטגוריה')) {
                return {
                    type: 'FORMAT_A',
                    name: 'Original Format',
                    headerRow: i,
                    dataStartRow: i + 1,
                    columns: {
                        date: 0,
                        merchant: 1,
                        transactionAmount: 2,
                        transactionCurrency: 3,
                        billingAmount: 4,
                        billingCurrency: 5,
                        receiptNumber: 6,
                        additionalDetails: 7
                    }
                };
            }
        }

        // Default to Format A for backward compatibility
        return {
            type: 'FORMAT_A',
            name: 'Original Format (Default)',
            headerRow: 8,
            dataStartRow: 9,
            columns: {
                date: 0,
                merchant: 1,
                transactionAmount: 2,
                transactionCurrency: 3,
                billingAmount: 4,
                billingCurrency: 5,
                receiptNumber: 6,
                additionalDetails: 7
            }
        };
    }

    /**
     * Check if a row is a summary/total row that should be skipped
     * @param {Array} row - Row data
     * @param {Object} format - Format configuration
     */
    isSummaryRow(row, format) {
        if (!row || row.length === 0) {
            return false;
        }

        const cols = format.columns;
        const merchantName = String(row[cols.merchant] || '').trim();
        const date = String(row[cols.date] || '').trim();

        // Common Hebrew keywords for summary rows
        const summaryKeywords = [
            'סה"כ',
            'סהכ',
            'סך הכל',
            'סכום כולל',
            'סיכום',
            'total',
            'sum',
            'כללי'
        ];

        // Check if merchant name contains summary keywords
        const merchantLower = merchantName.toLowerCase();
        const hasSummaryKeyword = summaryKeywords.some(keyword =>
            merchantLower.includes(keyword.toLowerCase())
        );

        // Check if date column contains summary keywords (Format B specific)
        const dateLower = date.toLowerCase();
        const dateHasSummary = summaryKeywords.some(keyword =>
            dateLower.includes(keyword.toLowerCase())
        );

        // Format B: "סך הכל" appears in date column (Column A)
        if (format.type === 'FORMAT_B' && dateHasSummary) {
            return true;
        }

        // Also check if date is empty but amount exists (common for summary rows)
        const hasAmount = this.parseAmount(row[cols.billingAmount]) !== null;
        const noDate = !date || date === '';

        return hasSummaryKeyword || dateHasSummary || (noDate && hasAmount && merchantName !== '');
    }

    /**
     * Extract transactions from parsed XLSX data
     */
    extractTransactions(data) {
        const transactions = [];

        // Detect format
        const format = this.detectFormat(data);
        console.log('Detected format:', format.name, format.type);

        const cols = format.columns;

        // Start from data row
        for (let i = format.dataStartRow; i < data.length; i++) {
            const row = data[i];

            // Skip empty rows
            if (!row || row.length === 0 || !row[cols.merchant]) {
                continue;
            }

            // Skip header rows
            const merchantName = String(row[cols.merchant]).trim();
            if (merchantName === 'שם בית עסק' || merchantName === 'שם בית העסק' || merchantName === '') {
                continue;
            }

            // Skip summary/total rows
            if (this.isSummaryRow(row, format)) {
                console.log('Skipping summary row:', merchantName);
                continue;
            }

            // Extract data using format-specific columns
            const date = row[cols.date] || '';
            const merchant = merchantName;
            const transactionAmount = this.parseAmount(row[cols.transactionAmount]);
            const transactionCurrency = String(row[cols.transactionCurrency] || '').trim();
            const billingAmount = this.parseAmount(row[cols.billingAmount]);
            const billingCurrency = String(row[cols.billingCurrency] || '').trim();

            // Format-specific optional fields
            const receiptNumber = cols.receiptNumber !== undefined ? row[cols.receiptNumber] : '';
            const additionalDetails = cols.additionalDetails !== undefined ? row[cols.additionalDetails] : '';
            const category = cols.category !== undefined ? row[cols.category] : '';
            const notes = cols.notes !== undefined ? row[cols.notes] : '';

            // Validate that we have a merchant and amount
            if (!merchant || billingAmount === null) {
                continue;
            }

            // Convert to ILS if needed
            const amountInILS = this.convertToILS(billingAmount, billingCurrency);

            transactions.push({
                date,
                merchant,
                transactionAmount,
                transactionCurrency,
                billingAmount,
                billingCurrency,
                amountInILS,
                receiptNumber,
                additionalDetails: additionalDetails || notes,
                category,
                isRecurring: (additionalDetails || notes || '').includes('הוראת קבע'),
                isRefund: billingAmount < 0,
                sourceFormat: format.type
            });
        }

        return transactions;
    }

    /**
     * Parse amount string to number
     */
    parseAmount(value) {
        if (value === null || value === undefined || value === '') {
            return null;
        }

        // Convert to string and clean
        let cleanValue = String(value)
            .trim()
            .replace(/,/g, '') // Remove commas
            .replace(/[^\d.-]/g, ''); // Keep only digits, dots, and minus

        const parsed = parseFloat(cleanValue);

        return isNaN(parsed) ? null : parsed;
    }

    /**
     * Parse multiple files
     */
    async parseFiles(files) {
        const results = [];

        for (const file of files) {
            try {
                const result = await this.parseFile(file);
                results.push(result);
            } catch (error) {
                console.error(error);
                results.push({
                    fileName: file.name,
                    error: error.message,
                    transactions: []
                });
            }
        }

        return results;
    }

    /**
     * Get all transactions from multiple file results
     */
    getAllTransactions(parseResults) {
        const allTransactions = [];

        for (const result of parseResults) {
            if (result.transactions) {
                allTransactions.push(...result.transactions);
            }
        }

        return allTransactions;
    }
}
