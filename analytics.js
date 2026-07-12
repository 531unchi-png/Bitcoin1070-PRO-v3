// =====================================
// Portfolio Analytics v1.2
// ジャンル別合計
// ジャンル別円グラフ
// 資産推移
// 期間切替
// 系列切替
// 期間統計
// =====================================

const ASSET_HISTORY_KEY =
    "bitcoin1070_v3_asset_history";

const ASSET_HISTORY_MAX_DAYS = 1000;

let assetHistoryChartInstance = null;
let categoryChartInstance = null;

let selectedHistoryDays = 30;
let selectedHistorySeries = "total";

// =====================================
// 資産履歴の保存・読込
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
                    a.date.localeCompare(
                        b.date
                    )
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
// 日付処理
// =====================================

function getLocalDateKey(
    date = new Date()
) {
    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            date.getDate()
        ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function formatHistoryDate(
    dateString
) {
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

        if (
            asset.type === "crypto"
        ) {
            totals.crypto += value;
        }

        if (
            asset.type === "jp"
        ) {
            totals.jp += value;
        }

        if (
            asset.type === "us"
        ) {
            totals.us += value;
        }
    });

    return totals;
}

// =====================================
// ジャンル別金額表示
// =====================================

function renderCategoryTotals(
    totals
) {
    const cryptoElement =
        document.getElementById(
            "cryptoTotal"
        );

    const jpElement =
        document.getElementById(
            "jpStockTotal"
        );

    const usElement =
        document.getElementById(
            "usStockTotal"
        );

    if (cryptoElement) {
        cryptoElement.textContent =
            formatYen(
                totals.crypto
            );
    }

    if (jpElement) {
        jpElement.textContent =
            formatYen(
                totals.jp
            );
    }

    if (usElement) {
        usElement.textContent =
            formatYen(
                totals.us
            );
    }
}

// =====================================
// ジャンル別円グラフ
// =====================================

