// Bitcoin1070 PRO v16.5 - operator-facing cloud analytics status helper
(()=>{'use strict';const VERSION='16.5';function read(){const api=window.Bitcoin1070CloudAnalytics;return api?.status?api.status():{version:VERSION,provider:'cloudflare-web-analytics',configured:false,enabled:false,loaded:false,error:'adapter_unavailable'}}window.Bitcoin1070CloudAnalyticsStatus={version:VERSION,read};})();
