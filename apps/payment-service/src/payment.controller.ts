import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { PaymentService } from './payment.service';
import {
  CreatePaymentRequest,
  GetPaymentRequest,
  GetPaymentsByUserRequest,
  ProcessRefundRequest,
  PaymentResponse,
  PaymentsResponse,
  PAYMENT_SERVICE_NAME,
} from '@app/proto';

@Controller()
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @GrpcMethod(PAYMENT_SERVICE_NAME, 'CreatePayment')
  async createPayment(data: CreatePaymentRequest): Promise<PaymentResponse> {
    return this.paymentService.createPayment(data);
  }

  @GrpcMethod(PAYMENT_SERVICE_NAME, 'GetPayment')
  async getPayment(data: GetPaymentRequest): Promise<PaymentResponse> {
    return this.paymentService.getPayment(data);
  }

  @GrpcMethod(PAYMENT_SERVICE_NAME, 'GetPaymentsByUser')
  async getPaymentsByUser(data: GetPaymentsByUserRequest): Promise<PaymentsResponse> {
    return this.paymentService.getPaymentsByUser(data);
  }

  @GrpcMethod(PAYMENT_SERVICE_NAME, 'ProcessRefund')
  async processRefund(data: ProcessRefundRequest): Promise<PaymentResponse> {
    return this.paymentService.processRefund(data);
  }
}
