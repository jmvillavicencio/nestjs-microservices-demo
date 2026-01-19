export const SERVICES = {
  USER_SERVICE: 'USER_SERVICE',
  PAYMENT_SERVICE: 'PAYMENT_SERVICE',
  NOTIFICATION_SERVICE: 'NOTIFICATION_SERVICE',
} as const;

export const RABBITMQ_QUEUES = {
  NOTIFICATIONS: 'notifications_queue',
} as const;

export const GRPC_PACKAGES = {
  USER: 'user',
  PAYMENT: 'payment',
} as const;
