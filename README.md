# 会话中枢 · dsh-session-hub

> 在 DSH Web 窗口上边界中央浮出一枚「会话岛」：正在进行、刚刚完成但还没查看的会话一眼可见；右侧还会带上最近打开的会话。点一下就能切过去，不必再打开侧边栏。

![会话中枢的浮岛](docs/island.png)

*左侧是「进行中 / 刚完成」组，右侧是「最近打开」组，中间用竖线分隔。*

## 它解决什么

DSH 里同时开很多会话、又分散在不同工作区时，切换会话通常要展开左侧边栏、找到工作区、再找标题。会话中枢把「需要你注意的会话」直接放到窗口顶部中央：

- **进行中**：任何工作区里正在跑的会话，浮岛用脉冲圆环标记；
- **刚刚完成**：会话在后台跑完、而你没有切过去查看，浮岛用绿色对勾标记，直到你打开它才消失；
- **最近打开**：最多 4 个最近打开过的会话，与上面的活动组用一条竖线隔开，方便快速回到上下文；第一次使用时还没有浏览历史，会用最近活跃的会话补齐；
- 当前正在查看的会话会标为「当前」，不会让你误切；
- 鼠标悬停时浮岛向左、右各展开 6px，并加深边框，方便看清所有头像。

浮岛只在「确实有可切换内容」时出现：没有其他进行中的会话、没有未查看的完成结果、也没有最近打开记录时，它完全隐藏，不占位置、不挡标题。

## 交互

| 操作 | 结果 |
| --- | --- |
| 点击头像 | 立即切换到该会话 |
| 点击左侧层叠图标 / 数字 | 展开或收起会话面板 |
| 点击 `+N` | 展开完整列表（活动组超过 5 个时） |
| 鼠标悬停浮岛 | 左右宽度各展开 6px |
| `Esc` / 点击面板外 | 收起面板 |

面板按「进行中」「刚刚完成」「最近打开」分组，每行显示标题、工作区、相对时间和「当前」标记。

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
- 活动状态只来自三个 slot 标准源，不轮询、不自行订阅会话事件：
  - `useSessions`：会话目录、标题、`retainedBy.mainView`（判断当前会话）；
  - `useSessionStatus`：`running` 与 `completionUnread`；
  - `useWorkspaces`：工作区标题与归档集合。
- 「刚刚完成」直接采用 DSH 的 `completionUnread` 语义：会话在非主视图状态下停止运行即为未读；打开会话后由 DSH 自动清除，插件不维护自己的已读状态。
- 「最近打开」由插件在浏览器本地记录：主视图切换时把新会话 id 放到队首，最多保存 12 个、展示 4 个，存储键 `dsh-session-hub:recent`（localStorage，仅保存在本机浏览器）。历史不满 4 个时，用最近活跃的会话补齐。
- 切换动作调用 `ctx.uiWorkspace.openSession(sessionId)`，与侧边栏点击走同一条导航路径。
- 子智能体会话、空白会话、已归档会话不会出现在任何一组中。
- 悬停动画只改变浮岛左右的 `padding`（6px → 12px），不缩放头像，所以圆形不会变形；`prefers-reduced-motion` 下会关闭过渡。
- 样式只使用 `--dsw-*` 主题变量，浅色 / 深色主题下都会继承对应配色。

## 配置

无需配置。`client.js` 顶部有三个可调常量：

| 常量 | 默认 | 作用 |
| --- | --- | --- |
| `MAX_CHIPS` | 5 | 活动组最多显示几个头像，超出用 `+N` |
| `RECENT_LIMIT` | 4 | 最近打开组最多显示几个 |
| `RECENT_STORE_MAX` | 12 | 本地最多保留几条最近打开历史 |

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

`dsh-session-hub` renders a small floating island at the middle of the top edge of the DSH Web UI. It lists sessions that are currently running (pulsing ring) and sessions that finished while you were elsewhere (green check), across all workspaces. A vertical divider separates them from up to four recently opened sessions, so you can switch with one click without opening the sidebar. Hovering the island widens it by 6px on each side. The island hides itself when there is nothing to switch to, and it never occupies layout space.

Install it from **Plugins → Add plugin** with `https://github.com/so2bin/dsh-session-hub` (or a local checkout path), then refresh the page.

## License

MIT
