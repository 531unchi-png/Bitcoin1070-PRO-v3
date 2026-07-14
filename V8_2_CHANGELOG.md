# Bitcoin1070 PRO v8.2

## 仮想通貨価格安定化
- 仮想通貨価格をCloudflare Worker経由で取得
- Worker障害時はCoinGecko直接取得へフォールバック
- 前回正常価格を端末に保存し、通信失敗時も0円に戻さない
- BTC価格と24時間騰落率も同じデータ経路へ統一
- Bitcoin1070指数のBTC履歴もWorker経由へ変更
- PWAキャッシュをv8.2へ更新
