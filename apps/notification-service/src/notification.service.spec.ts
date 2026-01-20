import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notification.service';
import { EmailService } from './email.service';
import {
  UserCreatedEvent,
  UserUpdatedEvent,
  UserDeletedEvent,
  PaymentCompletedEvent,
  PaymentFailedEvent,
  PaymentRefundedEvent,
  UserRegisteredEvent,
  PasswordResetRequestedEvent,
  PasswordResetCompletedEvent,
  PasswordChangedEvent,
} from '@app/common';

describe('NotificationService', () => {
  let service: NotificationService;
  let emailService: EmailService;

  const mockEmailService = {
    sendWelcomeEmail: jest.fn(),
    sendAccountUpdateNotification: jest.fn(),
    sendAccountDeletedNotification: jest.fn(),
    sendPaymentConfirmation: jest.fn(),
    sendPaymentFailedNotification: jest.fn(),
    sendRefundNotification: jest.fn(),
    sendAuthWelcomeEmail: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
    sendPasswordResetConfirmation: jest.fn(),
    sendPasswordChangedNotification: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    emailService = module.get<EmailService>(EmailService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleUserCreated', () => {
    it('should send welcome email', async () => {
      const event: UserCreatedEvent = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date().toISOString(),
      };

      mockEmailService.sendWelcomeEmail.mockResolvedValue(undefined);

      await service.handleUserCreated(event);

      expect(mockEmailService.sendWelcomeEmail).toHaveBeenCalledWith(
        event.email,
        event.name,
      );
    });
  });

  describe('handleUserUpdated', () => {
    it('should send account update notification', async () => {
      const event: UserUpdatedEvent = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Updated User',
        updatedAt: new Date().toISOString(),
      };

      mockEmailService.sendAccountUpdateNotification.mockResolvedValue(undefined);

      await service.handleUserUpdated(event);

      expect(mockEmailService.sendAccountUpdateNotification).toHaveBeenCalledWith(
        event.email,
        event.name,
      );
    });
  });

  describe('handleUserDeleted', () => {
    it('should log deletion event', async () => {
      const event: UserDeletedEvent = {
        id: 'user-123',
        deletedAt: new Date().toISOString(),
      };

      await expect(service.handleUserDeleted(event)).resolves.not.toThrow();
    });
  });

  describe('handlePaymentCompleted', () => {
    it('should send payment confirmation email', async () => {
      const event: PaymentCompletedEvent = {
        id: 'payment-123',
        userId: 'user-123',
        amount: 100.0,
        currency: 'USD',
        completedAt: new Date().toISOString(),
      };

      mockEmailService.sendPaymentConfirmation.mockResolvedValue(undefined);

      await service.handlePaymentCompleted(event);

      expect(mockEmailService.sendPaymentConfirmation).toHaveBeenCalledWith(
        `user-${event.userId}@example.com`,
        event.amount,
        event.currency,
        event.id,
      );
    });
  });

  describe('handlePaymentFailed', () => {
    it('should send payment failed notification', async () => {
      const event: PaymentFailedEvent = {
        id: 'payment-123',
        userId: 'user-123',
        amount: 100.0,
        currency: 'USD',
        reason: 'Card declined',
        failedAt: new Date().toISOString(),
      };

      mockEmailService.sendPaymentFailedNotification.mockResolvedValue(undefined);

      await service.handlePaymentFailed(event);

      expect(mockEmailService.sendPaymentFailedNotification).toHaveBeenCalledWith(
        `user-${event.userId}@example.com`,
        event.amount,
        event.currency,
        event.reason,
      );
    });
  });

  describe('handlePaymentRefunded', () => {
    it('should send refund notification', async () => {
      const event: PaymentRefundedEvent = {
        id: 'payment-123',
        userId: 'user-123',
        amount: 50.0,
        currency: 'USD',
        reason: 'Customer request',
        refundedAt: new Date().toISOString(),
      };

      mockEmailService.sendRefundNotification.mockResolvedValue(undefined);

      await service.handlePaymentRefunded(event);

      expect(mockEmailService.sendRefundNotification).toHaveBeenCalledWith(
        `user-${event.userId}@example.com`,
        event.amount,
        event.currency,
        event.id,
      );
    });
  });

  describe('handleAuthUserRegistered', () => {
    it('should send auth welcome email', async () => {
      const event: UserRegisteredEvent = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        provider: 'google',
        createdAt: new Date().toISOString(),
      };

      mockEmailService.sendAuthWelcomeEmail.mockResolvedValue(undefined);

      await service.handleAuthUserRegistered(event);

      expect(mockEmailService.sendAuthWelcomeEmail).toHaveBeenCalledWith(
        event.email,
        event.name,
        event.provider,
      );
    });
  });

  describe('handlePasswordResetRequested', () => {
    it('should send password reset email', async () => {
      const event: PasswordResetRequestedEvent = {
        userId: 'user-123',
        email: 'test@example.com',
        token: 'reset-token',
        expiresAt: new Date().toISOString(),
        requestedAt: new Date().toISOString(),
      };

      mockEmailService.sendPasswordResetEmail.mockResolvedValue(undefined);

      await service.handlePasswordResetRequested(event);

      expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        event.email,
        event.token,
        event.expiresAt,
      );
    });
  });

  describe('handlePasswordResetCompleted', () => {
    it('should send password reset confirmation', async () => {
      const event: PasswordResetCompletedEvent = {
        userId: 'user-123',
        email: 'test@example.com',
        completedAt: new Date().toISOString(),
      };

      mockEmailService.sendPasswordResetConfirmation.mockResolvedValue(undefined);

      await service.handlePasswordResetCompleted(event);

      expect(mockEmailService.sendPasswordResetConfirmation).toHaveBeenCalledWith(
        event.email,
      );
    });
  });

  describe('handlePasswordChanged', () => {
    it('should send password changed notification', async () => {
      const event: PasswordChangedEvent = {
        userId: 'user-123',
        email: 'test@example.com',
        changedAt: new Date().toISOString(),
      };

      mockEmailService.sendPasswordChangedNotification.mockResolvedValue(undefined);

      await service.handlePasswordChanged(event);

      expect(mockEmailService.sendPasswordChangedNotification).toHaveBeenCalledWith(
        event.email,
      );
    });
  });
});
