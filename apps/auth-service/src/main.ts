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
        package: 'auth',
        protoPath: join(process.cwd(), 'proto/auth.proto'),
        url: process.env.GRPC_URL || '0.0.0.0:50053',
      },
    },
  );

  await app.listen();
  console.log('Auth Service is running on gRPC port 50053');
}

bootstrap();
