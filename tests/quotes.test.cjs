'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const Q=require('../src/quotes.js');
const M=require('../src/finance.js');
const ticker={symbol:'BTCUSDT',price:'76000.00000000'};
const fx={data:{base:'USDT',currency:'USD',amount:'0.999'}};
const response=data=>({ok:true,json:async()=>data});

test('USDT 报价按真实汇率折算 USD，成本和数量不变',()=>{
  const q=Q.compose('bitcoin',ticker,fx,123);
  assert.equal(q.price,'75924.00000000');
  const p={cost:'73000',qty:'0.25',market:'Crypto',price:q.price};
  const row={...p,...M.position(p,'7.2')};
  assert.equal(row.cost,'73000');assert.equal(row.qty,'0.25');
  assert.equal(row.value,1898100000000n);
  assert.equal(row.pnl,73100000000n);
  assert.equal(q.usdtPrice,ticker.price);assert.equal(q.usdtUsd,'0.999');
});

test('不接受错交易对、错币种、零价、浮点 JSON 数字和异常精度',()=>{
  for(const price of [0,76000,'0','-1','1e5','0.000000001','NaN','99999999999999999'])
    assert.throws(()=>Q.compose('bitcoin',{...ticker,price},fx,123));
  assert.throws(()=>Q.compose('bitcoin',{...ticker,symbol:'ETHUSDT'},fx,123));
  assert.throws(()=>Q.compose('wrapped-bitcoin',ticker,fx,123));
  assert.throws(()=>Q.compose('bitcoin',{...ticker,price:'9999999999999999'},{data:{...fx.data,amount:'9999999999999999'}},123));
  for(const data of [{base:'USDC',currency:'USD',amount:'1'},{base:'USDT',currency:'CNY',amount:'7'},{base:'USDT',currency:'USD',amount:1}])
    assert.throws(()=>Q.compose('bitcoin',ticker,{data},123));
  assert.equal(Q.compose('bitcoin',{...ticker,price:'0.00000003'},{data:{...fx.data,amount:'0.5'}},123).price,'0.00000001');
  assert.throws(()=>Q.compose('bitcoin',{...ticker,price:'0.00000001'},{data:{...fx.data,amount:'0.1'}},123));
});

test('合并重复点击、缓存 30 秒；失败保留旧快照，重试恢复',async()=>{
  let time=100000,calls=0,fail=false;
  const c=Q.createClient(async url=>{calls++;if(fail) return {ok:false,status:429};return response(url.includes('coinbase')?fx:ticker);},()=>time);
  const [a,b]=await Promise.all([c.get('bitcoin'),c.get('bitcoin')]);
  assert.deepEqual(a,b);assert.equal(calls,2);
  await c.get('bitcoin');assert.equal(calls,2);
  time+=30001;fail=true;await assert.rejects(c.get('bitcoin'),/429/);
  assert.equal(c.peek('bitcoin'),a);assert.equal(c.failed('bitcoin'),true);
  fail=false;await c.get('bitcoin');assert.equal(c.failed('bitcoin'),false);
  assert.equal(c.peek('bitcoin').receivedAt,time);
});

test('资产并发响应隔离，汇率请求复用；请求不包含持仓与认证信息',async()=>{
  const requests=[];
  const c=Q.createClient(async(url,options)=>{
    requests.push({url,options});
    if(url.includes('coinbase'))return response(fx);
    if(url.includes('BTCUSDT'))return response(ticker);
    return response({symbol:'ETHUSDT',price:'3000.00000000'});
  });
  await Promise.all([c.get('bitcoin'),c.get('ethereum')]);
  assert.equal(requests.length,3);
  assert.equal(c.peek('bitcoin').pair,'BTCUSDT');assert.equal(c.peek('ethereum').price,'2997.00000000');
  for(const r of requests){assert.equal(r.options.credentials,'omit');assert.equal(r.options.referrerPolicy,'no-referrer');assert.ok(r.options.signal instanceof AbortSignal);assert.ok(!r.url.includes('qty'));}
  await assert.rejects(c.get('__proto__'));
});

test('断网、超时、无效响应与缺失汇率均不能生成行情',async()=>{
  for(const fetcher of [async()=>{throw Error('network');},async()=>{throw new DOMException('Timeout','TimeoutError');},async()=>response({}),async url=>response(url.includes('coinbase')?{}:ticker)]){
    const c=Q.createClient(fetcher);await assert.rejects(c.get('bitcoin'));
    assert.equal(c.peek('bitcoin'),undefined);assert.equal(c.failed('bitcoin'),true);
  }
});
