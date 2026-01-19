import { Controller } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { NotificationService } from './notification.service';
import {
  USER_EVENTS,
  PAYMENT_EVENTS,
  UserCreatedEvent,
  UserUpdatedEvent,
  UserDeletedEvent,
  PaymentCreatedEvent,
  PaymentCompletedEvent,
  PaymentFailedEvent,
  PaymentRefundedEvent,
} from '@app/common';

@Controller()
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @EventPattern(USER_EVENTS.USER_CREATED)
  async handleUserCreated(
    @Payload() data: UserCreatedEvent,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      await this.notificationService.handleUserCreated(data);
      channel.ack(originalMsg);
    } catch (error) {
      // Negative acknowledgment - message will be requeued
      channel.nack(originalMsg, false, true);
    }
  }

  @EventPattern(USER_EVENTS.USER_UPDATED)
  async handleUserUpdated(
    @Payload() data: UserUpdatedEvent,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      await this.notificationService.handleUserUpdated(data);
      channel.ack(originalMsg);
    } catch (error) {
      channel.nack(originalMsg, false, true);
    }
  }

  @EventPattern(USER_EVENTS.USER_DELETED)
  async handleUserDeleted(
    @Payload() data: UserDeletedEvent,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      await this.notificationService.handleUserDeleted(data);
      channel.ack(originalMsg);
    } catch (error) {
      channel.nack(originalMsg, false, true);
    }
  }

  @EventPattern(PAYMENT_EVENTS.PAYMENT_CREATED)
  async handlePaymentCreated(
    @Payload() data: PaymentCreatedEvent,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      await this.notificationService.handlePaymentCreated(data);
      channel.ack(originalMsg);
    } catch (error) {
      channel.nack(originalMsg, false, true);
    }
  }

  @EventPattern(PAYMENT_EVENTS.PAYMENT_COMPLETED)
  async handlePaymentCompleted(
    @Payload() data: PaymentCompletedEvent,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      await this.notificationService.handlePaymentCompleted(data);
      channel.ack(originalMsg);
    } catch (error) {
      channel.nack(originalMsg, false, true);
    }
  }

  @EventPattern(PAYMENT_EVENTS.PAYMENT_FAILED)
  async handlePaymentFailed(
    @Payload() data: PaymentFailedEvent,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      await this.notificationService.handlePaymentFailed(data);
      channel.ack(originalMsg);
    } catch (error) {
      channel.nack(originalMsg, false, true);
    }
  }

  @EventPattern(PAYMENT_EVENTS.PAYMENT_REFUNDED)
  async handlePaymentRefunded(
    @Payload() data: PaymentRefundedEvent,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      await this.notificationService.handlePaymentRefunded(data);
      channel.ack(originalMsg);
    } catch (error) {
      channel.nack(originalMsg, false, true);
    }
  }
}
