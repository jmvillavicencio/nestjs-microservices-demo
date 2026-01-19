import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { RABBITMQ_QUEUES } from '@app/common';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.RMQ,
      options: {
        urls: [process.env.RABBITMQ_URL || 'amqp://localhost:5672'],
        queue: RABBITMQ_QUEUES.NOTIFICATIONS,
        queueOptions: {
          durable: true,
        },
        noAck: false,
        prefetchCount: 1,
      },
    },
  );

  await app.listen();
  console.log('Notification Service is listening to RabbitMQ');
}

bootstrap();
