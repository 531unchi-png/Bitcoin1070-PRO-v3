// =====================================
// Portfolio Analytics v1.0
// ジャンル別合計・資産推移
// =====================================

const ASSET_HISTORY_KEY =
    "bitcoin1070_v3_asset_history";

const ASSET_HISTORY_MAX_DAYS = 400;

let assetHistoryChartInstance = null;
let selectedHistoryDays = 30;

// =====================================
// 履歴の保存・読み込み
// =====================================

function loadAssetHistory() {
    try {
        const saved =
            localStorage.getItem(ASSET_HISTORY_KEY);

        if (!saved) {
            return [];
        }

        const parsed = JSON.parse(saved);

        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed.filter(item =>
            item &&
            typeof item.date === "string" &&
            Number.isFinite(Number(item.total))
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

function getLocalDateKey(date = new Date()) {
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
        new Date(`${dateString}T00:00:00`);

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

function calculateCategoryTotals(evaluations) {
    const totals = {
        crypto: 0,
        jp: 0,
        us: 0,
        total: 0
    };

    evaluations.forEach(asset => {
        const value =
            Number(asset.marketValueJpy) || 0;

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

// =====================================
// ジャンル別資産表示
// =====================================

function renderCategoryTotals(totals) {
    const cryptoElement =
        document.getElementById("cryptoTotal");

    const jpElement =
        document.getElementById("jpStockTotal");

    const usElement =
        document.getElementById("usStockTotal");

    if (cryptoElement) {
        cryptoElement.textContent =
            formatYen(totals.crypto);
    }

    if (jpElement) {
        jpElement.textContent =
            formatYen(totals.jp);
    }

    if (usElement) {
        usElement.textContent =
            formatYen(totals.us);
    }
}

// =====================================
// 今日の資産を記録
// 同じ日は最新金額に更新
// =====================================

function recordDailyAssetTotal(totals) {
    const today = getLocalDateKey();

    let history = loadAssetHistory();

    const todayIndex =
        history.findIndex(
            item => item.date === today
        );

    const todayData = {
        date: today,
        total: Math.round(totals.total),
        crypto: Math.round(totals.crypto),
        jp: Math.round(totals.jp),
        us: Math.round(totals.us),
        updatedAt: new Date().toISOString()
    };

    if (todayIndex >= 0) {
        history[todayIndex] = todayData;
    } else {
        history.push(todayData);
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
// 指定日数の履歴
// =====================================

function filterHistoryByDays(
    history,
    days
) {
    const startDate = new Date();

    startDate.setHours(0, 0, 0, 0);

    startDate.setDate(
        startDate.getDate() - (days - 1)
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
            "Chart.jsが読み込まれていません"
        );

        return;
    }

    const filtered =
        filterHistoryByDays(
            history,
            days
        );

    if (assetHistoryChartInstance) {
        assetHistoryChartInstance.destroy();
        assetHistoryChartInstance = null;
    }

    const labels =
        filtered.map(item =>
            formatHistoryDate(item.date)
        );

    const values =
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
                        data: values,
                        tension: 0.25,
                        fill: true,
                        borderWidth: 3,
                        pointRadius:
                            values.length <= 10
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

    if (filtered.length === 0) {
        status.textContent =
            "まだ資産履歴がありません";

        return;
    }

    if (filtered.length === 1) {
        status.textContent =
            `本日から記録開始。${days}日表示には今後の記録が追加されます。`;

        return;
    }

    const first =
        Number(filtered[0].total) || 0;

    const last =
        Number(
            filtered[
                filtered.length - 1
            ].total
        ) || 0;

    const difference =
        last - first;

    const rate =
        first > 0
            ? difference / first * 100
            : 0;

    const sign =
        difference > 0 ? "+" : "";

    status.textContent =
        `${days}日表示｜変動：` +
        `${sign}${formatYen(difference)} ` +
        `（${sign}${rate.toFixed(2)}%）`;
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
                selectedHistoryDays =
                    Number(
                        button.dataset.days
                    ) || 30;

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
            `.period-buttons button[data-days="${selectedHistoryDays}"]`
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
        recordDailyAssetTotal(totals);

    drawAssetHistoryChart(
        history,
        selectedHistoryDays
    );
}

// =====================================
// portfolio.jsの更新処理へ接続
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
