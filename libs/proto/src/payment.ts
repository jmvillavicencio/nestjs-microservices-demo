import { Observable } from 'rxjs';

export interface CreatePaymentRequest {
  userId: string;
  amount: number;
  currency: string;
  description: string;
  paymentMethod: string;
}

export interface GetPaymentRequest {
  id: string;
}

export interface GetPaymentsByUserRequest {
  userId: string;
  page: number;
  limit: number;
}

export interface ProcessRefundRequest {
  paymentId: string;
  amount: number;
  reason: string;
}

export interface PaymentResponse {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
  paymentMethod: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentsResponse {
  payments: PaymentResponse[];
  total: number;
}

export interface PaymentServiceClient {
  createPayment(request: CreatePaymentRequest): Observable<PaymentResponse>;
  getPayment(request: GetPaymentRequest): Observable<PaymentResponse>;
  getPaymentsByUser(request: GetPaymentsByUserRequest): Observable<PaymentsResponse>;
  processRefund(request: ProcessRefundRequest): Observable<PaymentResponse>;
}

export const PAYMENT_SERVICE_NAME = 'PaymentService';
export const PAYMENT_PACKAGE_NAME = 'payment';
