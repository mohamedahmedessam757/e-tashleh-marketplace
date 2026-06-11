const AXIOS_STATUS_RE = /^Request failed with status code \d+$/i;

function messageFromPayload(payload: unknown): string | null {
  if (payload == null) return null;
  if (typeof payload === 'string' && payload.trim()) return payload.trim();

  if (typeof payload !== 'object') return null;
  const o = payload as Record<string, unknown>;

  if (typeof o.message === 'string' && o.message.trim()) {
    return o.message.trim();
  }

  if (Array.isArray(o.message)) {
    const parts = o.message
      .map((m) => messageFromPayload(m))
      .filter((m): m is string => Boolean(m));
    if (parts.length) return parts.join(' · ');
  }

  if (typeof o.message === 'object' && o.message !== null) {
    const nested = messageFromPayload(o.message);
    if (nested) return nested;
  }

  if (typeof o.error === 'string' && o.error.trim()) {
    return o.error.trim();
  }

  return null;
}

/** Normalize API/axios/stripe errors for safe React text rendering. */
export function formatApiErrorMessage(
  err: unknown,
  fallback = 'Something went wrong',
): string {
  if (err == null) return fallback;
  if (typeof err === 'string') return err.trim() || fallback;

  // NestJS body lives on axiosError.response.data — check before generic Error.message
  const responseData = (err as { response?: { data?: unknown } })?.response?.data;
  if (responseData != null && responseData !== err) {
    const fromBody = messageFromPayload(responseData);
    if (fromBody) return fromBody;
  }

  const direct = messageFromPayload(err);
  if (direct) return direct;

  if (err instanceof Error && err.message?.trim()) {
    const msg = err.message.trim();
    if (!AXIOS_STATUS_RE.test(msg)) return msg;
  }

  return fallback;
}
