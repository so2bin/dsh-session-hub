/**
 * Session Hub — the Client half.
 *
 * A frame-wide floating island pinned to the middle of the top edge. It is
 * rendered into `shell.overlay` (a list slot that sits above every column and
 * outside their scroll containers) and subscribes to three slot-standard
 * sources only:
 *
 *   - `useSessions`        Session catalog: ids, metadata, main-view ownership
 *   - `useSessionStatus`   Live running / completion-unread facts per Session
 *   - `useWorkspaces`      Workspace titles and the archive set
 *
 * Clicking a chip switches the main view through `ctx.uiWorkspace.openSession`;
 * opening a Session through the main view is also what clears its unread
 * completion flag, so the island has no write path of its own.
 */

window.__ModuleLoader__.load({
  id: 'dsh-session-hub',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

const NS = 'session-hub-island';

const EN = {
  pillLabel: 'Session hub',
  triggerTitle: 'Show sessions in progress',
  triggerTitleOpen: 'Hide session list',
  panelTitle: 'Session hub',
  headingRunningOnly: '{count} running',
  headingDoneOnly: '{count} just finished',
  headingBoth: '{running} running · {done} just finished',
  headingRecentOnly: '{count} recently opened',
  groupRunning: 'In progress',
  groupDone: 'Just finished',
  groupRecent: 'Recently opened',
  current: 'Current',
  ungrouped: 'Ungrouped',
  justNow: 'just now',
  minutesAgo: '{count} min ago',
  hoursAgo: '{count} h ago',
  daysAgo: '{count} d ago',
  openSessionLabel: 'Switch to {title} in {workspace}',
  statusRunning: 'In progress',
  statusDone: 'Finished, not viewed',
  statusRecent: 'Recently opened',
  livePreview: 'Live preview',
  lastPreview: 'Latest output',
  previewLoading: 'Reading latest content…',
  previewEmpty: 'No text output yet',
  previewError: 'Preview unavailable',
  activityThinking: 'Thinking…',
  activityOutput: 'Streaming output…',
  activityTool: 'Calling {name}…',
  activityRunning: 'Working…',
  footHint: 'Click a session to switch · Esc to close',
  moreSessions: '{count} more sessions',
  badgeLabel: '{count} sessions need attention',
};

const ZH = {
  pillLabel: '会话中枢',
  triggerTitle: '展开进行中的会话',
  triggerTitleOpen: '收起会话列表',
  panelTitle: '会话中枢',
  headingRunningOnly: '{count} 个进行中',
  headingDoneOnly: '{count} 个刚完成',
  headingBoth: '{running} 个进行中 · {done} 个刚完成',
  headingRecentOnly: '{count} 个最近打开',
  groupRunning: '进行中',
  groupDone: '刚刚完成',
  groupRecent: '最近打开',
  current: '当前',
  ungrouped: '未分组',
  justNow: '刚刚',
  minutesAgo: '{count} 分钟前',
  hoursAgo: '{count} 小时前',
  daysAgo: '{count} 天前',
  openSessionLabel: '切换到 {workspace} 的会话：{title}',
  statusRunning: '进行中',
  statusDone: '已完成，未查看',
  statusRecent: '最近打开',
  livePreview: '实时预览',
  lastPreview: '最近输出',
  previewLoading: '读取最新内容…',
  previewEmpty: '暂无文本输出',
  previewError: '预览暂不可用',
  activityThinking: '正在思考…',
  activityOutput: '正在输出…',
  activityTool: '正在调用 {name}…',
  activityRunning: '正在运行…',
  footHint: '点击会话直接切换 · Esc 收起',
  moreSessions: '还有 {count} 个会话',
  badgeLabel: '{count} 个会话需要关注',
};

/** Identity tints for session avatars (artwork colors; never used for chrome). */
const TINTS = ['#3b6fd4', '#7a5ad6', '#2a8b8b', '#c2624a', '#2f8b53', '#a5761f', '#b9558a', '#5b6b82'];

/** Sessions outside a registered workspace keep one neutral identity color. */
const UNGROUPED_COLOR = '#5b6b82';

const MAX_CHIPS = 5;

/** Recently opened sessions shown to the right of the active group. */
const RECENT_LIMIT = 4;

/** Persisted identity list; only this browser's session ids are stored. */
const RECENT_STORE_KEY = 'dsh-session-hub:recent';
const RECENT_STORE_MAX = 12;

/** Hover preview timing and content bounds. */
const PREVIEW_DELAY_MS = 180;
const PREVIEW_THROTTLE_MS = 150;
const PREVIEW_SCAN_LIMIT = 20000;
const PREVIEW_LIVE_LIMIT = 320;
const PREVIEW_TEXT_LIMIT = 240;
const PREVIEW_READY_TIMEOUT_MS = 4000;
const PREVIEW_SOURCE = 'sessionHubPreview';

const CSS = `
.dsh-sh-root {
  position: absolute;
  top: var(--dsh-frame-overlay-top, 11px);
  left: 50%;
  z-index: 40;
  color: var(--dsw-alias-label-primary);
  font-family: var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif);
  font-size: 12px;
  line-height: 1.4;
  -webkit-app-region: no-drag;
  animation: dsh-sh-rise 180ms ease-out both;
}

.dsh-sh-pill {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  height: 34px;
  padding: 0 6px;
  border: 1px solid color-mix(in srgb, var(--dsw-alias-border-l1) 72%, transparent);
  border-radius: 999px;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--dsw-specific-menu, var(--dsw-alias-bg-overlay)) 60%, transparent), color-mix(in srgb, var(--dsw-alias-bg-layer-1, var(--dsw-alias-bg-base)) 42%, transparent));
  -webkit-backdrop-filter: blur(20px) saturate(1.2);
  backdrop-filter: blur(20px) saturate(1.2);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.09),
    inset 0 -1px 0 rgb(0 0 0 / 0.18),
    var(--dsw-elevation-prominent, 0 6px 20px rgb(0 0 0 / 22%));
  cursor: pointer;
  user-select: none;
  transition:
    padding 200ms cubic-bezier(0.22, 0.8, 0.28, 1),
    border-color 160ms ease,
    box-shadow 160ms ease;
}
.dsh-sh-pill:hover,
.dsh-sh-pill:focus-within,
.dsh-sh-pill[data-expanded="true"] {
  padding-right: 12px;
  padding-left: 12px;
  border-color: color-mix(in srgb, var(--dsw-alias-label-secondary) 45%, transparent);
}

.dsh-sh-trigger {
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 24px;
  padding: 0 5px;
  margin: 0;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
}
.dsh-sh-trigger:hover {
  background: var(--dsw-alias-interactive-bg-hover, rgb(128 128 128 / 16%));
}
.dsh-sh-trigger:focus-visible {
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-alias-brand-primary);
  outline-offset: 1px;
}
.dsh-sh-glyph {
  display: block;
  width: 16px;
  height: 16px;
  color: var(--dsw-alias-label-secondary);
}
.dsh-sh-pill[data-expanded="true"] .dsh-sh-glyph {
  color: var(--dsw-alias-label-primary);
}
.dsh-sh-count {
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border: 1px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 38%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 16%, transparent);
  color: var(--dsw-alias-brand-primary);
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
}

.dsh-sh-sep {
  flex: none;
  width: 1px;
  height: 14px;
  margin: 0 6px;
  background: var(--dsw-alias-border-l1);
}
.dsh-sh-sep[data-strong="true"] {
  height: 18px;
  margin: 0 8px;
  background: color-mix(in srgb, var(--dsw-alias-label-secondary) 45%, transparent);
}

.dsh-sh-chips {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 0 3px;
}
.dsh-sh-chips[data-group="active"] {
  gap: 8px;
}

.dsh-sh-chip {
  --dsh-sh-chip-glass:
    inset 0 1px 0 rgb(255 255 255 / 0.14),
    inset 0 -1px 1px rgb(0 0 0 / 0.2),
    inset 0 -5px 10px color-mix(in srgb, var(--dsh-sh-tint, #5b6b82) 16%, transparent),
    0 4px 12px color-mix(in srgb, var(--dsh-sh-tint, #5b6b82) 26%, transparent),
    0 0 16px color-mix(in srgb, var(--dsh-sh-tint, #5b6b82) 10%, transparent),
    0 1px 2px rgb(0 0 0 / 0.16);
  position: relative;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 26px;
  height: 26px;
  margin: 0;
  padding: 0;
  border: 1px solid rgb(255 255 255 / 0.12);
  border-radius: 999px;
  background:
    radial-gradient(120% 110% at 30% 12%, rgb(255 255 255 / 0.1) 0%, rgb(255 255 255 / 0) 55%),
    linear-gradient(155deg, color-mix(in srgb, var(--dsh-sh-tint, #5b6b82) 46%, transparent) 0%, color-mix(in srgb, var(--dsh-sh-tint, #5b6b82) 22%, transparent) 100%),
    linear-gradient(180deg, rgb(0 0 0 / 0.05), rgb(0 0 0 / 0.2));
  box-shadow: var(--dsh-sh-chip-glass);
  color: rgb(255 255 255 / 0.92);
  font-family: inherit;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.2px;
  text-shadow: 0 1px 2px rgb(0 0 0 / 0.55);
  -webkit-backdrop-filter: blur(14px) saturate(1.1);
  backdrop-filter: blur(14px) saturate(1.1);
  cursor: pointer;
  transition:
    width 220ms cubic-bezier(0.22, 0.8, 0.28, 1),
    filter 140ms ease;
}
.dsh-sh-pill .dsh-sh-chip {
  transition:
    width 220ms cubic-bezier(0.22, 0.8, 0.28, 1),
    filter 140ms ease;
}
.dsh-sh-chip::before {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(115deg, transparent 24%, rgb(255 255 255 / 0.16) 48%, transparent 72%);
  background-position: 120% 0;
  background-size: 220% 100%;
  content: "";
  opacity: 0;
  pointer-events: none;
}
.dsh-sh-chip:hover {
  width: 52px;
  filter: brightness(1.04) saturate(1.02);
}
.dsh-sh-chip:hover::before,
.dsh-sh-row:hover .dsh-sh-chip::before {
  opacity: 1;
  animation: dsh-sh-sheen 900ms ease;
}
.dsh-sh-chip:focus-visible {
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-alias-brand-primary);
  outline-offset: 2px;
}
.dsh-sh-chip[data-current="true"] {
  box-shadow:
    inset 0 0 0 1.5px color-mix(in srgb, var(--dsw-alias-label-primary) 78%, transparent),
    0 0 10px rgb(255 255 255 / 0.05),
    var(--dsh-sh-chip-glass);
}
.dsh-sh-chip[data-running="true"]::after {
  position: absolute;
  inset: -2px;
  border: 1.5px solid var(--dsw-alias-brand-primary);
  border-radius: inherit;
  box-shadow: 0 0 8px color-mix(in srgb, var(--dsw-alias-brand-primary) 60%, transparent);
  content: "";
  pointer-events: none;
  animation: dsh-sh-pulse 1.8s ease-in-out infinite;
}
body:not([data-ds-dark-theme]) .dsh-sh-chip {
  background:
    radial-gradient(120% 110% at 30% 12%, rgb(255 255 255 / 0.16) 0%, rgb(255 255 255 / 0) 55%),
    linear-gradient(155deg, color-mix(in srgb, var(--dsh-sh-tint, #5b6b82) 58%, transparent) 0%, color-mix(in srgb, var(--dsh-sh-tint, #5b6b82) 34%, transparent) 100%),
    linear-gradient(180deg, rgb(0 0 0 / 0.03), rgb(0 0 0 / 0.2));
  text-shadow: 0 1px 2px rgb(0 0 0 / 0.5);
}
.dsh-sh-chip[data-static="true"] {
  cursor: default;
}
.dsh-sh-chip[data-static="true"]:hover {
  width: 26px;
  filter: none;
}

.dsh-sh-badge {
  position: absolute;
  right: -3px;
  bottom: -3px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--dsw-alias-state-success-primary);
  color: #fff;
  box-shadow: 0 0 0 1.5px var(--dsw-alias-bg-layer-1, var(--dsw-specific-menu, var(--dsw-alias-bg-overlay)));
}
.dsh-sh-badge svg {
  display: block;
  width: 8px;
  height: 8px;
}

.dsh-sh-more {
  box-sizing: border-box;
  flex: none;
  height: 26px;
  min-width: 26px;
  padding: 0 6px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 999px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font-family: inherit;
  font-size: 10px;
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
}
.dsh-sh-more:hover {
  border-color: var(--dsw-alias-border-l2);
  color: var(--dsw-alias-label-primary);
}
.dsh-sh-more:focus-visible {
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-alias-brand-primary);
  outline-offset: 2px;
}

.dsh-sh-panel {
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  z-index: 2;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: min(372px, calc(100vw - 28px));
  max-height: min(62vh, 480px);
  overflow: hidden;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 14px;
  background:
    linear-gradient(0deg, var(--dsw-specific-menu, var(--dsw-alias-bg-overlay)), var(--dsw-specific-menu, var(--dsw-alias-bg-overlay))),
    var(--dsw-alias-bg-layer-1, var(--dsw-alias-bg-base));
  box-shadow: var(--dsw-elevation-prominent, 0 16px 40px rgb(0 0 0 / 28%));
  cursor: default;
  transform: translateX(-50%);
  transform-origin: top center;
  animation: dsh-sh-open 140ms ease-out both;
}

.dsh-sh-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  flex: none;
  padding: 12px 14px 8px;
}
.dsh-sh-headTitle {
  font-size: 13px;
  font-weight: 600;
  line-height: 18px;
}
.dsh-sh-headMeta {
  color: var(--dsw-alias-label-secondary);
  font-size: 11px;
  line-height: 16px;
  white-space: nowrap;
}

.dsh-sh-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 0 6px 6px;
  scrollbar-width: thin;
  scrollbar-color: var(--dsw-alias-border-l2) transparent;
}

.dsh-sh-group + .dsh-sh-group {
  margin-top: 2px;
}
.dsh-sh-groupLabel {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 8px 3px;
  color: var(--dsw-alias-label-secondary);
  font-size: 11px;
  font-weight: 500;
  line-height: 15px;
}
.dsh-sh-groupDot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--dsw-alias-brand-primary);
}
.dsh-sh-groupDot[data-kind="done"] {
  background: var(--dsw-alias-state-success-primary);
}
.dsh-sh-groupDot[data-kind="recent"] {
  background: var(--dsw-alias-state-idle-primary);
}

.dsh-sh-row {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 7px 8px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.dsh-sh-row:hover,
.dsh-sh-row:focus-visible {
  background: var(--dsw-alias-interactive-bg-hover, rgb(128 128 128 / 14%));
  outline: none;
}
.dsh-sh-rowBody {
  display: flex;
  flex-direction: column;
  gap: 1px;
  flex: 1;
  min-width: 0;
}
.dsh-sh-rowTitle {
  overflow: hidden;
  font-size: 12.5px;
  font-weight: 500;
  line-height: 17px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dsh-sh-rowMeta {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  color: var(--dsw-alias-label-secondary);
  font-size: 11px;
  line-height: 15px;
}
.dsh-sh-wsDot {
  flex: none;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--dsh-sh-ws-tint, var(--dsw-alias-label-secondary));
}
.dsh-sh-ws {
  overflow: hidden;
  max-width: 46%;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dsh-sh-rowTag {
  flex: none;
  padding: 1px 6px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 15%, transparent);
  color: var(--dsw-alias-brand-primary);
  font-size: 10px;
  font-weight: 600;
  line-height: 14px;
}
.dsh-sh-rowGo {
  display: inline-flex;
  flex: none;
  color: var(--dsw-alias-label-secondary);
  opacity: 0;
  transition: opacity 120ms ease;
}
.dsh-sh-row:hover .dsh-sh-rowGo,
.dsh-sh-row:focus-visible .dsh-sh-rowGo {
  opacity: 1;
}

.dsh-sh-tip[data-preview="true"] {
  width: 340px;
}
.dsh-sh-tip {
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  z-index: 3;
  box-sizing: border-box;
  width: max-content;
  max-width: min(360px, calc(100vw - 32px));
  padding: 7px 10px 8px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 11px;
  background:
    linear-gradient(0deg, var(--dsw-specific-menu, var(--dsw-alias-bg-overlay)), var(--dsw-specific-menu, var(--dsw-alias-bg-overlay))),
    var(--dsw-alias-bg-layer-1, var(--dsw-alias-bg-base));
  box-shadow: var(--dsw-elevation-prominent, 0 10px 28px rgb(0 0 0 / 24%));
  pointer-events: none;
  transform: translateX(-50%);
  animation: dsh-sh-tip-in 120ms ease-out both;
}
.dsh-sh-tipHead {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 3px;
}
.dsh-sh-wsBadge {
  display: inline-block;
  max-width: 200px;
  padding: 1px 7px;
  border-radius: 999px;
  background: var(--dsh-sh-ws-tint, var(--dsw-alias-bg-overlay));
  color: #fff;
  font-size: 10.5px;
  font-weight: 600;
  line-height: 15px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: middle;
}
.dsh-sh-tipStatus {
  flex: none;
  color: var(--dsw-alias-label-secondary);
  font-size: 10.5px;
  line-height: 15px;
}
.dsh-sh-tipTitle {
  max-width: 340px;
  color: var(--dsw-alias-label-primary);
  font-size: 12.5px;
  font-weight: 500;
  line-height: 17px;
  overflow-wrap: anywhere;
}
.dsh-sh-preview {
  margin-top: 7px;
  padding-top: 7px;
  border-top: 0.5px solid var(--dsw-alias-border-l1);
}
.dsh-sh-previewHead {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}
.dsh-sh-liveDot {
  flex: none;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--dsw-alias-state-idle-primary);
}
.dsh-sh-liveDot[data-live="true"] {
  background: var(--dsw-alias-state-success-primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--dsw-alias-state-success-primary) 22%, transparent);
  animation: dsh-sh-live-pulse 1.6s ease-in-out infinite;
}
.dsh-sh-previewLabel {
  color: var(--dsw-alias-label-secondary);
  font-size: 10.5px;
  font-weight: 600;
  line-height: 15px;
}
.dsh-sh-previewActivity {
  margin-left: auto;
  max-width: 180px;
  overflow: hidden;
  color: var(--dsw-alias-label-secondary);
  font-size: 10.5px;
  line-height: 15px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dsh-sh-previewText {
  display: -webkit-box;
  overflow: hidden;
  color: var(--dsw-alias-label-secondary);
  font-size: 11.5px;
  line-height: 17px;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
}
.dsh-sh-previewText[data-muted="true"] {
  opacity: 0.8;
}

.dsh-sh-foot {
  flex: none;
  padding: 7px 14px 9px;
  border-top: 0.5px solid var(--dsw-alias-border-l1);
  color: var(--dsw-alias-label-secondary);
  font-size: 11px;
  line-height: 15px;
}

@keyframes dsh-sh-pulse {
  0%, 100% {
    opacity: 0.72;
    transform: scale(1);
  }
  50% {
    opacity: 0.4;
    transform: scale(1.12);
  }
}
@keyframes dsh-sh-rise {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}
@keyframes dsh-sh-sheen {
  from {
    background-position: 120% 0;
  }
  to {
    background-position: -20% 0;
  }
}
@keyframes dsh-sh-live-pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.4;
    transform: scale(0.8);
  }
}
@keyframes dsh-sh-tip-in {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-3px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}
@keyframes dsh-sh-open {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-4px) scale(0.985);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1);
  }
}
@media (prefers-reduced-motion: reduce) {
  .dsh-sh-root,
  .dsh-sh-panel,
  .dsh-sh-tip,
  .dsh-sh-liveDot[data-live="true"],
  .dsh-sh-chip::before,
  .dsh-sh-chip[data-running="true"]::after {
    animation: none;
  }
  .dsh-sh-chip:hover {
    width: 26px;
    filter: none;
  }
  .dsh-sh-pill,
  .dsh-sh-chip,
  .dsh-sh-rowGo {
    transition: none;
  }
}
`;

const CHECK_PATH = 'M1.4 4.1 3.2 5.9 6.6 2.1';
const CHEVRON_PATH = 'm6.2 3.6 4.4 4.4-4.4 4.4';

function hubGlyph(h) {
  return h(
    'svg',
    { className: 'dsh-sh-glyph', viewBox: '0 0 16 16', width: 16, height: 16, 'aria-hidden': true, focusable: 'false' },
    h('path', { d: 'M8 2.1 2.4 5.1 8 8.1l5.6-3L8 2.1Z', fill: 'currentColor', opacity: 0.92 }),
    h('path', {
      d: 'm2.4 8 5.6 3 5.6-3',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 1.4,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      opacity: 0.62,
    }),
    h('path', {
      d: 'm2.4 10.9 5.6 3 5.6-3',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 1.4,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      opacity: 0.34,
    }),
  );
}

function checkBadge(h) {
  return h(
    'span',
    { className: 'dsh-sh-badge', 'aria-hidden': true },
    h(
      'svg',
      { viewBox: '0 0 8 8', width: 8, height: 8 },
      h('path', {
        d: CHECK_PATH,
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.5,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      }),
    ),
  );
}

function chevron(h) {
  return h(
    'svg',
    { viewBox: '0 0 16 16', width: 14, height: 14, 'aria-hidden': true, focusable: 'false' },
    h('path', {
      d: CHEVRON_PATH,
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 1.5,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    }),
  );
}

function hashValue(seed) {
  const text = String(seed);
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  return hash;
}

function hashTint(seed) {
  return TINTS[hashValue(seed) % TINTS.length];
}

/**
 * Workspace identity color. A golden-angle hue keeps neighbouring workspace
 * ids far apart, and the fixed saturation/lightness keeps white badge text
 * readable in both themes.
 */
function workspaceColor(workspaceId) {
  if (typeof workspaceId !== 'string' || workspaceId === '') return UNGROUPED_COLOR;
  const hue = Math.round((hashValue(workspaceId) * 137.508) % 360);
  return `hsl(${hue}, 46%, 40%)`;
}

function initialsOf(text) {
  const trimmed = String(text || '').trim();
  if (trimmed === '') return '·';
  return Array.from(trimmed).slice(0, 2).join('').toUpperCase();
}

function relativeLabel(t, timestamp, now) {
  if (!Number.isFinite(timestamp)) return '';
  const minutes = Math.max(0, Math.floor((now - timestamp) / 60000));
  if (minutes < 1) return t('justNow');
  if (minutes < 60) return t('minutesAgo', { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('hoursAgo', { count: hours });
  return t('daysAgo', { count: Math.floor(hours / 24) });
}

function pickChips(running, done) {
  const limit = MAX_CHIPS;
  if (done.length === 0) return running.slice(0, limit);
  if (running.length === 0) return done.slice(0, limit);
  const reserveDone = Math.min(done.length, Math.max(1, limit - running.length));
  const runningQuota = Math.max(1, limit - reserveDone);
  return [...running.slice(0, runningQuota), ...done.slice(0, limit - Math.min(runningQuota, running.length))];
}

function readRecentIds() {
  try {
    const raw = window.localStorage.getItem(RECENT_STORE_KEY);
    if (raw === null) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id) => typeof id === 'string' && id.length > 0).slice(0, RECENT_STORE_MAX);
  } catch {
    return [];
  }
}

function writeRecentIds(ids) {
  try {
    window.localStorage.setItem(RECENT_STORE_KEY, JSON.stringify(ids.slice(0, RECENT_STORE_MAX)));
  } catch {
    /* storage can be unavailable (private mode, quota); the in-memory list still works */
  }
}

function assistantText(content) {
  if (!Array.isArray(content)) return '';
  let text = '';
  for (const block of content) {
    if (block && block.type === 'text' && typeof block.text === 'string') text += block.text;
  }
  return text;
}

function tidyPreviewText(text) {
  if (typeof text !== 'string' || text === '') return '';
  return text
    .replace(/```[\s\S]*?```/g, ' … ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' … ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/`{1,3}/g, '')
    .replace(/\*\*/g, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, PREVIEW_TEXT_LIMIT);
}

/**
 * Read the newest live or committed assistant text plus the current activity
 * from a Session event window. Scans only the tail and stops once it has both
 * a status and some text, so a long session does not cost a full replay.
 */
function extractPreview(entries, running) {
  let activityKey = '';
  let activityName = '';
  let liveText = '';
  let liveAttempt = '';
  let durableText = '';
  let durableTool = '';
  const limit = Math.min(entries.length, PREVIEW_SCAN_LIMIT);
  for (let offset = 0; offset < limit; offset += 1) {
    const event = entries[entries.length - 1 - offset]?.event;
    if (!event) continue;
    if (event.type === 'assistant/live-chunk') {
      const chunk = event.data.chunk;
      const attempt = String(event.data.attemptId ?? '');
      if (running && activityKey === '') {
        if (chunk.type === 'tool-call-delta' && chunk.name) {
          activityKey = 'activityTool';
          activityName = chunk.name;
        } else if (chunk.type === 'reasoning-delta') {
          activityKey = 'activityThinking';
        } else if (chunk.type === 'text-delta') {
          activityKey = 'activityOutput';
        }
      }
      if (chunk.type === 'text-delta' && typeof chunk.text === 'string') {
        if (liveAttempt === '') liveAttempt = attempt;
        if (attempt === liveAttempt) liveText = (chunk.text + liveText).slice(-PREVIEW_LIVE_LIMIT);
      }
    } else if (event.type === 'assistant/message') {
      if (durableText === '') durableText = assistantText(event.data.message.content);
    } else if (event.type === 'tool/call') {
      if (durableTool === '') durableTool = event.data.name || '';
    }
    if (activityKey !== '' && (liveText !== '' || durableText !== '')) break;
  }
  if (activityKey === '') {
    if (running && durableTool !== '') {
      activityKey = 'activityTool';
      activityName = durableTool;
    } else if (running) {
      activityKey = 'activityRunning';
    }
  }
  const rawText = liveText !== '' ? liveText.slice(-PREVIEW_TEXT_LIMIT) : durableText;
  return { activityKey, activityName, text: tidyPreviewText(rawText), live: liveText !== '' };
}

function SessionHub(props) {
  const { useSessions, useSessionStatus, useWorkspaces, t, openSession, sessions } = props;
  const translate = typeof t === 'function' ? t : (key) => key;

  const ids = useSessions((state) => state.ids);
  const byId = useSessions((state) => state.byId);
  const statuses = useSessionStatus((snapshot) => snapshot);
  const workspaceItems = useWorkspaces((snapshot) => snapshot.items);
  const archivedIds = useWorkspaces((snapshot) => snapshot.archivedSessionIds);

  const [expanded, setExpanded] = React.useState(false);
  const [recentIds, setRecentIds] = React.useState(readRecentIds);
  const [hoveredId, setHoveredId] = React.useState(null);
  const [preview, setPreview] = React.useState(null);
  const [now, setNow] = React.useState(() => Date.now());
  const rootRef = React.useRef(null);
  const triggerRef = React.useRef(null);
  const hideTimer = React.useRef(null);
  const panelId = React.useId();

  const workspaceBySession = React.useMemo(() => {
    const map = new Map();
    for (const workspace of workspaceItems ?? []) {
      const value = { title: workspace.title, color: workspaceColor(workspace.workspaceId) };
      for (const sessionId of workspace.sessionIds ?? []) map.set(sessionId, value);
    }
    return map;
  }, [workspaceItems]);

  const archived = React.useMemo(() => new Set(archivedIds ?? []), [archivedIds]);

  const fallbackRecentIds = React.useMemo(() => {
    const rows = [];
    for (const id of ids ?? []) {
      const row = byId[id];
      if (row) rows.push(row);
    }
    rows.sort((left, right) => (right.updatedAt ?? 0) - (left.updatedAt ?? 0));
    return rows.map((row) => row.id);
  }, [ids, byId]);

  let currentId;
  for (const id of ids ?? []) {
    const row = byId[id];
    if (row && (row.retainedBy?.mainView ?? 0) > 0) {
      currentId = id;
      break;
    }
  }

  const running = [];
  const done = [];
  for (const id of ids ?? []) {
    const row = byId[id];
    if (!row || row.blank || row.origin === 'subagent' || archived.has(id)) continue;
    const status = statuses.get(id);
    const isRunning = status && status.running !== undefined ? status.running : row.running;
    if (isRunning) running.push({ id, row, kind: 'running', isCurrent: id === currentId });
    else if (status?.completionUnread === true && id !== currentId) done.push({ id, row, kind: 'done', isCurrent: false });
  }
  running.sort((left, right) => Number(right.isCurrent) - Number(left.isCurrent) || right.row.updatedAt - left.row.updatedAt);
  done.sort((left, right) => right.row.updatedAt - left.row.updatedAt);

  const activeIds = new Set();
  for (const item of running) activeIds.add(item.id);
  for (const item of done) activeIds.add(item.id);

  const recent = [];
  const addRecent = (id) => {
    if (recent.length >= RECENT_LIMIT) return;
    if (id === currentId || activeIds.has(id) || archived.has(id)) return;
    if (recent.some((item) => item.id === id)) return;
    const row = byId[id];
    if (!row || row.blank || row.origin === 'subagent') return;
    recent.push({ id, row, kind: 'recent', isCurrent: false });
  };
  for (const id of recentIds) addRecent(id);
  if (recent.length < RECENT_LIMIT) {
    for (const id of fallbackRecentIds) addRecent(id);
  }

  const switchable = running.filter((item) => !item.isCurrent).length + done.length;
  const visible = switchable > 0 || recent.length > 0;
  const total = running.length + done.length;
  const chips = pickChips(running, done);
  const overflow = total - chips.length;
  const hoveredItem = hoveredId === null ? undefined : [...running, ...done, ...recent].find((item) => item.id === hoveredId);

  React.useEffect(() => {
    if (typeof currentId !== 'string') return;
    setRecentIds((previous) => {
      if (previous[0] === currentId) return previous;
      return [currentId, ...previous.filter((id) => id !== currentId)].slice(0, RECENT_STORE_MAX);
    });
  }, [currentId]);

  React.useEffect(() => {
    writeRecentIds(recentIds);
  }, [recentIds]);

  React.useEffect(() => {
    if (!expanded && visible) return;
    if (hideTimer.current !== null) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    setHoveredId(null);
  }, [expanded, visible]);

  React.useEffect(() => {
    if (hoveredId !== null && hoveredItem === undefined) setHoveredId(null);
  }, [hoveredId, hoveredItem]);

  React.useEffect(() => {
    if (!hoveredId || expanded || !visible || !sessions || typeof sessions.retain !== 'function') {
      setPreview(null);
      return undefined;
    }
    const item = [...running, ...done, ...recent].find((candidate) => candidate.id === hoveredId);
    if (!item || item.kind !== 'running') {
      setPreview(null);
      return undefined;
    }
    const targetId = hoveredId;
    setPreview({ id: targetId, loading: true, text: '', activityKey: '', activityName: '', live: false });
    let cancelled = false;
    let reference = null;
    let retained = false;
    let unsubscribe = null;
    let ready = false;
    let throttleTimer = null;
    let readyTimer = null;
    let lastCompute = 0;
    let lastSignature = '';

    const read = () => {
      if (cancelled || !ready || reference === null) return;
      try {
        const binding = reference.binding;
        const window = binding.eventSource.getSnapshot();
        const runningNow = binding.session.getSnapshot().running;
        const extracted = extractPreview(window.entries, runningNow);
        const signature = `${extracted.activityKey}|${extracted.activityName}|${extracted.text}|${extracted.live}`;
        if (signature === lastSignature) return;
        lastSignature = signature;
        setPreview({ id: targetId, loading: false, ...extracted });
      } catch {
        if (!cancelled) {
          setPreview({ id: targetId, loading: false, error: true, text: '', activityKey: '', activityName: '', live: false });
        }
      }
    };

    const schedule = () => {
      if (cancelled || !ready) return;
      const now = Date.now();
      const wait = Math.max(0, PREVIEW_THROTTLE_MS - (now - lastCompute));
      if (wait === 0) {
        lastCompute = now;
        read();
        return;
      }
      if (throttleTimer !== null) return;
      throttleTimer = setTimeout(() => {
        throttleTimer = null;
        lastCompute = Date.now();
        read();
      }, wait);
    };

    const markReady = () => {
      if (cancelled || ready) return;
      ready = true;
      if (readyTimer !== null) {
        clearTimeout(readyTimer);
        readyTimer = null;
      }
      lastCompute = 0;
      read();
    };

    const startTimer = setTimeout(() => {
      if (cancelled) return;
      try {
        const existing = sessions.binding(targetId);
        if (existing) {
          reference = { binding: existing };
          markReady();
        } else {
          reference = sessions.retain(targetId, { source: PREVIEW_SOURCE });
          retained = true;
          readyTimer = setTimeout(markReady, PREVIEW_READY_TIMEOUT_MS);
          Promise.resolve(reference.ready).then(markReady).catch(() => {
            if (cancelled) return;
            ready = true;
            setPreview({ id: targetId, loading: false, error: true, text: '', activityKey: '', activityName: '', live: false });
          });
        }
        unsubscribe = reference.binding.eventSource.subscribe(schedule);
      } catch {
        if (!cancelled) {
          setPreview({ id: targetId, loading: false, error: true, text: '', activityKey: '', activityName: '', live: false });
        }
      }
    }, PREVIEW_DELAY_MS);

    return () => {
      cancelled = true;
      clearTimeout(startTimer);
      if (throttleTimer !== null) clearTimeout(throttleTimer);
      if (readyTimer !== null) clearTimeout(readyTimer);
      if (typeof unsubscribe === 'function') unsubscribe();
      if (retained && reference && typeof reference.release === 'function') {
        try {
          reference.release();
        } catch {
          /* the generation may already be gone */
        }
      }
    };
  }, [hoveredId, expanded, visible, sessions]);

  React.useEffect(() => () => {
    if (hideTimer.current !== null) clearTimeout(hideTimer.current);
  }, []);

  React.useEffect(() => {
    if (!visible) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, [visible]);

  React.useEffect(() => {
    if (!visible && expanded) setExpanded(false);
  }, [visible, expanded]);

  React.useEffect(() => {
    if (!expanded) return undefined;
    const onPointerDown = (event) => {
      const root = rootRef.current;
      if (root && !root.contains(event.target)) setExpanded(false);
    };
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      setExpanded(false);
      triggerRef.current?.focus();
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [expanded]);

  if (!visible) return null;

  const titleOf = (item) => item.row.title || item.row.displayTitle || item.id;
  const workspaceOf = (item) => workspaceBySession.get(item.id) || { title: translate('ungrouped'), color: UNGROUPED_COLOR };
  const showTooltip = (item) => {
    if (hideTimer.current !== null) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    setHoveredId(item.id);
  };
  const hideTooltip = (item) => {
    if (hideTimer.current !== null) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      hideTimer.current = null;
      setHoveredId((current) => (current === item.id ? null : current));
    }, 80);
  };
  const select = (sessionId) => {
    setExpanded(false);
    if (hideTimer.current !== null) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    setHoveredId(null);
    openSession(sessionId);
  };

  const chipNode = (item) => {
    const title = titleOf(item);
    const workspace = workspaceOf(item);
    return h(
      'button',
      {
        key: `chip-${item.id}`,
        type: 'button',
        className: 'dsh-sh-chip',
        style: { '--dsh-sh-tint': hashTint(item.id) },
        'data-kind': item.kind,
        'data-running': item.kind === 'running' ? 'true' : undefined,
        'data-current': item.isCurrent ? 'true' : undefined,
        'aria-label': translate('openSessionLabel', { title, workspace: workspace.title }),
        onMouseEnter: () => showTooltip(item),
        onMouseLeave: () => hideTooltip(item),
        onClick: (event) => {
          event.stopPropagation();
          select(item.id);
        },
      },
      initialsOf(title),
      item.kind === 'done' ? checkBadge(h) : null,
    );
  };

  const rowNode = (item) => {
    const title = titleOf(item);
    const workspace = workspaceOf(item);
    const avatar = h(
      'span',
      {
        key: `row-avatar-${item.id}`,
        className: 'dsh-sh-chip',
        style: { '--dsh-sh-tint': hashTint(item.id) },
        'data-kind': item.kind,
        'data-running': item.kind === 'running' ? 'true' : undefined,
        'data-current': item.isCurrent ? 'true' : undefined,
        'data-static': 'true',
        'aria-hidden': true,
      },
      initialsOf(title),
      item.kind === 'done' ? checkBadge(h) : null,
    );
    return h(
      'button',
      {
        key: `row-${item.id}`,
        type: 'button',
        className: 'dsh-sh-row',
        'data-current': item.isCurrent ? 'true' : undefined,
        onClick: () => select(item.id),
      },
      avatar,
      h(
        'span',
        { className: 'dsh-sh-rowBody' },
        h('span', { className: 'dsh-sh-rowTitle' }, title),
        h(
          'span',
          { className: 'dsh-sh-rowMeta' },
          h('span', { className: 'dsh-sh-wsDot', style: { '--dsh-sh-ws-tint': workspace.color }, 'aria-hidden': true }),
          h('span', { className: 'dsh-sh-ws' }, workspace.title),
          h('span', { 'aria-hidden': true }, '·'),
          h('span', null, relativeLabel(translate, item.row.updatedAt, now)),
        ),
      ),
      item.isCurrent
        ? h('span', { className: 'dsh-sh-rowTag' }, translate('current'))
        : h('span', { className: 'dsh-sh-rowGo', 'aria-hidden': true }, chevron(h)),
    );
  };

  const heading =
    running.length > 0 && done.length > 0
      ? translate('headingBoth', { running: running.length, done: done.length })
      : running.length > 0
        ? translate('headingRunningOnly', { count: running.length })
        : done.length > 0
          ? translate('headingDoneOnly', { count: done.length })
          : translate('headingRecentOnly', { count: recent.length });

  const hoveredWorkspace = hoveredItem ? workspaceOf(hoveredItem) : undefined;
  const hoveredStatusKey = hoveredItem
    ? hoveredItem.kind === 'recent'
      ? 'statusRecent'
      : hoveredItem.kind === 'done'
        ? 'statusDone'
        : 'statusRunning'
    : undefined;
  const previewState = hoveredItem
    ? hoveredItem.kind === 'running'
      ? preview && preview.id === hoveredItem.id
        ? preview
        : { id: hoveredItem.id, loading: true, text: '', activityKey: '', activityName: '', live: false }
      : preview && preview.id === hoveredItem.id
        ? preview
        : null
    : null;
  const previewActivity =
    previewState && previewState.activityKey === 'activityThinking'
      ? translate('activityThinking')
      : previewState && previewState.activityKey === 'activityOutput'
        ? translate('activityOutput')
        : previewState && previewState.activityKey === 'activityTool'
          ? translate('activityTool', { name: previewState.activityName })
          : previewState && previewState.activityKey === 'activityRunning'
            ? translate('activityRunning')
            : '';
  const previewBody = previewState
    ? previewState.loading
      ? translate('previewLoading')
      : previewState.error
        ? translate('previewError')
        : previewState.text
          ? previewState.text
          : translate('previewEmpty')
    : '';
  const previewMuted = previewState ? previewState.loading === true || previewState.error === true || !previewState.text : true;

  const tooltip = !expanded && hoveredItem !== undefined && hoveredWorkspace !== undefined
    ? h(
        'div',
        {
          className: 'dsh-sh-tip',
          'data-preview': previewState !== null ? 'true' : undefined,
          'aria-hidden': 'true',
        },
        h(
          'div',
          { className: 'dsh-sh-tipHead' },
          h('span', { className: 'dsh-sh-wsBadge', style: { '--dsh-sh-ws-tint': hoveredWorkspace.color } }, hoveredWorkspace.title),
          h(
            'span',
            { className: 'dsh-sh-tipStatus' },
            hoveredItem.isCurrent ? `${translate('current')} · ${translate(hoveredStatusKey)}` : translate(hoveredStatusKey),
          ),
        ),
        h('div', { className: 'dsh-sh-tipTitle' }, titleOf(hoveredItem)),
        previewState !== null
          ? h(
              'div',
              { className: 'dsh-sh-preview' },
              h(
                'div',
                { className: 'dsh-sh-previewHead' },
                h('span', {
                  className: 'dsh-sh-liveDot',
                  'data-live': hoveredItem.kind === 'running' ? 'true' : undefined,
                  'aria-hidden': true,
                }),
                h(
                  'span',
                  { className: 'dsh-sh-previewLabel' },
                  translate(hoveredItem.kind === 'running' ? 'livePreview' : 'lastPreview'),
                ),
                previewActivity !== '' ? h('span', { className: 'dsh-sh-previewActivity' }, previewActivity) : null,
              ),
              h(
                'div',
                { className: 'dsh-sh-previewText', 'data-muted': previewMuted ? 'true' : undefined },
                previewBody,
              ),
            )
          : null,
      )
    : null;

  const panel = expanded
    ? h(
        'div',
        {
          id: panelId,
          className: 'dsh-sh-panel',
          role: 'dialog',
          'aria-label': translate('panelTitle'),
          onClick: (event) => event.stopPropagation(),
        },
        h(
          'div',
          { className: 'dsh-sh-head' },
          h('span', { className: 'dsh-sh-headTitle' }, translate('panelTitle')),
          h('span', { className: 'dsh-sh-headMeta' }, heading),
        ),
        h(
          'div',
          { className: 'dsh-sh-scroll' },
          running.length > 0
            ? h(
                'div',
                { className: 'dsh-sh-group' },
                h(
                  'div',
                  { className: 'dsh-sh-groupLabel' },
                  h('span', { className: 'dsh-sh-groupDot', 'aria-hidden': true }),
                  translate('groupRunning'),
                ),
                running.map(rowNode),
              )
            : null,
          done.length > 0
            ? h(
                'div',
                { className: 'dsh-sh-group' },
                h(
                  'div',
                  { className: 'dsh-sh-groupLabel' },
                  h('span', { className: 'dsh-sh-groupDot', 'data-kind': 'done', 'aria-hidden': true }),
                  translate('groupDone'),
                ),
                done.map(rowNode),
              )
            : null,
          recent.length > 0
            ? h(
                'div',
                { className: 'dsh-sh-group', 'data-group': 'recent' },
                h(
                  'div',
                  { className: 'dsh-sh-groupLabel' },
                  h('span', { className: 'dsh-sh-groupDot', 'data-kind': 'recent', 'aria-hidden': true }),
                  translate('groupRecent'),
                ),
                recent.map(rowNode),
              )
            : null,
        ),
        h('div', { className: 'dsh-sh-foot' }, translate('footHint')),
      )
    : null;

  return h(
    React.Fragment,
    null,
    h('style', { dangerouslySetInnerHTML: { __html: CSS } }),
    h(
      'div',
      {
        ref: rootRef,
        className: 'dsh-sh-root',
        'data-dsh-session-hub': 'true',
        'data-count': String(total),
        'data-running': String(running.length),
        'data-done': String(done.length),
        'data-recent': String(recent.length),
        'data-expanded': expanded ? 'true' : 'false',
      },
      h(
        'div',
        {
          className: 'dsh-sh-pill',
          role: 'group',
          'aria-label': translate('pillLabel'),
          'data-expanded': expanded ? 'true' : 'false',
          onClick: () => setExpanded((value) => !value),
        },
        h(
          'button',
          {
            ref: triggerRef,
            type: 'button',
            className: 'dsh-sh-trigger',
            'aria-expanded': expanded,
            'aria-controls': expanded ? panelId : undefined,
            'aria-label': total > 0 ? translate('badgeLabel', { count: total }) : translate('triggerTitle'),
            title: expanded ? translate('triggerTitleOpen') : translate('triggerTitle'),
          },
          hubGlyph(h),
          total > 0
            ? h('span', { className: 'dsh-sh-count', 'aria-hidden': true }, total > 9 ? '9+' : String(total))
            : null,
        ),
        chips.length > 0 || overflow > 0
          ? h('span', { className: 'dsh-sh-sep', 'aria-hidden': true })
          : null,
        chips.length > 0 || overflow > 0
          ? h(
              'div',
              { className: 'dsh-sh-chips', 'data-group': 'active' },
              chips.map(chipNode),
              overflow > 0
                ? h(
                    'button',
                    {
                      type: 'button',
                      className: 'dsh-sh-more',
                      title: translate('moreSessions', { count: overflow }),
                      'aria-label': translate('moreSessions', { count: overflow }),
                      onClick: (event) => {
                        event.stopPropagation();
                        setExpanded((value) => !value);
                      },
                    },
                    `+${overflow}`,
                  )
                : null,
            )
          : null,
        recent.length > 0
          ? h('span', { className: 'dsh-sh-sep', 'data-strong': 'true', 'aria-hidden': true })
          : null,
        recent.length > 0
          ? h('div', { className: 'dsh-sh-chips', 'data-group': 'recent' }, recent.map(chipNode))
          : null,
        tooltip,
        panel,
      ),
    ),
  );
}

function apply(ctx) {
  ctx.effect(() => ctx.locale.register(NS, { zh: ZH, en: EN }), 'session-hub: dictionaries');
  ctx.slots.inject('shell.overlay', () =>
    ctx.slots.register(
      {
        name: 'shell.overlay',
        id: 'session-hub.island',
        order: 40,
        locale: NS,
        inject: () => ({
          openSession: (sessionId) => ctx.uiWorkspace.openSession(sessionId),
          sessions: ctx.sessions,
        }),
      },
      SessionHub,
    ),
  );
}

    return { inject: ['slots', 'locale', 'uiWorkspace', 'sessions'], apply };
  },
});
