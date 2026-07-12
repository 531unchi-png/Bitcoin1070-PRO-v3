// =====================================
// Stock Manager v3.2
// 追加した株も自動取得
// =====================================

const STOCK_API_URL =
    "https://bitcoin1070-api.531unchi.workers.dev";

// 既存銘柄のYahoo Financeコード
const DEFAULT_YAHOO_SYMBOLS = {
    NVDA: "NVDA",
    MHI: "7011.T",
    ADVT: "6857.T",
    FJK: "5803.T",
    VRAIN: "135A.T"
};

// 取得失敗時の予備価格
const DEFAULT_STOCK_PRICES = {
    NVDA: 185,
    USDJPY: 160,
    MHI: 3650,
    ADVT: 11800,
    FJK: 7200,
    VRAIN: 3950
};

let stockPrices = {
    ...DEFAULT_STOCK_PRICES
};

let stockPricesUpdatedAt = null;

function validStockNumber(value, fallback = 0) {
    const number = Number(value);

    return Number.isFinite(number) && number > 0
        ? number
        : fallback;
}

// =====================================
// アプリに登録された株から取得コードを作成
// =====================================

function createRequestedStockSymbols() {
    if (
        typeof assets === "undefined" ||
        !Array.isArray(assets)
    ) {
        return DEFAULT_YAHOO_SYMBOLS;
    }

    const requested = {};

    assets.forEach(asset => {
        if (
            asset.type !== "jp" &&
            asset.type !== "us"
        ) {
            return;
        }

        const key =
            String(asset.symbol || "")
                .trim()
                .toUpperCase();

        if (!key) {
            return;
        }

        let yahooSymbol =
            String(asset.yahooSymbol || "")
                .trim();

        // 既存銘柄は固定マッピング
        if (!yahooSymbol) {
            yahooSymbol =
                DEFAULT_YAHOO_SYMBOLS[key] || "";
        }

        // 米国株はシンボルをそのまま使用
        if (
            !yahooSymbol &&
            asset.type === "us"
        ) {
            yahooSymbol = key;
        }

        if (yahooSymbol) {
            requested[key] = yahooSymbol;
        }
    });

    return requested;
}

function createStockApiUrl() {
    const requested =
        createRequestedStockSymbols();

    const symbols = Object.entries(requested)
        .map(([key, yahooSymbol]) =>
            `${encodeURIComponent(key)}:` +
            `${encodeURIComponent(yahooSymbol)}`
        )
        .join(",");

    if (!symbols) {
        return `${STOCK_API_URL}?t=${Date.now()}`;
    }

    return (
        `${STOCK_API_URL}` +
        `?symbols=${symbols}` +
        `&t=${Date.now()}`
    );
}

function normalizeStockData(data) {
    const normalized = {
        ...stockPrices
    };

    Object.entries(data).forEach(
        ([key, value]) => {
            if (
                key === "details" ||
                key === "errors" ||
                key === "fetchedAt" ||
                key === "requestedSymbols"
            ) {
                return;
            }

            normalized[key] =
                validStockNumber(
                    value,
                    normalized[key] || 0
                );
        }
    );

    return normalized;
}

// =====================================
// 株価取得
// =====================================

async function refreshStockPrices() {
    try {
        const apiUrl =
            createStockApiUrl();

        console.log(
            "株価取得URL:",
            apiUrl
        );

        const response = await fetch(
            apiUrl,
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

async function initializeStockPrices() {
    await refreshStockPrices();

    if (
        typeof loadMarketData === "function"
    ) {
        await loadMarketData();
    }
}

async function reloadStockPrices() {
    await initializeStockPrices();

    alert("最新の株価へ更新しました");
}

document.addEventListener(
    "DOMContentLoaded",
    () => {
        initializeStockPrices();

        setInterval(
            initializeStockPrices,
            5 * 60 * 1000
        );
    }
);
