import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@app/prisma';
import { AuthUser, AuthProvider } from '@prisma/client';

/**
 * Data required to create a new auth user.
 */
export interface CreateUserData {
  email: string;
  name: string;
  password?: string;
  provider: AuthProvider;
  providerId?: string;
}

export { AuthUser, AuthProvider };

/**
 * Repository for managing authentication user data in the database.
 * Provides CRUD operations and specialized queries for auth users.
 */
@Injectable()
export class UserRepository {
  private readonly logger = new Logger(UserRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a new auth user in the database.
   * @param data - The user data to create
   * @returns The created auth user
   */
  async create(data: CreateUserData): Promise<AuthUser> {
    this.logger.log(`Creating auth user with email: ${data.email}`);

    const user = await this.prisma.authUser.create({
      data: {
        email: data.email.toLowerCase(),
        name: data.name,
        password: data.password,
        provider: data.provider,
        providerId: data.providerId,
      },
    });

    this.logger.log(`Auth user created: ${user.id}`);
    return user;
  }

  /**
   * Finds an auth user by their unique identifier.
   * @param id - The user's unique ID
   * @returns The auth user or null if not found
   */
  async findById(id: string): Promise<AuthUser | null> {
    return this.prisma.authUser.findUnique({
      where: { id },
    });
  }

  /**
   * Finds an auth user by their email address.
   * @param email - The user's email address
   * @returns The auth user or null if not found
   */
  async findByEmail(email: string): Promise<AuthUser | null> {
    return this.prisma.authUser.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  /**
   * Finds an auth user by their OAuth provider and provider ID.
   * @param provider - The OAuth provider (google, apple)
   * @param providerId - The user's ID from the OAuth provider
   * @returns The auth user or null if not found
   */
  async findByProvider(provider: AuthProvider, providerId: string): Promise<AuthUser | null> {
    return this.prisma.authUser.findFirst({
      where: {
        provider,
        providerId,
      },
    });
  }

  /**
   * Finds an auth user by their password reset token.
   * @param token - The password reset token
   * @returns The auth user or null if not found
   */
  async findByPasswordResetToken(token: string): Promise<AuthUser | null> {
    return this.prisma.authUser.findFirst({
      where: {
        passwordResetToken: token,
      },
    });
  }

  /**
   * Updates an auth user's data.
   * @param id - The user's unique ID
   * @param data - The data to update
   * @returns The updated auth user or null if not found
   */
  async update(id: string, data: Partial<AuthUser>): Promise<AuthUser | null> {
    this.logger.log(`Updating auth user: ${id}`);

    try {
      const user = await this.prisma.authUser.update({
        where: { id },
        data: {
          ...(data.email && { email: data.email.toLowerCase() }),
          ...(data.name && { name: data.name }),
          ...(data.password !== undefined && { password: data.password }),
          ...(data.passwordResetToken !== undefined && { passwordResetToken: data.passwordResetToken }),
          ...(data.passwordResetExpires !== undefined && { passwordResetExpires: data.passwordResetExpires }),
        },
      });

      this.logger.log(`Auth user updated: ${id}`);
      return user;
    } catch {
      this.logger.warn(`Auth user not found for update: ${id}`);
      return null;
    }
  }

  /**
   * Sets a password reset token for a user.
   * @param userId - The user's unique ID
   * @param token - The password reset token
   * @param expiresIn - Time in milliseconds until the token expires
   */
  async setPasswordResetToken(userId: string, token: string, expiresIn: number): Promise<void> {
    this.logger.log(`Setting password reset token for user: ${userId}`);

    await this.prisma.authUser.update({
      where: { id: userId },
      data: {
        passwordResetToken: token,
        passwordResetExpires: new Date(Date.now() + expiresIn),
      },
    });
  }

  /**
   * Clears the password reset token for a user.
   * @param userId - The user's unique ID
   */
  async clearPasswordResetToken(userId: string): Promise<void> {
    this.logger.log(`Clearing password reset token for user: ${userId}`);

    await this.prisma.authUser.update({
      where: { id: userId },
      data: {
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });
  }
}
