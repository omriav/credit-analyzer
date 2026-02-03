# Quick Start Guide

Get started with the Credit Analyzer in under 2 minutes.

## 🚀 Instant Start

1. **Open the app**: Double-click `index.html`
2. **Upload files**: Drag & drop your XLSX files or click to browse
3. **Analyze**: Click "נתח קבצים" (Analyze Files)
4. **View results**: See your expense breakdown in the pie chart

That's it! 🎉

## 📁 Supported Formats

The app automatically detects your credit card format:

- ✅ **Format A** (Original format - 8 metadata rows)
- ✅ **Format B** (Discount/Max/Other - 3 metadata rows)
- ✅ **Mixed batches** (upload both formats together)

No need to tell the app which format you're using - it figures it out!

## 🎯 What You'll See

### Main Dashboard
- **Total Expenses**: Large number at top (in ₪)
- **Pie Chart**: Visual breakdown of top merchants
- **Summary Info**:
  - Transaction count
  - Merchant count
  - Detected formats (e.g., "Original Format: 2")
  - Excluded merchants (if any)

### Interactive Features

**Left-Click Merchant** → View monthly spending trend
**Right-Click Merchant** → Remove from visualization
**"שחזר הכל" Button** → Restore all removed merchants

## 🔍 Console Verification

Open Developer Console (F12) to see:
```
Detected format: Original Format FORMAT_A
Detected format: Discount/Max/Other Issuer FORMAT_B
```

## ⚠️ Troubleshooting

**"לא נמצאו עסקאות בקבצים"** (No transactions found)
- Check that your file is an XLSX file (not XLS or CSV)
- Ensure data starts from the expected rows
- Try another file to confirm

**Amounts look wrong**
- Check console for currency conversion info
- Verify exchange rates displayed at top
- Check that amounts in pie chart match your expectations

**Format not detected**
- Check console for "Detected format" message
- App falls back to Format A if uncertain
- Should still work, just check the results

## 📊 Example Console Output

When everything works correctly:
```
Detected format: Original Format FORMAT_A
Detected format: Discount/Max/Other Issuer FORMAT_B
Skipping summary row: סך הכל
Detected formats: Original Format: 1, Discount/Max/Other Issuer: 1
```

## 🎨 Tips & Tricks

1. **Multiple Files**: Upload all your monthly statements at once
2. **Mixed Formats**: Combine statements from different credit cards
3. **Remove Merchants**: Right-click to exclude recurring payments or specific merchants
4. **Monthly Trends**: Left-click any merchant to see spending over time
5. **Privacy**: All processing happens in your browser - no data sent to server

## 📖 Need More Info?

- **General Usage**: See [README.md](README.md)
- **Testing**: See [TESTING_GUIDE.md](TESTING_GUIDE.md)
- **Technical Details**: See [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)
- **Changes**: See [CHANGELOG.md](CHANGELOG.md)
- **Add Formats**: See [ADDING_NEW_FORMATS.md](ADDING_NEW_FORMATS.md)

## ✅ Quick Checklist

- [ ] Opened `index.html` in browser
- [ ] Uploaded XLSX file(s)
- [ ] Clicked "נתח קבצים"
- [ ] Saw pie chart appear
- [ ] Checked console shows format detection
- [ ] Tried clicking a merchant
- [ ] Tried right-clicking to remove a merchant

All checked? You're ready to analyze! 📈

---

**Version**: 2.1.0
**Last Updated**: February 3, 2026
**Status**: ✅ Production Ready
