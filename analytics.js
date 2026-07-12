// =====================================
// Portfolio Analytics v1.1
// ジャンル別合計・資産推移・期間統計
// =====================================

const ASSET_HISTORY_KEY =
    "bitcoin1070_v3_asset_history";

const ASSET_HISTORY_MAX_DAYS = 1000;

let assetHistoryChartInstance = null;
let categoryChartInstance = null;
let selectedHistoryDays = 30;

// =====================================
// 保存・読込
// =====================================

function loadAssetHistory() {
    try {
        const saved =
            localStorage.getItem(
                ASSET_HISTORY_KEY
            );

        if (!saved) {
            return [];
        }

        const parsed = JSON.parse(saved);

        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed
            .filter(item =>
                item &&
                typeof item.date === "string" &&
                Number.isFinite(
                    Number(item.total)
                )
            )
            .sort(
                (a, b) =>
                    a.date.localeCompare(b.date)
            );

    } catch (error) {
        console.error(
            "資産履歴の読込エラー:",
            error
        );

        return [];
    }
}

function saveAssetHistory(history) {
    try {
        localStorage.setItem(
            ASSET_HISTORY_KEY,
            JSON.stringify(history)
        );
    } catch (error) {
        console.error(
            "資産履歴の保存エラー:",
            error
        );
    }
}

// =====================================
// 日付
// =====================================

