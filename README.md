# Rich Assets Book

个人投资手账，覆盖 Crypto、美股、港股、A 股持仓、短线纪律与年／周／日复盘。暖白与松绿色界面，金额使用 **Manrope Medium**。

网站地址：**https://rongweihe.github.io/rich-assets/**（首次部署成功后可访问）。

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
- 所有初始资产、价格、汇率及交易均为虚构设计示例，示例日期固定为 2026-11-07。此版本保留设计稿功能，尚未接入实时行情、跨设备同步、分批成本结转与备份恢复。
- 金句优先请求 Quotable，超时使用附有来源的本地摘录；公开接口不保证可用或覆盖特定投资人。

## 验证范围

`npm test` 包含 15 个金额边界断言、1000 组仓位不变量，以及加密解密、错误密码、篡改密文、缺失密码、过短密码、产物排除明文等检查。测试使用随机临时密码，不读取生产 `SITE_PASSWORD`。

未覆盖完整的本地密码持久化、跨标签页并发、备份恢复、真实金融业务结算；测试通过不等于安全审计。

## 参考

- [GitHub Pages 自定义工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets)
- [StatiCrypt](https://github.com/robinmoisson/staticrypt)
- [Quotable](https://github.com/lukePeavey/quotable)
- [伯克希尔 2008 年致股东信](https://www.berkshirehathaway.com/letters/2008ltr.pdf)
