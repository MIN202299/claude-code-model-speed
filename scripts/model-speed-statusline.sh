#!/bin/bash
# model-speed statusline wrapper: claude-hud's output first, then the
# model-speed line (written by the model-speed plugin) below it.
input=$(cat)
hud=$(printf '%s' "$input" | bash "${CLAUDE_CONFIG_DIR:-$HOME/.claude}/claude-hud-statusline.sh")
printf '%s\n' "$hud"
speed_file="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/model-speed-status.txt"
if [ -s "$speed_file" ]; then
  cat "$speed_file"
fi