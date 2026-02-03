/**
 * Chart Manager Module
 * Handles Chart.js rendering for expense visualization
 */

class ChartManager {
    constructor(canvasId) {
        this.canvasId = canvasId;
        this.chart = null;
        this.trendChart = null;
    }

    /**
     * Create or update pie chart with merchant data
     */
    renderPieChart(merchantData, totalExpenses) {
        const canvas = document.getElementById(this.canvasId);
        const ctx = canvas.getContext('2d');

        // Destroy existing chart if it exists
        if (this.chart) {
            this.chart.destroy();
        }

        // Prepare data
        const labels = merchantData.map(item => item.merchant);
        const data = merchantData.map(item => item.amount);
        const colors = this.generateColors(merchantData.length);

        // Create chart
        this.chart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderColor: '#ffffff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                onClick: (event, elements) => {
                    if (elements.length > 0) {
                        const index = elements[0].index;
                        const merchantName = this.chart.data.labels[index];
                        const merchantAmount = this.chart.data.datasets[0].data[index];

                        const clickEvent = new CustomEvent('merchantClick', {
                            detail: { merchant: merchantName, totalAmount: merchantAmount, index }
                        });
                        document.dispatchEvent(clickEvent);
                    }
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        rtl: false,
                        labels: {
                            padding: 15,
                            font: {
                                size: 12
                            },
                            generateLabels: (chart) => {
                                const data = chart.data;
                                if (data.labels.length && data.datasets.length) {
                                    return data.labels.map((label, i) => {
                                        const value = data.datasets[0].data[i];
                                        const percentage = ((value / totalExpenses) * 100).toFixed(1);
                                        return {
                                            text: `${label} (₪${FormatUtils.formatCurrency(value)} - ${percentage}%)`,
                                            fillStyle: data.datasets[0].backgroundColor[i],
                                            hidden: false,
                                            index: i
                                        };
                                    });
                                }
                                return [];
                            }
                        }
                    },
                    tooltip: {
                        rtl: false,
                        callbacks: {
                            label: (context) => {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const percentage = ((value / totalExpenses) * 100).toFixed(1);
                                return `${label}: ₪${FormatUtils.formatCurrency(value)} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });

        // Attach context menu handler
        this.attachLegendContextMenu(canvas);

        return this.chart;
    }

    /**
     * Attach context menu handler to canvas for pie slice and legend interactions
     */
    attachLegendContextMenu(canvas) {
        canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();

            let clickedItem = null;

            // Get click position relative to canvas
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            console.log('Right-click at position:', x, y);

            // First, check if we clicked on a pie slice
            const elements = this.chart.getElementsAtEventForMode(
                e,
                'nearest',
                { intersect: true },
                false
            );

            console.log('Elements at position:', elements);

            if (elements.length > 0) {
                // Clicked on a pie slice
                const element = elements[0];
                const index = element.index;
                clickedItem = {
                    merchant: this.chart.data.labels[index],
                    index: index
                };
                console.log('Clicked on pie slice:', clickedItem);
            } else {
                // Check if we clicked on a legend item
                const legend = this.chart.legend;
                if (!legend || !legend.legendItems) {
                    console.log('No legend found');
                    return;
                }

                console.log('Legend bounds:', {
                    left: legend.left,
                    right: legend.right,
                    top: legend.top,
                    bottom: legend.bottom
                });

                // Check if click is within legend bounds
                if (x >= legend.left && x <= legend.right && y >= legend.top && y <= legend.bottom) {
                    // Find which legend item was clicked
                    legend.legendItems.forEach((item, index) => {
                        const hitbox = legend.legendHitBoxes?.[index];

                        if (hitbox) {
                            console.log(`Legend item ${index} hitbox:`, hitbox);
                            if (x >= hitbox.left &&
                                x <= hitbox.left + hitbox.width &&
                                y >= hitbox.top &&
                                y <= hitbox.top + hitbox.height) {
                                clickedItem = {
                                    merchant: this.chart.data.labels[index],
                                    index: index
                                };
                                console.log('Clicked on legend item:', clickedItem);
                            }
                        }
                    });
                } else {
                    console.log('Click outside legend bounds');
                }
            }

            if (clickedItem) {
                console.log('Dispatching legendRightClick event for:', clickedItem.merchant);
                // Dispatch event to show context menu
                const event = new CustomEvent('legendRightClick', {
                    detail: {
                        merchant: clickedItem.merchant,
                        index: clickedItem.index,
                        x: e.clientX,
                        y: e.clientY
                    }
                });
                document.dispatchEvent(event);
            } else {
                console.log('No pie slice or legend item clicked');
            }
        });
    }

    /**
     * Generate distinct colors for chart segments
     */
    generateColors(count) {
        // Predefined color palette with distinct, visually appealing colors
        const palette = [
            '#667eea', '#764ba2', '#f093fb', '#4facfe',
            '#43e97b', '#fa709a', '#fee140', '#30cfd0',
            '#a8edea', '#fed6e3', '#c471f5', '#ffc837',
            '#ff8008', '#e65c00', '#11998e', '#38ef7d'
        ];

        // If we need more colors than in palette, generate them
        if (count <= palette.length) {
            return palette.slice(0, count);
        }

        // Generate additional colors using HSL
        const colors = [...palette];
        for (let i = palette.length; i < count; i++) {
            const hue = (i * 137.508) % 360; // Golden angle for good distribution
            colors.push(`hsl(${hue}, 70%, 60%)`);
        }

        return colors;
    }

    /**
     * Render trend chart (bar chart) for monthly data
     */
    renderTrendChart(labels, amounts, merchantName) {
        const canvas = document.getElementById('merchantTrendChart');
        const ctx = canvas.getContext('2d');

        // Destroy existing trend chart if it exists
        if (this.trendChart) {
            this.trendChart.destroy();
        }

        // Calculate stats for tooltips
        const totalAmount = amounts.reduce((sum, amt) => sum + amt, 0);
        const avgAmount = totalAmount / amounts.length;

        // Create bar chart
        this.trendChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Amount (₪)',
                    data: amounts,
                    backgroundColor: '#667eea',
                    borderColor: '#764ba2',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        rtl: false,
                        callbacks: {
                            label: (context) => {
                                const value = context.parsed.y || 0;
                                const percentage = ((value / totalAmount) * 100).toFixed(1);
                                const comparison = value > avgAmount ? 'above' : 'below';
                                const diff = Math.abs(value - avgAmount);

                                return [
                                    `Amount: ₪${FormatUtils.formatCurrency(value)}`,
                                    `${percentage}% of total`,
                                    `${comparison} average: ₪${FormatUtils.formatCurrency(diff)}`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => `₪${FormatUtils.formatNumber(value)}`
                        }
                    },
                    x: {
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45,
                            font: {
                                size: 11
                            }
                        }
                    }
                }
            }
        });

        return this.trendChart;
    }

    /**
     * Destroy the trend chart only
     */
    destroyTrendChart() {
        if (this.trendChart) {
            this.trendChart.destroy();
            this.trendChart = null;
        }
    }

    /**
     * Destroy all charts
     */
    destroy() {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
        if (this.trendChart) {
            this.trendChart.destroy();
            this.trendChart = null;
        }
    }
}
