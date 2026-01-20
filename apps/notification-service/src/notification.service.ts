import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from './email.service';
import {
  UserCreatedEvent,
  UserUpdatedEvent,
  UserDeletedEvent,
  PaymentCreatedEvent,
  PaymentCompletedEvent,
  PaymentFailedEvent,
  PaymentRefundedEvent,
  UserRegisteredEvent,
  PasswordResetRequestedEvent,
  PasswordResetCompletedEvent,
  PasswordChangedEvent,
} from '@app/common';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly emailService: EmailService) {}

  async handleUserCreated(event: UserCreatedEvent): Promise<void> {
    this.logger.log(`Processing user.created event for user: ${event.id}`);
    await this.emailService.sendWelcomeEmail(event.email, event.name);
    this.logger.log(`Welcome email sent to: ${event.email}`);
  }

  async handleUserUpdated(event: UserUpdatedEvent): Promise<void> {
    this.logger.log(`Processing user.updated event for user: ${event.id}`);
    await this.emailService.sendAccountUpdateNotification(event.email, event.name);
    this.logger.log(`Account update notification sent to: ${event.email}`);
  }

  async handleUserDeleted(event: UserDeletedEvent): Promise<void> {
    this.logger.log(`Processing user.deleted event for user: ${event.id}`);
    // Note: In a real app, you'd need to fetch the user's email before deletion
    // or include it in the event. For demo purposes, we'll log this.
    this.logger.log(`User ${event.id} deleted. Account deletion notification would be sent.`);
  }

  async handlePaymentCreated(event: PaymentCreatedEvent): Promise<void> {
    this.logger.log(`Processing payment.created event for payment: ${event.id}`);
    // In a real app, you'd look up the user's email
    this.logger.log(`Payment ${event.id} created for user ${event.userId}. Amount: ${event.currency} ${event.amount}`);
  }

  async handlePaymentCompleted(event: PaymentCompletedEvent): Promise<void> {
    this.logger.log(`Processing payment.completed event for payment: ${event.id}`);
    // In a real app, you'd look up the user's email from a database
    // For demo, we'll use a placeholder email
    const userEmail = `user-${event.userId}@example.com`;
    await this.emailService.sendPaymentConfirmation(
      userEmail,
      event.amount,
      event.currency,
      event.id,
    );
    this.logger.log(`Payment confirmation sent for payment: ${event.id}`);
  }

  async handlePaymentFailed(event: PaymentFailedEvent): Promise<void> {
    this.logger.log(`Processing payment.failed event for payment: ${event.id}`);
    const userEmail = `user-${event.userId}@example.com`;
    await this.emailService.sendPaymentFailedNotification(
      userEmail,
      event.amount,
      event.currency,
      event.reason,
    );
    this.logger.log(`Payment failure notification sent for payment: ${event.id}`);
  }

  async handlePaymentRefunded(event: PaymentRefundedEvent): Promise<void> {
    this.logger.log(`Processing payment.refunded event for payment: ${event.id}`);
    const userEmail = `user-${event.userId}@example.com`;
    await this.emailService.sendRefundNotification(
      userEmail,
      event.amount,
      event.currency,
      event.id,
    );
    this.logger.log(`Refund notification sent for payment: ${event.id}`);
  }

  // Auth Event Handlers
  async handleAuthUserRegistered(event: UserRegisteredEvent): Promise<void> {
    this.logger.log(`Processing auth.user.registered event for user: ${event.id}`);
    await this.emailService.sendAuthWelcomeEmail(event.email, event.name, event.provider);
    this.logger.log(`Auth welcome email sent to: ${event.email}`);
  }

  async handlePasswordResetRequested(event: PasswordResetRequestedEvent): Promise<void> {
    this.logger.log(`Processing password reset request for user: ${event.userId}`);
    await this.emailService.sendPasswordResetEmail(event.email, event.token, event.expiresAt);
    this.logger.log(`Password reset email sent to: ${event.email}`);
  }

  async handlePasswordResetCompleted(event: PasswordResetCompletedEvent): Promise<void> {
    this.logger.log(`Processing password reset completed for user: ${event.userId}`);
    await this.emailService.sendPasswordResetConfirmation(event.email);
    this.logger.log(`Password reset confirmation sent to: ${event.email}`);
  }

  async handlePasswordChanged(event: PasswordChangedEvent): Promise<void> {
    this.logger.log(`Processing password changed for user: ${event.userId}`);
    await this.emailService.sendPasswordChangedNotification(event.email);
    this.logger.log(`Password changed notification sent to: ${event.email}`);
  }
}
