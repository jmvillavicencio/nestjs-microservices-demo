import { Injectable, Logger } from '@nestjs/common';
import {
  CreateUserRequest,
  GetUserRequest,
  GetUsersRequest,
  UpdateUserRequest,
  DeleteUserRequest,
  UserResponse,
  UsersResponse,
  DeleteUserResponse,
} from '@app/proto';
import { RabbitMQService } from './rabbitmq.service';
import { USER_EVENTS, UserCreatedEvent, UserUpdatedEvent, UserDeletedEvent, AppErrors } from '@app/common';
import { PrismaService } from '@app/prisma';
import { AuthUser, AuthProvider } from '@prisma/client';
import * as bcrypt from 'bcrypt';

/**
 * Service responsible for user management operations.
 * Handles CRUD operations for users with PostgreSQL persistence via Prisma.
 */
@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rabbitMQService: RabbitMQService,
  ) {}

  /**
   * Creates a new user in the system.
   * @param data - The user creation request containing email, name, and password
   * @returns The created user response
   * @throws RpcException if a user with the given email already exists
   */
  async createUser(data: CreateUserRequest): Promise<UserResponse> {
    this.logger.log(`Creating user with email: ${data.email}`);

    const existingUser = await this.prisma.authUser.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      this.logger.warn(`User creation failed: email ${data.email} already exists`);
      throw AppErrors.userAlreadyExists(data.email);
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await this.prisma.authUser.create({
      data: {
        email: data.email,
        name: data.name,
        password: hashedPassword,
        provider: AuthProvider.email,
      },
    });

    this.logger.log(`User created successfully: ${user.id}`);

    const event: UserCreatedEvent = {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt.toISOString(),
    };
    await this.rabbitMQService.emit(USER_EVENTS.USER_CREATED, event);

    return this.toResponse(user);
  }

  /**
   * Retrieves a user by their unique identifier.
   * @param data - The request containing the user ID
   * @returns The user response
   * @throws RpcException if the user is not found
   */
  async getUser(data: GetUserRequest): Promise<UserResponse> {
    this.logger.log(`Fetching user with id: ${data.id}`);

    const user = await this.prisma.authUser.findUnique({
      where: { id: data.id },
    });

    if (!user) {
      this.logger.warn(`User not found: ${data.id}`);
      throw AppErrors.userNotFound(data.id);
    }

    return this.toResponse(user);
  }

  /**
   * Retrieves a paginated list of users.
   * @param data - The request containing pagination parameters (page, limit)
   * @returns A response containing the list of users and total count
   */
  async getUsers(data: GetUsersRequest): Promise<UsersResponse> {
    const page = data.page || 1;
    const limit = data.limit || 10;
    const skip = (page - 1) * limit;

    this.logger.log(`Fetching users - page: ${page}, limit: ${limit}`);

    const [users, total] = await Promise.all([
      this.prisma.authUser.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.authUser.count(),
    ]);

    return {
      users: users.map((u) => this.toResponse(u)),
      total,
    };
  }

  /**
   * Updates an existing user's information.
   * @param data - The update request containing user ID and fields to update
   * @returns The updated user response
   * @throws RpcException if the user is not found or email is already in use
   */
  async updateUser(data: UpdateUserRequest): Promise<UserResponse> {
    this.logger.log(`Updating user: ${data.id}`);

    const existingUser = await this.prisma.authUser.findUnique({
      where: { id: data.id },
    });

    if (!existingUser) {
      this.logger.warn(`Update failed: user ${data.id} not found`);
      throw AppErrors.userNotFound(data.id);
    }

    if (data.email && data.email !== existingUser.email) {
      const emailInUse = await this.prisma.authUser.findUnique({
        where: { email: data.email },
      });
      if (emailInUse) {
        this.logger.warn(`Update failed: email ${data.email} already in use`);
        throw AppErrors.emailAlreadyInUse(data.email);
      }
    }

    const user = await this.prisma.authUser.update({
      where: { id: data.id },
      data: {
        ...(data.email && { email: data.email }),
        ...(data.name && { name: data.name }),
      },
    });

    this.logger.log(`User updated successfully: ${user.id}`);

    const event: UserUpdatedEvent = {
      id: user.id,
      email: user.email,
      name: user.name,
      updatedAt: user.updatedAt.toISOString(),
    };
    await this.rabbitMQService.emit(USER_EVENTS.USER_UPDATED, event);

    return this.toResponse(user);
  }

  /**
   * Deletes a user from the system.
   * @param data - The delete request containing the user ID
   * @returns A response indicating success
   * @throws RpcException if the user is not found
   */
  async deleteUser(data: DeleteUserRequest): Promise<DeleteUserResponse> {
    this.logger.log(`Deleting user: ${data.id}`);

    const user = await this.prisma.authUser.findUnique({
      where: { id: data.id },
    });

    if (!user) {
      this.logger.warn(`Delete failed: user ${data.id} not found`);
      throw AppErrors.userNotFound(data.id);
    }

    await this.prisma.authUser.delete({
      where: { id: data.id },
    });

    this.logger.log(`User deleted successfully: ${data.id}`);

    const event: UserDeletedEvent = {
      id: data.id,
      deletedAt: new Date().toISOString(),
    };
    await this.rabbitMQService.emit(USER_EVENTS.USER_DELETED, event);

    return { success: true };
  }

  /**
   * Converts an AuthUser entity to a UserResponse DTO.
   * @param user - The AuthUser entity from the database
   * @returns The formatted user response
   */
  private toResponse(user: AuthUser): UserResponse {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}
