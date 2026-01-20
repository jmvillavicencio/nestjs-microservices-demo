import { Test, TestingModule } from '@nestjs/testing';
import { RpcException } from '@nestjs/microservices';
import { PaymentService } from './payment.service';
import { RabbitMQService } from './rabbitmq.service';
import { PrismaService } from '@app/prisma';
import { PAYMENT_EVENTS } from '@app/common';
import { PaymentStatus } from '@prisma/client';

describe('PaymentService', () => {
  let service: PaymentService;
  let prismaService: PrismaService;
  let rabbitMQService: RabbitMQService;

  const mockPrismaService = {
    payment: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockRabbitMQService = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RabbitMQService, useValue: mockRabbitMQService },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    prismaService = module.get<PrismaService>(PrismaService);
    rabbitMQService = module.get<RabbitMQService>(RabbitMQService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPayment', () => {
    const createPaymentRequest = {
      userId: 'user-123',
      amount: 100.0,
      currency: 'USD',
      description: 'Test payment',
      paymentMethod: 'credit_card',
    };

    const mockPayment = {
      id: 'payment-123',
      userId: 'user-123',
      amount: 100.0,
      currency: 'USD',
      status: PaymentStatus.pending,
      description: 'Test payment',
      paymentMethod: 'credit_card',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should create a payment successfully', async () => {
      const completedPayment = { ...mockPayment, status: PaymentStatus.completed };
      mockPrismaService.payment.create.mockResolvedValue(mockPayment);
      mockPrismaService.payment.update.mockResolvedValue(completedPayment);
      mockRabbitMQService.emit.mockResolvedValue(undefined);

      // Mock random to always succeed
      jest.spyOn(Math, 'random').mockReturnValue(0.5);

      const result = await service.createPayment(createPaymentRequest);

      expect(result.id).toBe(mockPayment.id);
      expect(mockRabbitMQService.emit).toHaveBeenCalledWith(
        PAYMENT_EVENTS.PAYMENT_CREATED,
        expect.any(Object),
      );
    });

    it('should handle payment failure', async () => {
      const failedPayment = { ...mockPayment, status: PaymentStatus.failed };
      mockPrismaService.payment.create.mockResolvedValue(mockPayment);
      mockPrismaService.payment.update.mockResolvedValue(failedPayment);
      mockRabbitMQService.emit.mockResolvedValue(undefined);

      // Mock random to always fail
      jest.spyOn(Math, 'random').mockReturnValue(0.95);

      const result = await service.createPayment(createPaymentRequest);

      expect(result.status).toBe(PaymentStatus.failed);
      expect(mockRabbitMQService.emit).toHaveBeenCalledWith(
        PAYMENT_EVENTS.PAYMENT_FAILED,
        expect.any(Object),
      );
    });
  });

  describe('getPayment', () => {
    const mockPayment = {
      id: 'payment-123',
      userId: 'user-123',
      amount: 100.0,
      currency: 'USD',
      status: PaymentStatus.completed,
      description: 'Test payment',
      paymentMethod: 'credit_card',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should return a payment by id', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue(mockPayment);

      const result = await service.getPayment({ id: 'payment-123' });

      expect(result.id).toBe(mockPayment.id);
      expect(result.amount).toBe(mockPayment.amount);
    });

    it('should throw RpcException if payment not found', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue(null);

      await expect(service.getPayment({ id: 'non-existent' })).rejects.toThrow(
        RpcException,
      );
    });
  });

  describe('getPaymentsByUser', () => {
    const mockPayments = [
      {
        id: 'payment-1',
        userId: 'user-123',
        amount: 100.0,
        currency: 'USD',
        status: PaymentStatus.completed,
        description: 'Payment 1',
        paymentMethod: 'credit_card',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'payment-2',
        userId: 'user-123',
        amount: 50.0,
        currency: 'USD',
        status: PaymentStatus.pending,
        description: 'Payment 2',
        paymentMethod: 'debit_card',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    it('should return paginated payments for user', async () => {
      mockPrismaService.payment.findMany.mockResolvedValue(mockPayments);
      mockPrismaService.payment.count.mockResolvedValue(2);

      const result = await service.getPaymentsByUser({
        userId: 'user-123',
        page: 1,
        limit: 10,
      });

      expect(result.payments).toHaveLength(2);
      expect(result.total).toBe(2);
    });
  });

  describe('processRefund', () => {
    const mockPayment = {
      id: 'payment-123',
      userId: 'user-123',
      amount: 100.0,
      currency: 'USD',
      status: PaymentStatus.completed,
      description: 'Test payment',
      paymentMethod: 'credit_card',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should process refund successfully', async () => {
      const refundedPayment = { ...mockPayment, status: PaymentStatus.refunded };
      mockPrismaService.payment.findUnique.mockResolvedValue(mockPayment);
      mockPrismaService.payment.update.mockResolvedValue(refundedPayment);
      mockRabbitMQService.emit.mockResolvedValue(undefined);

      const result = await service.processRefund({
        paymentId: 'payment-123',
        amount: 50.0,
        reason: 'Customer request',
      });

      expect(result.status).toBe(PaymentStatus.refunded);
      expect(mockRabbitMQService.emit).toHaveBeenCalledWith(
        PAYMENT_EVENTS.PAYMENT_REFUNDED,
        expect.any(Object),
      );
    });

    it('should throw RpcException if payment not found', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue(null);

      await expect(
        service.processRefund({
          paymentId: 'non-existent',
          amount: 50.0,
          reason: 'Test',
        }),
      ).rejects.toThrow(RpcException);
    });

    it('should throw RpcException if payment is not completed', async () => {
      const pendingPayment = { ...mockPayment, status: PaymentStatus.pending };
      mockPrismaService.payment.findUnique.mockResolvedValue(pendingPayment);

      await expect(
        service.processRefund({
          paymentId: 'payment-123',
          amount: 50.0,
          reason: 'Test',
        }),
      ).rejects.toThrow(RpcException);
    });

    it('should throw RpcException if refund amount exceeds payment amount', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue(mockPayment);

      await expect(
        service.processRefund({
          paymentId: 'payment-123',
          amount: 200.0,
          reason: 'Test',
        }),
      ).rejects.toThrow(RpcException);
    });
  });
});
