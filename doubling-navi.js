(() => {
  'use strict';

  const SETTINGS_KEY = 'bitcoin1070_doubling_navi_v10_2';
  const CATEGORY_META = {
    crypto: { label: '🪙 仮想通貨', className: 'crypto' },
    jp: { label: '🇯🇵 日本株', className: 'jp' },
    us: { label: '🇺🇸 米国株', className: 'us' },
    cash: { label: '💵 現金', className: 'cash' }
  };

  const $ = id => document.getElementById(id);
  const numberValue = id => Math.max(0, Number($(id)?.value) || 0);
  const yen = value => `¥${Math.round(Number(value) || 0).toLocaleString('ja-JP')}`;

  function loadSettings() {
    try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); }
    catch (error) { console.warn('資産倍増ナビ設定読込エラー', error); return {}; }
  }

  function saveSettings() {
    const data = {
      monthlyContribution: numberValue('monthlyContribution'),
      targetCrypto: numberValue('targetCrypto'),
      targetJp: numberValue('targetJp'),
      targetUs: numberValue('targetUs'),
      targetCash: numberValue('targetCash'),
      currentCash: numberValue('currentCash'),
      targetCashAmount: numberValue('targetCashAmount'),
      riskAmount: numberValue('riskAmount'),
      stopLossPercent: numberValue('stopLossPercent')
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(data));
  }

  function applySettings() {
    const saved = loadSettings();
    Object.entries(saved).forEach(([key, value]) => {
      const input = $(key);
      if (input && Number.isFinite(Number(value))) input.value = value;
    });
  }

  function getTotals() {
    const evaluations = typeof evaluateAssets === 'function' ? evaluateAssets() : [];
    const totals = { crypto: 0, jp: 0, us: 0, cash: numberValue('currentCash') };
    evaluations.forEach(asset => {
      if (Object.prototype.hasOwnProperty.call(totals, asset.type)) {
        totals[asset.type] += Number(asset.marketValueJpy) || 0;
      }
    });
    return totals;
  }

  function getTargets() {
    return {
      crypto: numberValue('targetCrypto'),
      jp: numberValue('targetJp'),
      us: numberValue('targetUs'),
      cash: numberValue('targetCash')
    };
  }

  function updateTargetTotal() {
    const targets = getTargets();
    const total = Object.values(targets).reduce((sum, value) => sum + value, 0);
    const element = $('targetTotal');
    element.textContent = `合計 ${total.toFixed(1).replace('.0', '')}%`;
    element.classList.toggle('invalid', Math.abs(total - 100) > 0.01);
    return total;
  }

  function renderCurrentAllocation() {
    const totals = getTotals();
    const grandTotal = Object.values(totals).reduce((sum, value) => sum + value, 0);
    const targets = getTargets();
    const rows = Object.keys(CATEGORY_META).map(key => {
      const ratio = grandTotal > 0 ? (totals[key] / grandTotal) * 100 : 0;
      const diff = ratio - targets[key];
      const diffText = `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}pt`;
      return `<div class="allocation-row"><div><strong>${CATEGORY_META[key].label}</strong><small>${yen(totals[key])}</small></div><div class="allocation-ratio"><span>${ratio.toFixed(1)}%</span><em class="${diff > 1 ? 'over' : diff < -1 ? 'under' : 'balanced'}">${diffText}</em></div></div>`;
    }).join('');
    $('currentAllocation').innerHTML = rows || '<p>保有資産がありません。</p>';
    return { totals, grandTotal, targets };
  }

  function calculateAllocation() {
    const contribution = numberValue('monthlyContribution');
    const targetTotal = updateTargetTotal();
    const result = $('allocationResult');
    if (Math.abs(targetTotal - 100) > 0.01) {
      result.innerHTML = '<div class="nav-warning">目標配分の合計を100%にしてください。</div>';
      return;
    }
    if (contribution <= 0) {
      result.innerHTML = '<div class="nav-warning">追加資金を入力してください。</div>';
      return;
    }

    const { totals, grandTotal, targets } = renderCurrentAllocation();
    const afterTotal = grandTotal + contribution;
    const deficits = {};
    Object.keys(targets).forEach(key => {
      deficits[key] = Math.max(0, (afterTotal * targets[key] / 100) - totals[key]);
    });
    const deficitSum = Object.values(deficits).reduce((sum, value) => sum + value, 0);
    const allocations = {};
    Object.keys(deficits).forEach(key => {
      allocations[key] = deficitSum > 0 ? contribution * deficits[key] / deficitSum : contribution * targets[key] / 100;
    });

    const cashGap = Math.max(0, numberValue('targetCashAmount') - totals.cash);
    if (cashGap > 0) {
      const minimumCash = Math.min(contribution, cashGap, contribution * Math.max(0.1, targets.cash / 100));
      const otherTotal = Object.keys(allocations).filter(k => k !== 'cash').reduce((s, k) => s + allocations[k], 0);
      allocations.cash = Math.max(allocations.cash, minimumCash);
      const remaining = Math.max(0, contribution - allocations.cash);
      Object.keys(allocations).filter(k => k !== 'cash').forEach(key => {
        allocations[key] = otherTotal > 0 ? remaining * allocations[key] / otherTotal : remaining / 3;
      });
    }

    const rows = Object.keys(CATEGORY_META).map(key => {
      const amount = Math.round(allocations[key] / 1000) * 1000;
      const reason = deficits[key] > 0 ? `目標より不足 ${yen(deficits[key])}` : '目標配分を維持';
      return `<div class="suggestion-row ${CATEGORY_META[key].className}"><span>${CATEGORY_META[key].label}</span><strong>${yen(amount)}</strong><small>${reason}</small></div>`;
    }).join('');
    result.innerHTML = `<h3>今月の配分案</h3>${rows}<p class="small">千円単位で丸めています。売買を推奨するものではなく、目標配分との差から算出した参考値です。</p>`;
    saveSettings();
  }

  function updateReserveMeter() {
    const current = numberValue('currentCash');
    const target = numberValue('targetCashAmount');
    const ratio = target > 0 ? Math.min(100, current / target * 100) : 0;
    $('reserveMeterBar').style.width = `${ratio}%`;
    $('reserveMeterText').textContent = `${ratio.toFixed(0)}%（${yen(current)} / ${yen(target)}）`;
  }

  function updateRiskCalculation() {
    const risk = numberValue('riskAmount');
    const stop = numberValue('stopLossPercent');
    const max = stop > 0 ? risk / (stop / 100) : 0;
    $('maxPosition').textContent = yen(max);
    $('riskExplanation').textContent = `${yen(risk)} ÷ ${stop || 0}% で計算`;
  }

  function updateBalanceStatus() {
    const { totals, grandTotal, targets } = renderCurrentAllocation();
    if (grandTotal <= 0) {
      $('balanceStatus').innerHTML = '<p class="small">資産を登録すると、過不足を表示します。</p>';
      return;
    }
    const messages = Object.keys(targets).map(key => {
      const ratio = totals[key] / grandTotal * 100;
      const diff = ratio - targets[key];
      if (diff > 3) return `<p>⚠️ ${CATEGORY_META[key].label}：目標より ${diff.toFixed(1)}pt 多い</p>`;
      if (diff < -3) return `<p>➕ ${CATEGORY_META[key].label}：目標より ${Math.abs(diff).toFixed(1)}pt 少ない</p>`;
      return `<p>✅ ${CATEGORY_META[key].label}：目標範囲内</p>`;
    }).join('');
    $('balanceStatus').innerHTML = messages;
  }

  function refreshAll() {
    updateTargetTotal();
    updateReserveMeter();
    updateRiskCalculation();
    updateBalanceStatus();
    saveSettings();
  }

  document.addEventListener('DOMContentLoaded', async () => {
    applySettings();
    refreshAll();
    try {
      if (typeof fetchCryptoPrices === 'function') {
        latestCryptoPrices = await fetchCryptoPrices();
        refreshAll();
      }
    } catch (error) {
      console.warn('資産倍増ナビ価格更新失敗:', error);
    }

    ['targetCrypto','targetJp','targetUs','targetCash','currentCash','targetCashAmount','riskAmount','stopLossPercent','monthlyContribution'].forEach(id => {
      $(id)?.addEventListener('input', refreshAll);
    });
    $('calculateAllocation')?.addEventListener('click', calculateAllocation);
  });
})();
