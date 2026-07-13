// =====================================
// Bitcoin1070 PRO v5.0
// お気に入り・価格アラート・AIシグナル
// =====================================

const MONITORING_STORAGE_KEY = "bitcoin1070_monitoring_v5";
let monitoringState = loadMonitoringState();
let monitoringEvaluations = [];

function loadMonitoringState() {
    try {
        const saved = JSON.parse(localStorage.getItem(MONITORING_STORAGE_KEY) || "{}");
        return {
            favorites: Array.isArray(saved.favorites) ? saved.favorites : [],
            alerts: saved.alerts && typeof saved.alerts === "object" ? saved.alerts : {}
        };
    } catch (error) {
        return { favorites: [], alerts: {} };
    }
}

function saveMonitoringState() {
    localStorage.setItem(MONITORING_STORAGE_KEY, JSON.stringify(monitoringState));
}

function monitoringEscape(value) {
    return String(value ?? "").replace(/[&<>'"]/g, char => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
    }[char]));
}

function toggleFavorite(symbol) {
    const favorites = new Set(monitoringState.favorites);
    favorites.has(symbol) ? favorites.delete(symbol) : favorites.add(symbol);
    monitoringState.favorites = [...favorites];
    saveMonitoringState();
    renderMonitoringDashboard();
}

function savePriceAlert(symbol) {
    const above = Number(document.querySelector(`[data-alert-above="${CSS.escape(symbol)}"]`)?.value) || 0;
    const below = Number(document.querySelector(`[data-alert-below="${CSS.escape(symbol)}"]`)?.value) || 0;
    monitoringState.alerts[symbol] = { above, below, enabled: above > 0 || below > 0 };
    saveMonitoringState();
    renderMonitoringDashboard();
    alert(`${symbol}の価格アラートを保存しました`);
}

function clearPriceAlert(symbol) {
    delete monitoringState.alerts[symbol];
    saveMonitoringState();
    renderMonitoringDashboard();
}

function getAlertStatus(asset) {
    const setting = monitoringState.alerts[asset.symbol];
    if (!setting?.enabled || !asset.currentPriceJpy) return "";
    if (setting.above > 0 && asset.currentPriceJpy >= setting.above) return `🚨 上限 ${formatYen(setting.above)} に到達`;
    if (setting.below > 0 && asset.currentPriceJpy <= setting.below) return `🚨 下限 ${formatYen(setting.below)} に到達`;
    return "設定価格を監視中";
}

function renderMonitoringDashboard() {
    const container = document.getElementById("watchDashboard");
    if (!container) return;
    if (!monitoringEvaluations.length) {
        container.innerHTML = '<p class="small">保有資産を登録すると監視できます。</p>';
        return;
    }

    const sorted = [...monitoringEvaluations].sort((a, b) => {
        const af = monitoringState.favorites.includes(a.symbol) ? 1 : 0;
        const bf = monitoringState.favorites.includes(b.symbol) ? 1 : 0;
        return bf - af || b.marketValueJpy - a.marketValueJpy;
    });

    container.innerHTML = sorted.map(asset => {
        const favorite = monitoringState.favorites.includes(asset.symbol);
        const setting = monitoringState.alerts[asset.symbol] || {};
        const status = getAlertStatus(asset);
        return `
            <div class="watch-item ${favorite ? "favorite" : ""}">
                <div class="watch-header">
                    <button type="button" class="star-button" onclick="toggleFavorite('${monitoringEscape(asset.symbol)}')" aria-label="お気に入り切替">${favorite ? "⭐" : "☆"}</button>
                    <div><strong>${monitoringEscape(asset.name)}</strong><span>${monitoringEscape(asset.symbol)}</span></div>
                    <strong>${formatYen(asset.currentPriceJpy)}</strong>
                </div>
                <div class="watch-metrics">
                    <span>損益 <b class="${getProfitClass(asset.profitRate)}">${formatPercent(asset.profitRate)}</b></span>
                    <span>評価額 <b>${formatYen(asset.marketValueJpy)}</b></span>
                </div>
                ${status ? `<p class="alert-status ${status.startsWith("🚨") ? "triggered" : ""}">${status}</p>` : ""}
                <details class="alert-editor">
                    <summary>🔔 価格アラート設定</summary>
                    <div class="alert-grid">
                        <label>上がったら通知<input data-alert-above="${monitoringEscape(asset.symbol)}" type="number" inputmode="decimal" value="${setting.above || ""}" placeholder="円"></label>
                        <label>下がったら通知<input data-alert-below="${monitoringEscape(asset.symbol)}" type="number" inputmode="decimal" value="${setting.below || ""}" placeholder="円"></label>
                    </div>
                    <div class="alert-actions">
                        <button type="button" onclick="savePriceAlert('${monitoringEscape(asset.symbol)}')">保存</button>
                        <button type="button" class="secondary-button" onclick="clearPriceAlert('${monitoringEscape(asset.symbol)}')">解除</button>
                    </div>
                </details>
            </div>`;
    }).join("");
}

function updateMonitoringDashboard(evaluations) {
    monitoringEvaluations = Array.isArray(evaluations) ? evaluations : [];
    renderMonitoringDashboard();
}

function updateSignalDashboard(results) {
    const container = document.getElementById("signalDashboard");
    if (!container) return;
    if (!results.length) {
        container.innerHTML = '<p class="small">分析できる銘柄がありません。</p>';
        return;
    }
    const sorted = [...results].sort((a, b) => b.score - a.score);
    container.innerHTML = sorted.map((result, index) => {
        const signal = result.score >= 80 ? "🔥 強い買い候補" : result.score >= 65 ? "🟢 買い候補" : result.score >= 55 ? "🟡 やや買い" : result.score <= 20 ? "⛔ 強い売り警戒" : result.score <= 35 ? "🔴 売り警戒" : "⚪ 中立";
        return `<div class="signal-row">
            <span class="signal-rank">${index + 1}</span>
            <div><strong>${monitoringEscape(result.asset.name)}</strong><small>${monitoringEscape(result.asset.symbol)}</small></div>
            <div class="signal-score ${getTechnicalJudgmentClass(result.score)}"><strong>${result.score}点</strong><small>${signal}</small></div>
        </div>`;
    }).join("");
}

window.toggleFavorite = toggleFavorite;
window.savePriceAlert = savePriceAlert;
window.clearPriceAlert = clearPriceAlert;
window.updateMonitoringDashboard = updateMonitoringDashboard;
window.updateSignalDashboard = updateSignalDashboard;
