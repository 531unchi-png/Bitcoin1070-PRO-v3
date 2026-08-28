// Bitcoin1070 PRO v14.2 - resilient per-asset daily change provider
(() => {
  const API = "https://bitcoin1070-api.531unchi.workers.dev";
  const CACHE_KEY = "bitcoin1070_daily_changes_v14_0";
  const MAX_AGE = 15 * 60 * 1000;
  let currentValues = {};
  let observer = null;
  let decorateQueued = false;

  const assetKey = asset => `${asset.type}:${String(asset.symbol || "").trim().toUpperCase()}`;
  const validNumber = value => { const n = Number(value); return Number.isFinite(n) ? n : null; };
  const masterFor = asset => (Array.isArray(window.B1070_ASSET_MASTER) ? window.B1070_ASSET_MASTER : []).find(row => row.type === asset.type && String(row.symbol || "").trim().toUpperCase() === String(asset.symbol || "").trim().toUpperCase());
  const coinGeckoIdFor = asset => String(asset.coinGeckoId || masterFor(asset)?.coinGeckoId || "").trim().toLowerCase();

  function readCache() {
    try {
      const data = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
      if (!data || !data.values || Date.now() - Number(data.savedAt || 0) > MAX_AGE) return {};
      return data.values;
    } catch (_) { return {}; }
  }

  function saveCache(values) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), values })); } catch (_) {}
  }

  async function fetchCryptoChanges(list) {
    const ids = [...new Set(list.map(coinGeckoIdFor).filter(Boolean))];
    if (!ids.length) return {};
    const response = await fetch(`${API}?mode=crypto&ids=${encodeURIComponent(ids.join(","))}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`crypto daily change HTTP ${response.status}`);
    const data = await response.json();
    const out = {};
    list.forEach(asset => {
      const id = coinGeckoIdFor(asset);
      const row = data?.prices?.[id];
      const percent = validNumber(row?.jpy_24h_change);
      const current = validNumber(row?.jpy);
      if (percent === null) return;
      const previous = current !== null && percent > -100 ? current / (1 + percent / 100) : null;
      out[assetKey(asset)] = { percent, amount: previous && current !== null ? current - previous : null, basis: "24h" };
    });
    return out;
  }

  function yahooSymbolFor(asset) {
    const symbol = String(asset.symbol || "").trim().toUpperCase();
    const legacy = (typeof DEFAULT_YAHOO_SYMBOLS !== "undefined" && DEFAULT_YAHOO_SYMBOLS) ? DEFAULT_YAHOO_SYMBOLS[symbol] : "";
    if (asset.yahooSymbol) return String(asset.yahooSymbol).trim();
    const master = masterFor(asset);
    if (master?.yahooSymbol) return String(master.yahooSymbol).trim();
    if (legacy) return legacy;
    if (asset.type === "us") return symbol;
    if (asset.type === "jp" && /^\d{4}$/.test(symbol)) return `${symbol}.T`;
    return "";
  }

  async function fetchStockChange(asset) {
    const yahoo = yahooSymbolFor(asset);
    if (!yahoo) return null;
    const response = await fetch(`${API}?mode=history&symbol=${encodeURIComponent(yahoo)}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`${asset.symbol} history HTTP ${response.status}`);
    const data = await response.json();
    const closes = (Array.isArray(data?.candles) ? data.candles : []).map(c => validNumber(c?.close)).filter(v => v !== null && v > 0);
    if (closes.length < 2) return null;
    const current = closes[closes.length - 1], previous = closes[closes.length - 2];
    return { percent: (current - previous) / previous * 100, amount: current - previous, basis: "previousClose" };
  }

  async function loadChanges({ force = false } = {}) {
    const list = (typeof assets !== "undefined" && Array.isArray(assets)) ? assets.filter(a => ["crypto", "jp", "us"].includes(a.type)) : [];
    if (!list.length) return {};
    const cached = readCache();
    if (!force && Object.keys(cached).length && list.every(asset => cached[assetKey(asset)])) return cached;
    const values = { ...cached };
    try { Object.assign(values, await fetchCryptoChanges(list.filter(a => a.type === "crypto"))); } catch (error) { console.warn("暗号資産24時間比取得失敗", error); }
    const missingStocks = list.filter(a => (a.type === "jp" || a.type === "us") && (force || !values[assetKey(a)]));
    const stockResults = await Promise.allSettled(missingStocks.map(async asset => [assetKey(asset), await fetchStockChange(asset)]));
    stockResults.forEach(result => { if (result.status === "fulfilled" && result.value[1]) values[result.value[0]] = result.value[1]; });
    if (Object.keys(values).length) saveCache(values);
    return values;
  }

  function typeFromCard(card) {
    const text = card.querySelector(".asset-type")?.textContent || "";
    if (text.includes("仮想通貨")) return "crypto";
    if (text.includes("米国株")) return "us";
    if (text.includes("日本株")) return "jp";
    return null;
  }

  function formatAmount(value, type) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "";
    const sign = n > 0 ? "+" : n < 0 ? "-" : "";
    if (type === "us") return `${sign}$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return `${sign}¥${Math.round(Math.abs(n)).toLocaleString("ja-JP")}`;
  }

  function renderValue(value, change, type) {
    if (!change || !Number.isFinite(Number(change.percent))) {
      value.textContent = "--";
      value.className = "profit-neutral";
      return;
    }
    const p = Number(change.percent), sign = p > 0 ? "+" : "";
    const amount = formatAmount(change.amount, type);
    value.textContent = `${sign}${p.toFixed(2)}%${amount ? `（${amount}）` : ""}`;
    value.className = p > 0 ? "profit-positive" : p < 0 ? "profit-negative" : "profit-neutral";
  }

  function decorateCards() {
    document.querySelectorAll("#portfolioList .asset-card").forEach(card => {
      const type = typeFromCard(card);
      const symbol = String(card.querySelector(".asset-symbol")?.textContent || "").trim().toUpperCase();
      if (!type || !symbol) return;
      const change = currentValues[`${type}:${symbol}`];
      let row = card.querySelector(".daily-change-row");
      if (!row) {
        row = document.createElement("div");
        row.className = "asset-row daily-change-row";
        const label = document.createElement("span");
        label.textContent = type === "crypto" ? "24時間比" : "前日比";
        const value = document.createElement("strong");
        row.append(label, value);
        const priceRow = [...card.querySelectorAll(".asset-row")].find(el => el.querySelector("span")?.textContent?.trim() === "現在価格");
        if (priceRow) priceRow.insertAdjacentElement("afterend", row); else card.appendChild(row);
      }
      const label = row.querySelector("span");
      if (label) label.textContent = type === "crypto" ? "24時間比" : "前日比";
      let value = row.querySelector("strong");
      if (!value) { value = document.createElement("strong"); row.appendChild(value); }
      renderValue(value, change, type);
    });
  }

  function queueDecorate() {
    if (decorateQueued) return;
    decorateQueued = true;
    requestAnimationFrame(() => { decorateQueued = false; decorateCards(); });
  }

  function observePortfolio() {
    const list = document.getElementById("portfolioList");
    if (!list || observer) return;
    observer = new MutationObserver(() => queueDecorate());
    observer.observe(list, { childList: true, subtree: true });
    queueDecorate();
  }

  async function refresh(options = {}) {
    currentValues = readCache();
    observePortfolio();
    queueDecorate();
    try {
      currentValues = await loadChanges(options);
      window.dispatchEvent(new CustomEvent("bitcoin1070:daily-changes-updated", { detail: { values: currentValues } }));
    } catch (error) { console.warn("前日比表示エラー", error); }
    queueDecorate();
    return currentValues;
  }

  window.Bitcoin1070DailyChange = { refresh, readCache, assetKey, coinGeckoIdFor };
  document.addEventListener("DOMContentLoaded", () => {
    observePortfolio();
    refresh();
    let tries = 0;
    const waitForList = setInterval(() => {
      observePortfolio(); queueDecorate();
      if (observer || ++tries >= 40) clearInterval(waitForList);
    }, 250);
  });
})();
