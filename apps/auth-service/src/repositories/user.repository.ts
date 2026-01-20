import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

export type AuthProvider = 'email' | 'google' | 'apple';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  password?: string;
  provider: AuthProvider;
  providerId?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserData {
  email: string;
  name: string;
  password?: string;
  provider: AuthProvider;
  providerId?: string;
}

@Injectable()
export class UserRepository {
  private users: Map<string, AuthUser> = new Map();
  private emailIndex: Map<string, string> = new Map();
  private providerIndex: Map<string, string> = new Map();

  async create(data: CreateUserData): Promise<AuthUser> {
    const id = uuidv4();
    const now = new Date();

    const user: AuthUser = {
      id,
      email: data.email.toLowerCase(),
      name: data.name,
      password: data.password,
      provider: data.provider,
      providerId: data.providerId,
      createdAt: now,
      updatedAt: now,
    };

    this.users.set(id, user);
    this.emailIndex.set(user.email, id);

    if (data.providerId) {
      this.providerIndex.set(`${data.provider}:${data.providerId}`, id);
    }

    return user;
  }

  async findById(id: string): Promise<AuthUser | null> {
    return this.users.get(id) || null;
  }

  async findByEmail(email: string): Promise<AuthUser | null> {
    const id = this.emailIndex.get(email.toLowerCase());
    if (!id) return null;
    return this.users.get(id) || null;
  }

  async findByProvider(provider: AuthProvider, providerId: string): Promise<AuthUser | null> {
    const id = this.providerIndex.get(`${provider}:${providerId}`);
    if (!id) return null;
    return this.users.get(id) || null;
  }

  async findByPasswordResetToken(token: string): Promise<AuthUser | null> {
    for (const user of this.users.values()) {
      if (user.passwordResetToken === token) {
        return user;
      }
    }
    return null;
  }

  async update(id: string, data: Partial<AuthUser>): Promise<AuthUser | null> {
    const user = this.users.get(id);
    if (!user) return null;

    const updatedUser: AuthUser = {
      ...user,
      ...data,
      id: user.id,
      createdAt: user.createdAt,
      updatedAt: new Date(),
    };

    // Update email index if email changed
    if (data.email && data.email !== user.email) {
      this.emailIndex.delete(user.email);
      this.emailIndex.set(data.email.toLowerCase(), id);
    }

    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async setPasswordResetToken(userId: string, token: string, expiresIn: number): Promise<void> {
    const user = this.users.get(userId);
    if (!user) return;

    user.passwordResetToken = token;
    user.passwordResetExpires = new Date(Date.now() + expiresIn);
    user.updatedAt = new Date();
    this.users.set(userId, user);
  }

  async clearPasswordResetToken(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (!user) return;

    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.updatedAt = new Date();
    this.users.set(userId, user);
  }
}
