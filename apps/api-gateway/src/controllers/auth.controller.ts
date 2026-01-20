import {
  Controller,
  Post,
  Get,
  Body,
  Inject,
  OnModuleInit,
  HttpException,
  HttpStatus,
  Headers,
} from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import { SERVICES } from '@app/common';
import {
  AuthServiceClient,
  AUTH_SERVICE_NAME,
  LogoutResponse,
  ForgotPasswordResponse,
  ResetPasswordResponse,
  ValidateTokenResponse,
  ChangePasswordResponse,
  GetProfileResponse,
} from '@app/proto';
import {
  RegisterDto,
  LoginDto,
  GoogleAuthDto,
  AppleAuthDto,
  RefreshTokenDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
  AuthResponseDto,
  MessageResponseDto,
  UserInfoDto,
} from '../dto/auth.dto';

@ApiTags('auth')
@Controller('api/auth')
export class AuthController implements OnModuleInit {
  private authService: AuthServiceClient;

  constructor(
    @Inject(SERVICES.AUTH_SERVICE) private readonly client: ClientGrpc,
  ) {}

  onModuleInit() {
    this.authService = this.client.getService<AuthServiceClient>(AUTH_SERVICE_NAME);
  }

  @Post('register')
  @ApiOperation({ summary: 'Register a new user with email and password' })
  @ApiResponse({ status: 201, description: 'User registered successfully', type: AuthResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    try {
      return await firstValueFrom(this.authService.register(registerDto));
    } catch (error: any) {
      if (error.message?.includes('already exists')) {
        throw new HttpException(error.message, HttpStatus.CONFLICT);
      }
      if (error.message?.includes('Password')) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      throw new HttpException(
        error.message || 'Registration failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    try {
      return await firstValueFrom(this.authService.login(loginDto));
    } catch (error: any) {
      if (error.message?.includes('Invalid') || error.message?.includes('sign in with')) {
        throw new HttpException(error.message, HttpStatus.UNAUTHORIZED);
      }
      throw new HttpException(
        error.message || 'Login failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('google')
  @ApiOperation({ summary: 'Authenticate with Google' })
  @ApiResponse({ status: 200, description: 'Google authentication successful', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid Google token' })
  @ApiResponse({ status: 409, description: 'Email already registered with different provider' })
  async googleAuth(@Body() googleAuthDto: GoogleAuthDto): Promise<AuthResponseDto> {
    try {
      return await firstValueFrom(this.authService.googleAuth(googleAuthDto));
    } catch (error: any) {
      if (error.message?.includes('Invalid') || error.message?.includes('not verified')) {
        throw new HttpException(error.message, HttpStatus.UNAUTHORIZED);
      }
      if (error.message?.includes('already exists')) {
        throw new HttpException(error.message, HttpStatus.CONFLICT);
      }
      throw new HttpException(
        error.message || 'Google authentication failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('apple')
  @ApiOperation({ summary: 'Authenticate with Apple' })
  @ApiResponse({ status: 200, description: 'Apple authentication successful', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid Apple token' })
  @ApiResponse({ status: 409, description: 'Email already registered with different provider' })
  async appleAuth(@Body() appleAuthDto: AppleAuthDto): Promise<AuthResponseDto> {
    try {
      return await firstValueFrom(this.authService.appleAuth(appleAuthDto));
    } catch (error: any) {
      if (error.message?.includes('Invalid')) {
        throw new HttpException(error.message, HttpStatus.UNAUTHORIZED);
      }
      if (error.message?.includes('already exists')) {
        throw new HttpException(error.message, HttpStatus.CONFLICT);
      }
      throw new HttpException(
        error.message || 'Apple authentication failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto): Promise<AuthResponseDto> {
    try {
      return await firstValueFrom(this.authService.refreshToken(refreshTokenDto));
    } catch (error: any) {
      if (error.message?.includes('Invalid') || error.message?.includes('expired')) {
        throw new HttpException(error.message, HttpStatus.UNAUTHORIZED);
      }
      throw new HttpException(
        error.message || 'Token refresh failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and invalidate refresh token' })
  @ApiResponse({ status: 200, description: 'Logout successful', type: MessageResponseDto })
  async logout(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Headers('authorization') authHeader: string,
  ): Promise<MessageResponseDto> {
    try {
      // Extract user ID from token (in a real app, you'd validate the token first)
      const result = await firstValueFrom(
        this.authService.logout({
          userId: '', // Will be ignored, we only need the refresh token
          refreshToken: refreshTokenDto.refreshToken,
        }),
      ) as LogoutResponse;
      return { success: result.success, message: 'Logged out successfully' };
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Logout failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset email' })
  @ApiResponse({ status: 200, description: 'Password reset email sent (if account exists)', type: MessageResponseDto })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto): Promise<MessageResponseDto> {
    try {
      const result = await firstValueFrom(
        this.authService.forgotPassword(forgotPasswordDto),
      ) as ForgotPasswordResponse;
      return { success: result.success, message: result.message };
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Password reset request failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 200, description: 'Password reset successful', type: MessageResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto): Promise<MessageResponseDto> {
    try {
      const result = await firstValueFrom(
        this.authService.resetPassword(resetPasswordDto),
      ) as ResetPasswordResponse;
      return { success: result.success, message: result.message };
    } catch (error: any) {
      if (error.message?.includes('Invalid') || error.message?.includes('expired')) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      if (error.message?.includes('Password')) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      throw new HttpException(
        error.message || 'Password reset failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('change-password')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password (requires current password)' })
  @ApiResponse({ status: 200, description: 'Password changed successfully', type: MessageResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid current password or weak new password' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async changePassword(
    @Body() changePasswordDto: ChangePasswordDto,
    @Headers('authorization') authHeader: string,
  ): Promise<MessageResponseDto> {
    try {
      // In a real app, extract user ID from the validated JWT token
      // For demo purposes, we'll validate the token and extract the user ID
      const token = authHeader?.replace('Bearer ', '');
      if (!token) {
        throw new HttpException('Authorization required', HttpStatus.UNAUTHORIZED);
      }

      // Validate token and get user
      const validation = await firstValueFrom(
        this.authService.validateToken({ accessToken: token }),
      ) as ValidateTokenResponse;

      if (!validation.valid || !validation.user) {
        throw new HttpException('Invalid token', HttpStatus.UNAUTHORIZED);
      }

      const result = await firstValueFrom(
        this.authService.changePassword({
          userId: validation.user.id,
          currentPassword: changePasswordDto.currentPassword,
          newPassword: changePasswordDto.newPassword,
        }),
      ) as ChangePasswordResponse;
      return { success: result.success, message: result.message };
    } catch (error: any) {
      if (error.status) {
        throw error;
      }
      if (error.message?.includes('incorrect')) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      if (error.message?.includes('Password')) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      if (error.message?.includes('not available')) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      throw new HttpException(
        error.message || 'Password change failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully', type: UserInfoDto })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing token' })
  async getProfile(@Headers('authorization') authHeader: string): Promise<UserInfoDto> {
    try {
      const token = authHeader?.replace('Bearer ', '');
      if (!token) {
        throw new HttpException('Authorization required', HttpStatus.UNAUTHORIZED);
      }

      // Validate token and get user ID
      const validation = await firstValueFrom(
        this.authService.validateToken({ accessToken: token }),
      ) as ValidateTokenResponse;

      if (!validation.valid || !validation.user) {
        throw new HttpException('Invalid or expired token', HttpStatus.UNAUTHORIZED);
      }

      // Fetch fresh profile data
      const profile = await firstValueFrom(
        this.authService.getProfile({ userId: validation.user.id }),
      ) as GetProfileResponse;

      return profile.user;
    } catch (error: any) {
      if (error.status) {
        throw error;
      }
      if (error.message?.includes('not found')) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }
      throw new HttpException(
        error.message || 'Failed to get profile',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
