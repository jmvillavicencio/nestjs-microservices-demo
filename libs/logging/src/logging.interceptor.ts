import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Interceptor that logs the execution time of requests/handlers.
 * Useful for monitoring performance and debugging slow operations.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  /**
   * Intercepts the request/handler and logs execution time.
   * @param context - The execution context
   * @param next - The call handler to continue the request
   * @returns Observable with the response
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const contextType = context.getType();
    const className = context.getClass().name;
    const methodName = context.getHandler().name;
    const now = Date.now();

    this.logger.log(`[${contextType}] ${className}.${methodName} - Started`);

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - now;
          this.logger.log(
            `[${contextType}] ${className}.${methodName} - Completed in ${duration}ms`,
          );
        },
        error: (error) => {
          const duration = Date.now() - now;
          this.logger.error(
            `[${contextType}] ${className}.${methodName} - Failed in ${duration}ms: ${error.message}`,
          );
        },
      }),
    );
  }
}
