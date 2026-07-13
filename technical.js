// =====================================
// Technical Analysis Engine v4.0
// MACD・RSI・移動平均線・出来高・BB・サポレジ・52週高安・売買目安
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
// v4.0追加指標
// =====================================
function calculateStdDev(values) {
    if (!values.length) return 0;
    const mean = values.reduce((a,b)=>a+Number(b),0)/values.length;
    return Math.sqrt(values.reduce((sum,v)=>sum+Math.pow(Number(v)-mean,2),0)/values.length);
}

function calculateBollingerBands(closes, period = 20, multiplier = 2) {
    const selected = closes.slice(-period);
    if (selected.length < period) return { middle:0, upper:0, lower:0, bandwidth:0, position:50 };
    const middle = selected.reduce((a,b)=>a+b,0)/period;
    const deviation = calculateStdDev(selected);
    const upper = middle + deviation * multiplier;
    const lower = middle - deviation * multiplier;
    const current = closes[closes.length-1];
    return {
        middle: technicalRound(middle,2), upper: technicalRound(upper,2), lower: technicalRound(lower,2),
        bandwidth: middle > 0 ? technicalRound((upper-lower)/middle*100,2) : 0,
        position: upper > lower ? technicalRound((current-lower)/(upper-lower)*100,1) : 50
    };
}

function calculateATR(candles, period = 14) {
    if (candles.length <= period) return 0;
    const ranges=[];
    for(let i=1;i<candles.length;i++){
        const h=Number(candles[i].high), l=Number(candles[i].low), pc=Number(candles[i-1].close);
        ranges.push(Math.max(h-l, Math.abs(h-pc), Math.abs(l-pc)));
    }
    const selected=ranges.slice(-period);
    return selected.reduce((a,b)=>a+b,0)/selected.length;
}

function calculateSupportResistance(candles, currentPrice) {
    const recent=candles.slice(-120);
    const lows=[], highs=[];
    for(let i=2;i<recent.length-2;i++){
        const c=recent[i];
        if(c.low<=recent[i-1].low && c.low<=recent[i-2].low && c.low<=recent[i+1].low && c.low<=recent[i+2].low) lows.push(Number(c.low));
        if(c.high>=recent[i-1].high && c.high>=recent[i-2].high && c.high>=recent[i+1].high && c.high>=recent[i+2].high) highs.push(Number(c.high));
    }
    const supportCandidates=lows.filter(v=>v<currentPrice).sort((a,b)=>b-a);
    const resistanceCandidates=highs.filter(v=>v>currentPrice).sort((a,b)=>a-b);
    const fallbackLows=recent.map(c=>Number(c.low)).filter(v=>v<currentPrice).sort((a,b)=>b-a);
    const fallbackHighs=recent.map(c=>Number(c.high)).filter(v=>v>currentPrice).sort((a,b)=>a-b);
    return {
        support: technicalRound(supportCandidates[0] ?? fallbackLows[0] ?? currentPrice,2),
        resistance: technicalRound(resistanceCandidates[0] ?? fallbackHighs[0] ?? currentPrice,2)
    };
}

function calculate52WeekRange(candles, currentPrice) {
    const yearly=candles.slice(-260);
    const high=Math.max(...yearly.map(c=>Number(c.high)||Number(c.close)));
    const low=Math.min(...yearly.map(c=>Number(c.low)||Number(c.close)));
    return {
        high:technicalRound(high,2), low:technicalRound(low,2),
        fromHigh:high>0?technicalRound((currentPrice-high)/high*100,1):0,
        fromLow:low>0?technicalRound((currentPrice-low)/low*100,1):0,
        position:high>low?technicalRound((currentPrice-low)/(high-low)*100,1):50
    };
}

function calculateTradeLevels(currentPrice, atr, levels) {
    const atrValue=atr || currentPrice*0.025;
    const stopAtr=currentPrice-atrValue*1.5;
    const stopSupport=levels.support*0.985;
    const stop=Math.max(0, Math.min(currentPrice*0.99, Math.max(stopAtr, stopSupport)));
    const target1=Math.max(currentPrice+atrValue*1.5, levels.resistance);
    const target2=Math.max(currentPrice+atrValue*3, target1+atrValue);
    const risk=currentPrice-stop;
    return {
        takeProfit1:technicalRound(target1,2), takeProfit2:technicalRound(target2,2), stopLoss:technicalRound(stop,2),
        riskReward:risk>0?technicalRound((target1-currentPrice)/risk,2):0
    };
}

// =====================================
// スコア判定
// =====================================

