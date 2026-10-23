# 会话中枢 · dsh-session-hub

> 在 DSH Web 窗口上边界中央浮出一枚「会话岛」：正在进行、刚刚完成但还没查看的会话一眼可见；右侧还会带上最近打开的会话。悬停进行中的会话就能预览它的实时输出，点一下就能切过去，不必再打开侧边栏。

![会话中枢的浮岛](docs/island.png)

*左侧是「进行中 / 刚完成」组，右侧是「最近打开」组，中间用竖线分隔。*

## 它解决什么

DSH 里同时开很多会话、又分散在不同工作区时，切换会话通常要展开左侧边栏、找到工作区、再找标题。会话中枢把「需要你注意的会话」直接放到窗口顶部中央：

- **进行中**：任何工作区里正在跑的会话，浮岛用脉冲圆环标记；
- **刚刚完成**：会话在后台跑完、而你没有切过去查看，浮岛用绿色对勾标记，直到你打开它才消失；
- **最近打开**：最多 4 个最近打开过的会话，与上面的活动组用一条竖线隔开，方便快速回到上下文；第一次使用时还没有浏览历史，会用最近活跃的会话补齐；
- 当前正在查看的会话会标为「当前」，不会让你误切；
- 头像背景是每个会话固定色相的**渐变玻璃**：左上柔光高光 + 半透明色带、1px 高光描边、磨砂背景和内阴影；同一个工作区在面板行首的小圆点里使用同一种颜色；
- 悬停头像时，先以彩色徽标显示所在工作区，再显示会话标题与状态；
- **实时内容预览**：悬停进行中的会话，浮层会显示当前活动（思考 / 调用工具 / 输出）和最近约 240 字的输出，并随会话实时刷新；移开即释放，不会为最近 / 已完成会话打开历史；
- 鼠标悬停时浮岛向左、右各展开 6px，并加深边框，方便看清所有头像。

浮岛只在「确实有可切换内容」时出现：没有其他进行中的会话、没有未查看的完成结果、也没有最近打开记录时，它完全隐藏，不占位置、不挡标题。

## 交互

| 操作 | 结果 |
| --- | --- |
| 点击头像 | 立即切换到该会话 |
| 点击左侧层叠图标 / 数字 | 展开或收起会话面板 |
| 点击 `+N` | 展开完整列表（活动组超过 5 个时） |
| 悬停进行中头像 | 显示「工作区徽标 + 标题 + 状态 + 实时内容预览」浮层 |
| 悬停最近 / 已完成头像 | 显示「工作区徽标 + 标题 + 状态」，不加载预览 |
| 悬停浮岛 | 左右宽度各展开 6px |
| `Esc` / 点击面板外 | 收起面板 |

面板按「进行中」「刚刚完成」「最近打开」分组，每行显示标题、工作区（带颜色圆点）、相对时间和「当前」标记。

![悬停提示：工作区在前，颜色区分](docs/tooltip.png)

*悬停进行中头像：工作区在前，下面是实时预览（当前活动 + 最新输出，最多 4 行）。*

![面板特写：进行中与当前标记](docs/panel.png)

![浮岛在窗口中的位置](docs/screenshot.png)

*浮岛始终位于窗口上边界中央；侧边栏收起或展开都不会改变它的位置。*

## 安装

要求：DSH Web profile（`platform: web`），并包含 `shell.overlay` 插槽与 session / workspace 客户端服务。已在 DSH `0.2.0-rc.2` 上验证。

1. 打开 DSH Web GUI → **插件** → **添加插件**。
2. 在输入框填入 GitHub 仓库地址：

   ```
   https://github.com/so2bin/dsh-session-hub
   ```

   开发时也可以直接填本地目录的绝对路径。
3. 安装完成后刷新页面。有可切换内容时，浮岛会自动出现。

> **pnpm workspace 提示**：如果 profile 目录里存在 `pnpm-workspace.yaml`，且把根目录声明为 workspace（`packages: ['.']`），pnpm 会拒绝在 workspace 根安装依赖。在 profile 目录的 `.npmrc` 里加一行 `ignore-workspace-root-check=true` 再重试即可。这是 pnpm 的 workspace 保护，不是插件本身的问题。

## 实现方式

- **纯 Client 插件**：Host 侧 `index.js` 是空 `apply()`，只为让 bundle 进入组合；所有界面都在浏览器里。
- 注册到 `shell.overlay`（全局浮动层，位于侧边栏与主列之上，且默认点击穿透），因此不占布局、不影响任何列的滚动。
- 活动状态只来自三个 slot 标准源，不轮询会话状态：
  - `useSessions`：会话目录、标题、`retainedBy.mainView`（判断当前会话）；
  - `useSessionStatus`：`running` 与 `completionUnread`；
  - `useWorkspaces`：工作区标题与归档集合。
