import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { RabbitMQService } from './rabbitmq.service';
import { SERVICES, RABBITMQ_QUEUES } from '@app/common';
import { PrismaModule } from '@app/prisma';

/**
 * Root module for the Payment Service.
 * Configures Prisma for database access and RabbitMQ for event publishing.
 */
@Module({
  imports: [
    PrismaModule,
    ClientsModule.register([
      {
        name: SERVICES.NOTIFICATION_SERVICE,
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL || 'amqp://localhost:5672'],
          queue: RABBITMQ_QUEUES.NOTIFICATIONS,
          queueOptions: {
            durable: true,
          },
        },
      },
    ]),
  ],
  controllers: [PaymentController],
  providers: [PaymentService, RabbitMQService],
})
export class AppModule {}
