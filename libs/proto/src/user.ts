import { Observable } from 'rxjs';

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
  createUser(request: CreateUserRequest): Observable<UserResponse>;
  getUser(request: GetUserRequest): Observable<UserResponse>;
  getUsers(request: GetUsersRequest): Observable<UsersResponse>;
  updateUser(request: UpdateUserRequest): Observable<UserResponse>;
  deleteUser(request: DeleteUserRequest): Observable<DeleteUserResponse>;
}

export const USER_SERVICE_NAME = 'UserService';
export const USER_PACKAGE_NAME = 'user';
