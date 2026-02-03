# Adding New Credit Card Formats

Quick guide for developers who want to add support for additional credit card issuer formats.

## Overview

The multi-format parser uses a detection-based approach where file formats are automatically identified by their header structure. Adding a new format requires:

1. Understanding the new format's structure
2. Adding detection logic
3. Adding format configuration
4. Testing thoroughly

## Step-by-Step Guide

### 1. Analyze the New Format

Before coding, examine sample XLSX files:

```
Questions to answer:
□ How many metadata rows before the header?
□ Which row contains column headers?
□ Which row does data start on?
□ What are the unique keywords in headers?
□ What are the column indices for:
  - Date
  - Merchant name
  - Billing amount
  - Billing currency
  - Transaction amount (optional)
  - Transaction currency (optional)
  - Other fields (category, notes, etc.)
□ How are summary/total rows formatted?
□ Are there any special cases to handle?
```

**Example Analysis**:
```
Format: Leumi Credit Card
Metadata rows: 5 (rows 0-4)
Header row: 5
Data starts: 6
Unique header: "מספר כרטיס" + "תאריך רכישה"
Summary row: "סה״כ" in merchant column
```

### 2. Add Detection Logic

Edit `js/xlsx-parser.js` → `detectFormat()` method

Add your detection case **BEFORE** the default fallback:

```javascript
detectFormat(data) {
    // Check first 10 rows for header patterns
    for (let i = 0; i < Math.min(10, data.length); i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;

        const rowStr = row.join('|').toLowerCase();

        // Format C: Leumi Credit Card (ADD YOUR FORMAT HERE)
        if (rowStr.includes('מספר כרטיס') && rowStr.includes('תאריך רכישה')) {
            return {
                type: 'FORMAT_C',
                name: 'Leumi Credit Card',
                headerRow: i,
                dataStartRow: i + 1,
                columns: {
                    date: 0,           // Column A
                    merchant: 2,       // Column C
                    billingAmount: 4,  // Column E
                    billingCurrency: 5, // Column F
                    transactionAmount: 6,
                    transactionCurrency: 7,
                    cardNumber: 1,     // Format-specific field
                    notes: 8
                }
            };
        }

        // Format B: (existing code)
        // Format A: (existing code)
    }

    // Default fallback (keep this at the end)
    return { /* ... */ };
}
```

### 3. Detection Best Practices

#### Choose Unique Keywords
- Use keywords that are **unique** to this format
- Combine multiple keywords for higher confidence
- Use case-insensitive matching (rowStr is already lowercase)

**Good Examples**:
```javascript
// Good: Highly specific
if (rowStr.includes('מספר כרטיס') && rowStr.includes('תאריך רכישה'))

// Good: Unique combination
if (rowStr.includes('קוד מועדון') && rowStr.includes('סוג חיוב'))
```

**Bad Examples**:
```javascript
// Bad: Too generic
if (rowStr.includes('תאריך'))  // All formats have dates

// Bad: Single common word
if (rowStr.includes('סכום'))  // All formats have amounts
```

#### Detection Order Matters
- More specific formats should be checked **first**
- More generic formats should be checked **last**
- Default fallback should always be **at the end**

### 4. Column Mapping

Required fields (must be present):
- `date`: Date column index
- `merchant`: Merchant name column index
- `billingAmount`: Billing amount column index (in ILS or local currency)
- `billingCurrency`: Currency symbol/code column index

Optional fields (include if available):
- `transactionAmount`: Original transaction amount (before conversion)
- `transactionCurrency`: Original currency
- `category`: Expense category
- `notes`: Additional notes or details
- `receiptNumber`: Receipt/reference number
- `cardNumber`: Last 4 digits of card
- `billingDate`: Date when charged
- `additionalDetails`: Any other details

**Important**: Column indices are **0-based** (Column A = 0, Column B = 1, etc.)

### 5. Update Summary Row Detection

If your format has unique summary row patterns, update `isSummaryRow()`:

```javascript
isSummaryRow(row, format) {
    // ... existing code ...

    // Format C: Leumi specific summary detection
    if (format.type === 'FORMAT_C') {
        const cardNumber = String(row[cols.cardNumber] || '').trim();
        if (cardNumber === 'סה״כ כרטיס') {
            return true;
        }
    }

    // ... rest of existing code ...
}
```

### 6. Testing Your New Format

Create a test file with:
```javascript
// test-format-c.html
// Copy test-merchant-click.html and modify for your format

const mockFormatCData = [
    ['Header1', 'מספר כרטיס', 'תאריך רכישה', ...],
    ['01/01/2024', '1234', 'SuperPharm', ...],
    // ... more test data
];

const parser = new XLSXParser();
const format = parser.detectFormat(mockFormatCData);
console.log('Detected format:', format);
// Expected: FORMAT_C
```

#### Manual Testing Steps:
1. Create sample XLSX file with your format
2. Upload to application
3. Open console (F12)
4. Look for: `Detected format: [Your Format Name] FORMAT_C`
5. Verify transactions parse correctly
6. Check amounts and merchant names
7. Verify summary rows are skipped

### 7. Update Documentation

#### Update README.md:
Add your format to the "Supported File Formats" section:

