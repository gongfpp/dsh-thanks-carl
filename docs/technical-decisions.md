# 技术决策与素材核实

核实时间：2026-10-31，Windows 11 / Mass-PC；目标 DSH 0.2.1-rc.2。仅直接工具作业，不调用模型或其他 Agent，不修改 DSH 核心及其他项目。

## 本机权威 API

实际读取 `C:/DevTools/dsh/node_modules/@deepseek-ai/` 下七个要求包的 README、lib 源码及 lib/types 声明。

- `dsh-client-modules`：package.json `dsh.client={platform:'web', immediately:true, inject:[包名]}`，`./client` 导出 built bundle；浏览器使用 `window.__ModuleLoader__.load({id,factory(require){...return exports}})`，不能裸 ESM 注入。React 属于共享基线，类型引用不产生 external。Host 对启用 Loader entry 扫描；ctx.effect 立即执行并收集返回 disposer。
- `dsh-client-ui-layout/lib/types/client/index.d.ts:85–98`、lib/client.js:623–650：`shell.overlay` 是 root/list 原生槽，注册唯一 ID，不替换 sidebar 或 main。层默认 pointer-events:none，仅宠物/气泡小范围恢复。
- `dsh-client-ui-settings/lib/types/client/contract/slots.d.ts:62–77`：`settings.section` root/list，options 包含 id/order/label（函数），由原生设置 shell 导航与关闭。本插件原采用该入口；2026-11-01 改为 `dsh-client-ui-plugin-manager` 的原生 `plugins.bundle.config` keyed slot（key=`dsh-thanks-carl`），配置直接位于对应 bundle 的详情页面描述下方，localStorage 偏好不加入 Host 全局模型设置。
- `dsh-client-ui-session`：root `useSessions`，`retainedBy.mainView` 标记当前主视图实际持有的会话；只观察 list，不 retain/激活冷会话，不抓 DOM。`useSessionStatus` 包含 running 和 pendingInteraction，不用作成功判据。
- `dsh-api-session-controller`：客户端 sessions.list 源，Host session/event 的 durable turn/end 是真实结束原因；不调用 prompt，不发送真实聊天。
- `dsh-agent/lib/types/runtime-types.d.ts:244–255`：agent/status payload `{agent,status:'running'|'idle'}`，agent.session.id 和 agent.options.provider；`dsh-session/lib/types/types.d.ts:263–277` turn/start/end.data.turn、reason.kind。completed 只代表本轮完成，不表示代码或测试通过。error/aborted/blocked/max-tokens/interrupted 不祝贺，未知原因仅“本轮结束了”。等待用户期间仍是 running，不触发完成。
- `dsh-client-connection/lib/types/rpc.d.ts:118–140`：`ctx.connection.fetch.register({path:'/api/...',methods:['GET'|'HEAD'|'POST'],requestBody:'buffered',fetch:async Request=>Response})`，受现有登录、Host/Origin、owner 权限保护。避免公开 webServer 裸 route 暴露会话信息。
- `dsh-host-webserver`：独立 carrier，不能假设路由自带鉴权；本插件不监听新端口，不接管 fallback。

本机现有 Web profile 只读核实：实际目前 package.json 有 9 个第三方依赖（旧 research-sources.md 的 six 已过时），包括 prompt-suggestion、qq-channel、videoforge、ds-bot、browser、md-studio、context、cost-meter、remote。读取 prompt-suggestion manifest 与 built client，确认同版本 factory、原生 settings.section + label()、ctx.slots.inject/register 用法。其余插件完全不改。

## 参考源码（不是依赖，不复制其素材）

