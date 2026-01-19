import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { RabbitMQService } from './rabbitmq.service';
import { SERVICES, RABBITMQ_QUEUES } from '@app/common';

@Module({
  imports: [
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
