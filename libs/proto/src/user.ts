export interface CreateUserRequest {
  email: string;
  name: string;
  password: string;
}

export interface GetUserRequest {
  id: string;
}

export interface GetUsersRequest {
  page: number;
  limit: number;
}

export interface UpdateUserRequest {
  id: string;
  email?: string;
  name?: string;
}

export interface DeleteUserRequest {
  id: string;
}

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface UsersResponse {
  users: UserResponse[];
  total: number;
}

export interface DeleteUserResponse {
  success: boolean;
}

export interface UserServiceClient {
  createUser(request: CreateUserRequest): any;
  getUser(request: GetUserRequest): any;
  getUsers(request: GetUsersRequest): any;
  updateUser(request: UpdateUserRequest): any;
  deleteUser(request: DeleteUserRequest): any;
}

export const USER_SERVICE_NAME = 'UserService';
export const USER_PACKAGE_NAME = 'user';
