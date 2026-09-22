// Annual ledger-based tax reference. This does not calculate a return or withholding.
((root,factory)=>{const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.B1070TaxEstimate=api;})(typeof window!=='undefined'?window:null,()=>{
  'use strict';
  const SECURITY_TYPES=new Set(['jp','us','fund']);
  function yearInJapan(date){const ms=Date.parse(date);if(!Number.isFinite(ms))return null;return Number(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tokyo',year:'numeric'}).format(ms));}
  function calculate(items,year){
    const selected=Number(year);if(!Number.isInteger(selected)||selected<2000||selected>2100)throw new Error('対象年が不正です');
    const result={year:selected,sales:0,taxableNet:0,nisaNet:0,cryptoNet:0,taxableSales:0,nisaSales:0,cryptoSales:0,unknownAccount:0,unknownCost:0,cryptoUnknownCost:0,estimatedTax:null,canEstimate:false};
    for(const row of Array.isArray(items)?items:[]){
      if(row?.kind!=='SELL'||yearInJapan(row.date)!==selected)continue;
      result.sales++;
      const known=row.realizedPnlJpy!==null&&row.realizedPnlJpy!==undefined&&Number.isFinite(Number(row.realizedPnlJpy));
      if(row.type==='crypto'){
        result.cryptoSales++;if(known)result.cryptoNet+=Number(row.realizedPnlJpy);else result.cryptoUnknownCost++;continue;
      }
      if(!SECURITY_TYPES.has(row.type)){result.unknownAccount++;continue;}
      const account=['nisa','taxable'].includes(row.accountType)?row.accountType:null;
      if(!account)result.unknownAccount++;
      if(!known&&account!=='nisa')result.unknownCost++;
      if(!account||!known)continue;
      if(account==='nisa'){result.nisaSales++;result.nisaNet+=Number(row.realizedPnlJpy);}
      else{result.taxableSales++;result.taxableNet+=Number(row.realizedPnlJpy);}
    }
    result.canEstimate=result.unknownAccount===0&&result.unknownCost===0;
    if(result.canEstimate)result.estimatedTax=Math.round(Math.max(0,result.taxableNet)*0.20315);
    return result;
  }
  return {calculate,yearInJapan};
});
