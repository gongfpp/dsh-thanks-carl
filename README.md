# 谢谢卡尔 · Thanks Carl

DSH **0.2.1-rc.2+** 原生 Web 插件（本地验收在 0.2.2-alpha.2 通过）：在真实的一轮任务结束后，偶尔让卡尔从屏幕边缘探头；也可以提醒你喝水、吃饭和休息。完全本地调度，不发送聊天消息，不调用模型。

![任务完成后卡尔从边缘探头](<docs/screenshots/01-completion.png>)

默认：事件彩蛋模式、15% 出现概率、30 分钟冷却、静音；喝水 60 分钟，吃饭 12:00 / 18:00，00:00–08:00 勿扰。可切换常驻与必出现。

**内置素材：**插件自带卡尔原版梗图照片，包浆低清版与同一照片的清晰版均可直接使用，不需要上传图片。也可选填自己的照片，随时一键恢复卡尔原图。

## 安装

在 DSH 的插件市场里安装，或者直接用 CLI：

```powershell
dsh plugin --profile web add dsh-thanks-carl
```

需要已安装的 DSH 0.2.1-rc.2+、Node.js 22.12+、支持 Web Locks 的现代浏览器。使用 HTTPS 或 localhost；无可用本地存储 / Web Locks 时自动提醒安全停用，仍可手动预览。

从源码安装：

```powershell
npm ci
npm run build
# 明确指定目标 profile；脚本不会停止、重启任何服务
pwsh -File scripts/install.ps1 -Profile web
```

安装脚本仅添加当前插件的本地链接、依赖与 bundle 声明，不运行包管理器重整其他依赖。**需在该 profile 下一次正常启动时激活；单纯刷新当前正在运行的旧服务不等于已安装。**

## 使用

激活后：DSH 侧边栏「插件」→「已安装插件」→ **dsh-thanks-carl** → 插件详情下方的「插件设置」。配置立即保存于当前浏览器，不新增「设置」导航页，也不混入「通用设置」。

![插件设置](<docs/screenshots/02-settings.png>)

1. 安装后直接就能看到卡尔；默认提供原梗包浆图，也可切换同一照片的清晰版。自定义图片为可选项。
2. 点击“召唤卡尔”试用；气泡关闭 / 感谢后离开，拖动照片可以左右停靠。
3. 设置提醒时刻、勿扰、大小和模式。预览明确标记“预览”，忽略勿扰但不会发送聊天。

![喝水提醒](<docs/screenshots/03-water.png>)

默认只对当前 DSH 主视图中的会话显示彩蛋，切会话和刷新不补播。真实 `completed` 仅意味着这一轮结束，不会宣称“代码正确”或“测试通过”；失败、取消、阻塞、截断和恢复中断不祝贺。

## 卸载

```powershell
pwsh -File scripts/uninstall.ps1 -Profile web
```

可重复执行，只移除当前项目的 junction、依赖与 bundle，不递归删除源码。下一次正常启动不再加载。需要立即隐藏时先在卡尔设置中关闭“启用卡尔”；持久化偏好不会自动删除。可在浏览器开发者工具中仅删除当前站点 `thanks-carl.*` 的 localStorage 项。

## 可靠性与限制

- 真实 Host 生命周期：`running → turn/start → turn/end → idle`；跨标签 Web Locks + 持久化 ledger 去重。只监听结构化状态，不读聊天内容。
- 提醒优先于完成和彩蛋，只展示一个；支持关闭、10 分钟后提醒；后台/睡眠不堆积补发。间隔提醒容忍窗口 2 分钟，吃饭 5 分钟；过期丢弃；时区变化与时钟回拨重新计时并保留已消费的时刻 ID。
- 设置按浏览器站点持久化，不跨设备同步。不申请系统通知权限，不承诺浏览器关闭后提醒。跨浏览器 / 不同站点没有共享去重，这是本地存储边界。
- 图片和气泡占小范围边缘区域，不覆盖全屏点击层；支持 reduced-motion。浏览器可能拦截未经用户手势的可选提示音，默认从不播放。
- 不修改 DSH 内核，不替换聊天或输入框；只注册 `shell.overlay` 和 `plugins.bundle.config`。发布包无 runtime npm 依赖。

## 开发与验收

所有测试配置和会话都在本项目 `.runtime` 中，**不复制真实凭据或其他 profile 插件**，测试端口为 3345。以下命令仅启动这个测试实例，不操作正在使用的 3333。

```powershell
npm ci
npm run check
pwsh -File scripts/test-install.ps1
pwsh -File scripts/setup-isolated.ps1
# 保持此命令运行。仅开发测试用夹具，真实 driver 在 pre-step 结束，不进入模型请求。
pwsh -File scripts/run-isolated.ps1 -Fixture 2>&1 | Tee-Object -FilePath .runtime/host.log
# 在另一个终端执行；需要 Edge，或设置 CARL_BROWSER 为 Chromium 绝对路径
npm run verify
# 只会停止已验证属于 carl-test profile 的测试端口进程
pwsh -File scripts/stop-isolated.ps1
```

首次重新生成内置图片需自行取得对应文件并确认有权使用：

```powershell
# 来源、预期 SHA256 和版权边界见 docs/technical-decisions.md。
npm run prepare:personal
```

- [技术/API 与素材查证](<docs/technical-decisions.md>)
- [实际验收记录与截图入口](<docs/verification.md>)
- [本地浏览器自动验收脚本](<scripts/verify-browser.mjs>)
- [任务说明](<IMPLEMENTATION_TASK.md>)

## 许可

代码为 [MIT](<LICENSE>)。内置卡尔梗图照片来自公开流传的 Carl the Hedgehog 梗图（原始照片为 Pixabay 用户 amayaeguizabal 上传，2014），按原样随插件提供，仅用于这个插件的个人、非商业使用；如权利人提出异议会移除。素材出处与核实记录见 [技术决策与素材核实](<docs/technical-decisions.md>)。
