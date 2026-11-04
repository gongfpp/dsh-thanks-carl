# 实际验收记录

验收环境：Mass-PC / Windows 11，日期见各节。开发与测试只在本项目目录内进行；未调用其他模型、AI CLI 或子 Agent。

## 2026-11-04：0.2.1 插件图标与面向用户的 README

- 新增 `icon.svg`（64×64 视口，内嵌 144px 卡尔图，圆角裁剪，12 KB）。插件图标在 DSH 侧取自包的 manifest `icon` 字段或 `./icon` 导出（见 `@deepseek-ai/dsh-host-plugin-inventory` 的 `icon` schema 说明），因此 `package.json` 同时声明 `"icon": "./icon.svg"` 与 `exports["./icon"]`，`files` 也包含它。
- 包边界检查新增两条断言：`icon.svg` 必须进包，manifest 与导出都必须指向它；同时保留原有图片白名单（仍只有两张 Carl 变体、市场图标与四张文档截图）。
- `npm run check`：**37/37 单元测试通过**，包边界 **21 files / 786.7 KiB**。
- README 重写为普通用户视角（功能、安装、设置表、隐私、兼容性、已知限制、卸载、简短开发节、英文段），开发细节仍只留在 `docs/` 与 `IMPLEMENTATION_TASK.md`。

## 2026-11-04：0.2.0 公开发布

