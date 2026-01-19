import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { UserService } from './user.service';
import {
  CreateUserRequest,
  GetUserRequest,
  GetUsersRequest,
  UpdateUserRequest,
  DeleteUserRequest,
  UserResponse,
  UsersResponse,
  DeleteUserResponse,
  USER_SERVICE_NAME,
} from '@app/proto';

@Controller()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @GrpcMethod(USER_SERVICE_NAME, 'CreateUser')
  async createUser(data: CreateUserRequest): Promise<UserResponse> {
    return this.userService.createUser(data);
  }

  @GrpcMethod(USER_SERVICE_NAME, 'GetUser')
  async getUser(data: GetUserRequest): Promise<UserResponse> {
    return this.userService.getUser(data);
  }

  @GrpcMethod(USER_SERVICE_NAME, 'GetUsers')
  async getUsers(data: GetUsersRequest): Promise<UsersResponse> {
    return this.userService.getUsers(data);
  }

  @GrpcMethod(USER_SERVICE_NAME, 'UpdateUser')
  async updateUser(data: UpdateUserRequest): Promise<UserResponse> {
    return this.userService.updateUser(data);
  }

  @GrpcMethod(USER_SERVICE_NAME, 'DeleteUser')
  async deleteUser(data: DeleteUserRequest): Promise<DeleteUserResponse> {
    return this.userService.deleteUser(data);
  }
}
