import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { UserController } from './controllers/user.controller';
import { PaymentController } from './controllers/payment.controller';
import { AuthController } from './controllers/auth.controller';
import { HealthController } from './controllers/health.controller';
import { SERVICES } from '@app/common';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: SERVICES.USER_SERVICE,
        transport: Transport.GRPC,
        options: {
          package: 'user',
          protoPath: join(process.cwd(), 'proto/user.proto'),
          url: process.env.USER_SERVICE_URL || 'localhost:50051',
        },
      },
      {
        name: SERVICES.PAYMENT_SERVICE,
        transport: Transport.GRPC,
        options: {
          package: 'payment',
          protoPath: join(process.cwd(), 'proto/payment.proto'),
          url: process.env.PAYMENT_SERVICE_URL || 'localhost:50052',
        },
      },
      {
        name: SERVICES.AUTH_SERVICE,
        transport: Transport.GRPC,
        options: {
          package: 'auth',
          protoPath: join(process.cwd(), 'proto/auth.proto'),
          url: process.env.AUTH_SERVICE_URL || 'localhost:50053',
        },
      },
    ]),
  ],
  controllers: [UserController, PaymentController, AuthController, HealthController],
})
export class AppModule {}
