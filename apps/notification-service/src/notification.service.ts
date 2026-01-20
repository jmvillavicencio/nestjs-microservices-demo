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

/**
 * Service responsible for handling notification events and sending appropriate emails.
 * Listens to events from User, Payment, and Auth services via RabbitMQ.
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly emailService: EmailService) {}

  /**
   * Handles the user created event by sending a welcome email.
   * @param event - The user created event containing user details
   */
  async handleUserCreated(event: UserCreatedEvent): Promise<void> {
    this.logger.log(`Processing user.created event for user: ${event.id}`);
    await this.emailService.sendWelcomeEmail(event.email, event.name);
    this.logger.log(`Welcome email sent to: ${event.email}`);
  }

  /**
   * Handles the user updated event by sending an account update notification.
   * @param event - The user updated event containing updated user details
   */
  async handleUserUpdated(event: UserUpdatedEvent): Promise<void> {
    this.logger.log(`Processing user.updated event for user: ${event.id}`);
    await this.emailService.sendAccountUpdateNotification(event.email, event.name);
    this.logger.log(`Account update notification sent to: ${event.email}`);
  }

  /**
   * Handles the user deleted event by logging the deletion.
   * Note: Email cannot be sent as user data is already deleted.
   * @param event - The user deleted event containing the user ID
   */
  async handleUserDeleted(event: UserDeletedEvent): Promise<void> {
    this.logger.log(`Processing user.deleted event for user: ${event.id}`);
    this.logger.log(`User ${event.id} deleted. Account deletion notification would be sent.`);
  }

  /**
   * Handles the payment created event by logging payment creation.
   * @param event - The payment created event containing payment details
   */
  async handlePaymentCreated(event: PaymentCreatedEvent): Promise<void> {
    this.logger.log(`Processing payment.created event for payment: ${event.id}`);
    this.logger.log(`Payment ${event.id} created for user ${event.userId}. Amount: ${event.currency} ${event.amount}`);
  }

  /**
   * Handles the payment completed event by sending a payment confirmation email.
   * @param event - The payment completed event containing payment details
   */
  async handlePaymentCompleted(event: PaymentCompletedEvent): Promise<void> {
    this.logger.log(`Processing payment.completed event for payment: ${event.id}`);
    const userEmail = `user-${event.userId}@example.com`;
    await this.emailService.sendPaymentConfirmation(
      userEmail,
      event.amount,
      event.currency,
      event.id,
    );
    this.logger.log(`Payment confirmation sent for payment: ${event.id}`);
  }

  /**
   * Handles the payment failed event by sending a payment failure notification.
   * @param event - The payment failed event containing failure details
   */
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

  /**
   * Handles the payment refunded event by sending a refund notification.
   * @param event - The payment refunded event containing refund details
   */
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

  /**
   * Handles the auth user registered event by sending a welcome email.
   * @param event - The user registered event containing user details
   */
  async handleAuthUserRegistered(event: UserRegisteredEvent): Promise<void> {
    this.logger.log(`Processing auth.user.registered event for user: ${event.id}`);
    await this.emailService.sendAuthWelcomeEmail(event.email, event.name, event.provider);
    this.logger.log(`Auth welcome email sent to: ${event.email}`);
  }

  /**
   * Handles the password reset requested event by sending a reset email.
   * @param event - The password reset requested event containing reset details
   */
  async handlePasswordResetRequested(event: PasswordResetRequestedEvent): Promise<void> {
    this.logger.log(`Processing password reset request for user: ${event.userId}`);
    await this.emailService.sendPasswordResetEmail(event.email, event.token, event.expiresAt);
    this.logger.log(`Password reset email sent to: ${event.email}`);
  }

  /**
   * Handles the password reset completed event by sending a confirmation email.
   * @param event - The password reset completed event containing user details
   */
  async handlePasswordResetCompleted(event: PasswordResetCompletedEvent): Promise<void> {
    this.logger.log(`Processing password reset completed for user: ${event.userId}`);
    await this.emailService.sendPasswordResetConfirmation(event.email);
    this.logger.log(`Password reset confirmation sent to: ${event.email}`);
  }

  /**
   * Handles the password changed event by sending a notification email.
   * @param event - The password changed event containing user details
   */
  async handlePasswordChanged(event: PasswordChangedEvent): Promise<void> {
    this.logger.log(`Processing password changed for user: ${event.userId}`);
    await this.emailService.sendPasswordChangedNotification(event.email);
    this.logger.log(`Password changed notification sent to: ${event.email}`);
  }
}
