import { Module, Global } from '@nestjs/common';
import { LoggingService } from './logging.service';

/**
 * Global logging module that provides the LoggingService throughout the application.
 */
@Global()
@Module({
  providers: [LoggingService],
  exports: [LoggingService],
})
export class LoggingModule {}
