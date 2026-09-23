(()=>{'use strict';
  const core=window.B1070BitbankTax,$=id=>document.getElementById(id),yen=n=>`¥${Math.round(n).toLocaleString('ja-JP')}`;
  let records;
  try{records=loadCryptoTaxRecords();}catch(error){$('bitbankImportStatus').textContent=`保存データの読み込みに失敗しました: ${error.message}`;return;}
  const now=Number(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tokyo',year:'numeric'}).format(new Date()));
  const years=new Set([...Array.from({length:Math.max(0,now-2018)},(_,i)=>2018+i),...records.annual.map(a=>a.year)]);
  for(const year of [...years].sort((a,b)=>b-a)){const option=document.createElement('option');option.value=String(year);option.textContent=`${year}年`; $('cryptoTaxYear').append(option);}
  const selectedYear=()=>Number($('cryptoTaxYear').value);
  function refreshYears(year){if(![...$('cryptoTaxYear').options].some(o=>Number(o.value)===year)){const opt=document.createElement('option');opt.value=String(year);opt.textContent=`${year}年`;$('cryptoTaxYear').append(opt);[...$('cryptoTaxYear').options].sort((a,b)=>Number(b.value)-Number(a.value)).forEach(o=>$('cryptoTaxYear').append(o));}$('cryptoTaxYear').value=String(year);}
  async function readCsv(file){if(!/\.csv$/i.test(file.name)||file.size>6000000)throw Error('CSV形式・6MB以下のファイルを指定してください');const buffer=await file.arrayBuffer();let decoder;try{decoder=new TextDecoder('utf-8',{fatal:true});return decoder.decode(buffer);}catch(_){try{return new TextDecoder('shift_jis',{fatal:true}).decode(buffer);}catch(_){throw Error('CSVの文字コードを読み取れません（UTF-8 / Shift_JIS対応）');}}}
  function render(){const year=selectedYear(),result=core.analyze(records,year,records.openingBasis),annual=records.annual.find(r=>r.year===year);
    $('bitbankOpeningFields').replaceChildren();const previous=core.analyze(records,year-1,records.openingBasis);if(annual)for(const row of annual.rows.filter(x=>x.opening>0)){const label=document.createElement('label'),input=document.createElement('input'),key=`${year}:${row.symbol}`,carried=previous.ready?previous.rows.find(r=>r.symbol===row.symbol&&Math.abs(r.end-row.opening)<1e-7):null;label.textContent=`${row.symbol} 年始 ${row.opening.toLocaleString('ja-JP')}枚の取得原価合計（円）`;input.type='number';input.inputMode='decimal';input.step='any';input.min='0';input.dataset.basisKey=key;input.value=carried?carried.endBasis:records.openingBasis[key]??'';input.readOnly=Boolean(carried);input.placeholder=carried?'前年計算から自動繰越':'前年末の税務上の簿価';label.append(input);$('bitbankOpeningFields').append(label);}
    $('bitbankBaseIncome').value=records.baseIncome[year]??'';$('bitbankCoverage').checked=records.coverage[year]===true;
    const problems=[...result.issues];if(!records.coverage[year])problems.push('この年の取引が全件そろっているか確認してください');
    const ready=result.ready&&records.coverage[year]===true;
    $('bitbankResultStatus').textContent=ready?`${year}年の年間報告書と約定CSVが一致しました。総平均法による年次計算です。`:problems.join('／');
    $('bitbankIncome').textContent=ready?yen(result.income):'算出保留';
    const tax=ready?core.estimateTax(result.income,records.baseIncome[year]):null;
    $('bitbankIncomeTax').textContent=tax?yen(tax.additionalIncomeTax):'算出保留';$('bitbankResidentTax').textContent=tax?yen(tax.residentReference):'算出保留';$('bitbankTotalTax').textContent=tax?yen(tax.totalReference):'算出保留';
    const rows=$('bitbankRows');rows.replaceChildren();if(!annual)return;
    for(const entry of result.rows){const section=document.createElement('p');section.className='small';section.textContent=`${entry.symbol}：購入 ${entry.buyQty} / 売却 ${entry.sellQty} / 売却収入 ${yen(entry.proceeds)} / 手数料 ${yen(entry.fee)} / 所得 ${ready&&entry.income!==null?yen(entry.income):'未確定'} / 翌年繰越原価 ${ready&&entry.endBasis!==null?yen(entry.endBasis):'未確定'}`;rows.append(section);}
  }
  $('cryptoTaxYear').addEventListener('change',render);
  $('importBitbank').addEventListener('click',async()=>{const status=$('bitbankImportStatus');status.textContent='CSVを解析中…';try{const annualFile=$('bitbankAnnualFile').files[0],tradeFiles=[...$('bitbankTradeFiles').files],year=selectedYear();if(!annualFile&&!tradeFiles.length)throw Error('年間報告書か約定CSVを指定してください');if(annualFile&&year>=now)throw Error('年間報告書が交付されている確定済みの年を選んでください');const staged={...records,annual:[...records.annual],trades:[...records.trades],openingBasis:{...records.openingBasis},baseIncome:{...records.baseIncome},coverage:{...records.coverage}};
    if(annualFile){const filenameYear=annualFile.name.match(/(?:^|\D)(20\d\d)(?:\D|$)/)?.[1];if(filenameYear&&Number(filenameYear)!==year)throw Error(`ファイル名の年 ${filenameYear} と選択年 ${year} が異なります`);const parsed=core.parseAnnual(await readCsv(annualFile),year);if(staged.annual.some(x=>x.year===year)&&!confirm(`${year}年の報告書を置き換えますか？`))return;staged.annual=staged.annual.filter(x=>x.year!==year);staged.annual.push(parsed);staged.coverage[year]=false;}
    const ids=new Map(staged.trades.map(t=>[t.id,t]));let added=0;for(const file of tradeFiles){for(const row of core.parseTrades(await readCsv(file))){const earlier=ids.get(row.id);if(earlier){if(JSON.stringify(earlier)!==JSON.stringify(row))throw Error(`取引ID ${row.id} の内容が異なります`);continue;}ids.set(row.id,row);staged.trades.push(row);added++;}}
    const clean=saveCryptoTaxRecords(staged);records=clean;status.textContent=`保存しました：年間報告書 ${annualFile?1:0}件、約定 ${added}件追加（重複は除外）。`;refreshYears(year);$('bitbankAnnualFile').value='';$('bitbankTradeFiles').value='';render();
  }catch(error){status.textContent=`取込できませんでした：${error.message}`;}});
  $('saveBitbankInputs').addEventListener('click',()=>{const status=$('bitbankImportStatus');try{const year=selectedYear(),next={...records,openingBasis:{...records.openingBasis},baseIncome:{...records.baseIncome},coverage:{...records.coverage}};for(const input of $('bitbankOpeningFields').querySelectorAll('input[data-basis-key]')){if(input.value.trim()==='')delete next.openingBasis[input.dataset.basisKey];else{const n=Number(input.value);if(!Number.isFinite(n)||n<0)throw Error('年始取得原価を0円以上で入力してください');next.openingBasis[input.dataset.basisKey]=n;}}
    const raw=$('bitbankBaseIncome').value.trim();if(raw==='')delete next.baseIncome[year];else{const n=Number(raw);if(!Number.isFinite(n)||n<0)throw Error('課税所得を0円以上で入力してください');next.baseIncome[year]=n;}
    next.coverage[year]=$('bitbankCoverage').checked;records=saveCryptoTaxRecords(next);status.textContent='条件を保存しました。';render();
  }catch(error){status.textContent=`保存できませんでした：${error.message}`;}});
  render();
})();
