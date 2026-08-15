# Bitcoin1070 PRO v12.2

Base: v12.1 complete package / GitHub main f5c1fb590c58e8beebb0f0f5ef0908ba1eaa338c

## Main fixes
- Preserved the complete v12.1 application instead of replacing it with a reduced rewrite.
- Removed hard-coded stock prices from current valuation. Stock/API failures use only valid, unexpired cached prices.
- Added stock request timeout, partial-response handling, per-symbol cache timestamps and explicit refresh states.
- Unknown acquisition cost is excluded from total profit and total profit-rate denominator while market value remains in total assets.
- US-stock acquisition cost uses `costJpy` first, then `cost * acquisitionUsdJpy`; current USD/JPY is not used to reconstruct historical acquisition cost.
- Escaped user-controlled asset name/symbol output in portfolio cards.
- Removed inline `onclick` handlers from monitoring controls.
- Backup schema v4 validates restored data, strips unknown asset properties, preserves legacy backups and includes JPY cash balance.
- Preserved the v12.1 real BTC-history chart implementation (`mode=btc-cycle`) and full future-simulator catalog logic.
- Updated visible runtime version, PWA cache and icons to v12.2.
