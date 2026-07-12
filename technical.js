// =====================================
// Technical Analysis Engine v1.0
// MACD・RSI・移動平均線・出来高
// =====================================

const TECHNICAL_SYMBOL_MAP = {
    BTC: "BTC-USD",
    ETH: "ETH-USD",
    XRP: "XRP-USD",
    SOL: "SOL-USD",
    SUI: "SUI20947-USD",
    RENDER: "RENDER-USD",

    NVDA: "NVDA",
    MHI: "7011.T",
    ADVT: "6857.T",
    FJK: "5803.T",
    VRAIN: "135A.T"
};

let technicalAnalysisRunning = false;

// =====================================
// 共通
// =====================================

function technicalClamp(
    value,
    min,
    max
) {
    return Math.min(
        max,
        Math.max(min, value)
    );
}

function technicalRound(
    value,
    digits = 2
) {
    const number =
        Number(value);

    if (!Number.isFinite(number)) {
        return 0;
    }

    return Number(
        number.toFixed(digits)
    );
}

function getTechnicalYahooSymbol(
    asset
) {
    const custom =
        String(
            asset.yahooSymbol || ""
        ).trim();

    if (custom) {
        return custom;
    }

    return (
        TECHNICAL_SYMBOL_MAP[
            asset.symbol
        ] || ""
    );
}

// =====================================
// 単純移動平均
// =====================================

function calculateSMA(
    values,
    period
) {
    if (
        !Array.isArray(values) ||
        values.length < period
    ) {
        return null;
    }

    const selected =
        values.slice(-period);

    const total =
        selected.reduce(
            (sum, value) =>
                sum + Number(value),
            0
        );

    return total / period;
}

// =====================================
// EMA配列
// =====================================

function calculateEMAArray(
    values,
    period
) {
    if (
        !Array.isArray(values) ||
        values.length < period
    ) {
        return [];
    }

    const multiplier =
        2 / (period + 1);

    const result = [];

    let previousEMA =
        values
            .slice(0, period)
            .reduce(
                (sum, value) =>
                    sum + Number(value),
                0
            ) / period;

    for (
        let index = 0;
        index < values.length;
        index++
    ) {
        if (index < period - 1) {
            result.push(null);
            continue;
        }

        if (index === period - 1) {
            result.push(previousEMA);
            continue;
        }

        const currentEMA =
            Number(values[index]) *
            multiplier +
            previousEMA *
            (1 - multiplier);

        result.push(currentEMA);

        previousEMA =
            currentEMA;
    }

    return result;
}

// =====================================
// MACD
// =====================================

function calculateMACD(
    closes
) {
    const ema12 =
        calculateEMAArray(
            closes,
            12
        );

    const ema26 =
        calculateEMAArray(
            closes,
            26
        );

    const macdLine =
        closes.map(
            (_, index) => {
                if (
                    ema12[index] == null ||
                    ema26[index] == null
                ) {
                    return null;
                }

                return (
                    ema12[index] -
                    ema26[index]
                );
            }
        );

    const validMacd =
        macdLine.filter(
            value =>
                value != null &&
                Number.isFinite(value)
        );

    const signalValid =
        calculateEMAArray(
            validMacd,
            9
        );

    const signalLine =
        Array(
            macdLine.length
        ).fill(null);

    let signalIndex = 0;

    macdLine.forEach(
        (value, index) => {
            if (value == null) {
                return;
            }

            signalLine[index] =
                signalValid[
                    signalIndex
                ] ?? null;

            signalIndex++;
        }
    );

    const validIndexes =
        macdLine
            .map((value, index) => ({
                value,
                index
            }))
            .filter(
                item =>
                    item.value != null &&
                    signalLine[
                        item.index
                    ] != null
            );

    if (
        validIndexes.length < 2
    ) {
        return {
            macd: 0,
            signal: 0,
            histogram: 0,
            cross: "none"
        };
    }

    const latest =
        validIndexes[
            validIndexes.length - 1
        ].index;

    const previous =
        validIndexes[
            validIndexes.length - 2
        ].index;

    const latestMacd =
        macdLine[latest];

    const latestSignal =
        signalLine[latest];

    const previousMacd =
        macdLine[previous];

    const previousSignal =
        signalLine[previous];

    let cross = "none";

    if (
        previousMacd <=
            previousSignal &&
        latestMacd >
            latestSignal
    ) {
        cross = "golden";
    }

    if (
        previousMacd >=
            previousSignal &&
        latestMacd <
            latestSignal
    ) {
        cross = "dead";
    }

    return {
        macd:
            technicalRound(
                latestMacd,
                4
            ),

        signal:
            technicalRound(
                latestSignal,
                4
            ),

        histogram:
            technicalRound(
                latestMacd -
                latestSignal,
                4
            ),

        cross
    };
}