function drawCategoryChart(
    totals
) {
    console.log(
        "ジャンル別円グラフ描画",
        totals
    );

    const canvas =
        document.getElementById(
            "categoryChart"
        );

    if (!canvas) {
        console.error(
            "categoryChartが見つかりません"
        );

        return;
    }

    if (
        typeof Chart === "undefined"
    ) {
        console.error(
            "Chart.jsが読み込まれていません"
        );

        return;
    }

    if (
        categoryChartInstance
    ) {
        categoryChartInstance
            .destroy();

        categoryChartInstance =
            null;
    }

    const labels = [
        "仮想通貨",
        "日本株",
        "米国株"
    ];

    const values = [
        Math.round(
            totals.crypto
        ),
        Math.round(
            totals.jp
        ),
        Math.round(
            totals.us
        )
    ];

    const total =
        values.reduce(
            (sum, value) =>
                sum + value,
            0
        );

    categoryChartInstance =
        new Chart(
            canvas,
            {
                type: "doughnut",

                data: {
                    labels,

                    datasets: [
                        {
                            data: values,
                            borderWidth: 1,
                            hoverOffset: 12
                        }
                    ]
                },

                options: {
                    responsive: true,
                    maintainAspectRatio:
                        false,

                    cutout: "55%",

                    plugins: {
                        legend: {
                            position:
                                "bottom",

                            labels: {
                                padding: 14,
                                usePointStyle:
                                    true
                            }
                        },

                        tooltip: {
                            callbacks: {
                                label(
                                    context
                                ) {
                                    const value =
                                        Number(
                                            context.raw
                                        ) || 0;

                                    const rate =
                                        total > 0
                                            ? value /
                                              total *
                                              100
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
            }
        );
}

// =====================================
// 1日1件の資産履歴
// 同じ日は最新値へ上書き
// =====================================

function recordDailyAssetTotal(
    totals
) {
    const today =
        getLocalDateKey();

    let history =
        loadAssetHistory();

    const todayIndex =
        history.findIndex(
            item =>
                item.date === today
        );

    const record = {
        date: today,

        total:
            Math.round(
                totals.total
            ),

        crypto:
            Math.round(
                totals.crypto
            ),

        jp:
            Math.round(
                totals.jp
            ),

        us:
            Math.round(
                totals.us
            ),

        updatedAt:
            new Date()
                .toISOString()
    };

    if (
        todayIndex >= 0
    ) {
        history[todayIndex] =
            record;
    } else {
        history.push(
            record
        );
    }

    history.sort(
        (a, b) =>
            a.date.localeCompare(
                b.date
            )
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

    saveAssetHistory(
        history
    );

    return history;
}

// =====================================
// 指定期間の履歴抽出
// =====================================

function filterHistoryByDays(
    history,
    days
) {
    if (
        days === "all"
    ) {
        return [
            ...history
        ];
    }

    const numericDays =
        Number(days) || 30;

    const startDate =
        new Date();

    startDate.setHours(
        0,
        0,
        0,
        0
    );

    startDate.setDate(
        startDate.getDate() -
        (numericDays - 1)
    );

    return history.filter(
        item => {
            const itemDate =
                new Date(
                    `${item.date}T00:00:00`
                );

            return (
                itemDate >=
                startDate
            );
        }
    );
}

// =====================================
// 選択中の系列情報
// =====================================

function getSelectedSeriesInfo() {
    const seriesMap = {
        total: {
            key: "total",
            label: "総資産"
        },

        crypto: {
            key: "crypto",
            label: "仮想通貨"
        },

        jp: {
            key: "jp",
            label: "日本株"
        },

        us: {
            key: "us",
            label: "米国株"
        }
    };

    return (
        seriesMap[
            selectedHistorySeries
        ] ||
        seriesMap.total
    );
}

// =====================================
// 期間統計
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

    if (
        history.length === 0
    ) {
        [
            changeElement,
            rateElement,
            highElement,
            lowElement
        ].forEach(
            element => {
                if (element) {
                    element.textContent =
                        "--";

                    element.className =
                        "";
                }
            }
        );

        return;
    }

    const seriesInfo =
        getSelectedSeriesInfo();

    const values =
        history.map(
            item =>
                Number(
                    item[
                        seriesInfo.key
                    ]
                ) || 0
        );

    const first =
        values[0];

    const last =
        values[
            values.length - 1
        ];

    const difference =
        last - first;

    const rate =
        first > 0
            ? difference /
              first *
              100
            : 0;

    const high =
        Math.max(
            ...values
        );

    const low =
        Math.min(
            ...values
        );

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
            `${difference >= 0
                ? "+"
                : ""}` +
            formatYen(
                difference
            );
    }

    if (rateElement) {
        rateElement.className =
            profitClass;

        rateElement.textContent =
            `${rate >= 0
                ? "+"
                : ""}` +
            `${rate.toFixed(2)}%`;
    }

    if (highElement) {
        highElement.textContent =
            formatYen(
                high
            );
    }

    if (lowElement) {
        lowElement.textContent =
            formatYen(
                low
            );
    }
}

// =====================================
// 資産推移の折れ線グラフ
// =====================================

function drawAssetHistoryChart(
    history,
    days =
        selectedHistoryDays
) {
    const canvas =
        document.getElementById(
            "assetHistoryChart"
        );

    if (!canvas) {
        console.error(
            "assetHistoryChartが見つかりません"
        );

        return;
    }

    if (
        typeof Chart === "undefined"
    ) {
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

    if (
        assetHistoryChartInstance
    ) {
        assetHistoryChartInstance
            .destroy();

        assetHistoryChartInstance =
            null;
    }

    const seriesInfo =
        getSelectedSeriesInfo();

    const labels =
        filtered.map(
            item =>
                formatHistoryDate(
                    item.date
                )
        );

    const values =
        filtered.map(
            item =>
                Number(
                    item[
                        seriesInfo.key
                    ]
                ) || 0
        );

    assetHistoryChartInstance =
        new Chart(
            canvas,
            {
                type: "line",

                data: {
                    labels,

                    datasets: [
                        {
                            label:
                                seriesInfo.label,

                            data:
                                values,

                            tension:
                                0.25,

                            fill:
                                true,

                            borderWidth:
                                3,

                            pointRadius:
                                values.length <= 14
                                    ? 4
                                    : 1,

                            pointHoverRadius:
                                6
                        }
                    ]
                },

                options: {
                    responsive: true,

                    maintainAspectRatio:
                        false,

                    interaction: {
                        mode:
                            "index",

                        intersect:
                            false
                    },

                    scales: {
                        y: {
                            ticks: {
                                callback(
                                    value
                                ) {
                                    return (
                                        "¥" +
                                        Number(
                                            value
                                        ).toLocaleString(
                                            "ja-JP"
                                        )
                                    );
                                }
                            }
                        }
                    },

                    plugins: {
                        legend: {
                            display:
                                false
                        },

                        tooltip: {
                            callbacks: {
                                label(
                                    context
                                ) {
                                    return (
                                        `${seriesInfo.label}：` +
                                        formatYen(
                                            context.raw
                                        )
                                    );
                                }
                            }
                        }
                    }
                }
            }
        );

    renderHistoryStatistics(
        filtered
    );

    updateHistoryStatus(
        filtered,
        days
    );
}

// =====================================
// グラフ下の状態表示
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

    const seriesInfo =
        getSelectedSeriesInfo();

    const periodText =
        days === "all"
            ? "全期間"
            : `${days}日`;

    if (
        filtered.length === 0
    ) {
        status.textContent =
            "まだ資産履歴がありません";

        return;
    }

    if (
        filtered.length === 1
    ) {
        status.textContent =
            `${seriesInfo.label}｜` +
            "本日から記録開始。毎日開くと履歴が増えます。";

        return;
    }

    status.textContent =
        `${seriesInfo.label}｜` +
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

    buttons.forEach(
        button => {
            button.addEventListener(
                "click",
                () => {
                    const value =
                        button.dataset.days;

                    selectedHistoryDays =
                        value === "all"
                            ? "all"
                            : Number(
                                value
                            );

                    buttons.forEach(
                        item =>
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
        }
    );

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
// 系列ボタン
// 総資産・仮想通貨・日本株・米国株
// =====================================

function setupHistorySeriesButtons() {
    const buttons =
        document.querySelectorAll(
            ".history-series-buttons button[data-series]"
        );

    buttons.forEach(
        button => {
            button.addEventListener(
                "click",
                () => {
                    selectedHistorySeries =
                        button.dataset.series ||
                        "total";

                    buttons.forEach(
                        item =>
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
        }
    );

    const initialButton =
        document.querySelector(
            '.history-series-buttons button[data-series="total"]'
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
    if (
        !Array.isArray(
            evaluations
        )
    ) {
        return;
    }

    const totals =
        calculateCategoryTotals(
            evaluations
        );

    renderCategoryTotals(
        totals
    );

    drawCategoryChart(
        totals
    );

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
// portfolio.jsの更新処理へ接続
// =====================================

const originalRefreshPortfolio =
    refreshPortfolio;

refreshPortfolio =
    function () {
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

        setupHistorySeriesButtons();

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