- npm：`dsh-thanks-carl@0.2.0` 已发布为 `latest`（tarball 794 KB / 20 文件）。把已发布 tarball 下载解包后复查，无旧供应商文案、旧配置键或旧 projection 字段。
- 发布物可用性：在空目录执行 `npm install dsh-thanks-carl@0.2.0` 后 `import('dsh-thanks-carl')` 返回 `name=thanks-carl`、`inject=["connection","agents"]`、`apply` 为函数。
- 安装脚本：`pwsh -File scripts/test-install.ps1` 通过（安装两次、卸载两次、无关依赖与 bundle 保留、源码未动）。
- GitHub：公开仓库 <https://github.com/gongfpp/dsh-thanks-carl>，默认分支 `main`，48 个文件，带 `dsh-plugin` topic。
- 市场：向 awesome-dsh-plugin 提交单条投稿 PR [#12015](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/12015)；仓库创建未满 1 天，年龄门槛由 CI 自动重跑。

## 2026-11-04：移除供应商联动文案后的复验

按用户要求删除全部旧供应商联动（配置项、Host 侧 projection 查询、UI 文案切换与相关文档）。感谢按钮现在只有一种来源：`thanksText(reminderKind)` —— 喝水提醒为「谢谢谢谢卡尔」，其余一律「谢谢卡尔」。契约测试新增一条仓库级扫描：源码、构建产物、测试与文档中不得再出现旧供应商名称、旧配置键或旧 projection 字段。

复验结果：**37/37 单元测试通过；11/11 浏览器验收组通过；8 张真实浏览器截图；模型请求 0**。浏览器组覆盖任务完成、错误/取消/阻塞/等待不祝贺、喝水/吃饭调度、双标签去重、刷新持久化、拖动、390px 窄屏、Loader 禁用/恢复，以及无 prompt RPC、无页面异常。

## 2026-11-03：内置真实 Carl 梗图（纠正首版交付）

用户反馈首版必须上传图片，未满足需求。已修正为**默认内置**：将本机已核对的早期 Carl 梗图原照片裁切制成两种版本（清晰 384px、包浆 72px），均直接打包到插件 Client bundle。初次安装无需上传、无需联网下载、无需设置即可显示 Carl；自定义图片仅为可选替换，点击「恢复 Carl 原图」即可回到内置素材。没有 AI 重绘或卡通化。

验收新增明确的 no-upload 用例：打开插件详情设置时检查内置包浆图片已自然加载（72px），不上传文件即可使用。

## 2026-11-01：插件详情内配置

按用户要求，卡尔的配置入口从 `settings.section` 移至 DSH 官方 `plugins.bundle.config` keyed slot（`dsh-thanks-carl`）。路径：左侧「插件」→「已安装插件」→「dsh-thanks-carl」→ 详情中「插件设置」，设置直接出现在插件说明下方，原「设置」中不再多一个卡尔导航项目。「设置 → 通用」和「设置 → 内置插件」都保持原样。

使用原生插件管理器在隔离浏览器中点击真实的 `查看 dsh-thanks-carl` 按钮，确认 `[data-plugin-config] [data-thanks-carl=settings]` 正常呈现。为了回到对话而打开新会话时，原有 `select` 会清除预览与提醒；已调整为只清除上一会话的任务完成彩蛋，保留用户手动预览和本地提醒（不改变跨会话完成事件去重）。

**验收责任：**以上为我在 Mass-PC 上实际执行的自动化和隔离浏览器验收，不是第三方独立 QA，也不是用户本人签收。

## 结论

**已完成原生插件开发、自动化测试、隔离 DSH 加载、真实页面截图及安装/卸载验证。**

- DSH 真实 Web boot release：本次复验为 `0.2.2-alpha.2`（commit `d21f653`），此前为 `0.2.1-rc.2`（commit `332895e`），两次均加载通过。
- 自动化单元/契约测试：**37 / 37 通过**。
- 浏览器端完整验收：**11 组通过**、**8 张真实截图**、**0 个页面异常**。
- 隔离 fixture 统计：**模型请求 0**；没有 `session/prompt` RPC，没有调用任何真实模型。
- 分发检查：包含构建产物、两张内置 Carl 梗图图片、市场图标、许可证、文档与安装/卸载脚本；不含截图、测试 fixture、会话、凭据或运行日志；runtime npm 依赖为 0。

原始机器记录：[浏览器验收 JSON](<../artifacts/browser-verification.json>)、[分发检查 JSON](<../artifacts/distribution-check.json>)。这些本机证据不进入公开包。

## 做了哪些真实集成验证

使用 [隔离启动脚本](<../scripts/run-isolated.ps1>)，独立 DSH_HOME/profile、`127.0.0.1:3345`，未复制真实 profile 的凭据或第三方插件。先不带 fixture 启动最小插件，实际打开原生 DSH 页面、检查 boot graph 和受鉴权状态接口，确认 Host + Client 原生加载。

后续测试 [fixture](<../test/fixture-host.mjs>) 只在明确启用的本项目隔离 home 内注册测试控制接口。它创建的是真实 DSH runtime loop，**在 `agent/pre-step` 消费掉测试输入并返回空 messages**；本机 agent-loop 源码中的该路径正常写入真实 `turn/end: completed` 并进入 idle，完全不进入模型请求。错误由 pre-step 抛出、取消由真实 cancel 触发、等待由可取消的 pre-step 等待触发。不是伪造宠物 DOM，也不是伪造模型回复。截图中的会话明确标记“无模型”。fixture 额外拒绝并计数所有 `llm/stream`，最终计数为 0。

浏览器使用真实 Edge 无头运行，1440×960 / 390×844，中文、Asia/Shanghai、reduced-motion。提醒采用在页面加载前安装的 Playwright 浏览器时钟控制，只推进测试浏览器的计时器，**没有修改 Windows 系统时钟或暂停现有服务**。截图是 `page.screenshot` 直接保存，没有拼接、绘画或 AI 合成。

通过项目：

1. Host/client 原生加载；匿名状态请求 401，已认证请求 200。
2. 原生插件管理器中进入 dsh-thanks-carl 详情后显示“插件设置”（不另占通用设置入口）；本地图导入成功，包浆 72px / 同图清晰 384px。
3. 真实 driver 一轮完成显示一次；错误、取消、阻塞、等待用户不祝贺；浮层与输入框矩形不重叠。
4. 刷新后配置、照片、去重 ledger 保留，不重放旧完成。
5. 实际本地调度在受控浏览器时钟到期时显示喝水、吃饭；稍后操作保存后退出。
6. 两个真实浏览器标签通过原生 Web Locks 竞争同一个提醒，只出现一次。
7. 验证浮层与输入框矩形不重叠，实际向原生编辑器填入并清空文字，**没有发送**。
8. reduced-motion 无动画；指针拖动到左边缘成功；390px 窄屏元素未越界。
9. 原生 Loader disable 移除 Host route、Client UI 和 style；enable 恢复恰好一份 style，不重启 Host。
10. 无页面异常、无模型 stream、无 prompt RPC，浏览器非本地网络请求被隔离测试阻断。

## 文档截图

与市场展示共用，位于仓库 `docs/screenshots/`，由隔离实例的真实 `page.screenshot` 直接生成：

| 内容 | 截图 |
| --- | --- |
| 任务完成彩蛋 | [01-completion.png](<screenshots/01-completion.png>) |
| 插件详情内设置 | [02-settings.png](<screenshots/02-settings.png>) |
| 到期喝水提醒 | [03-water.png](<screenshots/03-water.png>) |
| 390px 窄屏 | [04-mobile.png](<screenshots/04-mobile.png>) |

`artifacts/screenshots/` 还保留 8 张完整验收截图（含包浆/清晰版、吃饭提醒、拖动停靠），属本机记录，不进入 npm 包。

## 自动测试覆盖和修正

[纯策略测试](<../test/core.test.mjs>)、[存储/并发测试](<../test/storage.test.mjs>)、[Host 与 bundle 契约测试](<../test/host.test.mjs>)覆盖：多会话/多轮、重复 idle、缺边界、未知原因、中断/取消/失败、概率/冷却、原子多标签去重、刷新、过期/未来事件、勿扰跨午夜、单次多提醒优先级、休眠长间隙、不补发、跨天吃饭、时区变化、时钟回拨不重复同一吃饭时刻、稍后过期、结构损坏的本地数据、缺 Web Locks / 存储不可用、安全图片 URI、lazy factory、发布白名单，以及仓库内旧供应商文案残留扫描。

集成阶段发现并修复了：fixture 位于主包下导致 client-modules 将其判成重复来源（增加独立 test package 身份）；flush 必须调用本机真实 `ctx.sessions.flush(session)`；设置 select 的可访问名称需要明确；旧夹具残留的测试会话会污染截图（改为每次验收前重建隔离 home）。

[安装脚本测试](<../scripts/test-install.ps1>) 在项目内临时 profile 执行安装两次、卸载两次，确认没有重复 bundle、保留无关依赖和 bundle、仅删除已核实 junction、不删除源码。

## 版权与分发

见 [详细素材来源与本机 API 查证](<technical-decisions.md>)。确证为真实 Carl 照片/早期梗图，未使用生成或重绘。原站 Pixabay 当前 403，未将二手来源当许可。包内两张素材为同一张已核实梗图的裁切（clear 384px、patina 72px），市场图标由清晰版等比缩放生成；自选图只是可选覆盖，清除后恢复内置 Carl。

内置裁切 SHA256：

- 清晰：`2735634c4ceec7dfab99ec2609662d7735e877292741d30a32289e86bfca905c`
- 包浆：`78f8621ddbb5b58accf1130b1d7fcc1076eb4e0d9d2cae05d5bae64f6e76e67b`

## 复现与下一步

完整命令见 [README](<../README.md>)，主要是 `npm run check`、`pwsh -File scripts/test-install.ps1`、隔离启动后 `npm run verify`。源码、素材与截图已经留存，可以重复验收。
