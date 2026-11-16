/** Live estimate while a response streams in. */
export type LiveSpeed = {
  /** Estimated output tokens per second so far. */
  tps: number
  /** Estimated output tokens seen so far. */
  tokens: number
  /** The model the request names. */
  model: string
}

/** Measured speed of the last completed response. */
export type LastSpeed = {
  /** Output tokens per second over the streaming window. */
  tps: number
  /** Time from request start to the first content chunk, in ms. */
  ttftMs: number
  /** Output tokens: the API's count when exact, an estimate otherwise. */
  outputTokens: number
  /** Streaming window (first chunk to stop), in ms. */
  durationMs: number
  /** The model that answered. */
  model: string
  /** True when the count came from the API's usage, false when estimated. */
  exact: boolean
}

/** Totals behind the session's average speed. */
export type SessionSpeed = {
  /** Output tokens summed over the session's responses. */
  tokens: number
  /** Streaming milliseconds summed over the session's responses. */
  ms: number
  /** How many responses were measured. */
  steps: number
}

declare module 'claude-code' {
  interface PluginState {
    'model-speed': {
      live: LiveSpeed | null
      last: LastSpeed | null
      session: SessionSpeed | null
    }
  }
}