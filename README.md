# 谢谢卡尔 · Thanks Carl

<img src="icon.svg" width="48" height="48" alt="谢谢卡尔插件图标" />

[![npm](https://img.shields.io/npm/v/dsh-thanks-carl.svg)](https://www.npmjs.com/package/dsh-thanks-carl)
[![license](https://img.shields.io/npm/l/dsh-thanks-carl.svg)](LICENSE)
[![dsh](https://img.shields.io/badge/dsh-0.2.1%2B-4D6BFE)](https://github.com/deepseek-ai/deepseek-harness)

每轮任务做完，让那只刺猬从屏幕边缘探头，跟你说一句「谢谢卡尔」；它也会提醒你喝水、吃饭、起来动一动。

插件里自带卡尔照片，装上就能用——不用自己找图，也不用配置。

![卡尔从屏幕边缘探头，说完「谢谢卡尔」又缩回去](<docs/screenshots/05-demo.gif>)

<sub>7 秒演示：完成彩蛋（气泡上的「预览」是因为用设置里的预览按钮录制）和喝水提醒。</sub>

## 功能

- **任务完成的彩蛋**：一轮真的做完了，卡尔才有机会探头；默认 15% 概率、间隔至少 30 分钟，出现时点「谢谢卡尔」或关掉气泡它就走了。失败、取消、中断的轮次它不会来道谢。
- **两种模式**：事件彩蛋（偶尔出现）或常驻桌宠（一直在，点一下有反应）。常驻模式可以关掉「完成彩蛋」只留桌宠。
- **自带照片**：原版包浆图，也可以换成同一张照片的清晰版；想用自己的图就上传一张，随时一键恢复卡尔原图。
- **本地提醒**：喝水（默认每 60 分钟）、吃饭（默认 12:00、18:00）、工作间歇（默认关）；提醒带「稍后 10 分钟」。默认 00:00–08:00 勿扰。
- **不打扰**：默认真静音、气泡只占屏幕边缘一小块、不遮挡点击；跟随系统「减少动态效果」设置。
- **完全本地**：不联网、不读聊天内容、不发消息、不调用模型。

### 源码版新增（尚未发布到 npm）

- **摸摸卡尔**：点一下或按 Enter/空格，它会回一句随机短话；快速连点四下会害羞，歇一会儿再摸。
- **陪你专注**：25 / 45 分钟，支持暂停、继续、结束；刷新页面或切会话不会重置，同一浏览器的标签页共用一个计时。计时中安静陪伴，到期邀请休息，不自动开始下一轮。
- **就地小菜单**：点击卡尔旁的「···」、右键或长按照片，可以标记「我喝过水了」、安静一小时、今天先休息或唤醒卡尔。喝水会从现在重新计时；今天休息到本地午夜。

- **关菜单不等于收起**：菜单右上角 ×、点空白或 Esc 只关菜单，手动唤出的卡尔继续陪着你；气泡的 × 只关闭提示。
- **回小窝**：菜单里的「回小窝」让卡尔缩回边缘，只留一个小头像，点它再出来。不会停止专注计时或清除免扰；下一次正常到期的提醒仍可叫它出来。不想显示任何入口，关闭「启用卡尔」。手动召唤/回窝只作用于当前标签页，刷新后回到所选出现模式。
- **可选边缘闲逛**：菜单或设置里把「活动方式」从默认的「乖乖待着」切到「自己逛逛」。每隔 20–40 秒在停靠位置上下 48px 内慢慢挪几步；拖动时跟手，松手回边缘轻轻停稳。保留原照片，不是新的逐帧走路动画。

菜单、提示气泡打开，鼠标/键盘正在操作卡尔，专注、睡觉、勿扰时段、页面后台或系统要求减少动态效果时，都暂停闲逛。免扰只抑制自动提醒和完成彩蛋，手动互动仍可用。专注结束后若已离开超过两分钟，只保留完成状态，不补弹气泡；关闭页面期间不会发系统通知。

以下菜单截图来自源码版的真实隔离运行；下面的 npm 安装命令目前仍安装已发布的 0.2.3，文首 GIF 也是 0.2.3 的演示。

![源码版卡尔快捷菜单：专注、喝水、休息、活动方式与回小窝](<docs/companion-menu.png>)

## 安装

在 DSH 的插件市场里装，或者用命令行：

```powershell
dsh plugin --profile web add dsh-thanks-carl
```

装好后**重启一次 `dsh web`**，再刷新页面，卡尔就出现了。插件列表里的名字会跟随界面语言显示为「谢谢卡尔」或「Thanks Carl」。

需要 DSH Web GUI 0.2.1 或更高版本（不支持 0.3）；页面需在 `https` 或 `localhost` 下打开，浏览器过旧或被禁用本地存储时会自动停用，不影响 DSH 本身。

## 使用

侧边栏「插件」→「已安装插件」→ **dsh-thanks-carl** → 页面底部的「插件设置」。设置改完立即生效，只存在你当前浏览器里。

![插件设置](<docs/screenshots/02-settings.png>)

| 设置 | 说明 |
|---|---|
| 模式 | 事件彩蛋 / 常驻桌宠 |
| 本轮完成彩蛋 | 任务完成后允许卡尔出现 |
| 任务完成必出现 | 勾上则每轮都来；不勾按概率和间隔出现 |
| 出现概率 / 彩蛋间隔 | 默认 0.15 / 30 分钟 |
| 画质 | 包浆版本 / 同图相对清晰版本 |
| 大小、停靠边缘 | 76–128 px，贴左或贴右 |
| 轻提示音 | 默认关 |
| 喝水提醒 / 每隔多少分钟 | 默认开，60 分钟 |
| 吃饭提醒 / 吃饭时刻 | 默认 12:00、18:00 |
| 工作间歇提醒 / 工作间歇 | 默认关 |
| 勿扰时段 | 默认 00:00–08:00 |

「召唤卡尔」立即让卡尔出现；下方的预览按钮可以分别看完成彩蛋、喝水、吃饭、休息长什么样。气泡上的「稍后 10 分钟」只对提醒有效。

![喝水提醒](<docs/screenshots/03-water.png>)

把卡尔拖到屏幕另一侧就会换边停靠；手机上它会缩在角落，不挡内容。

## 隐私

- 不联网、无遥测、不读对话正文，只判断「这一轮是否正常结束」。
- 设置和上传的图片都保存在你当前浏览器里（localStorage），不跨设备同步。
- 不申请系统通知权限，不采集任何统计。

## 兼容性

- DeepSeek Harness `>=0.2.1-0 <0.3.0-0`（Web GUI）
- Node.js `>=22.12`（仅安装时用到）
- 支持 Web Locks 的现代浏览器（Chrome / Edge / Firefox / Safari 近期版本）

## 已知限制

- 页面要开着才可能提醒；关掉浏览器就不会响，也不会弹系统通知。
- 后台标签页或电脑睡眠期间错过的提醒不会补发。
- 同一浏览器多标签页会去重，只出现一次；换浏览器或换端口就是另一份设置。
- 只在当前会话视图里生效，切换会话或刷新不补播。

## 卸载

```powershell
pwsh -File scripts/uninstall.ps1 -Profile web
```

也可以先到设置里关掉「启用卡尔」临时隐藏。卸载只移除本地链接和挂载，不删你的源码；设置项可以在浏览器开发者工具里删掉本站的 `thanks-carl.*` 记录。

## 开发

```powershell
npm ci
npm run check        # 构建 + 单测 + 包边界
pwsh -File scripts/test-install.ps1
```

想跑真实浏览器里的完整验收，见[验收记录](<docs/verification.md>)里的隔离实例步骤（测试端口 3345，不碰正在用的 3333）。

- [技术决策与素材出处](<docs/technical-decisions.md>)
- [实际验收记录与截图](<docs/verification.md>)
- [任务说明](<IMPLEMENTATION_TASK.md>)

## 相关插件

同样是本地小工具，做完这一只之后顺手写的：

- **[每轮扣款语音播报 · dsh-cost-voice](https://github.com/gongfpp/dsh-cost-voice)** — 每轮结束用支付宝或「大白饭」的声音报一句本轮花了多少钱。
- **[小说摸鱼 · dsh-novel-fish](https://github.com/gongfpp/dsh-novel-fish)** — 在聊天区域下方读本地小说，小说内容不会发给模型。

## 致谢与声明

内置照片是公开流传的 Carl the Hedgehog 梗图（原始照片为 Pixabay 用户 amayaeguizabal 于 2014 年上传），按原样随插件提供，仅用于这个插件的个人、非商业用途；如权利人提出异议会移除。出处与核实记录见[技术决策与素材出处](<docs/technical-decisions.md>)。

## License

代码为 [MIT](LICENSE)。

---

## English

A quiet Carl the Hedgehog easter egg for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness): when a turn really finishes, Carl peeks in from the edge of the screen and says "谢谢卡尔" — and reminds you to drink water, eat, and take breaks.

- **Completion easter egg**: 15% chance per finished turn, 30-minute cooldown by default; failed, cancelled or interrupted turns are never congratulated.
- **Two modes**: occasional easter egg, or a resident desktop pet.
- **Bundled photo**: the original patina version, a clearer variant of the same photo, or upload your own and restore the original anytime.
- **Local reminders**: water every 60 minutes, meals at 12:00 and 18:00, work breaks off by default, quiet hours 00:00–08:00, snooze 10 minutes.
- **Fully local**: no network, no telemetry, never reads your conversation, no model calls.

Unreleased in source: pet reactions, a shared 25/45-minute focus timer with pause/resume, and a local quick menu (water acknowledgment, one-hour/today quiet, wake). Closing the menu keeps a manually summoned Carl visible; “回小窝” returns it to a small avatar without ending focus. Optional edge wandering is off by default and pauses during interaction, focus, sleep, background use or reduced motion. Drag follows your pointer and docks gently; all animation uses the original photograph. npm still serves 0.2.3; the GIF above shows that published version.

```powershell
dsh plugin --profile web add dsh-thanks-carl
```

Restart `dsh web` once, then reload the page. Settings live under Plugins → Installed → dsh-thanks-carl → Plugin settings. Requires DSH 0.2.1+ (<0.3) and Node 22.12+ at install time. MIT for the code; the Carl meme photo ships for personal, non-commercial use with this plugin only.

Related local plugins: [dsh-cost-voice](https://github.com/gongfpp/dsh-cost-voice) (per-turn spend voice announcements) and [dsh-novel-fish](https://github.com/gongfpp/dsh-novel-fish) (read local novels under the chat without sending them to the model).
