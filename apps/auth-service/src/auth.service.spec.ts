import { Test, TestingModule } from '@nestjs/testing';
import { RpcException } from '@nestjs/microservices';
import { AuthService } from './auth.service';
import { TokenService } from './services/token.service';
import { PasswordService } from './services/password.service';
import { GoogleAuthService } from './services/google-auth.service';
import { AppleAuthService } from './services/apple-auth.service';
import { UserRepository } from './repositories/user.repository';
import { RabbitMQService } from './rabbitmq.service';
import { AuthProvider } from '@prisma/client';

describe('AuthService', () => {
  let service: AuthService;
  let tokenService: TokenService;
  let passwordService: PasswordService;
  let userRepository: UserRepository;
  let rabbitMQService: RabbitMQService;

  const mockTokenService = {
    generateTokenPair: jest.fn(),
    validateAccessToken: jest.fn(),
    validateRefreshToken: jest.fn(),
    revokeRefreshToken: jest.fn(),
    revokeAllUserTokens: jest.fn(),
    generatePasswordResetToken: jest.fn(),
  };

  const mockPasswordService = {
    hash: jest.fn(),
    compare: jest.fn(),
    validatePasswordStrength: jest.fn(),
  };

  const mockGoogleAuthService = {
    verifyIdToken: jest.fn(),
  };

  const mockAppleAuthService = {
    verifyIdentityToken: jest.fn(),
  };

  const mockUserRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findByProvider: jest.fn(),
    findByPasswordResetToken: jest.fn(),
    update: jest.fn(),
    setPasswordResetToken: jest.fn(),
    clearPasswordResetToken: jest.fn(),
  };

  const mockRabbitMQService = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: TokenService, useValue: mockTokenService },
        { provide: PasswordService, useValue: mockPasswordService },
        { provide: GoogleAuthService, useValue: mockGoogleAuthService },
        { provide: AppleAuthService, useValue: mockAppleAuthService },
        { provide: UserRepository, useValue: mockUserRepository },
        { provide: RabbitMQService, useValue: mockRabbitMQService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    tokenService = module.get<TokenService>(TokenService);
    passwordService = module.get<PasswordService>(PasswordService);
    userRepository = module.get<UserRepository>(UserRepository);
    rabbitMQService = module.get<RabbitMQService>(RabbitMQService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const registerRequest = {
      email: 'test@example.com',
      name: 'Test User',
      password: 'Password123!',
    };

    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      password: 'hashed_password',
      provider: AuthProvider.email,
      providerId: null,
      passwordResetToken: null,
      passwordResetExpires: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should register a user successfully', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockPasswordService.validatePasswordStrength.mockReturnValue({ valid: true });
      mockPasswordService.hash.mockResolvedValue('hashed_password');
      mockUserRepository.create.mockResolvedValue(mockUser);
      mockTokenService.generateTokenPair.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 900,
      });
      mockRabbitMQService.emit.mockResolvedValue(undefined);

      const result = await service.register(registerRequest);

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(result.user.email).toBe(mockUser.email);
    });

    it('should throw RpcException if user already exists', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);

      await expect(service.register(registerRequest)).rejects.toThrow(
        RpcException,
      );
    });

    it('should throw RpcException if password is invalid', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockPasswordService.validatePasswordStrength.mockReturnValue({
        valid: false,
        message: 'Password too weak',
      });

      await expect(service.register(registerRequest)).rejects.toThrow(
        RpcException,
      );
    });
  });

  describe('login', () => {
    const loginRequest = {
      email: 'test@example.com',
      password: 'Password123!',
    };

    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      password: 'hashed_password',
      provider: AuthProvider.email,
      providerId: null,
      passwordResetToken: null,
      passwordResetExpires: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should login successfully', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockPasswordService.compare.mockResolvedValue(true);
      mockTokenService.generateTokenPair.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 900,
      });
      mockRabbitMQService.emit.mockResolvedValue(undefined);

      const result = await service.login(loginRequest);

      expect(result.accessToken).toBe('access-token');
      expect(result.user.email).toBe(mockUser.email);
    });

    it('should throw RpcException if user not found', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      await expect(service.login(loginRequest)).rejects.toThrow(RpcException);
    });

    it('should throw RpcException if password is invalid', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockPasswordService.compare.mockResolvedValue(false);

      await expect(service.login(loginRequest)).rejects.toThrow(RpcException);
    });

    it('should throw RpcException if user is OAuth user', async () => {
      const oauthUser = { ...mockUser, provider: AuthProvider.google, password: null };
      mockUserRepository.findByEmail.mockResolvedValue(oauthUser);

      await expect(service.login(loginRequest)).rejects.toThrow(RpcException);
    });
  });

  describe('refreshToken', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      password: 'hashed_password',
      provider: AuthProvider.email,
      providerId: null,
      passwordResetToken: null,
      passwordResetExpires: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should refresh token successfully', async () => {
      mockTokenService.validateRefreshToken.mockResolvedValue('user-123');
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockTokenService.revokeRefreshToken.mockResolvedValue(undefined);
      mockTokenService.generateTokenPair.mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 900,
      });

      const result = await service.refreshToken({
        refreshToken: 'old-refresh-token',
      });

      expect(result.accessToken).toBe('new-access-token');
    });

    it('should throw RpcException if refresh token is invalid', async () => {
      mockTokenService.validateRefreshToken.mockResolvedValue(null);

      await expect(
        service.refreshToken({ refreshToken: 'invalid-token' }),
      ).rejects.toThrow(RpcException);
    });
  });

  describe('validateToken', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      password: 'hashed_password',
      provider: AuthProvider.email,
      providerId: null,
      passwordResetToken: null,
      passwordResetExpires: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should return valid response for valid token', async () => {
      mockTokenService.validateAccessToken.mockResolvedValue({
        sub: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        provider: 'email',
      });
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await service.validateToken({
        accessToken: 'valid-token',
      });

      expect(result.valid).toBe(true);
      expect(result.user?.email).toBe(mockUser.email);
    });

    it('should return invalid response for invalid token', async () => {
      mockTokenService.validateAccessToken.mockResolvedValue(null);

      const result = await service.validateToken({
        accessToken: 'invalid-token',
      });

      expect(result.valid).toBe(false);
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      mockTokenService.revokeRefreshToken.mockResolvedValue(undefined);

      const result = await service.logout({
        userId: 'user-123',
        refreshToken: 'refresh-token',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('getProfile', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      password: 'hashed_password',
      provider: AuthProvider.email,
      providerId: null,
      passwordResetToken: null,
      passwordResetExpires: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should return user profile successfully', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await service.getProfile({ userId: 'user-123' });

      expect(result.user).toBeDefined();
      expect(result.user.id).toBe(mockUser.id);
      expect(result.user.email).toBe(mockUser.email);
      expect(result.user.name).toBe(mockUser.name);
      expect(result.user.provider).toBe(mockUser.provider);
    });

    it('should throw RpcException if user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(
        service.getProfile({ userId: 'non-existent' }),
      ).rejects.toThrow(RpcException);
    });
  });

  describe('forgotPassword', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      password: 'hashed_password',
      provider: AuthProvider.email,
      providerId: null,
      passwordResetToken: null,
      passwordResetExpires: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should process forgot password for existing user', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockTokenService.generatePasswordResetToken.mockReturnValue('reset-token');
      mockUserRepository.setPasswordResetToken.mockResolvedValue(undefined);
      mockRabbitMQService.emit.mockResolvedValue(undefined);

      const result = await service.forgotPassword({
        email: 'test@example.com',
      });

      expect(result.success).toBe(true);
      expect(mockRabbitMQService.emit).toHaveBeenCalled();
    });

    it('should return success even if user does not exist (prevent enumeration)', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      const result = await service.forgotPassword({
        email: 'nonexistent@example.com',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('resetPassword', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      password: 'hashed_password',
      provider: AuthProvider.email,
      providerId: null,
      passwordResetToken: 'reset-token',
      passwordResetExpires: new Date(Date.now() + 3600000),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should reset password successfully', async () => {
      mockUserRepository.findByPasswordResetToken.mockResolvedValue(mockUser);
      mockPasswordService.validatePasswordStrength.mockReturnValue({ valid: true });
      mockPasswordService.hash.mockResolvedValue('new_hashed_password');
      mockUserRepository.update.mockResolvedValue(mockUser);
      mockUserRepository.clearPasswordResetToken.mockResolvedValue(undefined);
      mockTokenService.revokeAllUserTokens.mockResolvedValue(undefined);
      mockRabbitMQService.emit.mockResolvedValue(undefined);

      const result = await service.resetPassword({
        token: 'reset-token',
        newPassword: 'NewPassword123!',
      });

      expect(result.success).toBe(true);
    });

    it('should throw RpcException if token is invalid', async () => {
      mockUserRepository.findByPasswordResetToken.mockResolvedValue(null);

      await expect(
        service.resetPassword({
          token: 'invalid-token',
          newPassword: 'NewPassword123!',
        }),
      ).rejects.toThrow(RpcException);
    });

    it('should throw RpcException if token is expired', async () => {
      const expiredUser = {
        ...mockUser,
        passwordResetExpires: new Date(Date.now() - 3600000),
      };
      mockUserRepository.findByPasswordResetToken.mockResolvedValue(expiredUser);

      await expect(
        service.resetPassword({
          token: 'reset-token',
          newPassword: 'NewPassword123!',
        }),
      ).rejects.toThrow(RpcException);
    });
  });

  describe('changePassword', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      password: 'hashed_password',
      provider: AuthProvider.email,
      providerId: null,
      passwordResetToken: null,
      passwordResetExpires: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should change password successfully', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockPasswordService.compare.mockResolvedValue(true);
      mockPasswordService.validatePasswordStrength.mockReturnValue({ valid: true });
      mockPasswordService.hash.mockResolvedValue('new_hashed_password');
      mockUserRepository.update.mockResolvedValue(mockUser);
      mockRabbitMQService.emit.mockResolvedValue(undefined);

      const result = await service.changePassword({
        userId: 'user-123',
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
      });

      expect(result.success).toBe(true);
    });

    it('should throw RpcException if user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(
        service.changePassword({
          userId: 'non-existent',
          currentPassword: 'OldPassword123!',
          newPassword: 'NewPassword123!',
        }),
      ).rejects.toThrow(RpcException);
    });

    it('should throw RpcException if current password is incorrect', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockPasswordService.compare.mockResolvedValue(false);

      await expect(
        service.changePassword({
          userId: 'user-123',
          currentPassword: 'WrongPassword123!',
          newPassword: 'NewPassword123!',
        }),
      ).rejects.toThrow(RpcException);
    });
  });
});
