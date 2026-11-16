# model-speed

[English](README.md) | [简体中文](README.zh-CN.md)

A [Claude Code](https://claude.com/claude-code) plugin that shows the model's output speed in the TUI — a live estimate while a response streams in, an exact measurement after it finishes.

```text
⚡ 45.1 tok/s · avg 43.2 · TTFT 1.23s · 1234 tok
```

By default the speed line sits **below claude-hud** in the bottom status area. It can also be shown in the band above the prompt, or in both places.

## What it shows

- **While streaming** — a live estimate in tokens/s (`⚡ ~46.9 tok/s · avg 43.2 · streaming · ~512 tok`), refreshed up to about 2.5 times a second.
- **After each response** — the speed computed from the API's real `usage.output_tokens` over the streaming window, plus the session average, time to first token (TTFT) and the output token count.

Details:

- Only the main conversation is measured; subagent steps pass through untouched.
- Text, thinking and tool-argument chunks all count toward output.
- The live figure is an estimate (CJK characters ≈ 1 token each, other text ≈ 4 characters per token). The final figure is exact whenever the API reports usage, and marked `(est)` otherwise.
- The session average resets on `/clear`.

## Install

At the prompt of a Claude Code session:

```text
/plugin install model-speed --marketplace MIN202299/claude-code-model-speed
```

Answer `y` to add the marketplace, then pick a scope (user, project or local).

From a shell:

```bash
claude plugin install model-speed --marketplace MIN202299/claude-code-model-speed
```

## Display position

| `position` | Where the speed appears | Extra setup |
| --- | --- | --- |
| `statusline` (default) | A line below claude-hud in the bottom status area | Needs the statusline wrapper below |
| `band` | The band above the prompt | None |
| `both` | Both places | Needs the statusline wrapper |

### Statusline wrapper setup

The plugin writes the current speed line to `~/.claude/model-speed-status.txt`. A small wrapper script runs your existing statusline command first and appends that file below its output.

1. Save your current statusline command as `~/.claude/claude-hud-statusline.sh` (with claude-hud, that is its original command; any statusline script works).
2. Copy [`scripts/model-speed-statusline.sh`](scripts/model-speed-statusline.sh) from this repository to `~/.claude/model-speed-statusline.sh`.
3. Point `statusLine` in `~/.claude/settings.json` at the wrapper, with `refreshInterval: 1` so the live figure updates while streaming:

```json
{
  "statusLine": {
    "type": "command",
    "command": "bash ~/.claude/model-speed-statusline.sh",
    "refreshInterval": 1
  }
}
```

## Configuration

Set options in `/config` (plugin options) or in `settings.json` under `pluginConfigs["model-speed"].options`. Changing an option reloads the plugin automatically.

| Option | Type | Default | Meaning |
| --- | --- | --- | --- |
| `position` | `statusline` \| `band` \| `both` | `statusline` | Where the speed is shown |
| `showTtft` | boolean | `true` | Show time to first token |
| `showTokens` | boolean | `true` | Show the output token count |
| `showModel` | boolean | `false` | Show the model name |
| `showAvg` | boolean | `true` | Show the session's average speed |

Example:

```json
{
  "pluginConfigs": {
    "model-speed": {
      "options": { "position": "both", "showModel": true }
    }
  }
}
```

## Development

Run the plugin from a checkout:

```bash
claude --plugin-dir <path-to-this-folder>
```

Validate and type-check:

```bash
claude plugin validate <path-to-this-folder>
tsc -p <path-to-this-folder>
```

The engine writes the Claude Code API typings into `.claude-plugin/types/` when the plugin loads (gitignored, regenerated per build); `tsc` works once they are laid.

## License

[MIT](LICENSE)