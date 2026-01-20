import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { EmailService } from './email.service';
import { TemplateService } from './template.service';

/**
 * Root module for the Notification Service.
 * Handles email notifications triggered by events from other services.
 */
@Module({
  controllers: [NotificationController],
  providers: [NotificationService, EmailService, TemplateService],
})
export class AppModule {}
