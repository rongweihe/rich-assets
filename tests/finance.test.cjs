'use strict';
const assert=require('node:assert/strict');
const m=require('../src/finance.js');
assert.equal(m.parse('0.00000001'),1n);
assert.equal(m.parse('9007199254740993'),900719925474099300000000n);
assert.throws(()=>m.parse('1e3'));
assert.throws(()=>m.parse('-1'));
assert.throws(()=>m.parse('0.000000001'));
const p=m.position({cost:'0.1',price:'0.3',qty:'3',market:'美股'},'7.2');
assert.equal(p.costValue,30000000n);
assert.equal(p.value,90000000n);
assert.equal(p.pnl,60000000n);
assert.equal(p.cny,648000000n);
assert.equal(m.percent(1n,0n),null);
assert.equal(m.format(m.parse('1.005')),'1.01');
assert.equal(m.format(-m.parse('1.005')),'-1.01');
assert.equal(m.tradePnl({entry:'158',exit:'166',qty:'20',fee:'2'}),15800000000n);
assert.equal(m.tradePnl({entry:'166',exit:'158',qty:'20',fee:'2'}),-16200000000n);
assert.equal(m.tradePnl({entry:'158',exit:'',qty:'20',fee:'2'}),null);
// 独立推导的单位差额必须等于数量；人民币资产不受美元汇率影响。
for(let i=1n;i<=1000n;i++){
  const x=m.position({cost:String(i),price:String(i+1n),qty:'0.01',market:'A 股'},'7.2');
  assert.equal(x.pnl,1000000n);
  assert.equal(x.value-x.costValue,x.pnl);
  assert.equal(x.cny,x.value);
}

// 回归：合并计算结果后每枚成本仍是原始美元字符串，不得二次放大定点总成本。
const btc={market:'Crypto',cost:'73000',qty:'0.25',price:'75999'};
const row={...btc,...m.position(btc,'7.2')};
assert.equal(row.cost,'73000');
assert.equal(m.format(m.parse(row.cost)),'73,000.00');
assert.equal(m.format(row.costValue),'18,250.00');
assert.equal(m.format(row.value),'18,999.75');
assert.equal(m.format(row.pnl),'749.75');
assert.equal(btc.qty,'0.25');

console.log('PASS: amount boundaries, BTC unit-cost regression and 1,000 position-invariant cases');
