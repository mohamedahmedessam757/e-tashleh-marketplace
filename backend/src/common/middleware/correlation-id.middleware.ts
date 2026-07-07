import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type CorrelationRequest = Request & { correlationId: string };

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: CorrelationRequest, res: Response, next: NextFunction): void {
    const header = req.headers['x-correlation-id'];
    const fromHeader = typeof header === 'string' ? header.trim() : '';
    req.correlationId =
      fromHeader && UUID_RE.test(fromHeader) ? fromHeader : randomUUID();
    res.setHeader('X-Correlation-Id', req.correlationId);
    next();
  }
}
