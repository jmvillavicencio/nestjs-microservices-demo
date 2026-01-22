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
  Query,
} from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
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
  CheckEmailResponseDto,
} from '../dto/auth.dto';

@ApiTags('auth')
@Controller('api/auth')
export class AuthController implements OnModuleInit {
  private authService: AuthServiceClient;

  constructor(
    @Inject(SERVICES.AUTH_SERVICE) private readonly authClient: ClientGrpc,
  ) {}

  onModuleInit() {
    this.authService = this.authClient.getService<AuthServiceClient>(AUTH_SERVICE_NAME);
  }

  @Post('register')
  @ApiOperation({ summary: 'Register a new user with email and password' })
  @ApiResponse({ status: 201, description: 'User registered successfully', type: AuthResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    return await firstValueFrom(this.authService.register(registerDto));
  }

  @Get('check-email')
  @ApiOperation({ summary: 'Check if an email is available for registration' })
  @ApiQuery({ name: 'email', required: true, type: String, description: 'Email address to check' })
  @ApiResponse({ status: 200, description: 'Email availability status', type: CheckEmailResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid email format' })
  async checkEmailAvailability(@Query('email') email: string): Promise<CheckEmailResponseDto> {
    return await firstValueFrom(this.authService.checkEmailAvailability({ email }));
  }

  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return await firstValueFrom(this.authService.login(loginDto));
  }

  @Post('google')
  @ApiOperation({ summary: 'Authenticate with Google' })
  @ApiResponse({ status: 200, description: 'Google authentication successful', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid Google token' })
  @ApiResponse({ status: 409, description: 'Email already registered with different provider' })
  async googleAuth(@Body() googleAuthDto: GoogleAuthDto): Promise<AuthResponseDto> {
    return await firstValueFrom(this.authService.googleAuth(googleAuthDto));
  }

  @Post('apple')
  @ApiOperation({ summary: 'Authenticate with Apple' })
  @ApiResponse({ status: 200, description: 'Apple authentication successful', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid Apple token' })
  @ApiResponse({ status: 409, description: 'Email already registered with different provider' })
  async appleAuth(@Body() appleAuthDto: AppleAuthDto): Promise<AuthResponseDto> {
    return await firstValueFrom(this.authService.appleAuth(appleAuthDto));
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto): Promise<AuthResponseDto> {
    return await firstValueFrom(this.authService.refreshToken(refreshTokenDto));
  }

  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and invalidate refresh token' })
  @ApiResponse({ status: 200, description: 'Logout successful', type: MessageResponseDto })
  async logout(@Body() refreshTokenDto: RefreshTokenDto): Promise<MessageResponseDto> {
    const result = (await firstValueFrom(
      this.authService.logout({
        userId: '',
        refreshToken: refreshTokenDto.refreshToken,
      }),
    )) as LogoutResponse;
    return { success: result.success, message: 'Logged out successfully' };
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset email' })
  @ApiResponse({ status: 200, description: 'Password reset email sent (if account exists)', type: MessageResponseDto })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto): Promise<MessageResponseDto> {
    const result = (await firstValueFrom(
      this.authService.forgotPassword(forgotPasswordDto),
    )) as ForgotPasswordResponse;
    return { success: result.success, message: result.message };
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 200, description: 'Password reset successful', type: MessageResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto): Promise<MessageResponseDto> {
    const result = (await firstValueFrom(
      this.authService.resetPassword(resetPasswordDto),
    )) as ResetPasswordResponse;
    return { success: result.success, message: result.message };
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
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      throw new HttpException('Authorization required', HttpStatus.UNAUTHORIZED);
    }

    const validation = (await firstValueFrom(
      this.authService.validateToken({ accessToken: token }),
    )) as ValidateTokenResponse;

    if (!validation.valid || !validation.user) {
      throw new HttpException('Invalid token', HttpStatus.UNAUTHORIZED);
    }

    const result = (await firstValueFrom(
      this.authService.changePassword({
        userId: validation.user.id,
        currentPassword: changePasswordDto.currentPassword,
        newPassword: changePasswordDto.newPassword,
      }),
    )) as ChangePasswordResponse;
    return { success: result.success, message: result.message };
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully', type: UserInfoDto })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing token' })
  async getProfile(@Headers('authorization') authHeader: string): Promise<UserInfoDto> {
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      throw new HttpException('Authorization required', HttpStatus.UNAUTHORIZED);
    }

    const validation = (await firstValueFrom(
      this.authService.validateToken({ accessToken: token }),
    )) as ValidateTokenResponse;

    if (!validation.valid || !validation.user) {
      throw new HttpException('Invalid or expired token', HttpStatus.UNAUTHORIZED);
    }

    const profile = (await firstValueFrom(
      this.authService.getProfile({ userId: validation.user.id }),
    )) as GetProfileResponse;

    return profile.user;
  }
}
