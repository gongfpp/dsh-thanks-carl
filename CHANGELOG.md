# 更新记录

## 0.2.2 · 2026-11-04

- 入口归位：`lib/host.js` / `lib/client.js` 改为包根的 `index.js` / `client.js`，删除 `lib/` 目录；构建脚本、安装/卸载脚本、包边界断言与测试同步改为根路径。
- 新增 `locale/zh.json`、`locale/en.json` 的 `meta.title` / `meta.description`，并导出 `./locale/*.json`：插件列表与详情页现在按界面语言显示「谢谢卡尔」/「Thanks Carl」，不再直接显示包名。
- `catalog-entry.yml` 从仓库根移到 `docs/`（仓库投稿用，不进 npm 包），包边界检查新增对应断言。
- 浏览器验收脚本适配本地化标题，并在打开插件页前先关闭引导弹窗。
- 验证：37/37 单元测试、11/11 浏览器验收组、8 张截图、模型请求 0；包 **22 files / 784.5 KiB**。

## 0.2.1 · 2026-11-04

- 新增插件图标 `icon.svg`，并在 `package.json` 里声明 `icon` 与 `./icon` 导出：DSH 插件列表与详情页现在能显示卡尔图标。
- README 改写为面向普通用户：功能、安装、设置说明表、隐私、兼容性、已知限制、卸载在前，开发说明压缩成一小节；补充英文段与 npm/许可/DSH 版本徽章。
- 包边界检查新增断言：`icon.svg` 必须在包内，且 manifest 与导出都指向它。

## 0.2.0 · 2026-11-04

已发布于 npm（`latest`）与 GitHub 公开仓库；市场投稿见 awesome-dsh-plugin PR #12015。

- 移除全部旧供应商联动：删除文案切换配置、Host 侧供应商 projection 查询、客户端投影读取与对应测试/文档。感谢按钮固定为「谢谢卡尔」（喝水提醒为「谢谢谢谢卡尔」）。
- 新增仓库级契约测试，扫描源码、构建产物、测试与文档，防止旧供应商文案回归。
- 公开分发整理：升级为 0.2.0，补充 `repository` / `homepage` / `bugs` / `dshhub` 元数据与 `publishConfig`。
- README 重写为公开安装说明，新增 `docs/screenshots/` 真实截图、市场 `icon-180.png` 与 `screenshots.json`。
- 包边界检查允许市场图标，仍不含截图、夹具、运行状态或 runtime 依赖。

## 0.1.0

- 首个本机版本：任务完成彩蛋、喝水/吃饭/休息本地提醒、插件详情内设置、内置两张 Carl 梗图、跨标签 Web Locks 去重与持久化 ledger。
