import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
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

type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

interface Payment {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  description: string;
  paymentMethod: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class PaymentService {
  private payments: Map<string, Payment> = new Map();

  constructor(private readonly rabbitMQService: RabbitMQService) {}

  async createPayment(data: CreatePaymentRequest): Promise<PaymentResponse> {
    const id = uuidv4();
    const now = new Date();

    const payment: Payment = {
      id,
      userId: data.userId,
      amount: data.amount,
      currency: data.currency || 'USD',
      status: 'pending',
      description: data.description,
      paymentMethod: data.paymentMethod,
      createdAt: now,
      updatedAt: now,
    };

    this.payments.set(id, payment);

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

    // Simulate payment processing (in real app, this would be async)
    await this.processPayment(payment);

    return this.toResponse(payment);
  }

  private async processPayment(payment: Payment): Promise<void> {
    // Simulate payment processing delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Simulate 90% success rate
    const isSuccessful = Math.random() < 0.9;

    if (isSuccessful) {
      payment.status = 'completed';
      payment.updatedAt = new Date();
      this.payments.set(payment.id, payment);

      const completedEvent: PaymentCompletedEvent = {
        id: payment.id,
        userId: payment.userId,
        amount: payment.amount,
        currency: payment.currency,
        completedAt: payment.updatedAt.toISOString(),
      };
      await this.rabbitMQService.emit(PAYMENT_EVENTS.PAYMENT_COMPLETED, completedEvent);
    } else {
      payment.status = 'failed';
      payment.updatedAt = new Date();
      this.payments.set(payment.id, payment);

      await this.rabbitMQService.emit(PAYMENT_EVENTS.PAYMENT_FAILED, {
        id: payment.id,
        userId: payment.userId,
        amount: payment.amount,
        currency: payment.currency,
        reason: 'Payment processor declined the transaction',
        failedAt: payment.updatedAt.toISOString(),
      });
    }
  }

  async getPayment(data: GetPaymentRequest): Promise<PaymentResponse> {
    const payment = this.payments.get(data.id);

    if (!payment) {
      throw new RpcException('Payment not found');
    }

    return this.toResponse(payment);
  }

  async getPaymentsByUser(data: GetPaymentsByUserRequest): Promise<PaymentsResponse> {
    const page = data.page || 1;
    const limit = data.limit || 10;
    const skip = (page - 1) * limit;

    const userPayments = Array.from(this.payments.values()).filter(
      (p) => p.userId === data.userId,
    );
    const paginatedPayments = userPayments.slice(skip, skip + limit);

    return {
      payments: paginatedPayments.map((p) => this.toResponse(p)),
      total: userPayments.length,
    };
  }

  async processRefund(data: ProcessRefundRequest): Promise<PaymentResponse> {
    const payment = this.payments.get(data.paymentId);

    if (!payment) {
      throw new RpcException('Payment not found');
    }

    if (payment.status !== 'completed') {
      throw new RpcException('Can only refund completed payments');
    }

    if (data.amount > payment.amount) {
      throw new RpcException('Refund amount cannot exceed payment amount');
    }

    payment.status = 'refunded';
    payment.updatedAt = new Date();
    this.payments.set(payment.id, payment);

    // Emit refund event
    const refundEvent: PaymentRefundedEvent = {
      id: payment.id,
      userId: payment.userId,
      amount: data.amount,
      currency: payment.currency,
      reason: data.reason,
      refundedAt: payment.updatedAt.toISOString(),
    };
    await this.rabbitMQService.emit(PAYMENT_EVENTS.PAYMENT_REFUNDED, refundEvent);

    return this.toResponse(payment);
  }

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
