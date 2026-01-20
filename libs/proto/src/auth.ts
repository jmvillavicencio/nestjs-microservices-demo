// Registration & Login
export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

// OAuth
export interface GoogleAuthRequest {
  idToken: string;
}

export interface AppleAuthRequest {
  identityToken: string;
  authorizationCode: string;
  firstName?: string;
  lastName?: string;
}

// Token Management
export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface ValidateTokenRequest {
  accessToken: string;
}

export interface LogoutRequest {
  userId: string;
  refreshToken: string;
}

// Password Management
export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  userId: string;
  currentPassword: string;
  newPassword: string;
}

// Responses
export interface UserInfo {
  id: string;
  email: string;
  name: string;
  provider: string;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: UserInfo;
  expiresIn: number;
}

export interface ValidateTokenResponse {
  valid: boolean;
  user?: UserInfo;
}

export interface LogoutResponse {
  success: boolean;
}

export interface ForgotPasswordResponse {
  success: boolean;
  message: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  message: string;
}

export interface ChangePasswordResponse {
  success: boolean;
  message: string;
}

export interface AuthServiceClient {
  register(request: RegisterRequest): any;
  login(request: LoginRequest): any;
  googleAuth(request: GoogleAuthRequest): any;
  appleAuth(request: AppleAuthRequest): any;
  refreshToken(request: RefreshTokenRequest): any;
  validateToken(request: ValidateTokenRequest): any;
  logout(request: LogoutRequest): any;
  forgotPassword(request: ForgotPasswordRequest): any;
  resetPassword(request: ResetPasswordRequest): any;
  changePassword(request: ChangePasswordRequest): any;
}

export const AUTH_SERVICE_NAME = 'AuthService';
export const AUTH_PACKAGE_NAME = 'auth';
