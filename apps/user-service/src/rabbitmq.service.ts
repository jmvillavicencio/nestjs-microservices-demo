import { Injectable, Inject, OnModuleInit, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { SERVICES } from '@app/common';

@Injectable()
export class RabbitMQService implements OnModuleInit {
  private readonly logger = new Logger(RabbitMQService.name);

  constructor(
    @Inject(SERVICES.NOTIFICATION_SERVICE)
    private readonly client: ClientProxy,
  ) {}

  async onModuleInit() {
    try {
      await this.client.connect();
      this.logger.log('Connected to RabbitMQ');
    } catch (error) {
      this.logger.error('Failed to connect to RabbitMQ', error);
    }
  }

  async emit<T>(pattern: string, data: T): Promise<void> {
    try {
      this.client.emit(pattern, data);
      this.logger.log(`Event emitted: ${pattern}`);
    } catch (error) {
      this.logger.error(`Failed to emit event: ${pattern}`, error);
    }
  }
}
