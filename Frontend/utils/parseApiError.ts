/** Normalize NestJS / API error payloads into a user-visible string. */
export function parseApiErrorPayload(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') return fallback;
  const message = (payload as { message?: string | string[] }).message;
  if (Array.isArray(message)) return message.filter(Boolean).join(', ');
  if (typeof message === 'string' && message.trim()) return message;
  const error = (payload as { error?: string }).error;
  if (typeof error === 'string' && error.trim()) return error;
  return fallback;
}

export async function parseApiErrorResponse(response: Response, fallback: string): Promise<string> {
  const text = await response.text();
  if (!text) return fallback;
  try {
    return parseApiErrorPayload(JSON.parse(text), fallback);
  } catch {
    return text;
  }
}
