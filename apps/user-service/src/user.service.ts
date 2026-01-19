import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { RpcException } from '@nestjs/microservices';
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
import { USER_EVENTS, UserCreatedEvent, UserUpdatedEvent, UserDeletedEvent } from '@app/common';

interface User {
  id: string;
  email: string;
  name: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class UserService {
  private users: Map<string, User> = new Map();

  constructor(private readonly rabbitMQService: RabbitMQService) {
    // Seed some demo users
    this.seedUsers();
  }

  private seedUsers(): void {
    const demoUsers = [
      { email: 'john@example.com', name: 'John Doe', password: 'password123' },
      { email: 'jane@example.com', name: 'Jane Smith', password: 'password456' },
    ];

    demoUsers.forEach((user) => {
      const id = uuidv4();
      const now = new Date();
      this.users.set(id, {
        id,
        ...user,
        createdAt: now,
        updatedAt: now,
      });
    });
  }

  async createUser(data: CreateUserRequest): Promise<UserResponse> {
    const existingUser = Array.from(this.users.values()).find(
      (u) => u.email === data.email,
    );

    if (existingUser) {
      throw new RpcException('User with this email already exists');
    }

    const id = uuidv4();
    const now = new Date();
    const user: User = {
      id,
      email: data.email,
      name: data.name,
      password: data.password,
      createdAt: now,
      updatedAt: now,
    };

    this.users.set(id, user);

    // Emit user created event
    const event: UserCreatedEvent = {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt.toISOString(),
    };
    await this.rabbitMQService.emit(USER_EVENTS.USER_CREATED, event);

    return this.toResponse(user);
  }

  async getUser(data: GetUserRequest): Promise<UserResponse> {
    const user = this.users.get(data.id);

    if (!user) {
      throw new RpcException('User not found');
    }

    return this.toResponse(user);
  }

  async getUsers(data: GetUsersRequest): Promise<UsersResponse> {
    const page = data.page || 1;
    const limit = data.limit || 10;
    const skip = (page - 1) * limit;

    const allUsers = Array.from(this.users.values());
    const paginatedUsers = allUsers.slice(skip, skip + limit);

    return {
      users: paginatedUsers.map((u) => this.toResponse(u)),
      total: allUsers.length,
    };
  }

  async updateUser(data: UpdateUserRequest): Promise<UserResponse> {
    const user = this.users.get(data.id);

    if (!user) {
      throw new RpcException('User not found');
    }

    if (data.email) {
      const existingUser = Array.from(this.users.values()).find(
        (u) => u.email === data.email && u.id !== data.id,
      );
      if (existingUser) {
        throw new RpcException('Email already in use');
      }
      user.email = data.email;
    }

    if (data.name) {
      user.name = data.name;
    }

    user.updatedAt = new Date();
    this.users.set(data.id, user);

    // Emit user updated event
    const event: UserUpdatedEvent = {
      id: user.id,
      email: user.email,
      name: user.name,
      updatedAt: user.updatedAt.toISOString(),
    };
    await this.rabbitMQService.emit(USER_EVENTS.USER_UPDATED, event);

    return this.toResponse(user);
  }

  async deleteUser(data: DeleteUserRequest): Promise<DeleteUserResponse> {
    const user = this.users.get(data.id);

    if (!user) {
      throw new RpcException('User not found');
    }

    this.users.delete(data.id);

    // Emit user deleted event
    const event: UserDeletedEvent = {
      id: data.id,
      deletedAt: new Date().toISOString(),
    };
    await this.rabbitMQService.emit(USER_EVENTS.USER_DELETED, event);

    return { success: true };
  }

  private toResponse(user: User): UserResponse {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}
