// =====================================
// Market Dashboard v3.0
// Bitcoin1070 PRO
// =====================================

// =====================================
// 設定
// =====================================

// 1070日カウントの起点
// 必要なら後から変更可能
const BTC_BOTTOM_DATE = new Date("2022-11-21T00:00:00+09:00");

// 次回半減期の概算日
const NEXT_HALVING_DATE = new Date("2028-04-20T00:00:00+09:00");

// 1070日理論の基準日数
const THEORY_DAYS = 1070;

// =====================================
// 表示用
// =====================================

function marketFormatYen(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "取得失敗";
    }

    return `¥${Math.round(number).toLocaleString("ja-JP")}`;
}

function marketFormatPercent(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "--";
    }

    const sign = number > 0 ? "+" : "";

    return `${sign}${number.toFixed(2)}%`;
}

function getDaysBetween(startDate, endDate) {
    const milliseconds =
        endDate.getTime() - startDate.getTime();

    return Math.floor(
        milliseconds / (1000 * 60 * 60 * 24)
    );
}

// =====================================
// 通信共通（タイムアウト付き）
// =====================================
async function fetchJsonWithTimeout(url, timeoutMs = 8000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } finally {
        clearTimeout(timer);
    }
}

// =====================================
// BTC価格・24時間変動
// =====================================
async function loadBitcoinMarket() {
    const btcPriceElement = document.getElementById("btcPrice");
    const btcChangeElement = document.getElementById("btcChange");
    const cacheKey = "bitcoin1070_btc_market_v11_7";

    const render = (price, change, cached = false) => {
        if (btcPriceElement) btcPriceElement.textContent = marketFormatYen(price) + (cached ? "*" : "");
        if (btcChangeElement) {
            btcChangeElement.textContent = marketFormatPercent(change);
            btcChangeElement.classList.remove("profit-positive", "profit-negative", "profit-neutral");
            btcChangeElement.classList.add(change > 0 ? "profit-positive" : change < 0 ? "profit-negative" : "profit-neutral");
        }
    };

    const sources = [
        async () => {
            const data = await fetchJsonWithTimeout("https://bitcoin1070-api.531unchi.workers.dev?mode=crypto&ids=bitcoin", 7000);
            return {
                price: Number(data?.prices?.bitcoin?.jpy),
                change: Number(data?.prices?.bitcoin?.jpy_24h_change) || 0
            };
        },
        async () => {
            const data = await fetchJsonWithTimeout("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=jpy&include_24hr_change=true", 7000);
            return {
                price: Number(data?.bitcoin?.jpy),
                change: Number(data?.bitcoin?.jpy_24h_change) || 0
            };
        }
    ];

    for (const source of sources) {
        try {
            const result = await source();
            if (!(result.price > 0)) throw new Error("BTC価格データ不正");
            localStorage.setItem(cacheKey, JSON.stringify({ ...result, fetchedAt: new Date().toISOString() }));
            render(result.price, result.change, false);
            return result;
        } catch (error) {
            console.warn("BTC価格取得先で失敗:", error);
        }
    }

    try {
        const cached = JSON.parse(localStorage.getItem(cacheKey) || "null");
        if (Number(cached?.price) > 0) {
            render(Number(cached.price), Number(cached.change) || 0, true);
            return { price: Number(cached.price), change: Number(cached.change) || 0 };
        }
    } catch (_) {}

    if (btcPriceElement) btcPriceElement.textContent = "取得失敗";
    if (btcChangeElement) btcChangeElement.textContent = "再読み込みしてください";
    return { price: 0, change: null };
}

// =====================================
// Fear & Greed
// =====================================
async function loadFearAndGreed() {
    const fearElement = document.getElementById("fear");
    const cacheKey = "bitcoin1070_fear_greed_v11_7";

    const sources = [
        async () => {
            const data = await fetchJsonWithTimeout("https://bitcoin1070-api.531unchi.workers.dev?mode=fear-greed", 7000);
            return { value: Number(data?.value), classification: String(data?.classification || "") };
        },
        async () => {
            const data = await fetchJsonWithTimeout("https://api.alternative.me/fng/?limit=1", 7000);
            return {
                value: Number(data?.data?.[0]?.value),
                classification: String(data?.data?.[0]?.value_classification || "")
            };
        }
    ];

    for (const source of sources) {
        try {
            const result = await source();
            if (!Number.isFinite(result.value)) throw new Error("Fear & Greedデータ不正");
            localStorage.setItem(cacheKey, JSON.stringify({ ...result, fetchedAt: new Date().toISOString() }));
            if (fearElement) fearElement.innerHTML = `${result.value}<div class="small">${result.classification}</div>`;
            return result;
        } catch (error) {
            console.warn("Fear & Greed取得先で失敗:", error);
        }
    }

    try {
        const cached = JSON.parse(localStorage.getItem(cacheKey) || "null");
        if (Number.isFinite(Number(cached?.value))) {
            if (fearElement) fearElement.innerHTML = `${Number(cached.value)}*<div class="small">${cached.classification || "保存値"}</div>`;
            return { value: Number(cached.value), classification: cached.classification || "" };
        }
    } catch (_) {}

    if (fearElement) fearElement.innerHTML = `取得失敗<div class="small">通信後に再読み込み</div>`;
    return { value: null, classification: "" };
}

