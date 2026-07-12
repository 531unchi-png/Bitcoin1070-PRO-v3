// =====================================
// Chart Manager v3.0
// Bitcoin1070 PRO
// =====================================

let assetChartInstance = null;

// =====================================
// グラフ用データ作成
// =====================================

function createChartData(evaluations) {
    return evaluations
        .filter(asset =>
            Number(asset.marketValueJpy) > 0
        )
        .sort(
            (a, b) =>
                b.marketValueJpy -
                a.marketValueJpy
        )
        .map(asset => ({
            label: asset.symbol,
            name: asset.name,
            value: Math.round(
                asset.marketValueJpy
            )
        }));
}

// =====================================
// 円グラフ描画
// =====================================

function drawPortfolioChartV3(evaluations) {
    const canvas =
        document.getElementById("assetChart");

    if (!canvas) {
        console.warn(
            "assetChartが見つかりません"
        );

        return;
    }

    if (typeof Chart === "undefined") {
        console.error(
            "Chart.jsが読み込まれていません"
        );

        return;
    }

    const chartData =
        createChartData(evaluations);

    if (assetChartInstance) {
        assetChartInstance.destroy();
        assetChartInstance = null;
    }

    if (chartData.length === 0) {
        return;
    }

    assetChartInstance =
        new Chart(canvas, {
            type: "doughnut",

            data: {
                labels: chartData.map(
                    item => item.label
                ),

                datasets: [
                    {
                        data: chartData.map(
                            item => item.value
                        ),

                        borderWidth: 1,
                        hoverOffset: 12
                    }
                ]
            },

            options: {
                responsive: true,
                maintainAspectRatio: true,

                cutout: "55%",

                plugins: {
                    legend: {
                        position: "bottom",

                        labels: {
                            padding: 14,
                            usePointStyle: true
                        }
                    },

                    tooltip: {
                        callbacks: {
                            label(context) {
                                const value =
                                    Number(
                                        context.raw
                                    ) || 0;

                                const total =
                                    context.dataset.data
                                        .reduce(
                                            (
                                                sum,
                                                current
                                            ) =>
                                                sum +
                                                Number(
                                                    current
                                                ),
                                            0
                                        );

                                const percentage =
                                    total > 0
                                        ? (
                                            value /
                                            total *
                                            100
                                        ).toFixed(1)
                                        : "0.0";

                                return (
                                    `${context.label}: ` +
                                    `¥${value.toLocaleString(
                                        "ja-JP"
                                    )} ` +
                                    `(${percentage}%)`
                                );
                            }
                        }
                    }
                }
            }
        });
}

// 旧関数名との互換性
function drawPortfolioChart(evaluations) {
    drawPortfolioChartV3(evaluations);
}
