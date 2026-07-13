// Bitcoin1070 PRO v5.1 - asset editor page
const DEFAULT_ASSETS = [];
let assets = loadAssetsFromStorage(DEFAULT_ASSETS);
let transactionHistory = loadHistoryFromStorage();

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function renderAssetEditor() {
    const editor = document.getElementById("editor");
    if (!editor) return;

    const items = assets.map((asset, index) => {
        const costUnit = asset.type === "us" ? "ドル" : "円";
        const marketCode = asset.type === "crypto"
            ? `<label>CoinGecko ID<input type="text" data-index="${index}" data-field="coinGeckoId" value="${escapeHtml(asset.coinGeckoId || "")}" placeholder="例：bitcoin"></label>`
            : `<label>Yahoo Financeコード<input type="text" data-index="${index}" data-field="yahooSymbol" value="${escapeHtml(asset.yahooSymbol || "")}" placeholder="例：1605.T / AAPL"></label>`;

        return `<section class="card editor-page-item">
            <div class="editor-page-title">
                <div><strong>${escapeHtml(asset.name)}</strong><span>${escapeHtml(asset.symbol)} ・ ${asset.type === "crypto" ? "仮想通貨" : asset.type === "jp" ? "日本株" : "米国株"}</span></div>
                <button type="button" class="delete-button" data-delete-index="${index}">🗑 削除</button>
            </div>
            <div class="editor-page-grid">
                <label>銘柄名<input type="text" data-index="${index}" data-field="name" value="${escapeHtml(asset.name)}"></label>
                <label>数量・株数<input type="number" inputmode="decimal" step="any" min="0" data-index="${index}" data-field="amount" value="${asset.amount}"></label>
                <label>平均取得単価（${costUnit}）<input type="number" inputmode="decimal" step="any" min="0" data-index="${index}" data-field="cost" value="${asset.cost}"></label>
                ${marketCode}
            </div>
        </section>`;
    }).join("");

    editor.innerHTML = `${items || '<div class="card"><p>保有資産がまだありません。</p></div>'}
        <section class="card add-asset-card">
            <h2>➕ 新しい銘柄を追加</h2>
            <div class="editor-page-grid">
                <label>種類<select id="newAssetType"><option value="crypto">仮想通貨</option><option value="jp">日本株</option><option value="us">米国株</option></select></label>
                <label>シンボル<input id="newAssetSymbol" type="text" placeholder="BTC / INPEX / NVDA"></label>
                <label>銘柄名<input id="newAssetName" type="text" placeholder="Bitcoin / INPEX / NVIDIA"></label>
                <label>数量・株数<input id="newAssetAmount" type="number" inputmode="decimal" step="any" min="0" placeholder="0"></label>
                <label>平均取得単価<input id="newAssetCost" type="number" inputmode="decimal" step="any" min="0" placeholder="0"></label>
                <label>CoinGecko ID<input id="newCoinGeckoId" type="text" placeholder="仮想通貨のみ：bitcoin"></label>
                <label>Yahoo Financeコード<input id="newYahooSymbol" type="text" placeholder="株のみ：1605.T / NVDA"></label>
            </div>
            <button id="addAssetButton" type="button" class="full-width-button">➕ 銘柄を追加</button>
        </section>`;

    editor.querySelectorAll("[data-delete-index]").forEach(button => {
        button.addEventListener("click", () => deleteAsset(Number(button.dataset.deleteIndex)));
    });
    document.getElementById("addAssetButton")?.addEventListener("click", addAsset);
}

function collectChanges() {
    document.querySelectorAll("#editor [data-index][data-field]").forEach(input => {
        const asset = assets[Number(input.dataset.index)];
        if (!asset) return;
        const field = input.dataset.field;
        if (field === "amount" || field === "cost") asset[field] = Math.max(0, Number(input.value) || 0);
        else asset[field] = input.value.trim();
    });
}

function saveChanges() {
    collectChanges();
    saveAssetsToStorage(assets);
    transactionHistory.unshift({ id: Date.now(), date: new Date().toISOString(), action: "保有資産を編集" });
    saveHistoryToStorage(transactionHistory);
    alert("変更を保存しました！");
    renderAssetEditor();
}

function deleteAsset(index) {
    const asset = assets[index];
    if (!asset || !confirm(`${asset.name}（${asset.symbol}）を削除しますか？`)) return;
    assets.splice(index, 1);
    transactionHistory.unshift({ id: Date.now(), date: new Date().toISOString(), action: `${asset.name}（${asset.symbol}）を削除` });
    saveAssetsToStorage(assets);
    saveHistoryToStorage(transactionHistory);
    renderAssetEditor();
}

function addAsset() {
    collectChanges();
    const type = document.getElementById("newAssetType").value;
    const symbol = document.getElementById("newAssetSymbol").value.trim().toUpperCase();
    const name = document.getElementById("newAssetName").value.trim();
    const amount = Math.max(0, Number(document.getElementById("newAssetAmount").value) || 0);
    const cost = Math.max(0, Number(document.getElementById("newAssetCost").value) || 0);
    const coinGeckoId = document.getElementById("newCoinGeckoId").value.trim().toLowerCase();
    const yahooSymbol = document.getElementById("newYahooSymbol").value.trim();
    if (!symbol || !name) return alert("シンボルと銘柄名を入力してください");
    if (assets.some(asset => asset.symbol === symbol)) return alert("同じシンボルが登録されています");
    if (type === "crypto" && !coinGeckoId) return alert("仮想通貨はCoinGecko IDを入力してください");
    if (type !== "crypto" && !yahooSymbol) return alert("株はYahoo Financeコードを入力してください");
    const asset = { type, symbol, name, amount, cost };
    if (type === "crypto") asset.coinGeckoId = coinGeckoId;
    else asset.yahooSymbol = yahooSymbol;
    assets.push(asset);
    transactionHistory.unshift({ id: Date.now(), date: new Date().toISOString(), action: `${name}（${symbol}）を追加` });
    saveAssetsToStorage(assets);
    saveHistoryToStorage(transactionHistory);
    renderAssetEditor();
    alert("銘柄を追加しました！");
}

document.addEventListener("DOMContentLoaded", () => {
    renderAssetEditor();
    document.getElementById("saveButton")?.addEventListener("click", saveChanges);
});