```markdown
#### Format C (Leumi Credit Card)
- Rows 0-4: Metadata
- Row 5: Column headers (in Hebrew)
- Row 6+: Transaction data
- **Key Columns:**
  - Column 0: תאריך רכישה (Purchase Date)
  - Column 2: שם בית עסק (Merchant Name)
  - Column 4: סכום חיוב (Billing Amount)
  - Column 5: מטבע חיוב (Billing Currency)
```

#### Update CHANGELOG.md:
Document the new format addition:

```markdown
## [2.1.0] - YYYY-MM-DD

### Added
- **Format C Support**: Added support for Leumi Credit Card format
  - Detection via "מספר כרטיס" + "תאריך רכישה" keywords
  - 5 metadata rows, header at row 5
  - Card number tracking in transactions
```

### 8. Common Pitfalls

#### ❌ Wrong column indices
```javascript
// Wrong: Used 1-based indexing
columns: {
    merchant: 2  // Column B would be index 1, not 2!
}
```

#### ✅ Correct column indices
```javascript
// Correct: 0-based indexing
columns: {
    merchant: 1  // Column B = index 1
}
```

#### ❌ Generic detection
```javascript
// Too generic - will match many formats
if (rowStr.includes('תאריך'))
```

#### ✅ Specific detection
```javascript
// Specific combination - matches only your format
if (rowStr.includes('מספר כרטיס') && rowStr.includes('תאריך רכישה'))
```

#### ❌ Detection after default
```javascript
// Wrong: Your format is AFTER the default fallback
return { type: 'FORMAT_A', ... }; // Default

// Your format (will never be reached!)
if (rowStr.includes('your_keyword'))
```

#### ✅ Detection before default
```javascript
// Correct: Your format BEFORE the default
if (rowStr.includes('your_keyword')) {
    return { type: 'FORMAT_C', ... };
}

// Default fallback at the end
return { type: 'FORMAT_A', ... };
```

### 9. Example: Complete Format Addition

Here's a complete example of adding "Format C":

```javascript
// In detectFormat() method, add before default fallback:

// Format C: Hapoalim Credit Card
if (rowStr.includes('מס\' כרטיס') && rowStr.includes('שם עסק')) {
    return {
        type: 'FORMAT_C',
        name: 'Hapoalim Credit Card',
        headerRow: i,
        dataStartRow: i + 1,
        columns: {
            date: 1,              // Column B: Transaction date
            merchant: 3,          // Column D: Merchant name
            billingAmount: 5,     // Column F: Amount
            billingCurrency: 6,   // Column G: Currency
            transactionAmount: 7,
            transactionCurrency: 8,
            category: 2,          // Column C: Category
            cardNumber: 0,        // Column A: Card number
            notes: 9              // Column J: Notes
        }
    };
}

// In isSummaryRow() method, add if needed:
if (format.type === 'FORMAT_C') {
    const cardNumber = String(row[cols.cardNumber] || '').trim();
    if (cardNumber.includes('סיכום כרטיס')) {
        return true;
    }
}
```

### 10. Pull Request Checklist

Before submitting your changes:

- [ ] Format detection works with sample files
- [ ] Column mappings are correct (0-based)
- [ ] Summary rows are properly skipped
- [ ] Console shows correct format name
- [ ] UI displays format information
- [ ] No errors in browser console
- [ ] Updated README.md with format details
- [ ] Updated CHANGELOG.md with changes
- [ ] Created test cases in TESTING_GUIDE.md
- [ ] Backward compatibility maintained
- [ ] Tested with mixed format batches
- [ ] Code follows existing style conventions

## Need Help?

Common issues and solutions:

1. **Format not detected**: Check your keywords are correct and unique
2. **Wrong data parsed**: Verify column indices (remember 0-based!)
3. **Summary rows appearing**: Update `isSummaryRow()` for your format
4. **Existing formats broken**: Make sure your detection is specific enough

## Format Configuration Reference

```javascript
{
    type: 'FORMAT_X',           // Unique identifier (FORMAT_A, FORMAT_B, etc.)
    name: 'Display Name',       // Human-readable name for UI
    headerRow: 5,               // Row index of headers (0-based)
    dataStartRow: 6,            // Row index where data begins (0-based)
    columns: {                  // Column mappings (all 0-based)
        // Required
        date: 0,
        merchant: 1,
        billingAmount: 4,
        billingCurrency: 5,

        // Optional
        transactionAmount: 6,
        transactionCurrency: 7,
        category: 2,
        notes: 8,
        receiptNumber: 9,
        cardNumber: 10,
        billingDate: 11,
        additionalDetails: 12
    }
}
```

## Testing Template

Use this template to test your new format:

```javascript
// Test script in browser console
const testData = [
    ['Row', 'With', 'Your', 'Headers'],
    ['Data', 'Row', '1', '100'],
    ['Data', 'Row', '2', '200']
];

const parser = new XLSXParser();
const format = parser.detectFormat(testData);
console.log('Format:', format);
console.log('Expected: FORMAT_X');
console.log('Match:', format.type === 'FORMAT_X');

const transactions = parser.extractTransactions(testData);
console.log('Transactions:', transactions);
console.log('Count:', transactions.length);
```

---

Good luck adding your new format! 🚀
