// Bitcoin1070 PRO v16.5 - Cloudflare Web Analytics adapter
(()=>{'use strict';
if(window.Bitcoin1070CloudAnalytics?.version==='16.5')return;
const VERSION='16.5';
// Cloudflare Web Analytics beacon token is a public site identifier used by the client-side snippet.
const CONFIG=Object.freeze({provider:'cloudflare-web-analytics',token:'d652f49934d44c8990c734cc9fc28ac4',enabled:true});
const state={provider:CONFIG.provider,enabled:false,configured:false,loaded:false,error:null};
function safeToken(v){return typeof v==='string'?v.trim().replace(/[^A-Za-z0-9_-]/g,'').slice(0,160):''}
function token(){const meta=document.querySelector('meta[name="bitcoin1070-cf-analytics-token"]');return safeToken(meta?.content||CONFIG.token)}
function status(){return{...state,version:VERSION}}
function load(){if(!CONFIG.enabled)return status();const t=token();state.configured=Boolean(t);if(!t){state.enabled=false;return status()}if(document.querySelector('script[data-cf-beacon]')){state.enabled=true;state.loaded=true;return status()}try{const s=document.createElement('script');s.defer=true;s.src='https://static.cloudflareinsights.com/beacon.min.js';s.dataset.cfBeacon=JSON.stringify({token:t});s.dataset.b1070CloudAnalytics='1';s.referrerPolicy='strict-origin-when-cross-origin';s.addEventListener('load',()=>{state.enabled=true;state.loaded=true;window.dispatchEvent(new CustomEvent('bitcoin1070:cloud-analytics-ready',{detail:status()}))},{once:true});s.addEventListener('error',()=>{state.enabled=false;state.error='load_failed';window.dispatchEvent(new CustomEvent('bitcoin1070:cloud-analytics-error',{detail:status()}))},{once:true});document.head.appendChild(s);state.enabled=true}catch(_){state.enabled=false;state.error='load_failed'}return status()}
window.Bitcoin1070CloudAnalytics={version:VERSION,status,load};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();
