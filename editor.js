// =====================================
// Asset Editor v2.0
// 銘柄追加・削除・Yahooコード対応
// =====================================

window.renderEditor = function () {
    const editor =
        document.getElementById("editor");

    if (!editor) return;

    const assetInputs = assets
        .map((asset, index) => {
            const costUnit =
                asset.type === "us"
                    ? "ドル"
                    : "円";

            const yahooInput =
                asset.type === "jp" ||
                asset.type === "us"
                    ? `
                    <label>
                        Yahoo Financeコード
                        <input
                            type="text"
                            data-index="${index}"
                            data-field="yahooSymbol"
                            value="${asset.yahooSymbol || ""}"
                            placeholder="${
                                asset.type === "jp"
                                    ? "例：1605.T"
                                    : "例：AAPL"
                            }">
                    </label>
                    `
                    : "";

            return `
                <div class="editor-item">

                    <div class="editor-title">
                        <strong>
                            ${asset.name}
                            （${asset.symbol}）
                        </strong>

                        <button
                            type="button"
                            onclick="deleteAsset(${index})"
                            style="
                                float:right;
                                min-height:auto;
                                padding:5px 9px;
                                background:#a92f3b;
                                font-size:12px;
                            ">
                            🗑 削除
                        </button>
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

                    ${yahooInput}

                </div>
            `;
        })
        .join("");

    editor.innerHTML = `
        ${assetInputs}

        <div
            class="editor-item"
            style="grid-column:1/-1;">

            <div class="editor-title">
                <strong>➕ 新しい銘柄を追加</strong>
            </div>

            <label>
                種類
                <select
                    id="newAssetType"
                    style="
                        width:100%;
                        margin-top:5px;
                        padding:11px 12px;
                        background:#080d19;
                        color:white;
                        border:1px solid rgba(255,255,255,.12);
                        border-radius:10px;
                    ">
                    <option value="crypto">
                        仮想通貨
                    </option>
                    <option value="jp">
                        日本株
                    </option>
                    <option value="us">
                        米国株
                    </option>
                </select>
            </label>

            <label>
                シンボル
                <input
                    id="newAssetSymbol"
                    type="text"
                    placeholder="例：TAO / AAPL / INPEX">
            </label>

            <label>
                銘柄名
                <input
                    id="newAssetName"
                    type="text"
                    placeholder="例：Apple">
            </label>

            <label>
                数量・株数
                <input
                    id="newAssetAmount"
                    type="number"
                    inputmode="decimal"
                    step="any"
                    min="0"
                    placeholder="0">
            </label>

            <label>
                平均取得単価
                <input
                    id="newAssetCost"
                    type="number"
                    inputmode="decimal"
                    step="any"
                    min="0"
                    placeholder="0">
            </label>

            <label>
                CoinGecko ID
                <input
                    id="newCoinGeckoId"
                    type="text"
                    placeholder="仮想通貨のみ。例：bittensor">
            </label>

            <label>
                Yahoo Financeコード
                <input
                    id="newYahooSymbol"
                    type="text"
                    placeholder="米国株：AAPL／日本株：1605.T">
            </label>

            <button
                type="button"
                onclick="addNewAsset()"
                style="width:100%;margin-top:14px;">
                ➕ 銘柄を追加
            </button>

        </div>
    `;
};

// =====================================
// 銘柄追加
// =====================================

window.addNewAsset = async function () {
    const type =
        document.getElementById(
            "newAssetType"
        ).value;

    const symbol =
        document.getElementById(
            "newAssetSymbol"
        )
        .value
        .trim()
        .toUpperCase();

    const name =
        document.getElementById(
            "newAssetName"
        )
        .value
        .trim();

    const amount =
        Math.max(
            0,
            Number(
                document.getElementById(
                    "newAssetAmount"
                ).value
            ) || 0
        );

    const cost =
        Math.max(
            0,
            Number(
                document.getElementById(
                    "newAssetCost"
                ).value
            ) || 0
        );

    const coinGeckoId =
        document.getElementById(
            "newCoinGeckoId"
        )
        .value
        .trim()
        .toLowerCase();

    const yahooSymbol =
        document.getElementById(
            "newYahooSymbol"
        )
        .value
        .trim();

    if (!symbol || !name) {
        alert(
            "シンボルと銘柄名を入力してください"
        );
        return;
    }

    if (
        assets.some(
            asset =>
                asset.symbol === symbol
        )
    ) {
        alert(
            "同じシンボルが登録されています"
        );
        return;
    }

    if (
        type === "crypto" &&
        !coinGeckoId
    ) {
        alert(
            "CoinGecko IDを入力してください"
        );
        return;
    }

    if (
        (type === "jp" || type === "us") &&
        !yahooSymbol
    ) {
        alert(
            "Yahoo Financeコードを入力してください"
        );
        return;
    }

    const newAsset = {
        symbol,
        name,
        type,
        amount,
        cost
    };

    if (type === "crypto") {
        newAsset.coinGeckoId =
            coinGeckoId;
    }

    if (
        type === "jp" ||
        type === "us"
    ) {
        newAsset.yahooSymbol =
            yahooSymbol;
    }

    assets.push(newAsset);

    transactionHistory.unshift({
        id: Date.now(),
        date: new Date().toISOString(),
        action:
            `${name}（${symbol}）を追加`
    });

    saveAssetsToStorage(assets);
    saveHistoryToStorage(
        transactionHistory
    );

    if (
        typeof initializeStockPrices ===
        "function"
    ) {
        await initializeStockPrices();
    } else {
        await loadMarketData();
    }

    alert("銘柄を追加しました！");
};

// =====================================
// 銘柄削除
// =====================================

window.deleteAsset = async function (
    index
) {
    const asset = assets[index];

    if (!asset) return;

    const confirmed = confirm(
        `${asset.name}（${asset.symbol}）を削除しますか？`
    );

    if (!confirmed) return;

    const deleted =
        assets.splice(index, 1)[0];

    transactionHistory.unshift({
        id: Date.now(),
        date: new Date().toISOString(),
        action:
            `${deleted.name}（${deleted.symbol}）を削除`
    });

    saveAssetsToStorage(assets);
    saveHistoryToStorage(
        transactionHistory
    );

    if (
        typeof initializeStockPrices ===
        "function"
    ) {
        await initializeStockPrices();
    } else {
        await loadMarketData();
    }

    alert("削除しました");
};
