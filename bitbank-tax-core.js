// Bitbank CSV reconciliation and annual total-average cost computation (JPY spot only).
((root,factory)=>{const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.B1070BitbankTax=api;})(typeof window!=='undefined'?window:null,()=>{
  'use strict';
  const norm=s=>String(s??'').normalize('NFKC').replace(/[\s\uFEFF＿_（）()「」:\-・]/g,'').toLowerCase();
  const aliases={bitcoin:'BTC',ビットコイン:'BTC',ethereum:'ETH',イーサリアム:'ETH',ripple:'XRP',リップル:'XRP',solana:'SOL',ソラナ:'SOL',sui:'SUI',スイ:'SUI',render:'RENDER',レンダー:'RENDER',レンダートークン:'RENDER'};
  function symbol(s){const value=String(s||'').normalize('NFKC').trim(),match=value.match(/\b([A-Z][A-Z0-9]{1,12})\b/);return match?match[1]:aliases[norm(value)]||value.toUpperCase();}
  function csv(text){
    const rows=[];let row=[],cell='',quoted=false;const source=String(text??'').replace(/^\uFEFF/,'');
    if(source.length>6_000_000)throw Error('CSVが大きすぎます（6MBまで）');
    for(let i=0;i<source.length;i++){const c=source[i];if(quoted){if(c==='"'&&source[i+1]==='"'){cell+='"';i++;}else if(c==='"')quoted=false;else cell+=c;}else if(c==='"'){if(cell)throw Error('CSVの引用符が不正です');quoted=true;}else if(c===','){row.push(cell);cell='';}else if(c==='\n'||c==='\r'){if(c==='\r'&&source[i+1]==='\n')i++;row.push(cell);if(row.some(v=>v.trim()))rows.push(row);row=[];cell='';}else cell+=c;}
    if(quoted)throw Error('CSVの引用符が閉じていません');row.push(cell);if(row.some(v=>v.trim()))rows.push(row);
    if(rows.length>25000)throw Error('CSVは25,000行までです');return rows;
  }
  function head(rows,required){const index=rows.findIndex(r=>required.every(k=>r.some(v=>norm(v)===norm(k))));if(index<0)throw Error(`必須列が見つかりません: ${required.join('、')}`);const names=rows[index].map(norm);return{index,get:(r,...labels)=>{const at=labels.map(norm).map(x=>names.indexOf(x)).find(n=>n>=0);return at===undefined?undefined:r[at];},has:(...labels)=>labels.some(x=>names.includes(norm(x)))};}
  function decimal(value,label,{blankZero=false,signed=false}={}){if((value===undefined||['','-','－','―'].includes(String(value).trim()))&&blankZero)return 0;const str=String(value??'').normalize('NFKC').trim().replace(/,/g,'');if(!/^-?(?:\d+\.?\d*|\.\d+)$/.test(str))throw Error(`${label}が数値ではありません`);const n=Number(str);if(!Number.isFinite(n)||(!signed&&n<0))throw Error(`${label}が不正です`);return n;}
  const reportCols={opening:['年始数量'],end:['年末数量'],buyQty:['JPY建て年中購入数量'],buyJpy:['JPY建て年中購入金額'],sellQty:['JPY建て年中売却数量'],sellJpy:['JPY建て年中売却金額'],btcBuyQty:['BTC建て年中購入数量'],btcBuyJpy:['BTC建て年中購入金額'],btcSellQty:['BTC建て年中売却数量'],btcSellJpy:['BTC建て年中売却金額'],inQty:['移入数量'],outQty:['移出数量'],fee:['支払手数料'],lentQty:['貸出数量'],returnedQty:['返却数量'],lending:['貸出損益']};
  function parseAnnual(text,year){if(!Number.isInteger(Number(year))||year<2018||year>2100)throw Error('対象年を確認してください');const rows=csv(text),h=head(rows,['通貨名','年始数量','年末数量']);for(const col of ['buyQty','buyJpy','sellQty','sellJpy','fee'])if(!h.has(...reportCols[col]))throw Error(`年間報告書の${reportCols[col][0]}列がありません`);
    const parsed=[];let jpyFee=null;for(let i=h.index+1;i<rows.length;i++){const r=rows[i],name=String(h.get(r,'通貨名')||'').trim();if(!name)continue;if(/^(合計|total)$/i.test(name))continue;const sym=symbol(name);if(!/^[A-Z0-9]{2,20}$/.test(sym))throw Error(`${i+1}行目の通貨名を認識できません: ${name}`);if(sym==='JPY'){if(jpyFee!==null)throw Error('JPYの行が重複しています');jpyFee=decimal(h.get(r,...reportCols.fee),`${i+1}行目の支払手数料`,{blankZero:true});continue;}const data={symbol:sym};for(const [key,labels]of Object.entries(reportCols)){if(!h.has(...labels)&&!['btcBuyQty','btcBuyJpy','btcSellQty','btcSellJpy','inQty','outQty','lentQty','returnedQty','lending'].includes(key))throw Error(`${labels[0]}列がありません`);data[key]=decimal(h.get(r,...labels),`${i+1}行目の${labels[0]}`,{blankZero:true});}if(parsed.some(x=>x.symbol===sym))throw Error(`${sym}の行が重複しています`);parsed.push(data);}
    if(!parsed.length)throw Error('年間報告書に暗号資産の行がありません');return {year:Number(year),rows:parsed,jpyFee};
  }
  function japanDate(value){const raw=String(value||'').trim();let d;if(/^\d{10,13}$/.test(raw))d=new Date(Number(raw)*(raw.length===10?1000:1));else if(/^\d{4}[-/]\d\d[-/]\d\d(?:[ T]\d\d:\d\d(?::\d\d(?:\.\d{1,3})?)?)?$/.test(raw))d=new Date(raw.replace(/\//g,'-').replace(' ','T')+(raw.includes(':')?'': 'T00:00:00')+'+09:00');else if(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?(?:Z|[+-]\d\d:\d\d)$/.test(raw))d=new Date(raw);else throw Error(`取引日時の形式を認識できません: ${raw}`);if(!Number.isFinite(d.getTime()))throw Error(`取引日時が不正です: ${raw}`);return d.toISOString();}
  function yearJp(iso){return Number(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tokyo',year:'numeric'}).format(new Date(iso)));}
  function parseTrades(text){const rows=csv(text),h=head(rows,['取引ID','通貨ペア','売/買','数量','価格','取引日時']),parsed=[];if(!h.has('発生手数料','手数料'))throw Error('約定CSVに発生手数料列がありません');
    for(let i=h.index+1;i<rows.length;i++){const r=rows[i],pair=String(h.get(r,'通貨ペア')||'').trim().toUpperCase();if(!pair)continue;const spot=norm(h.get(r,'現物/信用'));if(h.has('現物/信用')&&spot!=='現物'&&spot!=='spot')throw Error(`${i+1}行目は現物以外の取引です`);const type=norm(h.get(r,'タイプ'));if(h.has('タイプ')&&!['現物','spot','指値','成行','limit','market',''].includes(type))throw Error(`${i+1}行目は未対応の注文種別です`);const id=String(h.get(r,'取引ID')||'').trim();if(!id)throw Error(`${i+1}行目の取引IDが空です`);const match=pair.match(/^([A-Z0-9]+)[_/-]([A-Z0-9]+)$/);if(!match)throw Error(`${i+1}行目の通貨ペアが不正です: ${pair}`);const side=norm(h.get(r,'売/買')),kind=['買','買い','buy'].includes(side)?'BUY':['売','売り','sell'].includes(side)?'SELL':null;if(!kind)throw Error(`${i+1}行目の売買区分が不正です`);const quantity=decimal(h.get(r,'数量'),`${i+1}行目の数量`),price=decimal(h.get(r,'価格'),`${i+1}行目の価格`);if(quantity<=0||price<=0)throw Error(`${i+1}行目の数量・価格が不正です`);const fee=decimal(h.get(r,'発生手数料','手数料'),`${i+1}行目の発生手数料`,{blankZero:true,signed:true});parsed.push({id,pair,symbol:match[1],quote:match[2],kind,quantity,price,fee,date:japanDate(h.get(r,'取引日時')),venue:'exchange'});}if(!parsed.length)throw Error('約定行がありません（注文履歴ではなく約定履歴を選んでください）');return parsed;
  }
  function parseDealer(text){const rows=csv(text),h=head(rows,['注文ID','通貨','売/買','数量','指値価格','売買日時']),parsed=[];
    for(let i=h.index+1;i<rows.length;i++){const r=rows[i],currency=String(h.get(r,'通貨')||'').trim();if(!currency)continue;const sym=symbol(currency);if(!/^[A-Z0-9]{2,20}$/.test(sym)||sym==='JPY')throw Error(`${i+1}行目の通貨が不正です`);const id=String(h.get(r,'注文ID')||'').trim();if(!id)throw Error(`${i+1}行目の注文IDが空です`);const side=norm(h.get(r,'売/買')),kind=['買','買い','buy'].includes(side)?'BUY':['売','売り','sell'].includes(side)?'SELL':null;if(!kind)throw Error(`${i+1}行目の売買区分が不正です`);const quantity=decimal(h.get(r,'数量'),`${i+1}行目の数量`),price=decimal(h.get(r,'指値価格'),`${i+1}行目の指値価格`);if(quantity<=0||price<=0)throw Error(`${i+1}行目の数量・価格が不正です`);parsed.push({id:`dealer:${id}`,pair:`${sym}_JPY`,symbol:sym,quote:'JPY',kind,quantity,price,fee:0,date:japanDate(h.get(r,'売買日時')),venue:'dealer'});}
    if(!parsed.length)throw Error('販売所の売買履歴に取引がありません');return parsed;
  }
  function parseFiatWithdrawals(text){const rows=csv(text),h=head(rows,['日時','手数料','ステータス']),parsed=[];
    for(let i=h.index+1;i<rows.length;i++){const r=rows[i],date=String(h.get(r,'日時')||'').trim();if(!date)continue;const status=norm(h.get(r,'ステータス'));if(['cancel','canceled','cancelled','失敗','取消','キャンセル'].includes(status))continue;if(!['done','completed','完了','成功'].includes(status))throw Error(`${i+1}行目の出金状態を確認できません`);parsed.push({date:japanDate(date),fee:decimal(h.get(r,'手数料'),`${i+1}行目の手数料`)});}
    return parsed;
  }
  function parseRakuten(text){const rows=csv(text),h=head(rows,['取引年月日','取引種別','通貨ペア','増加通貨名','増加数量','減少通貨名','減少数量','手数料通貨','手数料数量']);
    let year=null,pointCount=0,pointQty=0,buyCount=0,buyQty=0,buyJpy=0;const pointEntries=[];
    for(let i=h.index+1;i<rows.length;i++){
      const r=rows[i],raw=String(h.get(r,'取引年月日')||'').trim();if(!raw)continue;
      const m=raw.match(/^(\d{2})\/(\d{2})\/(\d{2}) \d{2}:\d{2}:\d{2}$/);
      if(!m)throw Error(`${i+1}行目の日付を認識できません`);
      const date=japanDate(`20${m[1]}-${m[2]}-${m[3]} ${raw.split(' ')[1]}`),rowYear=yearJp(date);
      if(year!==null&&year!==rowYear)throw Error('楽天ウォレットのCSVは1年分ずつ指定してください');year=rowYear;
      const kind=String(h.get(r,'取引種別')||'').trim(),currency=String(h.get(r,'増加通貨名')||'').trim().toUpperCase(),pair=String(h.get(r,'通貨ペア')||'').trim().toUpperCase();
      if(kind==='入金'&&currency==='JPY'&&pair==='JPY')continue;
      if(currency!=='BTC')throw Error(`${i+1}行目に未対応の暗号資産があります`);
      const qty=decimal(h.get(r,'増加数量'),`${i+1}行目のBTC数量`);
      if(qty<=0)throw Error(`${i+1}行目のBTC数量が不正です`);
      if(kind==='その他(預入)'&&pair==='BTC'&&!String(h.get(r,'減少通貨名')||'').trim()){pointCount++;pointQty+=qty;pointEntries.push({date:raw.slice(0,8),qty});continue;}
      if(kind==='買い'&&pair==='BTC/JPY'&&String(h.get(r,'減少通貨名')||'').trim().toUpperCase()==='JPY'){
        const spent=decimal(h.get(r,'減少数量'),`${i+1}行目の日本円支払`,{signed:true});
        if(spent>=0)throw Error(`${i+1}行目の日本円支払が不正です`);
        const fee=decimal(h.get(r,'手数料数量'),`${i+1}行目の手数料`,{blankZero:true});
        if(fee||String(h.get(r,'手数料通貨')||'').trim().toUpperCase()!=='BTC')throw Error(`${i+1}行目の手数料の扱いを確認してください`);
        buyCount++;buyQty+=qty;buyJpy-=spent;continue;
      }
      throw Error(`${i+1}行目の取引種別「${kind}」には未対応です。所得を推測せず取込を止めました`);
    }
    if(year===null||!pointCount&&!buyCount)throw Error('楽天ウォレットのBTC購入・受取履歴がありません');
    return {year,pointCount,pointQty:Number(pointQty.toFixed(8)),buyCount,buyQty:Number(buyQty.toFixed(8)),buyJpy,pointEntries};
  }
  function parseRakutenReportPages(pages){if(!Array.isArray(pages)||!pages.length||pages.length>30)throw Error('年間報告書のページを確認してください');const entries=[];
    for(const page of pages){const words=page.map(x=>String(x).trim()).filter(Boolean);for(let i=0;i<words.length;i++)if(words[i].normalize('NFKC')==='入庫(ポイント交換)'){
      const before=words.slice(Math.max(0,i-6),i),date=before.find(x=>/^20\d\d\/\d\d\/\d\d$/.test(x)),qty=before.at(-1),points=words[i+1],rate=words[i+2];
      if(!date||!/^0\.\d{1,8}$/.test(qty||'')||!/^[\d,]+$/.test(points||'')||!/^[\d,]+$/.test(rate||''))throw Error('ポイント交換明細の読み取りに失敗しました');
      const pointNumber=decimal(points,'使用ポイント数'),rateNumber=decimal(rate,'交換レート');if(pointNumber<=0||rateNumber<=0||Math.abs(pointNumber-Number(qty)*rateNumber)>Math.max(3,pointNumber*.01))throw Error('ポイント数と交換レートが一致しません');
      entries.push({date:date.slice(2),qty:Number(qty),points:pointNumber});
    }}if(!entries.length)throw Error('ポイント交換明細が見つかりません');const year=Number(entries[0].date.slice(0,2))+2000;if(entries.some(e=>Number(e.date.slice(0,2))+2000!==year))throw Error('報告書に複数年の交換が含まれています');return {year,entries};
  }
  function matchRakutenPoints(wallet,report){if(!wallet||wallet.year!==report.year||!Array.isArray(wallet.pointEntries)||wallet.pointEntries.length!==wallet.pointCount)throw Error('同年の楽天ウォレット現物CSVを再取込してください');
    const remaining=[...wallet.pointEntries];for(const row of report.entries){const date=new Date(`20${row.date.replaceAll('/','-')}T00:00:00Z`).getTime(),matches=remaining.map((entry,i)=>({entry,i})).filter(({entry})=>entry.qty.toFixed(8)===row.qty.toFixed(8)&&Math.abs(new Date(`20${entry.date.replaceAll('/','-')}T00:00:00Z`).getTime()-date)<=86400000);
      const exact=matches.filter(({entry})=>entry.date===row.date),chosen=exact.length?exact:matches;if(chosen.length!==1)throw Error(`${row.date} の交換が現物CSVと一意に一致しません`);remaining.splice(chosen[0].i,1);}
    if(report.entries.length!==wallet.pointCount||remaining.length)throw Error('ポイント交換の件数が一致しません。報告書とCSVの全期間を確認してください');
    return {year:wallet.year,count:report.entries.length,qty:Number(report.entries.reduce((a,x)=>a+x.qty,0).toFixed(8)),points:report.entries.reduce((a,x)=>a+x.points,0)};
  }
  const close=(a,b)=>Math.abs(a-b)<=Math.max(0.0000001,Math.max(Math.abs(a),Math.abs(b))*0.00000001);
  function analyze(records,year,openingBasis={}){
    const report=records?.annual?.find(x=>x.year===year);if(!report)return {ready:false,issues:[`${year}年の年間取引報告書がありません`],rows:[]};
    const earlier=records.annual.find(x=>x.year===year-1),inherited={...openingBasis};
    if(earlier){const previous=analyze(records,year-1,openingBasis);if(previous.ready)for(const row of report.rows){const prior=previous.rows.find(p=>p.symbol===row.symbol);if(prior&&close(prior.end,row.opening))inherited[`${year}:${row.symbol}`]=prior.endBasis;}}
    const issues=[],trades=(records.trades||[]).filter(x=>yearJp(x.date)===year),rows=[];
    if(!trades.length&&report.rows.some(r=>r.buyQty||r.sellQty))issues.push('約定CSVが未登録です');
    if(trades.some(t=>t.quote!=='JPY'))issues.push('BTC建て等の約定があります（円建て以外は未対応）');
    if(report.rows.some(r=>r.btcBuyQty||r.btcBuyJpy||r.btcSellQty||r.btcSellJpy))issues.push('年間報告書にBTC建て売買があります');
    if(report.rows.some(r=>r.inQty||r.outQty||r.lentQty||r.returnedQty||r.lending))issues.push('移入・移出・貸出・貸出損益があります。別の取得原価や報酬の照合が必要です');
    if(report.rows.reduce((sum,r)=>sum+r.sellJpy+r.btcSellJpy,0)>3000000)issues.push('暗号資産の売却収入が300万円超です。所得区分の確認が必要です');
    const withdrawals=(records.withdrawals||[]).filter(x=>yearJp(x.date)===year),feeTotal=trades.reduce((sum,t)=>sum+t.fee,0)+withdrawals.reduce((sum,w)=>sum+w.fee,0);
    if(report.jpyFee!==null&&report.jpyFee!==undefined&&!close(report.jpyFee,feeTotal))issues.push('JPY行の支払手数料と売買・日本円出金手数料が一致しません。内訳を確認してください');
    const summaries=new Map();for(const t of trades){const x=summaries.get(t.symbol)||{buyQty:0,buyJpy:0,sellQty:0,sellJpy:0,buyFee:0,sellFee:0};x[t.kind==='BUY'?'buyQty':'sellQty']+=t.quantity;x[t.kind==='BUY'?'buyJpy':'sellJpy']+=t.quantity*t.price;x[t.kind==='BUY'?'buyFee':'sellFee']+=t.fee;summaries.set(t.symbol,x);}
    for(const reportRow of report.rows){const r=reportRow,c=summaries.get(r.symbol)||{buyQty:0,buyJpy:0,sellQty:0,sellJpy:0,buyFee:0,sellFee:0};const labels={buyQty:'購入数量',buyJpy:'購入金額',sellQty:'売却数量',sellJpy:'売却金額'};for(const key of Object.keys(labels))if(!close(r[key],c[key]))issues.push(`${r.symbol}の${labels[key]}が年間報告書と約定CSVで一致しません`);if(report.jpyFee===null||report.jpyFee===undefined){if(!close(r.fee,c.buyFee+c.sellFee))issues.push(`${r.symbol}の支払手数料が約定CSVと一致しません（円建て手数料のみ対応）`);}else if(r.fee)issues.push(`${r.symbol}に暗号資産建ての手数料があります。円換算の確認が必要です`);summaries.delete(r.symbol);
      const basisKey=`${year}:${r.symbol}`,prior=inherited[basisKey];let basis=null;
      if(!r.opening)basis=0;else if(prior!==undefined&&prior!==''&&Number.isFinite(Number(prior))&&Number(prior)>=0)basis=Number(prior);else issues.push(`${r.symbol}の年始取得原価を入力してください`);
      const expected=r.opening+r.buyQty-r.sellQty;
      if(!close(expected,r.end))issues.push(`${r.symbol}の年末数量が売買と一致しません`);
      const avg=basis===null?null:r.opening+r.buyQty<=0?0:(basis+r.buyJpy+c.buyFee)/(r.opening+r.buyQty);
      if(avg===null&&(r.sellQty||r.end))issues.push(`${r.symbol}の平均取得単価を計算できません`);
      rows.push({symbol:r.symbol,opening:r.opening,buyQty:r.buyQty,sellQty:r.sellQty,end:r.end,openingBasis:basis,average:avg,proceeds:r.sellJpy,fee:r.fee,income:avg===null?null:r.sellJpy-r.sellQty*avg-c.sellFee,endBasis:avg===null?null:r.end*avg});
    }
    for(const sym of summaries.keys())issues.push(`${sym}の約定が年間報告書にありません`);
    const unique=[...new Set(issues)];return {year,ready:unique.length===0,issues:unique,rows,income:unique.length?null:rows.reduce((sum,r)=>sum+r.income,0)};
  }
  function progressiveTax(income){const taxable=Math.floor(Math.max(0,income)/1000)*1000;const bands=[[1950000,.05,0],[3300000,.10,97500],[6950000,.20,427500],[9000000,.23,636000],[18000000,.33,1536000],[40000000,.40,2796000],[Infinity,.45,4796000]];const [,rate,deduct]=bands.find(([upper])=>taxable<upper);return Math.max(0,taxable*rate-deduct);}
  function estimateTax(income,base){if(income===null||!Number.isFinite(income)||income<0||base===undefined||base===''||!Number.isFinite(Number(base))||Number(base)<0)return null;const gain=income,before=progressiveTax(Number(base)),after=progressiveTax(Number(base)+gain);return{additionalIncomeTax:Math.round((after-before)*1.021),residentReference:Math.round(gain*.1),totalReference:Math.round((after-before)*1.021+gain*.1)};}
  return{csv,parseAnnual,parseTrades,parseDealer,parseFiatWithdrawals,parseRakuten,parseRakutenReportPages,matchRakutenPoints,analyze,estimateTax,yearJp};
});
