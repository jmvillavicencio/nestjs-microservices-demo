import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { RabbitMQService } from './rabbitmq.service';
import { SERVICES, RABBITMQ_QUEUES } from '@app/common';
import { PrismaModule } from '@app/prisma';

/**
 * Root module for the User Service.
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
  controllers: [UserController],
  providers: [UserService, RabbitMQService],
})
export class AppModule {}
