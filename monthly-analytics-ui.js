(() => {
  'use strict';
  const root = document.getElementById('monthlyAnalytics');
  if (!root) return;
  const select = document.getElementById('monthlyAnalyticsMonth');
  const scope = document.getElementById('monthlyAnalyticsScope');
  const results = document.getElementById('monthlyAnalyticsResults');
  const note = document.getElementById('monthlyAnalyticsNote');
  const labels = { crypto: '🪙 仮想通貨', jp: '🇯🇵 日本株', us: '🇺🇸 米国株', fund: '🌐 投資信託' };
  const yen = value => `${value < 0 ? '−' : '+'}¥${Math.round(Math.abs(value)).toLocaleString('ja-JP')}`;
  function render() {
    const months = window.B1070MonthlyAnalytics.monthly(loadAssetHistory(), loadTransactionsFromStorage());
    const chosen = select.value;
    select.replaceChildren();
    for (const item of months) {
      const option = document.createElement('option');
      option.value = item.month;
      option.textContent = `${item.month.replace('-', '年')}月`;
      select.append(option);
    }
    select.value = months.some(item => item.month === chosen) ? chosen : months[0]?.month || '';
    const active = months.find(item => item.month === select.value);
    results.replaceChildren();
    if (!active) {
      note.textContent = '月別の損益には、前月と当月それぞれの価格取得が完了した評価記録が必要です。銘柄別の記録はこの機能を追加した日から始まります。';
      return;
    }
    note.textContent = `${active.startDate} → ${active.endDate} の記録済み評価額から、台帳にある売買金額を差し引いた損益です。月末の記録がない場合は表示日までの集計です。台帳外の売買・数量変更・移管がある行は算出できません。税務上の確定損益ではありません。`;
    const rows = scope.value === 'asset' ? active.rows : active.categories;
    for (const row of rows) {
      const item = document.createElement('div'); item.className = 'monthly-analytics-row';
      const title = document.createElement('span');
      title.textContent = row.symbol ? `${row.symbol} ${row.name}` : labels[row.type];
      const amount = document.createElement('strong');
      amount.textContent = row.profit === null ? '算出不可' : yen(row.profit);
      if (row.profit !== null) amount.className = row.profit < 0 ? 'monthly-loss' : 'monthly-gain';
      item.append(title, amount); results.append(item);
    }
    if (!rows.length) results.textContent = 'この期間に保有記録はありません。';
  }
  select.addEventListener('change', render);
  scope.addEventListener('change', render);
  window.updateMonthlyAnalytics = render;
  document.addEventListener('DOMContentLoaded', render);
})();
