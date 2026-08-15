// =====================================
// Portfolio Manager v3.0
// Bitcoin1070 PRO
// =====================================

// =====================================
// 初期資産
// cost:
// 仮想通貨・日本株 = 円
// 米国株 = ドル
// =====================================

// =====================================
// 初期資産
// =====================================

const DEFAULT_ASSETS = [];

// =====================================
// アプリ状態
// =====================================

let assets = loadAssetsFromStorage(DEFAULT_ASSETS);
let transactionHistory = loadHistoryFromStorage();

const CRYPTO_API_URL = "https://bitcoin1070-api.531unchi.workers.dev";
// v8.2の保存データを引き継ぐためキー名は維持
const CRYPTO_CACHE_KEY = "bitcoin1070_crypto_prices_v8_2";
const CRYPTO_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
// キャッシュ読込関数から参照されるため、必ず先に宣言する
let latestCryptoPricesUpdatedAt = null;
let latestCryptoPrices = loadCachedCryptoPrices();

function loadCachedCryptoPrices() {
    try {
        const saved = JSON.parse(localStorage.getItem(CRYPTO_CACHE_KEY) || "null");
        if (!saved || !saved.prices || typeof saved.prices !== "object") return {};

        const normalized = {};
        Object.entries(saved.prices).forEach(([key, value]) => {
            const price = Number(value);
            if (Number.isFinite(price) && price > 0) {
                normalized[String(key).trim().toUpperCase()] = price;
            }
        });

        if (Object.keys(normalized).length === 0) return {};
        latestCryptoPricesUpdatedAt = saved.fetchedAt || null;
        return normalized;
    } catch (error) {
        console.warn("仮想通貨価格キャッシュ読込エラー:", error);
        return {};
    }
}

function saveCryptoPrices(prices, fetchedAt) {
    if (!prices || Object.keys(prices).length === 0) return;
    latestCryptoPricesUpdatedAt = fetchedAt || new Date().toISOString();
    localStorage.setItem(CRYPTO_CACHE_KEY, JSON.stringify({ prices, fetchedAt: latestCryptoPricesUpdatedAt }));
}
let latestEvaluations = [];



// =====================================
// 表示用
// =====================================

function formatYen(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "¥0";
    }

    return `¥${Math.round(number).toLocaleString("ja-JP")}`;
}

