// =====================================
// Stock Manager v3.1
// Bitcoin1070 PRO
// Cloudflare Worker 自動株価取得
// =====================================

// 自分のCloudflare Worker
const STOCK_API_URL =
    "https://bitcoin1070-api.531unchi.workers.dev";

// API取得に失敗した場合の予備価格
const DEFAULT_STOCK_PRICES = {
    NVDA: 185,
    USDJPY: 160,

    MHI: 3650,
    ADVT: 11800,
    FJK: 7200,
    VRAIN: 3950
};

// portfolio.jsから参照する株価
let stockPrices = {
    ...DEFAULT_STOCK_PRICES
};

// 最終更新時刻
let stockPricesUpdatedAt = null;

// =====================================
// 有効な数値だけ採用
// =====================================

function validStockNumber(value, fallback = 0) {
    const number = Number(value);

    if (
        Number.isFinite(number) &&
        number > 0
    ) {
        return number;
    }

    return fallback;
}

// =====================================
// Workerのデータを整形
// =====================================

function normalizeStockData(data) {
    return {
        NVDA: validStockNumber(
            data.NVDA,
            stockPrices.NVDA
        ),

        USDJPY: validStockNumber(
            data.USDJPY,
            stockPrices.USDJPY
        ),

        MHI: validStockNumber(
            data.MHI,
            stockPrices.MHI
        ),

        ADVT: validStockNumber(
            data.ADVT,
            stockPrices.ADVT
        ),

        FJK: validStockNumber(
            data.FJK,
            stockPrices.FJK
        ),

        VRAIN: validStockNumber(
            data.VRAIN,
            stockPrices.VRAIN
        )
    };
}

// =====================================
// リアルタイム株価取得
// =====================================

async function refreshStockPrices() {
    try {
        console.log("株価取得開始");

        const response = await fetch(
            `${STOCK_API_URL}?t=${Date.now()}`,
            {
                method: "GET",
                cache: "no-store"
            }
        );

        if (!response.ok) {
            throw new Error(
                `株価APIエラー：${response.status}`
            );
        }

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        stockPrices =
            normalizeStockData(data);

        stockPricesUpdatedAt =
            data.fetchedAt ||
            new Date().toISOString();

        console.log(
            "リアルタイム株価取得成功",
            stockPrices
        );

        return stockPrices;

    } catch (error) {
        console.error(
            "リアルタイム株価取得失敗",
            error
        );

        console.log(
            "予備価格を使用します",
            stockPrices
        );

        return stockPrices;
    }
}

// =====================================
// 株価を取得して資産画面を更新
// =====================================

async function initializeStockPrices() {
    await refreshStockPrices();

    // portfolio.js側を再計算
    if (
        typeof loadMarketData === "function"
    ) {
        await loadMarketData();
    }
}

// =====================================
// 手動更新用
// =====================================

async function reloadStockPrices() {
    await initializeStockPrices();

    alert("最新の株価へ更新しました");
}

// =====================================
// 起動
// =====================================

document.addEventListener(
    "DOMContentLoaded",
    () => {
        initializeStockPrices();

        // 5分ごとに株価を自動更新
        setInterval(
            initializeStockPrices,
            5 * 60 * 1000
        );
    }
);
