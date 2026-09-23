const test=require('node:test'),assert=require('node:assert/strict'),core=require('../bitbank-tax-core.js');
const header='通貨名,年始数量,JPY建て年中購入数量,JPY建て年中購入金額,JPY建て年中売却数量,JPY建て年中売却金額,BTC建て年中購入数量,BTC建て年中購入金額,BTC建て年中売却数量,BTC建て年中売却金額,移入数量,移出数量,支払手数料,貸出損益,年末数量';
const tradeHeader='注文ID,取引ID,通貨ペア,タイプ,売/買,数量,価格,手数料,M/T,取引日時';
const annual=(rows,year=2025)=>core.parseAnnual([header,...rows].join('\r\n'),year);
const trades=(rows)=>core.parseTrades([tradeHeader,...rows].join('\n'));
const buy='1,tx1,BTC_JPY,現物,買,0.03,10000000,0,M,2025/01/01 09:00:00';
const sell='2,tx2,BTC_JPY,現物,売,0.01,15000000,100,M,2025/12/31 23:59:00';
const report='ビットコイン,0,0.03,300000,0.01,150000,-,-,-,-,0,0,100,0,0.02';
test('bitbank quoted CSV, yearly arithmetic and JST boundary',()=>{
 assert.deepEqual(core.csv('A,B\n"a,b","x""y"\n')[1],['a,b','x"y']);
 const data={annual:[annual([report])],trades:trades([buy,sell])},result=core.analyze(data,2025,{});
 assert.equal(core.yearJp(data.trades[1].date),2025);assert.equal(result.ready,true);assert.equal(result.income,49900);assert.equal(result.rows[0].endBasis,200000);
 assert.equal(core.estimateTax(49900,2000000).additionalIncomeTax,5003);
});
test('opening basis is required and carried from prior report',()=>{
 const second=annual(['BTC,0.02,0,0,0.01,180000,0,0,0,0,0,0,0,0,0.01'],2026);
 const traded=trades(['3,tx3,BTC_JPY,現物,売,0.01,18000000,0,M,2026/03/01 09:00:00']);
 let only={annual:[second],trades:traded};assert.equal(core.analyze(only,2026,{}).ready,false);
 assert.equal(core.analyze(only,2026,{'2026:BTC':200000}).income,80000);
 only={annual:[annual([report]),second],trades:[...trades([buy,sell]),...traded]};
 assert.equal(core.analyze(only,2026,{}).income,80000);
});
test('mismatched or unsupported trades and movement block tax calculation',()=>{
 const row=annual([report]);
 assert.match(core.analyze({annual:[row],trades:trades([buy])},2025,{}).issues.join(),/一致/);
 const moved=annual([report.replace(',0,0,100,0,',',0.001,0,100,0,')]);
 assert.match(core.analyze({annual:[moved],trades:trades([buy,sell])},2025,{}).issues.join(),/移入/);
 const btc=trades(['3,tx3,ETH_BTC,現物,買,1,0.01,0,M,2025/03/01 09:00:00']);
 assert.match(core.analyze({annual:[row],trades:[...trades([buy,sell]),...btc]},2025,{}).issues.join(),/BTC建て/);
 assert.throws(()=>core.parseTrades('注文ID,取引ID,通貨ペア,数量,価格,取引日時\n1,x,BTC_JPY,1,1,2025/01/01 09:00:00'),/必須列/);
});
test('absent annual report does not create current-year tax',()=>{const result=core.analyze({annual:[],trades:trades([buy])},2025,{});assert.equal(result.ready,false);assert.equal(core.estimateTax(null,2000000),null);});
test('purchase fees increase carried basis and mismatched fees stop calculation',()=>{
 const reportWithFees=report.replace(',100,0,0.02',',130,0,0.02');
 const buyWithFee=buy.replace(',10000000,0,',',10000000,30,');
 const data={annual:[annual([reportWithFees])],trades:trades([buyWithFee,sell])};
 const result=core.analyze(data,2025,{});
 assert.equal(result.ready,true);assert.equal(result.income,49890);assert.equal(result.rows[0].endBasis,200020);
 assert.equal(core.analyze({...data,trades:trades([buy,sell])},2025,{}).ready,false);
 assert.equal(core.estimateTax(-1000,2000000),null);
});
test('unsupported lending and credit types cannot produce a result',()=>{
 const lent=annual([report]);
 lent.rows[0].lentQty=0.001;
 assert.equal(core.analyze({annual:[lent],trades:trades([buy,sell])},2025,{}).ready,false);
 assert.throws(()=>trades([buy.replace(',現物,',',信用,')]),/現物以外/);
 assert.equal(trades([buy.replace(',現物,',',指値,')]).length,1);
});
