import { Request } from 'express';

export interface AuditContext {
  ip: string | null;
  userAgent: string | null;
}

export function getAuditContext(req: Request): AuditContext {
  const forwarded = req.headers['x-forwarded-for'];
  const ip =
    (typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : null) ||
    req.ip ||
    req.socket?.remoteAddress ||
    null;
  const userAgent =
    typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : null;
  return { ip, userAgent };
}
