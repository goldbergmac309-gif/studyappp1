import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';

export type ErrorPayload = {
  statusCode: number;
  message: string;
  error?: string;
  timestamp: string;
};

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const resp = exception.getResponse();

      let message: string = 'An error occurred';
      let error: string | undefined;

      if (typeof resp === 'string') {
        message = resp;
      } else if (typeof resp === 'object' && resp) {
        const r = resp as Record<string, unknown>;
        const raw = r.message;
        if (Array.isArray(raw)) {
          message = raw.join(', ');
        } else if (typeof raw === 'string') {
          message = raw;
        } else {
          message = exception.message || 'An error occurred';
        }
        if (typeof r.error === 'string') {
          error = r.error;
        } else {
          error = exception.name;
        }
      }

      const payload: ErrorPayload = {
        statusCode: status,
        message,
        error,
        timestamp: new Date().toISOString(),
      };
      res.status(status).json(payload);
      return;
    }

    const status = HttpStatus.INTERNAL_SERVER_ERROR;
    const err = exception as Error | undefined;

    const payload: ErrorPayload = {
      statusCode: status,
      message: err?.message || 'Internal server error',
      error: err?.name || 'Error',
      timestamp: new Date().toISOString(),
    };
    res.status(status).json(payload);
  }
}
