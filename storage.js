// =====================================
// Storage Manager v3.0
// =====================================

const STORAGE_KEYS = {
    ASSETS: "bitcoin1070_v3_assets",
    HISTORY: "bitcoin1070_v3_history"
};

function saveAssetsToStorage(assets) {
    localStorage.setItem(
        STORAGE_KEYS.ASSETS,
        JSON.stringify(assets)
    );
}

function loadAssetsFromStorage(defaultAssets) {
    try {
        const saved = localStorage.getItem(STORAGE_KEYS.ASSETS);

        if (!saved) {
            return structuredClone(defaultAssets);
        }

        const parsed = JSON.parse(saved);

        if (!Array.isArray(parsed)) {
            return structuredClone(defaultAssets);
        }

        return parsed;
    } catch (error) {
        console.error("資産データ読込エラー:", error);
        return structuredClone(defaultAssets);
    }
}

function saveHistoryToStorage(history) {
    localStorage.setItem(
        STORAGE_KEYS.HISTORY,
        JSON.stringify(history)
    );
}

function loadHistoryFromStorage() {
    try {
        const saved = localStorage.getItem(STORAGE_KEYS.HISTORY);

        if (!saved) {
            return [];
        }

        const parsed = JSON.parse(saved);

        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error("履歴読込エラー:", error);
        return [];
    }
}

function exportAppData(assets, history) {
    const backup = {
        version: "3.0",
        exportedAt: new Date().toISOString(),
        assets,
        history
    };

    const blob = new Blob(
        [JSON.stringify(backup, null, 2)],
        { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `bitcoin1070-backup-${Date.now()}.json`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
}

function importAppData(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
            try {
                const data = JSON.parse(reader.result);

                if (!Array.isArray(data.assets)) {
                    throw new Error("資産データの形式が不正です");
                }

                resolve({
                    assets: data.assets,
                    history: Array.isArray(data.history)
                        ? data.history
                        : []
                });
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = () => {
            reject(new Error("ファイルの読み込みに失敗しました"));
        };

        reader.readAsText(file);
    });
}

function resetAppStorage() {
    localStorage.removeItem(STORAGE_KEYS.ASSETS);
    localStorage.removeItem(STORAGE_KEYS.HISTORY);
}

// v12.1: 日本円（現金）残高。銘柄データとは分離し、既存資産との互換性を維持。
const CASH_STORAGE_KEY = "bitcoin1070_v12_1_cash_jpy";
function loadCashBalance() {
    try {
        const value = Number(localStorage.getItem(CASH_STORAGE_KEY) || 0);
        return Number.isFinite(value) && value >= 0 ? value : 0;
    } catch (_) { return 0; }
}
function saveCashBalance(value) {
    const normalized = Math.max(0, Number(value) || 0);
    localStorage.setItem(CASH_STORAGE_KEY, String(normalized));
    return normalized;
}