// =====================================
// 1070日理論
// =====================================

function update1070Theory() {
    if (window.Bitcoin1070Cycle?.renderCompact) {
        const cycle = window.Bitcoin1070Cycle.renderCompact();
        return { elapsedDays: cycle.declineElapsed, progress: cycle.progress, cycle };
    }
    return { elapsedDays: 0, progress: 0 };
}

// =====================================
// 半減期カウント
// =====================================

function updateHalvingCountdown() {
    const halvingElement =
        document.getElementById("halving");

    const now = new Date();

    const remainingDays =
        getDaysBetween(
            now,
            NEXT_HALVING_DATE
        );

    if (!halvingElement) {
        return remainingDays;
    }

    if (remainingDays > 0) {
        halvingElement.textContent =
            `あと${remainingDays.toLocaleString("ja-JP")}日`;
    } else {
        halvingElement.textContent =
            "予定日を通過";
    }

    return remainingDays;
}

// =====================================
// AI風マーケットコメント
// =====================================

function updateMarketComment({
    btcChange,
    fearValue,
    theoryDays
}) {
    const commentElement =
        document.getElementById("aiComment");

    if (!commentElement) {
        return;
    }

    const comments = [];

    if (Number.isFinite(btcChange)) {
        if (btcChange >= 5) {
            comments.push(
                "BTCは24時間で大きく上昇しています。短期的な過熱に注意してください。"
            );
        } else if (btcChange <= -5) {
            comments.push(
                "BTCは24時間で大きく下落しています。急いで判断せず、相場全体を確認してください。"
            );
        } else if (btcChange > 0) {
            comments.push(
                "BTCは24時間ベースで上昇しています。"
            );
        } else if (btcChange < 0) {
            comments.push(
                "BTCは24時間ベースで下落しています。"
            );
        } else {
            comments.push(
                "BTCは24時間ベースでほぼ横ばいです。"
            );
        }
    }

    if (Number.isFinite(fearValue)) {
        if (fearValue <= 24) {
            comments.push(
                "市場心理は極度の恐怖です。割安局面の可能性はありますが、下落継続にも警戒が必要です。"
            );
        } else if (fearValue <= 44) {
            comments.push(
                "市場心理は恐怖寄りです。"
            );
        } else if (fearValue <= 55) {
            comments.push(
                "市場心理は中立です。"
            );
        } else if (fearValue <= 74) {
            comments.push(
                "市場心理は強欲寄りです。高値追いには注意してください。"
            );
        } else {
            comments.push(
                "市場心理は極度の強欲です。利益確定とリスク管理を意識してください。"
            );
        }
    }

    if (Number.isFinite(theoryDays)) {
        if (theoryDays < THEORY_DAYS) {
            comments.push(
                `次のサイクル重要時期まで約${(
                    THEORY_DAYS - theoryDays
                ).toLocaleString("ja-JP")}日です。`
            );
        } else {
            comments.push(
                `前サイクルの1070日基準を約${(
                    theoryDays - THEORY_DAYS
                ).toLocaleString("ja-JP")}日超えています。サイクル理論だけに依存せず判断してください。`
            );
        }
    }

    if (!comments.length) {
        comments.push("市場データを取得できませんでした。通信状態を確認して再読み込みしてください。");
    }

    commentElement.innerHTML = comments.map(comment => `<p>${comment}</p>`).join("");
}

// =====================================
// TradingView
// =====================================

function initializeTradingView() {
    const container =
        document.getElementById("tradingview");

    if (!container) {
        return;
    }

    if (
        typeof TradingView === "undefined" ||
        typeof TradingView.widget !== "function"
    ) {
        container.textContent =
            "TradingViewを読み込めませんでした";

        return;
    }

    container.innerHTML = "";

    new TradingView.widget({
        autosize: true,
        symbol: "BITSTAMP:BTCUSD",
        interval: "D",
        timezone: "Asia/Tokyo",
        theme: "dark",
        style: "1",
        locale: "ja",
        toolbar_bg: "#0b111f",
        enable_publishing: false,
        allow_symbol_change: true,
        container_id: "tradingview"
    });
}

// =====================================
// 全市場データ更新
// =====================================

async function refreshMarketDashboard() {
    const theory =
        update1070Theory();

    updateHalvingCountdown();

    const [bitcoinResult, fearResult] = await Promise.allSettled([
        loadBitcoinMarket(),
        loadFearAndGreed()
    ]);

    const bitcoinMarket = bitcoinResult.status === "fulfilled"
        ? bitcoinResult.value
        : { price: 0, change: null };
    const fearAndGreed = fearResult.status === "fulfilled"
        ? fearResult.value
        : { value: null, classification: "" };

    updateMarketComment({
        btcChange:
            bitcoinMarket.change,

        fearValue:
            fearAndGreed.value,

        theoryDays:
            theory.elapsedDays
    });
}

