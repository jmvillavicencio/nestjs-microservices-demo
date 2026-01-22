import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';
import {
  StructuredError,
  ERROR_CODE_TO_HTTP_STATUS,
  ERROR_CODES,
  ErrorCode,
} from '@app/common';

/**
 * Standardized API error response format.
 */
export interface ApiErrorResponse {
  code: string;
  message: string;
  field?: string;
  statusCode: number;
  timestamp: string;
  path: string;
}

/**
 * Global exception filter that transforms all exceptions into structured API error responses.
 * Handles:
 * - HttpException (from NestJS)
 * - RpcException (from microservices, containing structured errors)
 * - Unknown errors (fallback to internal server error)
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let errorResponse: ApiErrorResponse;

    if (exception instanceof HttpException) {
      errorResponse = this.handleHttpException(exception, request.url);
    } else if (this.isRpcException(exception)) {
      errorResponse = this.handleRpcException(exception, request.url);
    } else {
      this.logger.error('Unhandled exception', exception);
      errorResponse = {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'Internal server error',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        timestamp: new Date().toISOString(),
        path: request.url,
      };
    }

    this.logger.warn(
      `[${errorResponse.code}] ${errorResponse.message} - ${request.method} ${request.url}`,
    );

    response.status(errorResponse.statusCode).json(errorResponse);
  }

  private handleHttpException(
    exception: HttpException,
    path: string,
  ): ApiErrorResponse {
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let message: string;
    let code = 'HTTP_ERROR';

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (typeof exceptionResponse === 'object') {
      const responseObj = exceptionResponse as Record<string, unknown>;
      message =
        (responseObj.message as string) ||
        (Array.isArray(responseObj.message)
          ? responseObj.message[0]
          : 'An error occurred');
      code = (responseObj.error as string) || code;
    } else {
      message = 'An error occurred';
    }

    return {
      code,
      message,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path,
    };
  }

  private isRpcException(exception: unknown): exception is { message: string } {
    return (
      exception !== null &&
      typeof exception === 'object' &&
      'message' in exception &&
      typeof (exception as { message: unknown }).message === 'string'
    );
  }

  private handleRpcException(
    exception: { message: string },
    path: string,
  ): ApiErrorResponse {
    // Extract the actual message from gRPC error format
    // gRPC errors come in format: "2 UNKNOWN: {json}" or "2 UNKNOWN: message"
    const message = this.extractGrpcMessage(exception.message);

    try {
      // Try to parse as structured error (JSON)
      const structuredError: StructuredError = JSON.parse(message);

      if (
        structuredError.code &&
        ERROR_CODE_TO_HTTP_STATUS[structuredError.code as ErrorCode]
      ) {
        return {
          code: structuredError.code,
          message: structuredError.message,
          field: structuredError.field,
          statusCode:
            ERROR_CODE_TO_HTTP_STATUS[structuredError.code as ErrorCode],
          timestamp: new Date().toISOString(),
          path,
        };
      }
    } catch {
      // Not a structured error (not valid JSON), fall through to legacy handling
    }

    // Legacy string-based error handling for backward compatibility
    return this.handleLegacyError(message, path);
  }

  /**
   * Extracts the actual error message from gRPC error format.
   * gRPC errors come in format: "<code> <STATUS>: <message>"
   * e.g., "2 UNKNOWN: Invalid email or password"
   * e.g., "2 UNKNOWN: {"code":"INVALID_CREDENTIALS",...}"
   */
  private extractGrpcMessage(rawMessage: string): string {
    // Match gRPC error format: number + space + status + colon + space + message
    const grpcPattern = /^\d+\s+[A-Z_]+:\s*/;
    const match = rawMessage.match(grpcPattern);

    if (match) {
      return rawMessage.slice(match[0].length);
    }

    return rawMessage;
  }

  /**
   * Handles legacy string-based error messages for backward compatibility.
   * This allows gradual migration from old-style errors to structured errors.
   */
  private handleLegacyError(message: string, path: string): ApiErrorResponse {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('not found')) {
      return {
        code: ERROR_CODES.NOT_FOUND,
        message,
        statusCode: HttpStatus.NOT_FOUND,
        timestamp: new Date().toISOString(),
        path,
      };
    }

    if (
      lowerMessage.includes('already exists') ||
      lowerMessage.includes('already in use')
    ) {
      return {
        code: ERROR_CODES.USER_ALREADY_EXISTS,
        message,
        statusCode: HttpStatus.CONFLICT,
        timestamp: new Date().toISOString(),
        path,
      };
    }

    if (
      lowerMessage.includes('invalid') ||
      lowerMessage.includes('unauthorized')
    ) {
      return {
        code: ERROR_CODES.UNAUTHORIZED,
        message,
        statusCode: HttpStatus.UNAUTHORIZED,
        timestamp: new Date().toISOString(),
        path,
      };
    }

    // Default to internal error
    return {
      code: ERROR_CODES.INTERNAL_ERROR,
      message: message || 'An error occurred',
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      timestamp: new Date().toISOString(),
      path,
    };
  }
}