// =====================================
// RSI
// =====================================

function calculateRSI(
    closes,
    period = 14
) {
    if (
        closes.length <= period
    ) {
        return 50;
    }

    const changes = [];

    for (
        let index = 1;
        index < closes.length;
        index++
    ) {
        changes.push(
            closes[index] -
            closes[index - 1]
        );
    }

    const selected =
        changes.slice(-period);

    const gains =
        selected.map(
            value =>
                value > 0
                    ? value
                    : 0
        );

    const losses =
        selected.map(
            value =>
                value < 0
                    ? Math.abs(value)
                    : 0
        );

    const averageGain =
        gains.reduce(
            (sum, value) =>
                sum + value,
            0
        ) / period;

    const averageLoss =
        losses.reduce(
            (sum, value) =>
                sum + value,
            0
        ) / period;

    if (averageLoss === 0) {
        return 100;
    }

    const relativeStrength =
        averageGain /
        averageLoss;

    return technicalRound(
        100 -
        100 /
        (1 + relativeStrength),
        2
    );
}

// =====================================
// 出来高
// =====================================

function calculateVolumeAnalysis(
    volumes
) {
    const valid =
        volumes.filter(
            value =>
                Number.isFinite(
                    Number(value)
                ) &&
                Number(value) >= 0
        );

    if (valid.length < 20) {
        return {
            latest: 0,
            average20: 0,
            ratio: 1
        };
    }

    const latest =
        Number(
            valid[
                valid.length - 1
            ]
        );

    const average20 =
        valid
            .slice(-20)
            .reduce(
                (sum, value) =>
                    sum +
                    Number(value),
                0
            ) / 20;

    return {
        latest,
        average20,

        ratio:
            average20 > 0
                ? technicalRound(
                    latest /
                    average20,
                    2
                )
                : 1
    };
}

// =====================================
// スコア判定
// =====================================

function calculateTechnicalScore(
    data
) {
    let score = 50;

    const reasons = [];
    const warnings = [];

    // 移動平均線
    if (
        data.ma5 >
            data.ma25 &&
        data.ma25 >
            data.ma75
    ) {
        score += 20;

        reasons.push(
            "5日・25日・75日線が上昇配列"
        );
    } else if (
        data.ma5 <
            data.ma25 &&
        data.ma25 <
            data.ma75
    ) {
        score -= 20;

        warnings.push(
            "移動平均線が下降配列"
        );
    }

    // 現在価格と25日線
    if (
        data.currentPrice >
        data.ma25
    ) {
        score += 10;

        reasons.push(
            "現在価格が25日線より上"
        );
    } else {
        score -= 10;

        warnings.push(
            "現在価格が25日線より下"
        );
    }

    // MACD
    if (
        data.macd.cross ===
        "golden"
    ) {
        score += 18;

        reasons.push(
            "MACDがゴールデンクロス"
        );

    } else if (
        data.macd.cross ===
        "dead"
    ) {
        score -= 18;

        warnings.push(
            "MACDがデッドクロス"
        );

    } else if (
        data.macd.macd >
        data.macd.signal
    ) {
        score += 8;

        reasons.push(
            "MACDがシグナルより上"
        );

    } else {
        score -= 8;

        warnings.push(
            "MACDがシグナルより下"
        );
    }

    // RSI
    if (
        data.rsi >= 40 &&
        data.rsi <= 60
    ) {
        score += 8;

        reasons.push(
            "RSIに強い過熱感なし"
        );
    }

    if (data.rsi >= 70) {
        score -= 12;

        warnings.push(
            "RSIが買われすぎ圏"
        );
    }

    if (data.rsi <= 30) {
        warnings.push(
            "RSIが売られすぎ圏"
        );
    }

    // 出来高
    if (
        data.volume.ratio >= 1.3
    ) {
        if (
            data.priceChange >= 0
        ) {
            score += 8;

            reasons.push(
                "上昇を伴う出来高増加"
            );
        } else {
            score -= 8;

            warnings.push(
                "下落を伴う出来高増加"
            );
        }
    }

    score =
        technicalClamp(
            Math.round(score),
            0,
            100
        );

    let judgment =
        "中立";

    if (score >= 75) {
        judgment =
            "買い寄り";
    } else if (score >= 60) {
        judgment =
            "やや買い寄り";
    } else if (score <= 25) {
        judgment =
            "売り寄り";
    } else if (score <= 40) {
        judgment =
            "やや売り寄り";
    }

    return {
        score,
        judgment,
        reasons,
        warnings
    };
}

