// Bitcoin1070 PRO v16.3.1 - Home BTC 1070 Intelligence sync
(()=>{'use strict';
const $=id=>document.getElementById(id);
function render(){const api=window.Bitcoin1070BTCIntelligence;if(!api)return false;const r=api.evaluate?.();if(!r)return false;const badge=$('homeScenarioBadge'),reason=$('homeScenarioReason');if(badge){badge.textContent=r.label;badge.classList.remove('bull','bear','neutral');badge.classList.add(r.label==='強気'?'bull':r.label==='弱気'?'bear':'neutral')}if(reason){reason.textContent=`${r.cycle.stage}・総合${r.score}/100・信頼度${r.confidence}/100・テクニカル 強気${r.technical.bullConfirm}/${r.technical.checks.length}`;}return true}
function schedule(){render();setTimeout(render,250);setTimeout(render,1000);setTimeout(render,2500)}
['bitcoin1070:btc-intelligence-ready','bitcoin1070:data-layer-updated','bitcoin1070:daily-changes-updated','bitcoin1070:technical-autoload-complete','b1070:market-updated'].forEach(e=>window.addEventListener(e,schedule));document.addEventListener('DOMContentLoaded',schedule);window.Bitcoin1070HomeBTCSync={render,version:'16.3.1'};
})();