- 「刚刚完成」直接采用 DSH 的 `completionUnread` 语义：会话在非主视图状态下停止运行即为未读；打开会话后由 DSH 自动清除，插件不维护自己的已读状态。
- 「最近打开」由插件在浏览器本地记录：主视图切换时把新会话 id 放到队首，最多保存 12 个、展示 4 个，存储键 `dsh-session-hub:recent`（localStorage，仅保存在本机浏览器）。历史不满 4 个时，用最近活跃的会话补齐。
- 「实时预览」只在进行中会话的 hover 上按需加载：180ms 延迟后借用该会话的 Client binding（当前会话直接借用，其他会话 retain 后 release），订阅事件窗口里的实时 chunk 与 durable `assistant/message`，150ms 节流更新；只扫描最近 20,000 条事件，文本截 240 字并限制 4 行。移开鼠标、打开面板或会话消失时立即释放引用。最近 / 已完成会话不加载预览，避免每次 hover 都打开历史。
- 切换动作调用 `ctx.uiWorkspace.openSession(sessionId)`，与侧边栏点击走同一条导航路径。
- 子智能体会话、空白会话、已归档会话不会出现在任何一组中。
- 悬停提示是自绘浮层，不再使用浏览器原生 `title`，因此可以在标题前放彩色工作区徽标并显示状态。
- 工作区颜色由工作区 id 哈希到 HSL 色相（固定饱和度 / 亮度，保证白字可读）；悬停徽标和面板行首圆点使用同一颜色。
- 悬停动画只改变浮岛左右的 `padding`（6px → 12px），不缩放头像，所以圆形不会变形；`prefers-reduced-motion` 下会关闭过渡。
- 头像不再是单色填充：`radial-gradient` 做左上柔光，`linear-gradient` 做同色相由浅到深的半透明色带，配合 `backdrop-filter: blur(10px) saturate(1.35)`、白色细描边与内阴影，形成磨砂玻璃质感；白色首字母保留 1px 文字阴影，深浅主题下都保持可读。
- 样式只使用 `--dsw-*` 主题变量，浅色 / 深色主题下都会继承对应配色。

## 配置

无需配置。`client.js` 顶部有三个可调常量：

| 常量 | 默认 | 作用 |
| --- | --- | --- |
| `MAX_CHIPS` | 5 | 活动组最多显示几个头像，超出用 `+N` |
| `RECENT_LIMIT` | 4 | 最近打开组最多显示几个 |
| `RECENT_STORE_MAX` | 12 | 本地最多保留几条最近打开历史 |

预览相关常量同样在 `client.js` 顶部：`PREVIEW_DELAY_MS`（180ms）、`PREVIEW_THROTTLE_MS`（150ms）、`PREVIEW_TEXT_LIMIT`（240 字）、`PREVIEW_SCAN_LIMIT`（20,000 条事件）。

## 开发

```bash
npm run check   # 语法、manifest、locale 一致性、翻译 key 覆盖
```

- 无构建步骤：`client.js` 就是浏览器加载的模块。
- 安装到 profile 后，修改 `client.js` 只需刷新 Web 页面。
- 如果从 DSH 源码 checkout 开发客户端插件，`dsh.client.immediately` 与 HMR 接收器可让改动热加载；本仓库按安装后的本地 bundle 方式验证，采用刷新页面。

## 文件

| 文件 | 作用 |
| --- | --- |
| `client.js` | 浮岛组件、样式、locale 文案、slot 注册 |
| `index.js` | Host 侧空插件（bundle 必需） |
| `cordis.patch.yml` | 向 profile 插入 `session-hub` 一行 |
| `locale/en.json`、`locale/zh.json` | 插件管理页的标题与描述 |
| `icon.svg` | 插件管理页图标 |
| `scripts/check.mjs` | 仓库自检脚本 |

## English

`dsh-session-hub` renders a small floating island at the middle of the top edge of the DSH Web UI. It lists sessions that are currently running (pulsing ring) and sessions that finished while you were elsewhere (green check), across all workspaces. A vertical divider separates them from up to four recently opened sessions, so you can switch with one click without opening the sidebar. Hovering a chip shows a colored workspace badge before the session title and status; hovering a running session also streams its latest activity and output into the same card (throttled, released on leave). Hovering the island widens it by 6px on each side. The island hides itself when there is nothing to switch to, and it never occupies layout space.

Install it from **Plugins → Add plugin** with `https://github.com/so2bin/dsh-session-hub` (or a local checkout path), then refresh the page.

## License

MIT
