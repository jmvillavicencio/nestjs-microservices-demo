import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

/**
 * Result of password strength validation.
 */
export interface PasswordValidationResult {
  /** Whether the password meets all requirements */
  valid: boolean;
  /** Error message if validation failed */
  message?: string;
}

/**
 * Service responsible for password hashing and validation.
 *
 * Uses bcrypt for secure password hashing with configurable salt rounds.
 * Provides password strength validation to ensure secure user passwords.
 */
@Injectable()
export class PasswordService {
  /** Number of salt rounds for bcrypt (higher = more secure but slower) */
  private readonly saltRounds = 12;

  /**
   * Hashes a plain text password using bcrypt.
   *
   * @param password - The plain text password to hash
   * @returns The bcrypt hashed password
   *
   * @example
   * ```typescript
   * const hashedPassword = await passwordService.hash('MySecurePassword123');
   * // Store hashedPassword in database
   * ```
   */
  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  /**
   * Compares a plain text password with a hashed password.
   *
   * @param password - The plain text password to verify
   * @param hashedPassword - The bcrypt hashed password from database
   * @returns True if passwords match, false otherwise
   *
   * @example
   * ```typescript
   * const isValid = await passwordService.compare(userInput, storedHash);
   * if (!isValid) {
   *   throw new Error('Invalid password');
   * }
   * ```
   */
  async compare(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  /**
   * Validates password strength against security requirements.
   *
   * Requirements:
   * - Minimum 8 characters
   * - At least one uppercase letter (A-Z)
   * - At least one lowercase letter (a-z)
   * - At least one number (0-9)
   *
   * @param password - The password to validate
   * @returns Validation result with success status and error message if failed
   *
   * @example
   * ```typescript
   * const result = passwordService.validatePasswordStrength('weak');
   * if (!result.valid) {
   *   console.log(result.message); // "Password must be at least 8 characters long"
   * }
   * ```
   */
  validatePasswordStrength(password: string): PasswordValidationResult {
    if (password.length < 8) {
      return { valid: false, message: 'Password must be at least 8 characters long' };
    }

    if (!/[A-Z]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one uppercase letter' };
    }

    if (!/[a-z]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one lowercase letter' };
    }

    if (!/[0-9]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one number' };
    }

    return { valid: true };
  }
}
