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
 assert.throws(()=>trades([buy.replace(',現物,',',信用,')]),/未対応の注文種別/);
 assert.equal(trades([buy.replace(',現物,',',指値,')]).length,1);
});
test('actual bitbank-style JPY fee row and spot CSV columns are reconciled',()=>{
 const annualHeader='通貨名,年始数量,JPY建て年中購入数量,JPY建て年中購入金額,BTC建て年中購入数量,BTC建て年中購入金額,JPY建て年中売却数量,JPY建て年中売却金額,BTC建て年中売却数量,BTC建て年中売却金額,移入数量,移出数量,支払手数料,貸出数量,返却数量,貸出損益,年末数量';
 const reportText=['氏名:,架空の例,,年間取引報告書,,発行者:,テスト',annualHeader,'jpy,0,0,0,0,0,0,0,0,0,0,0,30,0,0,0,0','btc,0,1,1000,0,0,0.5,750,0,0,0,0,0,0,0,0,0.5'].join('\n');
 const tradeText=['注文id,取引id,通貨ペア,現物/信用,タイプ,売/買,数量,価格,実現損益,発生手数料,実現手数料,実現利息,m/t,取引日時','1,a,btc_jpy,現物,market,buy,1,1000,,10,10,,taker,2025-02-01 10:00:00.123','2,b,btc_jpy,現物,limit,sell,0.5,1500,,20,20,,maker,2025-12-31 20:00:00.02'].join('\n');
 const annualReport=core.parseAnnual(reportText,2025),traded=core.parseTrades(tradeText);
 assert.equal(annualReport.rows.length,1);assert.equal(annualReport.jpyFee,30);assert.equal(traded.length,2);
 const result=core.analyze({annual:[annualReport],trades:traded},2025,{});
 assert.equal(result.ready,true);assert.equal(result.income,225);assert.equal(result.rows[0].endBasis,505);
 const mismatched=core.parseAnnual(reportText.replace('jpy,0,0,0,0,0,0,0,0,0,0,0,30,','jpy,0,0,0,0,0,0,0,0,0,0,0,580,'),2025);
 assert.match(core.analyze({annual:[mismatched],trades:traded},2025,{}).issues.join(),/JPY行の支払手数料/);
 assert.throws(()=>core.parseTrades(tradeText.replace(',現物,market,',',信用,market,')),/現物以外/);
});
test('dealer purchases and confirmed JPY withdrawal fees reconcile without deducting withdrawal from income',()=>{
 const annualHeader='通貨名,年始数量,JPY建て年中購入数量,JPY建て年中購入金額,BTC建て年中購入数量,BTC建て年中購入金額,JPY建て年中売却数量,JPY建て年中売却金額,BTC建て年中売却数量,BTC建て年中売却金額,移入数量,移出数量,支払手数料,貸出数量,返却数量,貸出損益,年末数量';
 const report=core.parseAnnual([annualHeader,'JPY,0,0,0,0,0,0,0,0,0,0,0,570,0,0,0,0','XRP,0,2,300,0,0,1,250,0,0,0,0,0,0,0,0,1'].join('\n'),2025);
 const spot=core.parseTrades(['取引id,通貨ペア,現物/信用,タイプ,売/買,数量,価格,発生手数料,取引日時','trade1,xrp_jpy,現物,market,buy,1,100,10,2025/01/01 10:00:00','trade2,xrp_jpy,現物,market,sell,1,250,10,2025/02/01 10:00:00'].join('\n'));
 const dealer=core.parseDealer('注文ID,通貨,売/買,数量,指値価格,売買日時\norder1,xrp,買,1,200,2025/03/01 10:00:00');
 const withdrawals=core.parseFiatWithdrawals('日時,数量,手数料,出金先口座,ステータス\n2025/06/01 10:00:00,1000,550,REDACTED,DONE');
 const result=core.analyze({annual:[report],trades:[...spot,...dealer],withdrawals},2025,{});
 assert.equal(result.ready,true);assert.equal(result.income,85);assert.equal(result.rows[0].endBasis,155);
 assert.equal(core.analyze({annual:[report],trades:spot,withdrawals},2025,{}).ready,false);
 assert.equal(core.analyze({annual:[report],trades:[...spot,...dealer]},2025,{}).ready,false);
});
test('Rakuten Wallet yearly CSV records BTC buys and unresolved deposits without inventing point cost',()=>{
 const columns='取引年月日,取引種別,取引形態,通貨ペア,増加通貨名,増加数量,減少通貨名,減少数量,約定価格,単価,手数料通貨,手数料数量,備考';
 const rows=['25/03/04 18:54:57,その他(預入),,BTC,BTC,0.00004814,,,,,,,','25/03/29 20:01:33,入金,,JPY,JPY,1448,,,,,,,','25/03/29 20:01:54,買い,自己,BTC/JPY,BTC,0.00011365,JPY,-1448,1448,12740869,BTC,0.00000000,'];
 const parsed=core.parseRakuten([columns,...rows].join('\n'));
 assert.deepEqual(parsed,{year:2025,pointCount:1,pointQty:0.00004814,buyCount:1,buyQty:0.00011365,buyJpy:1448,pointEntries:[{date:'25/03/04',qty:0.00004814}]});
 assert.equal(Object.hasOwn(parsed,'pointJpy'),false);
 assert.throws(()=>core.parseRakuten([columns,...rows,'25/04/01 09:00:00,売り,自己,BTC/JPY,JPY,1000,BTC,-0.001,1000,1000000,BTC,0,'].join('\n')),/未対応/);
 assert.throws(()=>core.parseRakuten([columns,rows[0].replace('25/03/04','24/03/04'),rows[2]].join('\n')),/1年分/);
});

test('Rakuten report points match every CSV deposit and reject unmatched quantities',()=>{
 const csv='取引年月日,取引種別,通貨ペア,増加通貨名,増加数量,減少通貨名,減少数量,手数料通貨,手数料数量\n25/08/05 00:01:00,その他(預入),BTC,BTC,0.00000576,,,,';
 const wallet=core.parseRakuten(csv),report=core.parseRakutenReportPages([['2025/08/04','-','-','0.00000576','入庫(ポイント交換)','100','17,361,111']]);
 assert.deepEqual(core.matchRakutenPoints(wallet,report),{year:2025,count:1,qty:0.00000576,points:100});
 assert.throws(()=>core.matchRakutenPoints(wallet,{...report,entries:[{...report.entries[0],qty:0.000006}]}),/一致/);
 assert.throws(()=>core.parseRakutenReportPages([['2025/08/04','-','-','0.00000576','入庫(ポイント交換)','100','100']]),/一致/);
});
