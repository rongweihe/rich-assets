/* 只读公开行情：不连接交易账户，不接收 API Key，不上传持仓数量或成本。 */
(function(scope){
  'use strict';
  const M=typeof module!=='undefined'?require('./finance.js'):scope.LedgerMath;
  // 显式绑定原生资产与交易所交易对；不凭用户输入的同名 symbol 猜测合约资产。
  const assets=Object.freeze({
    bitcoin:{symbol:'BTC',name:'Bitcoin · 原生 BTC',pair:'BTCUSDT'},
    ethereum:{symbol:'ETH',name:'Ethereum · 原生 ETH',pair:'ETHUSDT'},
    solana:{symbol:'SOL',name:'Solana · 原生 SOL',pair:'SOLUSDT'},
    bnb:{symbol:'BNB',name:'BNB · 原生 BNB',pair:'BNBUSDT'},
    dogecoin:{symbol:'DOGE',name:'Dogecoin · 原生 DOGE',pair:'DOGEUSDT'},
    xrp:{symbol:'XRP',name:'XRP Ledger · 原生 XRP',pair:'XRPUSDT'}
  });
  const fxURL='https://api.coinbase.com/v2/prices/USDT-USD/spot';
  // positive 拒绝 JSON 数字，防止金额在进入定点计算前已经发生浮点精度损失。
  function positive(value){
    if(typeof value!=='string'||M.parse(value)<=0n)throw Error('行情价格格式无效');
    return value;
  }
  // compose 保留两路原始十进制报价；先用八位定点相乘折算 USD，尾差向零截取。
  // 任一资产/币种/精度不符均拒绝，绝不默认 1 USDT = 1 USD。
  function compose(asset,ticker,fx,receivedAt){
    const info=Object.hasOwn(assets,asset)?assets[asset]:null;
    if(!info||ticker?.symbol!==info.pair||fx?.data?.base!=='USDT'||fx.data.currency!=='USD')throw Error('行情交易对或计价币种不匹配');
    const usdtPrice=positive(ticker.price),usdtUsd=positive(fx.data.amount);
    const usd=M.mul(M.parse(usdtPrice),M.parse(usdtUsd));
    if(usd<=0n)throw Error('折算报价低于支持精度');
    const price=(usd/M.SCALE).toString()+'.'+(usd%M.SCALE).toString().padStart(8,'0');
    positive(price); // 折算结果也必须能被账本的十六位整数、八位小数范围表示。
    return {asset,pair:info.pair,price,usdtPrice,usdtUsd,receivedAt};
  }
  // createClient 每个资产合并进行中的请求并短暂缓存 30 秒，避免重复点击触发限流。
  // 获取时间是浏览器接收快照的时间，不冒充交易所成交时间；失败不生成或覆盖快照。
  function createClient(fetcher=(...args)=>fetch(...args),now=()=>Date.now()){
    const cache=new Map(),pending=new Map(),errors=new Map();
    let fxPending=null;
    async function json(url){
      const r=await fetcher(url,{signal:AbortSignal.timeout(8000),credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store'});
      if(!r.ok)throw Error('公开行情接口暂不可用（HTTP '+r.status+'）');
      return r.json();
    }
    async function get(asset){
      if(!Object.hasOwn(assets,asset))throw Error('请选择支持的原生资产');
      if(pending.has(asset))return pending.get(asset);
      const old=cache.get(asset);
      if(old&&now()-old.receivedAt<30000)return old;
      const task=(async()=>{
        try{
          if(!fxPending)fxPending=json(fxURL).finally(()=>{fxPending=null;});
          const [ticker,fx]=await Promise.all([json('https://data-api.binance.vision/api/v3/ticker/price?symbol='+assets[asset].pair),fxPending]);
          const quote=compose(asset,ticker,fx,now());
          cache.set(asset,quote);errors.delete(asset);return quote;
        }catch(e){errors.set(asset,true);throw e;}
        finally{pending.delete(asset);}
      })();
      pending.set(asset,task);return task;
    }
    return {get,peek:asset=>cache.get(asset),failed:asset=>errors.has(asset)};
  }
  const api={assets,compose,createClient};
  if(typeof module!=='undefined')module.exports=api;else scope.LedgerQuotes=api;
})(globalThis);