function formatDollar(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "$0.00";
    }

    return `$${number.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}

function formatNumber(value, digits = 8) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "0";
    }

    return number.toLocaleString("ja-JP", {
        maximumFractionDigits: digits
    });
}

function formatPercent(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "0.00%";
    }

    const sign = number > 0 ? "+" : "";

    return `${sign}${number.toFixed(2)}%`;
}

function getProfitClass(value) {
    if (value > 0) {
        return "profit-positive";
    }

    if (value < 0) {
        return "profit-negative";
    }

    return "profit-neutral";
}

function getTypeLabel(type) {
    if (type === "crypto") {
        return "🪙 仮想通貨";
    }

    if (type === "us") {
        return "🇺🇸 米国株";
    }

    if (type === "cash") {
        return "💴 日本円";
    }

    return "🇯🇵 日本株";
}

function escapePortfolioHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}

// =====================================
// 株価情報
// stocks.jsのデータがあれば使用
// なければ仮価格
// =====================================

function getStockPriceData() {
    if (typeof stockPrices !== "undefined" && stockPrices && typeof stockPrices === "object") return { ...stockPrices };
    if (typeof window.stockPriceData !== "undefined" && window.stockPriceData) return { ...window.stockPriceData };
    return {};
}

// =====================================
// CoinGecko価格取得
// =====================================

async function fetchCryptoPrices() {
    const cryptoAssets = assets.filter(asset => asset.type === "crypto" && asset.coinGeckoId);
    const ids = [...new Set(cryptoAssets.map(asset => String(asset.coinGeckoId).trim().toLowerCase()).filter(Boolean))];
    if (ids.length === 0) return latestCryptoPrices;

    const endpoint = `${CRYPTO_API_URL}?mode=crypto&ids=${encodeURIComponent(ids.join(","))}`;
    let data;
    try {
        const response = await fetch(endpoint, { cache: "no-store" });
        if (!response.ok) throw new Error(`仮想通貨API取得失敗: ${response.status}`);
        data = await response.json();
    } catch (apiError) {
        // API障害時のみCoinGeckoへ直接フォールバック
        const direct = "https://api.coingecko.com/api/v3/simple/price" +
            `?ids=${encodeURIComponent(ids.join(","))}&vs_currencies=jpy&include_24hr_change=true`;
        const response = await fetch(direct, { cache: "no-store" });
        if (!response.ok) throw apiError;
        const directData = await response.json();
        data = { prices: directData, fetchedAt: new Date().toISOString() };
    }

    const nextPrices = { ...latestCryptoPrices };
    cryptoAssets.forEach(asset => {
        const id = String(asset.coinGeckoId).trim().toLowerCase();
        const value = Number(data?.prices?.[id]?.jpy ?? data?.[id]?.jpy);
        if (Number.isFinite(value) && value > 0) {
            const symbolKey = String(asset.symbol || "").trim().toUpperCase();
            const idKey = String(asset.coinGeckoId || "").trim().toUpperCase();
            if (symbolKey) nextPrices[symbolKey] = value;
            if (idKey) nextPrices[idKey] = value;
        }
    });

    if (Object.keys(nextPrices).length === 0) throw new Error("有効な仮想通貨価格がありません");
    saveCryptoPrices(nextPrices, data?.fetchedAt);
    return nextPrices;
}

// =====================================
// 評価計算
// =====================================

function evaluateAssets() {
    const stocks = getStockPriceData();
    const usdJpy = Number(stocks.USDJPY) || 0;
    latestEvaluations = assets.map(asset => {
        const amount = Number(asset.amount) || 0;
        const rawCost = asset.cost;
        const cost = (rawCost === null || rawCost === undefined || rawCost === "") ? null : Number(rawCost);
        let currentPrice = 0, currentPriceJpy = 0, acquisitionValueJpy = null;
        if (asset.type === "crypto") {
            const symbolKey=String(asset.symbol||"").trim().toUpperCase(), idKey=String(asset.coinGeckoId||"").trim().toUpperCase();
            currentPrice=Number(latestCryptoPrices[symbolKey] ?? latestCryptoPrices[idKey])||0; currentPriceJpy=currentPrice;
            if(Number.isFinite(cost) && cost>=0) acquisitionValueJpy=amount*cost;
        } else if (asset.type === "jp") {
            currentPrice=Number(stocks[String(asset.symbol||"").trim().toUpperCase()])||0; currentPriceJpy=currentPrice;
            if(Number.isFinite(cost) && cost>=0) acquisitionValueJpy=amount*cost;
        } else if (asset.type === "us") {
            currentPrice=Number(stocks[String(asset.symbol||"").trim().toUpperCase()])||0; currentPriceJpy=(currentPrice>0&&usdJpy>0)?currentPrice*usdJpy:0;
            const costJpy=Number(asset.costJpy), acquisitionFx=Number(asset.acquisitionUsdJpy);
            if(Number.isFinite(costJpy)&&costJpy>=0) acquisitionValueJpy=amount*costJpy;
            else if(Number.isFinite(cost)&&cost>=0&&Number.isFinite(acquisitionFx)&&acquisitionFx>0) acquisitionValueJpy=amount*cost*acquisitionFx;
        }
        const marketValueJpy=amount*currentPriceJpy;
        const profitJpy=(acquisitionValueJpy!==null && currentPriceJpy>0)?marketValueJpy-acquisitionValueJpy:null;
        const profitRate=(profitJpy!==null && acquisitionValueJpy>0)?profitJpy/acquisitionValueJpy*100:null;
        return {...asset,amount,cost,currentPrice,currentPriceJpy,marketValueJpy,acquisitionValueJpy,profitJpy,profitRate,usdJpy};
    });
    return latestEvaluations;
}
// =====================================
// 総資産表示
// =====================================

function renderTotalAsset(evaluations) {
    const cashBalance = typeof loadCashBalance === "function" ? loadCashBalance() : 0;
    const total = evaluations.reduce(
        (sum, asset) => sum + asset.marketValueJpy,
        cashBalance
    );

    const profitKnown = evaluations.filter(asset => asset.profitJpy !== null);
    const totalCost = profitKnown.reduce((sum, asset) => sum + Number(asset.acquisitionValueJpy || 0), 0);
    const totalProfit = profitKnown.reduce((sum, asset) => sum + Number(asset.profitJpy || 0), 0);
    const totalProfitRate = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

    const totalElement =
        document.getElementById("totalAsset");

    const commentElement =
        document.getElementById("assetComment");

    if (totalElement) {
        totalElement.textContent = formatYen(total);
    }

    if (commentElement) {
        commentElement.innerHTML = `
            仮想通貨・日本株・米国株・日本円 合計<br>
            <span class="${getProfitClass(totalProfit)}">
                損益：
                ${totalProfit >= 0 ? "+" : ""}
                ${formatYen(totalProfit)}
                （${formatPercent(totalProfitRate)}）
            </span>
        `;
    }
}

// =====================================
// 資産カード
// =====================================

function createAssetCard(asset) {
    const currentPriceText =
        asset.type === "us"
            ? `${formatDollar(asset.currentPrice)}
               ／ 約${formatYen(asset.currentPriceJpy)}`
            : formatYen(asset.currentPriceJpy);

    const costText = asset.acquisitionValueJpy === null
        ? "取得原価未確定"
        : asset.type === "us"
            ? `${formatDollar(asset.cost)} ／ 約${formatYen(asset.amount > 0 ? asset.acquisitionValueJpy / asset.amount : 0)}`
            : formatYen(asset.cost);

    return `
        <div class="asset-card">

            <div class="asset-card-header">
                <div>
                    <strong>${escapePortfolioHtml(asset.name)}</strong>
                    <span class="asset-symbol">
                        ${escapePortfolioHtml(asset.symbol)}
                    </span>
                </div>

                <span class="asset-type">
                    ${getTypeLabel(asset.type)}
                </span>
            </div>

            <div class="asset-row">
                <span>保有数量</span>
                <strong>
                    ${formatNumber(asset.amount)}
                    ${asset.type === "crypto"
                        ? escapePortfolioHtml(asset.symbol)
                        : "株"}
                </strong>
            </div>

            <div class="asset-row">
                <span>平均取得単価</span>
                <strong>${costText}</strong>
            </div>

            <div class="asset-row">
                <span>現在価格</span>
                <strong>${currentPriceText}</strong>
            </div>

            <div class="asset-row">
                <span>評価額</span>
                <strong>
                    ${formatYen(asset.marketValueJpy)}
                </strong>
            </div>

            <div class="asset-row">
                <span>損益</span>

                <strong class="${asset.profitJpy === null ? "profit-neutral" : getProfitClass(asset.profitJpy)}">
                    ${asset.profitJpy === null ? "取得原価未確定" : `${asset.profitJpy >= 0 ? "+" : ""}${formatYen(asset.profitJpy)}（${formatPercent(asset.profitRate)}）`}
                </strong>
            </div>

        </div>
    `;
}

// =====================================
// 保有資産一覧
// =====================================

function renderPortfolio(evaluations) {
    const container =
        document.getElementById("portfolioList");

    if (!container) {
        return;
    }

    const groups = [
        {
            type: "crypto",
            title: "🪙 仮想通貨"
        },
        {
            type: "jp",
            title: "🇯🇵 日本株"
        },
        {
            type: "us",
            title: "🇺🇸 米国株"
        }
    ];

    let html = "";

    const cashBalance = typeof loadCashBalance === "function" ? loadCashBalance() : 0;
    if (cashBalance > 0) {
        html += `<section class="portfolio-section asset-anchor-section" id="assets-cash"><div class="portfolio-section-heading"><h3>💴 日本円</h3><a href="#assetCategories" class="back-to-categories">ジャンルへ戻る ↑</a></div><div class="asset-card-list"><div class="asset-card"><div class="asset-card-header"><div><strong>日本円</strong><span class="asset-symbol">JPY</span></div><span class="asset-type">💴 現金</span></div><div class="asset-row"><span>保有残高</span><strong>${formatYen(cashBalance)}</strong></div><div class="asset-row"><span>評価額</span><strong>${formatYen(cashBalance)}</strong></div><div class="asset-row"><span>価格変動</span><strong class="profit-neutral">なし</strong></div></div></div></section>`;
    }

    groups.forEach(group => {
        const groupAssets = evaluations.filter(
            asset => asset.type === group.type
        );

        if (groupAssets.length === 0) {
            return;
        }

        html += `
            <section class="portfolio-section asset-anchor-section" id="assets-${group.type}">
                <div class="portfolio-section-heading"><h3>${group.title}</h3><a href="#assetCategories" class="back-to-categories">ジャンルへ戻る ↑</a></div>

                <div class="asset-card-list">
                    ${groupAssets
                        .map(createAssetCard)
                        .join("")}
                </div>
            </section>
        `;
    });

    container.innerHTML = html || `
        <div class="empty-holdings-state">
            <strong>保有銘柄がまだ登録されていません</strong>
            <p>資産編集から銘柄と数量を登録すると、ここに表示されます。</p>
            <a href="portfolio-edit.html" class="page-link-button">✏️ 保有資産を登録</a>
        </div>
    `;
}

// =====================================
// 編集画面
// =====================================

function renderEditor() {
    const editor =
        document.getElementById("editor");

    if (!editor) {
        return;
    }

    editor.innerHTML = assets
        .map((asset, index) => {
            const costUnit =
                asset.type === "us" ? "ドル" : "円";

            return `
                <div class="editor-item">

                    <div class="editor-title">
                        <strong>
                            ${asset.name}
                            （${asset.symbol}）
                        </strong>
                    </div>

                    <label>
                        数量
                        <input
                            type="number"
                            inputmode="decimal"
                            step="any"
                            min="0"
                            data-index="${index}"
                            data-field="amount"
                            value="${asset.amount}">
                    </label>

                    <label>
                        平均取得単価（${costUnit}）
                        <input
                            type="number"
                            inputmode="decimal"
                            step="any"
                            min="0"
                            data-index="${index}"
                            data-field="cost"
                            value="${asset.cost}">
                    </label>

                </div>
            `;
        })
        .join("");
}

// =====================================
// 編集内容を保存
// =====================================

function saveEditorValues() {
    const editor =
        document.getElementById("editor");

    if (!editor) {
        return;
    }

    const inputs =
        editor.querySelectorAll("input[data-index]");

    inputs.forEach(input => {
        const index =
            Number(input.dataset.index);

        const field =
            input.dataset.field;

        if (!assets[index]) {
            return;
        }

        const value =
            Math.max(0, Number(input.value) || 0);

        assets[index][field] = value;
    });

    saveAssetsToStorage(assets);

    transactionHistory.unshift({
        id: Date.now(),
        date: new Date().toISOString(),
        action: "保有資産を編集"
    });

    saveHistoryToStorage(transactionHistory);

    refreshPortfolio();

    alert("保存しました！");
}

// =====================================
// 資産ランキング
// =====================================

function renderRanking(evaluations) {
    const container =
        document.getElementById("rankingList");

    if (!container) {
        return;
    }

    const total = evaluations.reduce(
        (sum, asset) => sum + asset.marketValueJpy,
        0
    );

    const sorted = [...evaluations].sort(
        (a, b) =>
            b.marketValueJpy - a.marketValueJpy
    );

    container.innerHTML = sorted
        .map((asset, index) => {
            const percentage =
                total > 0
                    ? (
                        asset.marketValueJpy /
                        total *
                        100
                    ).toFixed(1)
                    : "0.0";

            const rankIcons = ["🥇", "🥈", "🥉"];

            const rank =
                rankIcons[index] ||
                `${index + 1}位`;

            return `
                <div class="ranking-row">

                    <span>
                        ${rank}
                        ${asset.name}
                    </span>

                    <strong>
                        ${formatYen(asset.marketValueJpy)}
                        ／ ${percentage}%
                    </strong>

                </div>
            `;
        })
        .join("");
}

// =====================================
// 履歴表示
// =====================================

function renderHistory() {
    const container =
        document.getElementById("historyList");

    if (!container) {
        return;
    }

    if (transactionHistory.length === 0) {
        container.textContent =
            "まだ履歴はありません";

        return;
    }

    container.innerHTML = transactionHistory
        .slice(0, 20)
        .map(item => {
            const date =
                new Date(item.date);

            return `
                <div class="history-row">

                    <span>
                        ${date.toLocaleString("ja-JP")}
                    </span>

                    <strong>
                        ${item.action}
                    </strong>

                </div>
            `;
        })
        .join("");
}

// =====================================
// 円グラフ連携
// =====================================

function updatePortfolioChart(evaluations) {
    if (
        typeof drawPortfolioChartV3 === "function"
    ) {
        drawPortfolioChartV3(evaluations);
        return;
    }

    if (
        typeof drawPortfolioChart === "function"
    ) {
        drawPortfolioChart(evaluations);
    }
}

// =====================================
// 全画面更新
// =====================================

function refreshPortfolio() {
    const evaluations = evaluateAssets();

    renderTotalAsset(evaluations);
    renderPortfolio(evaluations);
    renderEditor();
    renderRanking(evaluations);
    renderHistory();
    updatePortfolioChart(evaluations);

    if (typeof updateMonitoringDashboard === "function") {
        updateMonitoringDashboard(evaluations);
    }

    if (typeof updatePortfolioAnalytics === "function") {

        updatePortfolioAnalytics(evaluations);

    }
}

// =====================================
// バックアップ
// =====================================

function setupBackupButton() {
    const button =
        document.getElementById("backupBtn");

    if (!button) {
        return;
    }

    button.addEventListener("click", () => {
        exportAppData(
            assets,
            transactionHistory
        );
    });
}

// =====================================
// 復元
// =====================================

function setupRestoreButton() {
    const button =
        document.getElementById("restoreBtn");

    if (!button) {
        return;
    }

    const input =
        document.createElement("input");

    input.type = "file";
    input.accept = ".json,application/json";
    input.hidden = true;

    document.body.appendChild(input);

    button.addEventListener("click", () => {
        input.click();
    });

    input.addEventListener("change", async () => {
        const file = input.files?.[0];

        if (!file) {
            return;
        }

        try {
            const restored =
                await importAppData(file);

            assets = restored.assets;
            transactionHistory =
                restored.history;

            saveAssetsToStorage(assets);
            saveHistoryToStorage(
                transactionHistory
            );
            if (restored.cashBalance !== null && restored.cashBalance !== undefined && typeof saveCashBalance === "function") {
                saveCashBalance(restored.cashBalance);
            }

            await loadMarketData();

            alert("復元しました！");
        } catch (error) {
            console.error(error);

            alert(
                "復元に失敗しました：" +
                error.message
            );
        } finally {
            input.value = "";
        }
    });
}

// =====================================
// 初期化
// =====================================

function setupResetButton() {
    const button =
        document.getElementById("resetBtn");

    if (!button) {
        return;
    }

    button.addEventListener("click", async () => {
        const confirmed = confirm(
            "保存データをすべて初期化しますか？"
        );

        if (!confirmed) {
            return;
        }

        resetAppStorage();

        assets =
            structuredClone(DEFAULT_ASSETS);

        transactionHistory = [];

        await loadMarketData();

        alert("初期化しました");
    });
}

// =====================================
// 保存ボタン
// =====================================

function setupSaveButton() {
    const button =
        document.getElementById("saveButton");

    if (!button) {
        return;
    }

    button.addEventListener(
        "click",
        saveEditorValues
    );
}

// =====================================
// 市場データ読込
// =====================================

async function loadMarketData() {
    const comment =
        document.getElementById("assetComment");

    // ページ移動直後は保存済みの正常価格を先に描画し、0円表示を防ぐ
    if (Object.keys(latestCryptoPrices).length > 0) {
        refreshPortfolio();
    }

    try {
        if (comment) {
            comment.textContent =
                "最新価格を取得中...";
        }

        const fetchedPrices = await fetchCryptoPrices();
        if (fetchedPrices && Object.keys(fetchedPrices).length > 0) {
            latestCryptoPrices = fetchedPrices;
        }

        if (comment) {
            const stamp = latestCryptoPricesUpdatedAt
                ? new Date(latestCryptoPricesUpdatedAt).toLocaleString("ja-JP")
                : "現在";
            comment.textContent = `価格更新: ${stamp}`;
        }
        refreshPortfolio();
    } catch (error) {
        console.error(
            "市場データ取得エラー:",
            error
        );

        if (comment) {
            const hasCache = Object.keys(latestCryptoPrices).length > 0;
            comment.textContent = hasCache
                ? "通信不安定のため前回取得価格を表示中"
                : "仮想通貨価格を取得できません。通信を確認してください。";
        }

        refreshPortfolio();
    }
}


function setupHomeAssetControls() {
    const refreshButton = document.getElementById("homeRefreshAsset");
    if (refreshButton) {
        refreshButton.addEventListener("click", async () => {
            refreshButton.disabled = true;
            refreshButton.textContent = "更新中...";
            try { await loadMarketData(); } finally {
                refreshButton.disabled = false;
                refreshButton.textContent = "↻ 価格を更新";
            }
        });
    }

    document.querySelectorAll('a[href^="#assets-"]').forEach(link => {
        link.addEventListener("click", event => {
            const target = document.querySelector(link.getAttribute("href"));
            if (!target) return;
            event.preventDefault();
            target.scrollIntoView({ behavior: "smooth", block: "start" });
            history.replaceState(null, "", link.getAttribute("href"));
        });
    });
}

// =====================================
// 起動
// =====================================

document.addEventListener(
    "DOMContentLoaded",
    () => {
        setupSaveButton();
        setupBackupButton();
        setupRestoreButton();
        setupResetButton();
        setupHomeAssetControls();

        loadMarketData();
    }
);
