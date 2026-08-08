# Bitcoin1070 PRO v12.0

## TradingView chart fix
- Replaced legacy `tv.js` widget loading with TradingView's current Advanced Chart Widget embed method.
- Prevented the old JavaScript initializer from interfering with the new widget.
- Added a fixed-height responsive widget container for iPhone Safari/PWA.
- Added a fallback link to open BTC/USD directly on TradingView if the embedded widget is blocked.
- Preserved v11.9 market data loader, market tools, BTC targets, memo, 1070-day navigation and asset features.
- Bumped PWA cache to v12.0 to avoid stale widget code.
