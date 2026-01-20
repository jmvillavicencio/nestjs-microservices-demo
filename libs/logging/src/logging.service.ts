import { Injectable, LoggerService, Scope } from '@nestjs/common';
import * as winston from 'winston';

/**
 * Custom logger service using Winston for structured logging.
 * Supports JSON format for production and pretty format for development.
 */
@Injectable({ scope: Scope.TRANSIENT })
export class LoggingService implements LoggerService {
  private logger: winston.Logger;
  private context?: string;

  constructor() {
    const isProduction = process.env.NODE_ENV === 'production';

    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
        winston.format.errors({ stack: true }),
        isProduction
          ? winston.format.json()
          : winston.format.combine(
              winston.format.colorize({ all: true }),
              winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
                const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
                return `${timestamp} [${context || 'Application'}] ${level}: ${message}${metaStr}`;
              }),
            ),
      ),
      transports: [new winston.transports.Console()],
      defaultMeta: { service: process.env.SERVICE_NAME || 'microservice' },
    });
  }

  /**
   * Sets the context for the logger instance.
   * @param context - The logging context (usually the class name)
   */
  setContext(context: string): void {
    this.context = context;
  }

  /**
   * Logs an informational message.
   * @param message - The message to log
   * @param context - Optional context override
   */
  log(message: string, context?: string): void {
    this.logger.info(message, { context: context || this.context });
  }

  /**
   * Logs an error message.
   * @param message - The error message
   * @param trace - Optional stack trace
   * @param context - Optional context override
   */
  error(message: string, trace?: string, context?: string): void {
    this.logger.error(message, { trace, context: context || this.context });
  }

  /**
   * Logs a warning message.
   * @param message - The warning message
   * @param context - Optional context override
   */
  warn(message: string, context?: string): void {
    this.logger.warn(message, { context: context || this.context });
  }

  /**
   * Logs a debug message.
   * @param message - The debug message
   * @param context - Optional context override
   */
  debug(message: string, context?: string): void {
    this.logger.debug(message, { context: context || this.context });
  }

  /**
   * Logs a verbose message.
   * @param message - The verbose message
   * @param context - Optional context override
   */
  verbose(message: string, context?: string): void {
    this.logger.verbose(message, { context: context || this.context });
  }

  /**
   * Logs a message with additional metadata.
   * @param level - The log level
   * @param message - The message to log
   * @param meta - Additional metadata to include
   */
  logWithMeta(level: string, message: string, meta: Record<string, unknown>): void {
    this.logger.log(level, message, { context: this.context, ...meta });
  }
}
