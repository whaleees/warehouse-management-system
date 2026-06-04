import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { mapPrismaError } from './prisma-error.handler';

/**
 * Catch-all exception filter that gives every unhandled error a consistent
 * shape:
 *  - Nest HttpExceptions are passed through unchanged (preserves the existing
 *    Conflict/NotFound/BadRequest responses the controllers already produce).
 *  - Known Prisma errors are mapped to the right HTTP status instead of a
 *    raw 500.
 *  - Anything else is logged server-side and returned as a generic 500.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    let httpException: HttpException;

    if (exception instanceof HttpException) {
      httpException = exception;
    } else {
      const mapped = mapPrismaError(exception);
      if (mapped) {
        httpException = mapped;
      } else {
        console.error(exception);
        httpException = new HttpException(
          'Internal server error',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }

    const status = httpException.getStatus();
    const body = httpException.getResponse();

    response
      .status(status)
      .json(
        typeof body === 'string'
          ? { statusCode: status, message: body }
          : body,
      );
  }
}
