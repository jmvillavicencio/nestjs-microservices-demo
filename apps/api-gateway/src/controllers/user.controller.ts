import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Inject,
  OnModuleInit,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import { SERVICES } from '@app/common';
import { UserServiceClient, USER_SERVICE_NAME } from '@app/proto';
import {
  CreateUserDto,
  UpdateUserDto,
  UserResponseDto,
  UsersListResponseDto,
} from '../dto/user.dto';

@ApiTags('users')
@Controller('api/users')
export class UserController implements OnModuleInit {
  private userService: UserServiceClient;

  constructor(
    @Inject(SERVICES.USER_SERVICE) private readonly client: ClientGrpc,
  ) {}

  onModuleInit() {
    this.userService = this.client.getService<UserServiceClient>(USER_SERVICE_NAME);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully', type: UserResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 409, description: 'User with this email already exists' })
  async createUser(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    try {
      return await firstValueFrom(this.userService.createUser(createUserDto));
    } catch (error: any) {
      if (error.message?.includes('already exists')) {
        throw new HttpException(error.message, HttpStatus.CONFLICT);
      }
      throw new HttpException(
        error.message || 'Failed to create user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get all users with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10)' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully', type: UsersListResponseDto })
  async getUsers(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ): Promise<UsersListResponseDto> {
    try {
      return await firstValueFrom(
        this.userService.getUsers({ page: Number(page), limit: Number(limit) }),
      );
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to fetch users',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully', type: UserResponseDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUser(@Param('id') id: string): Promise<UserResponseDto> {
    try {
      return await firstValueFrom(this.userService.getUser({ id }));
    } catch (error: any) {
      if (error.message?.includes('not found')) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }
      throw new HttpException(
        error.message || 'Failed to fetch user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update user' })
  @ApiResponse({ status: 200, description: 'User updated successfully', type: UserResponseDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    try {
      return await firstValueFrom(
        this.userService.updateUser({ id, ...updateUserDto }),
      );
    } catch (error: any) {
      if (error.message?.includes('not found')) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }
      if (error.message?.includes('already in use')) {
        throw new HttpException(error.message, HttpStatus.CONFLICT);
      }
      throw new HttpException(
        error.message || 'Failed to update user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deleteUser(@Param('id') id: string): Promise<{ success: boolean }> {
    try {
      return await firstValueFrom(this.userService.deleteUser({ id }));
    } catch (error: any) {
      if (error.message?.includes('not found')) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }
      throw new HttpException(
        error.message || 'Failed to delete user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
