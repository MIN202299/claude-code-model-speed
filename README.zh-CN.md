# model-speed

[English](README.md) | [简体中文](README.zh-CN.md)

一个 [Claude Code](https://claude.com/claude-code) 插件，在 TUI 中显示模型的输出速度（tokens/s）——流式输出时实时估算，回复结束后精确测量。

```text
⚡ 45.1 tok/s · avg 43.2 · TTFT 1.23s · 1234 tok
```

默认情况下，速度行显示在底部状态区 **claude-hud 的下方**；也可以显示在输入框上方的横幅（band）中，或两处同时显示。

## 显示内容

- **流式输出时** —— 实时估算的 tokens/s（`⚡ ~46.9 tok/s · avg 43.2 · streaming · ~512 tok`），每秒最多刷新约 2.5 次。
- **每次回复结束后** —— 用 API 返回的真实 `usage.output_tokens` 除以流式窗口时长算出的速度，并附带会话平均值、首 token 时间（TTFT）和输出 token 数。

细节：

- 只测量主对话；子代理（subagent）的步骤不受影响。
- 文本、思考和工具参数块都计入输出。
- 实时数字是估算值（CJK 字符约每字 1 token，其他文本约每 4 字符 1 token）。只要 API 报告了 usage，最终数字就是精确的，否则标记 `(est)`。
- 会话平均值在 `/clear` 时重置。

## 安装

在 Claude Code 会话的输入框中：

```text
/plugin install model-speed --marketplace MIN202299/claude-code-model-speed
```

输入 `y` 确认添加 marketplace，然后选择作用域（user、project 或 local）。

也可以在 shell 中：

```bash
claude plugin install model-speed --marketplace MIN202299/claude-code-model-speed
```

## 显示位置

| `position` | 速度显示在哪里 | 额外设置 |
| --- | --- | --- |
| `statusline`（默认） | 底部状态区 claude-hud 下方的一行 | 需要下面的 statusline 包装脚本 |
| `band` | 输入框上方的横幅 | 无 |
| `both` | 两处同时显示 | 需要 statusline 包装脚本 |

### statusline 包装脚本设置

插件会把当前速度行写入 `~/.claude/model-speed-status.txt`。一个小的包装脚本先运行你原有的 statusline 命令，再把该文件的内容追加到它的输出下方。

1. 把你当前的 statusline 命令保存为 `~/.claude/claude-hud-statusline.sh`（使用 claude-hud 时就是它的原始命令；任何 statusline 脚本都可以）。
2. 把本仓库的 [`scripts/model-speed-statusline.sh`](scripts/model-speed-statusline.sh) 复制到 `~/.claude/model-speed-statusline.sh`。
3. 在 `~/.claude/settings.json` 中把 `statusLine` 指向包装脚本，并设置 `refreshInterval: 1`，让实时数字在流式输出时持续更新：

```json
{
  "statusLine": {
    "type": "command",
    "command": "bash ~/.claude/model-speed-statusline.sh",
    "refreshInterval": 1
  }
}
```

## 配置

在 `/config`（插件选项）或 `settings.json` 的 `pluginConfigs["model-speed"].options` 中设置。修改选项后插件会自动重载。

| 选项 | 类型 | 默认值 | 含义 |
| --- | --- | --- | --- |
| `position` | `statusline` \| `band` \| `both` | `statusline` | 速度的显示位置 |
| `showTtft` | boolean | `true` | 显示首 token 时间 |
| `showTokens` | boolean | `true` | 显示输出 token 数 |
| `showModel` | boolean | `false` | 显示模型名 |
| `showAvg` | boolean | `true` | 显示会话平均速度 |

示例：

```json
{
  "pluginConfigs": {
    "model-speed": {
      "options": { "position": "both", "showModel": true }
    }
  }
}
```

## 开发

从本地目录运行插件：

```bash
claude --plugin-dir <本目录路径>
```

校验与类型检查：

```bash
claude plugin validate <本目录路径>
tsc -p <本目录路径>
```

引擎会在插件加载时把 Claude Code API 类型写入 `.claude-plugin/types/`（已 gitignore，随构建重新生成）；类型就位后 `tsc` 即可使用。

## 许可证

[MIT](LICENSE)