// =====================================
// 1銘柄を分析
// =====================================

async function analyzeTechnicalAsset(
    asset
) {
    const yahooSymbol =
        getTechnicalYahooSymbol(
            asset
        );

    if (!yahooSymbol) {
        throw new Error(
            "Yahoo Financeコード未設定"
        );
    }

    const endpoint =
        `${STOCK_API_URL}` +
        `?mode=history` +
        `&symbol=${
            encodeURIComponent(
                yahooSymbol
            )
        }` +
        `&t=${Date.now()}`;

    const response =
        await fetch(
            endpoint,
            {
                cache: "no-store"
            }
        );

    if (!response.ok) {
        throw new Error(
            `HTTP ${response.status}`
        );
    }

    const data =
        await response.json();

    if (
        data.error ||
        !Array.isArray(
            data.candles
        )
    ) {
        throw new Error(
            data.message ||
            data.error ||
            "データ取得失敗"
        );
    }

    const candles =
        data.candles.filter(
            candle =>
                Number.isFinite(
                    Number(
                        candle.close
                    )
                )
        );

    if (candles.length < 80) {
        throw new Error(
            "分析用データが不足"
        );
    }

    const closes =
        candles.map(
            candle =>
                Number(
                    candle.close
                )
        );

    const volumes =
        candles.map(
            candle =>
                Number(
                    candle.volume
                ) || 0
        );

    const currentPrice =
        closes[
            closes.length - 1
        ];

    const previousPrice =
        closes[
            closes.length - 2
        ];

    const priceChange =
        previousPrice > 0
            ? (
                currentPrice -
                previousPrice
            ) /
            previousPrice *
            100
            : 0;

    const analysis = {
        asset,
        yahooSymbol,
        currentPrice,

        priceChange:
            technicalRound(
                priceChange,
                2
            ),

        ma5:
            technicalRound(
                calculateSMA(
                    closes,
                    5
                ),
                2
            ),

        ma25:
            technicalRound(
                calculateSMA(
                    closes,
                    25
                ),
                2
            ),

        ma75:
            technicalRound(
                calculateSMA(
                    closes,
                    75
                ),
                2
            ),

        rsi:
            calculateRSI(
                closes,
                14
            ),

        macd:
            calculateMACD(
                closes
            ),

        volume:
            calculateVolumeAnalysis(
                volumes
            )
    };

    return {
        ...analysis,

        ...calculateTechnicalScore(
            analysis
        )
    };
}

// =====================================
// 表示
// =====================================

function getTechnicalJudgmentClass(
    score
) {
    if (score >= 60) {
        return "profit-positive";
    }

    if (score <= 40) {
        return "profit-negative";
    }

    return "profit-neutral";
}

