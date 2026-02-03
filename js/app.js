/**
 * Main Application Controller
 * Handles UI interactions and coordinates data flow
 */

class CreditAnalyzerApp {
    constructor() {
        this.parser = new XLSXParser();
        this.chartManager = new ChartManager('expensesChart');
        this.selectedFiles = [];
        this.parseResults = [];
        this.allTransactions = [];
        this.excludedMerchants = new Set(); // Track removed merchants
        this.merchantCount = 0; // Track current merchant count

        this.initializeElements();
        this.attachEventListeners();
        this.initializeExchangeRates();
    }

    /**
     * Initialize DOM element references
     */
    initializeElements() {
        this.elements = {
            uploadArea: document.getElementById('uploadArea'),
            fileInput: document.getElementById('fileInput'),
            fileList: document.getElementById('fileList'),
            clearBtn: document.getElementById('clearBtn'),
            loading: document.getElementById('loading'),
            exchangeInfo: document.getElementById('exchangeInfo'),
            resultsSection: document.getElementById('resultsSection'),
            totalAmount: document.getElementById('totalAmount'),
            summaryInfo: document.getElementById('summaryInfo'),
            errorMessage: document.getElementById('errorMessage'),
            merchantModal: document.getElementById('merchantModal'),
            modalMerchantName: document.getElementById('modalMerchantName'),
            modalTotalAmount: document.getElementById('modalTotalAmount'),
            modalMonthCount: document.getElementById('modalMonthCount'),
            modalAvgAmount: document.getElementById('modalAvgAmount'),
            modalWarning: document.getElementById('modalWarning'),
            modalClose: document.getElementById('modalClose'),
            merchantContextMenu: document.getElementById('merchantContextMenu'),
            removeMerchantItem: document.getElementById('removeMerchantItem'),
            restoreBtn: document.getElementById('restoreBtn')
        };
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Upload area click
        this.elements.uploadArea.addEventListener('click', () => {
            this.elements.fileInput.click();
        });

        // File input change
        this.elements.fileInput.addEventListener('change', (e) => {
            this.handleFileSelection(e.target.files);
        });

        // Drag and drop
        this.elements.uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.elements.uploadArea.classList.add('dragover');
        });

        this.elements.uploadArea.addEventListener('dragleave', () => {
            this.elements.uploadArea.classList.remove('dragover');
        });

        this.elements.uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            this.elements.uploadArea.classList.remove('dragover');
            this.handleFileSelection(e.dataTransfer.files);
        });

        // Clear button
        this.elements.clearBtn.addEventListener('click', () => {
            this.clearAll();
        });

        // Merchant click from chart
        document.addEventListener('merchantClick', (e) => {
            this.handleMerchantClick(e.detail);
        });

        // Legend right-click (context menu)
        document.addEventListener('legendRightClick', (e) => {
            console.log('legendRightClick event received:', e.detail);
            this.showMerchantContextMenu(e.detail);
        });

        // Remove merchant menu item click
        if (this.elements.removeMerchantItem) {
            this.elements.removeMerchantItem.addEventListener('click', () => {
                this.removeMerchant();
            });
        }

        // Close context menu on any click
        document.addEventListener('click', () => {
            this.hideContextMenu();
        });

        // Restore all merchants button
        if (this.elements.restoreBtn) {
            this.elements.restoreBtn.addEventListener('click', () => {
                this.restoreAllMerchants();
            });
        }

        // Modal close handlers (with null checks)
        if (this.elements.modalClose) {
            this.elements.modalClose.addEventListener('click', () => {
                this.closeMerchantModal();
            });
        }

        if (this.elements.merchantModal) {
            this.elements.merchantModal.addEventListener('click', (e) => {
                if (e.target === this.elements.merchantModal) {
                    this.closeMerchantModal();
                }
            });
        }

        // ESC key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.elements.merchantModal && this.elements.merchantModal.style.display === 'flex') {
                this.closeMerchantModal();
            }
        });
    }

    /**
     * Initialize exchange rates
     */
    async initializeExchangeRates() {
        try {
            const rates = await this.parser.fetchExchangeRates();
            this.displayExchangeRateInfo(rates);
        } catch (error) {
            console.error('Failed to initialize exchange rates:', error);
        }
    }

    /**
     * Display exchange rate information
     */
    displayExchangeRateInfo(rates) {
        if (!rates) return;

        const info = `
            Exchange Rates (${rates.date}):
            USD: ${FormatUtils.formatCurrency(rates.USD)} ₪ |
            EUR: ${FormatUtils.formatCurrency(rates.EUR)} ₪
        `;

        this.elements.exchangeInfo.textContent = info;
        this.elements.exchangeInfo.style.display = 'block';
    }

    /**
     * Handle file selection
     */
    handleFileSelection(files) {
        const xlsxFiles = Array.from(files).filter(file =>
            file.name.toLowerCase().endsWith('.xlsx')
        );

        if (xlsxFiles.length === 0) {
            this.showError('Please select XLSX files only');
            return;
        }

        // Add new files (avoid duplicates)
        let newFilesAdded = false;
        xlsxFiles.forEach(file => {
            const exists = this.selectedFiles.some(f => f.name === file.name && f.size === file.size);
            if (!exists) {
                this.selectedFiles.push(file);
                newFilesAdded = true;
            }
        });

        this.updateFileList();
        this.hideError();

        // Show clear button
        this.elements.clearBtn.style.display = 'inline-block';

        // Automatically start analysis if new files were added
        if (newFilesAdded) {
            this.analyzeFiles();
        }
    }

    /**
     * Update file list display
     */
    updateFileList() {
        if (this.selectedFiles.length === 0) {
            this.elements.fileList.classList.remove('has-files');
            this.elements.fileList.innerHTML = '';
            return;
        }

        this.elements.fileList.classList.add('has-files');
        this.elements.fileList.innerHTML = this.selectedFiles.map((file, index) => `
            <div class="file-item">
                <div>
                    <span class="file-name">${file.name}</span>
                    <span class="file-size">(${this.formatFileSize(file.size)})</span>
                </div>
                <button class="remove-file" data-index="${index}">Remove</button>
            </div>
        `).join('');

        // Attach remove button listeners
        this.elements.fileList.querySelectorAll('.remove-file').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.removeFile(index);
            });
        });
    }

    /**
     * Format file size for display
     */
    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    /**
     * Remove file from selection
     */
    removeFile(index) {
        this.selectedFiles.splice(index, 1);
        this.updateFileList();

        if (this.selectedFiles.length === 0) {
            this.elements.clearBtn.style.display = 'none';
        }
    }

    /**
     * Analyze selected files
     */
    async analyzeFiles() {
        if (this.selectedFiles.length === 0) {
            this.showError('Please select files to analyze');
            return;
        }

        // Show loading
        this.elements.loading.style.display = 'block';
        this.elements.resultsSection.style.display = 'none';
        this.hideError();

        try {
            // Parse all files
            this.parseResults = await this.parser.parseFiles(this.selectedFiles);

            // Check for errors
            const errors = this.parseResults.filter(r => r.error);
            if (errors.length > 0) {
                const fileNames = errors.map(e => e.fileName).join(', ');
                this.showError(`Error processing files: ${fileNames}`);
            }

            // Get all transactions
            const allTransactions = this.parser.getAllTransactions(this.parseResults);
            this.allTransactions = allTransactions; // Store for drill-down

            if (allTransactions.length === 0) {
                this.showError('No transactions found in files');
                this.elements.loading.style.display = 'none';
                return;
            }

            // Aggregate data
            const aggregatedData = this.aggregateByMerchant(allTransactions);

            // Store merchant count for exclusion validation
            this.merchantCount = aggregatedData.merchantCount;

            // Display results
            this.displayResults(aggregatedData);

        } catch (error) {
            console.error('Analysis error:', error);
            this.showError(`Error analyzing files: ${error.message}`);
        } finally {
            this.elements.loading.style.display = 'none';
        }
    }

    /**
     * Aggregate transactions by merchant
     */
    aggregateByMerchant(transactions) {
        const merchantMap = new Map();

        // Group by merchant (exact match)
        transactions.forEach(transaction => {
            const merchant = transaction.merchant;
            const amount = transaction.amountInILS;

            if (merchantMap.has(merchant)) {
                merchantMap.set(merchant, merchantMap.get(merchant) + amount);
            } else {
                merchantMap.set(merchant, amount);
            }
        });

        // Convert to array and sort by amount (descending)
        const merchantArray = Array.from(merchantMap.entries()).map(([merchant, amount]) => ({
            merchant,
            amount
        })).sort((a, b) => b.amount - a.amount);

        // Take top 100 and group rest as "Other"
        const top100 = merchantArray.slice(0, 100);
        const rest = merchantArray.slice(100);

        if (rest.length > 0) {
            const otherAmount = rest.reduce((sum, item) => sum + item.amount, 0);
            top100.push({
                merchant: 'Other',
                amount: otherAmount
            });
        }

        return {
            merchantData: top100,
            totalExpenses: merchantArray.reduce((sum, item) => sum + item.amount, 0),
            merchantCount: merchantArray.length,
            transactionCount: transactions.length
        };
    }

    /**
     * Display analysis results
     */
    displayResults(data) {
        // Display total with thousand separators
        const formattedTotal = data.totalExpenses.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        this.elements.totalAmount.textContent = `₪${formattedTotal}`;

        // Render chart
        this.chartManager.renderPieChart(data.merchantData, data.totalExpenses);

        // Show/hide restore button based on exclusions
        if (this.elements.restoreBtn) {
            if (this.excludedMerchants.size > 0) {
                this.elements.restoreBtn.style.display = 'inline-block';
            } else {
                this.elements.restoreBtn.style.display = 'none';
            }
        }

        // Update summary to show excluded count
        const excludedCount = this.excludedMerchants.size;
        const excludedText = excludedCount > 0
            ? `<p><strong>Hidden Merchants:</strong> ${excludedCount}</p>`
            : '';

        // Display format information
        const formatCounts = {};
        this.parseResults.forEach(result => {
            if (result.format) {
                const formatName = result.format.name || result.format.type;
                formatCounts[formatName] = (formatCounts[formatName] || 0) + 1;
            }
        });

        let formatText = '';
        if (Object.keys(formatCounts).length > 0) {
            const formatEntries = Object.entries(formatCounts)
                .map(([format, count]) => `${format}: ${count}`)
                .join(', ');
            formatText = `<p><strong>Detected Formats:</strong> ${formatEntries}</p>`;
            console.log('Detected formats:', formatEntries);
        }

        // Display summary
        const otherText = data.merchantCount > 100 ? ' + Other' : '';
        this.elements.summaryInfo.innerHTML = `
            <p><strong>Total Transactions:</strong> ${data.transactionCount}</p>
            <p><strong>Number of Merchants:</strong> ${data.merchantCount}</p>
            <p><strong>Displayed:</strong> ${Math.min(100, data.merchantCount)} top merchants${otherText}</p>
            ${excludedText}
            ${formatText}
        `;

        // Show results section
        this.elements.resultsSection.style.display = 'block';

        // Scroll to results
        this.elements.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    /**
     * Handle merchant click event from chart
     */
    handleMerchantClick(detail) {
        try {
            console.log('Merchant clicked:', detail);

            const { merchant, totalAmount } = detail;

            // Skip "Other" category
            if (merchant === 'Other') {
                this.showMerchantAlert('The "Other" category contains multiple merchants and cannot display monthly trends.');
                return;
            }

            // Check if we have transactions
            if (!this.allTransactions || this.allTransactions.length === 0) {
                this.showMerchantAlert('No transaction data found.');
                return;
            }

            console.log('Total transactions:', this.allTransactions.length);
            console.log('Sample transaction:', this.allTransactions[0]);

            // Aggregate by month
            const monthlyData = DateUtils.aggregateByMonth(this.allTransactions, merchant);
            console.log('Monthly data:', monthlyData);

            // Check if we have valid monthly data
            if (monthlyData.labels.length === 0) {
                this.showMerchantAlert('No valid dates found for this merchant.');
                return;
            }

            // Show modal with trend chart
            this.showMerchantTrendModal(merchant, totalAmount, monthlyData);
        } catch (error) {
            console.error('Error in handleMerchantClick:', error);
            this.showMerchantAlert(`Error loading trend data: ${error.message}`);
        }
    }

    /**
     * Show merchant trend modal
     */
    showMerchantTrendModal(merchant, totalAmount, monthlyData) {
        try {
            console.log('Showing modal for:', merchant);

            // Check if modal elements exist
            if (!this.elements.merchantModal) {
                throw new Error('Modal element not found');
            }

            // Populate header
            if (this.elements.modalMerchantName) {
                this.elements.modalMerchantName.textContent = merchant;
            }

            // Calculate stats
            const monthCount = monthlyData.labels.length;
            const avgAmount = totalAmount / monthCount;

            // Populate summary stats
            if (this.elements.modalTotalAmount) {
                this.elements.modalTotalAmount.textContent = `₪${FormatUtils.formatCurrency(totalAmount)}`;
            }
            if (this.elements.modalMonthCount) {
                this.elements.modalMonthCount.textContent = monthCount;
            }
            if (this.elements.modalAvgAmount) {
                this.elements.modalAvgAmount.textContent = `₪${FormatUtils.formatCurrency(avgAmount)}`;
            }

            // Show warning if there are invalid dates
            if (this.elements.modalWarning) {
                if (monthlyData.invalidDates > 0) {
                    this.elements.modalWarning.textContent =
                        `Note: ${monthlyData.invalidDates} transactions with invalid dates were excluded from the chart.`;
                    this.elements.modalWarning.style.display = 'block';
                } else {
                    this.elements.modalWarning.style.display = 'none';
                }
            }

            // Render trend chart
            this.chartManager.renderTrendChart(
                monthlyData.labels,
                monthlyData.amounts,
                merchant
            );

            // Show modal with animation
            this.elements.merchantModal.style.display = 'flex';
            setTimeout(() => {
                this.elements.merchantModal.style.opacity = '1';
            }, 10);

            // Prevent body scroll
            document.body.style.overflow = 'hidden';

            console.log('Modal displayed successfully');
        } catch (error) {
            console.error('Error in showMerchantTrendModal:', error);
            throw error;
        }
    }

    /**
     * Close merchant trend modal
     */
    closeMerchantModal() {
        // Animate exit
        this.elements.merchantModal.style.opacity = '0';
        setTimeout(() => {
            this.elements.merchantModal.style.display = 'none';
        }, 300);

        // Restore body scroll
        document.body.style.overflow = '';

        // Destroy trend chart
        this.chartManager.destroyTrendChart();
    }

    /**
     * Show alert message for merchant-related issues
     */
    showMerchantAlert(message) {
        alert(message);
    }

    /**
     * Check if merchant can be excluded
     */
    canExcludeMerchant(merchant) {
        // Prevent excluding "Other" category
        // Prevent excluding last remaining merchant
        return merchant !== 'Other' && this.merchantCount > 1;
    }

    /**
     * Show context menu for merchant removal
     */
    showMerchantContextMenu(detail) {
        console.log('showMerchantContextMenu called with:', detail);
        const { merchant, x, y } = detail;

        // Store current merchant
        this.contextMenuMerchant = merchant;

        // Check if merchant can be excluded
        const canExclude = this.canExcludeMerchant(merchant);
        console.log(`Can exclude "${merchant}":`, canExclude, `(merchantCount: ${this.merchantCount})`);

        if (!canExclude) {
            return; // Don't show menu for "Other" or last merchant
        }

        // Position and show context menu
        const menu = this.elements.merchantContextMenu;
        console.log('Context menu element:', menu);
        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;
        menu.style.display = 'block';
        console.log('Context menu should now be visible at', x, y);
    }

    /**
     * Hide context menu
     */
    hideContextMenu() {
        if (this.elements.merchantContextMenu) {
            this.elements.merchantContextMenu.style.display = 'none';
        }
    }

    /**
     * Remove merchant from visualization
     */
    removeMerchant() {
        if (!this.contextMenuMerchant) return;

        // Add to excluded set
        this.excludedMerchants.add(this.contextMenuMerchant);

        // Hide context menu
        this.hideContextMenu();

        // Re-aggregate and re-render
        this.refreshVisualization();
    }

    /**
     * Refresh the chart with current exclusions
     */
    refreshVisualization() {
        // Filter transactions by excluded merchants
        const filteredTransactions = this.allTransactions.filter(
            tx => !this.excludedMerchants.has(tx.merchant)
        );

        // Re-aggregate
        const aggregatedData = this.aggregateByMerchant(filteredTransactions);

        // Store merchant count for exclusion validation
        this.merchantCount = aggregatedData.merchantCount;

        // Re-display
        this.displayResults(aggregatedData);
    }

    /**
     * Restore all removed merchants
     */
    restoreAllMerchants() {
        this.excludedMerchants.clear();
        this.refreshVisualization();
    }

    /**
     * Clear all data and reset
     */
    clearAll() {
        this.selectedFiles = [];
        this.parseResults = [];
        this.allTransactions = [];
        this.excludedMerchants.clear(); // Reset exclusions
        this.updateFileList();

        this.elements.clearBtn.style.display = 'none';
        this.elements.resultsSection.style.display = 'none';
        this.elements.fileInput.value = '';

        this.chartManager.destroy();
        this.hideError();
    }

    /**
     * Show error message
     */
    showError(message) {
        this.elements.errorMessage.textContent = message;
        this.elements.errorMessage.style.display = 'block';
    }

    /**
     * Hide error message
     */
    hideError() {
        this.elements.errorMessage.style.display = 'none';
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new CreditAnalyzerApp();
});
