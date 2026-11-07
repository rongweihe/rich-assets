# Rich Assets Book

个人投资手账，覆盖 Crypto、美股、港股、A 股持仓、短线纪律与年／周／日复盘。暖白与松绿色界面，金额使用 **Manrope Medium**。

网站地址：**https://rongweihe.github.io/rich-assets/**。

## GitHub Pages 部署步骤

1. 打开仓库 [Settings → Secrets and variables → Actions](https://github.com/rongweihe/rich-assets/settings/secrets/actions)，新建或更新 `SITE_PASSWORD`。值为你预先设定的统一访问密码，要求 16–256 个字符。不要把密码写进源码、提交记录或 Issue。
2. 打开 [Settings → Pages](https://github.com/rongweihe/rich-assets/settings/pages)，将 **Build and deployment → Source** 设为 **GitHub Actions**。不要选从分支直接发布，否则不会运行加密构建。
3. 打开 [Actions](https://github.com/rongweihe/rich-assets/actions)，选择 **Deploy protected GitHub Pages**，点击 **Run workflow → main → Run workflow**。以后推送到 `main` 也会自动部署。
4. 等待 `build` 和 `deploy` 都成功，访问 https://rongweihe.github.io/rich-assets/ 。未解锁时只显示密码入口；输入 `SITE_PASSWORD` 才解密页面。开启 HTTPS。
5. 检查错误密码不能进入、正确密码能进入、刷新后再次显示密码入口。手机和电脑的本地投资记录分别保存，不自动同步。

## 修改网站密码

在上述 Secrets 页面更新 **SITE_PASSWORD**，然后重新运行 **Deploy protected GitHub Pages**。仅修改 Secret 不会自动触发部署；不需要修改业务代码。新部署生效后，新访问使用新密码。已解密的页面、下载的旧版本及缓存不能通过改密撤回。

如果部署报错 `请设置 SITE_PASSWORD（16–256 个字符）`，检查 Secret 名称、长度和是否创建在此仓库。不要把密码发给其他人排查。

## 发布与数据边界

- 使用固定版本 StatiCrypt 3.5.4 在构建阶段加密单文件页面。整个应用的 HTML、CSS、JavaScript 打包后加密；Pages 发布目录只有 `index.html` 和 `.nojekyll`。
- 发布失败即停止，不降级为明文。不会上传 `src/`、截图、本地预览稿、`.env`、备份或 `node_modules/`。本项目的 GitHub 仓库公开的是通用源码及虚构示例，**源码本身不保密**；不要向公开仓库提交真实持仓和交易。
- 网站密码只通过 GitHub Secret 或本地 `.env` 注入构建，不嵌入明文页面、不放入命令行参数、不记录到日志。入口关闭“记住密码”及 URL 自动解锁，刷新需要再次输入。
- GitHub Pages 不提供服务端鉴权。访客可以下载密文，因此必须使用足够长且不易猜测的密码。这不能取代服务端的账户隔离、访问撤销和审计。
- **网站访问密码**由站主在 GitHub 设置，访客不能自行设置。**本地加密密码**是应用内可选的独立保护：用来加密此浏览器的投资记录，两者互不替代。网站密码变更不会重加密已有本地账本。
- 未设置本地加密密码时为会话内的示例模式，刷新会恢复示例。设置后使用 PBKDF2 与 AES-GCM 保存本地密文；密码遗失或清空浏览器存储会导致数据无法恢复。当前有加密备份导出，导入恢复尚未实现，请勿将此版本作为真实资产记录的唯一副本。

## 本地开发与构建

需要 Node.js 22 或更新版本：

```bash
npm ci --ignore-scripts
npm test
```

开发界面（仅本机，不作为公开发布目录）：

```bash
python3 -m http.server 4173 --bind 127.0.0.1 --directory src
```

验证带密码的发布版本：复制 `.env.example` 为 `.env`，在本机编辑 `SITE_PASSWORD`，然后运行：

```bash
npm run build
npm run preview
```

通过 http://127.0.0.1:4173 访问。`.env`、`dist/`、`.build/` 均被 Git 忽略。不要把 `.env` 上传到 GitHub；本地预览需要 HTTP localhost，正式站点使用 HTTPS。

## 目录

```text
src/                          手账页面与计算逻辑（虚构示例）
scripts/build.mjs             单文件打包、加密与发布目录检查
scripts/password-template.html 中文密码入口
tests/                        计算与加密边界测试
.github/workflows/deploy.yml  自动测试 → 加密 → Pages 发布
```

## 当前功能与计算口径

- Crypto、美股用 USD；港股、A 股用 CNY。港股的成本和参考现价需由用户先折算成人民币。总览用手动 USD/CNY 汇率统一估值。
- 持仓为快照，浮动盈亏 =（参考现价 − 单位成本）× 数量，不含税费、分红与历史汇兑损益。占比分母为全部已记录持仓的折算市值，不含未记录现金。
- 金融计算使用 BigInt 八位定点数，不经二进制浮点数中转。超出输入精度明确拒绝；中间估值不足八位向零截取，展示四舍五入至两位，展示值不反向参与计算。
- 短线按一笔完整做多交易计一次，修改或补录平仓不重复计次；按入场日归入周一至周日，使用当前手动汇率做周度统计。亏损阈值累计负收益绝对值，不与盈利抵消。
- 超限提醒不阻止补记已发生的交易，手账不连接交易账户。短线记录与持仓快照独立，不自动增减持仓。
- 所有初始资产、价格、汇率及交易均为虚构设计示例，示例日期固定为 2026-11-07。此版本保留设计稿功能，Crypto 可选择公开行情快照；尚未实现实时推流、跨设备同步、分批成本结转与备份恢复。
- 金句优先请求 Quotable，超时使用附有来源的本地摘录；公开接口不保证可用或覆盖特定投资人。

## Crypto 行情与买入成本

- 打开持仓编辑，在「价格来源 / 原生资产」选择 **Binance · Bitcoin · 原生 BTC · BTCUSDT** 等选项后保存。现有旧账本保持手动估值，须逐笔确认资产身份；不会凭同名代码猜测包装币或合约。当前支持 BTC、ETH、SOL、BNB、DOGE、XRP 的原生资产，其余可手动输入 USD 参考价。
- 行情：Binance 公开只读域名 `https://data-api.binance.vision/api/v3/ticker/price?symbol=BTCUSDT`；美元折算：Coinbase `https://api.coinbase.com/v2/prices/USDT-USD/spot`。无需 API Key，浏览器只发送公开交易对，不上传买入成本、数量或账本。
- USD 估值单价 = Binance USDT 单价 × Coinbase USDT/USD 汇率；**不假定 USDT 与 USD 等值**。两路数据不是同一时刻的成交报价，只用于账本估值。页面展示原始 USDT 价格、汇率以及浏览器获取时间，非交易所成交时间。
- 首次进入/解锁、打开已关联的 Crypto 持仓编辑时获取行情；也可点击「刷新 Crypto」或「获取最新行情」。请求合并并缓存 30 秒，8 秒超时；无轮询。持续打开的页面不会自动跟随市场，需手动刷新。
- 失败、限流、地区/跨域限制、非法返回值均不会生成虚假报价；有旧值时明确标注并保留，编辑器首次取价失败时不允许保存为 API 估值，可重试或主动切换手动估值。未关联行情的股票仍是手动价格。
- 行情刷新只更新会话内估值缓存，不修改成本和数量；保存编辑时将本次报价连同来源与获取时间存入该笔记录，本地加密机制不变。
- 「平均买入价」是用户填写的**每枚/股成本**；持仓总成本 = 平均买入价 × 数量。原单位成本异常是列表合并计算字段时覆盖原值、又将定点整数当美元重新解析造成的展示错误，现用独立 `costValue` 字段，既有原始买入成本无需迁移。

## 验证范围

`npm test` 包含金额边界、单位成本字段冲突回归、1000 组仓位不变量、行情币种与精度校验、并发请求隔离、缓存、限流/断网/超时失败，以及加密解密、错误密码、篡改密文、缺失密码、过短密码、产物排除明文等检查。测试使用随机临时密码，不读取生产 `SITE_PASSWORD`。

未覆盖完整的本地密码持久化、跨标签页并发、备份恢复、真实金融业务结算；测试通过不等于安全审计。

## 参考

- [GitHub Pages 自定义工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets)
- [StatiCrypt](https://github.com/robinmoisson/staticrypt)
- [Quotable](https://github.com/lukePeavey/quotable)
- [伯克希尔 2008 年致股东信](https://www.berkshirehathaway.com/letters/2008ltr.pdf)
- [Binance 公开行情域名](https://developers.binance.com/docs/binance-spot-api-docs/faqs/market_data_only)
- [Coinbase 公开价格接口](https://docs.cdp.coinbase.com/coinbase-app/track-apis/prices)
