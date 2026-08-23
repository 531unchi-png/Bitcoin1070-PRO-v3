// Bitcoin1070 PRO v13.1 - per-asset daily change display
(() => {
  const API = "https://bitcoin1070-api.531unchi.workers.dev";
  const CACHE_KEY = "bitcoin1070_daily_changes_v13_1";
  const MAX_AGE = 15 * 60 * 1000;

  const assetKey = asset => `${asset.type}:${String(asset.symbol || "").trim().toUpperCase()}`;
  const validNumber = value => { const n = Number(value); return Number.isFinite(n) ? n : null; };

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
    const ids = [...new Set(list.map(a => String(a.coinGeckoId || "").trim().toLowerCase()).filter(Boolean))];
    if (!ids.length) return {};
    const response = await fetch(`${API}?mode=crypto&ids=${encodeURIComponent(ids.join(","))}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`crypto daily change HTTP ${response.status}`);
    const data = await response.json();
    const out = {};
    list.forEach(asset => {
      const row = data?.prices?.[String(asset.coinGeckoId || "").trim().toLowerCase()];
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

  async function loadChanges() {
    const list = (typeof assets !== "undefined" && Array.isArray(assets)) ? assets.filter(a => ["crypto", "jp", "us"].includes(a.type)) : [];
    if (!list.length) return {};
    const cached = readCache();
    if (Object.keys(cached).length) return cached;
    const values = {};
    try { Object.assign(values, await fetchCryptoChanges(list.filter(a => a.type === "crypto"))); } catch (error) { console.warn("暗号資産前日比取得失敗", error); }
    const stockResults = await Promise.allSettled(list.filter(a => a.type === "jp" || a.type === "us").map(async asset => [assetKey(asset), await fetchStockChange(asset)]));
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

  function decorateCards(values) {
    document.querySelectorAll("#portfolioList .asset-card").forEach(card => {
      if (card.querySelector(".daily-change-row")) return;
      const type = typeFromCard(card), symbol = String(card.querySelector(".asset-symbol")?.textContent || "").trim().toUpperCase();
      if (!type || !symbol) return;
      const change = values[`${type}:${symbol}`];
      const row = document.createElement("div");
      row.className = "asset-row daily-change-row";
      const label = document.createElement("span"); label.textContent = type === "crypto" ? "24時間比" : "前日比";
      const value = document.createElement("strong");
      if (!change || !Number.isFinite(Number(change.percent))) {
        value.textContent = "--"; value.className = "profit-neutral";
      } else {
        const p = Number(change.percent), sign = p > 0 ? "+" : "";
        const amount = formatAmount(change.amount, type);
        value.textContent = `${sign}${p.toFixed(2)}%${amount ? `（${amount}）` : ""}`;
        value.className = p > 0 ? "profit-positive" : p < 0 ? "profit-negative" : "profit-neutral";
      }
      row.append(label, value);
      const priceRow = [...card.querySelectorAll(".asset-row")].find(el => el.querySelector("span")?.textContent?.trim() === "現在価格");
      if (priceRow) priceRow.insertAdjacentElement("afterend", row); else card.appendChild(row);
    });
  }

  async function refresh() {
    const values = await loadChanges();
    let tries = 0;
    const timer = setInterval(() => {
      decorateCards(values);
      tries += 1;
      if (document.querySelectorAll("#portfolioList .asset-card").length || tries >= 20) clearInterval(timer);
    }, 250);
  }

  document.addEventListener("DOMContentLoaded", () => refresh().catch(error => console.warn("前日比表示エラー", error)));
})();
