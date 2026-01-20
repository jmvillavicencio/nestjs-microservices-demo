import { Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import {
  CreatePaymentRequest,
  GetPaymentRequest,
  GetPaymentsByUserRequest,
  ProcessRefundRequest,
  PaymentResponse,
  PaymentsResponse,
} from '@app/proto';
import { RabbitMQService } from './rabbitmq.service';
import {
  PAYMENT_EVENTS,
  PaymentCreatedEvent,
  PaymentCompletedEvent,
  PaymentRefundedEvent,
} from '@app/common';
import { PrismaService } from '@app/prisma';
import { Payment, PaymentStatus } from '@prisma/client';

/**
 * Service responsible for payment processing operations.
 * Handles payment creation, retrieval, and refund operations with PostgreSQL persistence via Prisma.
 */
@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rabbitMQService: RabbitMQService,
  ) {}

  /**
   * Creates a new payment and processes it.
   * @param data - The payment creation request containing userId, amount, currency, description, and paymentMethod
   * @returns The created payment response with final status (completed or failed)
   */
  async createPayment(data: CreatePaymentRequest): Promise<PaymentResponse> {
    this.logger.log(`Creating payment for user: ${data.userId}, amount: ${data.amount}`);

    const payment = await this.prisma.payment.create({
      data: {
        userId: data.userId,
        amount: data.amount,
        currency: data.currency || 'USD',
        status: PaymentStatus.pending,
        description: data.description,
        paymentMethod: data.paymentMethod,
      },
    });

    this.logger.log(`Payment created: ${payment.id}`);

    // Emit payment created event
    const createdEvent: PaymentCreatedEvent = {
      id: payment.id,
      userId: payment.userId,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      description: payment.description,
      createdAt: payment.createdAt.toISOString(),
    };
    await this.rabbitMQService.emit(PAYMENT_EVENTS.PAYMENT_CREATED, createdEvent);

    // Process the payment (simulate payment gateway)
    const processedPayment = await this.processPayment(payment);

    return this.toResponse(processedPayment);
  }

  /**
   * Simulates payment processing with a payment gateway.
   * In production, this would integrate with a real payment provider.
   * @param payment - The payment to process
   * @returns The payment with updated status
   */
  private async processPayment(payment: Payment): Promise<Payment> {
    this.logger.log(`Processing payment: ${payment.id}`);

    // Simulate payment processing delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Simulate 90% success rate
    const isSuccessful = Math.random() < 0.9;

    if (isSuccessful) {
      const updatedPayment = await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.completed },
      });

      this.logger.log(`Payment completed: ${payment.id}`);

      const completedEvent: PaymentCompletedEvent = {
        id: updatedPayment.id,
        userId: updatedPayment.userId,
        amount: updatedPayment.amount,
        currency: updatedPayment.currency,
        completedAt: updatedPayment.updatedAt.toISOString(),
      };
      await this.rabbitMQService.emit(PAYMENT_EVENTS.PAYMENT_COMPLETED, completedEvent);

      return updatedPayment;
    } else {
      const updatedPayment = await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.failed },
      });

      this.logger.warn(`Payment failed: ${payment.id}`);

      await this.rabbitMQService.emit(PAYMENT_EVENTS.PAYMENT_FAILED, {
        id: updatedPayment.id,
        userId: updatedPayment.userId,
        amount: updatedPayment.amount,
        currency: updatedPayment.currency,
        reason: 'Payment processor declined the transaction',
        failedAt: updatedPayment.updatedAt.toISOString(),
      });

      return updatedPayment;
    }
  }

  /**
   * Retrieves a payment by its unique identifier.
   * @param data - The request containing the payment ID
   * @returns The payment response
   * @throws RpcException if the payment is not found
   */
  async getPayment(data: GetPaymentRequest): Promise<PaymentResponse> {
    this.logger.log(`Fetching payment: ${data.id}`);

    const payment = await this.prisma.payment.findUnique({
      where: { id: data.id },
    });

    if (!payment) {
      this.logger.warn(`Payment not found: ${data.id}`);
      throw new RpcException('Payment not found');
    }

    return this.toResponse(payment);
  }

  /**
   * Retrieves a paginated list of payments for a specific user.
   * @param data - The request containing userId and pagination parameters
   * @returns A response containing the list of payments and total count
   */
  async getPaymentsByUser(data: GetPaymentsByUserRequest): Promise<PaymentsResponse> {
    const page = data.page || 1;
    const limit = data.limit || 10;
    const skip = (page - 1) * limit;

    this.logger.log(`Fetching payments for user: ${data.userId}, page: ${page}, limit: ${limit}`);

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where: { userId: data.userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payment.count({
        where: { userId: data.userId },
      }),
    ]);

    return {
      payments: payments.map((p) => this.toResponse(p)),
      total,
    };
  }

  /**
   * Processes a refund for a completed payment.
   * @param data - The refund request containing paymentId, amount, and reason
   * @returns The refunded payment response
   * @throws RpcException if the payment is not found, not completed, or refund amount exceeds payment amount
   */
  async processRefund(data: ProcessRefundRequest): Promise<PaymentResponse> {
    this.logger.log(`Processing refund for payment: ${data.paymentId}, amount: ${data.amount}`);

    const payment = await this.prisma.payment.findUnique({
      where: { id: data.paymentId },
    });

    if (!payment) {
      this.logger.warn(`Refund failed: payment ${data.paymentId} not found`);
      throw new RpcException('Payment not found');
    }

    if (payment.status !== PaymentStatus.completed) {
      this.logger.warn(`Refund failed: payment ${data.paymentId} is not completed`);
      throw new RpcException('Can only refund completed payments');
    }

    if (data.amount > payment.amount) {
      this.logger.warn(`Refund failed: amount ${data.amount} exceeds payment amount ${payment.amount}`);
      throw new RpcException('Refund amount cannot exceed payment amount');
    }

    const updatedPayment = await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.refunded },
    });

    this.logger.log(`Refund processed: ${payment.id}`);

    // Emit refund event
    const refundEvent: PaymentRefundedEvent = {
      id: updatedPayment.id,
      userId: updatedPayment.userId,
      amount: data.amount,
      currency: updatedPayment.currency,
      reason: data.reason,
      refundedAt: updatedPayment.updatedAt.toISOString(),
    };
    await this.rabbitMQService.emit(PAYMENT_EVENTS.PAYMENT_REFUNDED, refundEvent);

    return this.toResponse(updatedPayment);
  }

  /**
   * Converts a Payment entity to a PaymentResponse DTO.
   * @param payment - The Payment entity from the database
   * @returns The formatted payment response
   */
  private toResponse(payment: Payment): PaymentResponse {
    return {
      id: payment.id,
      userId: payment.userId,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      description: payment.description,
      paymentMethod: payment.paymentMethod,
      createdAt: payment.createdAt.toISOString(),
      updatedAt: payment.updatedAt.toISOString(),
    };
  }
}
