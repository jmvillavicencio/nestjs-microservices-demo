import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokenService } from './services/token.service';
import { GoogleAuthService } from './services/google-auth.service';
import { AppleAuthService } from './services/apple-auth.service';
import { PasswordService } from './services/password.service';
import { UserRepository } from './repositories/user.repository';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { RabbitMQService } from './rabbitmq.service';
import { SERVICES, RABBITMQ_QUEUES } from '@app/common';
import { PrismaModule } from '@app/prisma';

/**
 * Root module for the Authentication Service.
 * Configures JWT, Prisma for database access, and RabbitMQ for event publishing.
 */
@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
      signOptions: { expiresIn: '15m' },
    }),
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
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    GoogleAuthService,
    AppleAuthService,
    PasswordService,
    UserRepository,
    RefreshTokenRepository,
    RabbitMQService,
  ],
})
export class AppModule {}
