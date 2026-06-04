import { HttpException, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';

/**
 * Maps a known Prisma error to the corresponding HttpException, or returns
 * null if it isn't one we special-case. Shared by handlePrismaError (used in
 * per-route try/catch blocks) and the global AllExceptionsFilter so the
 * mapping lives in exactly one place.
 */
export function mapPrismaError(error: unknown): HttpException | null {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return new HttpException(
          'A record with this data already exists',
          HttpStatus.CONFLICT,
        );
      case 'P2025':
        return new HttpException('Record not found', HttpStatus.NOT_FOUND);
      case 'P2003':
        return new HttpException(
          'Foreign key constraint failed',
          HttpStatus.BAD_REQUEST,
        );
      case 'P2004':
        return new HttpException(
          'Constraint failed on the database',
          HttpStatus.BAD_REQUEST,
        );
    }
  }

  return null;
}

export function handlePrismaError(error: any, operation: string): never {
  if (error instanceof HttpException) {
    throw error;
  }

  const mapped = mapPrismaError(error);
  if (mapped) throw mapped;

  console.error(error);
  throw new HttpException(
    `Failed to ${operation}`,
    HttpStatus.INTERNAL_SERVER_ERROR,
  );
}
