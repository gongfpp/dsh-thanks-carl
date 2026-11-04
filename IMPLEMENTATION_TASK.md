# 谢谢卡尔（Thanks Carl）— DSH 真实插件实施任务

目标电脑：Mass-PC / Windows 11；工作目录 D:\Playground\dsh-thanks-carl；目前 DSH 0.2.1-rc.2、现有 Web 服务 localhost:3333。已批准开发，不需要再等确认。

## 首要执行约束
1. 本会话指定 openai-codex / gpt-6.1-sol / high。禁止调用其他 LLM、子 Agent、Codex/Claude/DeepSeek CLI、通过 MCP 间接转派、调用图像生成模型；不另行消耗 AI 额度。你的直接工具调用（联网、读取文件、编程、安装依赖、测试）均可使用。
2. 先阅读当前项目、全局和项目级 AGENTS.md，按目录规范作业。其他项目/插件/其他 DSH 会话完全不动。不得擅自升级 DSH 或重启现有 3333 进程；隔离环境验证后才考虑安装。需要重启才能生效时报告，而非杀掉当前会话。完成后 git commit 并推送到公开仓库。
3. 之前的 AI 生成图仅用于表达场景，不得当作项目素材或真正的产品截图。必须使用互联网上真正流行的 Carl 小刺猬梗图，保留低画质、压缩、包浆、表情包质感，不能 AI 重绘、CG 化、卡通化、用其他刺猬冒充。提供“包浆版本”和“同一真实照片的相对清晰版本”两种素材选项。
4. 项目是原生 DSH Web 插件，轻量浮层小宠物，不是宣传页、独立网页、新聊天 UI、大片高光 HUD。不遮挡 DSH 主界面、代码、输入区。

## 第一阶段：技术和素材核实
实际检查本机 C:\DevTools\dsh\node_modules\@deepseek-ai 下 dsh-client-modules、dsh-client-ui-layout、dsh-client-ui-settings、dsh-client-ui-session、dsh-api-session-controller、dsh-host-webserver、dsh-client-connection 的 README、类型和源码，确认 0.2.1-rc.2 的真实 bundle/client/slot/host event 生命周期；再核对当前 Web profile 已安装的本地插件实现。不能假设存在其他版本 API。
联网阅读源码而非只看摘要：
- https://github.com/dsh-pub/dsh-meow-cat （agent/status idle 任务完成事件，host 状态计数，client 动画）
- https://github.com/c-ling/dsh-plugin-pet （透明宠物、状态、图片、设置、bundle）
- https://github.com/mjw-git/dsh-pet （host/client 配套和状态推送）
- https://github.com/ysyyhhh/dsh-pet （真实状态 + 自选精灵）
用本机类型声明确认，若网上代码与本地版本冲突以本地为准。选原生 DSH Client UI 槽位和 Host 生命周期，不使用脆弱 DOM selector 作为首选。
Carl 图片溯源线索：
- https://knowyourmeme.com/memes/carl-the-hedgehog/photos
- https://knowyourmeme.com/photos/1486457-carl-the-hedgehog
- https://www.reddit.com/r/memes/comments/c4urth
- https://m.kuaikanmanhua.com/webs/world/123292277760062458901 （2014 Pixabay、2019 Reddit 仅作为二手线索）
核对原照片、下载渠道、作者/许可、文件哈希；图像可以裁切抠图、透明化、降质压缩，不能生成、绘制新小刺猬。如缺乏可分发许可，务必保留原图本地用户自选功能，打包许可明确的素材或可区分的占位符，不得谎称是原图。允许做本机个人测试，但不能悄悄公开他人版权图。
将查证写入 docs/technical-decisions.md，明确可用 API、素材清单、可靠触发模型和退化策略，然后编码。

## 核心功能优先级
P0 任务完成彩蛋：
- 根据真实完成事件判断单轮 running→idle，谨慎区分成功、失败、取消、等待用户；绝不根据聊天内容关键词自作判断“测试通过”；拿不准就只说“本轮结束了”。
- 多会话和多标签按会话+轮次去重，刷新、切会话不重复；低概率触发、间隔冷却，默认不骚扰。状态变化时的小刺猬可从边缘探头，展示一句原梗风格短气泡，点击“谢谢卡尔”后离开。可配置开启“任务完成必出现”。
P0 定时提醒：
- 喝水每 N 分钟（默认 60），卡尔提醒你喝水，可点击“谢谢谢谢卡尔”、关闭或稍后再提醒。
- 吃饭每日多时刻（默认 12:00、18:00），卡尔提醒你吃饭，同样支持稍后/已阅。
- 可选工作间歇提醒（默认 120 分钟），可按需关闭。
- 系统休眠唤醒、浏览器标签后台、超时重试、午夜跨天、时区、时钟跳变下不能暴发补发一堆通知；勿扰时段默认 00:00–08:00。所有提醒有稳定 ID、本地时区与过期策略，调度本地完成，无联网/额外模型。
P1 动画与互动：
- 真实低清梗图小范围移动、探头、短暂停留、轻微抖动/点头（CSS 转场可以，不生成新图），气泡跟随；可拖动、点按、关闭、调整大小、屏幕边缘停靠、手动召唤、启用常驻桌宠模式。
- 默认事件彩蛋模式，不是常驻贴图；无大片虚拟面板、无光污染，元素尺寸约 76-128px，气泡约 160-240px；不能拦截 DSH 输入。支持 prefers-reduced-motion。
P1 设置：
- 原生设置页/入口（通过本机支持的机制接入），开关、事件频率、画质/自选图片、声音、喝水时间、吃饭多个时段、勿扰、联动、常驻/彩蛋模式、预览按钮。localStorage 或合适的 Host 持久化，本地保存，刷新不丢。
- 同时弹出的事件只显示一个，优先级提醒>完成彩蛋>随机路过；可静音、延后、关闭。默认不播音效，不上传聊天记录。

## 工程和验收
结构：package.json（dsh.bundle、dsh.client、导出映射）、cordis.patch.yml、index.js/client.js（包根入口，由 src/ 构建）、assets、README、测试、可重复安装/卸载脚本、docs/technical-decisions.md、docs/verification.md、真实截图文件。
先写最小原生插件，隔离 profile / 测试端口验证 Host 加载，再做事件/时钟/设置测试。真实 DSH 页面（或隔离 DSH 实例）的截图至少覆盖：原梗图出现、任务完成、喝水/吃饭、设置；不能使用 AI 拼图冒充真实运行截图。若远程 Session 0 无法操作浏览器，说明限制并提供实际截图的可重复命令。
校验：成功一轮只触发一次；失败/取消不祝贺；新标签/刷新不多次；提醒精准且勿扰有效；页面不挡输入；可关闭/卸载；现有插件功能没变化；不需调用模型。合理增加关键测试，不能只靠人工浏览。
完成后 git commit 并 push，报告 commit、文件路径、真实验收结果、是否已在原 profile 安装、启动状态、下一步。若确需重启当前 3333 服务，保留运行中环境，明确说明，绝不擅自重启。
自主推进直到可用；遇到一个 blocker 时先完成其他可独立工作，不要因一点困难提前结束。