// =====================================
// 起動
// =====================================

document.addEventListener(
    "DOMContentLoaded",
    () => {
        update1070Theory();
        updateHalvingCountdown();
        initializeTradingView();

        // v11.9: BTC/Fear & Greed はタイムアウト・フォールバック付き共通ローダーへ一本化。
        if (window.Bitcoin1070HomeMarket?.load) {
            window.Bitcoin1070HomeMarket.load();
            setInterval(() => window.Bitcoin1070HomeMarket.load(), 5 * 60 * 1000);
        } else {
            refreshMarketDashboard();
            setInterval(refreshMarketDashboard, 5 * 60 * 1000);
        }
    }
);
// ===============================
// PWA登録
// ===============================

if ("serviceWorker" in navigator) {
    window.addEventListener(
        "load",
        () => {
            navigator.serviceWorker
                .register("./service-worker.js")
                .then(() => {
                    console.log(
                        "Service Worker登録完了"
                    );
                })
                .catch(error => {
                    console.error(
                        error
                    );
                });
        }
    );
}
// =====================================
// 初回チュートリアル v2.0
// =====================================

const TUTORIAL_STORAGE_KEY =
    "bitcoin1070_tutorial_completed";

const tutorialSteps = [
    {
        icon: "👋",
        title:
            "Bitcoin1070 PROへようこそ！",
        text:
            "資産管理とテクニカル分析を、ひとつのアプリで確認できます。",
        showHomeGuide: false
    },

    {
        icon: "💰",
        title:
            "まずは資産を登録",
        text:
            "画面下の編集エリアから、仮想通貨・日本株・米国株を追加してください。",
        showHomeGuide: false
    },

    {
        icon: "📱",
        title:
            "ホーム画面へ追加",
        text:
            "ホーム画面へ追加すると、Safariのアドレスバーが消えてアプリのように使えます。",
        showHomeGuide: true
    },

    {
        icon: "🤖",
        title:
            "テクニカル分析を活用",
        text:
            "MACD・RSI・移動平均線・出来高を使った参考分析を確認できます。",
        showHomeGuide: false
    }
];

let tutorialStep = 0;

function showTutorialStep() {
    const step =
        tutorialSteps[tutorialStep];

    const icon =
        document.getElementById(
            "tutorialIcon"
        );

    const title =
        document.getElementById(
            "tutorialTitle"
        );

    const text =
        document.getElementById(
            "tutorialText"
        );

    const homeGuide =
        document.getElementById(
            "tutorialHomeGuide"
        );

    const nextButton =
        document.getElementById(
            "tutorialNext"
        );

    const dots =
        document.querySelectorAll(
            ".tutorial-dot"
        );

    if (
        !step ||
        !icon ||
        !title ||
        !text
    ) {
        return;
    }

    icon.textContent =
        step.icon;

    title.textContent =
        step.title;

    text.textContent =
        step.text;

    if (homeGuide) {
        homeGuide.classList.toggle(
            "hidden",
            !step.showHomeGuide
        );
    }

    dots.forEach(
        (dot, index) => {
            dot.classList.toggle(
                "active",
                index === tutorialStep
            );
        }
    );

    if (nextButton) {
        nextButton.textContent =
            tutorialStep ===
            tutorialSteps.length - 1
                ? "Bitcoin1070 PROを始める 🚀"
                : "次へ →";
    }
}

function openTutorial() {
    const completed =
        localStorage.getItem(
            TUTORIAL_STORAGE_KEY
        );

    if (completed === "yes") {
        return;
    }

    const tutorial =
        document.getElementById(
            "tutorial"
        );

    if (!tutorial) {
        return;
    }

    tutorialStep = 0;

    tutorial.classList.remove(
        "hidden"
    );

    showTutorialStep();
}

function closeTutorial(
    markCompleted = true
) {
    const tutorial =
        document.getElementById(
            "tutorial"
        );

    if (markCompleted) {
        localStorage.setItem(
            TUTORIAL_STORAGE_KEY,
            "yes"
        );
    }

    if (tutorial) {
        tutorial.classList.add(
            "hidden"
        );
    }
}

document.addEventListener(
    "DOMContentLoaded",
    () => {
        const nextButton =
            document.getElementById(
                "tutorialNext"
            );

        const closeButton =
            document.getElementById(
                "tutorialClose"
            );

        if (nextButton) {
            nextButton.addEventListener(
                "click",
                () => {
                    tutorialStep++;

                    if (
                        tutorialStep >=
                        tutorialSteps.length
                    ) {
                        closeTutorial(true);
                        return;
                    }

                    showTutorialStep();
                }
            );
        }

        if (closeButton) {
            closeButton.addEventListener(
                "click",
                () => {
                    closeTutorial(true);
                }
            );
        }

        openTutorial();
    }
);
