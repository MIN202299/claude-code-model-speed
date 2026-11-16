import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { LastSpeed, LiveSpeed, SessionSpeed } from '../types'

const live = atom({ plugin: 'model-speed', key: 'live' } as const, null)
const last = atom({ plugin: 'model-speed', key: 'last' } as const, null)
const session = atom({ plugin: 'model-speed', key: 'session' } as const, null)

// CJK characters run about one token each; other text about four chars a token.
const CJK = /[぀-ヿ㐀-䶿一-鿿가-힯]/g

const GREEN = '\x1b[32m'
const CYAN = '\x1b[36m'
const DIM = '\x1b[2m'
const RESET = '\x1b[0m'

function estimateTokens(text: string): number {
  const cjk = (text.match(CJK) ?? []).length
  return cjk + (text.length - cjk) / 4
}

function shortModel(model: string): string {
  return model.replace(/^claude-/, '')
}

function avgOf(s: SessionSpeed | null | undefined): number | null {
  return s && s.ms > 0 ? s.tokens / (s.ms / 1000) : null
}

// The status line wrapper appends this file's content below claude-hud's output.
let speedFile: string | null = null

async function statusPath($: EngineInterface): Promise<string> {
  if (speedFile === null) {
    const configDir =
      (await $.env.get('CLAUDE_CONFIG_DIR')) || `${(await $.env.get('HOME')) ?? ''}/.claude`
    speedFile = `${configDir}/model-speed-status.txt`
  }
  return speedFile
}

async function publish($: EngineInterface, text: string, enabled: boolean): Promise<void> {
  if (!enabled) return
  try {
    await $.fs.write(await statusPath($), text)
  } catch {
    // A failed write must never take the streaming hook down with it.
  }
}

export const register: Register = (on, options) => {
  const position = typeof options.position === 'string' ? options.position : 'statusline'
  const inStatus = position === 'statusline' || position === 'both'
  const inBand = position === 'band' || position === 'both'
  const showTtft = options.showTtft !== false
  const showTokens = options.showTokens !== false
  const showModel = options.showModel === true
  const showAvg = options.showAvg !== false

  function liveText(l: LiveSpeed, avg: number | null): string {
    const bits: string[] = []
    if (showAvg && avg !== null) bits.push(`avg ${avg.toFixed(1)}`)
    bits.push('streaming')
    if (showTokens) bits.push(`~${l.tokens} tok`)
    if (showModel) bits.push(shortModel(l.model))
    return `${CYAN}⚡ ~${l.tps.toFixed(1)} tok/s${RESET}${DIM} · ${bits.join(' · ')}${RESET}\n`
  }

  function lastText(d: LastSpeed, avg: number | null): string {
    const bits: string[] = []
    if (showAvg && avg !== null) bits.push(`avg ${avg.toFixed(1)}`)
    if (showTtft) bits.push(`TTFT ${(d.ttftMs / 1000).toFixed(2)}s`)
    if (showTokens) bits.push(`${d.outputTokens} tok${d.exact ? '' : ' (est)'}`)
    if (showModel) bits.push(shortModel(d.model))
    return `${GREEN}⚡ ${d.tps.toFixed(1)} tok/s${RESET}${DIM} · ${bits.join(' · ')}${RESET}\n`
  }

  on('session.start', async ($, e, next) => {
    await update($, live, () => null)
    const d = await read($, last)
    // Fresh session: clear a stale line. Reload: repaint the last measurement.
    await publish($, d ? lastText(d, avgOf(await read($, session))) : '', inStatus)
    return next(e)
  })

  // A /clear ends the conversation but fires no session.start: reset totals here.
  on('session.end', { reason: 'clear' }, async ($, e, next) => {
    await update($, live, () => null)
    await update($, last, () => null)
    await update($, session, () => null)
    await publish($, '', inStatus)
    return next(e)
  })

  on('turn.step', async function* ($, e, next) {
    // Measure the main loop only; subagent steps pass straight through.
    if (e.agentId !== undefined) return yield* next(e)

    const startedAt = await $.clock.now()
    let firstAt = 0
    let stopAt = 0
    let lastPush = 0
    let estTokens = 0
    let usageTokens = 0
    let model = e.model
    let exact = false

    for await (const c of next(e)) {
      if (c.kind === 'text' || c.kind === 'thinking' || c.kind === 'input') {
        const now = await $.clock.now()
        if (firstAt === 0) firstAt = now
        estTokens += estimateTokens(c.kind === 'input' ? c.json : c.text)

        // Push a live estimate at most ~2.5 times a second, once there is
        // enough elapsed time for the figure to mean anything.
        if (now - firstAt >= 500 && now - lastPush >= 400) {
          lastPush = now
          const snapshot: LiveSpeed = {
            tps: estTokens / ((now - firstAt) / 1000),
            tokens: Math.round(estTokens),
            model,
          }
          await update($, live, () => snapshot)
          await publish($, liveText(snapshot, avgOf(await read($, session))), inStatus)
        }
      } else if (c.kind === 'stop') {
        stopAt = await $.clock.now()
        if (c.usage) {
          usageTokens = c.usage.output_tokens
          model = c.usage.model
          exact = true
        }
      }
      yield c
    }

    if (firstAt !== 0) {
      const endAt = stopAt || (await $.clock.now())
      const durationMs = Math.max(1, endAt - firstAt)
      const tokens = exact ? usageTokens : Math.round(estTokens)
      const stats: LastSpeed = {
        tps: tokens / (durationMs / 1000),
        ttftMs: firstAt - startedAt,
        outputTokens: tokens,
        durationMs,
        model,
        exact,
      }
      await update($, last, () => stats)
      const totals = await update($, session, prev => ({
        tokens: (prev?.tokens ?? 0) + tokens,
        ms: (prev?.ms ?? 0) + durationMs,
        steps: (prev?.steps ?? 0) + 1,
      }))
      await publish($, lastText(stats, avgOf(totals)), inStatus)
    }
    await update($, live, () => null)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (!inBand || e.props.hasSurvey) return next(e)

    const streaming = await read($, live)
    const done = await read($, last)
    if (streaming === null && done === null) return next(e)

    const avg = avgOf(await read($, session))
    const { Box, Text } = $.ui.resolve(e)

    if (streaming !== null) {
      return (
        <Box>
          <Text color="cyan">⚡ ~{streaming.tps.toFixed(1)} tok/s</Text>
          <Text dimColor>
            {showAvg && avg !== null ? ` avg ${avg.toFixed(1)} ·` : ''} streaming · ~
            {streaming.tokens} tokens
            {showModel ? ` · ${shortModel(streaming.model)}` : ''}
          </Text>
        </Box>
      )
    }

    const d = done as LastSpeed
    return (
      <Box>
        <Text color="green">⚡ {d.tps.toFixed(1)} tok/s</Text>
        <Text dimColor>
          {showAvg && avg !== null ? ` avg ${avg.toFixed(1)} ·` : ''} last
          {showTtft ? ` · TTFT ${(d.ttftMs / 1000).toFixed(2)}s` : ''}
          {showTokens ? ` · ${d.outputTokens} tokens${d.exact ? '' : ' (est)'}` : ''}
          {showModel ? ` · ${shortModel(d.model)}` : ''}
        </Text>
      </Box>
    )
  })
}