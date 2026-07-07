import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PlatformErrorsService } from '../../platform-errors/platform-errors.service';
import type { CorrelationRequest } from '../middleware/correlation-id.middleware';

@Injectable()
@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalHttpExceptionFilter.name);

  constructor(private readonly platformErrors: PlatformErrorsService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<CorrelationRequest & { user?: { id: string; email?: string; role?: string; phone?: string } }>();

    const isProd = process.env.NODE_ENV === 'production';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message = typeof res === 'string' ? res : res;
    } else if (exception instanceof Error) {
      this.logger.error(
        `${request.method} ${request.url} — ${exception.name}: ${exception.message}`,
        exception.stack,
      );
    }

    if (!isProd && !(exception instanceof HttpException)) {
      message =
        exception instanceof Error
          ? exception.message
          : 'Internal server error';
    } else if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      message = 'Internal server error';
    }

    const safeMessage =
      typeof message === 'string'
        ? message
        : Array.isArray(message)
          ? message.map((m) => String(m)).join('; ')
          : typeof message === 'object' && message !== null && 'message' in message
            ? String((message as { message: unknown }).message)
            : 'Request failed';

    if (status >= 500 || (status >= 400 && status < 500 && status !== 401 && status !== 403 && status !== 404)) {
      const errorName =
        exception instanceof HttpException
          ? exception.name
          : exception instanceof Error
            ? exception.name
            : 'Error';

      void this.platformErrors.recordApiError({
        correlationId: request.correlationId,
        errorName,
        message: safeMessage,
        httpMethod: request.method,
        httpStatus: status,
        requestPath: request.url,
        userAgent: request.headers['user-agent'],
        stack: exception instanceof Error ? exception.stack : undefined,
        actor: request.user
          ? {
              userId: request.user.id,
              userEmail: request.user.email,
              userPhone: request.user.phone,
              userRole:
                request.user.role === 'ADMIN' || request.user.role === 'SUPER_ADMIN'
                  ? 'ADMIN'
                  : request.user.role === 'VENDOR'
                    ? 'MERCHANT'
                    : request.user.role === 'CUSTOMER'
                      ? 'CUSTOMER'
                      : 'GUEST',
            }
          : undefined,
      });
    }

    response.status(status).json({
      statusCode: status,
      message: safeMessage,
      timestamp: new Date().toISOString(),
      path: request.url,
      correlationId: request.correlationId,
    });
  }
}