function getLocalDateKey(
    date = new Date()
) {
    const year = date.getFullYear();

    const month =
        String(date.getMonth() + 1)
            .padStart(2, "0");

    const day =
        String(date.getDate())
            .padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function formatHistoryDate(dateString) {
    const date =
        new Date(
            `${dateString}T00:00:00`
        );

    return date.toLocaleDateString(
        "ja-JP",
        {
            month: "numeric",
            day: "numeric"
        }
    );
}

// =====================================
// ジャンル別集計
// =====================================

function calculateCategoryTotals(
    evaluations
) {
    const totals = {
        crypto: 0,
        jp: 0,
        us: 0,
        total: 0
    };

    evaluations.forEach(asset => {
        const value =
            Number(
                asset.marketValueJpy
            ) || 0;

        totals.total += value;

        if (asset.type === "crypto") {
            totals.crypto += value;
        }

        if (asset.type === "jp") {
            totals.jp += value;
        }

        if (asset.type === "us") {
            totals.us += value;
        }
    });

    return totals;
}

function renderCategoryTotals(totals) {
    const crypto =
        document.getElementById(
            "cryptoTotal"
        );

    const jp =
        document.getElementById(
            "jpStockTotal"
        );

    const us =
        document.getElementById(
            "usStockTotal"
        );

    if (crypto) {
        crypto.textContent =
            formatYen(totals.crypto);
    }

    if (jp) {
        jp.textContent =
            formatYen(totals.jp);
    }

    if (us) {
        us.textContent =
            formatYen(totals.us);
    }
}
// =====================================
// ジャンル別円グラフ
// =====================================

function drawCategoryChart(totals) {
    const canvas =
        document.getElementById(
            "categoryChart"
        );

    if (!canvas) {
        return;
    }

    if (typeof Chart === "undefined") {
        return;
    }

    if (categoryChartInstance) {
        categoryChartInstance.destroy();
        categoryChartInstance = null;
    }

    const labels = [
        "仮想通貨",
        "日本株",
        "米国株"
    ];

    const values = [
        Math.round(totals.crypto),
        Math.round(totals.jp),
        Math.round(totals.us)
    ];

    categoryChartInstance =
        new Chart(canvas, {
            type: "doughnut",

            data: {
                labels,

                datasets: [{
                    data: values,
                    borderWidth: 1,
                    hoverOffset: 12
                }]
            },

            options: {
                responsive: true,
                cutout: "55%",

                plugins: {
                    legend: {
                        position: "bottom"
                    },

                    tooltip: {
                        callbacks: {
                            label(context) {
                                const value =
                                    Number(context.raw) || 0;

                                const total =
                                    values.reduce(
                                        (sum, item) =>
                                            sum + item,
                                        0
                                    );

                                const rate =
                                    total > 0
                                        ? value / total * 100
                                        : 0;

                                return (
                                    `${context.label}：` +
                                    `${formatYen(value)} ` +
                                    `(${rate.toFixed(1)}%)`
                                );
                            }
                        }
                    }
                }
            }
        });
}

// =====================================
// 1日1件の資産記録
// =====================================

function recordDailyAssetTotal(totals) {
    const today = getLocalDateKey();

    let history = loadAssetHistory();

    const todayIndex =
        history.findIndex(
            item => item.date === today
        );

    const record = {
        date: today,
        total: Math.round(
            totals.total
        ),
        crypto: Math.round(
            totals.crypto
        ),
        jp: Math.round(totals.jp),
        us: Math.round(totals.us),
        updatedAt:
            new Date().toISOString()
    };

    if (todayIndex >= 0) {
        history[todayIndex] = record;
    } else {
        history.push(record);
    }

    history.sort(
        (a, b) =>
            a.date.localeCompare(b.date)
    );

    if (
        history.length >
        ASSET_HISTORY_MAX_DAYS
    ) {
        history =
            history.slice(
                -ASSET_HISTORY_MAX_DAYS
            );
    }

    saveAssetHistory(history);

    return history;
}

// =====================================
// 期間抽出
// =====================================

function filterHistoryByDays(
    history,
    days
) {
    if (days === "all") {
        return [...history];
    }

    const numericDays =
        Number(days) || 30;

    const startDate = new Date();

    startDate.setHours(0, 0, 0, 0);

    startDate.setDate(
        startDate.getDate() -
        (numericDays - 1)
    );

    return history.filter(item => {
        const itemDate =
            new Date(
                `${item.date}T00:00:00`
            );

        return itemDate >= startDate;
    });
}

// =====================================
// 統計表示
// =====================================

function renderHistoryStatistics(
    history
) {
    const changeElement =
        document.getElementById(
            "historyChange"
        );

    const rateElement =
        document.getElementById(
            "historyRate"
        );

    const highElement =
        document.getElementById(
            "historyHigh"
        );

    const lowElement =
        document.getElementById(
            "historyLow"
        );

    if (history.length === 0) {
        [changeElement,
         rateElement,
         highElement,
         lowElement]
            .forEach(element => {
                if (element) {
                    element.textContent =
                        "--";
                }
            });

        return;
    }

    const values =
        history.map(item =>
            Number(item.total) || 0
        );

    const first = values[0];
    const last =
        values[values.length - 1];

    const difference =
        last - first;

    const rate =
        first > 0
            ? difference / first * 100
            : 0;

    const high = Math.max(...values);
    const low = Math.min(...values);

    const profitClass =
        difference > 0
            ? "profit-positive"
            : difference < 0
                ? "profit-negative"
                : "profit-neutral";

    if (changeElement) {
        changeElement.className =
            profitClass;

        changeElement.textContent =
            `${difference >= 0 ? "+" : ""}` +
            formatYen(difference);
    }

    if (rateElement) {
        rateElement.className =
            profitClass;

        rateElement.textContent =
            `${rate >= 0 ? "+" : ""}` +
            `${rate.toFixed(2)}%`;
    }

    if (highElement) {
        highElement.textContent =
            formatYen(high);
    }

    if (lowElement) {
        lowElement.textContent =
            formatYen(low);
    }
}

// =====================================
// 折れ線グラフ
// =====================================

function drawAssetHistoryChart(
    history,
    days = selectedHistoryDays
) {
    const canvas =
        document.getElementById(
            "assetHistoryChart"
        );

    if (!canvas) {
        return;
    }

    if (typeof Chart === "undefined") {
        console.error(
            "Chart.jsがありません"
        );

        return;
    }

    const filtered =
        filterHistoryByDays(
            history,
            days
        );

    if (assetHistoryChartInstance) {
        assetHistoryChartInstance
            .destroy();

        assetHistoryChartInstance =
            null;
    }

    const labels =
        filtered.map(item =>
            formatHistoryDate(
                item.date
            )
        );

    const totalValues =
        filtered.map(item =>
            Number(item.total) || 0
        );

    assetHistoryChartInstance =
        new Chart(canvas, {
            type: "line",

            data: {
                labels,

                datasets: [
                    {
                        label: "総資産",
                        data: totalValues,
                        tension: 0.25,
                        fill: true,
                        borderWidth: 3,
                        pointRadius:
                            totalValues.length <= 14
                                ? 4
                                : 1,
                        pointHoverRadius: 6
                    }
                ]
            },

            options: {
                responsive: true,
                maintainAspectRatio: false,

                interaction: {
                    mode: "index",
                    intersect: false
                },

                scales: {
                    y: {
                        ticks: {
                            callback(value) {
                                return (
                                    "¥" +
                                    Number(value)
                                        .toLocaleString(
                                            "ja-JP"
                                        )
                                );
                            }
                        }
                    }
                },

                plugins: {
                    legend: {
                        display: false
                    },

                    tooltip: {
                        callbacks: {
                            label(context) {
                                return (
                                    "総資産：" +
                                    formatYen(
                                        context.raw
                                    )
                                );
                            }
                        }
                    }
                }
            }
        });

    renderHistoryStatistics(
        filtered
    );

    updateHistoryStatus(
        filtered,
        days
    );
}

// =====================================
// 状態表示
// =====================================

function updateHistoryStatus(
    filtered,
    days
) {
    const status =
        document.getElementById(
            "historyStatus"
        );

    if (!status) {
        return;
    }

    const periodText =
        days === "all"
            ? "全期間"
            : `${days}日`;

    if (filtered.length === 0) {
        status.textContent =
            "まだ資産履歴がありません";

        return;
    }

    if (filtered.length === 1) {
        status.textContent =
            "本日から記録開始。毎日開くと履歴が増えます。";

        return;
    }

    status.textContent =
        `${periodText}表示｜` +
        `${filtered.length}日分の記録`;
}

// =====================================
// 期間ボタン
// =====================================

function setupHistoryPeriodButtons() {
    const buttons =
        document.querySelectorAll(
            ".period-buttons button[data-days]"
        );

    buttons.forEach(button => {
        button.addEventListener(
            "click",
            () => {
                const value =
                    button.dataset.days;

                selectedHistoryDays =
                    value === "all"
                        ? "all"
                        : Number(value);

                buttons.forEach(item =>
                    item.classList.remove(
                        "active"
                    )
                );

                button.classList.add(
                    "active"
                );

                drawAssetHistoryChart(
                    loadAssetHistory(),
                    selectedHistoryDays
                );
            }
        );
    });

    const initialButton =
        document.querySelector(
            '.period-buttons button[data-days="30"]'
        );

    if (initialButton) {
        initialButton.classList.add(
            "active"
        );
    }
}

// =====================================
// 全分析更新
// =====================================

function updatePortfolioAnalytics(
    evaluations
) {
    if (!Array.isArray(evaluations)) {
        return;
    }

    const totals =
        calculateCategoryTotals(
            evaluations
        );

    renderCategoryTotals(totals);

    const history =
        recordDailyAssetTotal(
            totals
        );

    drawAssetHistoryChart(
        history,
        selectedHistoryDays
    );
}

// =====================================
// portfolio.jsへ接続
// =====================================

const originalRefreshPortfolio =
    refreshPortfolio;

refreshPortfolio = function () {
    originalRefreshPortfolio();

    updatePortfolioAnalytics(
        latestEvaluations
    );
};

// =====================================
// 起動
// =====================================

document.addEventListener(
    "DOMContentLoaded",
    () => {
        setupHistoryPeriodButtons();

        if (
            Array.isArray(
                latestEvaluations
            ) &&
            latestEvaluations.length > 0
        ) {
            updatePortfolioAnalytics(
                latestEvaluations
            );
        } else {
            drawAssetHistoryChart(
                loadAssetHistory(),
                selectedHistoryDays
            );
        }
    }
);
