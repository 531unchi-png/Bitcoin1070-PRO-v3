const test = require('node:test');
const assert = require('node:assert/strict');
const {performance, allocation, simulate} = require('../portfolio-strategy-core.js');
const day = (date, total, complete=true) => ({date:date.slice(0,10),updatedAt:date,total,complete});
const holding = (type,symbol,value) => ({type,symbol,name:symbol,amount:1,currentPriceJpy:value,marketValueJpy:value});
test('subtracts external cash flows, weights by elapsed time, and ignores trades', () => {
  const history=[day('2026-09-01T00:00:00Z',100000),day('2026-09-11T00:00:00Z',160000)];
  const transactions=[{kind:'DEPOSIT',date:'2026-09-06T00:00:00Z',totalJpy:50000},{kind:'BUY',date:'2026-09-07T00:00:00Z',totalJpy:30000}];
  const result=performance(history,transactions);
  assert.equal(result.profit,10000); assert.equal(result.netFlow,50000); assert.equal(result.rate,8);
  assert.equal(result.flowCount,1);
});
test('old and incomplete valuations cannot produce performance', () => {
  assert.equal(performance([day('2026-09-01T00:00:00Z',100000,false),day('2026-09-11T00:00:00Z',110000)],[]).ready,false);
});
test('incomplete market data stops allocation and simulation rather than treating missing quotes as zero', () => {
  assert.equal(allocation([holding('us','NVDA',100000),{...holding('crypto','BTC',0),amount:1}],10000).ready,false);
  assert.equal(simulate({ready:false},'us:NVDA',1000).ready,false);
});
test('allocation limits and cash-funded what-if keep total constant and flag crossings', () => {
  const before=allocation([holding('us','NVDA',30000),holding('crypto','BTC',10000),holding('crypto','SOL',10000)],50000,{single:40,crypto:40,semi:35,alt:50,cashMin:20,semiSymbols:'NVDA'});
  assert.equal(before.ready,true); assert.equal(before.metrics[0].ratio,30);
  const result=simulate(before,'us:NVDA',30000);
  assert.equal(result.ready,true); assert.equal(result.after.total,100000); assert.equal(result.after.cash,20000);
  assert.equal(result.after.metrics[0].ratio,60); assert.equal(result.after.metrics[0].breached,true);
  assert.equal(result.after.metrics[4].ratio,20); assert.equal(result.after.metrics[4].breached,false);
  assert.equal(simulate(before,'us:NVDA',60000).ready,false);
});