function renderTechnicalResult(
    result
) {
    const macdText =
        result.macd.cross ===
        "golden"
            ? "🟢 ゴールデンクロス"
            : result.macd.cross ===
              "dead"
                ? "🔴 デッドクロス"
                : result.macd.macd >
                  result.macd.signal
                    ? "🟢 シグナルより上"
                    : "🔴 シグナルより下";

    const reasons =
        result.reasons.length > 0
            ? result.reasons
                .map(
                    text =>
                        `<li>✅ ${text}</li>`
                )
                .join("")
            : "<li>明確な強気材料なし</li>";

    const warnings =
        result.warnings.length > 0
            ? result.warnings
                .map(
                    text =>
                        `<li>⚠️ ${text}</li>`
                )
                .join("")
            : "<li>大きな警戒材料なし</li>";

    return `
        <div class="asset-card technical-card">

            <div class="asset-card-header">

                <div>
                    <strong>
                        ${result.asset.name}
                    </strong>

                    <span class="asset-symbol">
                        ${result.asset.symbol}
                    </span>
                </div>

                <span class="asset-type">
                    ${getTypeLabel(
                        result.asset.type
                    )}
                </span>

            </div>

            <div class="asset-row">
                <span>参考スコア</span>

                <strong class="${
                    getTechnicalJudgmentClass(
                        result.score
                    )
                }">
                    ${result.score}点
                    ／
                    ${result.judgment}
                </strong>
            </div>

            <div class="asset-row">
                <span>前日比</span>

                <strong class="${
                    getProfitClass(
                        result.priceChange
                    )
                }">
                    ${
                        result.priceChange >= 0
                            ? "+"
                            : ""
                    }${result.priceChange}%
                </strong>
            </div>

            <div class="asset-row">
                <span>RSI（14日）</span>
                <strong>${result.rsi}</strong>
            </div>

            <div class="asset-row">
                <span>MACD</span>
                <strong>${macdText}</strong>
            </div>

            <div class="asset-row">
                <span>5日移動平均</span>
                <strong>${result.ma5}</strong>
            </div>

            <div class="asset-row">
                <span>25日移動平均</span>
                <strong>${result.ma25}</strong>
            </div>

            <div class="asset-row">
                <span>75日移動平均</span>
                <strong>${result.ma75}</strong>
            </div>

            <div class="asset-row">
                <span>出来高</span>

                <strong>
                    20日平均の
                    ${result.volume.ratio}倍
                </strong>
            </div>

            <div class="technical-reasons">
                <strong>判定理由</strong>
                <ul>${reasons}</ul>
            </div>

            <div class="technical-warnings">
                <strong>注意点</strong>
                <ul>${warnings}</ul>
            </div>

        </div>
    `;
}

function renderTechnicalError(
    asset,
    error
) {
    return `
        <div class="asset-card">

            <strong>
                ${asset.name}
                （${asset.symbol}）
            </strong>

            <p class="profit-negative">
                分析失敗：
                ${error.message}
            </p>

        </div>
    `;
}

// =====================================
// 全保有銘柄を分析
// =====================================

async function analyzeAllTechnicalAssets() {
    if (technicalAnalysisRunning) {
        return;
    }

    const container =
        document.getElementById(
            "technicalAnalysisList"
        );

    const button =
        document.getElementById(
            "technicalAnalysisBtn"
        );

    if (!container) {
        return;
    }

    technicalAnalysisRunning =
        true;

    if (button) {
        button.disabled = true;
        button.textContent =
            "分析中...";
    }

    container.innerHTML =
        "市場データを取得して分析しています...";

    const results = [];

    for (const asset of assets) {
        container.innerHTML =
            `${asset.name}を分析中...`;

        try {
            const result =
                await analyzeTechnicalAsset(
                    asset
                );

            results.push(
                renderTechnicalResult(
                    result
                )
            );

        } catch (error) {
            console.error(
                asset.symbol,
                error
            );

            results.push(
                renderTechnicalError(
                    asset,
                    error
                )
            );
        }
    }

    container.innerHTML =
        results.join("");

    technicalAnalysisRunning =
        false;

    if (button) {
        button.disabled = false;
        button.textContent =
            "🔄 分析を更新";
    }
}

// =====================================
// 起動
// =====================================

document.addEventListener(
    "DOMContentLoaded",
    () => {
        const button =
            document.getElementById(
                "technicalAnalysisBtn"
            );

        if (button) {
            button.addEventListener(
                "click",
                analyzeAllTechnicalAssets
            );
        }
    }
);
