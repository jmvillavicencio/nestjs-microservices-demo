import { RpcException } from '@nestjs/microservices';
import { ErrorCode, createStructuredError } from './errors';

/**
 * Custom RpcException that wraps a structured error.
 * The structured error is serialized to JSON and can be parsed by the API Gateway's exception filter.
 */
export class StructuredRpcException extends RpcException {
  constructor(
    code: ErrorCode,
    message: string,
    field?: string,
    details?: Record<string, unknown>,
  ) {
    const structuredError = createStructuredError(code, message, field, details);
    super(JSON.stringify(structuredError));
  }
}

/**
 * Factory object with convenience methods for creating common application errors.
 * Use these instead of throwing raw RpcExceptions with string messages.
 */
export const AppErrors = {
  // User errors
  userNotFound: (userId?: string) =>
    new StructuredRpcException(
      'USER_NOT_FOUND',
      'User not found',
      undefined,
      userId ? { userId } : undefined,
    ),

  userAlreadyExists: (email: string) =>
    new StructuredRpcException(
      'USER_ALREADY_EXISTS',
      'User with this email already exists',
      'email',
      { email },
    ),

  emailAlreadyInUse: (email: string) =>
    new StructuredRpcException(
      'EMAIL_ALREADY_IN_USE',
      'Email already in use',
      'email',
      { email },
    ),

  // Auth errors
  invalidCredentials: () =>
    new StructuredRpcException(
      'INVALID_CREDENTIALS',
      'Invalid email or password',
    ),

  invalidToken: () =>
    new StructuredRpcException('INVALID_TOKEN', 'Invalid token'),

  tokenExpired: () =>
    new StructuredRpcException('TOKEN_EXPIRED', 'Token has expired'),

  refreshTokenInvalid: () =>
    new StructuredRpcException(
      'REFRESH_TOKEN_INVALID',
      'Invalid or expired refresh token',
    ),

  oauthProviderMismatch: (provider: string) =>
    new StructuredRpcException(
      'OAUTH_PROVIDER_MISMATCH',
      'An account with this email already exists. Please sign in with your original method.',
      undefined,
      { provider },
    ),

  googleTokenInvalid: () =>
    new StructuredRpcException('GOOGLE_TOKEN_INVALID', 'Invalid Google token'),

  googleEmailNotVerified: () =>
    new StructuredRpcException(
      'GOOGLE_EMAIL_NOT_VERIFIED',
      'Google email not verified',
    ),

  appleTokenInvalid: () =>
    new StructuredRpcException('APPLE_TOKEN_INVALID', 'Invalid Apple token'),

  passwordTooWeak: (message?: string) =>
    new StructuredRpcException(
      'PASSWORD_TOO_WEAK',
      message || 'Password does not meet requirements',
      'password',
    ),

  passwordResetTokenInvalid: () =>
    new StructuredRpcException(
      'PASSWORD_RESET_TOKEN_INVALID',
      'Invalid or expired password reset token',
    ),

  currentPasswordIncorrect: () =>
    new StructuredRpcException(
      'CURRENT_PASSWORD_INCORRECT',
      'Current password is incorrect',
      'currentPassword',
    ),

  passwordChangeNotAvailable: () =>
    new StructuredRpcException(
      'PASSWORD_CHANGE_NOT_AVAILABLE',
      'Password change not available for OAuth users',
    ),

  // Payment errors
  paymentNotFound: (paymentId?: string) =>
    new StructuredRpcException(
      'PAYMENT_NOT_FOUND',
      'Payment not found',
      undefined,
      paymentId ? { paymentId } : undefined,
    ),

  refundNotAllowed: () =>
    new StructuredRpcException(
      'REFUND_NOT_ALLOWED',
      'Can only refund completed payments',
    ),

  refundAmountExceedsPayment: (refundAmount: number, paymentAmount: number) =>
    new StructuredRpcException(
      'REFUND_AMOUNT_EXCEEDS_PAYMENT',
      'Refund amount cannot exceed payment amount',
      'amount',
      { refundAmount, paymentAmount },
    ),
};
