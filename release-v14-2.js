// Bitcoin1070 PRO v14.2 release normalizer
(() => {
  'use strict';
  const VERSION='14.2';
  document.addEventListener('DOMContentLoaded',()=>{
    document.querySelectorAll('.app-brand span').forEach(el=>{el.textContent=`v${VERSION}`;});
    document.querySelectorAll('.info-note strong').forEach(el=>{if(/^v\d/.test(el.textContent.trim()))el.textContent=el.textContent.replace(/^v[\d.]+/,`v${VERSION}`);});
  });
})();
