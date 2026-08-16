const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const context={localStorage:{getItem:()=>null,setItem(){},removeItem(){}},sessionStorage:{getItem:()=>null},console,structuredClone,Blob,URL,document:{createElement:()=>({}),body:{appendChild(){}}},FileReader:function(){}};
vm.createContext(context);
vm.runInContext(`${fs.readFileSync('storage.js','utf8')}\nthis.costApi={assetUnitCostJpy,assetAcquisitionValueJpy,setUsAssetAcquisitionFx,sanitizeAsset,BACKUP_SCHEMA_VERSION};`,context);
const api=context.costApi;

const legacyNvda={type:'us',symbol:'NVDA',name:'NVIDIA',amount:15,cost:188,yahooSymbol:'NVDA'};
assert.equal(api.assetAcquisitionValueJpy(legacyNvda),null,'取得時為替がない旧データの原価は現在為替で補完しない');

api.setUsAssetAcquisitionFx(legacyNvda,150);
assert.equal(legacyNvda.acquisitionUsdJpy,150);
assert.equal(legacyNvda.costJpy,28200);
assert.equal(api.assetAcquisitionValueJpy(legacyNvda),423000);

const restored=api.sanitizeAsset(legacyNvda);
assert.equal(restored.costJpy,28200);
assert.equal(restored.acquisitionUsdJpy,150);
assert.equal(api.BACKUP_SCHEMA_VERSION,5);

const marketValueJpy=15*200*155;
const principal=api.assetAcquisitionValueJpy(restored);
const profit=marketValueJpy-principal;
assert.equal(principal,423000,'米国株ジャンルと全体の投資元本に含める円建て原価');
assert.equal(profit,42000,'米国株ジャンルと全体の含み損益に含める損益');
assert.equal(profit/principal*100,9.929078014184398);

const ledgerAsset={type:'us',symbol:'NVDA',name:'NVIDIA',amount:10,cost:100,costJpy:15100,acquisitionUsdJpy:151};
assert.equal(api.assetAcquisitionValueJpy(ledgerAsset),151000,'売買台帳が保持した手数料込み円建て原価を優先する');

console.log('US stock acquisition cost regression tests passed');
