// =====================================
// Stock Manager v3.0
// Bitcoin1070 PRO
// =====================================

// Cloudflare Worker完成後にURLを入れる
// 例:
// const STOCK_API_URL =
// "https://bitcoin1070-api.531unchi.workers.dev";

const STOCK_API_URL = "";

// API取得に失敗した場合の仮価格
const DEFAULT_STOCK_PRICES = {
    NVDA: 185,
    USDJPY: 160,

    MHI: 3650,
    ADVT: 11800,
    FJK: 7200,
    VRAIN: 3950
};

// portfolio.jsから参照する株価データ
let stockPrices = {
    ...DEFAULT_STOCK_PRICES
};

// =====================================
// 数値チェック
// =====================================

function validStockNumber(value, fallback = 0) {
    const number = Number(value);

    return Number.isFinite(number) && number > 0
        ? number
        : fallback;
}

// =====================================
// APIデータを整形
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
// 株価取得
// =====================================

async function refreshStockPrices() {
    if (!STOCK_API_URL) {
        console.info(
            "株価API未設定：仮価格を使用します"
        );

        return stockPrices;
    }

    try {
        const response = await fetch(
            STOCK_API_URL,
            {
                cache: "no-store"
            }
        );

        if (!response.ok) {
            throw new Error(
                `株価APIエラー: ${response.status}`
            );
        }

        const data = await response.json();

        stockPrices = normalizeStockData(data);

        console.log(
            "株価取得成功:",
            stockPrices
        );

        return stockPrices;

    } catch (error) {
        console.error(
            "株価取得失敗:",
            error
        );

        return stockPrices;
    }
}

// =====================================
// 株価更新後に画面を再計算
// =====================================

async function initializeStockPrices() {
    await refreshStockPrices();

    if (
        typeof loadMarketData === "function"
    ) {
        await loadMarketData();
    }
}

// =====================================
// 外部から株価を手動更新
// =====================================

async function reloadStockPrices() {
    await initializeStockPrices();

    alert("株価を更新しました");
}