function calculateTechnicalScore(data) {
    let score = 50;
    const reasons = [];
    const warnings = [];
    const add=(points,text)=>{score+=points; reasons.push(text);};
    const sub=(points,text)=>{score-=points; warnings.push(text);};

    if(data.ma5>data.ma25 && data.ma25>data.ma75) add(14,"移動平均線が上昇配列");
    else if(data.ma5<data.ma25 && data.ma25<data.ma75) sub(14,"移動平均線が下降配列");
    if(data.currentPrice>data.ma25) add(6,"価格が25日線より上"); else sub(6,"価格が25日線より下");
    if(data.macd.cross==="golden") add(12,"MACDゴールデンクロス");
    else if(data.macd.cross==="dead") sub(12,"MACDデッドクロス");
    else if(data.macd.macd>data.macd.signal) add(5,"MACDがシグナルより上"); else sub(5,"MACDがシグナルより下");
    if(data.rsi>=45 && data.rsi<=65) add(5,"RSIが健全な上昇余地");
    if(data.rsi>=75) sub(9,"RSIが強い買われすぎ"); else if(data.rsi>=70) sub(5,"RSIが買われすぎ圏");
    if(data.rsi<=30) add(2,"RSIは売られすぎ圏（反発余地）");
    if(data.volume.ratio>=1.3 && data.priceChange>=0) add(6,"上昇を伴う出来高増加");
    if(data.volume.ratio>=1.3 && data.priceChange<0) sub(6,"下落を伴う出来高増加");
    if(data.bollinger.position>=55 && data.bollinger.position<=90) add(6,"ボリンジャーバンド上側で推移");
    if(data.bollinger.position>100) sub(5,"ボリンジャーバンド上限超えで過熱");
    if(data.bollinger.position<0) add(2,"ボリンジャーバンド下限割れで反発余地");
    if(data.week52.position>=70 && data.week52.position<95) add(7,"52週レンジ上位で強いトレンド");
    if(data.week52.position>=95) sub(3,"52週高値圏で高値掴みに注意");
    if(data.week52.position<=20) sub(5,"52週安値圏で下落トレンド警戒");
    const supportDistance=(data.currentPrice-data.levels.support)/data.currentPrice*100;
    const resistanceDistance=(data.levels.resistance-data.currentPrice)/data.currentPrice*100;
    if(supportDistance>=0 && supportDistance<=4) add(5,"主要サポートが近く損切り設定しやすい");
    if(resistanceDistance>=0 && resistanceDistance<=2) sub(4,"直上に強いレジスタンス");
    if(data.tradeLevels.riskReward>=1.5) add(5,"利確候補までのリスクリワード良好");
    else if(data.tradeLevels.riskReward<1) sub(5,"リスクリワードが低い");

    score=technicalClamp(Math.round(score),0,100);
    let judgment="中立";
    if(score>=80) judgment="強い買い寄り"; else if(score>=65) judgment="買い寄り"; else if(score>=55) judgment="やや買い寄り";
    else if(score<=20) judgment="強い売り寄り"; else if(score<=35) judgment="売り寄り"; else if(score<=45) judgment="やや売り寄り";
    return {score,judgment,reasons:reasons.slice(0,6),warnings:warnings.slice(0,6)};
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

    analysis.bollinger = calculateBollingerBands(closes);
    analysis.atr = technicalRound(calculateATR(candles), 2);
    analysis.levels = calculateSupportResistance(candles, currentPrice);
    analysis.week52 = calculate52WeekRange(candles, currentPrice);
    analysis.tradeLevels = calculateTradeLevels(currentPrice, analysis.atr, analysis.levels);

    return { ...analysis, ...calculateTechnicalScore(analysis) };
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

            <div class="technical-section-title">📉 ボリンジャーバンド（20日・2σ）</div>
            <div class="asset-row"><span>上限 / 中央 / 下限</span><strong>${result.bollinger.upper} / ${result.bollinger.middle} / ${result.bollinger.lower}</strong></div>
            <div class="asset-row"><span>バンド内位置</span><strong>${result.bollinger.position}%</strong></div>

            <div class="technical-section-title">🧱 サポート・レジスタンス</div>
            <div class="asset-row"><span>サポート候補</span><strong>${result.levels.support}</strong></div>
            <div class="asset-row"><span>レジスタンス候補</span><strong>${result.levels.resistance}</strong></div>

            <div class="technical-section-title">📅 52週高値・安値</div>
            <div class="asset-row"><span>52週高値</span><strong>${result.week52.high}（高値比 ${result.week52.fromHigh}%）</strong></div>
            <div class="asset-row"><span>52週安値</span><strong>${result.week52.low}（安値比 +${result.week52.fromLow}%）</strong></div>
            <div class="asset-row"><span>52週レンジ位置</span><strong>${result.week52.position}%</strong></div>

            <div class="technical-section-title">🎯 利確・損切り候補</div>
            <div class="asset-row"><span>利確候補①</span><strong class="profit-positive">${result.tradeLevels.takeProfit1}</strong></div>
            <div class="asset-row"><span>利確候補②</span><strong class="profit-positive">${result.tradeLevels.takeProfit2}</strong></div>
            <div class="asset-row"><span>損切り候補</span><strong class="profit-negative">${result.tradeLevels.stopLoss}</strong></div>
            <div class="asset-row"><span>リスクリワード</span><strong>${result.tradeLevels.riskReward}倍</strong></div>
            <p class="technical-disclaimer">※ ATRと直近サポレジから算出した参考値です。投資判断を保証するものではありません。</p>

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
