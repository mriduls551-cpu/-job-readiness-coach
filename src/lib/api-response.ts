import { NextResponse } from 'next/server';
import { ApiResponse, HttpStatus } from '@/types/api';

/**
 * Create a successful API response
 */
export function success<T>(
  data: T,
  message: string = 'Success',
  status: number = HttpStatus.OK
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

/**
 * Create an error API response
 */
export function error(
  message: string,
  status: number = HttpStatus.INTERNAL_SERVER_ERROR,
  code?: string
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error: message,
      code,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

/**
 * Handle various error types
 */
export function handleError(
  err: unknown,
  defaultStatus: number = HttpStatus.INTERNAL_SERVER_ERROR
): NextResponse<ApiResponse> {
  if (err instanceof Error) {
    // Check for specific error types
    if (err.message.includes('Unauthorized')) {
      return error('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    if (err.message.includes('Not found')) {
      return error('Not found', HttpStatus.NOT_FOUND);
    }

    if (err.message.includes('Validation')) {
      return error(err.message, HttpStatus.BAD_REQUEST);
    }

    return error(err.message, defaultStatus);
  }

  return error(
    'An unexpected error occurred',
    defaultStatus
  );
}

/**
 * Validate request method
 */
export function validateMethod(
  method: string | undefined,
  allowed: string[]
): boolean {
  return method ? allowed.includes(method) : false;
}

/**
 * Create method not allowed response
 */
export function methodNotAllowed(allowed: string[]): NextResponse<ApiResponse> {
  return error(
    `Method not allowed. Allowed methods: ${allowed.join(', ')}`,
    HttpStatus.UNAUTHORIZED
  );
}
