const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const context={console,globalThis:null,fetch:async()=>({ok:true,json:async()=>({results:[{type:"us",symbol:"FJK",name:"Fujikura Ltd"}]})})};context.window=context;context.globalThis=context;vm.createContext(context);
vm.runInContext(fs.readFileSync("asset-master.js","utf8"),context);
vm.runInContext(fs.readFileSync("asset-search.js","utf8"),context);
const api=context.B1070AssetSearch;
function symbols(query){return api.sortMatches(api.localCatalog([]),query).map(item=>item.symbol);}
assert.equal(symbols("285A")[0],"285A");
for(const query of ["き","キ","きおくしあ"])assert.ok(symbols(query).includes("285A"),query);
for(const expected of ["285A","2809","2801","2503","6861"])assert.ok(symbols("き").includes(expected),expected);
assert.equal(symbols("7203")[0],"7203");assert.ok(symbols("とよた").includes("7203"));
assert.equal(symbols("NVDA")[0],"NVDA");assert.equal(symbols("nvidia")[0],"NVDA");
assert.equal(symbols("BTC")[0],"BTC");assert.equal(symbols("bitcoin")[0],"BTC");assert.ok(symbols("びっと").includes("BTC"));
const holdings=[{type:"jp",symbol:"7203",name:"トヨタ自動車",amount:2,yahooSymbol:"7203.T"},{type:"us",symbol:"AAPL",name:"Apple",amount:0,yahooSymbol:"AAPL"}];
(async()=>{let result=await api.search("7203",{holdings,sellOnly:true});assert.deepEqual(result.items.map(x=>x.symbol),["7203"]);result=await api.search("apple",{holdings,sellOnly:true});assert.equal(result.items.length,0);result=await api.search("フジクラ");assert.equal(result.items.map(x=>x.symbol).join(","),"5803");console.log("asset search tests passed");})().catch(error=>{console.error(error);process.exitCode=1;});
