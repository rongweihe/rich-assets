/* 所有金额和价格使用八位定点整数；仅展示时舍入，不参与真实结算。 */
(function(scope){
  const SCALE=100000000n;
  // parse 将十进制字符串转换为八位定点数，拒绝指数、负值及过高精度。
  function parse(value){
    const s=String(value).trim();
    if(!/^\d{1,16}(\.\d{1,8})?$/.test(s)) throw Error('请输入非负数字，最多 8 位小数、16 位整数');
    const [a,b='']=s.split('.');return BigInt(a)*SCALE+BigInt(b.padEnd(8,'0'));
  }
  // mul 以定点精度保留估值；不足最小估值单位的尾差向零截取，不改写原始数量和成本。
  function mul(a,b){return a*b/SCALE;}
  // format 仅在展示时四舍五入；亏损保留符号，不用展示值反向计算。
  function format(n,digits=2){
    const sign=n<0n?'-':'';n=n<0n?-n:n;
    const factor=10n**BigInt(8-digits);const r=(n+factor/2n)/factor;
    const base=10n**BigInt(digits);const head=(r/base).toString().replace(/\B(?=(\d{3})+(?!\d))/g,',');
    return sign+head+(digits?'.'+(r%base).toString().padStart(digits,'0'):'');
  }
  // percent 按共同计价币种计算比率；零成本收益率未定义，以 null 表达。
  function percent(a,b){return b===0n?null:a*100n*SCALE/b;}
  // position 计算未实现盈亏；costValue 是八位定点持仓总成本，绝不能覆盖原始单位成本 cost 字符串。
  // USD 转 CNY 只用于总览，不改变原币账目。
  function position(p,fx){const cost=mul(parse(p.cost),parse(p.qty));const value=mul(parse(p.price),parse(p.qty));const convert=x=>p.market==='Crypto'||p.market==='美股'?mul(x,parse(fx)):x;return {costValue:cost,value,pnl:value-cost,cny:convert(value),cnyCost:convert(cost)};}
  // tradePnl 只计算已平仓的做多记录，手续费与成交价使用相同币种。
  function tradePnl(t){return t.exit===''?null:mul(parse(t.exit)-parse(t.entry),parse(t.qty))-parse(t.fee);}
  const api={SCALE,parse,mul,format,percent,position,tradePnl};
  if(typeof module!=='undefined')module.exports=api;else scope.LedgerMath=api;
})(globalThis);
