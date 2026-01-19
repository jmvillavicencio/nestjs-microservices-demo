import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.GRPC,
      options: {
        package: 'payment',
        protoPath: join(__dirname, '../../../proto/payment.proto'),
        url: process.env.GRPC_URL || '0.0.0.0:50052',
      },
    },
  );

  await app.listen();
  console.log('Payment Service is running on gRPC port 50052');
}

bootstrap();