- [dsh-meow-cat](https://github.com/dsh-pub/dsh-meow-cat/tree/c9b9c6807b5edebaef2112f52317d55da75e98cd)：读 lib/index.js、lib/client.js。idle 累加器会混淆结果、缺轮次去重，不采用；保留 CSS 轻量动画和 effect 清理思想。
- [c-ling/dsh-plugin-pet](https://github.com/c-ling/dsh-plugin-pet/tree/672c068626a460268cc3e5514e9ff912dc5630a6)：下载并阅读 host/client 源码相关片段：connection.fetch 注册、自选图片、shell.overlay；其 MutationObserver 账户菜单入口不采用，使用本机已支持的 `plugins.bundle.config`。
- [mjw-git/dsh-pet](https://github.com/mjw-git/dsh-pet/tree/7b79731589e3cdfcebd964b7a2dcd2d4193d5952)：读 packages/pet/src/index.ts、client/index.ts，核实 slot/effect 与 Host 配套思路；不采用未经鉴权的裸 pet route。
- [ysyyhhh/dsh-pet](https://github.com/ysyyhhh/dsh-pet/tree/a17346b9c41efb4220f387216008928bba652e0e)：读 HarnessBridge.ts；session/event 和 agent/status 需要 global:true 接收多会话，事件映射以本机类型为准。

## 素材证据与许可边界

- [KYM Carl 词条](https://knowyourmeme.com/memes/carl-the-hedgehog)：直接下载 HTML 阅读 Origin / footnote。指出 2014-10-01 用户 amayaeguizabal 上传，原始来源 [Pixabay 468228](https://pixabay.com/photos/hedgehog-animal-baby-cute-small-468228/)。2019-02-28 Lawvamat me_irl 梗图；不能将二手 2019 年说法当原照片日期。
- [原始照片镜像 1468364](https://knowyourmeme.com/photos/1468364-carl-the-hedgehog)：页面明确标题 Hedgehog Photo by amayaeguizabal，Source 链接上述 Pixabay。下载 `https://i.kym-cdn.com/photos/images/original/001/468/364/1a3.jpg`，1920×1275，SHA256 `1a395ac2e4be981b392929915320956480adc566219e2335c6adab2355107c8a`。已实际看图。
- [早期真实梗图 1468370](https://knowyourmeme.com/photos/1468370-carl-the-hedgehog)：下载 `https://i.kym-cdn.com/photos/images/original/001/468/370/a1b.png`，1802×1396，SHA256 `a1b4d6b414ad292458d0de585e10c22c92193d691b875d08b7818284063eb9bd`。图内刺猬与原始照片为同一拍摄姿态，白背景抠图，非 AI。测试图从此梗图裁切、白背景透明化，清晰版与降质版同源。
- 用户给出的 [1486457](https://knowyourmeme.com/photos/1486457-carl-the-hedgehog) 下载实看是戴帽旅行衍生版（720×650，SHA256 `4fd84f96071bb1ef9447fb9ec0f9603db3b84af651fade956ee4f2b2f2d813c5`），不冒充原始照片。
- [快看二手说明](https://m.kuaikanmanhua.com/webs/world/123292277760062458901)：确认中文流传照片与早期 Carl 对应，仅用于交叉识别，不据此断言版权。其首图已下载实看。
- [Reddit c4urth](https://www.reddit.com/r/memes/comments/c4urth/) 页面返回空壳，JSON 403，不声称读取到帖子内容。
- Pixabay 图片页及 [许可摘要](https://pixabay.com/service/license-summary/) 本机联网均返回 Cloudflare 403。无法独立验证当时 CC0 或当前许可适用于该文件，也无法确认抠图二创授权链。**因此保留完整出处记录，并把随包图片限定为这个插件的个人、非商业使用；权利人提出异议即移除。**发布包内置两张来自已核实 Carl 早期梗图的原照片裁切：clear 384px 与 patina 72px，均由同一张真实梗图裁切并保留低清效果；不使用 AI 重绘。两张文件在 `assets/`，构建时内嵌 Client bundle，用户安装后无需上传图片。市场图标 `assets/icon-180.png` 由同一清晰版图像等比缩放并加暖白底生成。自选图片作为可选替换，清除后恢复内置卡尔。

## 触发与退化模型（编码前确定）

1. Host 监听真实 session/event 与 agent/status，缓存每会话轮次与结束原因；只有观察到 running 且收到对应 turn/end 再 idle 才发候选，处理连续轮次；以 sessionId+turn 唯一标识。不扫描聊天文本、不读取 tool/result 内容，不许说“测试通过”。
2. 客户端从受保护只读状态 route 获取短期候选；初次建立 baseline 不回放，候选过期即丢弃。只对当前 mainView 会话展示，切会话不补播。Web Locks + localStorage ledger 原子去重/冷却（跨标签、刷新）；没有安全 Web Locks 或 storage 不可用时禁用自动触发，保留手动预览，宁可漏掉不重复骚扰。
3. 提醒调度在客户端使用本地时区与稳定 date/time/interval ID；可见标签才参加；同一原子 ledger 处理跨标签竞争。只保留最近未过期的一个提醒，饮水/休息休眠超时不追补，吃饭短窗口过期丢弃；勿扰时段消费而不补发。时区变化/时钟回拨重建基准，日期时间 ID 避免 DST 重复。
4. 队列限长，只显示一条，提醒优先于完成、手动路过；稍后使用原始 ID 单一延迟项，有截止时间；后台/睡眠不积压。
5. 默认彩蛋模式 15% 概率、30 分钟冷却、静音，饮水 60 分钟，吃饭 12:00/18:00，休息默认关闭（120 分钟），勿扰 00:00–08:00。必出现模式绕过概率与彩蛋冷却但仍受禁用/勿扰/去重/可见性限制。

## 展示元数据与包结构（0.2.2）

1. 插件列表与详情页的显示信息来自三样东西：`locale/*.json` 的 `meta.title` / `meta.description`、`icon` 资源，以及包的导出映射；三者都在不激活插件的前提下读取。因此新增 `locale/zh.json` 与 `locale/en.json`，`icon.svg` 通过 manifest 的 `icon` 字段与 `./icon` 导出同时可达，二者都进 `files`。
2. 入口固定在包根：`index.js`（Host ESM，由 `src/host.mjs` 构建）与 `client.js`（客户端 factory，由 `src/client.jsx` 构建）。`src/` 只放源码，`lib/` 不再作为发布目录；构建产物是根目录文件，安装脚本与包边界检查都按根路径断言。
3. `catalog-entry.yml` 是仓库投稿用的文件，放在 `docs/` 下并明确不进 `files`；包边界检查新增断言，禁止把 `docs/catalog-entry` 打进包。

## 隔离边界

所有新增运行配置、缓存、测试工作区在本项目 .runtime 内，使用独立 DSH_HOME/profile 和 loopback 测试端口，禁止继承真实凭据、真实会话。不启动其他 AI、不做实际 LLM 请求。原 3333 PID 17956 作为前后检查基准，绝不 kill/restart。隔离 fixture 将明确标注无模型的生命周期测试，截图不是伪造模型成功结果。
