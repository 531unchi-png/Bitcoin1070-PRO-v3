# Bitcoin1070 PRO v16.5.1

PWAの各HTMLに残る旧バージョン表記を、共通app-shellで実行時にv16.5.1へ統一します。

- app-shell: ヘッダー・document title・設定のバージョン・情報センター表示を統一
- manifest: v16.5.1へ更新
- service worker: 新キャッシュへ更新し旧キャッシュをactivate時に削除
- app-shell / manifestをforced delivery対象に設定
- market / portfolio / newsをprecache対象に維持・追加
- 保有資産、取得単価、取引履歴、投資ロジック、localStorageキーは変更しない

iPhone実機ランタイムはmain反映後に確認する。
