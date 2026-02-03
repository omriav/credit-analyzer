# Credit Transaction Analyzer

A static web application that analyzes credit card transaction XLSX files and displays expense breakdowns by merchant in an interactive pie chart.

## Features

- **Client-side Processing**: All data processing happens in your browser - no server uploads required
- **Multiple File Support**: Upload and analyze multiple XLSX files simultaneously
- **Multi-Format Support**: Automatically detects and parses different credit card issuer formats
- **Automatic Currency Conversion**: Converts foreign currencies to ILS using live exchange rates
- **Professional Number Formatting**: Thousand separators on all currency values (e.g., ₪1,234.56)
- **Interactive Pie Chart**: Visual breakdown of top 100 merchants by expense
- **Merchant Drill-Down**: Click merchants to view monthly spending trends
- **Right-Click Merchant Removal**: Remove merchants from visualization with context menu
- **Mobile Responsive**: Works seamlessly on desktop, tablet, and mobile devices
- **Hebrew RTL Support**: Full right-to-left language support

## Usage

### Quick Start

1. Open `index.html` in a modern web browser
2. Click the upload area or drag and drop your XLSX files
3. Click "נתח קבצים" (Analyze Files)
4. View your expense breakdown in the pie chart

### Supported File Formats

The application automatically detects and supports multiple credit card issuer formats:

#### Format A (Original)
- Rows 0-7: Metadata (headers, account info)
- Row 8: Column headers (in Hebrew)
- Row 9+: Transaction data
- **Key Columns:**
  - Column 0: תאריך (Date)
  - Column 1: שם בית עסק (Merchant Name)
  - Column 4: סכום חיוב (Billing Amount)
  - Column 5: מטבע חיוב (Billing Currency)

#### Format B (Discount/Max/Other)
- Rows 0-2: Metadata
- Row 3: Column headers (in Hebrew)
- Row 4+: Transaction data
- **Key Columns:**
  - Column 0: תאריך עסקה (Transaction Date)
  - Column 1: שם בית העסק (Merchant Name)
  - Column 2: קטגוריה (Category)
  - Column 5: סכום חיוב (Billing Amount)
  - Column 6: מטבע חיוב (Billing Currency)

The parser automatically detects which format you're using based on the file structure and headers. You can even upload files of different formats in the same batch!

### Currency Conversion

The app automatically fetches live exchange rates on page load and converts all transactions to ILS (₪). Supported currencies:
- USD ($)
- EUR (€)
- GBP (£)

If the API is unavailable, fallback rates are used:
- USD: 3.70 ₪
- EUR: 4.05 ₪
- GBP: 4.70 ₪

### Chart Display

- **Top 100 Merchants**: Shows the 100 merchants with the highest expenses
- **Other Category**: Aggregates all remaining merchants
- **Net Expenses**: Includes refunds (negative amounts reduce totals)
- **Interactive**: Hover over segments for detailed amounts and percentages
- **Professional Formatting**: All amounts display with thousand separators for easy reading

## Technical Details

### Technologies Used

- **HTML5**: Structure and file upload interface
- **CSS3**: Mobile-responsive styling with RTL support
- **Vanilla JavaScript**: Application logic (no framework dependencies)
- **SheetJS (xlsx.js)**: Client-side XLSX file parsing
- **Chart.js**: Interactive pie chart rendering
- **ExchangeRate API**: Live currency conversion rates

### Browser Compatibility

Tested and working on:
- Chrome/Edge (Chromium) - Latest
- Firefox - Latest
- Safari (Desktop & iOS) - Latest
- Mobile browsers (iOS Safari, Android Chrome)

### Privacy

All file processing happens entirely in your browser. No data is uploaded to any server. The only external request is to fetch current exchange rates (exchangerate-api.com).

## File Structure

```
credit_analyzer/
├── index.html              # Main application page
├── css/
│   └── styles.css          # Responsive styles
├── js/
│   ├── app.js              # Main application controller
│   ├── xlsx-parser.js      # XLSX file parsing logic
│   ├── chart-manager.js    # Chart.js rendering
│   ├── date-utils.js       # Date parsing utilities
│   └── format-utils.js     # Number formatting utilities
└── README.md               # This file
```

## How It Works

1. **File Upload**: User selects or drops XLSX files
2. **Exchange Rates**: App fetches current rates (or uses fallback)
3. **Format Detection**: Automatically identifies file format by checking headers
   - Format A: Detected by "שם בית עסק" header
   - Format B: Detected by "קטגוריה" + "תאריך עסקה" headers
4. **Parsing**: Each file is parsed using SheetJS
   - Skips metadata rows (format-dependent)
   - Uses format-specific column mappings
   - Extracts transaction data (merchant, amount, currency)
   - Validates and filters empty/invalid rows
   - Skips summary/total rows
5. **Currency Conversion**: Converts all amounts to ILS
6. **Aggregation**: Groups transactions by merchant name
   - Sums amounts per merchant (including refunds)
   - Sorts by total expense
   - Takes top 100 + "Other" category
7. **Visualization**: Renders interactive pie chart using Chart.js
8. **Display**: Shows total expenses, merchant breakdown, and detected formats

## Edge Cases Handled

- **Multiple Formats**: Automatically detects and handles different credit card issuer formats
- **Summary Rows**: Format-aware detection and skipping of monthly total/summary lines
- **Refunds**: Negative amounts reduce net totals
- **Mixed Currencies**: Automatically converts to ILS
- **Multiple Files**: Aggregates across all uploaded files (even mixed formats)
- **Invalid Data**: Skips empty rows and duplicate headers
- **Hebrew Text**: Full UTF-8 encoding support
- **File Errors**: Graceful error handling with user messages
- **API Failures**: Fallback exchange rates if API unavailable
- **Unknown Formats**: Falls back to Format A for backward compatibility

## Troubleshooting

**No transactions found**
- Ensure XLSX file format matches expected structure
- Check that rows 9+ contain transaction data
- Verify merchant names (Column 1) and amounts (Column 4) are present

**Currency conversion not working**
- Check internet connection for live rates
- App will use fallback rates if API unavailable
- Verify currency symbols in your XLSX file

**Chart not displaying**
- Ensure JavaScript is enabled in your browser
- Check browser console for errors
- Try clearing browser cache

## Recent Updates

### Version 2.1.0 - Thousand Separators
All currency values now display with comma thousand separators for improved readability:
- Main total display: ₪1,234.56
- Pie chart tooltips: ₪12,345.67
- Monthly trend charts: ₪1,234.56
- Y-axis labels: ₪1,000 (no decimals)

## Future Enhancements

Potential features for future versions:
- Merchant name fuzzy matching/grouping
- Date range filtering
- Category tagging
- Multiple chart types (bar, timeline)
- Data export (CSV/PDF)
- Month-to-month comparison
- Budget tracking

## License

This project is provided as-is for personal use.

## Credits

Built with:
- [SheetJS](https://sheetjs.com/) for XLSX parsing
- [Chart.js](https://www.chartjs.org/) for data visualization
- [ExchangeRate-API](https://www.exchangerate-api.com/) for currency conversion
