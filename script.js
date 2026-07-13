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
// BTC価格・24時間変動
// =====================================

async function loadBitcoinMarket() {
    const btcPriceElement =
        document.getElementById("btcPrice");

    const btcChangeElement =
        document.getElementById("btcChange");

    try {
        const endpoint =
            "https://api.coingecko.com/api/v3/simple/price" +
            "?ids=bitcoin" +
            "&vs_currencies=jpy" +
            "&include_24hr_change=true";

        const response = await fetch(endpoint, {
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error(
                `BTC価格取得エラー: ${response.status}`
            );
        }

        const data = await response.json();

        const price =
            Number(data?.bitcoin?.jpy);

        const change =
            Number(data?.bitcoin?.jpy_24h_change);

        if (btcPriceElement) {
            btcPriceElement.textContent =
                marketFormatYen(price);
        }

        if (btcChangeElement) {
            btcChangeElement.textContent =
                marketFormatPercent(change);

            btcChangeElement.classList.remove(
                "profit-positive",
                "profit-negative",
                "profit-neutral"
            );

            if (change > 0) {
                btcChangeElement.classList.add(
                    "profit-positive"
                );
            } else if (change < 0) {
                btcChangeElement.classList.add(
                    "profit-negative"
                );
            } else {
                btcChangeElement.classList.add(
                    "profit-neutral"
                );
            }
        }

        return {
            price,
            change
        };

    } catch (error) {
        console.error(
            "BTC市場データ取得失敗:",
            error
        );

        if (btcPriceElement) {
            btcPriceElement.textContent =
                "取得失敗";
        }

        if (btcChangeElement) {
            btcChangeElement.textContent =
                "--";
        }

        return {
            price: 0,
            change: 0
        };
    }
}

// =====================================
// Fear & Greed
// =====================================

async function loadFearAndGreed() {
    const fearElement =
        document.getElementById("fear");

    try {
        const response = await fetch(
            "https://api.alternative.me/fng/?limit=1",
            {
                cache: "no-store"
            }
        );

        if (!response.ok) {
            throw new Error(
                `Fear & Greed取得エラー: ${response.status}`
            );
        }

        const data = await response.json();

        const value =
            Number(data?.data?.[0]?.value);

        const classification =
            data?.data?.[0]?.value_classification ||
            "";

        if (!Number.isFinite(value)) {
            throw new Error(
                "Fear & Greedデータが不正です"
            );
        }

        if (fearElement) {
            fearElement.innerHTML = `
                ${value}
                <div class="small">
                    ${classification}
                </div>
            `;
        }

        return {
            value,
            classification
        };

    } catch (error) {
        console.error(
            "Fear & Greed取得失敗:",
            error
        );

        if (fearElement) {
            fearElement.textContent =
                "取得失敗";
        }

        return {
            value: null,
            classification: ""
        };
    }
}

// =====================================
// 1070日理論
// =====================================

function update1070Theory() {
    const daysElement =
        document.getElementById("days");

    const progressBar =
        document.getElementById("progressBar");

    const now = new Date();

    const elapsedDays =
        getDaysBetween(
            BTC_BOTTOM_DATE,
            now
        );

    const progress =
        Math.min(
            100,
            Math.max(
                0,
                elapsedDays / THEORY_DAYS * 100
            )
        );

    if (daysElement) {
        daysElement.textContent =
            `${elapsedDays.toLocaleString("ja-JP")}日`;
    }

    if (progressBar) {
        progressBar.style.width =
            `${progress.toFixed(1)}%`;
    }

    return {
        elapsedDays,
        progress
    };
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
                `1070日基準まで残り約${(
                    THEORY_DAYS - theoryDays
                ).toLocaleString("ja-JP")}日です。`
            );
        } else {
            comments.push(
                `1070日基準を約${(
                    theoryDays - THEORY_DAYS
                ).toLocaleString("ja-JP")}日超えています。サイクル理論だけに依存せず判断してください。`
            );
        }
    }

    commentElement.innerHTML =
        comments
            .map(
                comment =>
                    `<p>${comment}</p>`
            )
            .join("");
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

    const [
        bitcoinMarket,
        fearAndGreed
    ] = await Promise.all([
        loadBitcoinMarket(),
        loadFearAndGreed()
    ]);

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
        refreshMarketDashboard();
        initializeTradingView();

        // 5分ごとに再取得
        setInterval(
            refreshMarketDashboard,
            5 * 60 * 1000
        );
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
const tutorialTexts = [

"👋 Bitcoin1070 PROへようこそ！",

"💰 まずは保有資産を入力しましょう",

"📱 ホーム画面へ追加するとアプリのように使えます",

"🤖 AI分析で売買タイミングをチェックできます",

"🚀 準備完了！"

];

let tutorialStep = 0;

function startTutorial(){

if(localStorage.getItem("tutorialDone")) return;

document
.getElementById("tutorial")
.classList.remove("hidden");

showTutorial();

}

function showTutorial(){

document.getElementById("tutorialText").textContent=

tutorialTexts[tutorialStep];

}

document.addEventListener("DOMContentLoaded",()=>{

startTutorial();

document
.getElementById("tutorialNext")
.addEventListener("click",()=>{

tutorialStep++;

if(tutorialStep>=tutorialTexts.length){

localStorage.setItem("tutorialDone","yes");

document
.getElementById("tutorial")
.classList.add("hidden");

return;

}

showTutorial();

});

});
