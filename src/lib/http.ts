/**
 * Outbound HTTP with a mandatory deadline.
 *
 * `fetch` has no default timeout: a hung upstream (a stalled ingest container, a
 * Gemini call that never returns, an SMS gateway blackholing traffic) holds the
 * request or BullMQ worker open indefinitely. Every outbound call in this
 * codebase goes through here so a deadline is impossible to forget.
 */

/** Deadlines by call type, in milliseconds. */
export const TIMEOUTS = {
  /** robots.txt and other small preflight reads. */
  PREFLIGHT: 5_000,
  /** Third-party APIs: Gemini, Daily.co, SMS gateways. */
  EXTERNAL_API: 30_000,
  /** SMS specifically — gateways are slow but not that slow. */
  SMS: 15_000,
  /**
   * Document parsing. The spec allows up to 3 minutes for a scanned PDF going
   * through OCR, so this has to outlast that path rather than cut it off.
   */
  DOCUMENT_PARSE: 210_000,
} as const;

export class FetchTimeoutError extends Error {
  constructor(url: string, timeoutMs: number) {
    super(`Request to ${url} exceeded ${timeoutMs}ms and was aborted`);
    this.name = "FetchTimeoutError";
  }
}

/**
 * `fetch` that aborts after `timeoutMs` and throws FetchTimeoutError.
 *
 * A caller-supplied `init.signal` is still honoured — whichever fires first
 * wins — so this composes with request cancellation rather than replacing it.
 */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs: number = TIMEOUTS.EXTERNAL_API
): Promise<Response> {
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const signal = init.signal
    ? AbortSignal.any([init.signal, timeoutSignal])
    : timeoutSignal;

  try {
    return await fetch(url, { ...init, signal });
  } catch (err) {
    // AbortSignal.timeout aborts with a TimeoutError DOMException; surface it
    // as something callers can distinguish from a genuine network failure.
    if (err instanceof Error && err.name === "TimeoutError") {
      throw new FetchTimeoutError(url, timeoutMs);
    }
    throw err;
  }
}
