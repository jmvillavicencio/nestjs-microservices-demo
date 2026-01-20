import { Injectable, Logger } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import * as jwksClient from 'jwks-rsa';

/**
 * User information extracted from a verified Apple identity token.
 */
export interface AppleUserInfo {
  /** Apple's unique identifier for the user (stable across sessions) */
  id: string;
  /** User's email address (may be a private relay address) */
  email: string;
  /** Whether the email has been verified by Apple */
  emailVerified: boolean;
}

/**
 * Internal structure of Apple's identity token payload.
 */
interface AppleTokenPayload {
  /** Issuer (always https://appleid.apple.com) */
  iss: string;
  /** Audience (your app's client ID) */
  aud: string;
  /** Expiration timestamp */
  exp: number;
  /** Issued at timestamp */
  iat: number;
  /** Subject (unique user identifier) */
  sub: string;
  /** User's email (optional, may use private relay) */
  email?: string;
  /** Whether email is verified ('true' or 'false' as string) */
  email_verified?: string;
  /** Whether user chose to hide their email */
  is_private_email?: string;
  /** When the user authenticated */
  auth_time: number;
  /** Whether nonce is supported */
  nonce_supported: boolean;
}

/**
 * Service responsible for Apple Sign In authentication.
 *
 * This service handles the verification of Apple identity tokens obtained from
 * the frontend using Apple's Sign In SDK. The flow is:
 *
 * 1. Frontend uses Apple Sign In SDK to authenticate user
 * 2. Apple returns an identity token (JWT) and authorization code
 * 3. Frontend sends the identity token to your backend
 * 4. This service verifies the token using Apple's public keys (JWKS)
 *
 * Important notes:
 * - Apple only provides user's name on FIRST sign-in; save it immediately
 * - Users can choose to hide their email (Apple generates a relay address)
 * - The `sub` claim is the stable user identifier across sessions
 *
 * @see https://developer.apple.com/documentation/sign_in_with_apple
 *
 * Required environment variables:
 * - APPLE_CLIENT_ID: Your Apple Services ID (e.g., com.yourapp.service)
 */
@Injectable()
export class AppleAuthService {
  private readonly logger = new Logger(AppleAuthService.name);
  private readonly jwksClient: jwksClient.JwksClient;
  private readonly clientId: string;

  constructor() {
    this.clientId = process.env.APPLE_CLIENT_ID || '';
    this.jwksClient = jwksClient({
      jwksUri: 'https://appleid.apple.com/auth/keys',
      cache: true,
      cacheMaxAge: 86400000, // 24 hours
    });

    if (!this.clientId || this.clientId === 'your-apple-client-id') {
      this.logger.warn(
        'APPLE_CLIENT_ID not configured. Apple Sign In will not work.',
      );
    }
  }

  /**
   * Verifies an Apple identity token and extracts user information.
   *
   * The identity token is a JWT signed by Apple that contains user claims.
   * This method:
   * 1. Decodes the token to get the key ID (kid)
   * 2. Fetches Apple's public keys from their JWKS endpoint
   * 3. Verifies the token signature and claims
   *
   * @param identityToken - The Apple identity token (JWT) from the frontend
   * @returns User information if token is valid, null otherwise
   *
   * @example
   * ```typescript
   * const userInfo = await appleAuthService.verifyIdentityToken(identityToken);
   * if (userInfo) {
   *   // Note: email might be a private relay address like xyz@privaterelay.appleid.com
   *   console.log(`Welcome! Your Apple ID: ${userInfo.id}`);
   * }
   * ```
   */
  async verifyIdentityToken(
    identityToken: string,
  ): Promise<AppleUserInfo | null> {
    try {
      // Decode the token header to get the key ID
      const decodedToken = jwt.decode(identityToken, { complete: true });

      if (!decodedToken || typeof decodedToken === 'string') {
        this.logger.warn('Failed to decode Apple identity token');
        return null;
      }

      const kid = decodedToken.header.kid;

      if (!kid) {
        this.logger.warn('Apple identity token missing key ID');
        return null;
      }

      // Get the signing key from Apple's JWKS
      const signingKey = await this.getSigningKey(kid);

      if (!signingKey) {
        this.logger.warn('Failed to get Apple signing key');
        return null;
      }

      // Verify the token
      const payload = jwt.verify(identityToken, signingKey, {
        algorithms: ['RS256'],
        issuer: 'https://appleid.apple.com',
        audience: this.clientId,
      }) as AppleTokenPayload;

      return {
        id: payload.sub,
        email: payload.email || '',
        emailVerified: payload.email_verified === 'true',
      };
    } catch (error) {
      this.logger.error('Failed to verify Apple identity token', error);
      return null;
    }
  }

  /**
   * Fetches a signing key from Apple's JWKS endpoint.
   * @param kid - The key ID from the token header
   * @returns The public key for verification, or null if not found
   */
  private async getSigningKey(kid: string): Promise<string | null> {
    try {
      const key = await this.jwksClient.getSigningKey(kid);
      return key.getPublicKey();
    } catch (error) {
      this.logger.error('Failed to get Apple signing key', error);
      return null;
    }
  }
}
