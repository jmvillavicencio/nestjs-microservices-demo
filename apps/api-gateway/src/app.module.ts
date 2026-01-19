import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { UserController } from './controllers/user.controller';
import { PaymentController } from './controllers/payment.controller';
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
          protoPath: join(__dirname, '../../../proto/user.proto'),
          url: process.env.USER_SERVICE_URL || 'localhost:50051',
        },
      },
      {
        name: SERVICES.PAYMENT_SERVICE,
        transport: Transport.GRPC,
        options: {
          package: 'payment',
          protoPath: join(__dirname, '../../../proto/payment.proto'),
          url: process.env.PAYMENT_SERVICE_URL || 'localhost:50052',
        },
      },
    ]),
  ],
  controllers: [UserController, PaymentController, HealthController],
})
export class AppModule {}
