export const USER_EVENTS = {
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
} as const;

export const PAYMENT_EVENTS = {
  PAYMENT_CREATED: 'payment.created',
  PAYMENT_COMPLETED: 'payment.completed',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_REFUNDED: 'payment.refunded',
} as const;

export interface UserCreatedEvent {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface UserUpdatedEvent {
  id: string;
  email: string;
  name: string;
  updatedAt: string;
}

export interface UserDeletedEvent {
  id: string;
  deletedAt: string;
}

export interface PaymentCreatedEvent {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
  createdAt: string;
}

export interface PaymentCompletedEvent {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  completedAt: string;
}

export interface PaymentFailedEvent {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  reason: string;
  failedAt: string;
}

export interface PaymentRefundedEvent {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  reason: string;
  refundedAt: string;
}
